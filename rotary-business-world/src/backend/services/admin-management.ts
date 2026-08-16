import "server-only";
import { db } from "@/backend/db";
import { assertManagement, invalidateActor, type Actor } from "@/backend/actor";
import { hashPassword } from "@/backend/password";
import { auditCreate } from "@/backend/audit";
import { ConflictError, NotFoundError } from "@/backend/errors";

/**
 * Management (MANAGEMENT) operations for district admins — the in-app
 * equivalent of `scripts/make-admin.ts`. A "district admin" is a
 * `role = DISTRICT_ADMIN` user with `managedDistrictId` set.
 *
 * Transport-agnostic like the other services: `Actor` first, `assertManagement`,
 * throw `AppError` on failure, wrap each mutation + its audit row in one
 * `db.$transaction`.
 */

export type DistrictAdminSummary = {
  id: string;
  email: string;
  fullName: string | null;
};

export type DistrictWithAdmins = {
  id: string;
  code: string;
  name: string | null;
  country: string | null;
  admins: DistrictAdminSummary[];
};

/** Every district with its current district admins, for the management overview. */
export async function listDistrictsWithAdmins(
  actor: Actor,
): Promise<DistrictWithAdmins[]> {
  assertManagement(actor);

  const districts = await db.district.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      country: true,
      admins: {
        where: { role: "DISTRICT_ADMIN" },
        select: {
          id: true,
          email: true,
          profile: { select: { fullName: true } },
        },
        orderBy: { email: "asc" },
      },
    },
    orderBy: [{ country: "asc" }, { code: "asc" }],
  });

  return districts.map((d) => ({
    id: d.id,
    code: d.code,
    name: d.name,
    country: d.country,
    admins: d.admins.map((a) => ({
      id: a.id,
      email: a.email,
      fullName: a.profile?.fullName ?? null,
    })),
  }));
}

/** Create a brand-new district-admin account, verified and scoped to a district. */
export async function createDistrictAdmin(
  actor: Actor,
  input: { fullName: string; email: string; password: string; districtId: string },
): Promise<{ id: string }> {
  const admin = assertManagement(actor);
  const email = input.email.toLowerCase();

  const district = await db.district.findUnique({
    where: { id: input.districtId },
    select: { id: true, code: true },
  });
  if (!district) throw new NotFoundError("District not found");

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    throw new ConflictError("An account with this email already exists", {
      email: ["An account with this email already exists"],
    });
  }

  const passwordHash = await hashPassword(input.password);

  // Interactive transaction so the audit row can reference the new user's id.
  const created = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        role: "DISTRICT_ADMIN",
        status: "VERIFIED",
        managedDistrictId: district.id,
        profile: { create: { fullName: input.fullName } },
      },
      select: { id: true },
    });
    await auditCreate(tx, {
      actorId: admin.id,
      action: "admin.district_admin_created",
      targetType: "User",
      targetId: user.id,
      metadata: {
        email,
        fullName: input.fullName,
        districtId: district.id,
        districtCode: district.code,
      },
    });
    return user;
  });

  return { id: created.id };
}

// ---------------------------------------------------------------------------
// District + Club CRUD (MANAGEMENT only)
// ---------------------------------------------------------------------------

/** Create a new district. Code must be unique (natural Rotary key, e.g. "3201"). */
export async function createDistrict(
  actor: Actor,
  input: { code: string; name?: string; country?: string },
): Promise<{ id: string }> {
  const admin = assertManagement(actor);
  const code = input.code.trim().toUpperCase();

  const existing = await db.district.findUnique({ where: { code } });
  if (existing) {
    throw new ConflictError(`District ${code} already exists`, {
      code: [`District ${code} already exists`],
    });
  }

  const district = await db.$transaction(async (tx) => {
    const d = await tx.district.create({
      data: {
        code,
        name: input.name?.trim() || null,
        country: input.country?.trim() || null,
      },
      select: { id: true, code: true },
    });
    await auditCreate(tx, {
      actorId: admin.id,
      action: "admin.district_created",
      targetType: "District",
      targetId: d.id,
      metadata: { code, name: input.name, country: input.country },
    });
    return d;
  });

  return { id: district.id };
}

/** Create a new club inside an existing district. */
export async function createClub(
  actor: Actor,
  input: { name: string; districtId: string; city?: string; country?: string },
): Promise<{ id: string }> {
  const admin = assertManagement(actor);

  const district = await db.district.findUnique({
    where: { id: input.districtId },
    select: { id: true, code: true },
  });
  if (!district) throw new NotFoundError("District not found");

  const existing = await db.club.findFirst({
    where: { name: input.name.trim(), districtId: district.id },
  });
  if (existing) {
    throw new ConflictError("A club with this name already exists in this district", {
      name: ["A club with this name already exists in this district"],
    });
  }

  const club = await db.$transaction(async (tx) => {
    const c = await tx.club.create({
      data: {
        name: input.name.trim(),
        districtId: district.id,
        city: input.city?.trim() || null,
        country: input.country?.trim() || null,
      },
      select: { id: true },
    });
    await auditCreate(tx, {
      actorId: admin.id,
      action: "admin.club_created",
      targetType: "Club",
      targetId: c.id,
      metadata: {
        name: input.name,
        districtId: district.id,
        districtCode: district.code,
        city: input.city,
        country: input.country,
      },
    });
    return c;
  });

  return { id: club.id };
}

/** Demote a district admin back to a plain member and unassign their district. */
export async function revokeDistrictAdmin(
  actor: Actor,
  userId: string,
): Promise<void> {
  const admin = assertManagement(actor);

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, managedDistrictId: true },
  });
  if (!target || target.role !== "DISTRICT_ADMIN") {
    throw new NotFoundError("District admin not found");
  }

  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: { role: "MEMBER", managedDistrictId: null },
    }),
    auditCreate(db, {
      actorId: admin.id,
      action: "admin.district_admin_revoked",
      targetType: "User",
      targetId: userId,
      metadata: { priorDistrictId: target.managedDistrictId },
    }),
  ]);
  await invalidateActor(userId);
}

/** Move a district admin to a different district. */
export async function reassignDistrictAdmin(
  actor: Actor,
  userId: string,
  districtId: string,
): Promise<void> {
  const admin = assertManagement(actor);

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, managedDistrictId: true },
  });
  if (!target || target.role !== "DISTRICT_ADMIN") {
    throw new NotFoundError("District admin not found");
  }

  const district = await db.district.findUnique({
    where: { id: districtId },
    select: { id: true },
  });
  if (!district) throw new NotFoundError("District not found");

  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: { managedDistrictId: district.id },
    }),
    auditCreate(db, {
      actorId: admin.id,
      action: "admin.district_admin_reassigned",
      targetType: "User",
      targetId: userId,
      metadata: { fromDistrictId: target.managedDistrictId, toDistrictId: district.id },
    }),
  ]);
  await invalidateActor(userId);
}

import "server-only";
import { db } from "@/backend/db";
import { assertVerified, type Actor } from "@/backend/actor";
import { recordAudit } from "@/backend/audit";

/**
 * Profile-editing service.
 *
 * Only VERIFIED members may update their profile. The update is a full replace
 * of all editable fields (nulls clear the old value).
 */

export type ProfileInput = {
  fullName: string;
  photoUrl: string | null;
  bio: string | null;
  phone: string | null;
  whatsapp: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  linkedin: string | null;
  instagram: string | null;
};

export async function updateProfile(
  actor: Actor,
  input: ProfileInput,
): Promise<void> {
  assertVerified(actor);

  const profile = await db.profile.update({
    where: { userId: actor.id },
    data: input,
  });

  void recordAudit({
    actorId: actor.id,
    action: "profile.updated",
    targetType: "Profile",
    targetId: profile.id,
  });
}

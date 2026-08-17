"use server";

import { redirect } from "next/navigation";
import { db } from "@/backend/db";
import { invalidateActor } from "@/backend/actor";
import { verifyAgainstRoster } from "@/backend/verification";
import { requireUser } from "@/backend/auth-helpers";
import { rotaryProfileSchema } from "@/shared/validators";
import { isAppError } from "@/backend/errors";
import type { FormState } from "@/backend/actions/auth";

export async function completeRotaryProfileAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const sessionUser = await requireUser();

  // Guard: only REGISTERED users need to complete this step.
  const current = await db.user.findUnique({
    where: { id: sessionUser.id },
    select: { status: true },
  });
  if (!current || current.status !== "REGISTERED") {
    redirect("/onboarding/payment");
  }

  const parsed = rotaryProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;

  try {
    const district = await db.district.findUnique({ where: { id: data.districtId } });
    if (!district) return { error: "Selected district not found — please choose again." };

    const outcome = await verifyAgainstRoster({
      rotaryId: data.rotaryId,
      fullName: data.fullName,
      districtCode: district.code,
    });

    await db.$transaction([
      db.profile.upsert({
        where: { userId: sessionUser.id },
        create: { userId: sessionUser.id, fullName: data.fullName, phone: data.phone, country: data.country ?? null },
        update: { fullName: data.fullName, phone: data.phone, country: data.country ?? null },
      }),
      db.rotaryInfo.create({
        data: {
          userId: sessionUser.id,
          rotaryId: data.rotaryId,
          classification: null,
          districtId: data.districtId,
          matchedRosterId: null,
        },
      }),
      db.verificationRequest.create({
        data: {
          userId: sessionUser.id,
          submittedInfo: {
            rotaryId: data.rotaryId,
            clubName: data.clubName,
            districtCode: district.code,
            score: outcome.score,
            reason: outcome.reason,
          },
        },
      }),
      db.user.update({
        where: { id: sessionUser.id },
        data: { status: "PAYMENT_PENDING" },
      }),
    ]);

    await invalidateActor(sessionUser.id);
  } catch (err) {
    if (isAppError(err)) return { error: err.message };
    throw err;
  }

  redirect("/onboarding/payment");
}

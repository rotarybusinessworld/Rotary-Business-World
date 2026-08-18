"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireVerified } from "@/backend/auth-helpers";
import { needSchema } from "@/shared/validators";
import * as needs from "@/backend/needs";
import * as messaging from "@/backend/messaging";
import { isAppError } from "@/backend/errors";

/**
 * Web adapter for the Needs/Leads module. Thin: auth gate → validate → call
 * `@/backend/needs` → error → form state / redirect. No domain logic here.
 */

export type NeedFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

/** Post a Need, then land the buyer on their needs list. */
export async function createNeedAction(
  _prev: NeedFormState,
  formData: FormData,
): Promise<NeedFormState> {
  const user = await requireVerified();

  const parsed = needSchema.safeParse({
    categoryId: formData.get("categoryId"),
    tradeIntent: formData.get("tradeIntent"),
    reachWanted: formData.get("reachWanted"),
    quantity: formData.get("quantity"),
    budgetMin: formData.get("budgetMin"),
    budgetMax: formData.get("budgetMax"),
    notes: formData.get("notes"),
    urgent: formData.get("urgent"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    await needs.createNeed(user, {
      categoryId: parsed.data.categoryId,
      tradeIntent: parsed.data.tradeIntent,
      reachWanted: parsed.data.reachWanted,
      quantity: parsed.data.quantity || null,
      budgetMin: parsed.data.budgetMin ?? null,
      budgetMax: parsed.data.budgetMax ?? null,
      notes: parsed.data.notes || null,
      urgent: parsed.data.urgent ?? false,
    });
  } catch (err) {
    if (isAppError(err)) return { error: err.message, fieldErrors: err.fieldErrors };
    throw err;
  }

  redirect("/dashboard/needs?posted=1"); // outside try — redirect throws
}

/** Live recipient estimate for the form (called from the client as inputs change). */
export async function estimateRecipientsAction(input: {
  categoryId: string;
  tradeIntent: string;
  reachWanted: string;
}): Promise<number> {
  const user = await requireVerified();
  if (!input.categoryId) return 0;
  try {
    return await needs.estimateNeedRecipients(user, {
      categoryId: input.categoryId,
      // Trust the client only for these three low-stakes filter inputs; the
      // service re-resolves the member's district/country itself.
      tradeIntent: input.tradeIntent as never,
      reachWanted: input.reachWanted as never,
    });
  } catch {
    return 0;
  }
}

/**
 * Mark all of the owner's delivered leads as viewed. Called from a client effect
 * when the inbox actually mounts — NOT during render, so route prefetch of the
 * leads link can't clear the badge before the user opens it. Mirrors the
 * messaging `markRead` convention (an explicit action, never in-render).
 */
export async function markLeadsViewedAction(): Promise<void> {
  const user = await requireVerified();
  await needs.markAllLeadsViewed(user);
}

/** One-click "Not relevant" from the leads inbox. */
export async function markLeadNotRelevantAction(matchId: string): Promise<void> {
  const user = await requireVerified();
  try {
    await needs.recordLeadFeedback(user, matchId, "NOT_RELEVANT");
  } catch (err) {
    if (!isAppError(err)) throw err;
  }
  revalidatePath("/dashboard/leads");
}

/** "I can help" — open a 1:1 thread with the buyer and land on it. */
export async function contactBuyerAction(formData: FormData): Promise<void> {
  const user = await requireVerified();
  const matchId = String(formData.get("matchId") ?? "");

  let conversationId: string;
  try {
    const buyerId = await needs.getLeadBuyer(user, matchId);
    const res = await messaging.startConversation(user, buyerId);
    conversationId = res.conversationId;
  } catch (err) {
    if (isAppError(err)) redirect("/dashboard/leads");
    throw err;
  }

  redirect(`/messages/${conversationId}`); // outside try — redirect throws
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireVerified } from "@/backend/auth-helpers";
import { sendMessageSchema } from "@/shared/validators";
import * as messaging from "@/backend/messaging";
import type { MessageDTO } from "@/shared/types/messaging";
import { isAppError } from "@/backend/errors";

/**
 * Web adapter for the messaging module.
 *
 * Thin: auth gate → validate → call `@/backend/messaging` → error → form state,
 * cache revalidation, redirect. No domain logic here. Imports only from the
 * messaging barrel, never `service.ts`.
 */

export type MessageFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  /** Set on a successful send so the client thread can append it immediately. */
  message?: MessageDTO;
};

/** Start (or reopen) a 1:1 conversation, then land on the thread. */
export async function startConversationAction(formData: FormData): Promise<void> {
  const user = await requireVerified();
  const recipientId = String(formData.get("recipientId") ?? "");

  let conversationId: string;
  try {
    const res = await messaging.startConversation(user, recipientId);
    conversationId = res.conversationId;
  } catch (err) {
    // Block / not-verified / self — nothing to show inline on a plain form.
    if (isAppError(err)) redirect("/directory");
    throw err;
  }

  redirect(`/messages/${conversationId}`); // outside try — redirect throws
}

/** Send a message in an existing conversation (useActionState composer). */
export async function sendMessageAction(
  _prev: MessageFormState,
  formData: FormData,
): Promise<MessageFormState> {
  const user = await requireVerified();

  const parsed = sendMessageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  let message: MessageDTO;
  try {
    message = await messaging.sendMessage(user, parsed.data);
  } catch (err) {
    if (isAppError(err)) return { error: err.message, fieldErrors: err.fieldErrors };
    throw err;
  }

  // Refresh the inbox (ordering + unread badge). The thread itself updates
  // client-side from the returned message, so it doesn't wait on revalidation.
  revalidatePath("/messages");
  return { message };
}

/** Mark a conversation read (called from the thread on open / on new messages). */
export async function markReadAction(conversationId: string): Promise<void> {
  const user = await requireVerified();
  try {
    await messaging.markRead(user, conversationId);
  } catch (err) {
    if (isAppError(err)) return; // nothing to surface; read-marking is best-effort
    throw err;
  }
  revalidatePath("/messages");
}

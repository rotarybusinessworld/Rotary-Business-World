"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { SendHorizonal } from "lucide-react";
import {
  sendMessageAction,
  type MessageFormState,
} from "@/backend/actions/messaging";
import type { MessageDTO } from "@/shared/types/messaging";
import { Button } from "@/frontend/ui/button";
import { Textarea } from "@/frontend/ui/input";
import { FormError } from "@/frontend/ui/field-error";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="icon" loading={pending} aria-label="Send message">
      <SendHorizonal className="h-4 w-4" />
    </Button>
  );
}

export function MessageComposer({
  conversationId,
  onSent,
}: {
  conversationId: string;
  /** Called with the just-created message so the thread can append it instantly. */
  onSent?: (message: MessageDTO) => void;
}) {
  const [state, formAction] = useActionState<MessageFormState, FormData>(
    sendMessageAction,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  // On a successful send: hand the message to the thread and clear the box.
  useEffect(() => {
    if (state.message) {
      onSent?.(state.message);
      formRef.current?.reset();
    }
  }, [state, onSent]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="border-t border-border bg-card px-4 py-3"
    >
      <input type="hidden" name="conversationId" value={conversationId} />
      {(state.error || state.fieldErrors?.body) && (
        <div className="mb-2">
          <FormError message={state.error ?? state.fieldErrors?.body?.[0]} />
        </div>
      )}
      <div className="flex items-end gap-2">
        <Textarea
          name="body"
          required
          rows={1}
          placeholder="Write a message…"
          className="min-h-[44px] max-h-40 resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <SubmitButton />
      </div>
    </form>
  );
}

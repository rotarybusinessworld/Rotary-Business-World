import { MessageCircle } from "lucide-react";
import { startConversationAction } from "@/backend/actions/messaging";
import { buttonVariants } from "@/frontend/ui/button";
import { cn } from "@/shared/utils";

/**
 * "Message" entry point. Posts to the start-conversation action, which
 * get-or-creates the 1:1 thread and redirects to it. Render only for verified
 * viewers messaging a verified member other than themselves — the action
 * re-checks, but gating the UI avoids a pointless redirect.
 */
export function StartConversationButton({
  recipientId,
  label = "Message",
  className,
  variant = "outline",
  size = "sm",
}: {
  recipientId: string;
  label?: string;
  className?: string;
  variant?: "primary" | "gold" | "outline" | "ghost" | "link";
  size?: "sm" | "md" | "lg";
}) {
  return (
    <form action={startConversationAction}>
      <input type="hidden" name="recipientId" value={recipientId} />
      <button
        type="submit"
        className={cn(buttonVariants({ variant, size }), className)}
      >
        <MessageCircle className="h-4 w-4" />
        {label}
      </button>
    </form>
  );
}

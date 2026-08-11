"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Star } from "lucide-react";
import {
  submitReviewAction,
  type ReviewFormState,
} from "@/backend/actions/review";
import { Button } from "@/frontend/ui/button";
import { Label, Textarea } from "@/frontend/ui/input";
import { FieldError, FormError } from "@/frontend/ui/field-error";
import { cn } from "@/shared/utils";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} loadingText="Submitting…">
      Submit review
    </Button>
  );
}

function StarSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;

  return (
    <div
      className="flex items-center gap-0.5"
      onMouseLeave={() => setHovered(0)}
      role="group"
      aria-label="Rating"
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          className="rounded p-0.5 text-muted-foreground/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Star
            className={cn(
              "h-7 w-7 transition-colors duration-100",
              n <= active
                ? "fill-rotary-gold text-rotary-gold"
                : "fill-transparent",
            )}
          />
        </button>
      ))}
    </div>
  );
}

export function ReviewForm({
  businessId,
  slug,
  existingReview,
}: {
  businessId: string;
  slug: string;
  existingReview?: { rating: number; body: string | null } | null;
}) {
  const [state, formAction] = useActionState<ReviewFormState, FormData>(
    submitReviewAction,
    {},
  );
  const [rating, setRating] = useState(existingReview?.rating ?? 0);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="rating" value={rating} />

      <FormError message={state.error} />
      {state.ok && (
        <div className="flex items-center gap-2 rounded-[var(--radius)] border border-success/30 bg-[color-mix(in_srgb,var(--color-success)_8%,white)] px-3 py-2 text-sm text-success">
          <Check className="h-4 w-4 shrink-0" />
          {existingReview ? "Review updated." : "Review submitted."}
        </div>
      )}

      <div>
        <Label>Your rating</Label>
        <StarSelector value={rating} onChange={setRating} />
        <FieldError messages={state.fieldErrors?.rating} />
      </div>

      <div>
        <Label htmlFor="review-body">Comments (optional)</Label>
        <Textarea
          id="review-body"
          name="body"
          defaultValue={existingReview?.body ?? ""}
          placeholder="Share your experience with this business…"
          className="min-h-[96px]"
        />
        <FieldError messages={state.fieldErrors?.body} />
      </div>

      <SubmitButton />
    </form>
  );
}

import { MailCheck } from "lucide-react";
import { Card, CardContent } from "@/frontend/ui/card";

export const metadata = { title: "Check your email — Rotary Business World" };

export default function VerifyRequestPage() {
  return (
    <Card>
      <CardContent className="p-6 sm:p-8">
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rotary-gold/10">
            <MailCheck className="h-7 w-7 text-rotary-gold" />
          </div>

          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
              Check your email
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We sent a sign-in link to your email address. Click it to continue
              — the link expires in 24 hours and works only once.
            </p>
          </div>

          <p className="text-xs text-muted-foreground/70">
            Didn&apos;t receive it? Check your spam folder, or go back and try
            again.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

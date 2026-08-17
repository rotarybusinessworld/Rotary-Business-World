import NextAuth from "next-auth";
import ResendProvider from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Role, UserStatus } from "@prisma/client";
import { Resend } from "resend";
import { db } from "@/backend/db";

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: { signIn: "/login", verifyRequest: "/verify-request" },
  trustHost: true,
  providers: [
    ResendProvider({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM ?? "noreply@rotarybusinessworld.com",
      async sendVerificationRequest({ identifier: email, url }) {
        // Only send to emails that are registered — prevents spam to arbitrary
        // addresses while keeping UX consistent ("check your email" regardless).
        const exists = await db.user.findUnique({
          where: { email },
          select: { id: true },
        });
        if (!exists) return;

        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) throw new Error("RESEND_API_KEY is not configured");

        await new Resend(apiKey).emails.send({
          from: process.env.EMAIL_FROM ?? "noreply@rotarybusinessworld.com",
          to: email,
          subject: "Sign in to Rotary Business World",
          html: magicLinkEmail(url),
        });
      },
    }),
  ],
  callbacks: {
    // Defense in depth: block sign-in for emails not in our user table.
    // Primary guard is sendVerificationRequest (no email sent); this catches
    // stale VerificationToken rows that somehow survive without a user.
    async signIn({ user, account }) {
      if (account?.provider === "resend") {
        const exists = await db.user.findUnique({
          where: { email: user.email! },
          select: { id: true },
        });
        return !!exists;
      }
      return true;
    },
    // Persist identity fields onto the JWT at sign-in; apply partial updates
    // written by unstable_update() (e.g. status change after payment).
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.status = user.status;
      }
      if (trigger === "update" && session?.user) {
        if (session.user.status !== undefined) token.status = session.user.status;
        if (session.user.role !== undefined) token.role = session.user.role;
      }
      return token;
    },
    // Expose them on the session for server components and the client.
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.status = token.status as UserStatus;
      }
      return session;
    },
  },
});

function magicLinkEmail(url: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Sign in to Rotary Business World</title>
</head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#0b1226;padding:28px 40px;text-align:center;">
              <span style="display:inline-block;background:#c9a24c;color:#0b1226;font-weight:700;font-size:18px;letter-spacing:0.06em;padding:8px 18px;border-radius:8px;">
                RBW
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0b1226;line-height:1.3;">
                Sign in to Rotary Business World
              </h1>
              <p style="margin:0 0 28px;color:#555;font-size:15px;line-height:1.6;">
                Click the button below to sign in. This link expires in 24 hours and can only be used once.
              </p>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${url}"
                      style="display:inline-block;background:#c9a24c;color:#fff;font-weight:600;font-size:15px;text-decoration:none;padding:14px 36px;border-radius:8px;letter-spacing:0.02em;">
                      Sign in
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:28px 0 0;color:#aaa;font-size:12px;text-align:center;line-height:1.5;">
                If you didn't request this, you can safely ignore it.<br/>
                This link was sent to you because someone entered your email address.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { Role, UserStatus } from "@prisma/client";
import { db } from "@/backend/db";
import { verifyPassword } from "@/backend/password";
import { loginSchema } from "@/shared/validators";

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await db.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
          include: { profile: true },
        });
        if (!user) return null;

        const ok = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.profile?.fullName ?? user.email,
          role: user.role,
          status: user.status,
        };
      },
    }),
  ],
  callbacks: {
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

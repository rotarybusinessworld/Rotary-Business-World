import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks — hoisted before any imports ────────────────────────────────────────

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    // Mirror the real redirect() which throws a special Next.js error that
    // stops execution. Tests catch this to assert the redirect target.
    const err = Object.assign(new Error(`NEXT_REDIRECT:${url}`), {
      type: "NEXT_REDIRECT",
      url,
    });
    throw err;
  }),
}));

vi.mock("@/backend/auth", () => ({
  auth: vi.fn(),
  unstable_update: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/backend/actor", () => ({
  getActor: vi.fn(),
  invalidateActor: vi.fn().mockResolvedValue(undefined),
  assertAdmin: vi.fn((actor: unknown) => actor),
}));

import { redirect } from "next/navigation";
import { auth, unstable_update } from "@/backend/auth";
import { getActor } from "@/backend/actor";
import { requireAdmin, requireVerified } from "@/backend/auth-helpers";

const mockAuth = vi.mocked(auth);
const mockGetActor = vi.mocked(getActor);
const mockRedirect = vi.mocked(redirect);
const mockUpdate = vi.mocked(unstable_update);

// ── Helpers ───────────────────────────────────────────────────────────────────

function activeAdmin(overrides = {}) {
  return {
    user: {
      id: "u1",
      role: "DISTRICT_ADMIN" as const,
      status: "VERIFIED" as const,
      ...overrides,
    },
  };
}

function actorSnapshot(overrides = {}) {
  return {
    id: "u1",
    role: "DISTRICT_ADMIN" as const,
    status: "VERIFIED" as const,
    managedDistrictId: "dist_01",
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("requireAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects a suspended admin to /account/suspended", async () => {
    mockAuth.mockResolvedValue(activeAdmin() as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    mockGetActor.mockResolvedValue(actorSnapshot({ status: "SUSPENDED" }) as ReturnType<typeof getActor> extends Promise<infer T> ? T : never);

    await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT:/account/suspended");
    expect(mockRedirect).toHaveBeenCalledWith("/account/suspended");
    expect(mockUpdate).toHaveBeenCalledWith({ user: { status: "SUSPENDED" } });
  });

  it("returns the user when they are an active admin", async () => {
    mockAuth.mockResolvedValue(activeAdmin() as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    mockGetActor.mockResolvedValue(actorSnapshot() as ReturnType<typeof getActor> extends Promise<infer T> ? T : never);

    const user = await requireAdmin();
    expect(user.id).toBe("u1");
    expect(user.role).toBe("DISTRICT_ADMIN");
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("refreshes the JWT when the role was revoked and redirects to /dashboard", async () => {
    mockAuth.mockResolvedValue(activeAdmin() as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    // Actor shows role was revoked back to MEMBER
    mockGetActor.mockResolvedValue(actorSnapshot({ role: "MEMBER" }) as ReturnType<typeof getActor> extends Promise<infer T> ? T : never);

    await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT:/dashboard");
    expect(mockUpdate).toHaveBeenCalledWith({ user: { role: "MEMBER" } });
  });
});

describe("requireVerified", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("makes exactly one getActor() call for a PENDING_VERIFICATION user", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "u2", role: "MEMBER", status: "PENDING_VERIFICATION" },
    } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    mockGetActor.mockResolvedValue(
      actorSnapshot({ id: "u2", role: "MEMBER", status: "PENDING_VERIFICATION" }) as ReturnType<typeof getActor> extends Promise<infer T> ? T : never,
    );

    // PENDING_VERIFICATION users are redirected to /dashboard (not yet approved)
    await expect(requireVerified()).rejects.toThrow("NEXT_REDIRECT:/dashboard");
    expect(mockGetActor).toHaveBeenCalledTimes(1);
  });

  it("skips getActor() for a user whose JWT already shows VERIFIED (fast path)", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "u3", role: "MEMBER", status: "VERIFIED" },
    } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);

    const user = await requireVerified();
    expect(user.id).toBe("u3");
    expect(mockGetActor).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock before importing the module under test so the Lua-script Redis client
// is never actually created.
const mockEval = vi.fn();

vi.mock("@/backend/redis", () => ({
  redis: { eval: mockEval },
}));

// Dynamic import so the mock is in place when the module initialises.
const { checkRateLimit } = await import("@/backend/rate-limit");

describe("checkRateLimit", () => {
  beforeEach(() => {
    mockEval.mockReset();
  });

  it("allows a request that is within the limit", async () => {
    mockEval.mockResolvedValue(3); // 3rd hit, limit is 5
    const result = await checkRateLimit("test:foo@example.com", 5, 60);
    expect(result).toEqual({ allowed: true, remaining: 2 });
  });

  it("allows the last request at the limit boundary (count === limit)", async () => {
    mockEval.mockResolvedValue(5); // 5th hit, limit is 5 — still allowed
    const result = await checkRateLimit("test:foo@example.com", 5, 60);
    expect(result).toEqual({ allowed: true, remaining: 0 });
  });

  it("blocks when the count exceeds the limit", async () => {
    mockEval.mockResolvedValue(9);
    const result = await checkRateLimit("test:foo@example.com", 5, 60);
    expect(result).toEqual({ allowed: false, remaining: 0 });
  });

  it("passes the correct key prefix and window to Redis", async () => {
    mockEval.mockResolvedValue(1);
    await checkRateLimit("login:user@example.com", 10, 120);
    expect(mockEval).toHaveBeenCalledWith(
      expect.any(String),     // Lua script
      1,
      "rate:login:user@example.com",
      "120",
    );
  });

  it("degrades gracefully when Redis throws (allows the request)", async () => {
    mockEval.mockRejectedValue(new Error("ECONNREFUSED"));
    const result = await checkRateLimit("test:foo@example.com", 5, 60);
    expect(result).toEqual({ allowed: true, remaining: 5 });
  });
});

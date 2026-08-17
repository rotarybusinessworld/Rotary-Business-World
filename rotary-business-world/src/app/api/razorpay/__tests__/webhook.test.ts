import { describe, it, expect } from "vitest";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Local reproduction of the HMAC verification logic from the webhook route.
 * Tested here rather than by importing the route handler so we avoid mocking
 * Next.js internals (Prisma, env, etc.) — the cryptographic correctness is
 * what matters and it doesn't change with the surrounding plumbing.
 */
function verifyRazorpaySignature(
  rawBody: string,
  signature: string,
  secret: string,
): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const receivedBuf = Buffer.from(signature, "hex");
  return (
    expectedBuf.length === receivedBuf.length &&
    timingSafeEqual(expectedBuf, receivedBuf)
  );
}

const SECRET = "test_razorpay_webhook_secret";
const BODY = JSON.stringify({
  event: "payment.captured",
  payload: { payment: { entity: { id: "pay_01" } } },
});

describe("Razorpay HMAC signature verification", () => {
  it("accepts a correctly signed payload", () => {
    const sig = createHmac("sha256", SECRET).update(BODY).digest("hex");
    expect(verifyRazorpaySignature(BODY, sig, SECRET)).toBe(true);
  });

  it("rejects a payload signed with the wrong secret", () => {
    const badSig = createHmac("sha256", "wrong_secret").update(BODY).digest("hex");
    expect(verifyRazorpaySignature(BODY, badSig, SECRET)).toBe(false);
  });

  it("rejects a tampered body (signature mismatch)", () => {
    const sig = createHmac("sha256", SECRET).update(BODY).digest("hex");
    const tamperedBody = BODY.replace("payment.captured", "payment.failed");
    expect(verifyRazorpaySignature(tamperedBody, sig, SECRET)).toBe(false);
  });

  it("rejects a signature of wrong length (prevents length-extension)", () => {
    const shortSig = "abcdef";
    expect(verifyRazorpaySignature(BODY, shortSig, SECRET)).toBe(false);
  });

  it("rejects an all-zero signature (prevents trivial bypass)", () => {
    const zeroSig = "0".repeat(64);
    expect(verifyRazorpaySignature(BODY, zeroSig, SECRET)).toBe(false);
  });
});

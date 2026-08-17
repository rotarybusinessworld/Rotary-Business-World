import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const txMock = {
  payment: {
    findUnique: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock("@/backend/db", () => ({
  db: {
    $transaction: vi.fn((cb: (tx: typeof txMock) => unknown) => cb(txMock)),
  },
}));

vi.mock("@/backend/actor", () => ({
  invalidateActor: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/backend/audit", () => ({
  auditCreate: vi.fn().mockResolvedValue(undefined),
}));

const { settlePayment } = await import("@/backend/services/payment");

// ── Tests ─────────────────────────────────────────────────────────────────────

const BASE = {
  userId: "user_01",
  razorpayOrderId: "order_01",
  razorpayPaymentId: "pay_01",
  amount: 50000,
  currency: "INR",
};

describe("settlePayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns { created: false } when the payment is already CAPTURED (idempotent)", async () => {
    txMock.payment.findUnique.mockResolvedValue({ id: "p1", status: "CAPTURED" });

    const result = await settlePayment(BASE);

    expect(result).toEqual({ created: false });
    expect(txMock.payment.update).not.toHaveBeenCalled();
    expect(txMock.user.update).not.toHaveBeenCalled();
  });

  it("updates the payment row from CREATED → CAPTURED and advances user to PENDING_VERIFICATION", async () => {
    txMock.payment.findUnique.mockResolvedValue({ id: "p1", status: "CREATED" });
    txMock.payment.update.mockResolvedValue({});
    txMock.user.findUnique.mockResolvedValue({ status: "PAYMENT_PENDING" });
    txMock.user.update.mockResolvedValue({});

    const result = await settlePayment(BASE);

    expect(result).toEqual({ created: true });
    expect(txMock.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "p1" },
        data: expect.objectContaining({ status: "CAPTURED", razorpayPaymentId: "pay_01" }),
      }),
    );
    expect(txMock.user.update).toHaveBeenCalledWith({
      where: { id: "user_01" },
      data: { status: "PENDING_VERIFICATION" },
    });
  });

  it("creates a fallback payment row when no pre-existing order exists", async () => {
    txMock.payment.findUnique.mockResolvedValue(null);
    txMock.payment.create.mockResolvedValue({});
    txMock.user.findUnique.mockResolvedValue({ status: "REGISTERED" });
    txMock.user.update.mockResolvedValue({});

    const result = await settlePayment(BASE);

    expect(result).toEqual({ created: true });
    expect(txMock.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "CAPTURED", razorpayOrderId: "order_01" }),
      }),
    );
  });

  it("does not advance user status when they are already beyond PAYMENT_PENDING", async () => {
    txMock.payment.findUnique.mockResolvedValue({ id: "p1", status: "CREATED" });
    txMock.payment.update.mockResolvedValue({});
    txMock.user.findUnique.mockResolvedValue({ status: "VERIFIED" });
    txMock.user.update.mockResolvedValue({});

    await settlePayment(BASE);

    expect(txMock.user.update).not.toHaveBeenCalled();
  });
});

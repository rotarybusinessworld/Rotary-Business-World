-- Add RAZORPAY to PaymentSource enum
ALTER TYPE "PaymentSource" ADD VALUE 'RAZORPAY';

-- Add Razorpay-specific columns to Payment
ALTER TABLE "Payment" ADD COLUMN "razorpayPaymentId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "razorpayOrderId" TEXT;

-- Unique constraint on razorpayPaymentId for idempotent dedup
CREATE UNIQUE INDEX "Payment_razorpayPaymentId_key" ON "Payment"("razorpayPaymentId");

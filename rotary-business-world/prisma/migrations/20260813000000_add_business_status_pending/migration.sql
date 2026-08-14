-- Add PENDING status to BusinessStatus enum.
-- New listings start as PENDING (invisible in search) until a district admin
-- approves them. The search layer already filters `status = 'ACTIVE'`.
ALTER TYPE "BusinessStatus" ADD VALUE IF NOT EXISTS 'PENDING' BEFORE 'DRAFT';

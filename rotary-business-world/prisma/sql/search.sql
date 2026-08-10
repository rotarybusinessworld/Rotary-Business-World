-- Search infrastructure for Rotary Business World.
-- Applied AFTER `prisma migrate` by `npm run db:search` (see package.json).
-- Idempotent: safe to run multiple times.

-- Fuzzy / typo-tolerant matching (trigram similarity + prefix search).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Weighted full-text vector on Business.
--   A = name              (highest relevance)
--   B = industry/category (the "same thing" facet)
--   C = city/country      (where)
--   D = description       (long tail)
ALTER TABLE "Business"
  DROP COLUMN IF EXISTS "searchVector";

ALTER TABLE "Business"
  ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce("name", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce("industryName", '')), 'B') ||
    setweight(to_tsvector('simple', coalesce("categoryName", '')), 'B') ||
    setweight(to_tsvector('simple', coalesce("city", '')), 'C') ||
    setweight(to_tsvector('simple', coalesce("country", '')), 'C') ||
    setweight(to_tsvector('english', coalesce("description", '')), 'D')
  ) STORED;

-- Full-text index.
CREATE INDEX IF NOT EXISTS "Business_searchVector_idx"
  ON "Business" USING GIN ("searchVector");

-- Trigram index for typo-tolerant / prefix matching on the business name.
CREATE INDEX IF NOT EXISTS "Business_name_trgm_idx"
  ON "Business" USING GIN ("name" gin_trgm_ops);

-- Trigram index on roster names for fuzzy verification matching.
CREATE INDEX IF NOT EXISTS "RosterMember_fullName_trgm_idx"
  ON "RosterMember" USING GIN ("fullName" gin_trgm_ops);

-- Search infrastructure for Rotary Business World.
-- Applied AFTER `prisma migrate` by `npm run db:search` (see package.json).
-- Idempotent: safe to run multiple times.

-- Fuzzy / typo-tolerant matching (trigram similarity + prefix search).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Lower the word_similarity threshold for the <% operator from the default 0.6 to 0.3.
-- This is critical for the multi-field fuzzy path (searchText <% query) to catch common
-- misspellings like "restaurnt" → "restaurant" and cross-form searches like "plumber" →
-- "Plumbing". The change is persisted at the DATABASE level so all new connections inherit it.
-- Requires database owner or superuser. Wrapped in DO so a permission error is advisory only.
DO $$
BEGIN
  EXECUTE format(
    'ALTER DATABASE %I SET pg_trgm.word_similarity_threshold = 0.3',
    current_database()
  );
EXCEPTION WHEN others THEN
  RAISE NOTICE
    'Could not set pg_trgm.word_similarity_threshold at DB level (%); '
    'fuzzy word-similarity matching uses the default 0.6 threshold. '
    'Run manually as a superuser if common misspellings miss results.',
    SQLERRM;
END;
$$;

-- ── Step 0: Remove the old trigger ────────────────────────────────────────────
-- The init migration created a BEFORE INSERT/UPDATE trigger that wrote to
-- "searchVector". After search.sql converted the column to GENERATED STORED,
-- the trigger conflicts: Postgres forbids assigning to a generated column and
-- throws "cannot insert into a generated column" on every business write.
DROP TRIGGER IF EXISTS business_search_vector_trigger ON "Business";
DROP FUNCTION IF EXISTS business_search_vector_update();

-- ── Weighted full-text vector (GENERATED STORED) ───────────────────────────
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

-- ── Step 1: Multi-field trigram search column ──────────────────────────────
-- Concatenated plain-text of all searchable fields. One GIN index backs the
-- fuzzy word-similarity operator (<%) across name + industry + category +
-- city + country + description, giving typo-tolerance on every field (not
-- just the business name).
ALTER TABLE "Business" DROP COLUMN IF EXISTS "searchText";
ALTER TABLE "Business"
  ADD COLUMN "searchText" text
  GENERATED ALWAYS AS (
    coalesce("name", '')         || ' ' ||
    coalesce("industryName", '') || ' ' ||
    coalesce("categoryName", '') || ' ' ||
    coalesce("city", '')         || ' ' ||
    coalesce("country", '')      || ' ' ||
    coalesce("description", '')
  ) STORED;

-- One trigram index covers all fuzzy lookups against searchText.
CREATE INDEX IF NOT EXISTS "Business_searchText_trgm_idx"
  ON "Business" USING GIN ("searchText" gin_trgm_ops);

-- City-specific trigram index for the suggest() city bucket query.
CREATE INDEX IF NOT EXISTS "Business_city_trgm_idx"
  ON "Business" USING GIN ("city" gin_trgm_ops);

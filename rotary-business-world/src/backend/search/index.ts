import { PostgresSearchService } from "./postgres";
import type { SearchService } from "./types";

// Single place to swap the search backend later (Typesense/Meilisearch/etc.).
let instance: SearchService | null = null;

export function getSearchService(): SearchService {
  if (!instance) instance = new PostgresSearchService();
  return instance;
}

export type * from "./types";

export type SearchParams = {
  q?: string;
  industry?: string; // industry name
  category?: string; // category name
  country?: string;
  city?: string;
  page?: number;
  pageSize?: number;
  /**
   * When true, skip the did-you-mean correction and return the raw zero-result
   * response. Used when the user explicitly clicks "search instead for <original>".
   */
  forceOriginal?: boolean;
};

export type BusinessHit = {
  id: string;
  name: string;
  slug: string;
  logoKey: string | null;
  city: string | null;
  country: string | null;
  industryName: string | null;
  categoryName: string | null;
  ownerVerified: boolean;
};

export type Facet = { value: string; count: number };

export type SearchResult = {
  hits: BusinessHit[];
  total: number;
  page: number;
  pageSize: number;
  facets: {
    industry: Facet[];
    country: Facet[];
  };
  /**
   * Populated when `total === 0` and a nearby spelling was found.
   * The caller re-ran search with `corrected` and those results are in `hits`.
   * Render as: "Showing results for <corrected> — search instead for <original>".
   */
  didYouMean?: { corrected: string; original: string };
};

/**
 * A single autocomplete suggestion.
 * `type` drives the navigation target:
 *   "business"  → /directory?q=label
 *   "industry"  → /directory?industry=label
 *   "category"  → /directory?category=label
 *   "city"      → /directory?city=label
 */
export type Suggestion = {
  label: string;
  type: "business" | "industry" | "category" | "city";
};

/**
 * The search boundary. Swap the Postgres implementation for Typesense/Meilisearch
 * later without touching any caller. See backend/search/index.ts.
 */
export interface SearchService {
  search(params: SearchParams): Promise<SearchResult>;
  suggest(q: string): Promise<Suggestion[]>;
}

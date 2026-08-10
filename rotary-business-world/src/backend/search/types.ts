export type SearchParams = {
  q?: string;
  industry?: string; // industry name
  category?: string; // category name
  country?: string;
  city?: string;
  page?: number;
  pageSize?: number;
};

export type BusinessHit = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
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
};

export type Suggestion = { label: string; type: "business" | "category" };

/**
 * The search boundary. Swap the Postgres implementation for Typesense/Meilisearch
 * later without touching any caller. See lib/search/index.ts.
 */
export interface SearchService {
  search(params: SearchParams): Promise<SearchResult>;
  suggest(q: string): Promise<Suggestion[]>;
}

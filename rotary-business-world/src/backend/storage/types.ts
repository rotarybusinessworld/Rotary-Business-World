export interface StorageService {
  /** Store bytes under a generated key in the given folder; return the storage URL and key. */
  put(params: {
    folder: string;
    bytes: Buffer;
    contentType: string;
    ext: string;
  }): Promise<{ url: string; key: string }>;

  /**
   * Retrieve stored bytes by key. Returns null if the object does not exist.
   * Used by the authenticated image proxy route (`/api/images/[...key]`) so the
   * bucket can remain private — the app's credentials serve objects to logged-in users.
   */
  get(key: string): Promise<{ bytes: Buffer; contentType?: string } | null>;
}

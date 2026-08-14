export interface StorageService {
  /** Store bytes under a generated key in the given folder; return the storage URL and key. */
  put(params: {
    folder: string;
    bytes: Buffer;
    contentType: string;
    ext: string;
  }): Promise<{ url: string; key: string }>;
}

/** Handles binary file storage: upload, download, and deletion. */
export interface IFileStoragePort {
  /** Uploads a file and returns its storage URL or key. */
  upload(key: string, buffer: Buffer, mimetype: string): Promise<string>;
  /** Downloads the content of a stored file. */
  download(key: string): Promise<Buffer>;
  /** Deletes a stored file. */
  delete(key: string): Promise<void>;
  /** Lists the keys of all stored files. */
  list(): Promise<string[]>;
  /** Deletes all stored files. */
  deleteAll(): Promise<void>;
}

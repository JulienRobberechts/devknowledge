import { S3Client } from "@aws-sdk/client-s3";
import config from "../../../config";
import type { IFileStoragePort } from "../../../infra-ports/storage/IFileStoragePort";
import { LocalFileStorage } from "./LocalFileStorage";
import { R2FileStorage } from "./R2FileStorage";

export interface StorageBackends {
  local: IFileStoragePort;
  r2: IFileStoragePort | null;
}

export function createStorageBackends(): StorageBackends {
  const local = new LocalFileStorage(config.api.uploadDir);

  const { accountId, accessKeyId, secretAccessKey, bucketName } = config.storage.r2;
  if (accountId && accessKeyId && secretAccessKey && bucketName) {
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
    return { local, r2: new R2FileStorage(client, bucketName) };
  }

  return { local, r2: null };
}

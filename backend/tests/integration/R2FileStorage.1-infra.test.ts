import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { beforeAll, describe, expect } from "vitest";
import { R2FileStorage } from "../../src/infra/storage/files/R2FileStorage";
import { testFileStoragePort } from "../../src/infra-ports/storage/IFileStoragePortContract";

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } = process.env;

describe("R2FileStorage", () => {
  beforeAll(() => {
    const missing = [
      "R2_ACCOUNT_ID",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
      "R2_BUCKET_NAME",
    ].filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing R2 credentials: ${missing.join(", ")}`);
    }
  });

  testFileStoragePort(async () => {
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID as string,
        secretAccessKey: R2_SECRET_ACCESS_KEY as string,
      },
    });
    const storage = new R2FileStorage(client, R2_BUCKET_NAME as string);
    return {
      storage,
      cleanup: () => storage.deleteAll(),
      verifyOnMedium: async (key, expected) => {
        const response = await client.send(
          new GetObjectCommand({ Bucket: R2_BUCKET_NAME as string, Key: key }),
        );
        const chunks: Buffer[] = [];
        for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
          chunks.push(Buffer.from(chunk));
        }
        expect(Buffer.concat(chunks)).toEqual(expected);
      },
    };
  });
});

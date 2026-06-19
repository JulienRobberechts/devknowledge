import { Readable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { R2FileStorage } from "./R2FileStorage";

function makeReadable(data: Buffer): Readable {
  const stream = new Readable();
  stream.push(data);
  stream.push(null);
  return stream;
}

describe("R2FileStorage", () => {
  let mockSend: ReturnType<typeof vi.fn>;
  let storage: R2FileStorage;

  beforeEach(() => {
    mockSend = vi.fn();
    storage = new R2FileStorage({ send: mockSend } as never, "test-bucket");
  });

  it("upload sends PutObjectCommand and returns key", async () => {
    mockSend.mockResolvedValue({});
    const key = await storage.upload("test.pdf", Buffer.from("data"), "application/pdf");
    expect(key).toBe("test.pdf");
    const cmd = mockSend.mock.calls[0][0];
    expect(cmd.input).toMatchObject({
      Bucket: "test-bucket",
      Key: "test.pdf",
      ContentType: "application/pdf",
    });
  });

  it("download sends GetObjectCommand and returns buffer", async () => {
    const expected = Buffer.from("pdf content");
    mockSend.mockResolvedValue({ Body: makeReadable(expected) });
    const result = await storage.download("test.pdf");
    expect(result).toEqual(expected);
  });

  it("delete sends DeleteObjectCommand", async () => {
    mockSend.mockResolvedValue({});
    await storage.delete("test.pdf");
    const cmd = mockSend.mock.calls[0][0];
    expect(cmd.input).toMatchObject({ Bucket: "test-bucket", Key: "test.pdf" });
  });

  it("list returns all keys on a single page", async () => {
    mockSend.mockResolvedValue({
      Contents: [{ Key: "a.pdf" }, { Key: "b.txt" }],
      IsTruncated: false,
    });
    const keys = await storage.list();
    expect(keys).toEqual(["a.pdf", "b.txt"]);
  });

  it("list paginates until all keys are fetched", async () => {
    mockSend
      .mockResolvedValueOnce({
        Contents: [{ Key: "a.pdf" }],
        IsTruncated: true,
        NextContinuationToken: "tok1",
      })
      .mockResolvedValueOnce({
        Contents: [{ Key: "b.pdf" }],
        IsTruncated: false,
      });
    const keys = await storage.list();
    expect(keys).toEqual(["a.pdf", "b.pdf"]);
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it("list returns empty array when bucket is empty", async () => {
    mockSend.mockResolvedValue({ Contents: undefined, IsTruncated: false });
    const keys = await storage.list();
    expect(keys).toEqual([]);
  });
});

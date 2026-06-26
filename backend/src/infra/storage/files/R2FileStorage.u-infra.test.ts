import { beforeEach, describe, expect, it, vi } from "vitest";
import { R2FileStorage } from "./R2FileStorage";

describe("R2FileStorage", () => {
  let mockSend: ReturnType<typeof vi.fn>;
  let storage: R2FileStorage;

  beforeEach(() => {
    mockSend = vi.fn();
    storage = new R2FileStorage({ send: mockSend } as never, "test-bucket");
  });

  it("upload passes ContentType to PutObjectCommand", async () => {
    mockSend.mockResolvedValue({});
    await storage.upload("test.pdf", Buffer.from("data"), "application/pdf");
    expect(mockSend.mock.calls[0][0].input).toMatchObject({
      Bucket: "test-bucket",
      Key: "test.pdf",
      ContentType: "application/pdf",
    });
  });

  it("delete passes key to DeleteObjectCommand", async () => {
    mockSend.mockResolvedValue({});
    await storage.delete("test.pdf");
    expect(mockSend.mock.calls[0][0].input).toMatchObject({
      Bucket: "test-bucket",
      Key: "test.pdf",
    });
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
});

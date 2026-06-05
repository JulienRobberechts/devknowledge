import { z } from "zod";

export const createDocumentSchema = z.object({
  title: z.string().min(1).optional(),
});

export const documentResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  sourceType: z.enum(["pdf", "markdown", "text"]),
  status: z.enum(["pending", "processing", "ready", "error"]),
  createdAt: z.date(),
});

export type DocumentResponse = z.infer<typeof documentResponseSchema>;

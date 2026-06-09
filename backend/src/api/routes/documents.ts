import { randomUUID } from "crypto";
import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import { createDocumentSchema } from "../dto/document.dto";
import { DocumentRepository } from "../../domain/ports/DocumentRepository";
import { ChunkRepository } from "../../domain/ports/ChunkRepository";
import { IngestDocument } from "../../application/IngestDocument";

const upload = multer({ dest: "/tmp/devknowledge-uploads/" });

function sourceTypeFromMime(
  mimetype: string,
  originalname: string,
): "pdf" | "markdown" | "text" {
  if (mimetype === "application/pdf") return "pdf";
  const ext = path.extname(originalname).toLowerCase();
  if (ext === ".md" || ext === ".markdown") return "markdown";
  return "text";
}

export function documentsRouter(
  documentRepo: DocumentRepository,
  chunkRepo: ChunkRepository,
  ingestDocument: IngestDocument,
): Router {
  const router = Router();

  router.post(
    "/",
    upload.single("file"),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.file) {
          res.status(400).json({ error: "No file uploaded" });
          return;
        }

        const body = createDocumentSchema.parse(req.body);
        const title = body.title ?? path.basename(req.file.originalname);
        const sourceType = sourceTypeFromMime(
          req.file.mimetype,
          req.file.originalname,
        );

        const document = {
          id: randomUUID(),
          title,
          sourceType,
          status: "pending" as const,
          filePath: req.file.path,
          createdAt: new Date(),
        };

        await documentRepo.save(document);

        ingestDocument.execute(document.id).catch((err: unknown) => {
          console.error("Background ingestion failed:", err);
        });

        res.status(202).json({ id: document.id, status: "pending" });
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    "/",
    async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const docs = await documentRepo.findAll();
        res.json(docs);
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    "/:id",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const doc = await documentRepo.findById(req.params.id);
        if (!doc) {
          res.status(404).json({ error: "Document not found" });
          return;
        }
        res.json(doc);
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    "/:id/chunks",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const doc = await documentRepo.findById(req.params.id);
        if (!doc) {
          res.status(404).json({ error: "Document not found" });
          return;
        }
        const chunks = await chunkRepo.findByDocumentId(req.params.id);
        res.json(
          chunks.map((chunk) => ({
            position: chunk.metadata.position,
            contentLength: chunk.content.length,
            preview: chunk.content.slice(0, 100),
          })),
        );
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    "/:id/content",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const doc = await documentRepo.findById(req.params.id);
        if (!doc) {
          res.status(404).json({ error: "Document not found" });
          return;
        }
        const chunks = await chunkRepo.findByDocumentId(req.params.id);
        if (chunks.length === 0) {
          res.status(404).json({ error: "Content not available" });
          return;
        }
        const content = chunks.map((c) => c.content).join("\n\n");
        res.json({ content, sourceType: doc.sourceType });
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    "/:id/raw",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const doc = await documentRepo.findById(req.params.id);
        if (!doc) {
          res.status(404).json({ error: "Document not found" });
          return;
        }
        if (doc.sourceType !== "pdf" || !doc.filePath) {
          res.status(404).json({ error: "Raw file not available" });
          return;
        }
        res.setHeader("Content-Type", "application/pdf");
        res.sendFile(doc.filePath, { root: "/" });
      } catch (err) {
        next(err);
      }
    },
  );

  router.delete(
    "/:id",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const doc = await documentRepo.findById(req.params.id);
        if (!doc) {
          res.status(404).json({ error: "Document not found" });
          return;
        }
        await chunkRepo.deleteByDocumentId(req.params.id);
        await documentRepo.delete(req.params.id);
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}

import { randomUUID } from "crypto";
import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import { Logger } from "../../infrastructure/logger/Logger";

const logger = new Logger("documents");
import { DocumentRepository } from "../../domain/ports/DocumentRepository";
import { ChunkRepository } from "../../domain/ports/ChunkRepository";
import { DocumentSummaryRepository } from "../../domain/ports/DocumentSummaryRepository";
import { FileStoragePort } from "../../domain/ports/FileStoragePort";
import { IngestDocument } from "../../application/IngestDocument";
import { SummarizeDocument } from "../../application/SummarizeDocument";
import { createDocumentSchema } from "../dto/document.dto";

const ALLOWED_MIMETYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (
      ALLOWED_MIMETYPES.has(file.mimetype) ||
      ext === ".md" ||
      ext === ".markdown"
    ) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

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
  fileStorage: FileStoragePort,
  ingestDocument: IngestDocument,
  summaryRepo: DocumentSummaryRepository,
  summarizeDocument: SummarizeDocument,
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
        const originalName = Buffer.from(
          req.file.originalname,
          "latin1",
        ).toString("utf8");
        const title = body.title ?? path.basename(originalName);
        const sourceType = sourceTypeFromMime(req.file.mimetype, originalName);

        const id = randomUUID();
        const ext = path.extname(originalName).toLowerCase();
        const key = `${id}${ext}`;
        await fileStorage.upload(key, req.file.buffer, req.file.mimetype);

        const document = {
          id,
          title,
          sourceType,
          status: "pending" as const,
          filePath: key,
          createdAt: new Date(),
        };

        await documentRepo.save(document);

        ingestDocument.execute(document.id).catch((err: unknown) => {
          logger.error(
            "Background ingestion failed",
            err instanceof Error ? err : new Error(String(err)),
          );
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
        const doc = await documentRepo.findById(String(req.params.id));
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
        const doc = await documentRepo.findById(String(req.params.id));
        if (!doc) {
          res.status(404).json({ error: "Document not found" });
          return;
        }
        const chunks = await chunkRepo.findByDocumentId(String(req.params.id));
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
        const doc = await documentRepo.findById(String(req.params.id));
        if (!doc) {
          res.status(404).json({ error: "Document not found" });
          return;
        }
        const chunks = await chunkRepo.findByDocumentId(String(req.params.id));
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
        const doc = await documentRepo.findById(String(req.params.id));
        if (!doc) {
          res.status(404).json({ error: "Document not found" });
          return;
        }
        if (doc.sourceType !== "pdf" || !doc.filePath) {
          res.status(404).json({ error: "Raw file not available" });
          return;
        }
        const buffer = await fileStorage.download(doc.filePath);
        res.setHeader("Content-Type", "application/pdf");
        res.send(buffer);
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    "/:id/summary",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const doc = await documentRepo.findById(String(req.params.id));
        if (!doc) {
          res.status(404).json({ error: "Document not found" });
          return;
        }
        const summary = await summaryRepo.findByDocumentId(
          String(req.params.id),
        );
        if (!summary) {
          res.status(404).json({ error: "Summary not found" });
          return;
        }
        res.json(summary);
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    "/:id/summary",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const doc = await documentRepo.findById(String(req.params.id));
        if (!doc) {
          res.status(404).json({ error: "Document not found" });
          return;
        }
        if (doc.status !== "ready") {
          res.status(409).json({ error: "Document is not ready" });
          return;
        }
        const content = await summarizeDocument.execute(String(req.params.id));
        res.json({ content });
      } catch (err) {
        next(err);
      }
    },
  );

  router.delete(
    "/:id",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const doc = await documentRepo.findById(String(req.params.id));
        if (!doc) {
          res.status(404).json({ error: "Document not found" });
          return;
        }
        if (doc.filePath) {
          await fileStorage.delete(doc.filePath).catch(() => {});
        }
        await chunkRepo.deleteByDocumentId(String(req.params.id));
        await documentRepo.delete(String(req.params.id));
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}

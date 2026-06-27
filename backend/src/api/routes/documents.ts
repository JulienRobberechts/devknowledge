import path from "node:path";
import { type NextFunction, type Request, type Response, Router } from "express";
import multer from "multer";
import type { ArgosKnowledgeBase } from "../../app-ports/knowledgeBase";
import type { ILogger } from "../../infra-ports";
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
    if (ALLOWED_MIMETYPES.has(file.mimetype) || ext === ".md" || ext === ".markdown") {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

export function documentsRouter(kb: ArgosKnowledgeBase, logger: ILogger): Router {
  const router = Router();

  async function requireDoc(req: Request, res: Response) {
    const doc = await kb.documentQueries.get(String(req.params.id));
    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return null;
    }
    return doc;
  }

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
        const originalName = Buffer.from(req.file.originalname, "latin1").toString("utf8");

        const document = await kb.createDocument.execute({
          buffer: req.file.buffer,
          originalName,
          mimetype: req.file.mimetype,
          title: body.title,
        });

        kb.ingestDocument.execute(document.id).catch((err: unknown) => {
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

  router.get("/", async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const docs = await kb.documentQueries.list();
      res.json(docs);
    } catch (err) {
      next(err);
    }
  });

  router.get("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const doc = await requireDoc(req, res);
      if (!doc) return;
      res.json(doc);
    } catch (err) {
      next(err);
    }
  });

  router.get(
    "/:id/chunks",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const doc = await requireDoc(req, res);
        if (!doc) return;
        const chunks = await kb.documentQueries.getChunks(String(req.params.id));
        res.json(chunks);
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    "/:id/content",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const doc = await requireDoc(req, res);
        if (!doc) return;
        const content = await kb.documentQueries.getContent(String(req.params.id));
        if (!content) {
          res.status(404).json({ error: "Content not available" });
          return;
        }
        res.json(content);
      } catch (err) {
        next(err);
      }
    },
  );

  router.get("/:id/raw", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const doc = await requireDoc(req, res);
      if (!doc) return;
      const buffer = await kb.documentQueries.getRawBuffer(String(req.params.id));
      if (!buffer) {
        res.status(404).json({ error: "Raw file not available" });
        return;
      }
      res.setHeader("Content-Type", "application/pdf");
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  });

  router.get(
    "/:id/summary",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const doc = await requireDoc(req, res);
        if (!doc) return;
        const summary = await kb.documentQueries.getSummary(String(req.params.id));
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
        const doc = await requireDoc(req, res);
        if (!doc) return;
        if (doc.status !== "ready") {
          res.status(409).json({ error: "Document is not ready" });
          return;
        }
        const content = await kb.summarizeDocument.execute(String(req.params.id));
        res.json({ content });
      } catch (err) {
        next(err);
      }
    },
  );

  router.delete("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const doc = await requireDoc(req, res);
      if (!doc) return;
      await kb.deleteDocument.execute(String(req.params.id));
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  return router;
}

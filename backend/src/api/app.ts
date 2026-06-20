import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import config from "../config";
import {
  apiLogger,
  appSettingsService,
  askQuestion,
  checkStorageConsistency,
  conversationRepo,
  createDocument,
  deleteDocument,
  documentQueries,
  generateQuiz,
  ingestDocument,
  resetAll,
  retrieveKnowledge,
  summarizeDocument,
} from "../registry";
import { apiKeyAuth } from "./middleware/apiKeyAuth";
import { createErrorHandler } from "./middleware/errorHandler";
import { adminRouter } from "./routes/admin";
import { authRouter } from "./routes/auth";
import { configRouter } from "./routes/config";
import { conversationsRouter } from "./routes/conversations";
import { documentsRouter } from "./routes/documents";
import { quizzesRouter } from "./routes/quizzes";
import { searchRouter } from "./routes/search";

export function startApiServer(): void {
  const PORT = config.server.port;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

const app = express();

app.set("trust proxy", 1);

app.use(
  cors({
    origin: config.server.allowedOrigin,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter());

const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api", apiLimiter);
app.use("/api", apiKeyAuth);
app.use("/api/config", configRouter(appSettingsService));
app.use("/api/admin", adminRouter(checkStorageConsistency, appSettingsService, resetAll));
app.use(
  "/api/documents",
  documentsRouter(
    {
      createDocument,
      ingestDocument,
      summarizeDocument,
      deleteDocument,
      documentQueries,
    },
    apiLogger,
  ),
);
app.use("/api/conversations", conversationsRouter(conversationRepo, askQuestion, apiLogger));
app.use("/api/search", searchRouter(retrieveKnowledge));
app.use("/api/quizzes", quizzesRouter(generateQuiz));

app.use(createErrorHandler(apiLogger));

export default app;

import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { rateLimit } from "express-rate-limit";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Managed by the proxy layer
}));

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting — auth endpoints only
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in 15 minutes." },
});

const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Rate limit exceeded. Please slow down." },
});

// Apply rate limits before the main router
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/payments", strictLimiter);
app.use("/api/mpesa", strictLimiter);

app.use("/api", router);

// 404 handler — catches any /api/* route not matched above
app.use("/api/*name", (_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler — must have 4 params for Express to recognise it as an error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const status = (err as any)?.status ?? (err as any)?.statusCode ?? 500;
  const message =
    process.env["NODE_ENV"] === "production"
      ? status < 500 ? (err as any)?.message ?? "Request failed" : "Internal server error"
      : (err as any)?.message ?? "Internal server error";

  (req as any).log?.error({ err }, "Unhandled error");
  logger.error({ err, url: (req as any).url }, "Unhandled error");

  if (!res.headersSent) {
    res.status(status).json({ error: message });
  }
});

export default app;

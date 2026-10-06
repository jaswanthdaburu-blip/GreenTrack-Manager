import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { ApiProblem } from "./lib/supabase-rest";

const app: Express = express();

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
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);
app.use(
  (
    error: unknown,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    if (res.headersSent) {
      next(error);
      return;
    }
    const problem =
      error instanceof ApiProblem
        ? error
        : new ApiProblem(500, "Something went wrong. Please try again.");
    if (problem.status >= 500) {
      req.log.error({ err: error }, "GreenTrack API request failed");
    }
    res.status(problem.status).json({ error: problem.message });
  },
);

export default app;

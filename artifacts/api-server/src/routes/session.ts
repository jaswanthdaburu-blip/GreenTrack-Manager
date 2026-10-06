import { Router, type IRouter } from "express";
import { CreateSessionBody } from "@workspace/api-zod";
import {
  ApiProblem,
  verifySupabaseToken,
} from "../lib/supabase-rest";

const router: IRouter = Router();
const COOKIE_NAME = "gt_access_token";
const COOKIE_MAX_AGE_MS = 60 * 60 * 1000;

router.post("/session", async (req, res, next): Promise<void> => {
  try {
    const parsed = CreateSessionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "A valid sign-in session is required." });
      return;
    }
    await verifySupabaseToken(parsed.data.accessToken);
    res.cookie(COOKIE_NAME, parsed.data.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api",
      maxAge: COOKIE_MAX_AGE_MS,
    });
    res.sendStatus(204);
  } catch (error) {
    next(
      error instanceof ApiProblem
        ? error
        : new ApiProblem(401, "Your session could not be verified."),
    );
  }
});

router.delete("/session", (_req, res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api",
  });
  res.sendStatus(204);
});

export default router;

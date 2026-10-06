import type { NextFunction, Request, Response } from "express";
import {
  ApiProblem,
  getAccessToken,
  getSupabaseConfig,
  restRequest,
  verifySupabaseToken,
  type GreenTrackAuth,
} from "../lib/supabase-rest";

export async function attachGreenTrackAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const accessToken = getAccessToken(req);
    if (!accessToken) {
      res.status(401).json({ error: "Please sign in to continue." });
      return;
    }

    const user = await verifySupabaseToken(accessToken);
    const profileQuery = new URLSearchParams({
      select: "organization_id,role,full_name,email",
      id: `eq.${user.id}`,
      limit: "1",
    });
    const config = getSupabaseConfig();
    const response = await fetch(
      `${config.url}/rest/v1/profiles?${profileQuery.toString()}`,
      {
        headers: {
          apikey: config.key,
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      },
    );
    if (!response.ok) {
      throw new ApiProblem(503, "Your organization profile could not be loaded.");
    }
    const profiles = (await response.json()) as Array<{
      organization_id?: unknown;
      role?: unknown;
      full_name?: unknown;
      email?: unknown;
    }>;
    const profile = profiles[0];
    if (!profile || typeof profile.organization_id !== "string") {
      throw new ApiProblem(
        403,
        "Your organization profile is not ready. Contact your administrator.",
      );
    }

    const auth: GreenTrackAuth = {
      accessToken,
      userId: user.id,
      email: typeof profile.email === "string" ? profile.email : user.email,
      fullName:
        typeof profile.full_name === "string" ? profile.full_name : "",
      organizationId: profile.organization_id,
      role: profile.role === "STAFF" ? "STAFF" : "ADMIN",
    };
    req.greenTrackAuth = auth;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireGreenTrackAuth(req: Request): GreenTrackAuth {
  if (!req.greenTrackAuth) {
    throw new ApiProblem(401, "Please sign in to continue.");
  }
  return req.greenTrackAuth;
}

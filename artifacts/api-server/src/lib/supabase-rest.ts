import type { Request } from "express";

export type GreenTrackRole = "ADMIN" | "STAFF";

export interface GreenTrackAuth {
  accessToken: string;
  userId: string;
  email: string;
  fullName: string;
  organizationId: string;
  role: GreenTrackRole;
}

export class ApiProblem extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

declare global {
  namespace Express {
    interface Request {
      greenTrackAuth?: GreenTrackAuth;
    }
  }
}

export function getSupabaseConfig(): { url: string; key: string } {
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new ApiProblem(
      503,
      "GreenTrack needs VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY configured.",
    );
  }
  return { url: url.replace(/\/+$/, ""), key };
}

export function getAccessToken(req: Request): string | null {
  const cookieToken = req.cookies?.gt_access_token;
  if (typeof cookieToken === "string" && cookieToken.length > 0) {
    return cookieToken;
  }
  const authorization = req.get("authorization");
  return authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;
}

export async function verifySupabaseToken(
  accessToken: string,
): Promise<{ id: string; email: string }> {
  const config = getSupabaseConfig();
  const response = await fetch(`${config.url}/auth/v1/user`, {
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new ApiProblem(401, "Your session has expired. Please sign in again.");
  }

  const user = (await response.json()) as { id?: unknown; email?: unknown };
  if (typeof user.id !== "string") {
    throw new ApiProblem(401, "Your session could not be verified.");
  }
  return {
    id: user.id,
    email: typeof user.email === "string" ? user.email : "",
  };
}

export async function restRequest<T>(
  auth: GreenTrackAuth,
  resource: string,
  query: URLSearchParams,
  init: RequestInit = {},
): Promise<T> {
  const config = getSupabaseConfig();
  const url = new URL(`${config.url}/rest/v1/${resource}`);
  url.search = query.toString();
  const headers = new Headers(init.headers);
  headers.set("apikey", config.key);
  headers.set("Authorization", `Bearer ${auth.accessToken}`);
  headers.set("Accept", "application/json");
  if (init.body !== undefined) {
    headers.set("Content-Type", "application/json");
    headers.set("Prefer", "return=representation");
  }

  let response: Response;
  try {
    response = await fetch(url, { ...init, headers });
  } catch {
    throw new ApiProblem(503, "The database service is temporarily unavailable.");
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new ApiProblem(
        response.status,
        response.status === 403
          ? "You do not have permission to perform this action."
          : "Your session has expired. Please sign in again.",
      );
    }
    if (response.status === 409) {
      throw new ApiProblem(409, "A record with those details already exists.");
    }
    if (response.status === 404) {
      throw new ApiProblem(404, "The requested record was not found.");
    }
    if (response.status < 500) {
      throw new ApiProblem(400, "Please check the details and try again.");
    }
    throw new ApiProblem(503, "The database service is temporarily unavailable.");
  }

  if (response.status === 204) {
    return undefined as T;
  }
  const text = await response.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

export function orgQuery(
  auth: GreenTrackAuth,
  select: string,
): URLSearchParams {
  const query = new URLSearchParams();
  query.set("select", select);
  query.set("organization_id", `eq.${auth.organizationId}`);
  return query;
}

export function rows<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

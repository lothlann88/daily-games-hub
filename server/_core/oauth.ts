import type { Express, Request, Response } from "express";
import { sdk } from "./sdk";

function buildUserResponse(user: {
  id?: number | null;
  openId?: string | null;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  lastSignedIn?: Date | null;
}) {
  return {
    id: (user as any)?.id ?? null,
    openId: user?.openId ?? null,
    name: user?.name ?? null,
    email: user?.email ?? null,
    loginMethod: user?.loginMethod ?? null,
    lastSignedIn: (user?.lastSignedIn ?? new Date()).toISOString(),
  };
}

export function registerOAuthRoutes(app: Express) {
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    res.json({ success: true });
  });

  // Get current authenticated user via Supabase JWT in Authorization header.
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      res.json({ user: buildUserResponse(user) });
    } catch (error) {
      console.error("[Auth] /api/auth/me failed:", error);
      res.status(401).json({ error: "Not authenticated", user: null });
    }
  });
}

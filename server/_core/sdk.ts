import { ForbiddenError } from "../../shared/_core/errors.js";
import type { Request } from "express";
import { jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

type SupabaseTokenPayload = {
  sub?: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

const getBearerToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice("Bearer ".length).trim();
};

const getSupabaseJwtSecret = (): Uint8Array => {
  if (!ENV.supabaseJwtSecret) {
    throw ForbiddenError("Supabase JWT secret not configured");
  }
  return new TextEncoder().encode(ENV.supabaseJwtSecret);
};

const readMetadataName = (metadata: Record<string, unknown> | undefined): string | null => {
  if (!metadata) return null;
  const fullName = metadata.full_name;
  if (typeof fullName === "string" && fullName.length > 0) {
    return fullName;
  }
  const name = metadata.name;
  if (typeof name === "string" && name.length > 0) {
    return name;
  }
  return null;
};

class SDKServer {
  async authenticateRequest(req: Request): Promise<User> {
    const token = getBearerToken(req);
    if (!token) {
      throw ForbiddenError("Missing authorization token");
    }

    let payload: SupabaseTokenPayload;
    try {
      const secretKey = getSupabaseJwtSecret();
      const result = await jwtVerify(token, secretKey, { algorithms: ["HS256"] });
      payload = result.payload as SupabaseTokenPayload;
    } catch (error) {
      console.warn("[Auth] Supabase token verification failed", String(error));
      throw ForbiddenError("Invalid access token");
    }

    if (!payload.sub) {
      throw ForbiddenError("Invalid access token payload");
    }

    const signedInAt = new Date();
    const name = readMetadataName(payload.user_metadata);
    const email = typeof payload.email === "string" ? payload.email : null;

    await db.upsertUser({
      openId: payload.sub,
      name,
      email,
      loginMethod: "supabase",
      lastSignedIn: signedInAt,
    });

    const user = await db.getUserByOpenId(payload.sub);
    if (!user) {
      throw ForbiddenError("User not found");
    }

    return user;
  }
}

export const sdk = new SDKServer();

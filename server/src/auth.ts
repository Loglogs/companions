/**
 * auth.ts
 *
 * RS256 JWT authentication.
 *
 * - Generates an RSA key pair on first run, stored at ~/.companion/keys/
 * - POST /auth/token: exchange AUTH_SECRET for a 30-day JWT
 * - verifyToken(token): validates a JWT and returns the decoded payload
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

const KEYS_DIR = path.join(os.homedir(), ".companion", "keys");
const PRIVATE_KEY_PATH = path.join(KEYS_DIR, "private.pem");
const PUBLIC_KEY_PATH = path.join(KEYS_DIR, "public.pem");

let privateKey: string;
let publicKey: string;

/**
 * Load or generate the RSA key pair.
 * Called once during server startup.
 */
export function initKeys(): void {
  if (!fs.existsSync(KEYS_DIR)) {
    fs.mkdirSync(KEYS_DIR, { recursive: true });
  }

  if (fs.existsSync(PRIVATE_KEY_PATH) && fs.existsSync(PUBLIC_KEY_PATH)) {
    privateKey = fs.readFileSync(PRIVATE_KEY_PATH, "utf8");
    publicKey = fs.readFileSync(PUBLIC_KEY_PATH, "utf8");
    console.log("[auth] Loaded existing RSA key pair from", KEYS_DIR);
    return;
  }

  console.log("[auth] Generating new RSA-2048 key pair...");
  const { privateKey: priv, publicKey: pub } = crypto.generateKeyPairSync(
    "rsa",
    {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    }
  );

  fs.writeFileSync(PRIVATE_KEY_PATH, priv, { mode: 0o600 });
  fs.writeFileSync(PUBLIC_KEY_PATH, pub, { mode: 0o644 });
  privateKey = priv;
  publicKey = pub;
  console.log("[auth] RSA key pair saved to", KEYS_DIR);
}

/**
 * Issue a 30-day RS256 JWT for the companion phone client.
 */
export function issueToken(): string {
  return jwt.sign({ sub: "companion-phone", role: "client" }, privateKey, {
    algorithm: "RS256",
    expiresIn: "30d",
  });
}

/**
 * Verify a JWT token string. Throws if invalid or expired.
 */
export function verifyToken(token: string): jwt.JwtPayload {
  return jwt.verify(token, publicKey, { algorithms: ["RS256"] }) as jwt.JwtPayload;
}

/**
 * Express middleware: validate Bearer token from Authorization header.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? "";
  const headerToken = header.startsWith("Bearer ") ? header.slice(7) : "";
  // Allow token via query param for clients that can't set headers (e.g. EventSource)
  const queryToken = typeof req.query.token === "string" ? req.query.token : "";
  const token = headerToken || queryToken;

  if (!token) {
    res.status(401).json({ error: "Missing authorization token" });
    return;
  }

  try {
    verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * POST /auth/token
 *
 * Body: { "secret": "<AUTH_SECRET>" }
 * Response: { "token": "<jwt>" }
 */
export function authTokenHandler(req: Request, res: Response): void {
  const { secret } = req.body as { secret?: string };
  const authSecret = process.env.AUTH_SECRET;

  if (!authSecret) {
    res.status(500).json({ error: "AUTH_SECRET not configured on server" });
    return;
  }

  const secretOk =
    secret &&
    secret.length === authSecret.length &&
    crypto.timingSafeEqual(Buffer.from(secret), Buffer.from(authSecret));
  if (!secretOk) {
    res.status(401).json({ error: "Invalid secret" });
    return;
  }

  const token = issueToken();
  res.json({ token });
}

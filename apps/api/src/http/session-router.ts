import { Router, type Request } from "express";

import type { Identity, IdentityDirectory } from "../domain/identity.js";
import { ValidationError } from "../domain/errors.js";
import { asyncHandler } from "./async-handler.js";

const COOKIE = "eg_session";

export function readCookie(request: Request, name: string): string | undefined {
  const header = request.header("cookie");
  if (header === undefined) {
    return undefined;
  }
  for (const part of header.split(";")) {
    const [rawName, ...rest] = part.trim().split("=");
    if (rawName === name) {
      return rest.join("=");
    }
  }
  return undefined;
}

export function createSessionRouter(directory: IdentityDirectory): Router {
  const router = Router();

  router.post(
    "/",
    asyncHandler(async (request, response) => {
      const body = request.body as { email?: unknown; password?: unknown };
      if (typeof body.email !== "string" || typeof body.password !== "string") {
        throw new ValidationError("email and password are required");
      }
      const session = directory.authenticate(body.email, body.password);
      const identity = directory.resolve(session.token);
      response.setHeader(
        "set-cookie",
        `${COOKIE}=${session.token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=43200`,
      );
      response.status(201).json({
        data: {
          id: identity.id,
          name: identity.name,
          email: identity.email,
          role: identity.role,
          organizationId: identity.organizationId,
        },
      });
    }),
  );

  router.get(
    "/",
    asyncHandler(async (request, response) => {
      const identity = directory.resolve(readCookie(request, COOKIE));
      response.json({
        data: {
          id: identity.id,
          name: identity.name,
          email: identity.email,
          role: identity.role,
          organizationId: identity.organizationId,
        },
      });
    }),
  );

  router.delete(
    "/",
    asyncHandler(async (request, response) => {
      directory.revoke(readCookie(request, COOKIE));
      response.setHeader(
        "set-cookie",
        `${COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`,
      );
      response.status(204).end();
    }),
  );

  return router;
}

export function attachOptionalSession(directory: IdentityDirectory) {
  return (request: Request, _response: unknown, next: () => void) => {
    try {
      const token = readCookie(request, COOKIE);
      if (token) {
        (request as Request & { identity?: Identity }).identity =
          directory.resolve(token);
      }
    } catch {
      // Unauthenticated requests may still use lab headers in tests.
    }
    next();
  };
}

export function publicIdentity(identity: Identity) {
  return {
    id: identity.id,
    name: identity.name,
    email: identity.email,
    role: identity.role,
    organizationId: identity.organizationId,
  };
}

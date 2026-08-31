import type { RequestHandler } from "express";

const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

export const securityHeaders: RequestHandler = (_request, response, next) => {
  response.setHeader("x-content-type-options", "nosniff");
  response.setHeader("x-frame-options", "DENY");
  response.setHeader("referrer-policy", "no-referrer");
  response.setHeader("cache-control", "no-store");
  response.setHeader(
    "content-security-policy",
    "default-src 'none'; frame-ancestors 'none'",
  );
  next();
};

export const corsGuard: RequestHandler = (request, response, next) => {
  const origin = request.header("origin");

  if (origin !== undefined && ALLOWED_ORIGINS.has(origin)) {
    response.setHeader("access-control-allow-origin", origin);
    response.setHeader("vary", "Origin");
    response.setHeader(
      "access-control-allow-headers",
      "content-type, x-org-id, x-actor-id, x-request-id",
    );
    response.setHeader("access-control-allow-credentials", "true");
    response.setHeader(
      "access-control-allow-methods",
      "GET,POST,DELETE,OPTIONS",
    );
    response.setHeader("access-control-max-age", "600");
  }

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  next();
};

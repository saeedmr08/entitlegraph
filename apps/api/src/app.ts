import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import express, {
  type ErrorRequestHandler,
  type RequestHandler,
} from "express";

import { AppError, NotFoundError } from "./domain/errors.js";
import { buildAccessGraph } from "./domain/graph.js";
import type { IdentityDirectory } from "./domain/identity.js";
import { createAccessRequestRouter } from "./http/access-request-router.js";
import { asyncHandler } from "./http/async-handler.js";
import { corsGuard, securityHeaders } from "./http/security.js";
import {
  attachOptionalSession,
  createSessionRouter,
} from "./http/session-router.js";
import { readOrganizationId } from "./http/validation.js";
import {
  InMemoryAccessRequestRepository,
  type AccessRequestRepository,
} from "./repositories/access-request-repository.js";

interface CreateAppOptions {
  repository?: AccessRequestRepository;
  directory?: IdentityDirectory;
}

const requestIdMiddleware: RequestHandler = (request, response, next) => {
  const suppliedRequestId = request.header("x-request-id")?.trim();
  const requestId =
    suppliedRequestId !== undefined &&
    suppliedRequestId.length > 0 &&
    suppliedRequestId.length <= 128
      ? suppliedRequestId
      : randomUUID();

  response.locals.requestId = requestId;
  response.setHeader("x-request-id", requestId);
  next();
};

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const requestId = response.locals.requestId as string | undefined;

  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        requestId,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    });
    return;
  }

  if (
    error instanceof SyntaxError &&
    "status" in error &&
    error.status === 400
  ) {
    response.status(400).json({
      error: {
        code: "MALFORMED_JSON",
        message: "Request body contains malformed JSON",
        requestId,
      },
    });
    return;
  }

  response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
      requestId,
    },
  });
};

export function defaultDataDirectory(): string {
  return path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../data",
  );
}

export function createApp(options: CreateAppOptions = {}) {
  const app = express();
  const repository =
    options.repository ?? new InMemoryAccessRequestRepository();
  const directory = options.directory;

  app.disable("x-powered-by");
  app.use(requestIdMiddleware);
  app.use(securityHeaders);
  app.use(corsGuard);
  app.use(express.json({ limit: "32kb" }));
  if (directory) {
    app.use(attachOptionalSession(directory));
    app.use("/api/session", createSessionRouter(directory));
  }

  app.get("/health", (_request, response) => {
    response.json({
      status: "ok",
      service: "entitlegraph-api",
    });
  });

  if (directory) {
    app.get(
      "/api/identities",
      asyncHandler(async (request, response) => {
        const organizationId = readOrganizationId(request);
        response.json({
          data: directory.listPublicIdentities(organizationId),
        });
      }),
    );

    app.get(
      "/api/graph",
      asyncHandler(async (request, response) => {
        const organizationId = readOrganizationId(request);
        const requests = await repository.listByOrganization(organizationId);
        response.json({
          data: buildAccessGraph(
            directory.listPublicIdentities(organizationId),
            requests,
          ),
        });
      }),
    );
  }

  app.use("/api/access-requests", createAccessRequestRouter(repository));

  app.use((_request, _response, next) => {
    next(new NotFoundError("Route not found"));
  });
  app.use(errorHandler);

  return app;
}

import type { Request } from "express";

import { ValidationError } from "../domain/errors.js";

export interface RequestContext {
  organizationId: string;
  actorId: string;
}

export interface CreateAccessRequestPayload {
  resourceId: string;
  scopes: string[];
  reason: string;
  requestedDurationMinutes: number;
}

function requiredHeader(request: Request, headerName: string): string {
  const value = request.header(headerName)?.trim();

  if (value === undefined || value.length === 0 || value.length > 128) {
    throw new ValidationError(`${headerName} header is required`, {
      header: headerName,
    });
  }

  return value;
}

export function readRequestContext(request: Request): RequestContext {
  const identity = (request as Request & { identity?: { id: string; organizationId: string } })
    .identity;
  if (identity !== undefined) {
    return {
      organizationId: identity.organizationId,
      actorId: identity.id,
    };
  }
  return {
    organizationId: requiredHeader(request, "x-org-id"),
    actorId: requiredHeader(request, "x-actor-id"),
  };
}

export function readOrganizationId(request: Request): string {
  const identity = (request as Request & { identity?: { organizationId: string } })
    .identity;
  if (identity !== undefined) {
    return identity.organizationId;
  }
  return requiredHeader(request, "x-org-id");
}

export function parseCreateAccessRequestPayload(
  value: unknown,
): CreateAccessRequestPayload {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError("Request body must be a JSON object");
  }

  const body = value as Record<string, unknown>;

  if (
    typeof body.resourceId !== "string" ||
    typeof body.reason !== "string" ||
    typeof body.requestedDurationMinutes !== "number" ||
    !Array.isArray(body.scopes) ||
    !body.scopes.every((scope) => typeof scope === "string")
  ) {
    throw new ValidationError("Request body has invalid field types", {
      expected: {
        resourceId: "string",
        scopes: "string[]",
        reason: "string",
        requestedDurationMinutes: "number",
      },
    });
  }

  return {
    resourceId: body.resourceId,
    scopes: body.scopes,
    reason: body.reason,
    requestedDurationMinutes: body.requestedDurationMinutes,
  };
}

export function parseDenialReason(value: unknown): string {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError("Request body must be a JSON object");
  }

  const body = value as Record<string, unknown>;

  if (typeof body.reason !== "string") {
    throw new ValidationError("reason must be a string", { field: "reason" });
  }

  return body.reason;
}

import { randomUUID } from "node:crypto";

import { ValidationError } from "./errors.js";

export const MIN_REQUEST_DURATION_MINUTES = 15;
export const MAX_REQUEST_DURATION_MINUTES = 8 * 60;

export type AccessRequestStatus =
  | "pending"
  | "approved"
  | "denied"
  | "expired"
  | "revoked";

export interface AccessRequest {
  id: string;
  organizationId: string;
  requesterId: string;
  resourceId: string;
  scopes: string[];
  reason: string;
  requestedDurationMinutes: number;
  status: AccessRequestStatus;
  createdAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
  deniedAt: string | null;
  deniedBy: string | null;
  denialReason: string | null;
  grantExpiresAt: string | null;
  closedAt: string | null;
  closedBy: string | null;
  version: number;
}

export interface CreateAccessRequestInput {
  organizationId: string;
  requesterId: string;
  resourceId: string;
  scopes: string[];
  reason: string;
  requestedDurationMinutes: number;
}

interface CreateAccessRequestOptions {
  id?: string;
  now?: Date;
}

function requiredText(
  value: string,
  field: string,
  minimumLength: number,
  maximumLength: number,
): string {
  const normalized = value.trim();

  if (
    normalized.length < minimumLength ||
    normalized.length > maximumLength
  ) {
    throw new ValidationError(
      `${field} must contain between ${minimumLength} and ${maximumLength} characters`,
      { field, minimumLength, maximumLength },
    );
  }

  return normalized;
}

export function validateRequestedDuration(durationMinutes: number): void {
  if (
    !Number.isInteger(durationMinutes) ||
    durationMinutes < MIN_REQUEST_DURATION_MINUTES ||
    durationMinutes > MAX_REQUEST_DURATION_MINUTES
  ) {
    throw new ValidationError(
      `requestedDurationMinutes must be an integer between ${MIN_REQUEST_DURATION_MINUTES} and ${MAX_REQUEST_DURATION_MINUTES}`,
      {
        field: "requestedDurationMinutes",
        minimum: MIN_REQUEST_DURATION_MINUTES,
        maximum: MAX_REQUEST_DURATION_MINUTES,
      },
    );
  }
}

function normalizeScopes(scopes: string[]): string[] {
  if (!Array.isArray(scopes) || scopes.length === 0 || scopes.length > 10) {
    throw new ValidationError("scopes must contain between 1 and 10 values", {
      field: "scopes",
    });
  }

  const normalized = [
    ...new Set(
      scopes.map((scope) =>
        requiredText(scope, "scope", 2, 64).toLowerCase(),
      ),
    ),
  ];

  const invalidScope = normalized.find(
    (scope) => !/^[a-z][a-z0-9:_-]*$/.test(scope),
  );

  if (invalidScope !== undefined) {
    throw new ValidationError(
      "Each scope must start with a letter and contain only letters, numbers, colons, underscores, or hyphens",
      { field: "scopes" },
    );
  }

  return normalized;
}

export function createAccessRequest(
  input: CreateAccessRequestInput,
  options: CreateAccessRequestOptions = {},
): AccessRequest {
  validateRequestedDuration(input.requestedDurationMinutes);

  return {
    id: options.id ?? randomUUID(),
    organizationId: requiredText(
      input.organizationId,
      "organizationId",
      1,
      128,
    ),
    requesterId: requiredText(input.requesterId, "requesterId", 1, 128),
    resourceId: requiredText(input.resourceId, "resourceId", 1, 128),
    scopes: normalizeScopes(input.scopes),
    reason: requiredText(input.reason, "reason", 10, 500),
    requestedDurationMinutes: input.requestedDurationMinutes,
    status: "pending",
    createdAt: (options.now ?? new Date()).toISOString(),
    approvedAt: null,
    approvedBy: null,
    deniedAt: null,
    deniedBy: null,
    denialReason: null,
    grantExpiresAt: null,
    closedAt: null,
    closedBy: null,
    version: 1,
  };
}

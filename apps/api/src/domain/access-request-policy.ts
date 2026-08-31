import type { AccessRequest } from "./access-request.js";
import { validateRequestedDuration } from "./access-request.js";
import { ConflictError, ForbiddenError, ValidationError } from "./errors.js";

function requiredActorId(actorId: string): string {
  const normalized = actorId.trim();

  if (normalized.length === 0) {
    throw new ValidationError("actorId is required", { field: "actorId" });
  }

  return normalized;
}

function assertDifferentActor(request: AccessRequest, actorId: string): void {
  if (request.requesterId === actorId) {
    throw new ForbiddenError(
      "SELF_APPROVAL_FORBIDDEN",
      "A requester cannot approve, deny, or revoke their own access request",
    );
  }
}

export function approveAccessRequest(
  request: AccessRequest,
  approverId: string,
  now = new Date(),
): AccessRequest {
  const normalizedApproverId = requiredActorId(approverId);
  assertDifferentActor(request, normalizedApproverId);

  if (request.status !== "pending") {
    throw new ConflictError(
      "REQUEST_NOT_PENDING",
      "Only pending access requests can be approved",
    );
  }

  // Defense in depth: persisted data must still satisfy the current policy.
  validateRequestedDuration(request.requestedDurationMinutes);

  const grantExpiresAt = new Date(
    now.getTime() + request.requestedDurationMinutes * 60_000,
  );

  return {
    ...request,
    status: "approved",
    approvedAt: now.toISOString(),
    approvedBy: normalizedApproverId,
    grantExpiresAt: grantExpiresAt.toISOString(),
    version: request.version + 1,
  };
}

export function denyAccessRequest(
  request: AccessRequest,
  denierId: string,
  reason: string,
  now = new Date(),
): AccessRequest {
  const normalizedDenierId = requiredActorId(denierId);
  assertDifferentActor(request, normalizedDenierId);

  if (request.status !== "pending") {
    throw new ConflictError(
      "REQUEST_NOT_PENDING",
      "Only pending access requests can be denied",
    );
  }

  const normalizedReason = reason.trim();
  if (normalizedReason.length < 10 || normalizedReason.length > 500) {
    throw new ValidationError(
      "denialReason must contain between 10 and 500 characters",
      { field: "denialReason" },
    );
  }

  return {
    ...request,
    status: "denied",
    deniedAt: now.toISOString(),
    deniedBy: normalizedDenierId,
    denialReason: normalizedReason,
    closedAt: now.toISOString(),
    closedBy: normalizedDenierId,
    version: request.version + 1,
  };
}

export function expireAccessRequest(
  request: AccessRequest,
  now = new Date(),
): AccessRequest {
  if (request.status !== "approved" || request.grantExpiresAt === null) {
    throw new ConflictError(
      "REQUEST_NOT_EXPIRABLE",
      "Only approved grants with an expiry timestamp can expire",
    );
  }

  if (now.getTime() < Date.parse(request.grantExpiresAt)) {
    throw new ConflictError(
      "GRANT_STILL_ACTIVE",
      "The grant has not reached its expiry time",
    );
  }

  return {
    ...request,
    status: "expired",
    closedAt: now.toISOString(),
    closedBy: "system:expiry",
    version: request.version + 1,
  };
}

export function revokeAccessRequest(
  request: AccessRequest,
  revokerId: string,
  now = new Date(),
): AccessRequest {
  const normalizedRevokerId = requiredActorId(revokerId);
  assertDifferentActor(request, normalizedRevokerId);

  if (request.status !== "approved") {
    throw new ConflictError(
      "REQUEST_NOT_REVOCABLE",
      "Only approved grants can be revoked",
    );
  }

  return {
    ...request,
    status: "revoked",
    closedAt: now.toISOString(),
    closedBy: normalizedRevokerId,
    version: request.version + 1,
  };
}

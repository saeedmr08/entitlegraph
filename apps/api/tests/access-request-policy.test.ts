import { describe, expect, it } from "vitest";

import {
  createAccessRequest,
  MAX_REQUEST_DURATION_MINUTES,
  MIN_REQUEST_DURATION_MINUTES,
  validateRequestedDuration,
} from "../src/domain/access-request.js";
import {
  approveAccessRequest,
  denyAccessRequest,
  expireAccessRequest,
  revokeAccessRequest,
} from "../src/domain/access-request-policy.js";
import {
  createAuditEvent,
  GENESIS_HASH,
  verifyAuditChain,
} from "../src/domain/audit-log.js";
import { AppError } from "../src/domain/errors.js";

function pendingRequest(duration = 60) {
  return createAccessRequest(
    {
      organizationId: "org-a",
      requesterId: "member-a",
      resourceId: "production-api",
      scopes: ["logs:read"],
      reason: "Investigate the production incident",
      requestedDurationMinutes: duration,
    },
    {
      id: "request-a",
      now: new Date("2026-08-31T10:00:00.000Z"),
    },
  );
}

describe("access request duration policy", () => {
  it.each([
    MIN_REQUEST_DURATION_MINUTES,
    MAX_REQUEST_DURATION_MINUTES,
  ])("accepts the inclusive boundary %i", (duration) => {
    expect(() => validateRequestedDuration(duration)).not.toThrow();
  });

  it.each([
    MIN_REQUEST_DURATION_MINUTES - 1,
    MAX_REQUEST_DURATION_MINUTES + 1,
    60.5,
  ])("rejects an invalid duration %s", (duration) => {
    expect(() => validateRequestedDuration(duration)).toThrowError(AppError);
  });
});

describe("access request approval policy", () => {
  it("forbids self-approval", () => {
    try {
      approveAccessRequest(pendingRequest(), "member-a");
      throw new Error("Expected the policy to reject self-approval");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("SELF_APPROVAL_FORBIDDEN");
      expect((error as AppError).statusCode).toBe(403);
    }
  });

  it("approves a pending request and calculates the grant expiry", () => {
    const now = new Date("2026-08-31T12:00:00.000Z");
    const approved = approveAccessRequest(
      pendingRequest(90),
      "approver-a",
      now,
    );

    expect(approved).toMatchObject({
      status: "approved",
      approvedBy: "approver-a",
      approvedAt: "2026-08-31T12:00:00.000Z",
      grantExpiresAt: "2026-08-31T13:30:00.000Z",
      version: 2,
    });
  });

  it("rejects an already-approved request", () => {
    const approved = approveAccessRequest(pendingRequest(), "approver-a");

    try {
      approveAccessRequest(approved, "approver-b");
      throw new Error("Expected the policy to reject a second approval");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("REQUEST_NOT_PENDING");
      expect((error as AppError).statusCode).toBe(409);
    }
  });

  it("denies a pending request with a recorded reason", () => {
    const denied = denyAccessRequest(
      pendingRequest(),
      "approver-a",
      "The requested export scope is not required for this incident",
      new Date("2026-08-31T12:05:00.000Z"),
    );

    expect(denied).toMatchObject({
      status: "denied",
      deniedBy: "approver-a",
      denialReason:
        "The requested export scope is not required for this incident",
      closedAt: "2026-08-31T12:05:00.000Z",
    });
  });

  it("expires an approved grant only after the expiry timestamp", () => {
    const approved = approveAccessRequest(
      pendingRequest(60),
      "approver-a",
      new Date("2026-08-31T12:00:00.000Z"),
    );

    try {
      expireAccessRequest(approved, new Date("2026-08-31T12:30:00.000Z"));
      throw new Error("Expected an active grant to remain unexpired");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("GRANT_STILL_ACTIVE");
    }

    const expired = expireAccessRequest(
      approved,
      new Date("2026-08-31T13:00:00.000Z"),
    );
    expect(expired.status).toBe("expired");
    expect(expired.closedBy).toBe("system:expiry");
  });

  it("revokes an approved grant", () => {
    const approved = approveAccessRequest(pendingRequest(), "approver-a");
    const revoked = revokeAccessRequest(approved, "security-a");
    expect(revoked.status).toBe("revoked");
    expect(revoked.closedBy).toBe("security-a");
  });
});

describe("audit chain", () => {
  it("verifies a contiguous hash chain and detects tampering", () => {
    const first = createAuditEvent({
      organizationId: "org-a",
      actorId: "member-a",
      action: "access_request.created",
      subjectId: "request-a",
      id: "audit-1",
      now: new Date("2026-08-31T10:00:00.000Z"),
    });
    const second = createAuditEvent({
      organizationId: "org-a",
      actorId: "approver-a",
      action: "access_request.approved",
      subjectId: "request-a",
      previousHash: first.hash,
      id: "audit-2",
      now: new Date("2026-08-31T10:01:00.000Z"),
    });

    expect(first.previousHash).toBe(GENESIS_HASH);
    expect(verifyAuditChain([first, second])).toEqual({
      valid: true,
      brokenAt: null,
    });

    const tampered = { ...second, actorId: "intruder" };
    expect(verifyAuditChain([first, tampered]).valid).toBe(false);
  });
});

import { Router } from "express";

import {
  createAccessRequest,
  type AccessRequest,
} from "../domain/access-request.js";
import {
  approveAccessRequest,
  denyAccessRequest,
  expireAccessRequest,
  revokeAccessRequest,
} from "../domain/access-request-policy.js";
import { createAuditEvent, verifyAuditChain } from "../domain/audit-log.js";
import { NotFoundError } from "../domain/errors.js";
import type { AccessRequestRepository } from "../repositories/access-request-repository.js";
import { asyncHandler } from "./async-handler.js";
import {
  parseCreateAccessRequestPayload,
  parseDenialReason,
  readOrganizationId,
  readRequestContext,
} from "./validation.js";

interface DataResponse<T> {
  data: T;
}

async function recordAudit(
  repository: AccessRequestRepository,
  input: {
    organizationId: string;
    actorId: string;
    action: string;
    subjectId: string;
  },
) {
  const previousHash = await repository.latestAuditHash(input.organizationId);
  const event = createAuditEvent({ ...input, previousHash });
  await repository.appendAuditEvent(event);
  return event;
}

async function loadScopedRequest(
  repository: AccessRequestRepository,
  organizationId: string,
  requestId: string | string[] | undefined,
): Promise<AccessRequest> {
  const normalizedId = Array.isArray(requestId) ? requestId[0] : requestId;

  if (normalizedId === undefined || normalizedId.length === 0) {
    throw new NotFoundError("Access request not found");
  }

  const accessRequest = await repository.findById(organizationId, normalizedId);

  if (accessRequest === null) {
    throw new NotFoundError("Access request not found");
  }

  return accessRequest;
}

export function createAccessRequestRouter(
  repository: AccessRequestRepository,
): Router {
  const router = Router();

  router.post(
    "/",
    asyncHandler(async (request, response) => {
      const context = readRequestContext(request);
      const payload = parseCreateAccessRequestPayload(request.body);
      const accessRequest = createAccessRequest({
        organizationId: context.organizationId,
        requesterId: context.actorId,
        ...payload,
      });

      await repository.create(accessRequest);
      await recordAudit(repository, {
        organizationId: context.organizationId,
        actorId: context.actorId,
        action: "access_request.created",
        subjectId: accessRequest.id,
      });

      response.location(`/api/access-requests/${accessRequest.id}`);
      response.status(201).json({
        data: accessRequest,
      } satisfies DataResponse<AccessRequest>);
    }),
  );

  router.get(
    "/",
    asyncHandler(async (request, response) => {
      const organizationId = readOrganizationId(request);
      const requests = await repository.listByOrganization(organizationId);

      response.json({
        data: requests,
      } satisfies DataResponse<AccessRequest[]>);
    }),
  );

  router.get(
    "/audit",
    asyncHandler(async (request, response) => {
      const organizationId = readOrganizationId(request);
      const events = await repository.listAuditEvents(organizationId);
      const verification = verifyAuditChain(events);

      response.json({
        data: {
          events,
          verification,
        },
      });
    }),
  );

  router.get(
    "/:requestId",
    asyncHandler(async (request, response) => {
      const organizationId = readOrganizationId(request);
      const accessRequest = await loadScopedRequest(
        repository,
        organizationId,
        request.params.requestId,
      );

      response.json({
        data: accessRequest,
      } satisfies DataResponse<AccessRequest>);
    }),
  );

  router.post(
    "/:requestId/approve",
    asyncHandler(async (request, response) => {
      const context = readRequestContext(request);
      const current = await loadScopedRequest(
        repository,
        context.organizationId,
        request.params.requestId,
      );
      const approved = approveAccessRequest(current, context.actorId);
      await repository.save(approved, current.version);
      await recordAudit(repository, {
        organizationId: context.organizationId,
        actorId: context.actorId,
        action: "access_request.approved",
        subjectId: approved.id,
      });

      response.json({ data: approved } satisfies DataResponse<AccessRequest>);
    }),
  );

  router.post(
    "/:requestId/deny",
    asyncHandler(async (request, response) => {
      const context = readRequestContext(request);
      const current = await loadScopedRequest(
        repository,
        context.organizationId,
        request.params.requestId,
      );
      const denied = denyAccessRequest(
        current,
        context.actorId,
        parseDenialReason(request.body),
      );
      await repository.save(denied, current.version);
      await recordAudit(repository, {
        organizationId: context.organizationId,
        actorId: context.actorId,
        action: "access_request.denied",
        subjectId: denied.id,
      });

      response.json({ data: denied } satisfies DataResponse<AccessRequest>);
    }),
  );

  router.post(
    "/:requestId/revoke",
    asyncHandler(async (request, response) => {
      const context = readRequestContext(request);
      const current = await loadScopedRequest(
        repository,
        context.organizationId,
        request.params.requestId,
      );
      const revoked = revokeAccessRequest(current, context.actorId);
      await repository.save(revoked, current.version);
      await recordAudit(repository, {
        organizationId: context.organizationId,
        actorId: context.actorId,
        action: "access_request.revoked",
        subjectId: revoked.id,
      });

      response.json({ data: revoked } satisfies DataResponse<AccessRequest>);
    }),
  );

  router.post(
    "/:requestId/expire",
    asyncHandler(async (request, response) => {
      const organizationId = readOrganizationId(request);
      const current = await loadScopedRequest(
        repository,
        organizationId,
        request.params.requestId,
      );
      const expired = expireAccessRequest(current);
      await repository.save(expired, current.version);
      await recordAudit(repository, {
        organizationId,
        actorId: "system:expiry",
        action: "access_request.expired",
        subjectId: expired.id,
      });

      response.json({ data: expired } satisfies DataResponse<AccessRequest>);
    }),
  );

  return router;
}

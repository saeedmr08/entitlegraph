import type { AccessRequest } from "../domain/access-request.js";
import type { AuditEvent } from "../domain/audit-log.js";
import { GENESIS_HASH } from "../domain/audit-log.js";
import { ConflictError, NotFoundError } from "../domain/errors.js";

export interface AccessRequestRepository {
  create(request: AccessRequest): Promise<void>;
  findById(
    organizationId: string,
    requestId: string,
  ): Promise<AccessRequest | null>;
  listByOrganization(organizationId: string): Promise<AccessRequest[]>;
  save(request: AccessRequest, expectedVersion: number): Promise<void>;
  appendAuditEvent(event: AuditEvent): Promise<void>;
  listAuditEvents(organizationId: string): Promise<AuditEvent[]>;
  latestAuditHash(organizationId: string): Promise<string>;
}

function clone(request: AccessRequest): AccessRequest {
  return {
    ...request,
    scopes: [...request.scopes],
  };
}

export class InMemoryAccessRequestRepository
  implements AccessRequestRepository
{
  private readonly requests = new Map<string, AccessRequest>();
  private readonly auditEvents: AuditEvent[] = [];

  async create(request: AccessRequest): Promise<void> {
    if (this.requests.has(request.id)) {
      throw new ConflictError(
        "REQUEST_ALREADY_EXISTS",
        "An access request with this id already exists",
      );
    }

    this.requests.set(request.id, clone(request));
  }

  async findById(
    organizationId: string,
    requestId: string,
  ): Promise<AccessRequest | null> {
    const request = this.requests.get(requestId);

    // Organization scoping deliberately returns null to avoid tenant enumeration.
    if (request === undefined || request.organizationId !== organizationId) {
      return null;
    }

    return clone(request);
  }

  async listByOrganization(organizationId: string): Promise<AccessRequest[]> {
    return [...this.requests.values()]
      .filter((request) => request.organizationId === organizationId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map(clone);
  }

  async save(request: AccessRequest, expectedVersion: number): Promise<void> {
    const current = this.requests.get(request.id);

    if (
      current === undefined ||
      current.organizationId !== request.organizationId
    ) {
      throw new NotFoundError("Access request not found");
    }

    if (current.version !== expectedVersion) {
      throw new ConflictError(
        "REQUEST_VERSION_CONFLICT",
        "The access request changed while it was being updated",
      );
    }

    this.requests.set(request.id, clone(request));
  }

  async appendAuditEvent(event: AuditEvent): Promise<void> {
    this.auditEvents.push({ ...event });
  }

  async listAuditEvents(organizationId: string): Promise<AuditEvent[]> {
    return this.auditEvents
      .filter((event) => event.organizationId === organizationId)
      .map((event) => ({ ...event }));
  }

  async latestAuditHash(organizationId: string): Promise<string> {
    const events = await this.listAuditEvents(organizationId);
    return events.at(-1)?.hash ?? GENESIS_HASH;
  }

  snapshot(): { requests: AccessRequest[]; auditEvents: AuditEvent[] } {
    return {
      requests: [...this.requests.values()].map(clone),
      auditEvents: this.auditEvents.map((event) => ({ ...event })),
    };
  }

  restore(data: {
    requests?: AccessRequest[];
    auditEvents?: AuditEvent[];
  }): void {
    this.requests.clear();
    this.auditEvents.length = 0;
    for (const request of data.requests ?? []) {
      this.requests.set(request.id, clone(request));
    }
    for (const event of data.auditEvents ?? []) {
      this.auditEvents.push({ ...event });
    }
  }
}

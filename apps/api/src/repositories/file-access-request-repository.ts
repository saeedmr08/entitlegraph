import {
  InMemoryAccessRequestRepository,
  type AccessRequestRepository,
} from "./access-request-repository.js";
import { loadJsonFile, saveJsonFile } from "../persistence/json-file.js";
import type { AccessRequest } from "../domain/access-request.js";
import type { AuditEvent } from "../domain/audit-log.js";

export class FileAccessRequestRepository
  extends InMemoryAccessRequestRepository
  implements AccessRequestRepository
{
  constructor(private readonly filePath: string) {
    super();
    this.restore(
      loadJsonFile(this.filePath, { requests: [], auditEvents: [] }),
    );
  }

  private persist(): void {
    saveJsonFile(this.filePath, this.snapshot());
  }

  override async create(request: AccessRequest): Promise<void> {
    await super.create(request);
    this.persist();
  }

  override async save(
    request: AccessRequest,
    expectedVersion: number,
  ): Promise<void> {
    await super.save(request, expectedVersion);
    this.persist();
  }

  override async appendAuditEvent(event: AuditEvent): Promise<void> {
    await super.appendAuditEvent(event);
    this.persist();
  }
}

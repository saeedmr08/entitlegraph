import { createHash, randomUUID } from "node:crypto";

export interface AuditEvent {
  id: string;
  organizationId: string;
  actorId: string;
  action: string;
  subjectId: string;
  createdAt: string;
  previousHash: string;
  hash: string;
}

export const GENESIS_HASH = "0".repeat(64);

function canonicalPayload(event: Omit<AuditEvent, "hash">): string {
  return [
    event.id,
    event.organizationId,
    event.actorId,
    event.action,
    event.subjectId,
    event.createdAt,
    event.previousHash,
  ].join("|");
}

export function hashAuditEvent(event: Omit<AuditEvent, "hash">): string {
  return createHash("sha256").update(canonicalPayload(event)).digest("hex");
}

export function createAuditEvent(input: {
  organizationId: string;
  actorId: string;
  action: string;
  subjectId: string;
  previousHash?: string;
  id?: string;
  now?: Date;
}): AuditEvent {
  const unsigned: Omit<AuditEvent, "hash"> = {
    id: input.id ?? randomUUID(),
    organizationId: input.organizationId,
    actorId: input.actorId,
    action: input.action,
    subjectId: input.subjectId,
    createdAt: (input.now ?? new Date()).toISOString(),
    previousHash: input.previousHash ?? GENESIS_HASH,
  };

  return {
    ...unsigned,
    hash: hashAuditEvent(unsigned),
  };
}

export function verifyAuditChain(events: AuditEvent[]): {
  valid: boolean;
  brokenAt: string | null;
} {
  let expectedPrevious = GENESIS_HASH;

  for (const event of events) {
    if (event.previousHash !== expectedPrevious) {
      return { valid: false, brokenAt: event.id };
    }

    if (hashAuditEvent(event) !== event.hash) {
      return { valid: false, brokenAt: event.id };
    }

    expectedPrevious = event.hash;
  }

  return { valid: true, brokenAt: null };
}

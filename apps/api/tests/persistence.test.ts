import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { IdentityDirectory } from "../src/domain/identity.js";
import { FileAccessRequestRepository } from "../src/repositories/file-access-request-repository.js";
import { createAccessRequest } from "../src/domain/access-request.js";

describe("persistent identity and request stores", () => {
  it("authenticates a seeded demo user", () => {
    const directory = new IdentityDirectory(
      path.join(mkdtempSync(path.join(tmpdir(), "eg-id-")), "identities.json"),
    );
    const session = directory.authenticate(
      "maya@northwind.example",
      "northwind-maya",
    );
    const identity = directory.resolve(session.token);
    expect(identity.email).toBe("maya@northwind.example");
    expect(identity.role).toBe("member");
  });

  it("reloads access requests from disk", async () => {
    const file = path.join(mkdtempSync(path.join(tmpdir(), "eg-req-")), "requests.json");
    const first = new FileAccessRequestRepository(file);
    const request = createAccessRequest({
      organizationId: "org-northwind",
      requesterId: "maya",
      resourceId: "billing-warehouse",
      scopes: ["read"],
      reason: "Investigate the failed invoice export",
      requestedDurationMinutes: 60,
    });
    await first.create(request);

    const second = new FileAccessRequestRepository(file);
    const loaded = await second.findById("org-northwind", request.id);
    expect(loaded?.reason).toBe("Investigate the failed invoice export");
  });
});

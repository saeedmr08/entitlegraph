import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import { InMemoryAccessRequestRepository } from "../src/repositories/access-request-repository.js";

describe("EntitleGraph API", () => {
  let repository: InMemoryAccessRequestRepository;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    repository = new InMemoryAccessRequestRepository();
    app = createApp({ repository });
  });

  async function createPendingRequest() {
    return request(app)
      .post("/api/access-requests")
      .set("x-org-id", "org-a")
      .set("x-actor-id", "member-a")
      .send({
        resourceId: "production-api",
        scopes: ["logs:read"],
        reason: "Investigate the production incident",
        requestedDurationMinutes: 60,
      });
  }

  it("reports service health", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      service: "entitlegraph-api",
    });
    expect(response.headers["x-request-id"]).toBeTypeOf("string");
  });

  it("creates and lists a tenant-scoped access request", async () => {
    const created = await createPendingRequest();

    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      organizationId: "org-a",
      requesterId: "member-a",
      status: "pending",
      requestedDurationMinutes: 60,
    });

    const listed = await request(app)
      .get("/api/access-requests")
      .set("x-org-id", "org-a");

    expect(listed.status).toBe(200);
    expect(listed.body.data).toHaveLength(1);

    const otherTenant = await request(app)
      .get("/api/access-requests")
      .set("x-org-id", "org-b");

    expect(otherTenant.status).toBe(200);
    expect(otherTenant.body.data).toEqual([]);
  });

  it("rejects self-approval but allows a different approver", async () => {
    const created = await createPendingRequest();
    const requestId = created.body.data.id as string;

    const selfApproval = await request(app)
      .post(`/api/access-requests/${requestId}/approve`)
      .set("x-org-id", "org-a")
      .set("x-actor-id", "member-a")
      .send();

    expect(selfApproval.status).toBe(403);
    expect(selfApproval.body.error.code).toBe("SELF_APPROVAL_FORBIDDEN");

    const approval = await request(app)
      .post(`/api/access-requests/${requestId}/approve`)
      .set("x-org-id", "org-a")
      .set("x-actor-id", "approver-a")
      .send();

    expect(approval.status).toBe(200);
    expect(approval.body.data).toMatchObject({
      status: "approved",
      approvedBy: "approver-a",
      version: 2,
    });
    expect(approval.body.data.grantExpiresAt).toBeTypeOf("string");
  });

  it("returns a generic 404 when another tenant requests an id", async () => {
    const created = await createPendingRequest();
    const requestId = created.body.data.id as string;

    const response = await request(app)
      .get(`/api/access-requests/${requestId}`)
      .set("x-org-id", "org-b");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("rejects a duration outside the policy", async () => {
    const response = await request(app)
      .post("/api/access-requests")
      .set("x-org-id", "org-a")
      .set("x-actor-id", "member-a")
      .send({
        resourceId: "production-api",
        scopes: ["logs:read"],
        reason: "Investigate the production incident",
        requestedDurationMinutes: 10,
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("denies a pending request and records a verifiable audit chain", async () => {
    const created = await createPendingRequest();
    const requestId = created.body.data.id as string;

    const denied = await request(app)
      .post(`/api/access-requests/${requestId}/deny`)
      .set("x-org-id", "org-a")
      .set("x-actor-id", "approver-a")
      .send({ reason: "Scope is broader than the incident requires" });

    expect(denied.status).toBe(200);
    expect(denied.body.data.status).toBe("denied");
    expect(denied.body.data.deniedBy).toBe("approver-a");

    const audit = await request(app)
      .get("/api/access-requests/audit")
      .set("x-org-id", "org-a");

    expect(audit.status).toBe(200);
    expect(audit.body.data.verification.valid).toBe(true);
    expect(audit.body.data.events.map((event: { action: string }) => event.action)).toEqual(
      ["access_request.created", "access_request.denied"],
    );
  });

  it("does not leak audit events to another tenant", async () => {
    await createPendingRequest();

    const otherTenant = await request(app)
      .get("/api/access-requests/audit")
      .set("x-org-id", "org-b");

    expect(otherTenant.status).toBe(200);
    expect(otherTenant.body.data.events).toEqual([]);
    expect(otherTenant.body.data.verification.valid).toBe(true);
  });

  it("sets security headers on API responses", async () => {
    const response = await request(app).get("/health");

    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(response.headers["referrer-policy"]).toBe("no-referrer");
  });
});

# EntitleGraph Threat Model

## Assets

- Organization membership and tenant identifiers.
- Access-request scope, justification, duration, and decision state.
- Role and permission assignments.
- Audit events and integrity-chain hashes.
- Authentication sessions in a future milestone.

EntitleGraph intentionally does not store passwords, API keys, or credentials for the resources represented in the graph.

## Trust boundaries

1. Browser to web application.
2. Web application to API.
3. API to persistence and job infrastructure.
4. Tenant boundary enforced for every organization-scoped operation.
5. Privileged approval and administration boundary.

## Primary threats and mitigations

| Threat | Initial mitigation |
|---|---|
| Cross-tenant data access | Require an organization context and enforce it inside repository/service methods, not only routes. |
| Self-approval or approval conflicts | Domain policy rejects decisions made by the requester and validates approver roles. |
| Excessive access duration | Server-side maximum duration policy and explicit expiry timestamps. |
| Tampering with decisions | Append-only audit events with previous-hash chaining and deterministic verification. |
| Injection and malformed input | Zod validation, strict JSON limits, output encoding, and parameterized persistence queries in the MongoDB milestone. |
| Brute force and API abuse | Rate limits, short request body limits, structured monitoring, and generic authentication errors. |
| Session theft | Planned short-lived access cookies, opaque rotating refresh tokens stored as hashes, Secure/HttpOnly/SameSite flags, and revocation. |
| Privilege escalation | Deny-by-default authorization and server-side permission checks for every state transition. |
| Sensitive information in logs | Structured allowlisted fields, redaction, and synthetic demo data. |
| Supply-chain compromise | Lockfile review, automated dependency updates, dependency scanning, and minimal packages. |

## Security invariants for milestone 1

- A requester cannot approve their own request.
- A request must expire after it starts and remain within the configured maximum duration.
- Only pending requests can be approved or denied.
- Every state transition creates an audit event.
- Organization-scoped queries never return another tenant's records.

## Deferred work

- Persistent tenant-isolation integration tests.
- Authentication, MFA challenge flows, and refresh-token rotation.
- Redis-backed distributed rate limiting.
- Background expiry worker and notification delivery.
- Signed exports and external security review.

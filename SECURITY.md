# Security Policy

## Supported status

EntitleGraph is an educational portfolio project under active development and is not intended to protect production systems.

## Reporting a vulnerability

Do not open a public issue containing exploit details or secrets. After publication, the repository will enable GitHub private vulnerability reporting. Until then, report concerns to `info@devorytech.com` with:

- the affected component;
- reproduction steps using synthetic data;
- the expected and observed behavior;
- potential impact;
- a suggested mitigation, if available.

## Scope boundaries

- EntitleGraph records access decisions; it does not store third-party credentials.
- Demo data must remain synthetic.
- `.env` files, tokens, database dumps, and private keys must never be committed.
- Security tests must target only local instances owned by the developer.

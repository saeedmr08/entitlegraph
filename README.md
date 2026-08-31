# EntitleGraph

Working access-request product: people sign in, request time-bounded access, approvers decide, and every decision is stored on disk with a hash-linked audit log.

This is not a painted dashboard. Restart the API and the requests are still there.

## Run

```bash
npm install
npm run dev
```

- App: http://localhost:3000
- API: http://localhost:4000/health

Sign in:

| Person | Email | Password | Can |
|---|---|---|---|
| Maya Chen | maya@northwind.example | northwind-maya | Create requests |
| Leah Young | leah@northwind.example | northwind-leah | Approve or deny |

Maya cannot approve her own request. Data lives in `data/requests.json` and `data/identities.json` (gitignored).

## Complete product flows

1. Sign in as Maya (`maya@northwind.example` / `northwind-maya`) and create an access request.
2. Sign out, then sign in as Leah (`leah@northwind.example` / `northwind-leah`) and approve it.
3. Sign in as Maya again — she cannot approve her own request. Restart the API; records remain in `data/requests.json`.

```bash
npm test
```

Northwind Labs is a synthetic tenant. Do not use this as a production IdP.

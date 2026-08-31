"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Actor = {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationId: string;
};

type AccessRequest = {
  id: string;
  requesterId: string;
  resourceId: string;
  scopes: string[];
  reason: string;
  requestedDurationMinutes: number;
  status: string;
  grantExpiresAt: string | null;
  approvedBy: string | null;
};

type GraphPayload = {
  nodes: { id: string; label: string; kind: string }[];
  edges: { from: string; to: string; label: string; risky: boolean }[];
};

const API = "/eg-api";

async function parseJson(response: Response) {
  const body = (await response.json()) as {
    data?: unknown;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(body.error?.message ?? `Request failed (${response.status})`);
  }
  return body.data;
}

export function LiveConsole() {
  const [actor, setActor] = useState<Actor | null>(null);
  const [email, setEmail] = useState("maya@northwind.example");
  const [password, setPassword] = useState("northwind-maya");
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [graph, setGraph] = useState<GraphPayload>({ nodes: [], edges: [] });
  const [resourceId, setResourceId] = useState("billing-warehouse");
  const [reason, setReason] = useState("Investigate the failed invoice export");
  const [duration, setDuration] = useState(60);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [listed, drawn] = await Promise.all([
      parseJson(await fetch(`${API}/api/access-requests`, { credentials: "include" })),
      parseJson(await fetch(`${API}/api/graph`, { credentials: "include" })),
    ]);
    setRequests(listed as AccessRequest[]);
    setGraph(drawn as GraphPayload);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const me = (await parseJson(
          await fetch(`${API}/api/session`, { credentials: "include" }),
        )) as Actor;
        setActor(me);
        await refresh();
      } catch {
        setActor(null);
      }
    })();
  }, [refresh]);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const me = (await parseJson(
        await fetch(`${API}/api/session`, {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password }),
        }),
      )) as Actor;
      setActor(me);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await fetch(`${API}/api/session`, { method: "DELETE", credentials: "include" });
    setActor(null);
    setRequests([]);
    setGraph({ nodes: [], edges: [] });
  }

  async function createRequest(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await parseJson(
        await fetch(`${API}/api/access-requests`, {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            resourceId,
            scopes: ["read"],
            reason,
            requestedDurationMinutes: duration,
          }),
        }),
      );
      await refresh();
      setMessage("Request stored. It will survive a server restart.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function decide(id: string, action: "approve" | "deny") {
    setBusy(true);
    setMessage("");
    try {
      await parseJson(
        await fetch(`${API}/api/access-requests/${id}/${action}`, {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: action === "deny"
            ? JSON.stringify({ reason: "Scope is broader than this incident needs" })
            : "{}",
        }),
      );
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Decision failed");
    } finally {
      setBusy(false);
    }
  }

  if (actor === null) {
    return (
      <main className="content" style={{ maxWidth: 480, margin: "8vh auto" }}>
        <p className="eyebrow">EntitleGraph</p>
        <h2>Sign in to a real tenant</h2>
        <p className="muted">
          These accounts persist on disk. Maya can request access. Leah can approve or deny.
          Self-approval is rejected by the API.
        </p>
        <form className="panel hero-copy" onSubmit={signIn}>
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button className="primary-button" type="submit" disabled={busy}>
            Sign in
          </button>
          {message ? <p className="muted">{message}</p> : null}
          <p className="muted">
            Maya: maya@northwind.example / northwind-maya
            <br />
            Leah: leah@northwind.example / northwind-leah
          </p>
        </form>
      </main>
    );
  }

  return (
    <div className="content">
      <header className="topbar">
        <div>
          <p className="eyebrow">{actor.organizationId}</p>
          <strong>
            {actor.name} · {actor.role}
          </strong>
        </div>
        <button className="ghost-button" type="button" onClick={() => void signOut()}>
          Sign out
        </button>
      </header>
      {message ? <p className="muted">{message}</p> : null}
      <section className="hero">
        <form className="panel hero-copy" onSubmit={createRequest}>
          <span className="eyebrow">New request</span>
          <h2>Ask for time-bounded access</h2>
          <label>
            Resource
            <select
              value={resourceId}
              onChange={(event) => setResourceId(event.target.value)}
            >
              <option value="billing-warehouse">billing-warehouse</option>
              <option value="production-api">production-api</option>
              <option value="support-console">support-console</option>
            </select>
          </label>
          <label>
            Justification
            <input value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>
          <label>
            Minutes
            <input
              type="number"
              min={15}
              max={480}
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
            />
          </label>
          <button className="primary-button" type="submit" disabled={busy}>
            Submit request
          </button>
        </form>
        <div className="panel section">
          <span className="eyebrow">Live graph</span>
          <h2>What this tenant can actually reach</h2>
          <svg className="graph-svg" viewBox="0 0 820 280" role="img">
            {graph.edges.map((edge) => {
              const from = graph.nodes.find((node) => node.id === edge.from);
              const to = graph.nodes.find((node) => node.id === edge.to);
              if (!from || !to) return null;
              const fromIndex = graph.nodes.indexOf(from);
              const toIndex = graph.nodes.indexOf(to);
              return (
                <line
                  key={`${edge.from}-${edge.to}-${edge.label}`}
                  className={edge.risky ? "edge risky" : "edge"}
                  x1={80}
                  y1={40 + fromIndex * 46}
                  x2={520}
                  y2={40 + toIndex * 46}
                />
              );
            })}
            {graph.nodes.map((node, index) => (
              <g key={node.id} transform={`translate(${node.kind === "resource" ? 520 : 40}, ${24 + index * 46})`}>
                <rect width="220" height="32" rx="16" fill="#121820" stroke="#d7b15a" />
                <text className="node-label" x="16" y="21">
                  {node.label}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </section>
      <section className="panel table-wrap">
        <div className="section-head">
          <div>
            <span className="eyebrow">Persisted ledger</span>
            <h2>Access requests</h2>
          </div>
          <p className="muted">{requests.length} records on disk</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Requester</th>
              <th>Resource</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <p className="muted">
                    No access requests yet. Submit one as Maya — it persists on disk through a restart.
                  </p>
                </td>
              </tr>
            ) : null}
            {requests.map((item) => (
              <tr key={item.id}>
                <td className="mono">{item.requesterId}</td>
                <td>{item.resourceId}</td>
                <td>
                  <span className={`badge ${item.status === "approved" ? "positive" : item.status === "denied" ? "danger" : "warning"}`}>
                    {item.status}
                  </span>
                </td>
                <td>
                  {item.status === "pending" ? (
                    <div className="topbar-actions">
                      <button
                        className="ghost-button"
                        type="button"
                        disabled={busy}
                        onClick={() => void decide(item.id, "approve")}
                      >
                        Approve
                      </button>
                      <button
                        className="ghost-button"
                        type="button"
                        disabled={busy}
                        onClick={() => void decide(item.id, "deny")}
                      >
                        Deny
                      </button>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

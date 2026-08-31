"use client";

import { useMemo, useState } from "react";

import {
  accessRequests,
  auditEvents,
  overviewMetrics,
  riskItems,
  riskyPaths,
} from "../lib/demo-data";
import { AccessGraph } from "./access-graph";
import { Icon } from "./icons";

const navItems = [
  { id: "overview", label: "Overview" },
  { id: "graph", label: "Access graph" },
  { id: "requests", label: "Requests" },
  { id: "audit", label: "Audit trail" },
  { id: "risk", label: "Risk queue" },
] as const;

type SectionId = (typeof navItems)[number]["id"];

export function Dashboard() {
  const [section, setSection] = useState<SectionId>("overview");
  const [query, setQuery] = useState("");

  const filteredRequests = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) {
      return accessRequests;
    }
    return accessRequests.filter((item) =>
      `${item.requester} ${item.resource} ${item.id}`.toLowerCase().includes(needle),
    );
  }, [query]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            Eg
          </div>
          <div>
            <h1>EntitleGraph</h1>
            <p>Access intelligence</p>
          </div>
        </div>
        <nav aria-label="Primary">
          {navItems.map((item) => (
            <button
              key={item.id}
              className="nav-button"
              type="button"
              aria-current={section === item.id ? "page" : undefined}
              onClick={() => setSection(item.id)}
            >
              <Icon name={item.id} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="workspace-card">
          <span>Workspace</span>
          <strong>Northwind Labs</strong>
          <p className="muted">Synthetic demo tenant. No production identities.</p>
        </div>
      </aside>
      <div className="content">
        <header className="topbar">
          <label className="search">
            <Icon name="search" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search people, resources, or request IDs"
              aria-label="Search demo records"
            />
          </label>
          <div className="topbar-actions">
            <button className="ghost-button" type="button">
              <Icon name="download" />
              Export review pack
            </button>
            <button className="primary-button" type="button">
              New access request
            </button>
          </div>
        </header>
        <main id="main">
          {section === "overview" || section === "graph" ? (
            <>
              <section className="hero">
                <div className="panel hero-copy">
                  <span className="eyebrow">Portfolio demonstration</span>
                  <h2>See who can reach production, why they can, and when that access should end.</h2>
                  <p>
                    EntitleGraph models people, groups, roles, and resources as a graph. Approvals cannot be
                    self-granted, every grant expires, and the audit log is hash-linked so tampering is detectable.
                  </p>
                </div>
                <div className="panel metric-grid">
                  {overviewMetrics.map((metric) => (
                    <article key={metric.label} className={`metric ${metric.trend}`}>
                      <span className="eyebrow">{metric.label}</span>
                      <strong>{metric.value}</strong>
                      <p className="muted">{metric.detail}</p>
                    </article>
                  ))}
                </div>
              </section>
              <section className="panel section">
                <div className="section-head">
                  <div>
                    <span className="eyebrow">Live graph</span>
                    <h2>Privilege paths</h2>
                  </div>
                  <div className="legend">
                    <span className="chip">Identity</span>
                    <span className="chip">Group / role</span>
                    <span className="chip">Resource</span>
                    <span className="chip">Dashed = risky path</span>
                  </div>
                </div>
                <AccessGraph />
              </section>
            </>
          ) : null}

          {section === "overview" || section === "requests" ? (
            <section className="panel table-wrap" style={{ marginTop: 18 }}>
              <div className="section-head">
                <div>
                  <span className="eyebrow">Just-in-time access</span>
                  <h2>Open requests</h2>
                </div>
                <p className="muted">{filteredRequests.length} matching records</p>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Request</th>
                    <th>Resource</th>
                    <th>Entitlement</th>
                    <th>Risk</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="identity">
                          <span className="avatar">{item.initials}</span>
                          <div>
                            <strong>{item.requester}</strong>
                            <div className="muted mono">{item.id} · {item.age}</div>
                          </div>
                        </div>
                      </td>
                      <td>{item.resource}</td>
                      <td>{item.entitlement}</td>
                      <td>
                        <span className={`badge ${item.riskTone}`}>{item.risk}</span>
                      </td>
                      <td>
                        <span className={`badge ${item.statusTone}`}>{item.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}

          {section === "overview" || section === "audit" ? (
            <section className="layout-split" style={{ marginTop: 18 }}>
              <div className="panel section">
                <span className="eyebrow">Integrity</span>
                <h2>Audit chain</h2>
                {auditEvents.map((event) => (
                  <article className="feed-item" key={`${event.time}-${event.title}`}>
                    <span className="mono muted">{event.time}</span>
                    <div>
                      <strong>{event.title}</strong>
                      <p className="muted">{event.detail}</p>
                      <span className={`badge ${event.tone}`}>{event.actor}</span>
                    </div>
                  </article>
                ))}
              </div>
              <div className="panel section">
                <span className="eyebrow">Standing access</span>
                <h2>Risky paths</h2>
                {riskyPaths.map((path) => (
                  <article className="risk-item" key={path.identity}>
                    <div>
                      <strong>{path.identity}</strong>
                      <p className="muted">{path.via}</p>
                      <p className="muted">{path.resource} · {path.privilege}</p>
                    </div>
                    <span className={`badge ${path.score >= 80 ? "danger" : "warning"}`}>
                      {path.score}
                    </span>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {section === "risk" ? (
            <section className="panel section">
              <span className="eyebrow">Review queue</span>
              <h2>Exposure that still needs an owner</h2>
              {riskItems.map((item) => (
                <article className="risk-item" key={item.id}>
                  <div>
                    <span className="mono muted">{item.id}</span>
                    <strong>{item.title}</strong>
                    <p className="muted">
                      {item.scope} · {item.owner} · {item.exposure}
                    </p>
                  </div>
                  <div>
                    <span className={`badge ${item.tone}`}>{item.severity}</span>
                    <p className="muted">Due {item.due}</p>
                  </div>
                </article>
              ))}
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}

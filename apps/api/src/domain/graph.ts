import type { AccessRequest } from "./access-request.js";

export interface GraphNode {
  id: string;
  label: string;
  kind: "identity" | "resource";
}

export interface GraphEdge {
  from: string;
  to: string;
  label: string;
  risky: boolean;
}

export function buildAccessGraph(
  identities: { id: string; name: string }[],
  requests: AccessRequest[],
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes = new Map<string, GraphNode>();
  for (const identity of identities) {
    nodes.set(identity.id, {
      id: identity.id,
      label: identity.name,
      kind: "identity",
    });
  }

  const edges: GraphEdge[] = [];
  for (const request of requests) {
    nodes.set(request.resourceId, {
      id: request.resourceId,
      label: request.resourceId,
      kind: "resource",
    });
    if (!nodes.has(request.requesterId)) {
      nodes.set(request.requesterId, {
        id: request.requesterId,
        label: request.requesterId,
        kind: "identity",
      });
    }
    edges.push({
      from: request.requesterId,
      to: request.resourceId,
      label: `${request.status} · ${request.scopes.join(", ")}`,
      risky: request.status === "approved" && request.scopes.includes("admin"),
    });
  }

  return { nodes: [...nodes.values()], edges };
}

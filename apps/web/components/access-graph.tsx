import { graphEdges, graphNodes } from "../lib/demo-data";

const kindFill: Record<(typeof graphNodes)[number]["kind"], string> = {
  identity: "#d7b15a",
  service: "#8fb4e3",
  group: "#6fcfbe",
  role: "#c9a27a",
  resource: "#e07a67",
};

export function AccessGraph() {
  const indexed = Object.fromEntries(graphNodes.map((node) => [node.id, node]));

  return (
    <div className="graph-canvas" role="img" aria-label="Access relationship graph for the demo tenant">
      <svg className="graph-svg" viewBox="0 0 820 400">
        {graphEdges.map((edge) => {
          const from = indexed[edge.from];
          const to = indexed[edge.to];
          if (!from || !to) {
            return null;
          }
          return (
            <line
              key={`${edge.from}-${edge.to}`}
              className={edge.risky ? "edge risky" : "edge"}
              x1={from.x + 78}
              y1={from.y + 18}
              x2={to.x}
              y2={to.y + 18}
            />
          );
        })}
        {graphNodes.map((node) => (
          <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
            <rect width="156" height="36" rx="18" fill="#121820" stroke={kindFill[node.kind]} />
            <circle cx="18" cy="18" r="6" fill={kindFill[node.kind]} />
            <text className="node-label" x="32" y="23">
              {node.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

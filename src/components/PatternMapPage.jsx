import React from 'react';
import SubPageLayout from './SubPageLayout';
import '../styles/PatternMapPage.css';

const NODES = [
  { id: 'a', x: 50, y: 50, label: 'base phrase', r: 8 },
  { id: 'b', x: 24, y: 31, label: 'shape b' },
  { id: 'c', x: 77, y: 30, label: 'shape c' },
  { id: 'd', x: 24, y: 73, label: 'shape d' },
  { id: 'e', x: 77, y: 72, label: 'shape e' }
];

const EDGES = [
  ['a', 'b'], ['a', 'c'], ['a', 'd'], ['a', 'e'], ['b', 'd'], ['c', 'e']
];

function pos(id) {
  return NODES.find(node => node.id === id);
}

function PatternMapPage() {
  return (
    <SubPageLayout
      title="Pattern Map"
      headline="A map of nearby shapes"
      subtitle="A quiet map of patterns you have moved through."
    >
      <section className="pattern-map-wrap navo-card navo-hairline-top">
        <svg viewBox="0 0 100 100" className="pattern-map-svg">
          {EDGES.map(([a, b]) => {
            const p1 = pos(a);
            const p2 = pos(b);
            return (
              <line
                key={`${a}-${b}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
              />
            );
          })}
          {NODES.map((node) => (
            <g key={node.id}>
              <circle cx={node.x} cy={node.y} r={node.r || 3.2} />
              <text x={node.x} y={node.y + 8}>{node.label}</text>
            </g>
          ))}
        </svg>
      </section>
    </SubPageLayout>
  );
}

export default PatternMapPage;

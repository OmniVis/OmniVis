import { describe, expect, it } from 'vitest';
import {
  addFlowchartNode,
  addFlowchartEdge,
  deleteFlowchartNode,
  deleteFlowchartEdge,
  updateNodeLabel,
  applyNodeColor,
  removeNodeColor,
  toggleNodeBold,
  changeNodeShape,
  updateEdgeLabel,
  reconnectEdge,
  changeEdgeStyle
} from './diagramManipulation';

// ── addFlowchartNode ────────────────────────────────────────────────────────

describe('addFlowchartNode', () => {
  it('appends a box node', () => {
    const code = 'flowchart TD\nA[Start]';
    const result = addFlowchartNode(code, 'B', 'End', 'box');
    expect(result).toContain('B[End]');
    expect(result).toContain('A[Start]');
  });

  it('appends a diamond node', () => {
    const code = 'flowchart TD\nA[Start]';
    const result = addFlowchartNode(code, 'Q', 'Decision?', 'diamond');
    expect(result).toContain('Q{Decision?}');
  });

  it('appends a round node', () => {
    const code = 'flowchart TD';
    const result = addFlowchartNode(code, 'R', 'Rounded', 'round');
    expect(result).toContain('R(Rounded)');
  });

  it('appends a circle node', () => {
    const code = 'flowchart TD';
    const result = addFlowchartNode(code, 'C', 'Circle', 'circle');
    expect(result).toContain('C((Circle))');
  });
});

// ── deleteFlowchartNode ─────────────────────────────────────────────────────

describe('deleteFlowchartNode', () => {
  it('removes the node definition line', () => {
    const code = 'flowchart TD\nA[Start]\nB[End]';
    const result = deleteFlowchartNode(code, 'A');
    expect(result).not.toContain('A[Start]');
    expect(result).toContain('B[End]');
  });

  it('removes outgoing edges from the deleted node', () => {
    const code = 'flowchart TD\nA[Start]\nB[End]\nA --> B';
    const result = deleteFlowchartNode(code, 'A');
    expect(result).not.toContain('A --> B');
    expect(result).toContain('B[End]');
  });

  it('removes incoming edges to the deleted node', () => {
    const code = 'flowchart TD\nA[Start]\nB[End]\nA --> B';
    const result = deleteFlowchartNode(code, 'B');
    expect(result).not.toContain('A --> B');
    expect(result).toContain('A[Start]');
  });

  it('removes style lines for the deleted node', () => {
    const code = 'flowchart TD\nA[Start]\nstyle A fill:#f00';
    const result = deleteFlowchartNode(code, 'A');
    expect(result).not.toContain('style A');
  });

  it('does not remove unrelated nodes or edges', () => {
    const code = 'flowchart TD\nA[Start]\nB[Middle]\nC[End]\nA --> B\nB --> C';
    const result = deleteFlowchartNode(code, 'A');
    expect(result).toContain('B[Middle]');
    expect(result).toContain('B --> C');
    expect(result).not.toContain('A --> B');
  });
});

// ── addFlowchartEdge ────────────────────────────────────────────────────────

describe('addFlowchartEdge', () => {
  it('adds an arrow without label', () => {
    const code = 'flowchart TD\nA[Start]\nB[End]';
    const result = addFlowchartEdge(code, 'A', 'B');
    expect(result).toContain('A --> B');
  });

  it('adds an arrow with label', () => {
    const code = 'flowchart TD\nA[Start]\nB[End]';
    const result = addFlowchartEdge(code, 'A', 'B', 'goes to');
    expect(result).toContain('A -->|goes to| B');
  });

  it('preserves existing code', () => {
    const code = 'flowchart TD\nA[Start]\nB[End]';
    const result = addFlowchartEdge(code, 'A', 'B');
    expect(result).toContain('A[Start]');
    expect(result).toContain('B[End]');
  });
});

// ── deleteFlowchartEdge ─────────────────────────────────────────────────────

describe('deleteFlowchartEdge', () => {
  it('removes a simple arrow line', () => {
    const code = 'flowchart TD\nA[Start]\nB[End]\nA --> B';
    const result = deleteFlowchartEdge(code, 'A', 'B');
    expect(result).not.toContain('A --> B');
    expect(result).toContain('A[Start]');
    expect(result).toContain('B[End]');
  });

  it('removes a labeled arrow line', () => {
    const code = 'flowchart TD\nA --> B\nA -->|Yes| C';
    const result = deleteFlowchartEdge(code, 'A', 'C');
    expect(result).not.toContain('|Yes|');
    expect(result).toContain('A --> B');
  });

  it('does not remove unrelated lines', () => {
    const code = 'flowchart TD\nA --> B\nB --> C';
    const result = deleteFlowchartEdge(code, 'A', 'B');
    expect(result).toContain('B --> C');
  });
});

// ── updateNodeLabel ─────────────────────────────────────────────────────────

describe('updateNodeLabel', () => {
  it('updates label in square brackets', () => {
    const code = 'flowchart TD\nA[Old Label]';
    const result = updateNodeLabel(code, 'A', 'New Label');
    expect(result).toContain('A[New Label]');
    expect(result).not.toContain('Old Label');
  });

  it('updates label in parentheses', () => {
    const code = 'flowchart TD\nA(Old Label)';
    const result = updateNodeLabel(code, 'A', 'New Label');
    expect(result).toContain('A(New Label)');
  });

  it('updates label in diamond braces', () => {
    const code = 'flowchart TD\nA{Old?}';
    const result = updateNodeLabel(code, 'A', 'New?');
    expect(result).toContain('A{New?}');
  });

  it('does not modify the header line', () => {
    const code = 'flowchart TD\nA[Label]';
    const result = updateNodeLabel(code, 'TD', 'BAD');
    expect(result).toContain('flowchart TD');
  });
});

// ── applyNodeColor ──────────────────────────────────────────────────────────

describe('applyNodeColor', () => {
  it('appends style line when none exists', () => {
    const code = 'flowchart TD\nA[Node]';
    const result = applyNodeColor(code, 'A', '#ff0000');
    expect(result).toContain('style A fill:#ff0000');
  });

  it('replaces existing style line', () => {
    const code = 'flowchart TD\nA[Node]\nstyle A fill:#0000ff';
    const result = applyNodeColor(code, 'A', '#ff0000');
    expect(result).toContain('style A fill:#ff0000');
    expect(result).not.toContain('fill:#0000ff');
  });

  it('does not duplicate style lines', () => {
    const code = 'flowchart TD\nA[Node]\nstyle A fill:#blue';
    const result = applyNodeColor(code, 'A', '#red');
    const count = (result.match(/^style A /gm) ?? []).length;
    expect(count).toBe(1);
  });
});

// ── removeNodeColor ─────────────────────────────────────────────────────────

describe('removeNodeColor', () => {
  it('removes the style line', () => {
    const code = 'flowchart TD\nA[Node]\nstyle A fill:#f00';
    const result = removeNodeColor(code, 'A');
    expect(result).not.toContain('style A');
    expect(result).toContain('A[Node]');
  });

  it('returns code unchanged when no style exists', () => {
    const code = 'flowchart TD\nA[Node]';
    const result = removeNodeColor(code, 'A');
    expect(result).toBe(code);
  });
});

// ── toggleNodeBold ──────────────────────────────────────────────────────────

describe('toggleNodeBold', () => {
  it('wraps plain label in **', () => {
    const code = 'flowchart TD\nA[Plain Text]';
    const result = toggleNodeBold(code, 'A');
    expect(result).toContain('A[**Plain Text**]');
  });

  it('removes ** from bold label', () => {
    const code = 'flowchart TD\nA[**Bold Text**]';
    const result = toggleNodeBold(code, 'A');
    expect(result).toContain('A[Bold Text]');
    expect(result).not.toContain('**');
  });

  it('toggles bold on round node', () => {
    const code = 'flowchart TD\nA(Round)';
    const result = toggleNodeBold(code, 'A');
    expect(result).toContain('A(**Round**)');
  });
});

// ── changeNodeShape ─────────────────────────────────────────────────────────

describe('changeNodeShape', () => {
  it('changes box to diamond', () => {
    const code = 'flowchart TD\nA[Label]';
    const result = changeNodeShape(code, 'A', 'diamond');
    expect(result).toContain('A{Label}');
    expect(result).not.toContain('A[Label]');
  });

  it('changes diamond to round', () => {
    const code = 'flowchart TD\nA{Label}';
    const result = changeNodeShape(code, 'A', 'round');
    expect(result).toContain('A(Label)');
  });

  it('changes round to box', () => {
    const code = 'flowchart TD\nA(Label)';
    const result = changeNodeShape(code, 'A', 'box');
    expect(result).toContain('A[Label]');
  });

  it('changes to circle', () => {
    const code = 'flowchart TD\nA[Label]';
    const result = changeNodeShape(code, 'A', 'circle');
    expect(result).toContain('A((Label))');
  });
});

// ── updateEdgeLabel ─────────────────────────────────────────────────────────

describe('updateEdgeLabel', () => {
  it('adds label to an unlabeled arrow', () => {
    const code = 'flowchart TD\nA --> B';
    const result = updateEdgeLabel(code, 'A', 'B', 'Yes');
    expect(result).toContain('|Yes|');
  });

  it('replaces an existing edge label', () => {
    const code = 'flowchart TD\nA -->|Old| B';
    const result = updateEdgeLabel(code, 'A', 'B', 'New');
    expect(result).toContain('|New|');
    expect(result).not.toContain('|Old|');
  });
});

// ── reconnectEdge ───────────────────────────────────────────────────────────

describe('reconnectEdge', () => {
  it('changes the target node of an edge', () => {
    const code = 'flowchart TD\nA --> B\nA --> C';
    const result = reconnectEdge(code, 'A', 'B', 'C');
    // A --> B is now gone (replaced); A --> C may appear once or twice
    expect(result).not.toContain('A --> B');
  });

  it('preserves unrelated edges', () => {
    const code = 'flowchart TD\nA --> B\nB --> C';
    const result = reconnectEdge(code, 'A', 'B', 'C');
    expect(result).toContain('B --> C');
  });
});

// ── changeEdgeStyle ─────────────────────────────────────────────────────────

describe('changeEdgeStyle', () => {
  it('changes solid arrow to dashed', () => {
    const code = 'flowchart TD\nA --> B';
    const result = changeEdgeStyle(code, 'A', 'B', 'dashed');
    expect(result).toContain('-.->');
    expect(result).not.toContain('A --> B');
  });

  it('changes solid arrow to thick', () => {
    const code = 'flowchart TD\nA --> B';
    const result = changeEdgeStyle(code, 'A', 'B', 'thick');
    expect(result).toContain('==>');
  });

  it('changes dashed back to solid', () => {
    const code = 'flowchart TD\nA -.-> B';
    const result = changeEdgeStyle(code, 'A', 'B', 'solid');
    expect(result).toContain('-->');
  });
});

/** Pure code→code transform functions for visual diagram editing. */

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── Node operations ──────────────────────────────────────────────────────────

export type NodeShape = 'box' | 'round' | 'diamond' | 'circle' | 'hexagon';

const SHAPE_BRACKETS: Record<NodeShape, [string, string]> = {
  box: ['[', ']'],
  circle: ['((', '))'],
  diamond: ['{', '}'],
  hexagon: ['{{', '}}'],
  round: ['(', ')']
};

/**
 * Appends a new node definition to the end of flowchart code.
 */
export function addFlowchartNode(
  code: string,
  nodeId: string,
  label: string,
  shape: NodeShape = 'box'
): string {
  const [open, close] = SHAPE_BRACKETS[shape];
  return code.trimEnd() + '\n' + `${nodeId}${open}${label}${close}` + '\n';
}

/**
 * Removes a node and all edges/styles referencing it from flowchart code.
 */
export function deleteFlowchartNode(code: string, nodeId: string): string {
  const esc = escapeRegex(nodeId);
  const lines = code.split('\n');

  const nodeDefRe = new RegExp(`^\\s*${esc}\\s*(?:\\[\\[|\\(\\(|\\{\\{|\\[|\\(|\\{|>|@\\{)`);
  const edgeFromRe = new RegExp(`^\\s*${esc}\\s*(?:-->|---|-.->|==>|--[^-\\n])`);
  const edgeToRe = new RegExp(
    `(?:-->|---|-.->|==>|--[^\\n]*?)\\s*(?:\\|[^|]*\\|\\s*)?\\b${esc}\\b(?:\\s*(?:[\\[({$])|\\s*$)`
  );
  const styleRe = new RegExp(`^\\s*style\\s+${esc}\\s`);
  const classRe = new RegExp(`^\\s*class\\s+${esc}\\s`);

  const filtered = lines.filter((line) => {
    if (nodeDefRe.test(line)) return false;
    if (edgeFromRe.test(line)) return false;
    if (edgeToRe.test(line)) return false;
    if (styleRe.test(line)) return false;
    if (classRe.test(line)) return false;
    return true;
  });

  return filtered.join('\n').replace(/\n{3,}/g, '\n\n');
}

// ─── Edge operations ──────────────────────────────────────────────────────────

/**
 * Appends a new edge between two existing nodes.
 */
export function addFlowchartEdge(
  code: string,
  fromId: string,
  toId: string,
  label?: string
): string {
  const edgeLine = label ? `${fromId} -->|${label}| ${toId}` : `${fromId} --> ${toId}`;
  return code.trimEnd() + '\n' + edgeLine + '\n';
}

/**
 * Removes the edge line matching fromId → toId (any arrow style, with or without label).
 */
export function deleteFlowchartEdge(code: string, fromId: string, toId: string): string {
  const ef = escapeRegex(fromId);
  const et = escapeRegex(toId);
  // Match any line where fromId appears before an arrow operator and toId appears after.
  // Permissive so it works regardless of leading spaces, inline node labels, or label pipes.
  const edgeRe = new RegExp(
    `^[^\\n]*\\b${ef}\\b[^\\n]*?(?:-->|---|-.->|==>)[^\\n]*?\\b${et}\\b[^\\n]*$`,
    'gm'
  );
  return code.replace(edgeRe, '').replace(/\n{3,}/g, '\n\n');
}

// ─── Node label / appearance ──────────────────────────────────────────────────

/**
 * Replaces the label text inside the node's shape brackets.
 * Works for [ ], ( ), { }, [[ ]], (( )), {{ }}.
 */
export function updateNodeLabel(code: string, nodeId: string, newLabel: string): string {
  const esc = escapeRegex(nodeId);
  const lines = code.split('\n');

  return lines
    .map((line, i) => {
      if (i === 0) return line; // protect diagram-type header
      // Try two-char openers first (order matters — longer match wins)
      const result = line
        .replace(new RegExp(`(\\b${esc})(\\s*\\[\\[)([^\\]]*?)(\\]\\])`), `$1$2${newLabel}$4`)
        .replace(new RegExp(`(\\b${esc})(\\s*\\(\\()([^)]*?)(\\)\\))`), `$1$2${newLabel}$4`)
        .replace(new RegExp(`(\\b${esc})(\\s*\\{\\{)([^}]*?)(\\}\\})`), `$1$2${newLabel}$4`);
      if (result !== line) return result;
      // Single-char openers
      return line
        .replace(new RegExp(`(\\b${esc})(\\s*\\[)([^\\]]*?)(\\])`), `$1$2${newLabel}$4`)
        .replace(new RegExp(`(\\b${esc})(\\s*\\()([^)]*?)(\\))`), `$1$2${newLabel}$4`)
        .replace(new RegExp(`(\\b${esc})(\\s*\\{)([^}]*?)(\\})`), `$1$2${newLabel}$4`)
        .replace(new RegExp(`(\\b${esc})(\\s*>)([^\\]]*?)(\\])`), `$1$2${newLabel}$4`);
    })
    .join('\n');
}

/**
 * Appends or replaces `style nodeId fill:color` in the code.
 */
export function applyNodeColor(code: string, nodeId: string, fillColor: string): string {
  const styleRe = new RegExp(`^style\\s+${escapeRegex(nodeId)}\\s+[^\\n]+$`, 'm');
  if (styleRe.test(code)) {
    return code.replace(styleRe, `style ${nodeId} fill:${fillColor}`);
  }
  return code.trimEnd() + `\nstyle ${nodeId} fill:${fillColor}`;
}

/**
 * Removes the `style nodeId ...` line entirely.
 */
export function removeNodeColor(code: string, nodeId: string): string {
  const styleRe = new RegExp(`^style\\s+${escapeRegex(nodeId)}\\s+[^\\n]+\\n?`, 'm');
  if (!styleRe.test(code)) return code;
  return code.replace(styleRe, '').replace(/\n{3,}/g, '\n\n');
}

/**
 * Toggles `**` bold markers around the node's label text.
 * `A[Text]` ↔ `A[**Text**]`
 */
export function toggleNodeBold(code: string, nodeId: string): string {
  const esc = escapeRegex(nodeId);
  // Captures: (nodeId)(opener)(label)(closer)
  const bracketRe = new RegExp(
    `(\\b${esc}\\s*(?:\\[\\[|\\(\\(|\\{\\{|\\[|\\(|\\{|>))` +
      `(.*?)` +
      `((?:\\]\\]|\\)\\)|\\}\\}|\\]|\\)|\\}))`
  );
  return code
    .split('\n')
    .map((line, i) => {
      if (i === 0) return line;
      return line.replace(bracketRe, (_m, pre, label, suf) => {
        const isBold = label.startsWith('**') && label.endsWith('**') && label.length > 4;
        return isBold ? `${pre}${label.slice(2, -2)}${suf}` : `${pre}**${label}**${suf}`;
      });
    })
    .join('\n');
}

/**
 * Changes the shape brackets around a node's label.
 * Preserves the existing label text.
 */
export function changeNodeShape(code: string, nodeId: string, shape: NodeShape): string {
  const esc = escapeRegex(nodeId);
  const [open, close] = SHAPE_BRACKETS[shape];
  // Match any existing shape and extract the label
  const anyShapeRe = new RegExp(
    `(\\b${esc})(\\s*)(?:\\[\\[|\\(\\(|\\{\\{|\\[|\\(|\\{|>)([^\\]\\)\\}\\n]*?)(?:\\]\\]|\\)\\)|\\}\\}|\\]|\\)|\\})`
  );
  return code
    .split('\n')
    .map((line, i) => {
      if (i === 0) return line;
      return line.replace(anyShapeRe, (_m, id, ws, label) => `${id}${ws}${open}${label}${close}`);
    })
    .join('\n');
}

// ─── Edge label / style / reconnect ──────────────────────────────────────────

/**
 * Adds, replaces, or removes a label on the edge between fromId and toId.
 * Passing an empty `newLabel` strips any existing label.
 */
export function updateEdgeLabel(
  code: string,
  fromId: string,
  toId: string,
  newLabel: string
): string {
  const ef = escapeRegex(fromId);
  const et = escapeRegex(toId);
  const label = newLabel.trim();
  return code
    .split('\n')
    .map((line) => {
      // Pattern 1: edge already has a label → replace or strip it
      const withLabel = new RegExp(
        `(\\b${ef}\\b[^\\n]*?(?:-->|---|-.->|==>))\\s*\\|[^|]*\\|\\s*(\\b${et}\\b[^\\n]*)`
      );
      if (withLabel.test(line)) {
        return label
          ? line.replace(withLabel, `$1 |${label}| $2`)
          : line.replace(withLabel, `$1 $2`);
      }
      // Pattern 2: no label → insert one (only if newLabel non-empty)
      if (!label) return line;
      const noLabel = new RegExp(`(\\b${ef}\\b[^\\n]*?)(-->|---|-.->|==>)(\\s*\\b${et}\\b[^\\n]*)`);
      if (noLabel.test(line)) return line.replace(noLabel, `$1$2 |${label}|$3`);
      return line;
    })
    .join('\n');
}

/**
 * Changes the target of an edge: replaces the first occurrence of
 * `fromId → oldToId` with `fromId → newToId`.
 */
export function reconnectEdge(
  code: string,
  fromId: string,
  oldToId: string,
  newToId: string
): string {
  const ef = escapeRegex(fromId);
  const eot = escapeRegex(oldToId);
  let replaced = false;
  return code
    .split('\n')
    .map((line) => {
      if (replaced) return line;
      const re = new RegExp(
        `(\\b${ef}\\b[^\\n]*?(?:-->|---|-.->|==>)[^\\n]*?)\\b${eot}\\b((?:\\s*(?:[\\[({]|$))?)`
      );
      if (re.test(line)) {
        replaced = true;
        return line.replace(re, `$1${newToId}$2`);
      }
      return line;
    })
    .join('\n');
}

export type EdgeStyle = 'solid' | 'dashed' | 'thick';

const ARROW_MAP: Record<EdgeStyle, string> = {
  solid: '-->',
  dashed: '-.->',
  thick: '==>'
};

/**
 * Replaces the arrow operator on the edge between fromId and toId.
 */
export function changeEdgeStyle(
  code: string,
  fromId: string,
  toId: string,
  style: EdgeStyle
): string {
  const ef = escapeRegex(fromId);
  const et = escapeRegex(toId);
  const newArrow = ARROW_MAP[style];
  return code.replace(
    new RegExp(`(\\b${ef}\\b[^\\n]*?)(-->|---|-.->|==>)([^\\n]*?\\b${et}\\b)`, 'm'),
    `$1${newArrow}$3`
  );
}

// ─── Utility: parse edge SVG ID ───────────────────────────────────────────────

/**
 * Attempts to parse a Mermaid SVG edge ID ("L_A_B_0") into from/to node IDs.
 * Uses the list of known node IDs to resolve ambiguity when IDs contain underscores.
 */
export function parseSvgEdgeId(
  svgId: string,
  knownIds: string[]
): { from: string; to: string } | null {
  if (!svgId.startsWith('L_')) return null;
  // Remove leading "L_" and trailing counter "_N"
  const inner = svgId.replace(/^L_/, '').replace(/_\d+$/, '');

  // Greedy match: try longer IDs first to avoid prefix collisions
  const sorted = [...knownIds].sort((a, b) => b.length - a.length);
  for (const from of sorted) {
    if (inner.startsWith(from + '_')) {
      const rest = inner.slice(from.length + 1);
      const to = sorted.find((id) => rest === id);
      if (to) return { from, to };
    }
  }
  // Fallback for simple non-underscore IDs
  const parts = inner.split('_');
  if (parts.length >= 2) return { from: parts[0], to: parts[parts.length - 1] };
  return null;
}

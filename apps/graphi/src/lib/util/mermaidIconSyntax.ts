export interface NodeInfo {
  id: string;
  type: 'flowchart-node' | 'arch-service' | 'arch-group';
}

const FLOWCHART_TYPES = new Set(['flowchart', 'graph', 'flowchart-v2']);
const ARCH_TYPES = new Set(['architecture-beta']);

/** Returns true if the diagram type supports any icon insertion */
export function diagramSupportsIcons(diagramType: string | undefined): boolean {
  if (!diagramType) return false;
  return FLOWCHART_TYPES.has(diagramType) || ARCH_TYPES.has(diagramType);
}

// ─── Flowchart detection ────────────────────────────────────────────────────

// Lines to skip entirely in flowcharts
const FLOWCHART_SKIP_RE =
  /^\s*(%%|classDef\s|class\s|style\s|linkStyle\s|click\s|subgraph\s|end\b|direction\s|flowchart\b|graph\b)/i;

// Finds the first node declaration on a line: identifier immediately followed by a shape opener
// Shape openers: [ ( { > @ and multi-char variants [[ (( ([ [( {{ [/
const FLOWCHART_NODE_RE =
  /\b([A-Za-z_][A-Za-z0-9_-]*)\s*(?=@\{|\[\[|\(\(|\(\[|\[\(|\{\{|\[\/|[[({}>{])/;

// Any line that carries an edge (arrow or open link) — guards the bare-word fallback
const FLOWCHART_EDGE_RE = /--/;

// Fallback: bare-word identifiers NOT immediately followed by a shape opener.
// Uses -(?!-) to prevent consuming hyphens that are part of -- (open-link / arrow syntax).
// Only runs when FLOWCHART_NODE_RE finds nothing and the line contains an arrow.
// Global flag version used with matchAll to capture ALL identifiers on a line.
const FLOWCHART_BARE_NODE_RE_GLOBAL =
  /\b([A-Za-z_](?:[A-Za-z0-9_]|-(?!-))*)(?!\s*(?:@\{|\[\[|\(\(|\(\[|\[\(|\{\{|\[\/|[[({}>{]))/g;

// ─── Architecture detection ──────────────────────────────────────────────────

const ARCH_SKIP_RE = /^\s*(%%|architecture-beta\b|junction\b)/i;
// Edge lines contain --> between identifiers with optional port notation (id:PORT)
const ARCH_EDGE_RE = /[A-Za-z_][A-Za-z0-9_-]*\s*(?::[A-Z]+\s*)?-->/;

const ARCH_SERVICE_RE = /^\s*service\s+([A-Za-z_][A-Za-z0-9_-]*)\s*(?:\([^)]*\))?\s*\[/;
const ARCH_GROUP_RE = /^\s*group\s+([A-Za-z_][A-Za-z0-9_-]*)\s*(?:\([^)]*\))?\s*\[/;

/** Strips edge label content (|...|) from a line before node ID extraction */
function stripEdgeLabels(line: string): string {
  return line.replace(/\|[^|]*\|/g, '||');
}

/**
 * Returns a 1-indexed line → NodeInfo map for all lines that can receive an icon.
 * One entry per line; if multiple nodes share a line the first one wins.
 */
export function extractIconCapableLines(
  code: string,
  diagramType: string | undefined
): Map<number, NodeInfo> {
  const result = new Map<number, NodeInfo>();
  if (!diagramType) return result;

  const lines = code.split('\n');

  if (FLOWCHART_TYPES.has(diagramType)) {
    // Synthetic keys start after the last real line number so they never collide.
    // insertOrUpdateFlowchartIcon uses nodeId (not lineNumber) for flowchart nodes,
    // so synthetic keys are safe for any secondary node on a multi-node arrow line.
    let syntheticKey = lines.length + 1;
    // Global deduplication: the same node ID must appear only once in the result.
    // This prevents `Start@{ icon: "..." }` annotation lines from re-adding nodes
    // that were already detected on an arrow line.
    const seenNodeIds = new Set<string>();
    lines.forEach((line, i) => {
      if (FLOWCHART_SKIP_RE.test(line)) return;
      const stripped = stripEdgeLabels(line);
      const match = stripped.match(FLOWCHART_NODE_RE);
      if (match) {
        const id = match[1];
        if (!seenNodeIds.has(id)) {
          seenNodeIds.add(id);
          result.set(i + 1, { id, type: 'flowchart-node' });
        }
        return;
      }
      // Bare-word fallback: detect ALL bare identifiers on arrow lines (e.g. `Start --> Stop`)
      if (FLOWCHART_EDGE_RE.test(stripped)) {
        const lineSeenIds = new Set<string>();
        let isFirst = true;
        for (const bareMatch of stripped.matchAll(FLOWCHART_BARE_NODE_RE_GLOBAL)) {
          const id = bareMatch[1];
          if (lineSeenIds.has(id) || seenNodeIds.has(id)) continue;
          lineSeenIds.add(id);
          seenNodeIds.add(id);
          const key = isFirst ? i + 1 : syntheticKey++;
          result.set(key, { id, type: 'flowchart-node' });
          isFirst = false;
        }
      }
    });
    return result;
  }

  if (ARCH_TYPES.has(diagramType)) {
    lines.forEach((line, i) => {
      if (ARCH_SKIP_RE.test(line)) return;
      if (ARCH_EDGE_RE.test(line)) return;
      const serviceMatch = line.match(ARCH_SERVICE_RE);
      if (serviceMatch) {
        result.set(i + 1, { id: serviceMatch[1], type: 'arch-service' });
        return;
      }
      const groupMatch = line.match(ARCH_GROUP_RE);
      if (groupMatch) {
        result.set(i + 1, { id: groupMatch[1], type: 'arch-group' });
      }
    });
    return result;
  }

  return result;
}

// ─── Flowchart insertion ─────────────────────────────────────────────────────

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Appends or updates a `nodeId@{ icon: "iconId" }` block at the bottom of
 * flowchart code. Never modifies the original node declaration line.
 */
export function insertOrUpdateFlowchartIcon(code: string, nodeId: string, iconId: string): string {
  const lines = code.split('\n');
  const atBlockRe = new RegExp(`^(\\s*${escapeRegex(nodeId)}@\\{)(.*)\\}\\s*$`);

  for (let i = lines.length - 1; i >= 0; i--) {
    const match = lines[i].match(atBlockRe);
    if (!match) continue;

    const props = match[2];
    // Replace existing icon: "..." property
    if (/\bicon\s*:/.test(props)) {
      lines[i] = lines[i].replace(/\bicon\s*:\s*"[^"]*"/, `icon: "${iconId}"`);
    } else {
      // Add icon property: insert before the closing } using the original line
      // Find the last } and insert before it, adding a comma separator if there are existing props
      const closingIdx = lines[i].lastIndexOf('}');
      const beforeClose = lines[i].slice(0, closingIdx);
      const hasProps = /\S/.test(beforeClose.replace(/^\s*\w[^@]*@\{/, ''));
      const sep = hasProps ? ', ' : ' ';
      lines[i] = beforeClose + sep + `icon: "${iconId}" }`;
    }
    return lines.join('\n');
  }

  // No existing @{} block — append at bottom with blank-line separator
  const trimmed = code.trimEnd();
  const needsBlankLine = !trimmed.endsWith('\n\n') && trimmed.length > 0;
  const separator = needsBlankLine ? '\n\n' : '\n';
  return trimmed + separator + `${nodeId}@{ icon: "${iconId}" }\n`;
}

// ─── Architecture insertion ───────────────────────────────────────────────────

// Matches: (service|group) id(existingIcon)[...] OR (service|group) id[...]
const ARCH_WITH_ICON_RE = /^(\s*(?:service|group)\s+[A-Za-z_][A-Za-z0-9_-]*\s*)\([^)]*\)([\s\S]*)$/;
const ARCH_WITHOUT_ICON_RE = /^(\s*(?:service|group)\s+[A-Za-z_][A-Za-z0-9_-]*\s*)(\[[\s\S]*)$/;

/**
 * Inserts or replaces the (icon) slot on an architecture service/group line.
 * Uses 1-indexed lineNumber (Monaco convention).
 */
export function insertOrUpdateArchitectureIcon(
  code: string,
  lineNumber: number,
  iconId: string
): string {
  const lines = code.split('\n');
  const idx = lineNumber - 1;
  if (idx < 0 || idx >= lines.length) return code;

  const line = lines[idx];

  if (ARCH_WITH_ICON_RE.test(line)) {
    lines[idx] = line.replace(ARCH_WITH_ICON_RE, `$1(${iconId})$2`);
  } else if (ARCH_WITHOUT_ICON_RE.test(line)) {
    lines[idx] = line.replace(ARCH_WITHOUT_ICON_RE, `$1(${iconId})$2`);
  } else {
    lines[idx] = line.trimEnd() + `(${iconId})`;
  }

  return lines.join('\n');
}

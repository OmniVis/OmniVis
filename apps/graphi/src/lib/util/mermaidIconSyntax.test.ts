import { describe, expect, it } from 'vitest';
import {
  diagramSupportsIcons,
  extractIconCapableLines,
  insertOrUpdateArchitectureIcon,
  insertOrUpdateFlowchartIcon
} from './mermaidIconSyntax';

describe('diagramSupportsIcons', () => {
  it('returns true for flowchart types', () => {
    expect(diagramSupportsIcons('flowchart')).toBe(true);
    expect(diagramSupportsIcons('graph')).toBe(true);
    expect(diagramSupportsIcons('flowchart-v2')).toBe(true);
  });

  it('returns true for architecture-beta', () => {
    expect(diagramSupportsIcons('architecture-beta')).toBe(true);
  });

  it('returns false for unsupported types', () => {
    expect(diagramSupportsIcons('gantt')).toBe(false);
    expect(diagramSupportsIcons('pie')).toBe(false);
    expect(diagramSupportsIcons('sequenceDiagram')).toBe(false);
    expect(diagramSupportsIcons('classDiagram')).toBe(false);
    expect(diagramSupportsIcons(undefined)).toBe(false);
  });
});

describe('extractIconCapableLines', () => {
  it('returns empty map for unsupported diagram type', () => {
    const code = 'gantt\n  A[Task]: 2024-01-01, 7d';
    const map = extractIconCapableLines(code, 'gantt');
    expect(map.size).toBe(0);
  });

  it('returns empty map when diagramType is undefined', () => {
    const map = extractIconCapableLines('A[Node]', undefined);
    expect(map.size).toBe(0);
  });

  it('detects flowchart square-bracket node on its own line', () => {
    const code = 'flowchart TD\nA[Christmas]';
    const map = extractIconCapableLines(code, 'flowchart');
    expect(map.has(2)).toBe(true);
    expect(map.get(2)?.id).toBe('A');
    expect(map.get(2)?.type).toBe('flowchart-node');
  });

  it('detects flowchart node on arrow line (first node wins)', () => {
    const code = 'flowchart TD\nA[Label] --> B[Other]';
    const map = extractIconCapableLines(code, 'flowchart');
    expect(map.has(2)).toBe(true);
    expect(map.get(2)?.id).toBe('A');
  });

  it('detects node on arrow line when second node has label', () => {
    const code = 'flowchart TD\nA --> B[Other]';
    const map = extractIconCapableLines(code, 'flowchart');
    expect(map.has(2)).toBe(true);
    expect(map.get(2)?.id).toBe('B');
  });

  it('detects bare-word node on arrow-only line (first identifier at real line key)', () => {
    const code = 'flowchart TD\nA --> B';
    const map = extractIconCapableLines(code, 'flowchart');
    expect(map.has(2)).toBe(true);
    expect(map.get(2)?.id).toBe('A');
    expect(map.get(2)?.type).toBe('flowchart-node');
  });

  it('detects ALL bare-word nodes on a simple arrow line', () => {
    const code = 'flowchart TD\nA --> B';
    const map = extractIconCapableLines(code, 'flowchart');
    const ids = Array.from(map.values()).map((n) => n.id);
    expect(ids).toContain('A');
    expect(ids).toContain('B');
  });

  it('detects bare-word node in real-world flowchart (Start --> Stop)', () => {
    const code = 'flowchart TD\n    Start --> Stop';
    const map = extractIconCapableLines(code, 'flowchart');
    expect(map.has(2)).toBe(true);
    expect(map.get(2)?.id).toBe('Start');
    expect(map.get(2)?.type).toBe('flowchart-node');
  });

  it('detects both Start and Stop for Start --> Stop', () => {
    const code = 'flowchart TD\n    Start --> Stop';
    const map = extractIconCapableLines(code, 'flowchart');
    const ids = Array.from(map.values()).map((n) => n.id);
    expect(ids).toContain('Start');
    expect(ids).toContain('Stop');
  });

  it('detects all nodes in a chain (A --> B --> C)', () => {
    const code = 'flowchart TD\nA --> B --> C';
    const map = extractIconCapableLines(code, 'flowchart');
    const ids = Array.from(map.values()).map((n) => n.id);
    expect(ids).toContain('A');
    expect(ids).toContain('B');
    expect(ids).toContain('C');
  });

  it('does not duplicate node IDs when the same id appears twice in a chain', () => {
    const code = 'flowchart TD\nA --> B --> A';
    const map = extractIconCapableLines(code, 'flowchart');
    const ids = Array.from(map.values()).map((n) => n.id);
    expect(ids.filter((id) => id === 'A').length).toBe(1);
    expect(ids).toContain('B');
  });

  it('does not list a node twice when a @{} annotation line follows its arrow declaration', () => {
    // Regression: Start@{ icon: "..." } must not produce a second "Start" entry
    const code = 'flowchart TD\n    Start --> Stop\n\nStart@{ icon: "tabler:car" }';
    const map = extractIconCapableLines(code, 'flowchart');
    const ids = Array.from(map.values()).map((n) => n.id);
    expect(ids.filter((id) => id === 'Start').length).toBe(1);
    expect(ids).toContain('Stop');
  });

  it('does not produce malformed id for spaceless edge (A--B)', () => {
    const code = 'flowchart TD\nA--B';
    const map = extractIconCapableLines(code, 'flowchart');
    expect(map.has(2)).toBe(true);
    expect(map.get(2)?.id).toBe('A');
  });

  it('skips comment lines', () => {
    const code = 'flowchart TD\n%% This is a comment\nA[Node]';
    const map = extractIconCapableLines(code, 'flowchart');
    expect(map.has(2)).toBe(false);
    expect(map.has(3)).toBe(true);
  });

  it('skips classDef, class, style, linkStyle, click lines', () => {
    const code = [
      'flowchart TD',
      'classDef myClass fill:#f9f',
      'class A myClass',
      'style A fill:#bbf',
      'linkStyle 0 stroke:#f66',
      'click A callback',
      'A[Node]'
    ].join('\n');
    const map = extractIconCapableLines(code, 'flowchart');
    expect(map.size).toBe(1);
    expect(map.has(7)).toBe(true);
  });

  it('skips subgraph and end lines', () => {
    const code = 'flowchart TD\nsubgraph title\nA[Node]\nend';
    const map = extractIconCapableLines(code, 'flowchart');
    expect(map.has(2)).toBe(false); // subgraph line
    expect(map.has(3)).toBe(true); // A[Node]
    expect(map.has(4)).toBe(false); // end line
  });

  it('detects all flowchart node shapes', () => {
    const code = [
      'flowchart TD',
      'A[square]',
      'B(rounded)',
      'C{rhombus}',
      'D((circle))',
      'E([stadium])',
      'F[[subroutine]]',
      'G[(cylinder)]',
      'H{{hexagon}}',
      'I>asymmetric]',
      'J@{ shape: icon, icon: "mdi:home" }'
    ].join('\n');
    const map = extractIconCapableLines(code, 'flowchart');
    expect(map.size).toBe(10);
    for (let line = 2; line <= 11; line++) {
      expect(map.has(line)).toBe(true);
    }
  });

  it('detects architecture service lines', () => {
    const code = 'architecture-beta\nservice db[Database]\nservice api(logos:node)[API]';
    const map = extractIconCapableLines(code, 'architecture-beta');
    expect(map.has(2)).toBe(true);
    expect(map.get(2)?.id).toBe('db');
    expect(map.get(2)?.type).toBe('arch-service');
    expect(map.has(3)).toBe(true);
    expect(map.get(3)?.id).toBe('api');
  });

  it('detects architecture group lines', () => {
    const code = 'architecture-beta\ngroup cloud[Cloud]';
    const map = extractIconCapableLines(code, 'architecture-beta');
    expect(map.has(2)).toBe(true);
    expect(map.get(2)?.id).toBe('cloud');
    expect(map.get(2)?.type).toBe('arch-group');
  });

  it('skips architecture edge lines', () => {
    const code = 'architecture-beta\nservice a[A]\nservice b[B]\na:R --> b:L';
    const map = extractIconCapableLines(code, 'architecture-beta');
    expect(map.has(4)).toBe(false); // edge line
  });

  it('skips junction lines', () => {
    const code = 'architecture-beta\nservice db[Database]\njunction jct\n';
    const map = extractIconCapableLines(code, 'architecture-beta');
    expect(map.has(3)).toBe(false);
  });

  it('does not false-positive on edge label text containing brackets', () => {
    const code = 'flowchart TD\nA -->|"B[desc]"| C[Target]';
    const map = extractIconCapableLines(code, 'flowchart');
    expect(map.has(2)).toBe(true);
    expect(map.get(2)?.id).toBe('C');
  });
});

describe('insertOrUpdateFlowchartIcon', () => {
  it('appends @{} block when node has no existing block', () => {
    const code = 'flowchart TD\nA[Christmas] --> B[Shopping]\n';
    const result = insertOrUpdateFlowchartIcon(code, 'A', 'mdi:home');
    expect(result).toContain('A@{ icon: "mdi:home" }');
    // Original declaration untouched
    expect(result).toContain('A[Christmas]');
  });

  it('adds blank line separator before new @{} block', () => {
    const code = 'flowchart TD\nA[Node]';
    const result = insertOrUpdateFlowchartIcon(code, 'A', 'mdi:home');
    expect(result).toMatch(/A\[Node\]\n\nA@\{ icon: "mdi:home" \}/);
  });

  it('updates existing icon in @{} block', () => {
    const code = 'flowchart TD\nA[Node]\n\nA@{ icon: "mdi:old" }\n';
    const result = insertOrUpdateFlowchartIcon(code, 'A', 'mdi:home');
    expect(result).toContain('A@{ icon: "mdi:home" }');
    expect(result).not.toContain('mdi:old');
  });

  it('adds icon property to existing @{} block that has other props', () => {
    const code = 'flowchart TD\nA[Node]\n\nA@{ shape: rounded }\n';
    const result = insertOrUpdateFlowchartIcon(code, 'A', 'mdi:home');
    expect(result).toContain('icon: "mdi:home"');
    expect(result).toContain('shape: rounded');
  });

  it('replaces icon property while preserving other props', () => {
    const code = 'flowchart TD\nA[Node]\n\nA@{ shape: rounded, icon: "mdi:old", label: "Home" }\n';
    const result = insertOrUpdateFlowchartIcon(code, 'A', 'mdi:new');
    expect(result).toContain('icon: "mdi:new"');
    expect(result).toContain('shape: rounded');
    expect(result).toContain('label: "Home"');
    expect(result).not.toContain('mdi:old');
  });

  it('does not corrupt prop values containing a trailing comma', () => {
    const code = 'flowchart TD\nA[Node]\n\nA@{ label: "foo," }\n';
    const result = insertOrUpdateFlowchartIcon(code, 'A', 'mdi:home');
    expect(result).toContain('label: "foo,"');
    expect(result).toContain('icon: "mdi:home"');
  });

  it('does not modify original node declaration', () => {
    const code = 'flowchart TD\nA[Christmas]\n';
    const result = insertOrUpdateFlowchartIcon(code, 'A', 'mdi:home');
    expect(result).toContain('A[Christmas]');
    // The node declaration line is unchanged
    const lines = result.split('\n');
    const nodeLine = lines.find((l) => l.includes('A[Christmas]'));
    expect(nodeLine?.trim()).toBe('A[Christmas]');
  });
});

describe('insertOrUpdateArchitectureIcon', () => {
  it('inserts icon into service line without existing icon', () => {
    const code = 'architecture-beta\nservice db[Database]\n';
    const result = insertOrUpdateArchitectureIcon(code, 2, 'mdi:database');
    expect(result).toContain('service db(mdi:database)[Database]');
  });

  it('replaces existing icon in service line', () => {
    const code = 'architecture-beta\nservice db(old:icon)[Database]\n';
    const result = insertOrUpdateArchitectureIcon(code, 2, 'mdi:database');
    expect(result).toContain('service db(mdi:database)[Database]');
    expect(result).not.toContain('old:icon');
  });

  it('inserts icon into group line without existing icon', () => {
    const code = 'architecture-beta\ngroup cloud[Cloud]\n';
    const result = insertOrUpdateArchitectureIcon(code, 2, 'mdi:cloud');
    expect(result).toContain('group cloud(mdi:cloud)[Cloud]');
  });

  it('replaces existing icon in group line', () => {
    const code = 'architecture-beta\ngroup cloud(old:cloud)[Cloud]\n';
    const result = insertOrUpdateArchitectureIcon(code, 2, 'mdi:cloud');
    expect(result).toContain('group cloud(mdi:cloud)[Cloud]');
    expect(result).not.toContain('old:cloud');
  });

  it('returns code unchanged for out-of-range line number', () => {
    const code = 'architecture-beta\nservice db[Database]\n';
    const result = insertOrUpdateArchitectureIcon(code, 99, 'mdi:database');
    expect(result).toBe(code);
  });

  it('preserves all other lines unchanged', () => {
    const code = 'architecture-beta\nservice db[Database]\nservice api[API]\n';
    const result = insertOrUpdateArchitectureIcon(code, 2, 'mdi:database');
    expect(result).toContain('service api[API]');
  });
});

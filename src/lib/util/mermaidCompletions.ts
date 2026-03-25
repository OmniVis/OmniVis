// Mermaid syntax auto-complete suggestions
// Provides context-aware completions for the code editor

interface CompletionItem {
  label: string;
  detail: string;
  insertText: string;
  kind: 'keyword' | 'snippet' | 'type';
}

// Diagram type starters
const diagramTypes: CompletionItem[] = [
  {
    label: 'graph TD',
    detail: 'Top-down flowchart',
    insertText:
      'graph TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Result 1]\n    B -->|No| D[Result 2]',
    kind: 'snippet'
  },
  {
    label: 'graph LR',
    detail: 'Left-right flowchart',
    insertText: 'graph LR\n    A[Start] --> B[Process] --> C[End]',
    kind: 'snippet'
  },
  {
    label: 'sequenceDiagram',
    detail: 'Sequence diagram',
    insertText:
      'sequenceDiagram\n    participant A as Alice\n    participant B as Bob\n    A->>B: Hello Bob\n    B-->>A: Hi Alice',
    kind: 'snippet'
  },
  {
    label: 'classDiagram',
    detail: 'Class diagram',
    insertText:
      'classDiagram\n    class Animal {\n        +String name\n        +int age\n        +makeSound()\n    }',
    kind: 'snippet'
  },
  {
    label: 'stateDiagram-v2',
    detail: 'State diagram',
    insertText:
      'stateDiagram-v2\n    [*] --> Idle\n    Idle --> Active : start\n    Active --> Idle : stop\n    Active --> [*] : finish',
    kind: 'snippet'
  },
  {
    label: 'erDiagram',
    detail: 'Entity-Relationship diagram',
    insertText:
      'erDiagram\n    CUSTOMER ||--o{ ORDER : places\n    ORDER ||--|{ LINE-ITEM : contains\n    CUSTOMER }|..|{ DELIVERY-ADDRESS : uses',
    kind: 'snippet'
  },
  {
    label: 'gantt',
    detail: 'Gantt chart',
    insertText:
      'gantt\n    title Project Timeline\n    dateFormat YYYY-MM-DD\n    section Phase 1\n        Task 1 :a1, 2024-01-01, 30d\n        Task 2 :after a1, 20d',
    kind: 'snippet'
  },
  {
    label: 'pie',
    detail: 'Pie chart',
    insertText:
      'pie title Distribution\n    "Category A" : 45\n    "Category B" : 30\n    "Category C" : 25',
    kind: 'snippet'
  },
  {
    label: 'gitgraph',
    detail: 'Git graph',
    insertText:
      'gitgraph\n    commit\n    branch develop\n    checkout develop\n    commit\n    commit\n    checkout main\n    merge develop\n    commit',
    kind: 'snippet'
  },
  {
    label: 'mindmap',
    detail: 'Mind map',
    insertText:
      'mindmap\n  root((Central Topic))\n    Branch 1\n      Leaf 1\n      Leaf 2\n    Branch 2\n      Leaf 3',
    kind: 'snippet'
  },
  {
    label: 'timeline',
    detail: 'Timeline diagram',
    insertText:
      'timeline\n    title History of Events\n    2020 : Event A\n    2021 : Event B\n         : Event C\n    2022 : Event D',
    kind: 'snippet'
  }
];

// Flowchart node shapes
const nodeShapes: CompletionItem[] = [
  { label: '[text]', detail: 'Rectangle node', insertText: '[${1:Label}]', kind: 'keyword' },
  { label: '(text)', detail: 'Rounded rectangle', insertText: '(${1:Label})', kind: 'keyword' },
  {
    label: '([text])',
    detail: 'Stadium-shaped node',
    insertText: '([${1:Label}])',
    kind: 'keyword'
  },
  { label: '{text}', detail: 'Diamond (decision)', insertText: '{${1:Decision}}', kind: 'keyword' },
  {
    label: '((text))',
    detail: 'Circle node',
    insertText: '((${1:Label}))',
    kind: 'keyword'
  },
  {
    label: '[[text]]',
    detail: 'Subroutine node',
    insertText: '[[${1:Label}]]',
    kind: 'keyword'
  },
  {
    label: '[(text)]',
    detail: 'Cylindrical (database)',
    insertText: '[(${1:Database})]',
    kind: 'keyword'
  },
  {
    label: '>text]',
    detail: 'Asymmetric (flag)',
    insertText: '>${1:Label}]',
    kind: 'keyword'
  },
  {
    label: '{{text}}',
    detail: 'Hexagon node',
    insertText: '{{${1:Label}}}',
    kind: 'keyword'
  }
];

// Edge types
const edgeTypes: CompletionItem[] = [
  { label: '-->', detail: 'Arrow', insertText: '-->', kind: 'keyword' },
  { label: '---', detail: 'Line', insertText: '---', kind: 'keyword' },
  { label: '-.->', detail: 'Dotted arrow', insertText: '-.->', kind: 'keyword' },
  { label: '==>', detail: 'Thick arrow', insertText: '==>', kind: 'keyword' },
  {
    label: '-->|text|',
    detail: 'Arrow with label',
    insertText: '-->|${1:label}|',
    kind: 'keyword'
  },
  { label: '->>>', detail: 'Async message (sequence)', insertText: '->>', kind: 'keyword' },
  { label: '-->>>', detail: 'Async response (sequence)', insertText: '-->>', kind: 'keyword' }
];

// Sequence diagram keywords
const sequenceKeywords: CompletionItem[] = [
  {
    label: 'participant',
    detail: 'Add participant',
    insertText: 'participant ${1:Name}',
    kind: 'keyword'
  },
  {
    label: 'actor',
    detail: 'Add actor',
    insertText: 'actor ${1:Name}',
    kind: 'keyword'
  },
  { label: 'Note', detail: 'Add note', insertText: 'Note over ${1:A}: ${2:text}', kind: 'keyword' },
  {
    label: 'loop',
    detail: 'Loop block',
    insertText: 'loop ${1:condition}\n    end',
    kind: 'snippet'
  },
  {
    label: 'alt',
    detail: 'Alternative block',
    insertText: 'alt ${1:case1}\n    else ${2:case2}\n    end',
    kind: 'snippet'
  },
  {
    label: 'opt',
    detail: 'Optional block',
    insertText: 'opt ${1:description}\n    end',
    kind: 'snippet'
  },
  {
    label: 'activate',
    detail: 'Activate lifeline',
    insertText: 'activate ${1:participant}',
    kind: 'keyword'
  },
  {
    label: 'deactivate',
    detail: 'Deactivate lifeline',
    insertText: 'deactivate ${1:participant}',
    kind: 'keyword'
  }
];

// Styling keywords
const stylingKeywords: CompletionItem[] = [
  {
    label: 'style',
    detail: 'Style a node',
    insertText: 'style ${1:nodeId} fill:#${2:f9f},stroke:#${3:333},stroke-width:2px',
    kind: 'keyword'
  },
  {
    label: 'classDef',
    detail: 'Define a CSS class',
    insertText: 'classDef ${1:className} fill:#${2:f9f},stroke:#${3:333},stroke-width:2px',
    kind: 'keyword'
  },
  {
    label: 'class',
    detail: 'Apply class to nodes',
    insertText: 'class ${1:nodeId} ${2:className}',
    kind: 'keyword'
  },
  {
    label: 'click',
    detail: 'Add click event',
    insertText: 'click ${1:nodeId} "${2:url}" "${3:tooltip}"',
    kind: 'keyword'
  },
  {
    label: 'subgraph',
    detail: 'Create subgraph',
    insertText: 'subgraph ${1:Title}\n    ${2:content}\n    end',
    kind: 'snippet'
  }
];

function getCompletions(currentLine: string, fullText: string): CompletionItem[] {
  const trimmed = currentLine.trim().toLowerCase();
  const results: CompletionItem[] = [];

  // Empty line at the start — suggest diagram types
  if (fullText.trim() === '' || trimmed === '') {
    if (fullText.trim() === '') {
      results.push(...diagramTypes);
    }
  }

  // Inside a flowchart
  if (fullText.includes('graph ') || fullText.includes('flowchart ')) {
    results.push(...nodeShapes);
    results.push(...edgeTypes);
    results.push(...stylingKeywords);
  }

  // Inside a sequence diagram
  if (fullText.includes('sequenceDiagram')) {
    results.push(...sequenceKeywords);
  }

  // General styling is always available
  if (trimmed.startsWith('sty') || trimmed.startsWith('cla') || trimmed.startsWith('sub')) {
    results.push(...stylingKeywords);
  }

  return results;
}

export { diagramTypes, getCompletions };
export type { CompletionItem };

<script lang="ts">
  import { Input } from '$/components/ui/input';
  import { stateStore, updateCodeStore } from '$lib/util/state';
  import { logEvent } from '$lib/util/stats';
  import TemplateIcon from '~icons/material-symbols/account-tree';
  import SearchIcon from '~icons/material-symbols/search';

  const templates = [
    // Flowchart (3)
    { category: 'Flowchart', name: 'Simple Flow', code: `flowchart TD\n    Start --> Stop` },
    {
      category: 'Flowchart',
      name: 'Decision Flow',
      code: `flowchart TD\n    A[Start] --> B{Decision?}\n    B -->|Yes| C[Action]\n    B -->|No| D[Skip]\n    C --> E[End]\n    D --> E`
    },
    {
      category: 'Flowchart',
      name: 'Architecture',
      code: `flowchart TB\n    subgraph "Frontend"\n        A[Client] --> B[Load Balancer]\n    end\n    subgraph "Backend"\n        B --> C[API Server]\n        C --> D[(Database)]\n    end`
    },

    // Sequence (3)
    {
      category: 'Sequence',
      name: 'User Auth',
      code: `sequenceDiagram\n    participant U as User\n    participant A as Auth Service\n    U->>A: Login(user, pass)\n    A-->>U: Token`
    },
    {
      category: 'Sequence',
      name: 'API Flow',
      code: `sequenceDiagram\n    Client->>Proxy: Request\n    Proxy->>Server: Forward\n    Server-->>Proxy: Response\n    Proxy-->>Client: Response`
    },
    {
      category: 'Sequence',
      name: 'Microservice',
      code: `sequenceDiagram\n    participant G as Gateway\n    participant O as Order Service\n    participant P as Payment Service\n    participant N as Notification\n    G->>O: CreateOrder\n    O->>P: ChargePayment\n    P-->>O: PaymentConfirmed\n    O->>N: SendReceipt\n    N-->>G: Done`
    },

    // ER Diagram (2)
    {
      category: 'ER',
      name: 'Database Schema',
      code: `erDiagram\n    USER ||--o{ ORDER : places\n    USER { string name\n        string email }\n    ORDER { int id\n        date created }`
    },
    {
      category: 'ER',
      name: 'Blog Schema',
      code: `erDiagram\n    AUTHOR ||--o{ POST : writes\n    POST ||--o{ COMMENT : has\n    POST { string title\n        text content }\n    COMMENT { text body\n        date created }`
    },

    // Class Diagram (2)
    {
      category: 'Class',
      name: 'Design Pattern',
      code: `classDiagram\n    class Animal { +makeSound() }\n    class Dog { +makeSound() }\n    class Cat { +makeSound() }\n    Animal <|-- Dog\n    Animal <|-- Cat`
    },
    {
      category: 'Class',
      name: 'Service Layer',
      code: `classDiagram\n    class Controller { +handleRequest() }\n    class Service { +processData() }\n    class Repository { +findAll() +save() }\n    Controller --> Service\n    Service --> Repository`
    },

    // State Diagram (2)
    {
      category: 'State',
      name: 'Order Lifecycle',
      code: `stateDiagram-v2\n    [*] --> Pending\n    Pending --> Processing\n    Processing --> Shipped\n    Shipped --> Delivered\n    Delivered --> [*]`
    },
    {
      category: 'State',
      name: 'Auth States',
      code: `stateDiagram-v2\n    [*] --> LoggedOut\n    LoggedOut --> LoggingIn\n    LoggingIn --> LoggedIn : Success\n    LoggingIn --> LoggedOut : Failure\n    LoggedIn --> LoggedOut : Logout`
    },

    // Gantt (2)
    {
      category: 'Gantt',
      name: 'Project Roadmap',
      code: `gantt\n    title Roadmap\n    dateFormat YYYY-MM-DD\n    section Phase 1\n    Design    :a1, 2024-01-01, 14d\n    Develop   :a2, after a1, 30d\n    section Phase 2\n    Testing   :b1, after a2, 14d\n    Deploy    :b2, after b1, 7d`
    },
    {
      category: 'Gantt',
      name: 'Sprint Plan',
      code: `gantt\n    title Sprint 12\n    dateFormat YYYY-MM-DD\n    section Backend\n    API Endpoints :a1, 2024-03-01, 5d\n    Database      :a2, after a1, 3d\n    section Frontend\n    Components    :b1, 2024-03-01, 4d\n    Integration   :b2, after b1, 4d`
    },

    // Mindmap (2)
    {
      category: 'Mindmap',
      name: 'Project Goals',
      code: `mindmap\n  root((Project))\n    Performance\n      Caching\n      CDN\n    Features\n      Auth\n      Dashboard`
    },
    {
      category: 'Mindmap',
      name: 'Learning Path',
      code: `mindmap\n  root((Web Dev))\n    Frontend\n      HTML/CSS\n      JavaScript\n      React\n    Backend\n      Node.js\n      Databases\n    DevOps\n      Docker\n      CI/CD`
    },

    // Pie (2)
    {
      category: 'Pie',
      name: 'Pie Chart',
      code: `pie title Pets adopted by volunteers\n    "Dogs" : 386\n    "Cats" : 85\n    "Rats" : 15`
    },
    {
      category: 'Pie',
      name: 'Budget Split',
      code: `pie title Budget Allocation\n    "Engineering" : 45\n    "Marketing" : 25\n    "Operations" : 20\n    "Other" : 10`
    },

    // Git (2)
    {
      category: 'Git',
      name: 'Git Graph',
      code: `gitGraph\n    commit\n    commit\n    branch develop\n    checkout develop\n    commit\n    commit\n    checkout main\n    merge develop\n    commit`
    },
    {
      category: 'Git',
      name: 'Feature Branch',
      code: `gitGraph\n    commit\n    branch feature\n    commit\n    commit\n    checkout main\n    commit\n    branch hotfix\n    commit\n    checkout main\n    merge hotfix\n    merge feature\n    commit`
    },

    // Sankey (2)
    {
      category: 'Sankey',
      name: 'Energy Flow',
      code: `sankey-beta\n\nAgricultural 'waste',Bio-conversion,124.729\nBio-conversion,Liquid,0.597\nBio-conversion,Losses,26.862\nBio-conversion,Solid,280.322\nBio-conversion,Gas,81.144`
    },
    {
      category: 'Sankey',
      name: 'Traffic Flow',
      code: `sankey-beta\n\nOrganic,Homepage,300\nPaid,Homepage,200\nSocial,Homepage,150\nHomepage,Signup,400\nHomepage,Pricing,250\nSignup,Conversion,300`
    },

    // Quadrant (2)
    {
      category: 'Quadrant',
      name: 'Priority Matrix',
      code: `quadrantChart\n    title Reach and engagement\n    x-axis Low Reach --> High Reach\n    y-axis Low Engagement --> High Engagement\n    quadrant-1 We should expand\n    quadrant-2 Need to promote\n    quadrant-3 Re-evaluate\n    quadrant-4 May be improved\n    Campaign A: [0.3, 0.6]\n    Campaign B: [0.45, 0.23]\n    Campaign C: [0.57, 0.69]\n    Campaign D: [0.78, 0.34]`
    },
    {
      category: 'Quadrant',
      name: 'Skill Matrix',
      code: `quadrantChart\n    title Team Skills\n    x-axis Low Skill --> High Skill\n    y-axis Low Interest --> High Interest\n    quadrant-1 Develop\n    quadrant-2 Encourage\n    quadrant-3 Deprioritize\n    quadrant-4 Leverage\n    React: [0.8, 0.7]\n    Python: [0.5, 0.9]\n    Docker: [0.3, 0.4]\n    SQL: [0.7, 0.3]`
    },

    // C4 (2)
    {
      category: 'C4',
      name: 'C4 Context',
      code: `C4Context\n  title System Context\n  Person(user, "User", "A customer")\n  System(app, "Application", "Main system")\n  System_Ext(email, "Email", "Email service")\n  Rel(user, app, "Uses")\n  Rel(app, email, "Sends emails")`
    },
    {
      category: 'C4',
      name: 'C4 Container',
      code: `C4Context\n  title Container Diagram\n  Person(user, "User")\n  System_Boundary(b, "System") {\n    Container(web, "Web App", "React")\n    Container(api, "API", "Node.js")\n    ContainerDb(db, "Database", "PostgreSQL")\n  }\n  Rel(user, web, "Uses")\n  Rel(web, api, "Calls")\n  Rel(api, db, "Reads/Writes")`
    },

    // Architecture & Requirement
    {
      category: 'Architecture',
      name: 'Cloud Services',
      code: `architecture-beta\n  group api(cloud)[API Gateway]\n  service gateway(server)[Gateway] in api\n  service db(database)[Database] in api\n  service web(internet)[Web App]\n  web:R -- L:gateway\n  gateway:R -- L:db`
    },

    {
      category: 'Requirement',
      name: 'System Specs',
      code: `requirementDiagram\n\n    requirement test_req {\n    id: 1\n    text: the test text.\n    risk: high\n    verifymethod: test\n    }\n\n    element test_entity {\n    type: simulation\n    }\n\n    test_entity - satisfies -> test_req`
    },

    // User Journey & Timeline
    {
      category: 'Journey',
      name: 'User Experience',
      code: `journey\n    title Working Day\n    section Go to work\n      Make tea: 5: Me\n      Go downstairs: 3: Me\n      Do work: 1: Me, Cat\n    section Go home\n      Go downstairs: 5: Me\n      Sit down: 5: Me`
    },
    {
      category: 'Timeline',
      name: 'Tech History',
      code: `timeline\n    title History of Social Media\n    2002 : LinkedIn\n    2004 : Facebook\n         : Google\n    2005 : Youtube\n    2006 : Twitter`
    },

    // Charts & Network
    {
      category: 'XYChart',
      name: 'Revenue Trends',
      code: `xychart-beta\n    title "Sales Revenue"\n    x-axis [jan, feb, mar, apr, may]\n    y-axis "Revenue" 4000 --> 10000\n    bar [5000, 6000, 7500, 8200, 9500]\n    line [5000, 6000, 7500, 8200, 9500]`
    },
    {
      category: 'Block',
      name: 'Topology',
      code: `block-beta\n  columns 1\n  db(("Database"))\n  blockArrowId6<["&nbsp;&nbsp;&nbsp;"]>(down)\n  block:group1\n    columns 3\n    server1\n    server2\n    server3\n  end\n  blockArrowId6<["&nbsp;&nbsp;&nbsp;"]>(up)\n  front["Frontend"]`
    },
    {
      category: 'Packet',
      name: 'IP Header',
      code: `packet-beta\n0-3: "Version"\n4-7: "IHL"\n8-13: "DSCP"\n14-15: "ECN"\n16-31: "Total Length"\n32-47: "Identification"\n48-50: "Flags"\n51-63: "Fragment Offset"\n64-71: "Time to Live"\n72-79: "Protocol"\n80-95: "Header Checksum"\n96-127: "Source IP"\n128-159: "Dest IP"`
    }
  ];

  let searchQuery = $state('');

  const filteredTemplates = $derived(
    templates.filter(
      (t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  // Group by category
  const grouped = $derived(
    filteredTemplates.reduce(
      (acc, curr) => {
        if (!acc[curr.category]) acc[curr.category] = [];
        acc[curr.category].push(curr);
        return acc;
      },
      {} as Record<string, typeof templates>
    )
  );

  const loadTemplate = (template: (typeof templates)[0]) => {
    // Determine theme based on current diagram dark mode
    let themeConfig: Record<string, unknown>;
    try {
      const currentConfig = JSON.parse($stateStore.mermaid);
      const isDark = currentConfig.theme === 'dark';
      themeConfig = { theme: isDark ? 'dark' : 'default' };
    } catch {
      themeConfig = { theme: 'default' };
    }

    // Update code and config together
    updateCodeStore({
      code: template.code,
      mermaid: JSON.stringify(themeConfig, null, 2),
      pan: undefined,
      updateDiagram: true,
      zoom: undefined
    });
    logEvent('loadSampleDiagram', { name: template.name });
  };
</script>

<div class="flex h-full flex-col gap-4 p-4">
  <div class="relative">
    <SearchIcon class="absolute top-2.5 left-2 size-4 text-muted-foreground" />
    <Input type="text" placeholder="Search templates..." class="pl-8" bind:value={searchQuery} />
  </div>

  <div class="flex-1 space-y-6 overflow-y-auto">
    {#each Object.entries(grouped) as [category, items] (category)}
      <div class="space-y-2">
        <h3 class="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          {category}
        </h3>
        <div class="grid grid-cols-2 gap-2">
          {#each items as item (item.name)}
            <button
              class="flex flex-col items-start gap-1 rounded-lg border bg-card p-3 text-left transition-all hover:scale-[1.02] hover:bg-accent hover:text-accent-foreground hover:shadow-md focus:ring-2 focus:ring-ring focus:outline-none"
              onclick={() => loadTemplate(item)}>
              <TemplateIcon class="size-4 text-primary opacity-70" />
              <span class="text-xs leading-tight font-medium">{item.name}</span>
            </button>
          {/each}
        </div>
      </div>
    {/each}

    {#if filteredTemplates.length === 0}
      <div class="py-8 text-center text-sm text-muted-foreground">No templates found.</div>
    {/if}
  </div>
</div>

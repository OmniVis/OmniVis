import { diagramData } from '@mermaid-js/examples';
import elkLayouts from '@mermaid-js/layout-elk';
import tidyTreeLayouts from '@mermaid-js/layout-tidy-tree';
import zenuml from '@mermaid-js/mermaid-zenuml';
import type { MermaidConfig, RenderResult } from 'mermaid';
import mermaid from 'mermaid';

mermaid.registerLayoutLoaders([...elkLayouts, ...tidyTreeLayouts]);
const init = mermaid.registerExternalDiagrams([zenuml]);

export const azureIconsMap = new Map<string, { body: string; width: number; height: number }>();

const registerIconsPromise = (async () => {
  try {
    const azureIconsSvg = import.meta.glob('/static/icons/Azure_Icons/Icons/**/*.svg', {
      query: '?raw',
      import: 'default',
      eager: true
    }) as Record<string, string>;
    const azureIconsData: Record<string, any> = {};

    for (const [path, svgContent] of Object.entries(azureIconsSvg)) {
      const filename = path.split('/').pop()?.replace('.svg', '') || '';
      let iconName = filename.replace(/^\d+-icon-service-/, '').replace(/^\d+-icon-/, '');
      iconName = iconName.toLowerCase();

      const bodyMatch = svgContent.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
      if (!bodyMatch) continue;

      let width = 18,
        height = 18;
      const viewBoxMatch = svgContent.match(/viewBox="([^"]+)"/i);
      if (viewBoxMatch) {
        const parts = viewBoxMatch[1].split(/[ ,]+/);
        if (parts.length >= 4) {
          width = parseFloat(parts[2]);
          height = parseFloat(parts[3]);
        }
      } else {
        const widthMatch = svgContent.match(/width="([^"]+)"/i);
        const heightMatch = svgContent.match(/height="([^"]+)"/i);
        if (widthMatch) width = parseFloat(widthMatch[1]);
        if (heightMatch) height = parseFloat(heightMatch[1]);
      }

      azureIconsData[iconName] = { body: bodyMatch[1], width, height };
      azureIconsMap.set(`azure:${iconName}`, { body: bodyMatch[1], width, height });
    }

    mermaid.registerIconPacks([
      {
        name: 'azure',
        icons: {
          prefix: 'azure',
          icons: azureIconsData
        }
      }
    ]);

    const collectionsRes = await fetch(
      'https://raw.githubusercontent.com/iconify/icon-sets/master/collections.json'
    );
    const collections = await collectionsRes.json();

    const packs = Object.keys(collections).map((prefix) => ({
      name: prefix,
      loader: () =>
        fetch(`https://unpkg.com/@iconify-json/${prefix}@1/icons.json`).then((res) => res.json())
    }));

    mermaid.registerIconPacks(packs);
  } catch (e) {
    console.error('Failed to register icons:', e);
  }
})();

export const render = async (
  config: MermaidConfig,
  code: string,
  id: string
): Promise<RenderResult> => {
  await init;
  await registerIconsPromise;

  // Should be able to call this multiple times without any issues.
  mermaid.initialize(config);
  return await mermaid.render(id, code);
};

export const parse = async (code: string) => {
  return await mermaid.parse(code);
};

export const standardizeDiagramType = (diagramType: string) => {
  switch (diagramType) {
    case 'class':
    case 'classDiagram': {
      return 'classDiagram';
    }
    case 'graph':
    case 'flowchart':
    case 'flowchart-elk':
    case 'flowchart-v2': {
      return 'flowchart';
    }
    default: {
      return diagramType;
    }
  }
};

type DiagramDefinition = (typeof diagramData)[number];

const isValidDiagram = (diagram: DiagramDefinition): diagram is Required<DiagramDefinition> => {
  return Boolean(diagram.name && diagram.examples && diagram.examples.length > 0);
};

export const getSampleDiagrams = () => {
  const diagrams = diagramData
    .filter((d) => isValidDiagram(d))
    .map(({ examples, ...rest }) => ({
      ...rest,
      example: examples?.filter(({ isDefault }) => isDefault)[0]
    }));
  const examples: Record<string, string> = {};
  for (const diagram of diagrams) {
    examples[diagram.name.replace(/ (Diagram|Chart|Graph)/, '')] = diagram.example.code;
  }
  return examples;
};

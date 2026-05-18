// fileContent.ts — Pack/unpack mermaid config into diagram file content
// Uses %%config:{...}%% comment block (ignored by Mermaid parser)

const CONFIG_PATTERN = /\n?%%config:(.*?)%%\s*$/s;

/**
 * Packs diagram code and config into a single file string.
 * Appends %%config:{...}%% at the end if config is provided.
 */
export function packFileContent(code: string, config: string): string {
  // Strip any existing config block from code first
  const cleanCode = code.replace(CONFIG_PATTERN, '').trimEnd();

  if (!config || config === '{}') {
    return cleanCode;
  }

  // Compact the JSON to a single line for the config block
  try {
    const compactConfig = JSON.stringify(JSON.parse(config));
    return `${cleanCode}\n%%config:${compactConfig}%%`;
  } catch {
    return cleanCode;
  }
}

/**
 * Unpacks file content into code and optional config.
 * If no config block is found, returns just the code.
 */
export function unpackFileContent(content: string): { code: string; config?: string } {
  const match = content.match(CONFIG_PATTERN);

  if (!match) {
    return { code: content };
  }

  const code = content.replace(CONFIG_PATTERN, '').trimEnd();
  try {
    // Validate the config is valid JSON
    const parsed = JSON.parse(match[1]);
    const config = JSON.stringify(parsed, null, 2);
    return { code, config };
  } catch {
    return { code };
  }
}

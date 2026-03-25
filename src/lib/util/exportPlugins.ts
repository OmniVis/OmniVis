// Export Plugins — One-click export to popular dev platforms

/**
 * Wraps Mermaid code in GitHub-flavored Markdown fences.
 * Ready to paste into any GitHub README.
 */
export function exportToGitHubReadme(code: string): string {
  return '```mermaid\n' + code.trim() + '\n```';
}

/**
 * Wraps Mermaid code for Confluence wiki macro format.
 */
export function exportToConfluence(code: string): string {
  return `{code:language=mermaid}\n${code.trim()}\n{code}`;
}

/**
 * Wraps Mermaid code for Jira (uses code block notation).
 */
export function exportToJira(code: string): string {
  return `{code:title=Diagram|language=mermaid}\n${code.trim()}\n{code}`;
}

/**
 * Exports as a standalone HTML file with embedded Mermaid rendering.
 */
export function exportToHtml(code: string, title = 'Graphi Diagram'): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"><\/script>
  <style>
    body {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: #1a1a2e;
      font-family: system-ui, sans-serif;
    }
    .mermaid {
      background: #fff;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
  </style>
</head>
<body>
  <div class="mermaid">
${code.trim()}
  </div>
  <script>mermaid.initialize({ startOnLoad: true, theme: 'default' });<\/script>
</body>
</html>`;
}

/**
 * Export to GitLab (also supports Mermaid in code fences).
 */
export function exportToGitLab(code: string): string {
  return '```mermaid\n' + code.trim() + '\n```';
}

/**
 * Copies text to the clipboard.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
}

/**
 * Downloads text content as a file.
 */
export function downloadAsFile(content: string, filename: string, mimeType = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

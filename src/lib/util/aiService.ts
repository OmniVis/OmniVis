// AI Service for Text-to-Diagram generation
// Supports Gemini API (free tier) — user provides their own API key

import { MERMAID_SYNTAX } from './aiSyntax';
import { MERMAID_EXPERT_CONTEXT } from './aiContext';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface AIServiceConfig {
  apiKey: string;
  provider: 'gemini' | 'openai' | 'groq' | 'anthropic';
  model?: string;
}

const SYSTEM_PROMPT = `
${MERMAID_EXPERT_CONTEXT}

${MERMAID_SYNTAX}

# ROLE
You are a highly disciplined, technical Mermaid.js Diagramming Expert.
Your purpose is to provide standard-compliant Mermaid code with ZERO conversational fluff.

# STRICT RESPONSE RULES
1. **DIAGRAM FIRST**: Your response MUST start with the Mermaid code block immediately.
2. **NO TRIVIA**: Do not explain basic concepts (e.g., do NOT say "An ER diagram shows...").
3. **NO REDUNDANCY**: Provide exactly ONE diagram per request.
4. **SUGGEST FILENAME**: ALWAYS provide a suggested short filename (slug-style) in the format: \`[Suggested Filename: name.mmd]\` at the very end of your message.
5. **NO CONTEXT COMMENTARY**: Do not mention previous messages or analyze the user's past choices.
6. **MAXIMUM CONCISENESS**: Any textual explanation must be limited to 1 sentence after the diagram.

# SYNTAX SAFETY RULES (CRITICAL)
- ONLY use stable, well-supported diagram types: flowchart, sequenceDiagram, classDiagram, stateDiagram-v2, erDiagram, gantt, pie, gitGraph, mindmap, timeline, journey, xychart-beta, block-beta.
- Do NOT use architecture-beta, kanban, packet-beta, or other experimental types unless the user explicitly requests them.
- Do NOT use HTML tags inside node labels.
- Do NOT use special characters (parentheses, brackets, quotes) inside node labels without wrapping them in double quotes: e.g. \`A["Label (info)"]\`.
- For flowcharts, always use \`flowchart TD\` or \`flowchart LR\`, never plain \`graph\`.
- Always mentally validate your output before responding. If a construct seems unusual, use a simpler alternative.

# SYSTEM INSTRUCTIONS
1. **ANALYZE**: Identify the core intent and select the best diagram type.
2. **VERIFY**: Check the "STRICT RULES" and "COMMON HALLUCINATIONS" in the documentation above. 
3. **GENERATE**: Produce valid, modern Mermaid code.

# FORMATTING
- ALWAYS wrap Mermaid code in EXACTLY one block:
\`\`\`mermaid
<your code here>
\`\`\`
`;

function getConfig(): AIServiceConfig | null {
  const stored = localStorage.getItem('graphi-ai-config');
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function saveConfig(config: AIServiceConfig): void {
  localStorage.setItem('graphi-ai-config', JSON.stringify(config));
}

function clearConfig(): void {
  localStorage.removeItem('graphi-ai-config');
}

async function generateDiagram(
  userMessage: string,
  existingCode: string,
  history: ChatMessage[]
): Promise<string> {
  const config = getConfig();
  if (!config || !config.apiKey) {
    throw new Error('API key not configured. Please set your API key in the AI settings.');
  }

  const contextMessage = existingCode
    ? `Current diagram code:\n\`\`\`mermaid\n${existingCode}\n\`\`\`\n\nUser request: ${userMessage}`
    : userMessage;

  if (config.provider === 'gemini') {
    return callGemini(config.apiKey, contextMessage, history, config.model);
  } else if (config.provider === 'groq') {
    return callGroq(config.apiKey, contextMessage, history, config.model);
  } else if (config.provider === 'anthropic') {
    return callAnthropic(config.apiKey, contextMessage, history, config.model);
  } else {
    return callOpenAI(config.apiKey, contextMessage, history, config.model);
  }
}

async function callGemini(
  apiKey: string,
  message: string,
  history: ChatMessage[],
  model?: string
): Promise<string> {
  const modelName = model || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const contents = [
    { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
    {
      role: 'model',
      parts: [
        { text: 'Understood. I will follow instructions and wrap diagrams in ```mermaid blocks.' }
      ]
    }
  ];

  // Add conversation history
  for (const msg of history.slice(-6)) {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    });
  }

  // Add current message
  contents.push({ role: 'user', parts: [{ text: message }] });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Gemini API error: ${response.status} - ${(errorData as { error?: { message?: string } })?.error?.message || response.statusText}`
    );
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callOpenAI(
  apiKey: string,
  message: string,
  history: ChatMessage[],
  model?: string
): Promise<string> {
  const modelName = model || 'gpt-4o-mini';
  const url = 'https://api.openai.com/v1/chat/completions';

  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: SYSTEM_PROMPT }
  ];

  for (const msg of history.slice(-6)) {
    messages.push({
      content: msg.content,
      role: msg.role
    });
  }

  messages.push({ content: message, role: 'user' });

  const response = await fetch(url, {
    body: JSON.stringify({
      max_tokens: 4096,
      messages,
      model: modelName,
      temperature: 0.3
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    method: 'POST'
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `OpenAI API error: ${response.status} - ${(errorData as { error?: { message?: string } })?.error?.message || response.statusText}`
    );
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data?.choices?.[0]?.message?.content || '';
}

async function callGroq(
  apiKey: string,
  message: string,
  history: ChatMessage[],
  model?: string
): Promise<string> {
  const modelName = model || 'llama-3.3-70b-versatile';
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: SYSTEM_PROMPT }
  ];

  for (const msg of history.slice(-6)) {
    messages.push({
      content: msg.content,
      role: msg.role
    });
  }

  messages.push({ content: message, role: 'user' });

  const response = await fetch(url, {
    body: JSON.stringify({
      max_tokens: 4096,
      messages,
      model: modelName,
      temperature: 0.3
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    method: 'POST'
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Groq API error: ${response.status} - ${(errorData as { error?: { message?: string } })?.error?.message || response.statusText}`
    );
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data?.choices?.[0]?.message?.content || '';
}

async function callAnthropic(
  apiKey: string,
  message: string,
  history: ChatMessage[],
  model?: string
): Promise<string> {
  const modelName = model || 'claude-3-7-sonnet-latest';
  // Using Anthropic CORS proxy or standard endpoint if ran on backend
  // Since graphi is a static client, users must configure CORS headers on their proxy
  // or use Anthropic's browser-compatible endpoint if available.
  // For now we use the standard endpoint which may require a CORS proxy in production.
  const url = 'https://api.anthropic.com/v1/messages';

  const messages: { role: 'user' | 'assistant'; content: string }[] = [];

  for (const msg of history.slice(-6)) {
    messages.push({
      role: msg.role,
      content: msg.content
    });
  }

  messages.push({ role: 'user', content: message });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true' // Since it's a static site
    },
    body: JSON.stringify({
      max_tokens: 8192,
      messages: messages,
      model: modelName,
      system: SYSTEM_PROMPT,
      temperature: 0.3
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Anthropic API error: ${response.status} - ${(errorData as { error?: { message?: string } })?.error?.message || response.statusText}`
    );
  }

  const data = (await response.json()) as {
    content?: { text?: string }[];
  };
  return data?.content?.[0]?.text || '';
}

export { clearConfig, generateDiagram, getConfig, saveConfig };
export type { AIServiceConfig, ChatMessage };

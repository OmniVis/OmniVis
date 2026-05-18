import { Hono } from 'hono';
import type { Env } from '../types';

export const aiRoute = new Hono<{ Bindings: Env }>();

// ─── Generate slides (Slidi) ─────────────────────────────────────────────────
aiRoute.post('/generate/slides', async (c) => {
  const body = await c.req.json<{
    prompt: string;
    slide_count?: number;
    theme?: string;
    provider?: 'openai' | 'anthropic';
    openai_api_key?: string;
    anthropic_api_key?: string;
  }>();

  if (!body.prompt) return c.json({ error: 'prompt is required' }, 400);

  // Bring Your Own Key (BYOK) parsing: check Header first, then Request Body, then Env secret
  const openAiKey = c.req.header('x-openai-api-key') || body.openai_api_key || c.env.OPENAI_API_KEY;
  const anthropicKey = c.req.header('x-anthropic-api-key') || body.anthropic_api_key || c.env.ANTHROPIC_API_KEY;

  const provider = body.provider ?? (openAiKey ? 'openai' : 'anthropic');

  if (provider === 'openai') {
    if (!openAiKey) {
      return c.json({ error: 'OpenAI API key missing. Provide it in x-openai-api-key header, request body, or server environment.' }, 400);
    }
    return generateWithOpenAI(openAiKey, body.prompt, body.slide_count ?? 5, c);
  }

  if (provider === 'anthropic') {
    if (!anthropicKey) {
      return c.json({ error: 'Anthropic API key missing. Provide it in x-anthropic-api-key header, request body, or server environment.' }, 400);
    }
    return generateWithAnthropic(anthropicKey, body.prompt, body.slide_count ?? 5, c);
  }

  return c.json({ error: 'No AI provider configured or keys provided.' }, 400);
});

// ─── Generate / repair Mermaid diagram (Graphi) ──────────────────────────────
aiRoute.post('/generate/diagram', async (c) => {
  const body = await c.req.json<{
    prompt: string;
    existing_code?: string;  // For AI repair mode
    diagram_type?: string;
    provider?: 'openai' | 'anthropic';
    openai_api_key?: string;
    anthropic_api_key?: string;
  }>();

  if (!body.prompt) return c.json({ error: 'prompt is required' }, 400);

  const systemPrompt = `You are a Mermaid diagram expert. 
Return ONLY valid Mermaid diagram code, no markdown fences, no explanation.
Diagram type requested: ${body.diagram_type ?? 'auto-detect'}.
${body.existing_code ? `Existing code to fix:\n${body.existing_code}` : ''}`;

  // Bring Your Own Key (BYOK) parsing
  const openAiKey = c.req.header('x-openai-api-key') || body.openai_api_key || c.env.OPENAI_API_KEY;
  const anthropicKey = c.req.header('x-anthropic-api-key') || body.anthropic_api_key || c.env.ANTHROPIC_API_KEY;

  const provider = body.provider ?? (openAiKey ? 'openai' : 'anthropic');

  if (provider === 'openai') {
    if (!openAiKey) {
      return c.json({ error: 'OpenAI API key missing. Provide it in x-openai-api-key header, request body, or server environment.' }, 400);
    }
    const code = await callOpenAI(openAiKey, systemPrompt, body.prompt);
    return c.json({ code });
  }

  if (provider === 'anthropic') {
    if (!anthropicKey) {
      return c.json({ error: 'Anthropic API key missing. Provide it in x-anthropic-api-key header, request body, or server environment.' }, 400);
    }
    const code = await callAnthropic(anthropicKey, systemPrompt, body.prompt);
    return c.json({ code });
  }

  return c.json({ error: 'No AI provider configured or keys provided.' }, 400);
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function callOpenAI(apiKey: string, system: string, user: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_tokens: 4096,
    }),
  });

  if (!res.ok) throw new Error(`OpenAI error: ${res.statusText}`);
  const data = await res.json<{ choices: [{ message: { content: string } }] }>();
  return data.choices[0].message.content;
}

async function callAnthropic(apiKey: string, system: string, user: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic error: ${res.statusText}`);
  const data = await res.json<{ content: [{ text: string }] }>();
  return data.content[0].text;
}

async function generateWithOpenAI(
  apiKey: string,
  prompt: string,
  slideCount: number,
  c: ReturnType<typeof c_type>
) {
  const system = `You are a presentation expert. Generate ${slideCount} slides as JSON.
Return ONLY a JSON array of slides, each with: { title: string, content: string, notes?: string }
The content field should be valid HTML for the slide body.`;

  try {
    const raw = await callOpenAI(apiKey, system, prompt);
    const slides = JSON.parse(raw.replace(/```json\n?|\n?```/g, ''));
    return c.json({ slides });
  } catch (e) {
    return c.json({ error: 'Failed to parse AI response', detail: String(e) }, 500);
  }
}

async function generateWithAnthropic(
  apiKey: string,
  prompt: string,
  slideCount: number,
  c: ReturnType<typeof c_type>
) {
  const system = `You are a presentation expert. Generate ${slideCount} slides as JSON.
Return ONLY a JSON array of slides, each with: { title: string, content: string, notes?: string }
The content field should be valid HTML for the slide body.`;

  try {
    const raw = await callAnthropic(apiKey, system, prompt);
    const slides = JSON.parse(raw.replace(/```json\n?|\n?```/g, ''));
    return c.json({ slides });
  } catch (e) {
    return c.json({ error: 'Failed to parse AI response', detail: String(e) }, 500);
  }
}

// TypeScript helper to infer context type
declare function c_type(): import('hono').Context<{ Bindings: Env }>;

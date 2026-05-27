import { NextRequest, NextResponse } from 'next/server';
import { generateDatabaseContext, type UdsCommand } from '@/lib/uds-data';

// Allowlisted provider domains to prevent SSRF
const ALLOWED_DOMAINS = [
  'api.openai.com',
  'api.deepseek.com',
  'api.mistral.ai',
  'api.groq.com',
  'api.together.xyz',
  'api.fireworks.ai',
  'api.perplexity.ai',
  'api.cerebras.ai',
  'api.sambanova.ai',
  'api.ai21.com',
  'openrouter.ai',
];

function isAllowedProvider(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return ALLOWED_DOMAINS.some(
      (d) => hostname === d || hostname.endsWith('.' + d)
    );
  } catch {
    return false;
  }
}

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 20; // max requests per window

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

function generateCustomContext(commands: UdsCommand[]): string {
  if (!commands || commands.length === 0) return '';

  let ctx = '\n\nAdditionally, the user has defined these CUSTOM UDS commands:\n';
  for (const cmd of commands) {
    ctx += `\n### ${cmd.sid} - ${cmd.name}\n`;
    if (cmd.description) ctx += `${cmd.description}\n`;
    if (cmd.requestFormat) ctx += `Request: ${cmd.requestFormat}\n`;
    if (cmd.responseFormat) ctx += `Response: ${cmd.responseFormat}\n`;
    if (cmd.subFunctions.length > 0) {
      ctx += 'Sub-functions:\n';
      for (const sf of cmd.subFunctions) {
        ctx += `  - ${sf.id}: ${sf.name} - ${sf.description}\n`;
      }
    }
    if (cmd.negativeResponses.length > 0) {
      ctx += 'Negative responses:\n';
      for (const nrc of cmd.negativeResponses) {
        ctx += `  - ${nrc.code}: ${nrc.name} - ${nrc.description}\n`;
      }
    }
    if (cmd.usageNotes) ctx += `Usage: ${cmd.usageNotes}\n`;
  }
  return ctx;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before trying again.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { question, config, history, customCommands } = body;

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }

    if (!config || typeof config !== 'object') {
      return NextResponse.json(
        { error: 'Config is required' },
        { status: 400 }
      );
    }

    const baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    const token = config.token;
    const model = config.model || 'gpt-4o-mini';

    // Validate model name (prevent injection)
    if (typeof model !== 'string' || model.length > 100) {
      return NextResponse.json(
        { error: 'Invalid model name' },
        { status: 400 }
      );
    }

    // Validate history size
    if (history && (!Array.isArray(history) || history.length > 50)) {
      return NextResponse.json(
        { error: 'Invalid history: must be an array of at most 50 messages' },
        { status: 400 }
      );
    }

    // Validate customCommands size and structure
    if (customCommands) {
      if (!Array.isArray(customCommands) || customCommands.length > 200) {
        return NextResponse.json(
          { error: 'Invalid customCommands' },
          { status: 400 }
        );
      }
      for (const cmd of customCommands) {
        if (typeof cmd.sid !== 'string' || typeof cmd.name !== 'string' ||
            !Array.isArray(cmd.subFunctions) || !Array.isArray(cmd.negativeResponses)) {
          return NextResponse.json(
            { error: 'Invalid customCommands: each command must have sid (string), name (string), subFunctions (array), negativeResponses (array)' },
            { status: 400 }
          );
        }
      }
    }

    // SSRF protection: validate provider domain
    if (!isAllowedProvider(baseUrl)) {
      return NextResponse.json(
        { error: 'Provider not allowed. Please use a known AI provider or localhost.' },
        { status: 403 }
      );
    }

    const isLocal = /^(https?:\/\/)?(localhost|127\.0\.0\.1|\[::1\])/.test(baseUrl);
    if (!token && !isLocal) {
      return NextResponse.json(
        { error: 'API token is required. Please configure it in settings.' },
        { status: 400 }
      );
    }

    // Build the system prompt with full UDS context + custom commands
    const customContext = generateCustomContext(customCommands || []);

    const systemPrompt = `You are an expert UDS (Unified Diagnostic Services, ISO 14229) diagnostic assistant. You help automotive engineers and technicians understand and use UDS commands.

You have access to the complete UDS command database. Use the following reference data to answer questions accurately:

${generateDatabaseContext()}${customContext}

Guidelines for your responses:
1. Be precise with hexadecimal values, byte formats, and parameter names
2. Reference specific SIDs, sub-functions, and DIDs when relevant
3. Explain the practical usage context (when/why to use a service)
4. Mention related services and negative response codes when helpful
5. Use markdown formatting for better readability
6. If discussing hex bytes, use inline code formatting like \`0x10\`
7. When explaining message formats, break down each byte's meaning
8. Include timing considerations where relevant (P2, S3 timers)
9. For programming-related questions, mention the required session and security access
10. When the user asks about custom commands, prioritize those results. Mark custom commands with a [CUSTOM] tag.`;

    // Build messages array
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...(history || []),
      { role: 'user' as const, content: question },
    ];

    const apiUrl = baseUrl.endsWith('/')
      ? `${baseUrl}chat/completions`
      : `${baseUrl}/chat/completions`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // AbortController with 30s timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    let apiResponse: Response;
    try {
      apiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.3,
          max_tokens: 2048,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      let errorMessage = `API request failed with status ${apiResponse.status}`;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage =
          errorJson.error?.message || errorJson.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      return NextResponse.json({ error: errorMessage }, { status: 502 });
    }

    const data = await apiResponse.json();
    const answer = data.choices?.[0]?.message?.content || 'No response from AI model.';

    return NextResponse.json({ answer });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timed out after 30 seconds. The AI provider may be slow or unreachable.' },
        { status: 504 }
      );
    }
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

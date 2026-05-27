'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  Send,
  Settings,
  Loader2,
  Bot,
  User,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
  RotateCcw,
  Sparkles,
  ChevronDown,
  X,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useUdsCustomStore } from '@/lib/uds-custom-store';
import type { UdsCommand } from '@/lib/uds-data';

interface LLMConfig {
  baseUrl: string;
  token: string;
  model: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const MAX_STORED_MESSAGES = 50;

// Build system prompt for client-side (local LLM) calls
function buildSystemPrompt(dbContext: () => string, customCommands: UdsCommand[]): string {
  let customCtx = '';
  if (customCommands?.length > 0) {
    customCtx = '\n\nAdditionally, the user has defined these CUSTOM UDS commands:\n';
    for (const cmd of customCommands) {
      customCtx += `\n### ${cmd.sid} - ${cmd.name}\n`;
      if (cmd.description) customCtx += `${cmd.description}\n`;
      if (cmd.requestFormat) customCtx += `Request: ${cmd.requestFormat}\n`;
      if (cmd.responseFormat) customCtx += `Response: ${cmd.responseFormat}\n`;
    }
  }

  return `You are an expert UDS (Unified Diagnostic Services, ISO 14229) diagnostic assistant. You help automotive engineers and technicians understand and use UDS commands.

You have access to the complete UDS command database. Use the following reference data to answer questions accurately:

${dbContext()}${customCtx}

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
}

// Call a local LLM directly from the browser (avoids server proxy which can't reach user's localhost)
async function callLocalLLMDirect(
  config: LLMConfig,
  question: string,
  messages: Message[],
  customCommands: UdsCommand[],
  dbContext: () => string,
  signal: AbortSignal,
): Promise<string> {
  const apiUrl = config.baseUrl.endsWith('/')
    ? `${config.baseUrl}chat/completions`
    : `${config.baseUrl}/chat/completions`;

  const apiMessages = [
    { role: 'system' as const, content: buildSystemPrompt(dbContext, customCommands) },
    ...messages.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: question },
  ];

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.token) headers['Authorization'] = `Bearer ${config.token}`;

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: config.model,
      messages: apiMessages,
      temperature: 0.3,
      max_tokens: 2048,
    }),
    signal,
  });

  if (!res.ok) {
    const errorText = await res.text();
    let errorMsg = `Local LLM error (${res.status})`;
    try {
      const errJson = JSON.parse(errorText);
      errorMsg = errJson.error?.message || errJson.message || errorMsg;
    } catch {
      errorMsg = errorText || errorMsg;
    }
    throw new Error(errorMsg);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'No response from local LLM.';
}

const POPULAR_PROVIDERS = [
  { name: 'OpenAI', url: 'https://api.openai.com/v1' },
  { name: 'DeepSeek', url: 'https://api.deepseek.com/v1' },
  { name: 'Mistral AI', url: 'https://api.mistral.ai/v1' },
  { name: 'Groq', url: 'https://api.groq.com/openai/v1' },
  { name: 'Together AI', url: 'https://api.together.xyz/v1' },
  { name: 'Fireworks AI', url: 'https://api.fireworks.ai/inference/v1' },
  { name: 'Perplexity', url: 'https://api.perplexity.ai' },
  { name: 'Cerebras', url: 'https://api.cerebras.ai/v1' },
  { name: 'SambaNova', url: 'https://api.sambanova.ai/v1' },
  { name: 'AI21 Labs', url: 'https://api.ai21.com/studio/v1' },
  { name: 'OpenRouter', url: 'https://openrouter.ai/api/v1' },
  { name: 'Ollama (local)', url: 'http://localhost:11434/v1' },
  { name: 'LM Studio (local)', url: 'http://localhost:1234/v1' },
  { name: 'vLLM (local)', url: 'http://localhost:8000/v1' },
];

const STORAGE_KEY_MESSAGES = 'uds-chat-messages';
// Token stored in sessionStorage for security (cleared on tab close)
const SESSION_KEY_CONFIG = 'uds-llm-config';

const defaultConfig: LLMConfig = {
  baseUrl: 'https://api.openai.com/v1',
  token: '',
  model: 'gpt-4o-mini',
};

const suggestedQueries = [
  'How do I read DTCs from an ECU?',
  'What service reads the VIN?',
  'How to perform ECU flash programming?',
  'Explain the security access flow',
  'What is the difference between 0x22 and 0x2E?',
  'How to control an actuator with UDS?',
];

function loadConfig(): LLMConfig {
  if (typeof window === 'undefined') return defaultConfig;
  try {
    const saved = sessionStorage.getItem(SESSION_KEY_CONFIG);
    if (!saved) return defaultConfig;
    const parsed = JSON.parse(saved);
    if (!parsed || typeof parsed !== 'object') return defaultConfig;
    return {
      baseUrl: typeof parsed.baseUrl === 'string' ? parsed.baseUrl : defaultConfig.baseUrl,
      token: typeof parsed.token === 'string' ? parsed.token : defaultConfig.token,
      model: typeof parsed.model === 'string' ? parsed.model : defaultConfig.model,
    };
  } catch {
    return defaultConfig;
  }
}

function saveConfigToSession(config: LLMConfig) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SESSION_KEY_CONFIG, JSON.stringify(config));
  } catch {
    /* quota exceeded — silently ignore */
  }
}

export default function AISearch() {
  const [config, setConfig] = useState<LLMConfig>(loadConfig);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [providersOpen, setProvidersOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const inputValueRef = useRef(input);
  const isSendingRef = useRef(false);

  // Keep ref in sync for stable callback
  inputValueRef.current = input;

  // Hydrate messages from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MESSAGES);
      if (saved) {
        const parsed: Message[] = JSON.parse(saved);
        const restored = parsed.slice(0, MAX_STORED_MESSAGES).map((m) => ({
          ...m,
          timestamp: m.timestamp instanceof Date ? m.timestamp : new Date(m.timestamp),
        }));
        setMessages(restored);
      }
    } catch {
      /* ignore corrupt data */
    }
  }, []);

  // Save config to sessionStorage (not localStorage — tokens are sensitive)
  useEffect(() => {
    saveConfigToSession(config);
  }, [config]);

  // Debounced save messages to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const id = setTimeout(() => {
      try {
        if (messages.length > 0) {
          const capped = messages.slice(-MAX_STORED_MESSAGES);
          localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(capped));
        } else {
          localStorage.removeItem(STORAGE_KEY_MESSAGES);
        }
      } catch {
        /* quota exceeded — silently ignore */
      }
    }, 500);
    return () => clearTimeout(id);
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const saveConfig = (newConfig: LLMConfig) => {
    setConfig(newConfig);
    setSettingsOpen(false);
  };

  function isLocalhost(url: string): boolean {
    try {
      const u = new URL(url);
      return u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '[::1]';
    } catch {
      return false;
    }
  }

  const clearChat = () => {
    setMessages([]);
    setError(null);
    try {
      localStorage.removeItem(STORAGE_KEY_MESSAGES);
    } catch {
      /* ignore */
    }
  };

  const sendMessage = useCallback(
    async (query?: string) => {
      const content = query || inputValueRef.current.trim();
      if (!content || isLoading) return;

      // Request deduplication guard
      if (isSendingRef.current) return;
      isSendingRef.current = true;

      if (!config.token && !isLocalhost(config.baseUrl)) {
        setError('Please configure your API token in settings first.');
        setSettingsOpen(true);
        isSendingRef.current = false;
        return;
      }

      const userMessage: Message = {
        role: 'user',
        content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setError(null);
      setIsLoading(true);

      // Set up fetch timeout
      const controller = new AbortController();
      const fetchTimeout = setTimeout(() => controller.abort(), 30_000);

      try {
        const customCommands = useUdsCustomStore.getState().getCustomCommandsFlat();

        let answer: string;

        if (isLocalhost(config.baseUrl)) {
          const { generateDatabaseContext } = await import('@/lib/uds-data');
          try {
            answer = await callLocalLLMDirect(
              config,
              content,
              [...messages, userMessage],
              customCommands,
              generateDatabaseContext,
              controller.signal,
            );
          } catch (localErr) {
            const msg = localErr instanceof Error ? localErr.message : '';
            if (
              msg.includes('Failed to fetch') ||
              msg.includes('NetworkError') ||
              msg.includes('Load failed') ||
              msg.includes('fetch failed')
            ) {
              throw new Error(
                'Cannot reach local LLM — this app is running on a remote server. ' +
                  'Local LLMs (localhost) only work when you run the app locally with "npm run dev". ' +
                  'Alternatively, use a cloud AI provider (click Settings → browse providers).',
              );
            }
            throw localErr;
          }
        } else {
          const res = await fetch('/api/uds-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: content,
              config: {
                baseUrl: config.baseUrl,
                token: config.token,
                model: config.model,
              },
              history: messages.map((m) => ({
                role: m.role,
                content: m.content,
              })),
              customCommands,
            }),
            signal: controller.signal,
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `API request failed (${res.status})`);
          }

          const data = await res.json();
          answer = data.answer || data.message || 'No response received.';
        }

        const assistantMessage: Message = {
          role: 'assistant',
          content: answer,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          setError('Request timed out after 30 seconds. The AI provider may be slow or unreachable.');
        } else {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
          setError(errorMsg);
        }
        // Remove the user message if request failed
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        clearTimeout(fetchTimeout);
        setIsLoading(false);
        isSendingRef.current = false;
      }
    },
    [isLoading, config, messages]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-16rem)] min-h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-medium">AI-Powered UDS Search</span>
          <Badge variant="outline" className="text-[10px] h-5">
            LLM
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={clearChat}
            title="Clear chat"
            aria-label="Clear chat history"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button
                variant={config.token ? 'outline' : 'default'}
                size="sm"
                className="h-8 text-xs gap-1.5"
              >
                <Settings className="h-3.5 w-3.5" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  LLM Configuration
                </DialogTitle>
                <DialogDescription>
                  Configure your OpenAI-compatible API connection. Local LLMs (Ollama, LM Studio, vLLM) do not require a token. Your API token is stored only for this session.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="baseUrl" className="text-xs">
                      Base URL
                    </Label>
                    <Dialog open={providersOpen} onOpenChange={setProvidersOpen}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-4 w-4 p-0 text-muted-foreground hover:text-foreground" title="Browse popular providers" aria-label="Browse popular AI providers">
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-cyan-400" />
                            Popular AI Providers
                          </DialogTitle>
                          <DialogDescription>
                            Click any provider to apply its base URL to the configuration.
                          </DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="max-h-[320px] -mx-1 px-1">
                          <div className="space-y-0.5 py-1">
                            {POPULAR_PROVIDERS.map((provider) => (
                              <button
                                key={provider.name}
                                onClick={() => {
                                  setConfig((prev) => ({ ...prev, baseUrl: provider.url }));
                                  navigator.clipboard.writeText(provider.url).catch(() => {});
                                  setProvidersOpen(false);
                                }}
                                className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-md text-left hover:bg-muted/60 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{provider.name}</p>
                                  <p className="text-[11px] text-muted-foreground truncate font-mono">{provider.url}</p>
                                </div>
                                <Badge variant="outline" className="text-[10px] h-5 px-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                  Apply
                                </Badge>
                              </button>
                            ))}
                          </div>
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <Input
                    id="baseUrl"
                    placeholder="https://api.openai.com/v1"
                    value={config.baseUrl}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, baseUrl: e.target.value }))
                    }
                    className="text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    OpenAI-compatible API endpoint
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="token" className="text-xs">
                    API Token
                  </Label>
                  <div className="relative">
                    <Input
                      id="token"
                      type={showToken ? 'text' : 'password'}
                      placeholder="sk-... (leave empty for local LLMs)"
                      value={config.token}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, token: e.target.value }))
                      }
                      className="text-sm pr-9"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0.5 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setShowToken(!showToken)}
                      aria-label={showToken ? 'Hide API token' : 'Show API token'}
                    >
                      {showToken ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model" className="text-xs">
                    Model Name
                  </Label>
                  <Input
                    id="model"
                    placeholder="gpt-4o-mini"
                    value={config.model}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, model: e.target.value }))
                    }
                    className="text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setConfig(defaultConfig);
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    Reset
                  </Button>
                  <Button size="sm" onClick={() => saveConfig(config)}>
                    Save
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-lg border bg-muted/10 min-h-0"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="p-3 rounded-full bg-amber-500/10 border border-amber-500/20 mb-4">
              <Bot className="h-8 w-8 text-amber-400" />
            </div>
            <h3 className="text-sm font-medium mb-1">Ask about UDS diagnostics</h3>
            <p className="text-xs text-muted-foreground mb-4 max-w-md">
              I can help you understand UDS services, find the right command for your
              diagnostic task, and explain protocol details.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {suggestedQueries.map((q) => (
                <Button
                  key={q}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 max-w-[220px] truncate"
                  onClick={() => sendMessage(q)}
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            <AnimatePresence initial={false} presenceAffectsLayout={false}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex gap-3 p-4 ${
                    msg.role === 'user' ? 'bg-muted/20' : 'bg-background'
                  }`}
                >
                  <div
                    className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center border ${
                      msg.role === 'user'
                        ? 'bg-primary/10 border-primary/20'
                        : 'bg-amber-500/10 border-amber-500/20'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <User className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Bot className="h-3.5 w-3.5 text-amber-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-code:text-amber-400 prose-code:before:content-none prose-code:after:content-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    )}
                    <span className="text-[10px] text-muted-foreground mt-1 block">
                      {msg.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3 p-4"
              >
                <div className="h-7 w-7 rounded-full flex items-center justify-center border bg-amber-500/10 border-amber-500/20">
                  <Bot className="h-3.5 w-3.5 text-amber-400" />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Thinking...</span>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-start gap-2 mt-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span className="flex-1">{error}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 flex-shrink-0"
              onClick={() => setError(null)}
              aria-label="Dismiss error"
            >
              <X className="h-3 w-3" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="mt-3 flex gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about UDS commands, services, or diagnostics..."
          rows={1}
          className="flex-1 resize-none rounded-lg border bg-muted/40 px-3 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[40px] max-h-[120px]"
          style={{
            height: 'auto',
            overflowY: 'auto',
          }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = Math.min(target.scrollHeight, 120) + 'px';
          }}
        />
        <Button
          onClick={() => sendMessage()}
          disabled={!input.trim() || isLoading}
          className="h-auto px-4"
          aria-label="Send message"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
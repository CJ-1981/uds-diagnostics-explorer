'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, useReducedMotion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Terminal,
  Bot,
  GitBranch,
  Moon,
  Sun,
  Cpu,
  Zap,
  Loader2,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from '@/components/error-boundary';
import { useUdsCustomStore, useHydrateCustomStore } from '@/lib/uds-custom-store';

// Code-split tabs: each tab loads only when first visited
const CommandExplorer = dynamic(() => import('@/components/uds/command-explorer'), {
  loading: () => <TabLoading />,
});
const AISearch = dynamic(() => import('@/components/uds/ai-search'), {
  loading: () => <TabLoading />,
});
const ProtocolVisualizer = dynamic(() => import('@/components/uds/protocol-visualizer'), {
  loading: () => <TabLoading />,
});

function TabLoading() {
  return (
    <div className="flex items-center justify-center py-20" role="status">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

function ServiceCounter() {
  const totalCustom = useUdsCustomStore((s) =>
    s.customSets.reduce((a, set) => a + set.commands.length, 0)
  );
  return (
    <div className="hidden sm:flex items-center gap-1.5 mr-2">
      <Zap className="h-3 w-3 text-amber-400" />
      <span className="text-[10px] text-muted-foreground font-medium">
        {35 + totalCustom} Services
      </span>
    </div>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('explorer');
  const { theme, setTheme } = useTheme();
  const prefersReducedMotion = useReducedMotion();
  useHydrateCustomStore();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-violet-500/20 border border-emerald-500/20">
                <Cpu className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-sm font-bold tracking-tight">
                  UDS Command Explorer
                </h1>
                <p className="text-[10px] text-muted-foreground leading-none">
                  ISO 14229 Diagnostic Services
                </p>
              </div>
              <div className="sm:hidden">
                <h1 className="text-sm font-bold tracking-tight">UDS Explorer</h1>
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              <ServiceCounter />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex mb-6 bg-muted/60 border border-border/50 p-1 rounded-lg h-10">
            <TabsTrigger
              value="explorer"
              className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Terminal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Command Explorer</span>
              <span className="sm:hidden">Explorer</span>
            </TabsTrigger>
            <TabsTrigger
              value="ai-search"
              className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Bot className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">AI Search</span>
              <span className="sm:hidden">AI</span>
            </TabsTrigger>
            <TabsTrigger
              value="visualizer"
              className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <GitBranch className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Protocol Visualizer</span>
              <span className="sm:hidden">Protocol</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="explorer" className="mt-0">
            <ErrorBoundary>
              <motion.div
                key="explorer"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                animate={prefersReducedMotion ? false : { opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <CommandExplorer />
              </motion.div>
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="ai-search" className="mt-0">
            <ErrorBoundary>
              <motion.div
                key="ai-search"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                animate={prefersReducedMotion ? false : { opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <AISearch />
              </motion.div>
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="visualizer" className="mt-0">
            <ErrorBoundary>
              <motion.div
                key="visualizer"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                animate={prefersReducedMotion ? false : { opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <ProtocolVisualizer />
              </motion.div>
            </ErrorBoundary>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/20 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Cpu className="h-3.5 w-3.5" />
              <span>UDS Diagnostics Command Explorer</span>
            </div>
            <div className="flex items-center gap-3">
              <span>ISO 14229 Reference</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

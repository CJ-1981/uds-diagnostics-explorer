'use client';

import { memo, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Play, Square, RotateCcw, Cpu, Radio, Monitor,
  Shield, Download, RefreshCw, Timer, Activity,
  AlertTriangle, CheckCircle2, Info, FileQuestion,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getAllCommands, type UdsCommand } from '@/lib/uds-data';
import type { ByteType } from './hex-byte-display';
import { byteColorIntense, byteColorNegative } from '@/lib/uds-colors';
import {
  SEQUENCE_PRESETS,
  type SequenceStep,
  type SequencePreset,
} from '@/lib/uds-sequences';

// ──── Constants ────

const presetIcons: Record<string, typeof Shield> = {
  'security-access': Shield,
  'data-transfer': Download,
  'ecu-reset': RefreshCw,
  'session-management': Timer,
  'dtc-reading': AlertTriangle,
  'routine-control': Activity,
};

const ANIMATION_STEP_DELAY = 800; // ms between each step animation

// ──── Single-service helper ────

function buildSingleSteps(command: UdsCommand, negative: boolean): SequenceStep[] {
  const reqBytes = command.requestFormat.replace(/\[.*?\]/g, '').split(/\s+/).filter(Boolean);
  const respBytes = negative
    ? ['7F', command.sid.replace('0x', ''), '11']
    : command.responseFormat.replace(/\[.*?\]/g, '').split(/[\s]+/).filter(Boolean);

  const reqTypes: ByteType[] = reqBytes.map((_, i) =>
    i === 0 ? 'sid' : i === 1 ? 'subfunction' : 'parameter'
  );
  const respTypes: ByteType[] = respBytes.map((_, i) =>
    i === 0 ? 'sid' : i === 1 ? 'subfunction' : negative ? 'normal' : 'data'
  );

  return [
    {
      id: 'request', label: `${command.name} Request`,
      from: 'tester', to: 'ecu',
      bytes: reqBytes, byteTypes: reqTypes,
      description: command.description,
      timingMs: 50, isoTpFrame: 'SF',
    },
    {
      id: 'response',
      label: negative ? 'Service Not Supported' : `${command.name} Response`,
      from: 'ecu', to: 'tester',
      bytes: respBytes, byteTypes: respTypes,
      description: negative
        ? 'The ECU does not support this service or sub-function.'
        : `Positive response from ECU for ${command.name}.`,
      timingMs: 200, isNegative: negative, isoTpFrame: 'SF',
    },
  ];
}

// ──── Component ────

export default function ProtocolVisualizer() {
  const allCommands = getAllCommands();
  const uniqueCommands = useMemo(() => allCommands.filter(
    (cmd, i, self) => self.findIndex((c) => c.sid === cmd.sid) === i
  ), [allCommands]);

  const [presetId, setPresetId] = useState('security-access');
  const [singleSid, setSingleSid] = useState('0x22');
  const [showNegative, setShowNegative] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [visibleSteps, setVisibleSteps] = useState(0);
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);
  const prefersReducedMotion = useReducedMotion();

  const preset = SEQUENCE_PRESETS.find((p) => p.id === presetId);
  const isSingleMode = presetId === 'single';
  const selectedCommand = isSingleMode
    ? allCommands.find((c) => c.sid === singleSid) || allCommands[0]
    : null;

  const steps: SequenceStep[] = isSingleMode && selectedCommand
    ? buildSingleSteps(selectedCommand, showNegative)
    : (showNegative ? preset?.negativeSteps : preset?.successSteps) || [];

  const totalSteps = steps.length;
  const totalTiming = steps.reduce((sum, s) => sum + s.timingMs, 0);

  // Clear all timeouts
  const clearTimeouts = useCallback(() => {
    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];
  }, []);

  useEffect(() => () => clearTimeouts(), [clearTimeouts]);

  // Reset visible steps when sequence changes
  useEffect(() => {
    clearTimeouts();
    setIsPlaying(false);
    setVisibleSteps(0);
  }, [presetId, singleSid, showNegative, clearTimeouts]);

  const handlePlay = () => {
    if (isPlaying) {
      clearTimeouts();
      setIsPlaying(false);
      return;
    }

    // If already at the end, restart
    const startFrom = visibleSteps >= totalSteps ? 0 : visibleSteps;
    setIsPlaying(true);

    steps.slice(startFrom).forEach((_, idx) => {
      const t = setTimeout(() => {
        setVisibleSteps(startFrom + idx + 1);
        if (startFrom + idx + 1 >= totalSteps) {
          setIsPlaying(false);
        }
      }, (idx + 1) * ANIMATION_STEP_DELAY);
      timeoutRefs.current.push(t);
    });
  };

  const handleReset = () => {
    clearTimeouts();
    setIsPlaying(false);
    setVisibleSteps(0);
  };

  const handleStepClick = (idx: number) => {
    clearTimeouts();
    setIsPlaying(false);
    setVisibleSteps(idx + 1);
  };

  const IconComponent = presetId !== 'single' ? presetIcons[presetId] || Info : FileQuestion;

  return (
    <div className="space-y-4">
      {/* ── Controls ── */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Preset selector */}
        <div className="w-full sm:w-56">
          <Select value={presetId} onValueChange={(v) => {
            setPresetId(v);
            setShowNegative(false);
          }}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEQUENCE_PRESETS.map((p) => {
                const Icon = presetIcons[p.id] || Info;
                return (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      {p.name}
                    </span>
                  </SelectItem>
                );
              })}
              <SelectItem value="single">
                <span className="flex items-center gap-2">
                  <FileQuestion className="h-3.5 w-3.5 text-muted-foreground" />
                  Single Service
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Single service SID selector */}
        {isSingleMode && (
          <div className="flex-1 min-w-[180px]">
            <Select value={singleSid} onValueChange={setSingleSid}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {uniqueCommands.map((cmd) => (
                  <SelectItem key={cmd.sid} value={cmd.sid}>
                    <span className="font-mono text-xs">{cmd.sid}</span>
                    <span className="mx-2 text-muted-foreground">—</span>
                    <span className="text-xs">{cmd.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Play / Reset */}
        <div className="flex gap-2">
          <Button
            onClick={handlePlay}
            variant={isPlaying ? 'destructive' : 'default'}
            size="sm"
            className="gap-1.5"
          >
            {isPlaying ? (
              <><Square className="h-3.5 w-3.5" />Pause</>
            ) : (
              <><Play className="h-3.5 w-3.5" />Animate</>
            )}
          </Button>
          <Button onClick={handleReset} variant="outline" size="sm" className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />Reset
          </Button>
        </div>

        {/* Success / Negative toggle */}
        <div className="flex rounded-lg border border-border/60 overflow-hidden">
          <button
            onClick={() => setShowNegative(false)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium transition-colors',
              !showNegative
                ? 'bg-emerald-500/10 text-emerald-400 border-r border-border/60'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" />
            Success
          </button>
          <button
            onClick={() => setShowNegative(true)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium transition-colors',
              showNegative
                ? 'bg-red-500/10 text-red-400'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />
            Negative
          </button>
        </div>
      </div>

      {/* ── Preset description ── */}
      {!isSingleMode && preset && (
        <motion.div
          key={presetId}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2 p-3 rounded-lg border bg-muted/20"
        >
          <IconComponent className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">{preset.name}</p>
            <p className="text-xs text-muted-foreground">{preset.description}</p>
          </div>
          <Badge variant="outline" className="text-[10px] h-5 ml-auto flex-shrink-0">
            {steps.length} steps
          </Badge>
        </motion.div>
      )}

      {isSingleMode && selectedCommand && (
        <motion.div
          key={singleSid}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20"
        >
          <div className="flex-shrink-0 font-mono text-lg font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg">
            {selectedCommand.sid}
          </div>
          <div>
            <p className="text-sm font-medium">{selectedCommand.name}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">{selectedCommand.description}</p>
          </div>
        </motion.div>
      )}

      {/* ── Sequence Diagram ── */}
      <div className="rounded-xl border bg-muted/10 p-5 overflow-hidden">
        {/* Node Headers */}
        <div className="grid grid-cols-[80px_1fr_80px_1fr_80px] items-center gap-0 mb-1">
          <div className="flex flex-col items-center">
            <div className="p-2 rounded-lg border bg-primary/10 border-primary/20">
              <Monitor className="h-5 w-5 text-primary" />
            </div>
            <span className="text-[10px] font-semibold mt-1">Tester</span>
          </div>
          <div />
          <div className="flex flex-col items-center">
            <div className="p-2 rounded-lg border bg-amber-500/10 border-amber-500/20">
              <Radio className="h-5 w-5 text-amber-400" />
            </div>
            <span className="text-[10px] font-semibold mt-1">CAN Bus</span>
          </div>
          <div />
          <div className="flex flex-col items-center">
            <div className="p-2 rounded-lg border bg-violet-500/10 border-violet-500/20">
              <Cpu className="h-5 w-5 text-violet-400" />
            </div>
            <span className="text-[10px] font-semibold mt-1">ECU</span>
          </div>
        </div>

        {/* Lifelines + Steps */}
        <div className="relative mt-2">
          {/* Continuous lifelines */}
          <div className="absolute left-[40px] top-0 bottom-0 w-px bg-border/60" />
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/60" />
          <div className="absolute right-[40px] top-0 bottom-0 w-px bg-border/60" />

          {/* Steps */}
          <div className="space-y-0">
            {steps.map((step, idx) => {
              const isRight = step.from === 'tester'; // tester→ecu = right, ecu→tester = left
              const isVisible = idx < visibleSteps;
              const isActive = idx === visibleSteps - 1 && isPlaying;
              const isDone = idx < visibleSteps - 1 || (!isPlaying && visibleSteps > 0 && idx < visibleSteps);

              return (
                <motion.div
                  key={`${step.id}-${idx}`}
                  initial={{ opacity: 0, x: isRight ? -20 : 20 }}
                  animate={isVisible ? { opacity: 1, x: 0 } : { opacity: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className={cn(
                    'relative min-h-[72px] cursor-pointer group',
                    isActive && 'bg-primary/[0.03] rounded-lg'
                  )}
                  onClick={() => handleStepClick(idx)}
                >
                  {/* Step number badge */}
                  <div className="absolute -left-1 top-3 z-10">
                    <motion.div
                      animate={isActive ? { scale: [1, 1.2, 1] } : {}}
                      transition={{ duration: 0.4 }}
                    >
                      <span className={cn(
                        'inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold border',
                        step.isNegative
                          ? 'bg-red-500/20 text-red-400 border-red-500/30'
                          : isActive
                          ? 'bg-primary text-primary-foreground border-primary'
                          : isDone
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-muted text-muted-foreground border-border'
                      )}>
                        {idx + 1}
                      </span>
                    </motion.div>
                  </div>

                  {/* Message row — spans the full diagram width */}
                  <div className="grid grid-cols-[80px_1fr_80px_1fr_80px] items-center h-[72px] pl-4">
                    {/* Tester column — shows dot */}
                    <div className="flex justify-center relative">
                      <div className={cn(
                        'w-2.5 h-2.5 rounded-full border-2 z-10 transition-colors',
                        isVisible
                          ? step.from === 'tester'
                            ? step.isNegative ? 'bg-red-400 border-red-500' : 'bg-emerald-400 border-emerald-500'
                            : step.to === 'tester'
                            ? step.isNegative ? 'bg-red-400 border-red-500' : 'bg-amber-400 border-amber-500'
                            : 'bg-background border-border'
                          : 'bg-background border-border'
                      )} />
                    </div>

                    {/* Gap 1: Tester ↔ CAN */}
                    <div className="relative h-full flex items-center">
                      <div className={cn(
                        'absolute inset-x-2 top-1/2 h-px transition-colors',
                        isVisible
                          ? step.isNegative
                            ? 'bg-red-400/40'
                            : isRight
                            ? 'bg-emerald-400/40'
                            : 'bg-amber-400/40'
                          : 'bg-border/30'
                      )} />
                      {/* Arrow + bytes */}
                      {isVisible && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.1 }}
                          className="relative z-10 flex items-center gap-1 mx-auto"
                        >
                          {isRight && <ChevronRight className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />}
                          <div className="flex gap-0.5 flex-wrap justify-center">
                            {step.bytes.slice(0, 2).map((b, i) => (
                              <span
                                key={i}
                                className={cn(
                                  'text-[9px] font-mono font-bold px-1 py-0.5 rounded border shadow-sm',
                                  (step.isNegative ? byteColorNegative : byteColorIntense)[step.byteTypes[i] || 'normal']
                                )}
                              >
                                {b}
                              </span>
                            ))}
                            {step.bytes.length > 2 && (
                              <span className="text-[9px] font-mono text-muted-foreground/50 px-0.5">
                                +{step.bytes.length - 2}
                              </span>
                            )}
                          </div>
                          {!isRight && <ChevronRight className="h-3 w-3 text-muted-foreground/40 rotate-180 flex-shrink-0" />}
                        </motion.div>
                      )}
                    </div>

                    {/* CAN column — shows dot */}
                    <div className="flex justify-center">
                      <div className={cn(
                        'w-2 h-2 rounded-full border-2 z-10 transition-colors',
                        isVisible
                          ? step.isNegative
                            ? 'bg-red-400/60 border-red-500/60'
                            : 'bg-amber-400/60 border-amber-500/60'
                          : 'bg-background border-border'
                      )} />
                    </div>

                    {/* Gap 2: CAN ↔ ECU */}
                    <div className="relative h-full flex items-center">
                      <div className={cn(
                        'absolute inset-x-2 top-1/2 h-px transition-colors',
                        isVisible
                          ? step.isNegative
                            ? 'bg-red-400/40'
                            : isRight
                            ? 'bg-emerald-400/40'
                            : 'bg-amber-400/40'
                          : 'bg-border/30'
                      )} />
                      {isVisible && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.15 }}
                          className="relative z-10 flex items-center gap-1 mx-auto"
                        >
                          {isRight && <ChevronRight className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />}
                          <div className="flex gap-0.5 flex-wrap justify-center">
                            {step.bytes.length <= 2 ? (
                              step.bytes.map((b, i) => (
                                <span
                                  key={i}
                                  className={cn(
                                    'text-[9px] font-mono font-bold px-1 py-0.5 rounded border shadow-sm',
                                    (step.isNegative ? byteColorNegative : byteColorIntense)[step.byteTypes[i] || 'normal']
                                  )}
                                >
                                  {b}
                                </span>
                              ))
                            ) : (
                              step.bytes.slice(2).map((b, i) => (
                                <span
                                  key={i + 2}
                                  className={cn(
                                    'text-[9px] font-mono font-bold px-1 py-0.5 rounded border shadow-sm',
                                    (step.isNegative ? byteColorNegative : byteColorIntense)[step.byteTypes[i + 2] || 'normal']
                                  )}
                                >
                                  {b}
                                </span>
                              ))
                            )}
                          </div>
                          {!isRight && <ChevronRight className="h-3 w-3 text-muted-foreground/40 rotate-180 flex-shrink-0" />}
                        </motion.div>
                      )}
                    </div>

                    {/* ECU column — shows dot */}
                    <div className="flex justify-center">
                      <div className={cn(
                        'w-2.5 h-2.5 rounded-full border-2 z-10 transition-colors',
                        isVisible
                          ? step.from === 'ecu'
                            ? step.isNegative ? 'bg-red-400 border-red-500' : 'bg-violet-400 border-violet-500'
                            : step.to === 'ecu'
                            ? step.isNegative ? 'bg-red-400 border-red-500' : 'bg-emerald-400 border-emerald-500'
                            : 'bg-background border-border'
                          : 'bg-background border-border'
                      )} />
                    </div>
                  </div>

                  {/* Step description — below the row */}
                  {isVisible && (
                    <motion.div
                      initial={{ opacity: 0, y: -3 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="absolute -bottom-1 left-12 right-4 flex items-center gap-2 text-[10px] z-10"
                    >
                      <span className={cn(
                        'font-semibold',
                        step.isNegative ? 'text-red-400' : 'text-foreground'
                      )}>
                        {step.label}
                      </span>
                      <span className="text-muted-foreground/70 flex-1 truncate">
                        {step.description.slice(0, 80)}{step.description.length > 80 ? '...' : ''}
                      </span>
                      <Badge variant="outline" className={cn(
                        'text-[9px] h-4 px-1.5 flex-shrink-0 font-mono',
                        step.isNegative && 'border-red-500/30 text-red-400'
                      )}>
                        ~{step.timingMs}ms
                      </Badge>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Progress bar */}
        {totalSteps > 0 && visibleSteps > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 pt-3 border-t border-border/30"
          >
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
              <span>Progress</span>
              <span className="font-mono">
                {Math.min(visibleSteps, totalSteps)}/{totalSteps} steps — {totalTiming}ms total
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className={cn(
                  'h-full rounded-full',
                  showNegative ? 'bg-red-400' : 'bg-emerald-400'
                )}
                animate={{ width: `${(Math.min(visibleSteps, totalSteps) / totalSteps) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Step Detail Cards ── */}
      {totalSteps > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Request bytes summary */}
          <Card className="border-border/60 bg-muted/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Request Bytes
                </span>
                <Badge variant="outline" className="text-[10px] h-4">Tester → ECU</Badge>
              </div>
              <div className="flex flex-wrap gap-1 font-mono">
                {steps.filter((s) => s.from === 'tester').map((s, i) => (
                  <div key={i} className="flex flex-wrap gap-0.5">
                    {s.bytes.map((b, j) => (
                      <motion.span
                        key={j}
                        animate={i < visibleSteps ? { opacity: 1 } : { opacity: 0.3 }}
                        className={cn(
                          'text-xs font-bold px-1.5 py-0.5 rounded border',
                          (s.isNegative ? byteColorNegative : byteColorIntense)[s.byteTypes[j] || 'normal']
                        )}
                      >
                        {b}
                      </motion.span>
                    ))}
                    {i < steps.filter((s) => s.from === 'tester').length - 1 && (
                      <span className="text-muted-foreground/30 mx-1">→</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Response bytes summary */}
          <Card className="border-border/60 bg-muted/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                  Response Bytes
                </span>
                <Badge variant="outline" className="text-[10px] h-4">ECU → Tester</Badge>
              </div>
              <div className="flex flex-wrap gap-1 font-mono">
                {steps.filter((s) => s.from === 'ecu').map((s, i) => (
                  <div key={i} className="flex flex-wrap gap-0.5">
                    {s.bytes.map((b, j) => (
                      <motion.span
                        key={j}
                        animate={i < visibleSteps ? { opacity: 1 } : { opacity: 0.3 }}
                        className={cn(
                          'text-xs font-bold px-1.5 py-0.5 rounded border',
                          (s.isNegative ? byteColorNegative : byteColorIntense)[s.byteTypes[j] || 'normal']
                        )}
                      >
                        {b}
                      </motion.span>
                    ))}
                    {i < steps.filter((s) => s.from === 'ecu').length - 1 && (
                      <span className="text-muted-foreground/30 mx-1">→</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Active Step Detail ── */}
      {visibleSteps > 0 && (
        <AnimatePresence mode="wait">
          <motion.div
            key={Math.min(visibleSteps - 1, totalSteps - 1)}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
          >
            <StepDetailCard step={steps[Math.min(visibleSteps - 1, totalSteps - 1)]} stepIndex={Math.min(visibleSteps - 1, totalSteps - 1)} />
          </motion.div>
        </AnimatePresence>
      )}

      {/* ── Timing Information ── */}
      <Card className="border-border/60 bg-muted/10">
        <CardContent className="p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            ISO 14229 Timing Parameters
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'P2 Max', value: '50ms', desc: 'Default response timeout' },
              { label: 'P2* Max', value: '5000ms', desc: 'Extended response' },
              { label: 'S3 Server', value: '5000ms', desc: 'Session timeout' },
              { label: 'S3 Client', value: '4500ms', desc: 'TesterPresent interval' },
            ].map((t) => (
              <div key={t.label} className="text-center p-2 rounded-lg bg-muted/30">
                <div className="text-lg font-mono font-bold text-primary">{t.value}</div>
                <div className="text-[10px] font-semibold text-muted-foreground">{t.label}</div>
                <div className="text-[10px] text-muted-foreground/70">{t.desc}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ──── Step Detail Card ────

const StepDetailCard = memo(function StepDetailCard({ step, stepIndex }: { step: SequenceStep; stepIndex: number }) {
  return (
    <Card className={cn(
      'border transition-colors',
      step.isNegative
        ? 'border-red-500/30 bg-red-500/[0.03]'
        : 'border-primary/20 bg-primary/[0.02]'
    )}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={cn(
            'text-xs h-6 font-mono',
            step.isNegative ? 'border-red-500/30 text-red-400' : 'border-primary/30'
          )}>
            Step {stepIndex + 1}
          </Badge>
          <span className={cn(
            'font-semibold text-sm',
            step.isNegative ? 'text-red-400' : 'text-foreground'
          )}>
            {step.label}
          </span>
          <span className={cn(
            'ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full',
            step.from === 'tester'
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-violet-500/10 text-violet-400'
          )}>
            {step.from === 'tester' ? '→' : '←'} {step.from === 'tester' ? 'Request' : 'Response'}
          </span>
        </div>

        {/* Full bytes */}
        <div className="flex flex-wrap gap-1 font-mono">
          {step.bytes.map((b, i) => (
            <span
              key={i}
              className={cn(
                'text-sm font-bold px-2 py-1 rounded border',
                (step.isNegative ? byteColorNegative : byteColorIntense)[step.byteTypes[i] || 'normal']
              )}
            >
              {b}
            </span>
          ))}
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {step.description}
        </p>

        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Timer className="h-3 w-3" />
            ~{step.timingMs}ms
          </span>
          {step.isoTpFrame && (
            <span className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              {step.isoTpFrame}
            </span>
          )}
          {step.isNegative && (
            <span className="flex items-center gap-1 text-red-400">
              <AlertTriangle className="h-3 w-3" />
              Negative Response
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

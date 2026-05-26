// Shared UDS color maps — single source of truth for all components
// Groups: emerald=session, amber=data, violet=io, rose=memory, slate=security, cyan=custom

export const UDS_COLORS = ['emerald', 'amber', 'violet', 'rose', 'slate', 'cyan'] as const;
export type UdsColor = (typeof UDS_COLORS)[number];

export const gradientMap: Record<string, string> = {
  emerald: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40',
  amber: 'from-amber-500/10 to-amber-500/5 border-amber-500/20 hover:border-amber-500/40',
  violet: 'from-violet-500/10 to-violet-500/5 border-violet-500/20 hover:border-violet-500/40',
  rose: 'from-rose-500/10 to-rose-500/5 border-rose-500/20 hover:border-rose-500/40',
  slate: 'from-slate-500/10 to-slate-500/5 border-slate-500/20 hover:border-slate-500/40',
  cyan: 'from-cyan-500/10 to-cyan-500/5 border-cyan-500/20 hover:border-cyan-500/40',
};

export const accentColorMap: Record<string, string> = {
  emerald: 'text-emerald-400',
  amber: 'text-amber-400',
  violet: 'text-violet-400',
  rose: 'text-rose-400',
  slate: 'text-slate-400',
  cyan: 'text-cyan-400',
};

export const badgeBgMap: Record<string, string> = {
  emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  violet: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  rose: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  slate: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
};

export const colorTextMap: Record<string, string> = {
  emerald: 'text-emerald-400',
  amber: 'text-amber-400',
  violet: 'text-violet-400',
  rose: 'text-rose-400',
  slate: 'text-slate-400',
  cyan: 'text-cyan-400',
};

export const colorBgMap: Record<string, string> = {
  emerald: 'bg-emerald-500/10 border-emerald-500/20',
  amber: 'bg-amber-500/10 border-amber-500/20',
  violet: 'bg-violet-500/10 border-violet-500/20',
  rose: 'bg-rose-500/10 border-rose-500/20',
  slate: 'bg-slate-500/10 border-slate-500/20',
  cyan: 'bg-cyan-500/10 border-cyan-500/20',
};

// Byte color maps for hex-byte-display (soft, suitable for dark backgrounds)
export const byteColorMap: Record<string, string> = {
  sid: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  subfunction: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  parameter: 'bg-violet-500/20 text-violet-400 border-violet-500/40',
  data: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
  normal: 'bg-muted text-muted-foreground border-border',
};

// Intense byte colors for protocol visualizer diagram
export const byteColorIntense: Record<string, string> = {
  sid: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  subfunction: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  parameter: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  data: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  normal: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

// Negative response byte colors (red/orange tones)
export const byteColorNegative: Record<string, string> = {
  sid: 'bg-red-500/20 text-red-400 border-red-500/30',
  subfunction: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  parameter: 'bg-red-500/20 text-red-400 border-red-500/30',
  data: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  normal: 'bg-red-500/20 text-red-400 border-red-500/30',
};
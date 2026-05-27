'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';

export type ByteType = 'sid' | 'subfunction' | 'parameter' | 'data' | 'normal';

interface HexByteDisplayProps {
  bytes: string;
  className?: string;
  byteTypes?: ByteType[];
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

const colorMap: Record<ByteType, string> = {
  sid: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  subfunction: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  parameter: 'bg-violet-500/20 text-violet-400 border-violet-500/40',
  data: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
  normal: 'bg-muted text-muted-foreground border-border',
};

const sizeMap = {
  sm: 'text-xs px-1.5 py-0.5 min-w-[1.75rem]',
  md: 'text-sm px-2 py-1 min-w-[2.25rem]',
  lg: 'text-base px-3 py-1.5 min-w-[2.75rem] font-mono',
};

export default memo(function HexByteDisplay({
  bytes,
  className,
  byteTypes,
  label,
  size = 'md',
}: HexByteDisplayProps) {
  const byteList = bytes
    .replace(/\[|\]/g, '')
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((b) => b.toUpperCase());

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
          {label}
        </span>
      )}
      <div className="flex flex-wrap gap-1.5 items-center font-mono">
        {byteList.map((byte, i) => {
          const type = byteTypes?.[i] || 'normal';
          return (
            <span
              key={i}
              className={cn(
                'inline-flex items-center justify-center rounded border font-bold tracking-tight transition-colors',
                colorMap[type],
                sizeMap[size]
              )}
            >
              {byte}
            </span>
          );
        })}
      </div>
    </div>
  );
});

// Legend component for byte color coding
export function HexByteLegend() {
  const items: { type: ByteType; label: string }[] = [
    { type: 'sid', label: 'Service ID' },
    { type: 'subfunction', label: 'Sub-Function' },
    { type: 'parameter', label: 'Parameter' },
    { type: 'data', label: 'Data' },
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {items.map((item) => (
        <div key={item.type} className="flex items-center gap-1.5">
          <span
            className={cn(
              'inline-flex items-center justify-center rounded border text-xs font-bold',
              colorMap[item.type],
              'px-2 py-0.5'
            )}
          >
            XX
          </span>
          <span className="text-xs text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

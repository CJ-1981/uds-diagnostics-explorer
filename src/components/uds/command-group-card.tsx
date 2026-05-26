'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { UdsGroup, UdsCommand } from '@/lib/uds-data';
import { motion } from 'framer-motion';
import {
  Wifi,
  Database,
  Settings2,
  HardDrive,
  Shield,
  Star,
  ChevronDown,
  Pencil,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { gradientMap, accentColorMap, badgeBgMap } from '@/lib/uds-colors';

const iconMap: Record<string, LucideIcon> = {
  Wifi,
  Database,
  Settings2,
  HardDrive,
  Shield,
  Star,
};

interface CommandGroupCardProps {
  group: UdsGroup;
  isExpanded: boolean;
  onToggle: () => void;
  onCommandClick?: (cmd: UdsCommand) => void;
  isCustomGroup?: boolean;
  onEditCommand?: (cmd: UdsCommand) => void;
  onDeleteCommand?: (sid: string) => void;
}

function CommandGroupCard({
  group,
  isExpanded,
  onToggle,
  onCommandClick,
  isCustomGroup,
  onEditCommand,
  onDeleteCommand,
}: CommandGroupCardProps) {
  const Icon = iconMap[group.icon] || Star;

  return (
    <motion.div
      layout
      initial={false}
      className="rounded-xl border bg-gradient-to-br backdrop-blur-sm transition-colors"
      style={{
        borderColor: `var(--border)`,
      }}
    >
      {/* Card Header - Always visible */}
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-start gap-4 p-4 sm:p-5 text-left bg-gradient-to-br rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          gradientMap[group.color] || gradientMap.cyan
        )}
      >
        <div
          className={cn(
            'flex-shrink-0 p-2.5 rounded-lg border',
            badgeBgMap[group.color] || badgeBgMap.cyan
          )}
        >
          <Icon className={cn('h-5 w-5', accentColorMap[group.color] || accentColorMap.cyan)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-semibold">{group.name}</h3>
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded-full border font-medium',
                badgeBgMap[group.color] || badgeBgMap.cyan
              )}
            >
              {group.commands.length} services
            </span>
            {isCustomGroup && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                custom
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {group.description}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {group.commands.slice(0, 12).map((cmd) => (
              <span
                key={cmd.sid}
                className="text-xs font-mono px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/50"
              >
                {cmd.sid}
              </span>
            ))}
            {group.commands.length > 12 && (
              <span className="text-xs text-muted-foreground self-center">
                +{group.commands.length - 12} more
              </span>
            )}
          </div>
        </div>

        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0 mt-1"
        >
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </motion.div>
      </button>

      {/* Expanded Commands List */}
      <motion.div
        initial={false}
        animate={{
          height: isExpanded ? 'auto' : 0,
          opacity: isExpanded ? 1 : 0,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="overflow-hidden"
      >
        <div className="border-t border-border/50">
          <div className="divide-y divide-border/30">
            {group.commands.map((cmd, i) => (
              <motion.div
                key={`${group.id}-${cmd.sid}`}
                initial={{ opacity: 0, x: -10 }}
                animate={isExpanded ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
                className={cn(
                  'flex items-center gap-3 px-5 py-3 transition-colors',
                  onCommandClick ? 'cursor-pointer hover:bg-muted/30' : 'cursor-default'
                )}
                onClick={() => onCommandClick?.(cmd)}
              >
                <span
                  className={cn(
                    'text-sm font-mono font-bold min-w-[3rem] px-2 py-0.5 rounded border text-center',
                    badgeBgMap[group.color] || badgeBgMap.cyan
                  )}
                >
                  {cmd.sid}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{cmd.name}</span>
                    {isCustomGroup && (
                      <Star className="h-3 w-3 text-cyan-400 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {cmd.description}
                  </p>
                </div>
                <div className="flex-shrink-0 flex gap-1 items-center">
                  {cmd.subFunctions.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/50">
                      {cmd.subFunctions.length} sub-fn
                    </span>
                  )}
                  {/* Edit/Delete buttons for custom commands */}
                  {isCustomGroup && (onEditCommand || onDeleteCommand) && (
                    <TooltipProvider delayDuration={200}>
                      <div className="flex gap-0.5 ml-1" onClick={(e) => e.stopPropagation()}>
                        {onEditCommand && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => onEditCommand(cmd)}
                                aria-label={`Edit ${cmd.name}`}
                              >
                                <Pencil className="h-3 w-3 text-muted-foreground hover:text-cyan-400" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                        )}
                        {onDeleteCommand && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => onDeleteCommand(cmd.sid)}
                                aria-label={`Delete ${cmd.name}`}
                              >
                                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TooltipProvider>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default memo(CommandGroupCard);

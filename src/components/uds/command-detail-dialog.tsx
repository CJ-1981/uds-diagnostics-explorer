'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { UdsCommand } from '@/lib/uds-data';
import HexByteDisplay, { type ByteType, HexByteLegend } from './hex-byte-display';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Info, ArrowRightLeft, AlertTriangle, Lightbulb, Link2, Pencil, Trash2, Star, ExternalLink } from 'lucide-react';
import { udsGroups, getAllCommands } from '@/lib/uds-data';
import { colorTextMap, colorBgMap } from '@/lib/uds-colors';

interface CommandDetailDialogProps {
  command: UdsCommand | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isCustom?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onNavigateToService?: (sid: string) => void;
}

function getGroupColor(command: UdsCommand): string {
  if (command.group === 'custom') return 'cyan';
  const group = udsGroups.find((g) => g.id === command.group);
  return group?.color || 'slate';
}

const colorTextMapLocal: Record<string, string> = colorTextMap;
const colorBgMapLocal: Record<string, string> = colorBgMap;

function CommandDetailDialog({
  command,
  open,
  onOpenChange,
  isCustom,
  onEdit,
  onDelete,
  onNavigateToService,
}: CommandDetailDialogProps) {
  if (!command) return null;

  const groupColor = getGroupColor(command);

  // Parse request bytes for color coding
  const requestBytes = command.requestFormat
    .replace(/\[.*?\]/g, '')
    .split(/\s+/)
    .filter(Boolean);
  const requestTypes: ByteType[] = requestBytes.map((_, i) =>
    i === 0 ? 'sid' : i === 1 ? 'subfunction' : 'parameter'
  );

  // Parse response bytes for color coding
  const responseBytes = command.responseFormat
    .replace(/\[.*?\]/g, '')
    .split(/\s+/)
    .filter(Boolean);
  const responseTypes: ByteType[] = responseBytes.map((_, i) =>
    i === 0 ? 'sid' : i === 1 ? 'subfunction' : 'data'
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 flex flex-col max-h-[85vh] overflow-hidden">
        <DialogHeader className="p-5 pb-3 flex-shrink-0">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'flex-shrink-0 text-2xl font-mono font-bold px-3 py-1.5 rounded-lg border',
                colorBgMapLocal[groupColor],
                colorTextMapLocal[groupColor]
              )}
            >
              {command.sid}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl flex items-center gap-2">
                {command.name}
                {isCustom && (
                  <Star className="h-4 w-4 text-cyan-400" />
                )}
              </DialogTitle>
              <DialogDescription className="mt-1 line-clamp-none">
                {command.description}
              </DialogDescription>
            </div>
            {/* Edit/Delete for custom commands */}
            {isCustom && (onEdit || onDelete) && (
              <div className="flex gap-1 flex-shrink-0">
                {onEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs h-8"
                    onClick={onEdit}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs h-8 text-destructive hover:text-destructive"
                    onClick={onDelete}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        <Separator className="flex-shrink-0" />

        <div className="flex-1 overflow-y-auto px-5">
          <div className="space-y-5 py-4">
            {/* Message Formats */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Message Formats
                </h4>
              </div>

              <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                {command.requestFormat && (
                  <HexByteDisplay
                    bytes={command.requestFormat}
                    label="Request"
                    byteTypes={requestTypes}
                    size="lg"
                  />
                )}
                {command.responseFormat && (
                  <HexByteDisplay
                    bytes={command.responseFormat}
                    label="Response"
                    byteTypes={responseTypes}
                    size="lg"
                  />
                )}
                {(command.requestFormat || command.responseFormat) && (
                  <div className="pt-1">
                    <HexByteLegend />
                  </div>
                )}
              </div>
            </section>

            {/* Sub-functions */}
            {command.subFunctions.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Sub-Functions ({command.subFunctions.length})
                  </h4>
                </div>
                <div className="space-y-2">
                  {command.subFunctions.map((sf) => (
                    <div
                      key={sf.id}
                      className="flex items-start gap-2.5 p-2.5 rounded-lg border bg-muted/10 hover:bg-muted/20 transition-colors"
                    >
                      <code
                        className={cn(
                          'flex-shrink-0 text-xs font-mono font-bold px-2 py-0.5 rounded border',
                          colorBgMapLocal[groupColor],
                          colorTextMapLocal[groupColor]
                        )}
                      >
                        {sf.id}
                      </code>
                      <div className="min-w-0">
                        <span className="text-sm font-medium">{sf.name}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {sf.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Negative Response Codes */}
            {command.negativeResponses.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Negative Response Codes ({command.negativeResponses.length})
                  </h4>
                </div>
                <div className="rounded-lg border overflow-hidden">
                  <div className="max-h-60 overflow-y-auto divide-y divide-border/50">
                    {command.negativeResponses.map((nr, idx) => (
                      <div
                        key={`${nr.code}-${idx}`}
                        className="flex items-start gap-2.5 px-3 py-2 hover:bg-muted/20 transition-colors"
                      >
                        <code className="flex-shrink-0 text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          {nr.code}
                        </code>
                        <div className="min-w-0">
                          <span className="text-xs font-medium">{nr.name}</span>
                          <p className="text-xs text-muted-foreground">
                            {nr.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Related Services */}
            {command.relatedServices.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Related Services
                  </h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {command.relatedServices.map((rs) => {
                    // Extract SID from string like '0x22 ReadDataByIdentifier'
                    const match = rs.match(/^(0x[0-9A-Fa-f]+)/);
                    const sid = match ? match[1] : null;
                    const exists = sid ? getAllCommands().some((c) => c.sid === sid) : false;
                    return (
                      <Badge
                        key={rs}
                        variant="outline"
                        className={cn(
                          'font-mono text-xs cursor-pointer select-none transition-colors',
                          exists
                            ? 'hover:bg-primary/10 hover:text-primary hover:border-primary/30'
                            : 'opacity-50 cursor-default'
                        )}
                        onClick={() => {
                          if (sid && exists && onNavigateToService) {
                            onNavigateToService(sid);
                          }
                        }}
                      >
                        {rs}
                        {exists && <ExternalLink className="h-2.5 w-2.5 ml-1 opacity-50" />}
                      </Badge>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Usage Notes */}
            {command.usageNotes && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-4 w-4 text-amber-400" />
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Usage Notes
                  </h4>
                </div>
                <div className="rounded-lg border bg-amber-500/5 p-4 text-sm text-muted-foreground leading-relaxed">
                  {command.usageNotes}
                </div>
              </section>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default memo(CommandDetailDialog);

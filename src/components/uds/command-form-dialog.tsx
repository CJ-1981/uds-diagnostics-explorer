'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Save } from 'lucide-react';
import type { UdsCommand } from '@/lib/uds-data';

interface SubFunctionEntry {
  id: string;
  name: string;
  description: string;
}

interface NegativeResponseEntry {
  code: string;
  name: string;
  description: string;
}

interface CommandFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  command?: UdsCommand | null;
  onSave: (command: UdsCommand) => void;
}

const groupOptions = [
  { value: 'custom', label: 'Custom' },
  { value: 'session', label: 'Session & Communication' },
  { value: 'data', label: 'Data Access' },
  { value: 'io', label: 'I/O Control' },
  { value: 'memory', label: 'Memory & Programming' },
  { value: 'security', label: 'Security' },
];

function getInitialValues(command: UdsCommand | null | undefined) {
  return {
    sid: command?.sid ?? '0x',
    name: command?.name ?? '',
    group: command?.group ?? 'custom',
    description: command?.description ?? '',
    requestFormat: command?.requestFormat ?? '',
    responseFormat: command?.responseFormat ?? '',
    usageNotes: command?.usageNotes ?? '',
    relatedServices: command?.relatedServices.join(', ') ?? '',
    subFunctions: command?.subFunctions.map((sf) => ({ id: sf.id, name: sf.name, description: sf.description })) ?? [] as SubFunctionEntry[],
    negativeResponses: command?.negativeResponses.map((nrc) => ({ code: nrc.code, name: nrc.name, description: nrc.description })) ?? [] as NegativeResponseEntry[],
  };
}

export default function CommandFormDialog({
  open,
  onOpenChange,
  command,
  onSave,
}: CommandFormDialogProps) {
  const isEdit = !!command;

  const [sid, setSid] = useState('0x');
  const [name, setName] = useState('');
  const [group, setGroup] = useState('custom');
  const [description, setDescription] = useState('');
  const [requestFormat, setRequestFormat] = useState('');
  const [responseFormat, setResponseFormat] = useState('');
  const [usageNotes, setUsageNotes] = useState('');
  const [relatedServices, setRelatedServices] = useState('');
  const [subFunctions, setSubFunctions] = useState<SubFunctionEntry[]>([]);
  const [negativeResponses, setNegativeResponses] = useState<NegativeResponseEntry[]>([]);

  const [newSubId, setNewSubId] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [newSubDesc, setNewSubDesc] = useState('');
  const [newNrcCode, setNewNrcCode] = useState('');
  const [newNrcName, setNewNrcName] = useState('');
  const [newNrcDesc, setNewNrcDesc] = useState('');

  // Sync from command prop when dialog opens (via the open change handler)
  const syncFromCommand = useCallback((cmd: UdsCommand | null | undefined) => {
    const v = getInitialValues(cmd);
    setSid(v.sid);
    setName(v.name);
    setGroup(v.group);
    setDescription(v.description);
    setRequestFormat(v.requestFormat);
    setResponseFormat(v.responseFormat);
    setUsageNotes(v.usageNotes);
    setRelatedServices(v.relatedServices);
    setSubFunctions(v.subFunctions);
    setNegativeResponses(v.negativeResponses);
    setNewSubId('');
    setNewSubName('');
    setNewSubDesc('');
    setNewNrcCode('');
    setNewNrcName('');
    setNewNrcDesc('');
  }, []);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (newOpen) {
      syncFromCommand(command);
    }
    onOpenChange(newOpen);
  }, [command, onOpenChange, syncFromCommand]);

  const handleSave = () => {
    if (!sid.trim() || !name.trim()) return;

    const result: UdsCommand = {
      sid: sid.trim(),
      name: name.trim(),
      group,
      description: description.trim(),
      requestFormat: requestFormat.trim(),
      responseFormat: responseFormat.trim(),
      subFunctions,
      negativeResponses,
      relatedServices: relatedServices
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      usageNotes: usageNotes.trim(),
    };

    onSave(result);
    onOpenChange(false);
  };

  const addSubFunction = () => {
    if (!newSubId.trim() || !newSubName.trim()) return;
    setSubFunctions((prev) => [...prev, { id: newSubId.trim(), name: newSubName.trim(), description: newSubDesc.trim() }]);
    setNewSubId('');
    setNewSubName('');
    setNewSubDesc('');
  };

  const removeSubFunction = (index: number) => {
    setSubFunctions((prev) => prev.filter((_, i) => i !== index));
  };

  const addNrc = () => {
    if (!newNrcCode.trim() || !newNrcName.trim()) return;
    setNegativeResponses((prev) => [...prev, { code: newNrcCode.trim(), name: newNrcName.trim(), description: newNrcDesc.trim() }]);
    setNewNrcCode('');
    setNewNrcName('');
    setNewNrcDesc('');
  };

  const removeNrc = (index: number) => {
    setNegativeResponses((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? 'Edit' : 'Add'} UDS Command
          </DialogTitle>
          <DialogDescription>
            {isEdit ? 'Modify the custom UDS command details.' : 'Define a new custom UDS diagnostic command.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* SID & Name Row */}
          <div className="grid grid-cols-[140px_1fr] gap-3">
            <div>
              <Label htmlFor="cmd-sid">Service ID (SID)</Label>
              <Input
                id="cmd-sid"
                placeholder="0xF1"
                value={sid}
                onChange={(e) => setSid(e.target.value)}
                className="font-mono mt-1"
              />
            </div>
            <div>
              <Label htmlFor="cmd-name">Service Name</Label>
              <Input
                id="cmd-name"
                placeholder="e.g., CustomReadData"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Group */}
          <div>
            <Label>Group</Label>
            <Select value={group} onValueChange={setGroup}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {groupOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="cmd-desc">Description</Label>
            <Textarea
              id="cmd-desc"
              placeholder="Describe what this service does..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 resize-none"
            />
          </div>

          {/* Request/Response Format */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cmd-req">Request Format</Label>
              <Input
                id="cmd-req"
                placeholder="F1 [param1] [param2]"
                value={requestFormat}
                onChange={(e) => setRequestFormat(e.target.value)}
                className="font-mono mt-1"
              />
            </div>
            <div>
              <Label htmlFor="cmd-resp">Response Format</Label>
              <Input
                id="cmd-resp"
                placeholder="71 [param1] [param2]"
                value={responseFormat}
                onChange={(e) => setResponseFormat(e.target.value)}
                className="font-mono mt-1"
              />
            </div>
          </div>

          {/* Related Services */}
          <div>
            <Label htmlFor="cmd-related">Related Services (comma-separated)</Label>
            <Input
              id="cmd-related"
              placeholder="0x22 ReadDataByIdentifier, 0x2E WriteDataByIdentifier"
              value={relatedServices}
              onChange={(e) => setRelatedServices(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Usage Notes */}
          <div>
            <Label htmlFor="cmd-notes">Usage Notes</Label>
            <Textarea
              id="cmd-notes"
              placeholder="Any usage notes or tips..."
              value={usageNotes}
              onChange={(e) => setUsageNotes(e.target.value)}
              rows={2}
              className="mt-1 resize-none"
            />
          </div>

          {/* Sub-Functions */}
          <div className="space-y-2">
            <Label>Sub-Functions / Data Identifiers</Label>
            {subFunctions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {subFunctions.map((sf, i) => (
                  <Badge key={i} variant="outline" className="gap-1 pr-1 py-1">
                    <span className="font-mono text-[10px] text-cyan-400">{sf.id}</span>
                    <span className="text-xs">{sf.name}</span>
                    <button
                      onClick={() => removeSubFunction(i)}
                      className="ml-1 hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="grid grid-cols-[80px_1fr_1fr] gap-2">
              <Input
                placeholder="0x01"
                value={newSubId}
                onChange={(e) => setNewSubId(e.target.value)}
                className="font-mono text-xs h-8"
              />
              <Input
                placeholder="Sub-function name"
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
                className="text-xs h-8"
              />
              <div className="flex gap-1">
                <Input
                  placeholder="Description"
                  value={newSubDesc}
                  onChange={(e) => setNewSubDesc(e.target.value)}
                  className="text-xs h-8"
                  onKeyDown={(e) => e.key === 'Enter' && addSubFunction()}
                />
                <Button type="button" variant="outline" size="icon" className="h-8 w-8 flex-shrink-0" onClick={addSubFunction}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Negative Response Codes */}
          <div className="space-y-2">
            <Label>Negative Response Codes</Label>
            {negativeResponses.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {negativeResponses.map((nrc, i) => (
                  <Badge key={i} variant="outline" className="gap-1 pr-1 py-1 border-rose-500/30">
                    <span className="font-mono text-[10px] text-rose-400">{nrc.code}</span>
                    <span className="text-xs">{nrc.name}</span>
                    <button
                      onClick={() => removeNrc(i)}
                      className="ml-1 hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="grid grid-cols-[80px_1fr_1fr] gap-2">
              <Input
                placeholder="0x11"
                value={newNrcCode}
                onChange={(e) => setNewNrcCode(e.target.value)}
                className="font-mono text-xs h-8"
              />
              <Input
                placeholder="NRC name"
                value={newNrcName}
                onChange={(e) => setNewNrcName(e.target.value)}
                className="text-xs h-8"
              />
              <div className="flex gap-1">
                <Input
                  placeholder="Description"
                  value={newNrcDesc}
                  onChange={(e) => setNewNrcDesc(e.target.value)}
                  className="text-xs h-8"
                  onKeyDown={(e) => e.key === 'Enter' && addNrc()}
                />
                <Button type="button" variant="outline" size="icon" className="h-8 w-8 flex-shrink-0" onClick={addNrc}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!sid.trim() || !name.trim()}
              className="gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              {isEdit ? 'Update' : 'Add Command'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

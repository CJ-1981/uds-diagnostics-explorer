'use client';

import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileJson, CheckCircle2, AlertCircle, ClipboardPaste } from 'lucide-react';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (json: string) => { success: boolean; message: string; count?: number };
}

export default function ImportDialog({ open, onOpenChange, onImport }: ImportDialogProps) {
  const [jsonText, setJsonText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; count?: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileRead = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setJsonText(text);
      setResult(null);
    };
    reader.onerror = () => {
      setResult({ success: false, message: 'Failed to read file.' });
    };
    reader.readAsText(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        if (file.name.endsWith('.json')) {
          handleFileRead(file);
        } else {
          setResult({ success: false, message: 'Please drop a .json file.' });
        }
      }
    },
    [handleFileRead]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileRead(file);
    },
    [handleFileRead]
  );

  const handlePasteSample = () => {
    const sample = JSON.stringify(
      [
        {
          sid: '0xF1',
          name: 'CustomReadData',
          group: 'custom',
          description: 'Custom OEM-specific data read service for proprietary ECU parameters and live data streaming.',
          requestFormat: 'F1 [dataId]',
          responseFormat: '71 [dataId] [dataRecord]',
          subFunctions: [
            { id: '0x01', name: 'Read Engine Temp', description: 'Custom engine temperature reading with enhanced precision.' },
            { id: '0x02', name: 'Read Fuel Level', description: 'Fuel level sensor raw data.' },
          ],
          negativeResponses: [
            { code: '0x11', name: 'Service Not Supported', description: 'This custom service is not supported.' },
            { code: '0x31', name: 'Request Out Of Range', description: 'Data identifier not valid.' },
          ],
          relatedServices: ['0x22 ReadDataByIdentifier'],
          usageNotes: 'This is an OEM-specific service. Check the ECU documentation for supported data IDs.',
        },
      ],
      null,
      2
    );
    setJsonText(sample);
    setResult(null);
  };

  const handleImport = () => {
    if (!jsonText.trim()) {
      setResult({ success: false, message: 'Please provide JSON data.' });
      return;
    }
    const importResult = onImport(jsonText);
    setResult(importResult);
    if (importResult.success) {
      setTimeout(() => {
        setJsonText('');
        setResult(null);
        onOpenChange(false);
      }, 1500);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5 text-cyan-400" />
            Import UDS Commands
          </DialogTitle>
          <DialogDescription>
            Import custom UDS commands from a JSON file or paste JSON directly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-cyan-400 bg-cyan-500/10'
                : 'border-border/60 hover:border-cyan-400/50 hover:bg-muted/30'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileInput}
              className="hidden"
            />
            <Upload className={`h-8 w-8 mx-auto mb-2 ${isDragging ? 'text-cyan-400' : 'text-muted-foreground'}`} />
            <p className="text-sm font-medium">
              {isDragging ? 'Drop your JSON file here' : 'Drag & drop a .json file or click to browse'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Supports array of commands, single command, or full set format
            </p>
          </div>

          {/* Or separator */}
          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-border/50" />
            <span className="text-xs text-muted-foreground">or paste JSON</span>
            <div className="flex-1 border-t border-border/50" />
          </div>

          {/* Paste Area */}
          <Textarea
            placeholder={'[\n  {\n    "sid": "0xF1",\n    "name": "CustomReadData",\n    "description": "...",\n    ...\n  }\n]'}
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setResult(null);
            }}
            rows={6}
            className="font-mono text-xs resize-none"
          />

          {/* Paste sample button */}
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={handlePasteSample}>
            <ClipboardPaste className="h-3.5 w-3.5" />
            Load sample format
          </Button>

          {/* Result */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                result.success
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-destructive/10 text-destructive border border-destructive/20'
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              )}
              <span>{result.message}</span>
            </motion.div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!jsonText.trim()}
              className="gap-1.5"
            >
              <Upload className="h-3.5 w-3.5" />
              Import
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

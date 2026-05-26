'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { findCommandBySid } from '@/lib/uds-data';
import {
  Search,
  X,
  Upload,
  Download,
  Plus,
  Trash2,
  Star,
  Pencil,
  FolderOpen,
  AlertTriangle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { UdsCommand } from '@/lib/uds-data';
import CommandGroupCard from './command-group-card';
import CommandDetailDialog from './command-detail-dialog';
import CommandFormDialog from './command-form-dialog';
import ImportDialog from './import-dialog';
import { useUdsCustomStore } from '@/lib/uds-custom-store';

const categoryFilters = [
  { id: 'all', label: 'All Services' },
  { id: 'session', label: 'Session & Comm' },
  { id: 'data', label: 'Data Access' },
  { id: 'io', label: 'I/O Control' },
  { id: 'memory', label: 'Memory & Prog' },
  { id: 'security', label: 'Security' },
  { id: 'custom', label: 'Custom' },
];

export default function CommandExplorer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedCommand, setSelectedCommand] = useState<UdsCommand | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingCommand, setEditingCommand] = useState<UdsCommand | null>(null);

  const {
    customSets,
    getMergedGroups,
    addCommandToSet,
    updateCommandInSet,
    removeCommandFromSet,
    removeCustomSet,
    importFromJson,
    exportAllToJson,
    clearAllCustom,
  } = useUdsCustomStore();

  const mergedGroups = getMergedGroups();
  const hasCustomCommands = customSets.some((s) => s.commands.length > 0);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  // Filter commands based on search and category
  const filteredGroups = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return mergedGroups
      .map((group) => {
        const filteredCommands = group.commands.filter((cmd) => {
          const matchesCategory =
            activeCategory === 'all' || group.id === activeCategory;

          const matchesSearch =
            !query ||
            cmd.sid.toLowerCase().includes(query) ||
            cmd.name.toLowerCase().includes(query) ||
            cmd.description.toLowerCase().includes(query) ||
            cmd.group.toLowerCase().includes(query) ||
            cmd.subFunctions.some(
              (sf) =>
                sf.name.toLowerCase().includes(query) ||
                sf.description.toLowerCase().includes(query)
            );

          return matchesCategory && matchesSearch;
        });

        return { ...group, commands: filteredCommands };
      })
      .filter((g) => g.commands.length > 0);
  }, [searchQuery, activeCategory, mergedGroups]);

  const totalResults = filteredGroups.reduce((acc, g) => acc + g.commands.length, 0);
  const totalAll = mergedGroups.reduce((acc, g) => acc + g.commands.length, 0);

  // Find which custom set a command belongs to
  const findCustomSetForSid = useCallback(
    (sid: string) => {
      return customSets.find((s) => s.commands.some((c) => c.sid === sid));
    },
    [customSets]
  );

  const handleSaveCommand = (command: UdsCommand) => {
    if (editingCommand) {
      // Update existing custom command
      const set = findCustomSetForSid(editingCommand.sid);
      if (set) {
        updateCommandInSet(set.id, editingCommand.sid, command);
      }
      setEditingCommand(null);
    } else {
      // Add new custom command
      // Find or create a custom set
      let targetSet = customSets.find((s) => s.source === 'manual');
      if (!targetSet) {
        useUdsCustomStore.getState().addCustomSet({
          name: 'My Custom Commands',
          description: 'Manually added custom UDS commands',
          source: 'manual',
          commands: [],
        });
        const sets = useUdsCustomStore.getState().customSets;
        targetSet = sets.find((s) => s.source === 'manual')!;
      }
      addCommandToSet(targetSet.id, command);
    }
  };

  const handleEditCommand = (command: UdsCommand) => {
    const customSet = findCustomSetForSid(command.sid);
    if (customSet) {
      setEditingCommand(command);
      setShowFormDialog(true);
    }
  };

  const handleDeleteCommand = (sid: string) => {
    const set = findCustomSetForSid(sid);
    if (set) {
      removeCommandFromSet(set.id, sid);
      if (selectedCommand?.sid === sid) {
        setSelectedCommand(null);
      }
    }
  };

  const handleExport = () => {
    const json = exportAllToJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uds-custom-commands-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (json: string) => {
    return importFromJson(json);
  };

  // Check if selected command is custom
  const isCustomCommand = selectedCommand
    ? !!findCustomSetForSid(selectedCommand.sid)
    : false;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8"
                onClick={() => {
                  setEditingCommand(null);
                  setShowFormDialog(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Command
              </Button>
            </TooltipTrigger>
            <TooltipContent>Manually add a custom UDS command</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8"
                onClick={() => setShowImportDialog(true)}
              >
                <Upload className="h-3.5 w-3.5" />
                Import JSON
              </Button>
            </TooltipTrigger>
            <TooltipContent>Import commands from a JSON file</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8"
                onClick={handleExport}
                disabled={!hasCustomCommands}
              >
                <Download className="h-3.5 w-3.5" />
                Export JSON
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export all custom commands as JSON</TooltipContent>
          </Tooltip>

          {hasCustomCommands && (
            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 text-destructive hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                      Clear All
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Remove all custom commands</TooltipContent>
              </Tooltip>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    Clear All Custom Commands
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove all {customSets.reduce((a, s) => a + s.commands.length, 0)} custom commands.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      clearAllCustom();
                      setSelectedCommand(null);
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </TooltipProvider>

        {/* Custom set indicators */}
        {customSets.length > 0 && (
          <div className="flex items-center gap-1.5 ml-auto">
            <Star className="h-3 w-3 text-cyan-400" />
            <span className="text-[10px] text-muted-foreground">
              {customSets.reduce((a, s) => a + s.commands.length, 0)} custom commands
              {customSets.length > 1 && ` in ${customSets.length} sets`}
            </span>
          </div>
        )}
      </div>

      {/* Custom Sets Summary */}
      {customSets.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-2"
        >
          {customSets.map((set) => (
            <div
              key={set.id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-cyan-500/5 border border-cyan-500/15"
            >
              <FolderOpen className="h-4 w-4 text-cyan-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium truncate">{set.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    {set.commands.length}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {set.source === 'import' ? 'imported' : 'manual'}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{set.description}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => removeCustomSet(set.id)}
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by SID (e.g., 0x10), name, description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-9 h-11 bg-muted/40 border-border/60 focus:border-primary/50 text-base"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
            onClick={() => setSearchQuery('')}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {categoryFilters.map((cat) => (
          <Button
            key={cat.id}
            variant={activeCategory === cat.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory(cat.id)}
            className="text-xs h-8"
            disabled={cat.id === 'custom' && !hasCustomCommands}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Results count */}
      <div className="text-xs text-muted-foreground">
        Showing {totalResults} of {totalAll} services
      </div>

      {/* Group Cards */}
      <AnimatePresence mode="popLayout">
        <div className="space-y-3">
          {filteredGroups.map((group, i) => (
            <motion.div
              key={group.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            >
              <CommandGroupCard
                group={group}
                isExpanded={expandedGroups.has(group.id)}
                onToggle={() => toggleGroup(group.id)}
                onCommandClick={(cmd) => setSelectedCommand(cmd)}
                isCustomGroup={group.id === 'custom'}
                onEditCommand={group.id === 'custom' ? handleEditCommand : undefined}
                onDeleteCommand={group.id === 'custom' ? handleDeleteCommand : undefined}
              />
            </motion.div>
          ))}
        </div>
      </AnimatePresence>

      {filteredGroups.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12 text-muted-foreground"
        >
          <Search className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No services found matching &quot;{searchQuery}&quot;</p>
          <p className="text-xs mt-1">Try searching by SID (0x10), service name, or description</p>
        </motion.div>
      )}

      {/* Command Detail Dialog */}
      <CommandDetailDialog
        command={selectedCommand}
        open={!!selectedCommand}
        onOpenChange={(open) => !open && setSelectedCommand(null)}
        isCustom={isCustomCommand}
        onEdit={isCustomCommand ? () => {
          if (selectedCommand) handleEditCommand(selectedCommand);
        } : undefined}
        onDelete={isCustomCommand && selectedCommand ? () => {
          handleDeleteCommand(selectedCommand.sid);
        } : undefined}
        onNavigateToService={(sid) => {
          const cmd = findCommandBySid(sid);
          if (cmd) {
            setSelectedCommand(cmd);
          }
        }}
      />

      {/* Add/Edit Command Dialog */}
      <CommandFormDialog
        open={showFormDialog}
        onOpenChange={(open) => {
          setShowFormDialog(open);
          if (!open) setEditingCommand(null);
        }}
        command={editingCommand}
        onSave={handleSaveCommand}
      />

      {/* Import Dialog */}
      <ImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImport={handleImport}
      />
    </div>
  );
}

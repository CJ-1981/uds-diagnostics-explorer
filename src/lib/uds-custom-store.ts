import { create } from 'zustand';
import type { UdsCommand, UdsGroup } from './uds-data';
import { udsGroups as defaultGroups } from './uds-data';

export interface CustomUdsSet {
  id: string;
  name: string;
  description: string;
  importedAt: string;
  source: 'import' | 'manual';
  commands: UdsCommand[];
}

interface UdsCustomStore {
  customSets: CustomUdsSet[];
  addCustomSet: (set: Omit<CustomUdsSet, 'id' | 'importedAt'>) => void;
  removeCustomSet: (id: string) => void;
  updateCustomSet: (id: string, updates: Partial<CustomUdsSet>) => void;
  addCommandToSet: (setId: string, command: UdsCommand) => void;
  updateCommandInSet: (setId: string, sid: string, command: UdsCommand) => void;
  removeCommandFromSet: (setId: string, sid: string) => void;
  importFromJson: (json: string) => { success: boolean; message: string; count?: number };
  exportAllToJson: () => string;
  getMergedGroups: () => UdsGroup[];
  getCustomCommandsFlat: () => UdsCommand[];
  clearAllCustom: () => void;
}

const STORAGE_KEY = 'uds-custom-sets';

function loadFromStorage(): CustomUdsSet[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveToStorage(sets: CustomUdsSet[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
  } catch {
    // storage full or unavailable
  }
}

export const useUdsCustomStore = create<UdsCustomStore>((set, get) => ({
  customSets: [],

  addCustomSet: (setData) => {
    const newSet: CustomUdsSet = {
      ...setData,
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      importedAt: new Date().toISOString(),
    };
    set((state) => {
      const updated = [...state.customSets, newSet];
      saveToStorage(updated);
      return { customSets: updated };
    });
  },

  removeCustomSet: (id) => {
    set((state) => {
      const updated = state.customSets.filter((s) => s.id !== id);
      saveToStorage(updated);
      return { customSets: updated };
    });
  },

  updateCustomSet: (id, updates) => {
    set((state) => {
      const updated = state.customSets.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      );
      saveToStorage(updated);
      return { customSets: updated };
    });
  },

  addCommandToSet: (setId, command) => {
    set((state) => {
      const updated = state.customSets.map((s) =>
        s.id === setId
          ? { ...s, commands: [...s.commands, command] }
          : s
      );
      saveToStorage(updated);
      return { customSets: updated };
    });
  },

  updateCommandInSet: (setId, sid, command) => {
    set((state) => {
      const updated = state.customSets.map((s) =>
        s.id === setId
          ? { ...s, commands: s.commands.map((c) => (c.sid === sid ? command : c)) }
          : s
      );
      saveToStorage(updated);
      return { customSets: updated };
    });
  },

  removeCommandFromSet: (setId, sid) => {
    set((state) => {
      const updated = state.customSets.map((s) =>
        s.id === setId
          ? { ...s, commands: s.commands.filter((c) => c.sid !== sid) }
          : s
      );
      saveToStorage(updated);
      return { customSets: updated };
    });
  },

  importFromJson: (json) => {
    try {
      const parsed = JSON.parse(json);

      // Support multiple formats:
      // 1. Array of commands: [{ sid, name, ... }]
      // 2. Single command: { sid, name, ... }
      // 3. Full set: { name, description, commands: [...] }
      // 4. Array of sets: [{ name, commands: [...] }, ...]

      const commands: UdsCommand[] = [];

      if (Array.isArray(parsed)) {
        // Could be array of commands or array of sets
        const first = parsed[0];
        if (first && typeof first === 'object' && 'commands' in first) {
          // Array of sets
          for (const item of parsed) {
            if (item.commands && Array.isArray(item.commands)) {
              commands.push(...item.commands);
            }
          }
        } else {
          // Array of commands
          for (const item of parsed) {
            if (item.sid && item.name) {
              commands.push({
                sid: item.sid,
                name: item.name,
                group: item.group || 'custom',
                description: item.description || '',
                requestFormat: item.requestFormat || '',
                responseFormat: item.responseFormat || '',
                subFunctions: item.subFunctions || [],
                negativeResponses: item.negativeResponses || [],
                relatedServices: item.relatedServices || [],
                usageNotes: item.usageNotes || '',
              });
            }
          }
        }
      } else if (parsed && typeof parsed === 'object') {
        if (parsed.commands && Array.isArray(parsed.commands)) {
          // Full set
          for (const cmd of parsed.commands) {
            if (cmd.sid && cmd.name) {
              commands.push({
                sid: cmd.sid,
                name: cmd.name,
                group: cmd.group || 'custom',
                description: cmd.description || '',
                requestFormat: cmd.requestFormat || '',
                responseFormat: cmd.responseFormat || '',
                subFunctions: cmd.subFunctions || [],
                negativeResponses: cmd.negativeResponses || [],
                relatedServices: cmd.relatedServices || [],
                usageNotes: cmd.usageNotes || '',
              });
            }
          }
        } else if (parsed.sid && parsed.name) {
          // Single command
          commands.push({
            sid: parsed.sid,
            name: parsed.name,
            group: parsed.group || 'custom',
            description: parsed.description || '',
            requestFormat: parsed.requestFormat || '',
            responseFormat: parsed.responseFormat || '',
            subFunctions: parsed.subFunctions || [],
            negativeResponses: parsed.negativeResponses || [],
            relatedServices: parsed.relatedServices || [],
            usageNotes: parsed.usageNotes || '',
          });
        }
      }

      if (commands.length === 0) {
        return { success: false, message: 'No valid UDS commands found in the JSON file. Each command must have at least "sid" and "name" fields.' };
      }

      const setName = (parsed && typeof parsed === 'object' && parsed.name) || 'Imported Set';
      const setDescription = (parsed && typeof parsed === 'object' && parsed.description) || `Imported ${commands.length} custom commands`;

      get().addCustomSet({
        name: setName,
        description: setDescription,
        source: 'import',
        commands,
      });

      return { success: true, message: `Successfully imported ${commands.length} command(s) into "${setName}"`, count: commands.length };
    } catch (e) {
      return { success: false, message: `Failed to parse JSON: ${e instanceof Error ? e.message : 'Unknown error'}` };
    }
  },

  exportAllToJson: () => {
    const state = get();
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      customSets: state.customSets,
    };
    return JSON.stringify(exportData, null, 2);
  },

  getMergedGroups: () => {
    const state = get();
    const customGroup: UdsGroup = {
      id: 'custom',
      name: 'Custom Commands',
      description: `Your custom UDS command definitions (${state.customSets.reduce((acc, s) => acc + s.commands.length, 0)} commands loaded)`,
      color: 'cyan',
      icon: 'Star',
      commands: state.customSets.flatMap((s) => s.commands),
    };
    if (customGroup.commands.length === 0) return defaultGroups;
    return [...defaultGroups, customGroup];
  },

  getCustomCommandsFlat: () => {
    const state = get();
    return state.customSets.flatMap((s) => s.commands);
  },

  clearAllCustom: () => {
    saveToStorage([]);
    set({ customSets: [] });
  },
}));

// Hook to hydrate store from localStorage on client (call in app root)
let _hydrated = false;
export function useHydrateCustomStore() {
  if (typeof window !== 'undefined' && !_hydrated) {
    _hydrated = true;
    const stored = loadFromStorage();
    if (stored.length > 0) {
      useUdsCustomStore.setState({ customSets: stored });
    }
  }
}

interface DebugLogEntry {
  timestamp: string;
  component: string;
  function: string;
  message: string;
  data?: any;
  callStack?: string;
}

interface DebugLogStorage {
  logs: DebugLogEntry[];
  maxEntries: number;
  enabled: boolean;
}

export class DebugLogger {
  private static instance: DebugLogger;
  private readonly STORAGE_KEY = 'debug_logs';
  private readonly MAX_LOGS = 1000; // Keep last 1000 entries
  private enabled: boolean = true;

  public static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }

  private constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const stored = await chrome.storage.local.get(this.STORAGE_KEY);
      if (!stored[this.STORAGE_KEY]) {
        await this.createEmptyStorage();
      }
    } catch (error) {
      console.error('[DebugLogger] Error initializing:', error);
      await this.createEmptyStorage();
    }
  }

  private async createEmptyStorage(): Promise<void> {
    const emptyStorage: DebugLogStorage = {
      logs: [],
      maxEntries: this.MAX_LOGS,
      enabled: true
    };
    await chrome.storage.local.set({ [this.STORAGE_KEY]: emptyStorage });
  }

  public async log(component: string, functionName: string, message: string, data?: any): Promise<void> {
    if (!this.enabled) return;

    const entry: DebugLogEntry = {
      timestamp: new Date().toISOString(),
      component,
      function: functionName,
      message,
      data,
      callStack: new Error().stack?.split('\n').slice(2, 6).join('\n') // Skip logger frames
    };

    // Also log to console for immediate debugging
    console.log(`[DEBUG][${component}][${functionName}] ${message}:`, data || '');

    try {
      const stored = await chrome.storage.local.get(this.STORAGE_KEY);
      const logStorage: DebugLogStorage = stored[this.STORAGE_KEY] || {
        logs: [],
        maxEntries: this.MAX_LOGS,
        enabled: true
      };

      // Add new entry
      logStorage.logs.push(entry);

      // Rotate logs if we exceed max entries
      if (logStorage.logs.length > logStorage.maxEntries) {
        logStorage.logs = logStorage.logs.slice(-logStorage.maxEntries);
      }

      await chrome.storage.local.set({ [this.STORAGE_KEY]: logStorage });
    } catch (error) {
      console.error('[DebugLogger] Error storing log:', error);
    }
  }

  public async getLogs(): Promise<DebugLogEntry[]> {
    try {
      const stored = await chrome.storage.local.get(this.STORAGE_KEY);
      const logStorage: DebugLogStorage = stored[this.STORAGE_KEY];
      return logStorage?.logs || [];
    } catch (error) {
      console.error('[DebugLogger] Error retrieving logs:', error);
      return [];
    }
  }

  public async exportLogs(): Promise<string> {
    const logs = await this.getLogs();
    return JSON.stringify(logs, null, 2);
  }

  public async clearLogs(): Promise<void> {
    await this.createEmptyStorage();
    console.log('[DebugLogger] Logs cleared');
  }

  public async setEnabled(enabled: boolean): Promise<void> {
    this.enabled = enabled;
    try {
      const stored = await chrome.storage.local.get(this.STORAGE_KEY);
      const logStorage: DebugLogStorage = stored[this.STORAGE_KEY] || {
        logs: [],
        maxEntries: this.MAX_LOGS,
        enabled: true
      };
      logStorage.enabled = enabled;
      await chrome.storage.local.set({ [this.STORAGE_KEY]: logStorage });
    } catch (error) {
      console.error('[DebugLogger] Error updating enabled state:', error);
    }
  }

  public async getLogStats(): Promise<{ count: number; oldestLog?: string; newestLog?: string }> {
    const logs = await this.getLogs();
    return {
      count: logs.length,
      oldestLog: logs[0]?.timestamp,
      newestLog: logs[logs.length - 1]?.timestamp
    };
  }
}

// Create singleton instance
export const debugLogger = DebugLogger.getInstance();
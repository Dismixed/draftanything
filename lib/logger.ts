export interface LogEntry {
  timestamp?: string;
  requestId: string;
  action: string;
  result: string;
  durationMs: number;
  draftId?: string;
  providerLatencyMs?: number;
}

export function logRoute(entry: LogEntry): void {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), ...entry }));
}

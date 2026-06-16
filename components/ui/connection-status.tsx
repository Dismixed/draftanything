"use client";

type ConnectionState = "connected" | "reconnecting" | "disconnected";

interface ConnectionStatusProps {
  state: ConnectionState;
}

const STATE_CONFIG: Record<ConnectionState, { label: string; dotClass: string }> = {
  connected: { label: "Connected", dotClass: "bg-green-500" },
  reconnecting: { label: "Reconnecting…", dotClass: "bg-amber-500 animate-pulse" },
  disconnected: { label: "Disconnected", dotClass: "bg-red-500" },
};

export function ConnectionStatus({ state }: ConnectionStatusProps) {
  const config = STATE_CONFIG[state];

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <span className={`inline-block w-2 h-2 rounded-full ${config.dotClass}`} />
      <span>{config.label}</span>
    </div>
  );
}

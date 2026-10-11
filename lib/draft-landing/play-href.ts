export const PLAY_PATH = "/draft-anything/play";
export const TOPIC_MAX = 80;

export type PlayTab = "create" | "join" | "solo";

export interface PlayParams {
  tab: PlayTab;
  topic: string;
  code: string;
}

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export function playHref(options: { tab?: PlayTab; topic?: string; code?: string } = {}): string {
  const query = new URLSearchParams();
  if (options.code) query.set("code", options.code.trim().toUpperCase());
  else if (options.tab === "join" || options.tab === "solo") query.set("tab", options.tab);
  if (options.topic) query.set("topic", options.topic);
  const text = query.toString();
  return text ? `${PLAY_PATH}?${text}` : PLAY_PATH;
}

export function parsePlayParams(params: Record<string, string | string[] | undefined>): PlayParams {
  const code = first(params.code).trim().toUpperCase();
  const topic = first(params.topic).trim().slice(0, TOPIC_MAX).trim();
  const requested = first(params.tab);
  const tab: PlayTab =
    code || requested === "join" ? "join" : requested === "solo" ? "solo" : "create";
  return { tab, topic, code };
}

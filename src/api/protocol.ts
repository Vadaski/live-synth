export interface AgentStateSnapshot {
  playing: boolean;
  bpm: number;
  scale: string;
  tracks: string[];
  effects: string[];
}

export type AgentRequest =
  | { type: "play"; code: string }
  | { type: "stop" }
  | { type: "set-bpm"; bpm: number }
  | { type: "add-track"; name: string; trackType: string; pattern: string }
  | { type: "remove-track"; name: string }
  | { type: "add-effect"; name: string; params: number[] }
  | { type: "clear-effects" }
  | { type: "get-state" }
  | { type: "eval"; code: string }
  | { type: "generate"; prompt: string };

export type AgentResponse =
  | { type: "ok"; data?: unknown }
  | { type: "error"; message: string }
  | { type: "state"; state: AgentStateSnapshot }
  | { type: "beat"; beat: number }
  | { type: "note"; note: string };

export function isAgentRequest(input: unknown): input is AgentRequest {
  if (!input || typeof input !== "object") return false;
  const type = (input as { type?: unknown }).type;
  return (
    type === "play" ||
    type === "stop" ||
    type === "set-bpm" ||
    type === "add-track" ||
    type === "remove-track" ||
    type === "add-effect" ||
    type === "clear-effects" ||
    type === "get-state" ||
    type === "eval" ||
    type === "generate"
  );
}

export function toError(message: string): AgentResponse {
  return { type: "error", message };
}

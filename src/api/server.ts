import {
  generateArpPattern,
  generateBassline,
  generateChordProgression,
  generateDrumPattern,
} from "./dsl-generator.js";
import { LiveSynthAgent, type TrackType } from "./index.js";
import { type AgentRequest, type AgentResponse, isAgentRequest, toError } from "./protocol.js";

type WsMessage = unknown;
interface WsSocket {
  readyState?: number;
  send(data: string): void;
  close(): void;
  on(event: "message" | "close" | "error", listener: (...args: WsMessage[]) => void): void;
}
interface WsServer {
  on(event: "connection", listener: (socket: WsSocket) => void): void;
  close(callback?: () => void): void;
}
type WsServerCtor = new (options: { port: number }) => WsServer;

export interface LiveSynthAgentServerOptions {
  port?: number;
  agent?: LiveSynthAgent;
  WebSocketServer?: WsServerCtor;
}

const TRACK_TYPES = new Set<TrackType>(["synth", "bass", "drum", "pad", "lead"]);

export class LiveSynthAgentServer {
  readonly port: number;
  readonly agent: LiveSynthAgent;
  private server: WsServer | null = null;
  private clients = new Set<WsSocket>();
  private readonly wsCtor?: WsServerCtor;

  constructor(options: LiveSynthAgentServerOptions = {}) {
    this.port = options.port ?? 7070;
    this.agent = options.agent ?? new LiveSynthAgent();
    this.wsCtor = options.WebSocketServer;
    this.agent.onBeat((beat) => this.broadcast({ type: "beat", beat }));
    this.agent.onNote((note) => this.broadcast({ type: "note", note }));
  }

  async start(): Promise<void> {
    if (this.server) return;
    const Ctor = this.wsCtor ?? ((await this.importWs()).WebSocketServer as WsServerCtor);
    this.server = new Ctor({ port: this.port });
    this.server.on("connection", (socket) => this.attachClient(socket));
  }

  stop(): void {
    for (const client of this.clients) client.close();
    this.clients.clear();
    this.server?.close();
    this.server = null;
  }

  private async importWs(): Promise<Record<string, unknown>> {
    try {
      const importer = new Function("m", "return import(m)") as (
        m: string,
      ) => Promise<Record<string, unknown>>;
      return await importer("ws");
    } catch {
      throw new Error(
        "WebSocket server unavailable. Install `ws` or pass WebSocketServer in options.",
      );
    }
  }

  private attachClient(socket: WsSocket): void {
    this.clients.add(socket);
    this.send(socket, { type: "state", state: this.agent.getState() });
    socket.on("close", () => this.clients.delete(socket));
    socket.on("error", () => this.clients.delete(socket));
    socket.on("message", (...args) => void this.onMessage(socket, args[0]));
  }

  private async onMessage(socket: WsSocket, raw: WsMessage): Promise<void> {
    const text =
      typeof raw === "string"
        ? raw
        : raw && typeof (raw as { toString?: () => string }).toString === "function"
          ? (raw as { toString: () => string }).toString()
          : "";
    if (!text) return this.send(socket, toError("Empty message"));
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return this.send(socket, toError("Invalid JSON payload"));
    }
    if (!isAgentRequest(data)) return this.send(socket, toError("Unknown request type"));
    try {
      this.send(socket, await this.handleRequest(data));
    } catch (error) {
      this.send(socket, toError(error instanceof Error ? error.message : "Request failed"));
    }
  }

  private async handleRequest(request: AgentRequest): Promise<AgentResponse> {
    if (request.type === "play" || request.type === "eval") {
      await this.agent.play(request.code);
      return { type: "ok" };
    }
    if (request.type === "stop") {
      this.agent.stop();
      return { type: "ok" };
    }
    if (request.type === "set-bpm") {
      this.agent.setBpm(request.bpm);
      return { type: "ok" };
    }
    if (request.type === "add-track") {
      if (!TRACK_TYPES.has(request.trackType as TrackType))
        return toError(`Invalid track type: ${request.trackType}`);
      this.agent.addTrack(request.name, request.trackType as TrackType, request.pattern);
      return { type: "ok" };
    }
    if (request.type === "remove-track") {
      this.agent.removeTrack(request.name);
      return { type: "ok" };
    }
    if (request.type === "add-effect") {
      this.agent.addEffect(request.name, ...request.params);
      return { type: "ok" };
    }
    if (request.type === "clear-effects") {
      this.agent.clearEffects();
      return { type: "ok" };
    }
    if (request.type === "get-state") return { type: "state", state: this.agent.getState() };
    if (request.type === "generate")
      return { type: "ok", data: { code: generateFromPrompt(request.prompt) } };
    return toError("Unsupported request");
  }

  private send(socket: WsSocket, message: AgentResponse): void {
    const open = socket.readyState === undefined || socket.readyState === 1;
    if (open) socket.send(JSON.stringify(message));
  }

  private broadcast(message: AgentResponse): void {
    for (const client of this.clients) this.send(client, message);
  }
}

export async function startAgentServer(
  options: LiveSynthAgentServerOptions = {},
): Promise<LiveSynthAgentServer> {
  const server = new LiveSynthAgentServer(options);
  await server.start();
  return server;
}

function generateFromPrompt(prompt: string): string {
  const text = prompt.toLowerCase();
  const style =
    (["house", "dnb", "hiphop", "rock", "jazz", "techno", "latin"] as const).find((s) =>
      text.includes(s),
    ) ?? "house";
  const mode = text.includes("major") ? "major" : "minor";
  const root = text.match(/\b([a-g](?:#|b)?\d)\b/i)?.[1]?.toUpperCase() ?? "C4";
  const progression = mode === "major" ? "I-vi-IV-V" : "i-iv-v";
  const bassStyle = text.includes("walking")
    ? "walking"
    : text.includes("minimal")
      ? "minimal"
      : "arpeggiated";
  const drums = generateDrumPattern(style);
  const bass = generateBassline(mode, root, bassStyle);
  const chords = generateChordProgression(mode, root, progression);
  const arp = generateArpPattern(
    chords
      .split(/\s+/)
      .filter((n) => n !== ".")
      .slice(0, 4)
      .join(" "),
    "updown",
  );
  return `bpm 120
scale ${mode} ${root}

kick ${drums}

bass sine
  ${bass}

synth triangle
  ${chords}

synth square
  ${arp}`;
}

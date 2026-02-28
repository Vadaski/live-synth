#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import * as readline from "node:readline";
import { LiveSynthAgent, type TrackType } from "../src/api/index.js";
import { PRESETS } from "../src/app/presets.js";
import type { AgentRequest } from "../src/api/protocol.js";

type WsLike = {
  send(data: string): void;
  close(): void;
  addEventListener?: (event: string, listener: (ev: unknown) => void) => void;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  onopen?: () => void;
  onmessage?: (ev: { data: unknown }) => void;
  onerror?: (ev: unknown) => void;
  onclose?: () => void;
};

const color = {
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  gray: (s: string) => `\x1b[90m${s}\x1b[0m`,
};

const agent = new LiveSynthAgent();
const TRACK_TYPES = new Set<TrackType>(["synth", "bass", "drum", "pad", "lead"]);
const [command = "", ...args] = process.argv.slice(2);

void main().catch((error) => {
  process.exitCode = 1;
  console.error(color.red(`error: ${error instanceof Error ? error.message : String(error)}`));
});

async function main(): Promise<void> {
  if (!command || command === "help") return usage(0);
  if (command === "ws-connect") return wsConnect(args[0]);
  if (command === "play") return playCode(readCodeArg(args));
  if (command === "stop") return (agent.stop(), ok("stopped"));
  if (command === "bpm") return setBpm(args[0]);
  if (command === "scale") return setScale(args[0], args[1]);
  if (command === "track") return trackCmd(args);
  if (command === "fx") return fxCmd(args);
  if (command === "state") return print(agent.getState());
  if (command === "demo") return playDemo(args);
  if (command === "export") return console.log(agent.toCode());
  if (command === "eval") return playCode((args.join(" ").trim() || (await readStdin())).trim());
  return usage(1);
}

function usage(code: number): void {
  console.log(`${color.cyan("Usage:")} npx tsx scripts/synth-cli.ts <command> [args]
  play <code-or-file>
  stop
  bpm <value>
  scale <mode> <root>
  track add <name> <type> <pattern>
  track rm <name>
  fx add <name> [...params]
  fx clear
  state
  demo <preset-name>
  export
  eval <dsl>
  ws-connect <url>`);
  process.exitCode = code;
}

function readCodeArg(parts: string[]): string {
  const input = parts.join(" ").trim();
  if (!input) throw new Error("missing DSL code or file path");
  return existsSync(input) ? readFileSync(input, "utf8") : input;
}

async function playCode(code: string): Promise<void> {
  if (!code) throw new Error("empty DSL input");
  await agent.play(code);
  ok("playing");
}

function setBpm(raw: string | undefined): void {
  const bpm = Number(raw);
  if (Number.isNaN(bpm)) throw new Error("bpm must be a number");
  agent.setBpm(bpm);
  ok(`bpm ${bpm}`);
}

function setScale(mode: string | undefined, root: string | undefined): void {
  if (!mode || !root) throw new Error("usage: scale <mode> <root>");
  agent.setScale(mode, root);
  ok(`scale ${mode} ${root}`);
}

function trackCmd(parts: string[]): void {
  const [action, name, type, ...pattern] = parts;
  if (action === "rm") return (name ? agent.removeTrack(name) : fail("usage: track rm <name>"), ok(`track removed: ${name}`));
  if (action !== "add" || !name || !type || pattern.length === 0) fail("usage: track add <name> <type> <pattern>");
  if (!TRACK_TYPES.has(type as TrackType)) fail(`invalid track type: ${type}`);
  agent.addTrack(name, type as TrackType, pattern.join(" "));
  ok(`track added: ${name}`);
}

function fxCmd(parts: string[]): void {
  const [action, name, ...params] = parts;
  if (action === "clear") return (agent.clearEffects(), ok("effects cleared"));
  if (action !== "add" || !name) fail("usage: fx add <name> [...params]");
  agent.addEffect(name, ...params.map((p) => Number(p)).filter((n) => !Number.isNaN(n)));
  ok(`effect added: ${name}`);
}

async function playDemo(parts: string[]): Promise<void> {
  const query = slug(parts.join(" "));
  if (!query) throw new Error("usage: demo <preset-name>");
  const preset = PRESETS.find((p) => slug(p.name) === query || slug(p.name).includes(query));
  if (!preset) throw new Error(`preset not found: ${parts.join(" ")}`);
  await agent.play(preset.code);
  ok(`demo loaded: ${preset.name}`);
}

async function wsConnect(url: string | undefined): Promise<void> {
  if (!url) throw new Error("usage: ws-connect <url>");
  const WsCtor = await getWebSocketCtor();
  const ws = new WsCtor(url);
  onWs(ws, "open", () => console.log(color.green(`connected ${url}`)));
  onWs(ws, "message", (data) => printRemote(data));
  onWs(ws, "error", () => console.error(color.red("websocket error")));
  if (!process.stdin.isTTY) {
    const line = (await readStdin()).trim();
    if (line) ws.send(JSON.stringify(toRequest(line)));
    return setTimeout(() => ws.close(), 200);
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: color.gray("synth> ") });
  rl.prompt();
  rl.on("line", (line) => { if (line.trim()) ws.send(JSON.stringify(toRequest(line))); rl.prompt(); });
  await new Promise<void>((resolve) => rl.on("close", () => (ws.close(), resolve())));
}

async function getWebSocketCtor(): Promise<new (url: string) => WsLike> {
  if (typeof WebSocket !== "undefined") return WebSocket as unknown as new (url: string) => WsLike;
  const importer = new Function("m", "return import(m)") as (m: string) => Promise<Record<string, unknown>>;
  const mod = await importer("ws");
  const ctor = (mod.WebSocket ?? mod.default) as (new (url: string) => WsLike) | undefined;
  if (!ctor) throw new Error("No WebSocket client found (install `ws`)");
  return ctor;
}

function onWs(ws: WsLike, event: "open" | "message" | "error" | "close", cb: (data?: unknown) => void): void {
  if (ws.addEventListener) return ws.addEventListener(event, (ev) => cb((ev as { data?: unknown }).data ?? ev));
  if (ws.on) return ws.on(event, (...args) => cb(args[0]));
  (ws as WsLike & Record<string, unknown>)[`on${event}`] = (ev: unknown) => cb((ev as { data?: unknown }).data ?? ev);
}

function toRequest(line: string): AgentRequest {
  const [cmd, ...rest] = line.trim().split(/\s+/);
  if (cmd === "stop") return { type: "stop" };
  if (cmd === "state") return { type: "get-state" };
  if (cmd === "bpm") return { type: "set-bpm", bpm: Number(rest[0] ?? 120) };
  if (cmd === "track" && rest[0] === "add") return { type: "add-track", name: rest[1], trackType: rest[2], pattern: rest.slice(3).join(" ") };
  if (cmd === "track" && rest[0] === "rm") return { type: "remove-track", name: rest[1] };
  if (cmd === "fx" && rest[0] === "clear") return { type: "clear-effects" };
  if (cmd === "fx" && rest[0] === "add") return { type: "add-effect", name: rest[1], params: rest.slice(2).map(Number).filter((n) => !Number.isNaN(n)) };
  if (cmd === "play") return { type: "play", code: rest.join(" ") };
  return { type: "eval", code: line };
}

function printRemote(data: unknown): void {
  const text = typeof data === "string" ? data : data && typeof (data as { toString?: () => string }).toString === "function" ? (data as { toString: () => string }).toString() : "";
  try {
    const parsed = JSON.parse(text) as { type?: string; message?: string; data?: unknown; state?: unknown };
    if (parsed.type === "error") return console.error(color.red(parsed.message ?? "error"));
    if (parsed.type === "beat") return console.log(color.gray(`beat ${(parsed as { beat?: number }).beat ?? 0}`));
    if (parsed.type === "note") return console.log(color.cyan(`note ${(parsed as { note?: string }).note ?? ""}`));
    if (parsed.type === "state") return print(parsed.state);
    return print(parsed.data ?? parsed);
  } catch {
    console.log(text);
  }
}

function print(value: unknown): void { console.log(JSON.stringify(value, null, 2)); }
function ok(msg: string): void { console.log(color.green(msg)); }
function fail(msg: string): never { throw new Error(msg); }
function slug(value: string): string { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return "";
  return new Promise((resolve, reject) => {
    let buf = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (buf += chunk));
    process.stdin.on("end", () => resolve(buf));
    process.stdin.on("error", reject);
  });
}

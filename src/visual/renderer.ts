// WebGL2 fullscreen quad renderer — no Three.js dependency
// Renders a single fragment shader with audio-reactive uniforms

import { fragmentShader, vertexShader } from "./fragment.js";

export interface Uniforms {
  uTime: number;
  uLow: number;
  uMid: number;
  uHigh: number;
  uBeat: number;
  uNoteFlash: number;
  uResolution: [number, number];
}

export interface RendererContext {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  vao: WebGLVertexArrayObject;
  uniformLocs: Record<keyof Uniforms, WebGLUniformLocation | null>;
}

function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Failed to create shader");
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile error: ${info}`);
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext): WebGLProgram {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertexShader);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShader);
  const prog = gl.createProgram();
  if (!prog) throw new Error("Failed to create program");
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(prog);
    throw new Error(`Program link error: ${info}`);
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return prog;
}

export function initRenderer(canvas: HTMLCanvasElement): RendererContext {
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    powerPreference: "high-performance",
  });
  if (!gl) throw new Error("WebGL2 not supported");

  const dpr = Math.min(window.devicePixelRatio, 2);
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  gl.viewport(0, 0, canvas.width, canvas.height);

  const program = createProgram(gl);

  // Fullscreen quad: two triangles covering clip space
  const vao = gl.createVertexArray();
  if (!vao) throw new Error("Failed to create VAO");
  gl.bindVertexArray(vao);

  const buf = gl.createBuffer();
  // biome-ignore format: vertex data
  const verts = new Float32Array([-1,-1, 1,-1, -1,1, 1,1]);
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

  const aPos = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  gl.bindVertexArray(null);

  const uniformNames: (keyof Uniforms)[] = [
    "uTime",
    "uLow",
    "uMid",
    "uHigh",
    "uBeat",
    "uNoteFlash",
    "uResolution",
  ];
  const uniformLocs = {} as Record<keyof Uniforms, WebGLUniformLocation | null>;
  for (const name of uniformNames) {
    uniformLocs[name] = gl.getUniformLocation(program, name);
  }

  return { gl, program, vao, uniformLocs };
}

export function renderFrame(ctx: RendererContext, u: Uniforms): void {
  const { gl, program, vao, uniformLocs } = ctx;
  gl.useProgram(program);

  gl.uniform1f(uniformLocs.uTime, u.uTime);
  gl.uniform1f(uniformLocs.uLow, u.uLow);
  gl.uniform1f(uniformLocs.uMid, u.uMid);
  gl.uniform1f(uniformLocs.uHigh, u.uHigh);
  gl.uniform1f(uniformLocs.uBeat, u.uBeat);
  gl.uniform1f(uniformLocs.uNoteFlash, u.uNoteFlash);
  gl.uniform2f(uniformLocs.uResolution, u.uResolution[0], u.uResolution[1]);

  gl.bindVertexArray(vao);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.bindVertexArray(null);
}

export function resizeRenderer(ctx: RendererContext, w: number, h: number): void {
  const dpr = Math.min(window.devicePixelRatio, 2);
  const canvas = ctx.gl.canvas as HTMLCanvasElement;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.gl.viewport(0, 0, canvas.width, canvas.height);
}

export function disposeRenderer(ctx: RendererContext): void {
  const { gl, program, vao } = ctx;
  gl.deleteVertexArray(vao);
  gl.deleteProgram(program);
  const ext = gl.getExtension("WEBGL_lose_context");
  ext?.loseContext();
}

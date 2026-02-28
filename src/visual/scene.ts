import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { type NoteEntityType, spawnNoteEntity, updateNoteEntities } from "./note-entities.js";
import { createQuantumCore, noteImpact, updateQuantumCore } from "./quantum-core.js";
import { postFrag, postVert } from "./shaders.js";

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  controls: OrbitControls;
  clock: THREE.Clock;
}

// Terminal Dogma — deep crimson void
const BG_COLOR = new THREE.Color(0x030001);

let ctx: SceneContext | null = null;
let transcendencePass: ShaderPass | null = null;
let beatBreathTarget = 0;
let beatBreathCurrent = 0;
const cameraBaseZ = 22;
let elapsedTime = 0;

export function initScene(canvas: HTMLCanvasElement): SceneContext {
  const scene = new THREE.Scene();
  scene.background = BG_COLOR;
  scene.fog = new THREE.FogExp2(0x030001, 0.012);

  const camera = new THREE.PerspectiveCamera(
    55,
    canvas.clientWidth / canvas.clientHeight,
    0.1,
    500,
  );
  camera.position.set(0, 5, cameraBaseZ);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.6;

  // Distant Seele monoliths in Terminal Dogma
  const monolithGeo = new THREE.IcosahedronGeometry(120, 1);
  const monolithMat = new THREE.LineBasicMaterial({
    color: 0x221108,
    transparent: true,
    opacity: 0.15,
  });
  scene.add(new THREE.LineSegments(monolithGeo, monolithMat));

  const quantumCore = createQuantumCore();
  scene.add(quantumCore);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(canvas.clientWidth, canvas.clientHeight),
    0.3,
    0.6,
    0.94,
  );
  composer.addPass(bloomPass);

  const postShader = {
    uniforms: {
      tDiffuse: { value: null },
      uIntensity: { value: 0.0 },
      uTime: { value: 0.0 },
      uResolution: { value: new THREE.Vector2(canvas.clientWidth, canvas.clientHeight) },
    },
    vertexShader: postVert,
    fragmentShader: postFrag,
  };
  transcendencePass = new ShaderPass(postShader);
  composer.addPass(transcendencePass);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.04;
  controls.enablePan = false;
  controls.minDistance = 8;
  controls.maxDistance = 60;
  controls.target.set(0, 0, 0);

  const clock = new THREE.Clock();
  ctx = { scene, camera, renderer, composer, controls, clock };
  return ctx;
}

export function onBeat(beat: number): void {
  beatBreathTarget = beat % 4 === 0 ? 1.0 : 0.4;
}

export function triggerNote(type: NoteEntityType, pitch = 0.5, velocity = 0.8): void {
  if (!ctx) return;
  spawnNoteEntity(ctx.scene, type, pitch, velocity);
  noteImpact(type, velocity, pitch);
}

export function resizeScene(width: number, height: number): void {
  if (!ctx) return;
  ctx.camera.aspect = width / height;
  ctx.camera.updateProjectionMatrix();
  ctx.renderer.setSize(width, height);
  ctx.composer.setSize(width, height);
  if (transcendencePass) {
    transcendencePass.uniforms.uResolution.value.set(width, height);
  }
}

export function renderScene(fftData?: Float32Array): void {
  if (!ctx) return;
  const dt = ctx.clock.getDelta();
  elapsedTime += dt;

  beatBreathCurrent += (beatBreathTarget - beatBreathCurrent) * dt * 6.0;
  beatBreathTarget *= 0.92;

  let lowEnergy = 0;
  let midEnergy = 0;
  let highEnergy = 0;
  if (fftData && fftData.length >= 32) {
    for (let i = 0; i < 4; i++) {
      const raw = (fftData[i] + 100) / 100;
      lowEnergy += Number.isFinite(raw) ? Math.max(0, Math.min(2, raw)) : 0;
    }
    for (let i = 4; i < 16; i++) {
      const raw = (fftData[i] + 100) / 100;
      midEnergy += Number.isFinite(raw) ? Math.max(0, Math.min(2, raw)) : 0;
    }
    for (let i = 16; i < 32; i++) {
      const raw = (fftData[i] + 100) / 100;
      highEnergy += Number.isFinite(raw) ? Math.max(0, Math.min(2, raw)) : 0;
    }
    lowEnergy /= 4;
    midEnergy /= 12;
    highEnergy /= 16;
  }

  // LCL drift camera — dreamlike with irrational frequencies
  const e = lowEnergy * 2.0;
  ctx.controls.target.set(
    Math.sin(elapsedTime * 0.317) * e + Math.sin(elapsedTime * 0.173) * e * 0.5,
    Math.cos(elapsedTime * 0.419) * e * 0.7 + Math.sin(elapsedTime * 0.091) * 0.5,
    Math.sin(elapsedTime * 0.223) * e + Math.cos(elapsedTime * 0.137) * e * 0.3,
  );

  const fovChaos = Math.sin(elapsedTime * 0.271) * 3 + Math.sin(elapsedTime * 0.619) * 2;
  ctx.camera.fov = 55 + beatBreathCurrent * 8 + highEnergy * 10 + fovChaos;
  ctx.camera.updateProjectionMatrix();
  ctx.controls.update();

  updateQuantumCore(dt, fftData, beatBreathCurrent);
  updateNoteEntities(dt, ctx.scene, beatBreathCurrent, midEnergy);

  if (transcendencePass) {
    transcendencePass.uniforms.uIntensity.value = Math.min(
      3.0,
      beatBreathCurrent * 1.5 + highEnergy * 2.0,
    );
    transcendencePass.uniforms.uTime.value = elapsedTime;
  }

  ctx.composer.render();
}

export function disposeScene(): void {
  if (!ctx) return;
  ctx.renderer.dispose();
  ctx.composer.dispose();
  ctx.controls.dispose();
  ctx = null;
}

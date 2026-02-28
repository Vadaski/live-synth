import * as THREE from "three";
import { particleFrag, particleVert } from "./shaders.js";

export type NoteEntityType = "synth" | "bass" | "pad" | "lead" | "kick" | "hat";

let particleMesh: THREE.Points | null = null;
const MAX_PARTICLES = 60000;
let cursor = 0;
let internalTime = 0;

// EVA-themed visual behaviors for each instrument
const TYPE_MAP: Record<
  NoteEntityType,
  { behavior: number; color: THREE.Color; count: number; size: number }
> = {
  kick: { behavior: 0.0, color: new THREE.Color(0xff3300), count: 0, size: 45.0 },
  lead: { behavior: 1.0, color: new THREE.Color(0xffeedd), count: 2000, size: 25.0 },
  pad: { behavior: 2.0, color: new THREE.Color(0xff7722), count: 2500, size: 15.0 },
  bass: { behavior: 3.0, color: new THREE.Color(0x332244), count: 2000, size: 30.0 },
  hat: { behavior: 4.0, color: new THREE.Color(0x22ffaa), count: 1000, size: 10.0 },
  synth: { behavior: 5.0, color: new THREE.Color(0x8844ff), count: 2000, size: 20.0 },
};

export function initNoteEntities(scene: THREE.Scene): void {
  const geo = new THREE.BufferGeometry();

  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAX_PARTICLES * 3), 3));
  geo.setAttribute("velocity", new THREE.BufferAttribute(new Float32Array(MAX_PARTICLES * 3), 3));
  geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(MAX_PARTICLES * 3), 3));
  geo.setAttribute("birthTime", new THREE.BufferAttribute(new Float32Array(MAX_PARTICLES), 1));
  geo.setAttribute("behavior", new THREE.BufferAttribute(new Float32Array(MAX_PARTICLES), 1));
  geo.setAttribute("sizeBase", new THREE.BufferAttribute(new Float32Array(MAX_PARTICLES), 1));

  const mat = new THREE.ShaderMaterial({
    vertexShader: particleVert,
    fragmentShader: particleFrag,
    uniforms: {
      uTime: { value: 0 },
      uBeat: { value: 0 },
      uMidFFT: { value: 0 },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  particleMesh = new THREE.Points(geo, mat);
  particleMesh.frustumCulled = false;
  scene.add(particleMesh);
}

export function spawnNoteEntity(
  scene: THREE.Scene,
  type: NoteEntityType,
  pitch = 0.5,
  velocity = 0.8,
): void {
  if (!particleMesh) initNoteEntities(scene);
  if (!particleMesh) return;

  const params = TYPE_MAP[type];
  const count = Math.floor(params.count * velocity);
  const geo = particleMesh.geometry;

  const posAttr = geo.attributes.position.array as Float32Array;
  const velAttr = geo.attributes.velocity.array as Float32Array;
  const colAttr = geo.attributes.color.array as Float32Array;
  const birthAttr = geo.attributes.birthTime.array as Float32Array;
  const behAttr = geo.attributes.behavior.array as Float32Array;
  const sizeAttr = geo.attributes.sizeBase.array as Float32Array;

  const originX = (Math.random() - 0.5) * 6.0 + (pitch - 0.5) * 12.0;
  const originY = (Math.random() - 0.5) * 6.0;
  const originZ = (Math.random() - 0.5) * 6.0;

  for (let i = 0; i < count; i++) {
    const idx = cursor;
    const i3 = idx * 3;

    posAttr[i3] = originX;
    posAttr[i3 + 1] = originY;
    posAttr[i3 + 2] = originZ;

    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const speed = Math.random() * 2.0 + 0.5;

    velAttr[i3] = speed * Math.sin(phi) * Math.cos(theta);
    velAttr[i3 + 1] = speed * Math.sin(phi) * Math.sin(theta);
    velAttr[i3 + 2] = speed * Math.cos(phi);

    const bright = velocity * 0.45;
    colAttr[i3] = params.color.r * bright;
    colAttr[i3 + 1] = params.color.g * bright;
    colAttr[i3 + 2] = params.color.b * bright;

    birthAttr[idx] = internalTime;
    behAttr[idx] = params.behavior;
    sizeAttr[idx] = params.size * (Math.random() * 0.5 + 0.5);

    cursor = (cursor + 1) % MAX_PARTICLES;
  }

  // Partial buffer upload
  const startIdx = (cursor - count + MAX_PARTICLES) % MAX_PARTICLES;
  const attrs = ["position", "velocity", "color", "birthTime", "behavior", "sizeBase"];
  for (const name of attrs) {
    const attr = geo.attributes[name] as THREE.BufferAttribute;
    attr.clearUpdateRanges();
    if (startIdx + count <= MAX_PARTICLES) {
      attr.addUpdateRange(startIdx * attr.itemSize, count * attr.itemSize);
    } else {
      const tailCount = MAX_PARTICLES - startIdx;
      attr.addUpdateRange(startIdx * attr.itemSize, tailCount * attr.itemSize);
      attr.addUpdateRange(0, (count - tailCount) * attr.itemSize);
    }
    attr.needsUpdate = true;
  }
}

export function updateNoteEntities(
  dt: number,
  _scene: THREE.Scene,
  beatPulse = 0,
  midFFT = 0,
): void {
  if (!particleMesh) return;
  internalTime += dt;
  const mat = particleMesh.material as THREE.ShaderMaterial;
  mat.uniforms.uTime.value = internalTime;
  mat.uniforms.uBeat.value = beatPulse;
  mat.uniforms.uMidFFT.value = midFFT;
}

export function clearEntities(scene: THREE.Scene): void {
  if (!particleMesh) return;
  scene.remove(particleMesh);
  particleMesh.geometry.dispose();
  (particleMesh.material as THREE.Material).dispose();
  particleMesh = null;
}

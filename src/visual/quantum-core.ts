import * as THREE from "three";
import type { NoteEntityType } from "./note-entities.js";
import { coreFrag, coreVert } from "./shaders.js";

let coreGroup: THREE.Group | null = null;
let coreMat: THREE.ShaderMaterial | null = null;
let tunnelMesh: THREE.Mesh | null = null;
let atFieldMesh: THREE.Mesh | null = null;
let atFieldOpacity = 0;

let resonance = 0;
let resonanceVelocity = 0;
let lastNotePhase = 0;

export function createQuantumCore(): THREE.Group {
  coreGroup = new THREE.Group();

  // 1. Lilith's Egg — The Inner Quantum Core
  const geo = new THREE.IcosahedronGeometry(3.5, 16);
  coreMat = new THREE.ShaderMaterial({
    vertexShader: coreVert,
    fragmentShader: coreFrag,
    uniforms: {
      uTime: { value: 0 },
      uBeat: { value: 0 },
      uLowFFT: { value: 0 },
      uResonance: { value: 0 },
      uNotePhase: { value: 0 },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  coreGroup.add(new THREE.Mesh(geo, coreMat));

  // 2. AT Field — Hexagonal containment barrier (flashes on impact)
  const atGeo = new THREE.IcosahedronGeometry(5.2, 2);
  const atMat = new THREE.MeshBasicMaterial({
    color: 0xff8800,
    wireframe: true,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
  });
  atFieldMesh = new THREE.Mesh(atGeo, atMat);
  coreGroup.add(atFieldMesh);

  // 3. Sephirot Tree of Life connections
  const sephPoints: THREE.Vector3[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const y = (i / 10) * 6 - 3;
    sephPoints.push(new THREE.Vector3(Math.cos(a) * 2.2, y, Math.sin(a) * 2.2));
  }
  const lineGeo = new THREE.BufferGeometry().setFromPoints(sephPoints);
  const lineMat = new THREE.LineBasicMaterial({
    color: 0xcc6600,
    transparent: true,
    opacity: 0.2,
    blending: THREE.AdditiveBlending,
  });
  coreGroup.add(new THREE.LineLoop(lineGeo, lineMat));

  // 4. Terminal Dogma Void Tunnel
  const tGeo = new THREE.CylinderGeometry(90, 90, 400, 24, 32, true);
  tGeo.rotateX(Math.PI / 2);
  const tMat = new THREE.MeshBasicMaterial({
    color: 0x0a0205,
    wireframe: true,
    transparent: true,
    opacity: 0.12,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
  });
  tunnelMesh = new THREE.Mesh(tGeo, tMat);
  coreGroup.add(tunnelMesh);

  return coreGroup;
}

export function noteImpact(type: NoteEntityType, velocity: number, pitch: number): void {
  const kickMult = type === "kick" ? 3.0 : type === "bass" ? 2.0 : 1.0;
  resonance += velocity * 0.8 * kickMult;
  resonanceVelocity += velocity * 2.5 * kickMult;
  lastNotePhase += pitch * 3.7 + velocity * 1.3;
  if (type === "kick") lastNotePhase += velocity * 7.0;
  // AT Field flashes on kick/bass
  if (type === "kick" || type === "bass") atFieldOpacity = velocity * 0.5;
}

export function updateQuantumCore(dt: number, fftData?: Float32Array, beatPulse = 0): void {
  if (!coreMat || !tunnelMesh || !coreGroup || !atFieldMesh) return;

  // Spring-damper resonance
  resonanceVelocity += -resonance * 12.0 * dt;
  resonanceVelocity *= 1.0 - 5.0 * dt;
  resonance += resonanceVelocity * dt;
  resonance = Math.max(0, Math.min(resonance, 2.5));

  coreMat.uniforms.uTime.value += dt;
  coreMat.uniforms.uBeat.value = beatPulse;
  coreMat.uniforms.uResonance.value = resonance;
  coreMat.uniforms.uNotePhase.value = lastNotePhase;

  let lowEnergy = 0;
  if (fftData && fftData.length > 0) {
    let sum = 0;
    for (let i = 0; i < 4; i++) {
      const raw = (fftData[i] + 100) / 100;
      sum += Number.isFinite(raw) ? Math.max(0, Math.min(2, raw)) : 0;
    }
    lowEnergy = sum / 4;
  }
  coreMat.uniforms.uLowFFT.value += (lowEnergy - coreMat.uniforms.uLowFFT.value) * dt * 12.0;

  const t = coreMat.uniforms.uTime.value;

  // AT Field — decays after flash, rotates chaotically
  atFieldOpacity *= 1.0 - 4.0 * dt;
  (atFieldMesh.material as THREE.MeshBasicMaterial).opacity = atFieldOpacity;
  atFieldMesh.scale.setScalar(1.0 + atFieldOpacity * 0.3);
  atFieldMesh.rotation.y += dt * (0.5 + Math.sin(t * 0.271) * 0.2);
  atFieldMesh.rotation.x += dt * (0.3 + Math.cos(t * 0.419) * 0.15);

  // Sephirot Tree — slow rotation
  const seph = coreGroup.children[2];
  seph.rotation.y += dt * 0.15;
  seph.rotation.x = Math.sin(t * 0.2) * 0.3;

  // Void Tunnel motion
  tunnelMesh.position.z = ((t * 35.0 + Math.sin(t * 0.317) * 20) % 180) - 45;
  tunnelMesh.rotation.z += dt * (0.08 + Math.sin(t * 0.173) * 0.06);

  // Core mesh — chaotic rotation at irrational rates
  const core = coreGroup.children[0];
  core.rotation.x += dt * (0.07 + Math.sin(t * 0.191) * 0.05);
  core.rotation.y += dt * (0.11 + Math.cos(t * 0.313) * 0.07);
  core.rotation.z += dt * Math.sin(t * 0.223) * 0.04;
}

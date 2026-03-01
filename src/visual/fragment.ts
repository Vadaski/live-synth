// Fullscreen fragment shader — generative abstract visuals
// Domain warping, strange attractors, moiré interference, fractal structures

export const vertexShader = `#version 300 es
precision mediump float;
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

export const fragmentShader = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform float uTime;
uniform float uLow;
uniform float uMid;
uniform float uHigh;
uniform float uBeat;
uniform vec2 uResolution;
uniform float uNoteFlash;

// --- Noise utilities ---
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p, int octaves) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 6; i++) {
    if (i >= octaves) break;
    v += a * noise(p);
    p = rot * p * 2.0;
    a *= 0.5;
  }
  return v;
}

// --- Domain warping ---
float domainWarp(vec2 p, float t) {
  vec2 q = vec2(fbm(p + vec2(0.0, 0.0), 4), fbm(p + vec2(5.2, 1.3), 4));
  vec2 r = vec2(
    fbm(p + 4.0 * q + vec2(1.7, 9.2) + 0.15 * t, 4),
    fbm(p + 4.0 * q + vec2(8.3, 2.8) + 0.126 * t, 4)
  );
  return fbm(p + 4.0 * r, 4);
}

// --- Strange attractor trace (Clifford) ---
float cliffordField(vec2 p, float t) {
  float a = -1.4 + sin(t * 0.1) * 0.3;
  float b = 1.6 + cos(t * 0.07) * 0.2;
  float c = 1.0 + sin(t * 0.13) * 0.2;
  float d = 0.7 + cos(t * 0.09) * 0.3;
  vec2 z = p * 0.5;
  float acc = 0.0;
  for (int i = 0; i < 12; i++) {
    vec2 zn = vec2(sin(a * z.y) + c * cos(a * z.x), sin(b * z.x) + d * cos(b * z.y));
    acc += 1.0 / (1.0 + dot(zn - z, zn - z) * 8.0);
    z = zn;
  }
  return acc / 12.0;
}

// --- Moiré interference ---
float moire(vec2 p, float t) {
  float s1 = sin(length(p - vec2(-0.3, 0.0)) * 30.0 - t * 2.0);
  float s2 = sin(length(p - vec2(0.3, 0.1)) * 28.0 + t * 1.7);
  float s3 = sin(length(p - vec2(0.0, -0.2)) * 32.0 - t * 1.3);
  return (s1 + s2 + s3) * 0.333;
}

void main() {
  vec2 uv = vUv;
  vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
  vec2 p = (uv - 0.5) * aspect;
  float t = uTime;

  // Audio-reactive parameters
  float bassScale = 1.0 + uLow * 1.5;
  int complexity = 3 + int(uMid * 3.0);
  float detail = uHigh * 0.8;

  // Breathing: density modulation over time
  float breath = 0.4 + 0.3 * sin(t * 0.37) + 0.2 * sin(t * 0.59);

  // Layer 1: domain-warped fbm — bass drives large morphing
  vec2 wp = p * (1.5 + uLow * 2.0);
  float warp = domainWarp(wp + vec2(t * 0.05), t * 0.4 + uLow * 2.0);

  // Layer 2: strange attractor field — mid drives complexity
  float attractor = cliffordField(p * (2.0 + uMid * 1.5), t * 0.5 + uMid);

  // Layer 3: moiré interference — high adds shimmer
  float moireVal = moire(p, t * 0.8 + uHigh * 3.0) * (0.3 + detail);

  // Layer 4: fractal-like radial structure
  float angle = atan(p.y, p.x);
  float radius = length(p);
  float fractal = fbm(
    vec2(angle * 3.0 + t * 0.2, radius * 4.0 - t * 0.3) + uLow * 0.5,
    complexity
  );

  // Composite layers with breathing
  float composite = 0.0;
  composite += warp * 0.4 * breath;
  composite += attractor * 0.35 * bassScale * 0.5;
  composite += moireVal * 0.15;
  composite += fractal * 0.25 * breath;

  // Vignette — push edges darker for underground feel
  float vig = 1.0 - smoothstep(0.2, 1.2, radius * 1.3);

  // Color palette: deep underground — muted neon accents
  vec3 colA = vec3(0.35, 0.02, 0.08);  // deep crimson
  vec3 colB = vec3(0.08, 0.02, 0.25);  // dark violet
  vec3 colC = vec3(0.02, 0.18, 0.22);  // dark cyan
  vec3 colD = vec3(0.01, 0.01, 0.02);  // near-black

  float blend = composite * 1.2;
  vec3 col = mix(colD, colA, smoothstep(0.15, 0.55, blend));
  col = mix(col, colB, smoothstep(0.35, 0.7, blend + attractor * 0.3));
  col = mix(col, colC, smoothstep(0.5, 0.85, blend + moireVal * 0.4));

  // Beat pulse — subdued flash, not white
  float beatGlow = uBeat * 0.15 * smoothstep(0.6, 0.0, radius);
  col += vec3(0.2, 0.05, 0.1) * beatGlow;

  // Note trigger flash — brief accent
  col += vec3(0.1, 0.05, 0.15) * uNoteFlash * smoothstep(0.8, 0.0, radius);

  // High freq sparkle — subtle bright dots
  float sparkle = step(0.97, noise(p * 80.0 + t * 5.0)) * uHigh * 0.4;
  col += vec3(0.15, 0.2, 0.25) * sparkle;

  // Apply vignette and overall brightness control
  col *= vig * (0.6 + breath * 0.3);

  // Clamp to avoid oversaturation
  col = clamp(col, 0.0, 1.0);

  fragColor = vec4(col, 1.0);
}
`;

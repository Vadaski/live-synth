export const postVert = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const postFrag = `
uniform sampler2D tDiffuse;
uniform float uIntensity;
uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453); }

void main() {
  vec2 uv = vUv;
  vec2 center = vec2(0.5);
  float dist = length(uv - center);

  // Radial warp — Entry Plug distortion
  uv = center + (uv - center) * (1.0 - uIntensity * 0.03 * sin(dist * 8.0 - uTime * 3.0));

  // NERV-style CRT scanlines
  float scanline = sin(uv.y * uResolution.y * 0.5 + uTime * 8.0) * 0.035 * uIntensity;

  // VHS underground tape glitch on high intensity
  if (uIntensity > 1.5 && rand(vec2(uTime * 0.1, uv.y)) > 0.97) {
    uv.x += (rand(vec2(uTime, uv.x)) - 0.5) * 0.04 * uIntensity;
  }

  // Chromatic aberration — Entry Plug HUD
  float ca = uIntensity * 0.012 * dist;
  vec2 caOff = vec2(ca, ca * 0.5);
  float r = texture2D(tDiffuse, uv - caOff).r;
  float g = texture2D(tDiffuse, uv).g;
  float b = texture2D(tDiffuse, uv + caOff).b;
  vec3 col = vec3(r, g, b) - scanline;

  // Cross-shaped lens flare — Lilith's crucifix
  float crossH = exp(-abs(uv.y - 0.5) * 18.0) * exp(-abs(uv.x - 0.5) * 2.5);
  float crossV = exp(-abs(uv.x - 0.5) * 18.0) * exp(-abs(uv.y - 0.5) * 2.5);
  col += vec3(1.0, 0.5, 0.2) * (crossH + crossV) * uIntensity * 0.035;

  // Terminal Dogma vignette — darker edges
  col *= smoothstep(1.5, 0.25, dist);

  col = mix(col, col * col * 1.3, uIntensity * 0.1);
  gl_FragColor = vec4(col, 1.0);
}
`;

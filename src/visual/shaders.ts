export const coreVert = `
uniform float uTime; uniform float uBeat; uniform float uLowFFT;
uniform float uResonance; uniform float uNotePhase;
varying vec3 vNormal; varying vec3 vPos; varying float vNoise;

float chaos(vec3 p, float t) {
  float a = sin(p.x*1.17+t*0.618)*cos(p.z*0.89+t*0.317);
  float b = sin(p.y*2.31-t*0.419)*sin(p.x*1.73+p.z*0.61+t*0.223);
  float c = cos(p.z*3.07+p.y*1.41+t*0.571)*sin(p.x*0.53-t*0.811);
  float d = sin((p.x+a)*2.1+t*0.137)*cos((p.y+b)*1.7-t*0.293);
  return (a+b*0.7+c*0.4+d*0.5)*0.5;
}

void main() {
  vNormal = normal;
  vec3 pos = position;
  float phase = uNotePhase;
  float n1 = chaos(pos+vec3(sin(phase*0.7),cos(phase*1.1),sin(phase*0.3)), uTime*0.7);
  float n2 = chaos(pos*2.3+vec3(cos(phase*0.5)), uTime*1.13+37.0);
  float noise = n1+n2*0.35;
  // Sacred geometry ridges — mandala pattern on surface
  float sacred = sin(length(pos.xz)*6.28+uTime*0.5)*cos(atan(pos.z,pos.x)*6.0+phase);
  noise += sacred*0.25;
  vNoise = noise;

  float res = uResonance;
  float fftMod = min(uLowFFT, 1.5);
  float disp = noise*(0.5+res*2.5+fftMod*1.5+uBeat*1.2);
  pos += normal*disp;

  float strAng = phase*0.618+uTime*0.191;
  vec3 strAxis = normalize(vec3(sin(strAng),cos(strAng*1.3),sin(strAng*0.7)));
  pos += strAxis*dot(normalize(position),strAxis)*res*2.0;

  float twPow = 0.2+res*0.6;
  float twAng = pos.y*twPow+uTime*0.37+phase*0.5;
  float s1=sin(twAng),c1=cos(twAng);
  pos.xz *= mat2(c1,-s1,s1,c1);

  vPos = pos;
  gl_Position = projectionMatrix*modelViewMatrix*vec4(pos,1.0);
}
`;

export const coreFrag = `
uniform float uTime; uniform float uBeat; uniform float uLowFFT;
uniform float uResonance; uniform float uNotePhase;
varying vec3 vNormal; varying vec3 vPos; varying float vNoise;

// AT Field hexagonal pattern
float hex(vec2 p) {
  p.x *= 1.1547; p.y += mod(floor(p.x),2.0)*0.5;
  p = abs(fract(p)-0.5);
  return abs(max(p.x*1.5+p.y, p.y*2.0)-1.0);
}

void main() {
  vec3 viewDir = normalize(cameraPosition-vPos);
  float rim = 1.0-max(dot(viewDir,normalize(vNormal)),0.0);
  rim = smoothstep(0.2,1.0,rim);

  // Sephirot Tree palette — 5 emanations cycling at golden ratio phases
  float phase = uTime*0.191+vNoise*2.0+length(vPos)*0.3+uNotePhase*0.4;
  vec3 keter = vec3(0.30,0.28,0.35);
  vec3 geburah = vec3(0.35,0.02,0.05);
  vec3 tiphereth = vec3(0.30,0.18,0.02);
  vec3 yesod = vec3(0.12,0.02,0.28);
  vec3 malkuth = vec3(0.02,0.02,0.02);

  float w1 = max(0.0,sin(phase)*0.5+0.2);
  float w2 = max(0.0,sin(phase*1.618+1.0)*0.5+0.2);
  float w3 = max(0.0,sin(phase*0.618+2.5)*0.5+0.2);
  float w4 = max(0.0,sin(phase*2.317+4.1)*0.5+0.2);
  float w5 = max(0.0,sin(phase*0.317+5.7)*0.5+0.3);
  float wSum = w1+w2+w3+w4+w5+0.001;
  vec3 baseCol = (keter*w1+geburah*w2+tiphereth*w3+yesod*w4+malkuth*w5)/wSum;

  // AT Field hex grid — burns orange on resonance
  float atHex = smoothstep(0.05,0.02,hex(vPos.xy*2.0+vPos.z));
  float res = min(uResonance,2.5);
  vec3 atGlow = vec3(1.0,0.45,0.08)*atHex*res*0.25;

  vec3 rimCol = baseCol*2.0+vec3(0.03);
  vec3 finalCol = mix(baseCol*0.12,rimCol,rim)+atGlow;

  finalCol += baseCol*res*0.4;
  finalCol += vec3(0.2,0.10,0.03)*res*rim*0.7;

  float pulse = sin(uTime*3.7+vNoise*8.0)*sin(uTime*2.3+length(vPos)*3.0);
  finalCol += baseCol*max(0.0,pulse)*min(uLowFFT,1.0)*0.25;
  finalCol += vec3(0.1)*uBeat*rim*rim;

  float alpha = 0.18+rim*0.28+res*0.15;
  gl_FragColor = vec4(finalCol,min(alpha,0.8));
}
`;

export const particleVert = `
attribute vec3 velocity; attribute float birthTime;
attribute float behavior; attribute float sizeBase;
uniform float uTime; uniform float uBeat; uniform float uMidFFT;
attribute vec3 color;
varying vec3 vColor; varying float vAlpha; varying float vBehavior;

void main() {
  float age = max(0.0,uTime-birthTime);
  float life = 3.5+sin(birthTime*7.31)*1.5;
  float nAge = age/life;
  vBehavior = behavior;
  if(nAge>=1.0||age==0.0){ gl_Position=vec4(2.0,2.0,2.0,0.0); return; }

  vec3 pos = position;
  vec3 dir = normalize(velocity+vec3(0.001));
  float speed = length(velocity);
  float t = age*speed*(1.0+uMidFFT*0.5);
  float px=sin(t*1.73+dir.y*11.0)*2.0, py=cos(t*2.17+dir.z*13.0)*2.0, pz=sin(t*1.31+dir.x*7.0)*2.0;

  if(behavior<0.5){
    // Kick: Third Impact shockwave — expanding disc
    pos += dir*age*35.0; pos.y *= 0.15;
    pos += vec3(px,py*0.1,pz)*age*0.3;
  } else if(behavior<1.5){
    // Lead: Lance of Longinus — straight spears with slight wobble
    pos += dir*t*4.0;
    pos.y += sin(t*8.0+dir.x*6.28)*0.4;
    pos += vec3(px,py,pz)*0.15;
  } else if(behavior<2.5){
    // Pad: LCL fluid drift — slow ethereal spirals
    float ang = t*0.8+dir.x*6.28+sin(t*0.5)*1.5;
    float r = 5.0+dir.y*12.0+age*2.0;
    pos.x += cos(ang)*r; pos.z += sin(ang)*r;
    pos.y += sin(ang*2.0+dir.z)*2.0+py*0.3;
  } else if(behavior<3.5){
    // Bass: Seele monolith columns — heavy vertical motion
    pos += dir*age*0.5;
    pos.x += sin(age*50.0+dir.x*10.0)*0.3;
    pos.y += age*20.0*sign(dir.z)+py*0.2;
  } else if(behavior<4.5){
    // Hat: MAGI data rain — digital cascade falling
    vec3 stepVec = sign(dir)*floor(age*15.0+sin(age*11.0)*2.0);
    pos += stepVec*2.5+vec3(px,py,pz)*0.15;
    pos.y -= age*8.0;
  } else {
    // Synth: Metatron's Cube orbits — sacred geometry traces
    float r = 7.0+dir.x*6.0+sin(t*0.7)*3.0;
    float a1 = t*4.0*dir.y+sin(t*0.31)*2.0;
    float a2 = t*5.0*dir.z+cos(t*0.43)*2.0;
    pos.x += cos(a1)*r*cos(a2); pos.y += sin(a1)*r*cos(a2); pos.z += sin(a2)*r;
  }

  float gAng = uTime*(0.2+sin(uTime*0.071)*0.1);
  float s=sin(gAng),c=cos(gAng);
  pos.xz *= mat2(c,-s,s,c);

  vec4 mvPos = modelViewMatrix*vec4(pos,1.0);
  gl_Position = projectionMatrix*mvPos;
  gl_PointSize = sizeBase*(1.0-nAge)*(1.0+uBeat*1.5+uMidFFT*2.0)/-mvPos.z;

  float hueShift = sin(birthTime*3.17+age*0.5)*0.15;
  vColor = color+vec3(hueShift,-hueShift*0.5,hueShift*0.3);
  vAlpha = pow(1.0-nAge,1.5);
}
`;

export const particleFrag = `
varying vec3 vColor; varying float vAlpha; varying float vBehavior;

void main() {
  vec2 coord = gl_PointCoord-vec2(0.5);
  float dist = length(coord);
  if(dist>0.5) discard;

  float shape = 1.0;
  if(vBehavior<0.5){
    shape = smoothstep(0.5,0.4,dist)*smoothstep(0.15,0.25,dist);
  } else if(vBehavior<1.5){
    shape = exp(-abs(coord.x)*8.0-abs(coord.y)*3.0);
  } else if(vBehavior<2.5){
    shape = exp(-dist*3.0);
  } else if(vBehavior<3.5){
    shape = step(abs(coord.x),0.12)*step(abs(coord.y),0.4)+exp(-dist*4.0)*0.3;
  } else if(vBehavior<4.5){
    shape = exp(-dist*10.0);
  } else {
    shape = smoothstep(0.5,0.4,dist)*smoothstep(0.28,0.35,dist)+exp(-dist*6.0)*0.4;
  }

  gl_FragColor = vec4(vColor*shape*1.5, vAlpha*shape);
}
`;

export { postVert, postFrag } from "./post-shaders.js";

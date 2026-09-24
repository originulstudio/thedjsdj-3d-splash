export const relicVertex = /* glsl */ `
uniform float uTime;
uniform float uOpen;
uniform float uAudio;
varying vec3 vNormal;
varying vec3 vWorld;
varying vec3 vView;

void main() {
  vec3 n = normalize(normal);
  float warp = sin(position.y * 6.0 + uTime * 0.35) * cos(position.x * 5.0 - uTime * 0.22);
  float breathe = 1.0 + warp * 0.035 * (0.35 + uOpen) + uAudio * 0.045;
  vec3 displaced = position * breathe;
  vec4 world = modelMatrix * vec4(displaced, 1.0);
  vec4 view = viewMatrix * world;
  vNormal = normalize(mat3(modelMatrix) * n);
  vWorld = world.xyz;
  vView = view.xyz;
  gl_Position = projectionMatrix * view;
}
`;

export const relicFragment = /* glsl */ `
precision highp float;
uniform float uTime;
uniform float uCharge;
uniform float uAudio;
uniform vec3 uEmber;
uniform vec3 uIon;
uniform vec3 uSilver;
varying vec3 vNormal;
varying vec3 vWorld;
varying vec3 vView;

float hash13(vec3 p) {
  p = fract(p * vec3(443.897, 441.423, 437.195));
  p += dot(p, p.yzx + 19.19);
  return fract((p.x + p.y) * p.z);
}

void main() {
  vec3 n = normalize(vNormal);
  vec3 viewDir = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - clamp(dot(n, viewDir), 0.0, 1.0), 2.6);
  vec3 cell = floor(n * 7.0 + 0.5);
  float id = hash13(cell);
  float tile = smoothstep(0.2, 0.85, max(max(abs(n.x), abs(n.y)), abs(n.z)));
  float spark = step(0.94, id);
  vec3 base = mix(vec3(0.015, 0.016, 0.02), uSilver, tile * fres * 0.55);
  base = mix(base, uEmber, spark * (0.45 + uCharge));
  base += uIon * fres * fres * (0.35 + uAudio);
  if (id > 0.985) base = mix(base, vec3(0.79, 1.0, 0.23), 0.65);
  gl_FragColor = vec4(base, 1.0);
}
`;

export const shardVertex = /* glsl */ `
attribute float aSeed;
uniform float uTime;
uniform float uOpen;
uniform float uAudio;
varying float vSeed;
varying vec3 vNormal;
varying vec3 vWorld;

void main() {
  vSeed = aSeed;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const shardFragment = /* glsl */ `
precision highp float;
uniform float uTime;
uniform float uCharge;
uniform vec3 uEmber;
uniform vec3 uSilver;
uniform vec3 uLime;
varying float vSeed;
varying vec3 vNormal;
varying vec3 vWorld;

void main() {
  vec3 n = normalize(vNormal);
  vec3 viewDir = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - clamp(dot(n, viewDir), 0.0, 1.0), 1.6);
  vec3 col = mix(vec3(0.04, 0.045, 0.05), uSilver, 0.35 + fres * 0.65);
  float hot = step(0.94, fract(vSeed * 7.13));
  col = mix(col, uEmber, hot * (0.4 + uCharge));
  gl_FragColor = vec4(col, 0.9);
}
`;

export const figureVertex = /* glsl */ `
uniform float uTime;
uniform float uDisp;
uniform sampler2D uMap;
varying vec2 vUv;

void main() {
  vUv = uv;
  vec3 p = position;
  float lum = dot(texture2D(uMap, uv).rgb, vec3(0.299, 0.587, 0.114));
  p.z += sin(uv.y * 22.0 + uTime * 0.6) * uDisp * lum;
  p.x += sin(uv.y * 8.0 + uTime * 0.3) * uDisp * 0.35;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

export const figureFragment = /* glsl */ `
precision highp float;
uniform sampler2D uMap;
uniform float uTime;
uniform float uReveal;
uniform float uSplit;
uniform float uGrid;
uniform float uOpacity;
uniform float uAudio;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  float r = texture2D(uMap, uv + vec2(uSplit, 0.0)).r;
  float g = texture2D(uMap, uv).g;
  float b = texture2D(uMap, uv - vec2(uSplit, 0.004)).b;
  vec3 sampleRgb = vec3(r, g, b);
  float lum = dot(sampleRgb, vec3(0.299, 0.587, 0.114));
  float mask = smoothstep(0.012, 0.07, lum);
  vec3 silver = vec3(0.85, 0.89, 0.93);
  vec3 voidc = vec3(0.02, 0.025, 0.04);
  vec3 ember = vec3(1.0, 0.30, 0.16);
  vec3 col = mix(voidc, silver, smoothstep(0.06, 0.82, lum));
  col = mix(col, ember, smoothstep(0.78, 0.98, lum) * 0.55);
  col.r = mix(col.r, r, 0.35 + uAudio * 0.2);
  float scan = 0.84 + 0.16 * smoothstep(0.35, 0.65, fract(uv.y * 140.0 + uTime * 0.2));
  col *= scan;
  float gridLine = max(
    smoothstep(0.92, 1.0, fract(uv.x * 28.0)),
    smoothstep(0.92, 1.0, fract(uv.y * 36.0))
  );
  col = mix(col, vec3(0.45, 0.78, 1.0), gridLine * uGrid);
  float wipe = smoothstep(0.0, 0.08, uReveal - (1.0 - uv.y));
  float subject = smoothstep(0.0, 0.08, uv.x) * smoothstep(0.84, 0.58, uv.x);
  subject *= smoothstep(0.02, 0.16, uv.y) * smoothstep(0.96, 0.58, uv.y);
  float alpha = mask * wipe * subject * uOpacity;
  if (alpha < 0.02) discard;
  gl_FragColor = vec4(col, alpha);
}
`;

export const pointVertex = /* glsl */ `
attribute float aLum;
uniform float uTime;
uniform float uSize;
uniform float uReveal;
varying float vLum;
varying float vAlpha;

void main() {
  vec3 p = position;
  p.z += sin(uTime * 0.5 + position.y * 6.0) * 0.03 * aLum;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float reveal = smoothstep(0.0, 0.15, uReveal - (0.5 - position.y * 0.5));
  gl_PointSize = uSize * aLum * reveal * (240.0 / max(1.0, -mv.z));
  vLum = aLum;
  vAlpha = reveal;
}
`;

export const pointFragment = /* glsl */ `
precision highp float;
varying float vLum;
varying float vAlpha;

void main() {
  vec2 d = gl_PointCoord - vec2(0.5);
  float disc = 1.0 - smoothstep(0.28, 0.5, length(d));
  if (disc < 0.05) discard;
  vec3 silver = vec3(0.86, 0.9, 0.95);
  vec3 ember = vec3(1.0, 0.32, 0.18);
  vec3 col = mix(silver, ember, smoothstep(0.55, 1.0, vLum));
  gl_FragColor = vec4(col, disc * vAlpha * 0.9);
}
`;

export const particleVertex = /* glsl */ `
attribute float aScale;
uniform float uTime;
uniform float uSize;
varying float vScale;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aScale * uSize * (32.0 / max(1.0, -mv.z));
  vScale = aScale;
}
`;

export const particleFragment = /* glsl */ `
precision highp float;
uniform vec3 uColor;
uniform float uAlpha;
varying float vScale;

void main() {
  vec2 d = gl_PointCoord - vec2(0.5);
  float disc = 1.0 - smoothstep(0.32, 0.5, length(d));
  if (disc < 0.04) discard;
  gl_FragColor = vec4(uColor, disc * uAlpha * (0.35 + vScale));
}
`;

export const gradeVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const gradeFragment = /* glsl */ `
precision highp float;
uniform sampler2D tDiffuse;
uniform float uTime;
uniform float uChroma;
uniform float uGrain;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = vUv;
  vec2 off = vec2(uChroma, 0.0);
  float r = texture2D(tDiffuse, uv + off).r;
  float g = texture2D(tDiffuse, uv).g;
  float b = texture2D(tDiffuse, uv - off).b;
  vec3 col = vec3(r, g, b);
  vec2 vigUv = uv * 2.0 - 1.0;
  float vig = smoothstep(1.25, 0.25, dot(vigUv, vigUv));
  col *= mix(0.62, 1.0, vig);
  float n = hash(uv * vec2(1920.0, 1080.0) + fract(uTime) * 13.0);
  col += (n - 0.5) * uGrain;
  gl_FragColor = vec4(col, 1.0);
}
`;

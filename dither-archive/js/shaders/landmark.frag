uniform vec3 uColor;
uniform float uTime;
varying vec2 vUv;

// Perlin Noise Function (Classic 2D)
vec2 hash(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float perlinNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(mix(dot(hash(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
                    dot(hash(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
                mix(dot(hash(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
                    dot(hash(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x), u.y);
}

// Simple Random Noise Function
float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main() {
  float pixelSize = 2.0; // Bigger = bigger pixels
  vec2 pixelatedCoords = floor(gl_FragCoord.xy / pixelSize) * pixelSize;
  // vec2 pixelatedCoords = floor(vUv / pixelSize) / pixelSize;
  // pixelatedCoords = fract(pixelatedCoords); // Ensure UVs wrap around

  // Perlin noise for smooth transparency
  float noise = perlinNoise(pixelatedCoords * 0.2 + vec2(uTime * 0.01, uTime * 0.01));

  // Random pattern to subtract pixels
  float randomNoise = random(pixelatedCoords / 2.0) * 0.7; // Less impact

  // Center density effect (more density in the middle)
  float density = (0.125 * 0.2f) - abs(vUv.x - 0.5) * 4.0;

  // Glow intensity (center = strongest, edges = lighter color)
  float glow = exp(-160.0 * pow(vUv.x - 0.5, 2.0));

  // Stepping effect
  glow = floor(glow * 4.f) / 4.f; // Discretize the fade

  // Lighter version of base color
  vec3 lighterColor = mix(uColor, vec3(1.0), 0.5); // Mix with white (50%)

  // Blend between base color (center) and lighter color (edges)
  vec3 finalColor = mix(lighterColor, uColor, glow);

  // Final transparency effect: Perlin noise - random noise
  if ( noise - randomNoise > density) discard;
  // if (randomNoise > density) discard;

  gl_FragColor = vec4(finalColor, 1.0);
}
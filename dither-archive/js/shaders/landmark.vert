varying vec2 vUv;
uniform vec2 uRepeat; // Controls repeating
void main() {
  vUv = uv;
  // vUv = uv * uRepeat; // Scale UVs to cover cylinder
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
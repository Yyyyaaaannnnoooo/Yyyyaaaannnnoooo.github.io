uniform sampler2D tDiffuse;       // Current frame
uniform sampler2D tPreviousFrame; // Previous frame
uniform float time;
uniform float strength;
uniform vec2 motion;  // Motion vector from JS
varying vec2 vUv;

void main() {
    vec2 uv = vUv;
    
    // Introduce blocky pixelation (optional)
    float blockSize = 32.0;
    vec2 blockUV = floor(uv * blockSize) / blockSize;
    
    // Calculate motion-based UV shift
    vec2 motionOffset = motion * 0.02; // Adjust strength

    // Sample textures
    vec4 previousColor = texture2D(tPreviousFrame, uv - motionOffset);
    vec4 currentColor = texture2D(tDiffuse, uv);

    // If motion is near zero, keep previous frame
    float motionIntensity = length(motion);
    float blendFactor = smoothstep(0.01, 0.1, motionIntensity); 

    // Blend the datamosh effect based on motion
    vec4 finalColor = mix(previousColor, currentColor, blendFactor);

    gl_FragColor = finalColor;
}

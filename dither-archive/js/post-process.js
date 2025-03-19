import * as THREE from 'three';

// import Stats from 'three/addons/libs/stats.module.js';

// import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
// import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GodRaysFakeSunShader, GodRaysDepthMaskShader, GodRaysCombineShader, GodRaysGenerateShader } from 'three/addons/shaders/GodRaysShader.js';

// let container, stats;
class GodRays {
  constructor(scene, renderer) {
    this.scene = scene
    this.renderer = renderer
    this.materialDepth;
    this.sphereMesh;
    this.sunPosition = new THREE.Vector3(0, 500, -1000);
    this.clipPosition = new THREE.Vector4();
    this.screenSpacePosition = new THREE.Vector3();
    this.postprocessing = { enabled: true };
    this.orbitRadius = 200;
    // this.bgColor = 0x000511;
    this.bgColor = 0x000511;
    this.sunColor = 0xffee00;
    this.intensity = 0.25;
    this.clock = new THREE.Clock();
    this.angle = 0

    // Use a smaller size for some of the god-ray render targets for better performance.
    this.godrayRenderTargetResolutionMultiplier = 1.0 / (4.0);
  }
  // init();

  init_post_process() {

    this.materialDepth = new THREE.MeshDepthMaterial();

    const geo = new THREE.SphereGeometry(0, 120, 0);
    this.sphereMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x000000 }));
    this.sphereMesh.scale.multiplyScalar(2);
    this.scene.add(this.sphereMesh)
    this.initPostprocessing(window.innerWidth, window.innerHeight);
  }

  //

  PostProcess_onWindowResize() {
    const renderTargetWidth = window.innerWidth;
    const renderTargetHeight = window.innerHeight;
    this.postprocessing.rtTextureColors.setSize(renderTargetWidth, renderTargetHeight);
    this.postprocessing.rtTextureDepth.setSize(renderTargetWidth, renderTargetHeight);
    this.postprocessing.rtTextureDepthMask.setSize(renderTargetWidth, renderTargetHeight);

    const adjustedWidth = renderTargetWidth * this.godrayRenderTargetResolutionMultiplier;
    const adjustedHeight = renderTargetHeight * this.godrayRenderTargetResolutionMultiplier;
    this.postprocessing.rtTextureGodRays1.setSize(adjustedWidth, adjustedHeight);
    this.postprocessing.rtTextureGodRays2.setSize(adjustedWidth, adjustedHeight);

  }

  set_color(color) {
    this.bgColor = color
    this.postprocessing.godraysFakeSunUniforms.bgColor.value.setHex(this.bgColor);
    // this.postprocessing.godraysFakeSunUniforms.sunColor.value.setHex(this.sunColor);
  }

  initPostprocessing(renderTargetWidth, renderTargetHeight) {
    this.postprocessing.scene = new THREE.Scene();

    this.postprocessing.camera = new THREE.OrthographicCamera(- 0.5, 0.5, 0.5, - 0.5, - 10000, 10000);
    this.postprocessing.camera.position.z = 100;

    this.postprocessing.scene.add(this.postprocessing.camera);

    this.postprocessing.rtTextureColors = new THREE.WebGLRenderTarget(renderTargetWidth, renderTargetHeight, { type: THREE.HalfFloatType });

    // Switching the depth formats to luminance from rgb doesn't seem to work. I didn't
    // investigate further for now.
    // pars.format = LuminanceFormat;

    // I would have this quarter size and use it as one of the ping-pong render
    // targets but the aliasing causes some temporal flickering

    this.postprocessing.rtTextureDepth = new THREE.WebGLRenderTarget(renderTargetWidth, renderTargetHeight, { type: THREE.HalfFloatType });
    this.postprocessing.rtTextureDepthMask = new THREE.WebGLRenderTarget(renderTargetWidth, renderTargetHeight, { type: THREE.HalfFloatType });

    // The ping-pong render targets can use an adjusted resolution to minimize cost

    const adjustedWidth = renderTargetWidth * this.godrayRenderTargetResolutionMultiplier;
    const adjustedHeight = renderTargetHeight * this.godrayRenderTargetResolutionMultiplier;
    this.postprocessing.rtTextureGodRays1 = new THREE.WebGLRenderTarget(adjustedWidth, adjustedHeight, { type: THREE.HalfFloatType });
    this.postprocessing.rtTextureGodRays2 = new THREE.WebGLRenderTarget(adjustedWidth, adjustedHeight, { type: THREE.HalfFloatType });

    // god-ray shaders

    const godraysMaskShader = GodRaysDepthMaskShader;
    this.postprocessing.godrayMaskUniforms = THREE.UniformsUtils.clone(godraysMaskShader.uniforms);
    this.postprocessing.materialGodraysDepthMask = new THREE.ShaderMaterial({

      uniforms: this.postprocessing.godrayMaskUniforms,
      vertexShader: godraysMaskShader.vertexShader,
      fragmentShader: godraysMaskShader.fragmentShader

    });

    const godraysGenShader = GodRaysGenerateShader;
    this.postprocessing.godrayGenUniforms = THREE.UniformsUtils.clone(godraysGenShader.uniforms);
    this.postprocessing.materialGodraysGenerate = new THREE.ShaderMaterial({

      uniforms: this.postprocessing.godrayGenUniforms,
      vertexShader: godraysGenShader.vertexShader,
      fragmentShader: godraysGenShader.fragmentShader

    });

    const godraysCombineShader = GodRaysCombineShader;
    this.postprocessing.godrayCombineUniforms = THREE.UniformsUtils.clone(godraysCombineShader.uniforms);
    this.postprocessing.materialGodraysCombine = new THREE.ShaderMaterial({

      uniforms: this.postprocessing.godrayCombineUniforms,
      vertexShader: godraysCombineShader.vertexShader,
      fragmentShader: godraysCombineShader.fragmentShader

    });

    const godraysFakeSunShader = GodRaysFakeSunShader;
    this.postprocessing.godraysFakeSunUniforms = THREE.UniformsUtils.clone(godraysFakeSunShader.uniforms);
    this.postprocessing.materialGodraysFakeSun = new THREE.ShaderMaterial({

      uniforms: this.postprocessing.godraysFakeSunUniforms,
      vertexShader: godraysFakeSunShader.vertexShader,
      fragmentShader: godraysFakeSunShader.fragmentShader

    });

    this.postprocessing.godraysFakeSunUniforms.bgColor.value.setHex(this.bgColor);
    this.postprocessing.godraysFakeSunUniforms.sunColor.value.setHex(this.sunColor);

    this.postprocessing.godrayCombineUniforms.fGodRayIntensity.value = this.intensity;

    this.postprocessing.quad = new THREE.Mesh(
      new THREE.PlaneGeometry(1.0, 1.0),
      this.postprocessing.materialGodraysGenerate
    );
    this.postprocessing.quad.position.z = - 9900;
    this.postprocessing.scene.add(this.postprocessing.quad);

  }



  getStepSize(filterLen, tapsPerPass, pass) {

    return filterLen * Math.pow(tapsPerPass, - pass);

  }

  filterGodRays(inputTex, renderTarget, stepSize) {

    this.postprocessing.scene.overrideMaterial = this.postprocessing.materialGodraysGenerate;

    this.postprocessing.godrayGenUniforms['fStepSize'].value = stepSize;
    this.postprocessing.godrayGenUniforms['tInput'].value = inputTex;

    this.renderer.setRenderTarget(renderTarget);
    this.renderer.render(this.postprocessing.scene, this.postprocessing.camera);
    this.postprocessing.scene.overrideMaterial = null;

  }

  updateSunPosition(deltaTime) {
    this.angle += deltaTime * 0.01; // Adjust speed as needed

    // Convert angle to Cartesian coordinates
    this.sunPosition.x = Math.cos(this.angle) * 1000;
    this.sunPosition.z = Math.sin(this.angle) * 1000;
    this.sunPosition.y = 500; // Keep the height fixed

    // Make sure the object always faces the center (0,0,0)
    // this.sun.lookAt(new THREE.Vector3(0, 0, 0));
  }

  render_postProcess(camera) {

    const time = Date.now() / 4000;
    const deltaTime = this.clock.getDelta(); // Time in seconds since last frame

    this.updateSunPosition(deltaTime);

    // this.sphereMesh.position.x = this.orbitRadius * Math.cos(time);
    // this.sphereMesh.position.z = this.orbitRadius * Math.sin(time) - 100;

    if (this.postprocessing.enabled) {

      this.clipPosition.x = this.sunPosition.x;
      this.clipPosition.y = this.sunPosition.y;
      this.clipPosition.z = this.sunPosition.z;
      this.clipPosition.w = 1;

      this.clipPosition.applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix);

      // perspective divide (produce NDC space)

      this.clipPosition.x /= this.clipPosition.w;
      this.clipPosition.y /= this.clipPosition.w;

      this.screenSpacePosition.x = (this.clipPosition.x + 1) / 2; // transform from [-1,1] to [0,1]
      this.screenSpacePosition.y = (this.clipPosition.y + 1) / 2; // transform from [-1,1] to [0,1]
      this.screenSpacePosition.z = this.clipPosition.z; // needs to stay in clip space for visibility checks

      // Give it to the god-ray and sun shaders

      this.postprocessing.godrayGenUniforms['vSunPositionScreenSpace'].value.copy(this.screenSpacePosition);
      this.postprocessing.godraysFakeSunUniforms['vSunPositionScreenSpace'].value.copy(this.screenSpacePosition);

      // -- Draw sky and sun --

      // Clear colors and depths, will clear to sky color

      this.renderer.setRenderTarget(this.postprocessing.rtTextureColors);
      this.renderer.clear(true, true, false);

      // Sun render. Runs a shader that gives a brightness based on the screen
      // space distance to the sun. Not very efficient, so i make a scissor
      // rectangle around the suns position to avoid rendering surrounding pixels.

      const sunsqH = 0.74 * window.innerHeight; // 0.74 depends on extent of sun from shader
      const sunsqW = 0.74 * window.innerHeight; // both depend on height because sun is aspect-corrected

      this.screenSpacePosition.x *= window.innerWidth;
      this.screenSpacePosition.y *= window.innerHeight;

      this.renderer.setScissor(this.screenSpacePosition.x - sunsqW / 2, this.screenSpacePosition.y - sunsqH / 2, sunsqW, sunsqH);
      this.renderer.setScissorTest(true);

      this.postprocessing.godraysFakeSunUniforms['fAspect'].value = window.innerWidth / window.innerHeight;

      this.postprocessing.scene.overrideMaterial = this.postprocessing.materialGodraysFakeSun;
      this.renderer.setRenderTarget(this.postprocessing.rtTextureColors);
      this.renderer.render(this.postprocessing.scene, this.postprocessing.camera);
      this.renderer.setScissorTest(false);
      // -- Draw this.scene objects --
      // Colors
      this.scene.overrideMaterial = null;
      this.renderer.setRenderTarget(this.postprocessing.rtTextureColors);
      this.renderer.render(this.scene, camera);
      // Depth
      this.scene.overrideMaterial = this.materialDepth;
      this.renderer.setRenderTarget(this.postprocessing.rtTextureDepth);
      this.renderer.clear();
      this.renderer.render(this.scene, camera);

      this.postprocessing.godrayMaskUniforms['tInput'].value = this.postprocessing.rtTextureDepth.texture;
      this.postprocessing.scene.overrideMaterial = this.postprocessing.materialGodraysDepthMask;
      this.renderer.setRenderTarget(this.postprocessing.rtTextureDepthMask);
      this.renderer.render(this.postprocessing.scene, this.postprocessing.camera);
      // -- Render god-rays --
      // Maximum length of god-rays (in texture space [0,1]X[0,1])
      const filterLen = 1.0;
      // Samples taken by filter
      const TAPS_PER_PASS = 6.0;
      // Pass order could equivalently be 3,2,1 (instead of 1,2,3), which
      // would start with a small filter support and grow to large. however
      // the large-to-small order produces less objectionable aliasing artifacts that
      // appear as a glimmer along the length of the beams
      // pass 1 - render into first ping-pong target
      this.filterGodRays(this.postprocessing.rtTextureDepthMask.texture, this.postprocessing.rtTextureGodRays2, this.getStepSize(filterLen, TAPS_PER_PASS, 1.0));
      // pass 2 - render into second ping-pong target
      this.filterGodRays(this.postprocessing.rtTextureGodRays2.texture, this.postprocessing.rtTextureGodRays1, this.getStepSize(filterLen, TAPS_PER_PASS, 2.0));
      // pass 3 - 1st RT
      this.filterGodRays(this.postprocessing.rtTextureGodRays1.texture, this.postprocessing.rtTextureGodRays2, this.getStepSize(filterLen, TAPS_PER_PASS, 3.0));
      // final pass - composite god-rays onto colors
      this.postprocessing.godrayCombineUniforms['tColors'].value = this.postprocessing.rtTextureColors.texture;
      this.postprocessing.godrayCombineUniforms['tGodRays'].value = this.postprocessing.rtTextureGodRays2.texture;
      this.postprocessing.scene.overrideMaterial = this.postprocessing.materialGodraysCombine;
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.postprocessing.scene, this.postprocessing.camera);
      this.postprocessing.scene.overrideMaterial = null;
    } else {
      this.renderer.setRenderTarget(null);
      this.renderer.clear();
      this.renderer.render(this.scene, camera);
    }
  }
}

export { GodRays };

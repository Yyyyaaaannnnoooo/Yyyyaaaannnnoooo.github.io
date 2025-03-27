import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// import vertexShader from './shaders/datamosh.vert';
// import fragmentShader from './shaders/datamosh.frag';


class DataMosh {
  constructor(renderer, scene, camera) {
    // Postprocessing setup
    this.composer = new EffectComposer(renderer);
    console.log(this.composer);
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);
    this.datamoshShader = null;
    this.datamoshPass = null;
    this.previousFrame = null;
    this.loaded = false;

    this.lastCameraPosition = new THREE.Vector3();
    this.motionVector = new THREE.Vector2();
  }

  load() {
    const loader = new THREE.FileLoader();

    loader.load('./js/shaders/datamosh.vert', (vertexShader) => {
      // console.log(vertexShader);
      loader.load('./js/shaders/datamosh.frag', (fragmentShader) => {
        console.log(fragmentShader);
        this.datamoshShader = {
          uniforms: {
            tDiffuse: { value: null },
            tPreviousFrame: { value: null },
            time: { value: 0 },
            strength: { value: 0.5 },
            motion: { value: new THREE.Vector2(0, 0) }
          },
          vertexShader,
          fragmentShader
        };

        this.datamoshPass = new ShaderPass(this.datamoshShader);
        console.log(this.datamoshPass);
        this.composer.addPass(this.datamoshPass);
        this.previousFrame = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
        this.loaded = true;
        console.log('shaders loaded');
      });
    });
  }

  updateMotionVector(camera) {
    this.motionVector.set(
      camera.position.x - this.lastCameraPosition.x,
      camera.position.y - this.lastCameraPosition.y
    );
    this.lastCameraPosition.copy(camera.position);
  }

  render(camera, scene, renderer) {
    // Swap textures
    if (this.loaded) {
      this.updateMotionVector(camera);
      if (this.datamoshPass.uniforms.motion) {
        this.datamoshPass.uniforms.motion.value.set(this.motionVector.x, this.motionVector.y);
      } else {
        console.error("motion uniform is undefined");
      }
      // this.datamoshPass.uniforms.motion.value.set(motionVector.x, motionVector.y);
      if (this.motionVector.lengthSq() > 0.0001) {
        this.datamoshPass.uniforms.tPreviousFrame.value = this.previousFrame.texture;
        this.datamoshPass.uniforms.time.value = performance.now() / 1000;

        renderer.setRenderTarget(this.previousFrame);
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);
      }
      this.composer.render();
      this.previousFrame = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
    }
  }

}

export { DataMosh }
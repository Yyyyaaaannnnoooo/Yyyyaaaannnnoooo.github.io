import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

class NPC {
  constructor(scene, fbx_path, texture_path, pos, quat) {
    this.scene = scene;
    this.fbx_path = fbx_path;
    this.texture_path = texture_path;
    this.mixer = null;
    this.clone_mixer = null;
    this.model = null;
    this.clock = new THREE.Clock();
    this.pos = pos
    this.quat = quat
    this.texture = null
    this.fbx_animations = {
      defeat: { url: 'js/3d/fbx/Defeated.fbx', clip: null },
      yell: { url: 'js/3d/fbx/Yelling.fbx', clip: null },
      sad: { url: 'js/3d/fbx/Sad-Idle.fbx', clip: null },
      talk: { url: 'js/3d/fbx/Talking.fbx', clip: null },
      sit: { url: 'js/3d/fbx/Sitting-Idle.fbx', clip: null },
      // lay: { url: 'js/3d/fbx/Laying-Idle.fbx', clip: null },
    }
    this.clips = {}
    this.loaded = false
    this.debug = null
    this.box
    this.center
  }

  load() {
    const loader = new FBXLoader();
    loader.load(this.fbx_path, (object) => {
      this.model = object;

      this.mixer = new THREE.AnimationMixer(this.model);

      object.animations.forEach((clip) => {
        this.mixer.clipAction(clip).play();
      });
      this.model.scale.set(0.005, 0.005, 0.005);
      this.model.updateMatrixWorld(true);
      this.model.userData = { is_npc: true };
      this.add_texture(this.texture_path);
      this.set_pos(this.pos);
      this.model.position.x += 2
      this.model.position.y -= 1
      this.set_quaternion(this.quat);
      this.model.rotation.y += -Math.PI/1.5;
      this.scene.add(this.model);
      const anim_arr = Object.keys(this.fbx_animations);
      let i = 0;
      anim_arr.forEach(key => {
        const last = i === anim_arr.length - 1;
        this.load_animation(this.fbx_animations[key], key, last);
        i++;
      });
    }, undefined, (error) => {
      console.error('An error happened while loading the FBX model:', error);
    });
  }

  load_animation(animation, name, last) {
    const loader = new FBXLoader();
    loader.load(animation.url, (anim) => {
      const clip = anim.animations[0]; // Get animation clip
      clip.name = name; // Assign a name to the animation
      // console.log(clip);
      this.model.animations.push(clip)
      this.fbx_animations[name].clip = clip
      this.mixer.clipAction(clip, this.model); // Apply animation
      if (last) {
        console.log('last clip loaded');
        // this.play_animation('yell');
        // this.load_clone()
        this.loaded = true
      }
    });
  }

  play_animation(name) {
    // this.mixer.stopAllAction();
    this.mixer._actions.forEach((action) => {
      if (action.isRunning()) {
        action.fadeOut(0.5); // Fade out the current animation over 0.5s
      }
    });
    const clip = THREE.AnimationClip.findByName(this.model.animations, name);
    if (clip) {
      const action = this.mixer.clipAction(clip);
      action.reset().fadeIn(0.5).play(); // Smooth transition
    } else {
      console.warn(`Animation "${name}" not found or not loaded yet.`);
    }
  }

  get_model() {
    return this.model;
  }

  add_texture(url) {
    const texture_loader = new THREE.TextureLoader();
    this.texture = texture_loader.load(url, dither => {

      dither.wrapS = THREE.RepeatWrapping;
      dither.wrapT = THREE.RepeatWrapping;
      dither.rotation = Math.PI / 2;
      dither.offset = new THREE.Vector2(0, 10)
      dither.repeat.set(3, 10);
      this.model.traverse(function (child) {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.material = new THREE.MeshStandardMaterial({map: dither})
        }
      });
    })
  }

  set_pos(pos) {
    this.model.position.x = pos.x
    this.model.position.y = pos.y
    this.model.position.z = pos.z
    this.model.updateMatrixWorld(true);

  }

  set_quaternion(quat) {
    this.model.quaternion.copy(quat)
    this.model.updateMatrixWorld(true);
  }

  update() {
    if (this.mixer) {
      const delta = this.clock.getDelta();
      this.mixer.update(delta);
    }
  }
}

export { NPC };
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

class NPC {
  constructor(info, id, data, animation) {
    // console.log(info);
    this.synth = window.speechSynthesis;
    this.synth_voice = null;
    this.html = document.querySelector('.dialogue')
    this.scene = info.scene;
    this.fbx_path = info.fbx_path;
    this.texture_path = info.texture_path;
    this.mixer = null;
    this.clone_mixer = null;
    this.model = null;
    this.clock = new THREE.Clock();
    this.pos = info.pos
    console.log(`${data.name} has been placed x: ${this.pos.x} y: ${this.pos.z}`);
    this.quat = info.quat
    this.texture = null
    this.anim = animation || null
    this.fbx_animations = {
      mutant: { url: 'js/3d/fbx/npc/Mutant-Breathing-Idle.fbx', clip: null },
      yell: { url: 'js/3d/fbx/npc/Defeated.fbx', clip: null },
      hold: { url: 'js/3d/fbx/npc/Holding-Idle.fbx', clip: null },
      // dle: { url: 'js/3d/fbx/npc/Idle3.fbx', clip: null },
      pray: { url: 'js/3d/fbx/npc/Praying.fbx', clip: null },
      look: { url: 'js/3d/fbx/npc/Idle-Looking.fbx', clip: null },
    }
    this.clips = {}
    this.loaded = false
    this.debug = null
    this.box
    this.center
    this.spot_light = null;
    this.spot_light_target = new THREE.Object3D();
    this.frustum = new THREE.Frustum();
    this.cameraViewProjectionMatrix = new THREE.Matrix4();

    // quest stuff
    this.id = id;
    this.name = data.name;
    this.voice = data.voice || "Grandma"
    this.dialogues = data.dialogues; // Organized by quest
    this.idle_chatter = data.idle_chatter
    this.in_view = false
    this.dialogueState = {}; // Track progress per quest
    this.dialogueExhausted = {}; // Track exhaustion per quest
    this.dialogue_part = "part1"
    this.onDialogueExhausted = data.onDialogueExhausted; // Callback for quest progression
    this.currentQuest = null
    // Initialize tracking per quest
    Object.keys(this.dialogues).forEach(questId => {
      const dialogues = this.dialogues[questId]
      this.dialogueState[questId] = {}
      this.dialogueExhausted[questId] = {}
      Object.keys(dialogues).forEach(part => {
        this.dialogueState[questId][part] = 0;
        this.dialogueExhausted[questId][part] = false;
      }
      )
    });


    this.voice_list()

  }
  voice_list() {
    const voices = this.synth.getVoices();
    // getVoices() returns an empty array when called immediately after page load
    // so we need to wait for the voices to be loaded
    if (voices.length === 0) {
      console.log('no voices loaded yet');
      this.synth.addEventListener('voiceschanged', () => {
        this.voice_list();
      });
      return;
    }
    const filtered = voices.filter(item => item.lang.includes('en'))
    // console.log(filtered);
    // add a filter that finds whispering voices
    const deep_filtering = filtered.filter(item => item.name.startsWith(this.voice))
    this.synth_voice = deep_filtering[0]
  }

  set_spot_light() {
    this.spot_light = new THREE.SpotLight(0xffffff,  100);
    // this.spot_light.position.set(2.5, 5, 2.5);
    this.spot_light.angle = Math.PI / 6;
    this.spot_light.penumbra = 1;
    this.spot_light.decay = 1;
    this.spot_light.distance = 6;

    this.spot_light.castShadow = true;
    this.spot_light.shadow.mapSize.width = 1024;
    this.spot_light.shadow.mapSize.height = 1024;
    this.spot_light.shadow.camera.near = 0.5;
    this.spot_light.shadow.camera.far = 10000;
    this.spot_light.shadow.focus = 1;
    this.spot_light.shadow.camera.updateProjectionMatrix()

    // add light on top of npc
    this.spot_light.position.x = this.model.position.x;
    this.spot_light.position.y = this.model.position.y + 5;
    this.spot_light.position.z = this.model.position.z;

    this.spot_light_target.position.set(this.model.position.x, this.model.position.y, this.model.position.z);
    // this.scene.add(this.spot_light_target);
    this.spot_light.target = this.spot_light_target;
    this.scene.add(this.spot_light.target);
    this.scene.add(this.spot_light);
  }

  load() {
    const loader = new FBXLoader();
    loader.load(this.fbx_path, (object) => {
      this.model = object;
      this.mixer = new THREE.AnimationMixer(this.model);
      object.animations.forEach((clip) => {
        this.mixer.clipAction(clip).play();
      });
      const scale = 0.0075;
      // const scale = 1;
      this.model.scale.set(scale, scale, scale);
      this.model.updateMatrixWorld(true);
      this.model.userData = { is_npc: true, npc: this };
      this.add_texture(this.texture_path);
      this.set_pos(this.pos);
      this.model.position.x += 2
      this.model.position.y -= 1
      this.set_quaternion(this.quat);
      this.model.rotation.y += -Math.PI / 1.5;
      this.scene.add(this.model);


      // this.set_spot_light()

      // this.spot_light.lookAt(this.model.position);
      // this.scene.add(this.spot_light)
      // const helper = new THREE.SpotLightHelper(this.spot_light);
      // this.scene.add(helper);

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
        // console.log('last clip loaded');
        this.loaded = true
        // if (this.anim !== null) this.play_animation(this.anim);

        // wait 2 seconds and play idle
        setTimeout(() => {
          if (this.anim !== null) this.play_animation(this.anim);
        }, 2000);

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
    texture_loader.load(url, (dither) => {
      this.texture = dither
      // console.log(dither);
      dither.wrapS = THREE.RepeatWrapping;
      dither.wrapT = THREE.RepeatWrapping;
      dither.repeat.set(2, 2);
      this.model.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.material.dispose()
          child.material = new THREE.MeshStandardMaterial({
            map: dither,
            metalness: 0,
            roughness: 0
          })
          // console.log(child.material);
        }
      });
    })
  }

  set_pos(pos) {
    this.model.position.x = pos.x
    this.model.position.y = pos.y
    this.model.position.z = pos.z
    this.model.updateMatrixWorld(true);
    // console.log(this.model);
  }

  set_quaternion(quat) {
    this.model.quaternion.copy(quat)
    this.model.updateMatrixWorld(true);
  }

  // Check if NPC is visible
  is_visible(camera) {
    if (this.loaded === false) { return false }
    camera.updateMatrixWorld(); // Ensure the camera is updated
    this.cameraViewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.cameraViewProjectionMatrix);

    if (!this.model) return false;

    // Find the main mesh in the FBX model
    let mainMesh = this.model.children.find(child => child.isMesh);

    if (!mainMesh) {
      console.warn(`NPC ${this.model.name} has no mesh.`);
      return false;
    }

    // Ensure it has a bounding box
    if (!mainMesh.geometry.boundingBox) {
      mainMesh.geometry.computeBoundingBox();
    }

    return this.frustum.intersectsObject(mainMesh);

    // return this.frustum.intersectsObject(this.model);
  }

  update(camera) {
    if (this.mixer && this.is_visible(camera)) {
      const delta = this.clock.getDelta();
      this.mixer.update(delta);
      // this.model.lookAt(camera.position)
      this.model.rotation.y = Math.atan2((camera.position.x - this.model.position.x), (camera.position.z - this.model.position.z));
    }
  }

  select_random_chatter() {
    const len = this.idle_chatter.length;
    let random_index = Math.floor(Math.random() * len)
    if (random_index >= len) { random_index = len - 1 }
    return this.idle_chatter[random_index]
  }

  get_dialogue(quest) {
    if (!this.dialogues[quest]) {
      // console.log("no active quest");
      // this.idle_speak();
      return false
    }
    return this.dialogues[quest][this.dialogue_part]
  }
  get_dialogue_state(quest) {
    return this.dialogueState[quest][this.dialogue_part]
  }
  get_dialogue_exhausted(quest) {
    return this.dialogueExhausted[quest][this.dialogue_part]
  }

  reset_dialogue_part() {
    this.dialogue_part = "part1"
  }

  set_dialogue_part(part) {
    this.dialogue_part = part
  }

  talk(currentQuest) {
    // console.log(currentQuest);
    // console.log(this.dialogues[currentQuest]);
    if (!this.get_dialogue(currentQuest)) {
      console.log(`idle chatter bc there is no dialogue for quest: ${currentQuest}`);
      this.idle_speak()
      return;
    }

    if (this.get_dialogue_state(currentQuest) < this.get_dialogue(currentQuest).length) {
      const txt = `${this.name}:\n "${this.get_dialogue(currentQuest)[this.get_dialogue_state(currentQuest)]}"`
      // console.log(this.dialogueState);
      this.html.textContent = txt;
      this.speak(this.get_dialogue(currentQuest)[this.get_dialogue_state(currentQuest)])
      // this.get_dialogue_state(currentQuest)++;
      this.dialogueState[currentQuest][this.dialogue_part]++
    } else {
      this.idle_speak()
    }

    // If last dialogue is reached, mark as exhausted and trigger quest update
    if (this.get_dialogue_state(currentQuest) >= this.get_dialogue(currentQuest).length && !this.get_dialogue_exhausted(currentQuest)) {
      // this.get_dialogue_exhausted(currentQuest) = true;
      this.dialogueExhausted[currentQuest][this.dialogue_part] = true
      // console.log(`${this.name} has finished their dialogue for ${currentQuest} ${this.dialogue_part}.`);
      if (this.onDialogueExhausted) {
        this.onDialogueExhausted(this.id, currentQuest);
      }
    }
  }

  idle_speak() {
    const idle = this.select_random_chatter()
    const txt = `${this.name}: ${idle}`
    // console.log(txt);
    this.html.textContent = txt;
    this.speak(idle)
  }

  speak(txt) {
    this.synth.cancel();
    const utterThis = new SpeechSynthesisUtterance(txt);
    utterThis.voice = this.synth_voice;
    utterThis.pitch = 1.0;
    utterThis.rate = 0.85;
    this.synth.speak(utterThis);
  }

  cancel_dialogue() {
    this.html.innerHTML = '';
    this.synth.cancel();
  }

}

export { NPC };




// class NPC {
//   constructor(id, data) {
//     this.id = id;
//     this.name = data.name;
//     this.dialogues = data.dialogues; // Organized by quest
//     this.dialogueState = {}; // Track progress per quest
//     this.dialogueExhausted = {}; // Track exhaustion per quest
//     this.onDialogueExhausted = data.onDialogueExhausted; // Callback for quest progression

//     // Initialize tracking per quest
//     Object.keys(this.dialogues).forEach(questId => {
//       this.dialogueState[questId] = 0;
//       this.dialogueExhausted[questId] = false;
//     });
//   }


// }
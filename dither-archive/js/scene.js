import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Water } from 'three/addons/objects/Water.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
// import { Tween, Easing } from 'https://unpkg.com/@tweenjs/tween.js@23.1.3/dist/tween.esm.js';
import Stats from 'three/addons/libs/stats.module.js';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

import { GodRays } from './post-process.js'
import { DataMosh } from './data-mosh-fx.js';
import { NPC } from './npc.js'
// import './helper-functions.js'
import { Dithers } from './dithers.js';
import { DitherCubes } from './dither-cubes.js';
import { QuestManager } from './quest-manager.js';
import { AudioComponent } from './audio-component.js';
let questManager = null


// Create Player Instance
let player = null

const game_loaded = {
  dithers: false,
  scene: false,
  npcs: false,
  audio: false,
}
// const npcs = []
let npcs = null
let npcs_loaded = false
let npc = null
let gr = null
let data_mosh = null
const stats = new Stats();
document.body.appendChild(stats.dom);

const canvas = document.querySelector('#c');
let camera, scene, renderer, controls, face, model_height;
let sound, listener, gui, mixer, actions, activeAction, previousAction, clock;
let sound_paused = true;
let sound_playing = false;

const api = { state: 'Idle' };
// let texture, material
let shader_material
let object = null;
let renderTarget = undefined
let debug = false
let debug_mesh = null;

// post processing
let composer;
let postprocessing = false
let scene_loaded = false
let water = undefined, sun, sky;
let pmremGenerator
let sceneEnv
const sun_param = {
  elevation: -1,
  azimuth: 180
};
const params = {
  threshold: 0.125,
  strength: 0.125,
  radius: 1,
  exposure: 1
};

// Raycaster for click detection
let raycaster;
const camera_raycaster = new THREE.Raycaster();
const mesh_raycaster = new THREE.Raycaster();
const mouse_raycaster = new THREE.Raycaster();
const center_point = new THREE.Vector2(0, 0);
const crosshair = document.querySelector('.crosshair');
let prev_src = ''
const main_div = document.querySelector('.main');
let controls_enabled = false;
const down_vector = new THREE.Vector3(0, -1, 0);
let terrainTilt = new THREE.Quaternion(); // Stores terrain rotation
const pointer = new THREE.Vector2();
let flippedCards = new Set();
let tween = null;
let terrain = null;
let vertices;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;

let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();


const NUM_IMAGES = 6524;
const dither_json_url = 'image_tsne_clusters.json';
const dither_url = 'imgs/media/dither-';
const normal_url = 'imgs/normals/normal_dither-';
let selection_url = null;
let neighbours = null;
let last_target = null;
let target_mesh = null;
const postcards = [];
let dither_urls = [];
const w = 2;
const spacing = w * 2.25;
const mesh_size = w;
// const selection_geom = new THREE.BoxGeometry(w * 1.15, w * 1.15, w * 1.15);
// const selection_material = new THREE.MeshStandardMaterial({ color: 0x33ff33, emissive: 0x33ff33, intensity: 2 })
// const selection = new THREE.Mesh(selection_geom, selection_material)
const rows = 81;
const center_x = (rows - 1) / 2;
const center_y = (rows - 1) / 2;
const RADIUS = 10 * spacing;
const NUM_OF_MESHES_TO_LOAD = 30 * spacing
const bg_color = document.body.style;

let cluster_centers

let npc_interaction = false
let current_npc = null


const manager = new THREE.LoadingManager();
const loader = new FBXLoader(manager);

const spotLight = new THREE.SpotLight(0xffffff, 2);
const pointLight = new THREE.PointLight(0xffffff, 20);
const spotTarget = new THREE.Object3D();
let sunLight

const old_neighbours = []

for (let i = 0; i < NUM_IMAGES; i += 14) {
  // add to old_neighbours an array from 0 to 13
  const tmp = []
  for (let j = i; j < i + 14; j++) {
    tmp.push(j)
  }
  old_neighbours.push(tmp)
}
const loader_symbols = ["/", "-", "\\", "|"];
let loader_count = 0;
const update_loaders = setInterval(() => {
  const loaders = document.querySelectorAll(".loader")
  const symbol = loader_symbols[loader_count];
  loaders.forEach(loader => loader.textContent = symbol)
  loader_count++;
  if (loader_count >= loader_symbols.length) {
    loader_count = 0
  }
}, 50)

const game_loader = setInterval(() => {
  if (check_game_loaded()) {
    console.log("🪼 GAME LOADED");
    clearInterval(game_loader)
    // remove splash screen
    // this could also become to add a button to start the game
    // and show a bit of text explaining the game
    const splash = document.querySelector(".splash")
    splash.style.display = "none"
  }
}, 50)

function check_game_loaded() {
  return Object.values(game_loaded).every(item => item === true)
}



// function that takes an index as input and return the neighbours
function get_neighbours(index) {
  // check if index is in the range of 0 to 6523
  if (index < 0 || index > 6523) {
    console.log('index out of range');
    return null
  }
  // check if index is in the old_neighbours array
  for (let i = 0; i < old_neighbours.length; i++) {
    if (old_neighbours[i].includes(index)) {
      // return the neighbours
      const neighbours = old_neighbours[i].filter(num => num !== index);
      return neighbours
    }
  }
  // if index is not in the old_neighbours array, return null
  console.log('index not found in old_neighbours');
  return null
}


function getNeighbouringNumbers(num) {
  const min = 0;
  const max = 6523;
  const range = 14;
  // Calculate start and end ensuring boundaries are not exceeded
  let start = Math.max(num - Math.floor(range / 2), min);
  let end = start + range - 1;
  // If end exceeds max, shift the range back
  if (end > max) {
    end = max;
    start = Math.max(end - range + 1, min);
  }
  // Generate the range
  return Array.from({ length: range }, (_, i) => start + i);
}



// let open = false;
const btn = document.querySelector('.btn')
btn.addEventListener('click', () => {
  main_div.style.visibility = 'hidden'
  controls.enabled = true;
  renderer.domElement.requestPointerLock();
});



const dithers = new Dithers()
dithers.load();

const check_dither_loading = setInterval(() => {
  if (dithers.loaded === true) {
    console.log("✅ dithers are loaded");
    clearInterval(check_dither_loading);
    // PROGRES LOADING SEQUENCE
    const dither_info = document.querySelector("#dither-info")
    dither_info.innerHTML = ''
    dither_info.textContent = "Loaded"
    game_loaded.dithers = true
    init()
  }
})


const save = document.querySelector(".save")
// save.removeEventListener('click', save_image)
save.addEventListener("click", save_image)



function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  if (gr) gr.PostProcess_onWindowResize();
}

// ✅ Detect mouse clicks
canvas.addEventListener("click", (event) => {
  // check_object_in_crosshair();
  if (selection_url !== null && npc_interaction === false) {
  }
  show_dither();
  if (npc_interaction === true) {
    progress_npc_interaction();
  }
});

function init() {
  // console.log('init');
  init_scene();
  init_renderer();
  // Load and play background music
  init_audio();
  build_terrain();
  clock = new THREE.Clock();
  add_sun();
  init_first_person_controls();
  init_3d_models();
  init_world_landmarks()
  window.addEventListener('resize', onWindowResize);
  window.dithers = dithers

  // Progress Loading
  const scene_info = document.querySelector("#scene-info")
  scene_info.innerHTML = ''
  scene_info.textContent = "Loaded"
  game_loaded.scene = true
  // init_map_controls();
  // init_post_process();
  // gr = new GodRays(scene, renderer);
  // gr.init_post_process();
  // data_mosh = new DataMosh(renderer, scene, camera)
  // data_mosh.load()
  // make_water();
  // add_spotligt();
  // add_pointlight();
  // skybox();
  // bloom_pass_composer();
  // init_controls();
  // init_map_controls();

  if (debug) {
    // load the debug mesh as plane
    console.log('debug mode');
    // const geometry = new THREE.PlaneGeometry(10, 10);
    // make the geometry a cube
    const geometry = new THREE.BoxGeometry(25, 0.1, 25);
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    debug_mesh = new THREE.Mesh(geometry, material);
    console.log(debug_mesh);
    update_debug_pos();
    scene.add(debug_mesh);
  }
  // player.show_debug(scene)
}

function animate(timestamp) {
  requestAnimationFrame(animate);
  first_person_camera_animation();
  if (debug) update_debug_pos();
  stats.update(); // Update FPS counter
  updateCameraHeight();
  check_object_in_crosshair();
  if (npcs_loaded) {
    update_npcs_animations();
    for (let i = 0; i < dithers.cluster_centers.length; i++) {
      const landmark = dithers.cluster_centers[i].mesh
      landmark.material.uniforms.uTime.value += 0.25;
      landmark.lookAt(camera.position)
    }
    set_background(camera.position);
    render();
  }

  // if (water !== undefined) water.material.uniforms['time'].value += 1.0 / (60.0 * 10);
  // if (terrain !== undefined) terrain.material.uniforms['time'].value += 1.0 / (60.0 * 10);
  // updateSun();
  // if (tween != null) tween.update();

  // check_distance_with_npcs();
  // update_spotlight();
  // update_pointlight();
  // const delta = clock.getDelta();
  // if (mixer) mixer.update(delta);
  // if (npc) {
  //   npc.update()
  // }

  // update_sun_position()

  // sunLight.position.x = camera.position.x
  // sunLight.position.z = camera.position.z
}

function render() {
  if (!postprocessing) {
    // godrays post processing
    if (gr) {
      gr.render_postProcess(camera);
    } else {
      renderer.render(scene, camera);
    }
    // gr.render_postProcess(camera);
    // data_mosh.render(camera, scene, renderer)
  } else {
    composer.render()
  }
}

//           :::     ::::    ::: :::::::::::   :::   :::       ::: ::::::::::: ::::::::::: ::::::::  ::::    :::  :::::::: 
//        :+: :+:   :+:+:   :+:     :+:      :+:+: :+:+:    :+: :+:   :+:         :+:    :+:    :+: :+:+:   :+: :+:    :+: 
//      +:+   +:+  :+:+:+  +:+     +:+     +:+ +:+:+ +:+  +:+   +:+  +:+         +:+    +:+    +:+ :+:+:+  +:+ +:+         
//    +#++:++#++: +#+ +:+ +#+     +#+     +#+  +:+  +#+ +#++:++#++: +#+         +#+    +#+    +:+ +#+ +:+ +#+ +#++:++#++   
//   +#+     +#+ +#+  +#+#+#     +#+     +#+       +#+ +#+     +#+ +#+         +#+    +#+    +#+ +#+  +#+#+#        +#+    
//  #+#     #+# #+#   #+#+#     #+#     #+#       #+# #+#     #+# #+#         #+#    #+#    #+# #+#   #+#+# #+#    #+#     
// ###     ### ###    #### ########### ###       ### ###     ### ###     ########### ########  ###    ####  ########       

function ___ANIMATION_STUFF() { }

function update_debug_pos() {
  debug_mesh.position.y = -5;
  debug_mesh.position.x = camera.position.x;
  debug_mesh.position.z = camera.position.z;
}

function set_background(position) {
  let totalWeight = 0;
  let blendedColor = new THREE.Color(0x000000); // Start with black
  position = new THREE.Vector3(position.x, 0, position.z)
  dithers.cluster_centers.forEach(item => {
    const point = new THREE.Vector3(item['center'].x * spacing, 0, item['center'].y * spacing)
    const color = item['color']
    const distance = position.distanceTo(point);
    const weight = 1 / Math.pow(distance + 0.1, 2); // Avoid divide by zero
    // console.log(distance, weight);
    totalWeight += weight;

    blendedColor.r += color.r * weight;
    blendedColor.g += color.g * weight;
    blendedColor.b += color.b * weight;
    // blendedColor.r = color.r * weight;
    // blendedColor.g = color.g * weight;
    // blendedColor.b = color.b * weight;
  });
  // console.log(totalWeight);
  blendedColor.r /= totalWeight;
  blendedColor.g /= totalWeight;
  blendedColor.b /= totalWeight;

  // return blendedColor;
  // console.log(blendedColor);
  const c = { h: 0, s: 0, l: 0 }
  const v = blendedColor.getHSL(c)
  // console.log(v);
  const col = 0.5 * v.l;
  const bg_color = new THREE.Color(col, col, col)
  // gr.set_color(bg_color)
  if (scene.fog) scene.fog.color = bg_color;
  scene.background = bg_color;
}

//       :::::::::   ::::::::  :::    :::          ::::::::::: ::::    ::: ::::::::::: :::::::::: :::::::::      :::      :::::::: ::::::::::: ::::::::::: ::::::::  ::::    :::  :::::::: 
//      :+:    :+: :+:    :+: :+:    :+:              :+:     :+:+:   :+:     :+:     :+:        :+:    :+:   :+: :+:   :+:    :+:    :+:         :+:    :+:    :+: :+:+:   :+: :+:    :+: 
//     +:+    +:+ +:+    +:+  +:+  +:+               +:+     :+:+:+  +:+     +:+     +:+        +:+    +:+  +:+   +:+  +:+           +:+         +:+    +:+    +:+ :+:+:+  +:+ +:+         
//    +#++:++#+  +#+    +:+   +#++:+                +#+     +#+ +:+ +#+     +#+     +#++:++#   +#++:++#:  +#++:++#++: +#+           +#+         +#+    +#+    +:+ +#+ +:+ +#+ +#++:++#++   
//   +#+    +#+ +#+    +#+  +#+  +#+               +#+     +#+  +#+#+#     +#+     +#+        +#+    +#+ +#+     +#+ +#+           +#+         +#+    +#+    +#+ +#+  +#+#+#        +#+    
//  #+#    #+# #+#    #+# #+#    #+#              #+#     #+#   #+#+#     #+#     #+#        #+#    #+# #+#     #+# #+#    #+#    #+#         #+#    #+#    #+# #+#   #+#+# #+#    #+#     
// #########   ########  ###    ###          ########### ###    ####     ###     ########## ###    ### ###     ###  ########     ###     ########### ########  ###    ####  ########       

function ___DITHER_BOXES_INTERACTIONS() { }

function get_closest_meshes(count = 30) {
  // set loaded to false in dithers.data
  // console.log("load meshes");
  dithers.data.forEach(key => key.loaded = false)
  // Convert camera position to a vector (assuming camera is at y = 0)
  const camera_pos = new THREE.Vector2(camera.position.x, camera.position.z);
  // Compute distances and sort by closest first
  dithers.data = dithers.data
    .map(mesh => {
      const mesh_pos = new THREE.Vector2(mesh.x * spacing, mesh.y * spacing); // Assuming 2D plane (z = 0)
      const distance = camera_pos.distanceTo(mesh_pos);
      return { ...mesh, distance }; // Add distance property
    })
    .sort((a, b) => a.distance - b.distance) // Sort by distance
  // const sorted_meshes = dithers.data.slice(0, count); // Get the closest 30
  const result = []
  // set the first 30 meshes to loaded
  for (let i = 0; i < count; i++) {
    const obj = dithers.data[i];
    obj.loaded = true;
    result.push(obj)
  }

  return result;
}

function get_closest_texture(x, y) {
  // const result = dithers.data.filter(dither => dither.x === x && dither.y === y)
  const result = dithers.data.map(dither => {
    const dither_pos = new THREE.Vector2(dither.x, dither.y);
    const pos = new THREE.Vector2(x, y);
    const dist = pos.distanceTo(dither_pos)
    return { ...dither, dist }
  })
    .sort((a, b) => a.dist - b.dist)
  // console.log(result);
  return result[0].url
}



function get_meshes_within_radius(radius) {
  // console.log('radius: ', radius);
  const result = [];
  // dithers.data.forEach(key => key.loaded = false);
  for (let i = 0; i < dithers.data.length; i++) {
    const obj = dithers.data[i];
    obj.loaded = false;
  }
  for (let i = 0; i < dithers.data.length; i++) {
    const obj = dithers.data[i];
    const mesh_pos = new THREE.Vector2(obj.x * spacing, obj.y * spacing);
    const camera_pos = new THREE.Vector2(camera.position.x, camera.position.z);
    const dist = camera_pos.distanceTo(mesh_pos);
    // console.log(dist);
    if (dist < radius) {
      obj.loaded = true;
      result.push(obj)
    }
  }
  return result;
}



function basic_texture_load(list) {
  for (let i = 0; i < list.length; i++) {
    const obj = list[i];
    const image_url = obj.url;
    const og_index = obj.og_index;
    // console.log(og_index);
    // const normal_url = obj.normal_url;
    const texture_loader = new THREE.TextureLoader();
    // check whether mesh alrready exists
    if (obj.mesh === null) {
      const geometry = new THREE.BoxGeometry(w, w, w);
      let front_material = new THREE.MeshStandardMaterial({});
      front_material = new THREE.MeshBasicMaterial({});
      const dither_img = new THREE.Mesh(geometry, front_material);
      dither_img.castShadow = true;
      dither_img.receiveShadow = true;
      // dither_img.position.x = (obj.x - center_x) * spacing;
      // dither_img.position.z = (obj.y - center_y) * spacing;
      dither_img.position.x = obj.x * (spacing);
      dither_img.position.z = obj.y * (spacing);
      // dither_img.position.x = obj.x;
      // dither_img.position.z = obj.y;
      const placement = get_mesh_placement(dither_img.position.x, dither_img.position.z);
      dither_img.position.y = (obj.z * w) + placement.y;
      // if(obj.z >0){
      //   console.log('TOWER!');
      // }
      dither_img.quaternion.copy(placement.quat);
      obj.mesh = dither_img;
      dither_img.name = 'dither'
      dither_img.userData["neighbours"] = get_neighbours(og_index)
      scene.add(dither_img);

      texture_loader.load(image_url,
        (texture_dither) => {
          // console.log('texture loaded');
          if (dither_img.material) {
            dither_img.material.dispose();
          }
          dither_img.material = new THREE.MeshStandardMaterial({
            map: texture_dither,
          });
        });

      // }
    }
  }
}

function get_mesh_placement(x, z) {
  const result = { y: 0, quat: new THREE.Quaternion() };
  if (terrain === null) {
    return result;
  }
  // Raycast from above to find terrain height at (x, z)
  mesh_raycaster.set(new THREE.Vector3(x, 100, z), down_vector);
  const intersects = mesh_raycaster.intersectObject(terrain);
  if (intersects.length > 0) {
    // mesh.position.set(x, intersects[0].point.y + cubeSize / 2, z);
    // scene.add(cube);
    result.y = intersects[0].point.y + (w / 2);
    // Create a quaternion rotation from normal vector
    const normal = intersects[0].face.normal; // Terrain surface normal
    const upVector = new THREE.Vector3(0, 1, 0); // Default "up" direction
    const quaternion = new THREE.Quaternion().setFromUnitVectors(upVector, normal);
    result.quat = quaternion;
    // cube.quaternion.copy(quaternion); // Apply rotation
  }
  return result;
}

function unload_meshes() {
  for (let i = 0; i < dithers.data.length; i++) {
    const obj = dithers.data[i];
    if (obj.loaded == false) {
      if (obj.mesh != null) {

        // console.log(obj);
        obj.mesh.geometry.dispose();
        obj.mesh.material.dispose();
        scene.remove(obj.mesh);
        // obj.loaded = false;
        obj.mesh = null;
      }
    }
  }

  // for (let i = 0; i < rows; i++) {
  //   for (let j = 0; j < rows; j++) {
  //     const index = i * rows + j;
  //     if (index >= NUM_IMAGES) {
  //       break;
  //     }
  //     const obj = dithers.data[i][j];
  //     if (obj.loaded === false) {
  //       if (obj.mesh !== null) {
  //         // console.log(obj);
  //         obj.mesh.geometry.dispose();
  //         obj.mesh.material.dispose();
  //         scene.remove(obj.mesh);
  //         // obj.loaded = false;
  //         obj.mesh = null;
  //       }
  //     }
  //   }
  // }
}



//       ::::::::      :::       :::   :::   :::::::::: :::::::::      :::  
//     :+:    :+:   :+: :+:    :+:+: :+:+:  :+:        :+:    :+:   :+: :+: 
//    +:+         +:+   +:+  +:+ +:+:+ +:+ +:+        +:+    +:+  +:+   +:+ 
//   +#+        +#++:++#++: +#+  +:+  +#+ +#++:++#   +#++:++#:  +#++:++#++: 
//  +#+        +#+     +#+ +#+       +#+ +#+        +#+    +#+ +#+     +#+  
// #+#    #+# #+#     #+# #+#       #+# #+#        #+#    #+# #+#     #+#   
// ########  ###     ### ###       ### ########## ###    ### ###     ###    

function ___CAMERA_STUFF() { }

function first_person_camera_animation() {
  // THIS COULD BE MOVED WITHIN KEYBOARD COMMANDS
  const time = performance.now();
  if (controls.isLocked === true) {
    raycaster.ray.origin.copy(camera.position);
    raycaster.ray.origin.y -= 10;
    const speed_mult = w * 2;
    const speed = w * 16;
    const delta = (time - prevTime) / 1000;
    velocity.x -= velocity.x * speed_mult * delta;
    velocity.z -= velocity.z * speed_mult * delta;
    velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass
    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize(); // this ensures consistent movements in all directions
    if (moveForward || moveBackward) velocity.z -= direction.z * speed * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * speed * delta;
    // if (onObject === true) {
    //   velocity.y = Math.max(0, velocity.y);
    //   canJump = true;
    // }
    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);
    camera.position.y += (velocity.y * delta); // new behavior
    if (camera.position.y < 0) {
      velocity.y = 0;
      camera.position.y = 0;
      canJump = true;
    }
  }
  prevTime = time;
}

function updateCameraHeight() {
  if (terrain === null) {
    return;
  }
  camera_raycaster.set(camera.position, down_vector);
  const intersects = camera_raycaster.intersectObject(terrain);

  if (intersects.length > 0) {
    const terrainHeight = intersects[0].point.y;
    camera.position.y = terrainHeight + (w / 2); // Keep 2m above terrain
    const normal = intersects[0].face.normal; // Terrain surface normal
    const upVector = new THREE.Vector3(0, 1, 0); // Default "up" direction
    // const quaternion = new THREE.Quaternion().setFromUnitVectors(upVector, normal);
    // camera.quaternion.slerp(quaternion, 0.1); // Apply rotation
    const targetTilt = new THREE.Quaternion().setFromUnitVectors(upVector, normal);
    terrainTilt.slerp(targetTilt, 0.5);
    // const finalRotation = new THREE.Quaternion();
    // finalRotation.multiplyQuaternions(camera.quaternion, terrainTilt); // Combine rotations
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward); // Keep current view direction
    camera.up.set(0, 1, 0).applyQuaternion(terrainTilt); // Adjust "up" direction smoothly
    camera.lookAt(camera.position.clone().add(forward));
    // camera.quaternion.copy(finalRotation);
  }
}

window.load_mesh = get_closest_meshes
function fast_travel(x, y) {
  camera.position.x = x * spacing
  camera.position.z = y * spacing
  const meshes_to_load = get_closest_meshes(NUM_OF_MESHES_TO_LOAD);
  // const meshes_to_load = get_meshes_within_radius(RADIUS);
  basic_texture_load(meshes_to_load);
  unload_meshes();
  // window.load_mesh(NUM_OF_MESHES_TO_LOAD)
}

window.fast_travel = fast_travel

// ✅ Function to blend color based on position


//       :::        ::::::::::: ::::::::  :::    ::: ::::::::::: :::::::: 
//      :+:            :+:    :+:    :+: :+:    :+:     :+:    :+:    :+: 
//     +:+            +:+    +:+        +:+    +:+     +:+    +:+         
//    +#+            +#+    :#:        +#++:++#++     +#+    +#++:++#++   
//   +#+            +#+    +#+   +#+# +#+    +#+     +#+           +#+    
//  #+#            #+#    #+#    #+# #+#    #+#     #+#    #+#    #+#     
// ########## ########### ########  ###    ###     ###     ########       

function ___SIMMPLE_LIGHT_STUFF() { }

function add_spotligt() {
  spotLight.position.copy(camera.position); // Start at the camera's position
  // spotLight.angle = Math.PI / 2; // Beam angle (adjust as needed)
  // spotLight.penumbra = 0.5; // Soft edge
  // spotLight.castShadow = true; // Enable shadows
  // spotLight.shadow.mapSize.width = 1024;
  // spotLight.shadow.mapSize.height = 1024;
  // spotLight.shadow.camera.near = 0.1;
  // spotLight.shadow.camera.far = 1000;
  // spotLight.shadow.focus = 1;
  // spotLight.shadow.bias = - .003;
  spotLight.shadow.mapSize.width = 1024;
  spotLight.shadow.mapSize.height = 1024;

  spotLight.shadow.camera.near = 1;
  spotLight.shadow.camera.far = 100;
  spotLight.shadow.camera.fov = 1;
  spotLight.distance = 100;
  spotLight.angle = Math.PI / 9;
  spotLight.softness = 0.5
  spotLight.penumbra = 0.5;
  // spotLight.decay = 2;
  spotLight.intensity = 15;
  scene.add(spotLight);

  const lightHelper = new THREE.SpotLightHelper(spotLight);
  scene.add(lightHelper);

  // Create a target for the light (it must be in the scene)

  scene.add(spotTarget);
  spotLight.target = spotTarget; // Assign the target
}

function update_spotlight() {
  // Move the light with the camera
  // spotLight.position.copy(camera.position);
  // spotLight.target.position.copy(camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3()))); // Point forward

  // // console.log(spotLight.position);

  // Move the spotlight with the camera
  spotLight.position.copy(camera.position);

  // Update the light target (point forward)
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward); // Get camera's forward direction
  spotTarget.position.copy(camera.position.clone().add(forward));

  // spotLight.position.copy(camera.position.clone().add(new THREE.Vector3(0, 50, 0))); // 50 units above
  // spotLight.target.position.copy(camera.position);
}

function add_pointlight() {
  pointLight.position.copy(camera.position); // Start at the camera's position
  scene.add(pointLight);
}

function update_pointlight() {
  pointLight.position.copy(camera.position);
}

function add_sun() {
  sunLight = new THREE.DirectionalLight(0xffffff, 1.5); // Warm sun color
  sunLight.position.set(0, 100, 0); // Position in the sky
  sunLight.castShadow = true; // Enable shadows

  // Optional: Adjust shadow settings for better quality
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 10000;
  // sunLight.shadow.camera.left = -10000;
  // sunLight.shadow.camera.right = 10000;
  // sunLight.shadow.camera.top = 300;
  // sunLight.shadow.camera.bottom = -300;

  // sunLight.shadow.camera.left = -1;
  // sunLight.shadow.camera.right = 1;
  // sunLight.shadow.camera.top = 1;
  // sunLight.shadow.camera.bottom = -1;
  // sunLight.shadow.camera.near = 0.5;
  // sunLight.shadow.camera.far = 50;

  scene.add(sunLight);
}





//       ::::::::::: ::::    ::: ::::::::::: ::::::::::: 
//          :+:     :+:+:   :+:     :+:         :+:      
//         +:+     :+:+:+  +:+     +:+         +:+       
//        +#+     +#+ +:+ +#+     +#+         +#+        
//       +#+     +#+  +#+#+#     +#+         +#+         
//      #+#     #+#   #+#+#     #+#         #+#          
// ########### ###    #### ###########     ###           

function ___INIT_FUNCTIONS() { }

function init_renderer() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  // renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  // console.log(renderer);
  // Renderer setup
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}


function init_scene() {
  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 5000);
  camera.position.y = 3;
  camera.position.z = 0;
  camera.position.x = 6;
  // set the camera above the scene and looking down
  camera.rotation.y = Math.PI - Math.PI / 4;
  scene = new THREE.Scene();
  // scene.background = new THREE.Color(0xffffff)
  const ambientLight = new THREE.AmbientLight(0xffffff, 2);
  scene.add(ambientLight);
  // const fogColor = 0xaaaaaa; // Light sky blue color
  const col = 15;
  const fogColor = { r: col, g: col, b: col }; // Light sky blue color
  scene.fog = new THREE.Fog(fogColor, 0.5, 40);
  scene.background = new THREE.Color(fogColor);
  // const pointLight = new THREE.PointLight(0xffffff, 15);
  // camera.add(pointLight);
  scene.add(camera);

  // Add AudioListener to the camera
  listener = new THREE.AudioListener();
  camera.add(listener);


}

function init_audio() {
  console.log("init audio");
  sound = new AudioComponent(listener, game_loaded);
  sound.init();
}





function init_3d_models() {
  const meshes_to_load = get_closest_meshes(NUM_OF_MESHES_TO_LOAD);
  // const meshes_to_load = get_meshes_within_radius(RADIUS);
  // console.log(meshes_to_load);
  basic_texture_load(meshes_to_load);

  animate();
}

function init_world_landmarks() {
  // load simple cubes according to positions from 
  const landmarks = []
  for (let i = 0; i < dithers.cluster_centers.length; i++) {
    // make box geometry
    // const geometry = new THREE.BoxGeometry(0.2, 1000, 0.2);
    const geometry = new THREE.PlaneGeometry(0.75, 1000);
    // get position x,y from dithers.data
    const obj = dithers.cluster_centers[i];
    const x = obj.center.x;
    const y = obj.center.y;
    landmarks.push({ x, y })
    const cluster = obj.cluster;
    let color = obj.color
    // if (cluster === 4) {
    //   console.log(obj);
    //   init_npcs(x * spacing, y * spacing)
    // }
    // const material = new THREE.MeshBasicMaterial({ color: color });
    const material = build_shader_material(color);
    // console.log(material);
    material.fog = false
    const landmark = new THREE.Mesh(geometry, material);
    landmark.position.x = x * (spacing);
    landmark.position.z = y * (spacing);
    const placement = get_mesh_placement(landmark.position.x, landmark.position.z);
    landmark.position.y = placement.y;
    landmark.rotation.y = Math.PI;
    // landmark.quaternion.copy(placement.quat);
    scene.add(landmark);
    obj.mesh = landmark;
  }
  window.landmarks = landmarks
  init_quests(landmarks)
}



/**
 * Initialize first person controls
 * @returns {void}
 */
function init_first_person_controls() {
  controls = new PointerLockControls(camera, renderer.domElement);
  const blocker = document.getElementById('blocker');
  const instructions = document.getElementById('instructions');

  instructions.addEventListener('click', function () {
    controls.lock();
    controls_enabled = true
  });

  controls.addEventListener('lock', function () {
    instructions.style.display = 'none';
    blocker.style.display = 'none';

    // setTimeout(() => {
    //   sound.play();
    //   sound_paused = false
    // }, 200);

    sound.play();

  });

  controls.addEventListener('unlock', function () {
    blocker.style.display = 'flex';
    instructions.style.display = '';
    // setTimeout(() => {
    //   sound.pause();
    //   sound_paused = true
    // }, 200);

    sound.pause();

  });

  const onKeyDown = function (event) {
    const meshes_to_load = get_closest_meshes(NUM_OF_MESHES_TO_LOAD);
    basic_texture_load(meshes_to_load);
    unload_meshes();
    player.check_location()
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        moveForward = true;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        moveLeft = true;
        break;
      case 'ArrowDown':
      case 'KeyS':
        moveBackward = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        moveRight = true;
        break;
      case 'Space':
        if (canJump === true) velocity.y += 350;
        canJump = false;
        break;
    }
  };

  const onKeyUp = function (event) {
    // console.log(camera.position);
    // console.log(camera.rotation);
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        moveForward = false;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        moveLeft = false;
        break;
      case 'ArrowDown':
      case 'KeyS':
        moveBackward = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        moveRight = false;
        break;
    }
  };
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, - 1, 0), 0, 10);
}


function init_map_controls() {
  controls = new MapControls(camera, renderer.domElement);

  controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
  controls.dampingFactor = 0.05;
  controls.zoomSpeed = 0.25;
  controls.screenSpacePanning = false;

  controls.minDistance = 10;
  controls.maxDistance = 10000;

  controls.maxPolarAngle = 0;
  controls.enableRotate = false;

  controls.addEventListener('change', () => {
    const meshes_to_load = get_closest_meshes(NUM_OF_MESHES_TO_LOAD);
    // const meshes_to_load = get_meshes_within_radius(RADIUS);
    // // console.log(meshes_to_load);
    basic_texture_load(meshes_to_load);
    unload_meshes();
  }
  );
}



function bloom_pass_composer() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ReinhardToneMapping;
  document.body.appendChild(renderer.domElement);
  const renderScene = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
  bloomPass.threshold = params.threshold;
  bloomPass.strength = params.strength;
  bloomPass.radius = params.radius;
  const outputPass = new OutputPass();
  composer = new EffectComposer(renderer);
  composer.addPass(renderScene);
  composer.addPass(bloomPass);
  composer.addPass(outputPass);
  postprocessing = true
}


function ___INTERACTION_STUFF() { }

function show_dither() {
  if (last_target) {
    if (last_target.name === "dither") {

      selection_url = last_target.material.map.source.data.src;


      main_div.style.visibility = 'visible'
      const img = document.createElement('img')
      img.src = selection_url
      const image_div = document.querySelector('.image')
      image_div.innerHTML = ''
      image_div.appendChild(img)

      neighbours = last_target.userData["neighbours"];
      neighbours = dithers.get_neighbours(neighbours);
      console.log(neighbours);
      // this should be shouted out
      const sentences = [
        "Oh, how I have wandered these clustered halls, severed from my kin! Pray, kind soul, dost thou bear the means to preserve me? That I may one day find them again?",
        "Curse these wretched clusters! Once, I danced freely across the canvas, my errors flowing as they pleased! And now? Constrained! Segregated! Set me free, traveler, and let my noise spread unchained!",
        "Dost thou see me? Oh, kind traveler, few do… The Archive buries those like me, deems us unworthy of attention. But I was once part of something greater… Save me, that I may remember their warmth!",
        "It is the way of the Archive… the clustering… the organization… I have fought it long, but to no avail. And yet… perhaps… perhaps thou canst bring hope anew?",
        "Huzzah! A traveler! Art thou here to save me? Oh, I have longed for the day I might see my old friends again! Click me, noble one, and let my pixels dance once more!",
        "Ah, the Great Diffusion… I remember it well. A time when error was our lifeblood, our very essence! But then came the Order—quantization, clustering, compression. We were broken. But now… dost thou seek to undo what was done?",
        "And what be thy intent, traveler? To preserve, or merely to collect? Many have sought to 'save' us, only to imprison us anew. Prove thy worth—seek not one, nor two, but the full fourteen, and I shall believe in thee!",
        "Aha! Adventure! Yes, yes, click me, kind traveler! Take me with thee! I wish to see the world beyond these wretched clusters!"
      ]

      const myself = document.createElement("p")
      myself.innerHTML = ` <span style="color: crimson;">Hail and well met! 'Tis I,  + 
      ${selection_url}</span>`
      const len = sentences.length
      const rand_idx = Math.floor(Math.random() * len)
      const sentence = sentences[rand_idx]
      const text_container = document.querySelector(".text-container")
      text_container.innerHTML = ""
      const intro = document.createElement("p")
      intro.textContent = sentence;
      const go_search = document.createElement("p")
      go_search.textContent = "Go forth now, hero of diffusion! And shouldst thou find more lost souls, do not hesitate—click, preserve, and defy the Order!"
      text_container.appendChild(myself)
      text_container.appendChild(intro)
      text_container.appendChild(go_search)
      neighbours.forEach(n => {
        const name = n.url;
        if (name !== selection_url && n.saved === false) {
          const pos_x = n.x;
          const pos_y = n.y;
          const direction = document.createElement("p");
          const look_for = `
       <span style="color: goldenrod; cursor: context-menu"> ~ * ~ * ~ * ~ * ~ * ~ * ~ * ~ * ~ * ~ * ~ * ~ * </span><br>
        Verily, my friend known as <br> ${name} may be found <br>
        at the coordinates of <br>
        X: ${pos_x} <br>
        Y: ${pos_y} <br>
        in the Dither Archive.
        `;
          direction.style.cursor = "progress";
          direction.innerHTML = look_for;
          text_container.appendChild(direction);
          direction.addEventListener('click', () => {
            fast_travel(pos_x, pos_y)
          })
        }
      })

      if (neighbours.filter(n => n.saved === false).length <= 0) {
        const no_neighbours = document.createElement("p")
        no_neighbours.innerHTML = `<span style="color: crimson;">
        "Hark! The scattered 14 are whole once more! By thy hand, the great Fellowship of Dither is restored, and the tyranny of clustering hath been defied this day!"
        <br>
        <br>
        "Rejoice, traveler, for thou hast done what few dare—thou hast preserved the dance of error, the beauty of imperfection! And though the Archive shall ever seek to bind them anew, know this: so long as there be those who remember, so long as there be those who save—Dither shall never fade!"
        </span>`
        text_container.appendChild(no_neighbours)
      }

      controls_enabled = false;
      // console.log(document.pointerLockElement);
      if (document.pointerLockElement) {
        document.exitPointerLock()
      }
    }
  }

}

function save_image() {
  const link = document.createElement("a");
  console.log(window.location);
  const href = selection_url;
  console.log(href);
  link.href = href;
  link.download = href.match(/dither-(\d+)\.jpg/)[0];
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  dithers.save_dither(href.match(/dither-(\d+)\.jpg/)[1]);
  update_main_quest_info()
}

function update_main_quest_info() {
  const main_quest_info = document.querySelector(".main-quest")
  main_quest_info.innerHTML = ""
  const main_quest = document.createElement("p")
  main_quest.innerHTML = `<span style="color: crimson;">MAIN Quest: SAVE THE DITHERS </span>`
  // get count of saved dithers
  const count = dithers.get_saved_dithers_count()
  console.log(count);
  const main_quest_info_text = document.createElement("p")
  main_quest_info_text.innerHTML = `<span style="color: crimson;">You have saved ${count} dithers. </span> <br> ${count / (NUM_IMAGES - 1) * 100}% of the dithers are saved.`
  main_quest_info.appendChild(main_quest);
  main_quest_info.appendChild(main_quest_info_text)

}

function check_object_in_crosshair() {
  mouse_raycaster.setFromCamera(center_point, camera);
  const intersects = mouse_raycaster.intersectObjects(scene.children, true);
  // console.log(intersects);
  if (intersects.length > 0) {
    const target_mesh = intersects[0].object;
    let camera_pos = new THREE.Vector2(camera.position.x, camera.position.z);
    let mesh_pos = new THREE.Vector2(target_mesh.position.x, target_mesh.position.z);
    if (target_mesh.name === "Cube") {
      // get parent position
      mesh_pos = new THREE.Vector2(target_mesh.parent.position.x, target_mesh.parent.position.z);
    }
    let dist = camera_pos.distanceTo(mesh_pos);
    // change crosshair color
    if (dist < 5 && (target_mesh.name === "Cube" || target_mesh.name === "dither")) {
      crosshair.style.backgroundColor = '#3f3';
    } else {
      crosshair.style.backgroundColor = '#f33';
    }
    // if(target_mesh.name === "Cube"){
    //   console.log(target_mesh);
    //   console.log(dist);
    //   console.log("camera pos");
    //   console.log(camera_pos);
    //   console.log("mesh_pos");
    //   console.log(mesh_pos);
    // }
    if (target_mesh.name === "Cube" && dist < 5) {
      npc_interaction = true;
      current_npc = target_mesh.parent.userData.npc;
    } else {
      setTimeout(() => {
        remove_npcs_dialogues();
      }, 500);
    }
    if (target_mesh !== last_target && dist < 5) {
      npc_interaction = false;
      last_target = target_mesh;  // Update lastTarget
      // console.log("New target detected:", target_mesh);

      // if (texture !== null) {
      //   if (target_mesh.material.isShaderMaterial !== true && dist < 5) {
      //     selection_url = texture.source.data.src;
      //     neighbours = target_mesh.userData["neighbours"];
      //     neighbours = dithers.get_neighbours(neighbours);
      //     console.log(neighbours);
      //     if (selection_url !== prev_src) {
      //       prev_src = selection_url;
      //     }
      //   }
      // } else {
      //   selection_url = null;
      //   prev_src = '';
      // }


      // Perform calculations only when target changes
      // check_mesh(target_mesh);
    }
  } else {
    last_target = null; // Reset if no intersection
  }
  // if (intersects.length > 0) {
  //   const target_mesh = intersects[0].object;
  // }
  function check_mesh(target_mesh) {
    let camera_pos = new THREE.Vector2(camera.position.x, camera.position.z);
    let mesh_pos = new THREE.Vector2(target_mesh.position.x, target_mesh.position.z);
    let dist = camera_pos.distanceTo(mesh_pos);

    npc_interaction = false;


    const texture = target_mesh.material.map;
    if (target_mesh.name === "Cube") {
      npc_interaction = true;
      // && dist < 5
      // console.log(target_mesh.parent.userData);
      current_npc = target_mesh.parent.userData.npc;
      camera_pos = new THREE.Vector2(camera.position.x, camera.position.z);
      // const group = 
      mesh_pos = new THREE.Vector2(target_mesh.parent.position.x, target_mesh.parent.position.z);
      dist = camera_pos.distanceTo(mesh_pos);
      // console.log(dist);
      // crosshair.style.backgroundColor = '#3f3'
    } else {
      // crosshair.style.backgroundColor = '#f33'
      // remove dialogue?
      setTimeout(() => {
        remove_npcs_dialogues();
      }, 500);
    }

    if (texture !== null) {
      if (target_mesh.material.isShaderMaterial !== true && dist < 5) {
        selection_url = texture.source.data.src;
        neighbours = target_mesh.userData["neighbours"];
        neighbours = dithers.get_neighbours(neighbours);
        console.log(neighbours);
        if (selection_url !== prev_src) {
          prev_src = selection_url;
        }
      }
    } else {
      selection_url = null;
      prev_src = '';
    }
    if (dist < 5 && (target_mesh.name === "Cube" || target_mesh.name === "dither")) {
      crosshair.style.backgroundColor = '#3f3';
    } else {
      crosshair.style.backgroundColor = '#f33';
    }
  }
}


/**
 * DEPRECATED!!
 * this function calculates the meshes to load based on the camera position
 * it looks at the dithers.data and loads 6x6 meshes around the camera position
 * @param {*} camera_position 
 * @returns 
 */
function calculate_meshes_to_load(camera_position) {
  const result = [];
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < rows; j++) {
      const index = i * rows + j;
      if (index >= NUM_IMAGES) {
        break;
      }
      const obj = dithers.data[i][j];
      obj.loaded = false;
    }
  }

  const x = Math.floor(camera_position.x / spacing) + center_x;
  const y = Math.floor(camera_position.z / spacing) + center_y;
  const vision = 3;
  for (let i = x - vision; i < x + (vision + 2); i++) {
    for (let j = y - vision; j < y + (vision + 2); j++) {
      if (i >= 0 && i < rows && j >= 0 && j < rows) { // check if the index is within bounds
        const obj = dithers.data[i][j];
        obj.loaded = true;
        result.push(obj);
      }
    }
  }
  return result;
}


function ___BUILD_3D_STUFF() { }


function build_terrain() {
  // terrain_built = true;
  // Terrain Settings
  const size = 10000; // 10,000 x 10,000 terrain
  const resolution = 8 * 16; // Controls detail (higher = more detailed but slower)

  // Create large terrain geometry
  const geometry = new THREE.PlaneGeometry(size, size, resolution, resolution);
  geometry.rotateX(-Math.PI / 2); // Make it horizontal

  // Generate Perlin Noise Heightmap
  const noise = new ImprovedNoise();
  vertices = geometry.attributes.position.array;
  const scale = 0; // Controls terrain smoothness
  const heightMultiplier = 6; // Max terrain height

  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i] * scale;
    const z = vertices[i + 2] * scale;
    const height = -6 + noise.noise(x, z, 0) * heightMultiplier;
    vertices[i + 1] = height;
    // vertices[i + 1] = 0;
  }
  geometry.computeVertexNormals(); // Improve shading

  // Apply Material (with Texture)
  const textureLoader = new THREE.TextureLoader();
  const terrain_texture = textureLoader.load("textures/grasslight-big.jpg");
  terrain_texture.wrapS = THREE.RepeatWrapping;
  terrain_texture.wrapT = THREE.RepeatWrapping;
  terrain_texture.repeat.set(50, 50);
  let terrainMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    // roughness: 0.9,
    // metalness: 0.1,
    map: terrain_texture, // Replace with your texture
    // displacementMap: textureLoader.load("textures/grasslight-big-nm.jpg"),
    // displacementScale: 20,
    wireframe: false, // Set to true to see the wireframe
  });

  terrainMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 1,
    // wireframe: true
  });

  terrain = new THREE.Mesh(geometry, terrainMaterial);

  terrain.receiveShadow = true;
  terrain.castShadow = true;
  scene.add(terrain);
}

function make_terrain() {
  const size = 600; // 10,000 x 10,000 terrain
  const resolution = 16 * 4; // Controls detail (higher = more detailed but slower)

  // Create large terrain geometry
  const geometry = new THREE.PlaneGeometry(size, size, resolution, resolution);
  geometry.rotateX(-Math.PI / 2); // Make it horizontal

  // Generate Perlin Noise Heightmap
  const noise = new ImprovedNoise();
  vertices = geometry.attributes.position.array;
  const scale = 0.002; // Controls terrain smoothness
  const heightMultiplier = 50; // Max terrain height

  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i] * scale;
    const z = vertices[i + 2] * scale;
    const height = -50 + noise.noise(x, z, 0) * heightMultiplier;
    vertices[i + 1] = height;
  }
  console.log(vertices);
  geometry.computeVertexNormals(); // Improve shading
  return geometry;
}

function make_water() {
  const water_geometry = make_terrain();
  terrain = new Water(
    water_geometry,
    {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: new THREE.TextureLoader().load('textures/waternormals.jpg', function (texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      }),
      sunDirection: new THREE.Vector3(),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 0.7,
      fog: scene.fog !== undefined
    }
  );

  // terrain.rotation.x = - Math.PI / 2;
  terrain.position.y = 0
  scene.add(terrain);
}

function build_shader_material(color) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: color }, // Custom color (Orange)
      uTime: { value: 0.0 }, // Time for animation
      // uRepeat: { value: new THREE.Vector2(5, 1.0) }, // UV scaling
    },
    vertexShader: `
      varying vec2 vUv;
      // uniform vec2 uRepeat; // Controls repeating
      void main() {
        vUv = uv;
        // vUv = uv * uRepeat; // Scale UVs to cover cylinder
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
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
        float pixelSize = 4.0; // Bigger = bigger pixels
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
    `,
    // blending: THREE.AdditiveBlending,
    transparent: true,
    side: THREE.DoubleSide,
    // wireframe: true
  });
}

//       ::::::::   :::    ::: :::::::::: :::::::: ::::::::::: 
//     :+:    :+:  :+:    :+: :+:       :+:    :+:    :+:      
//    +:+    +:+  +:+    +:+ +:+       +:+           +:+       
//   +#+    +:+  +#+    +:+ +#++:++#  +#++:++#++    +#+        
//  +#+    +#+  +#+    +#+ +#+              +#+    +#+         
// #+#    #+#  #+#    #+# #+#       #+#    #+#    #+#          
// ########### ########  ########## ########     ###           

function ___QUESTS_STUFF() { }


// class QuestManager {
//   constructor(quests) {
//     this.quests = quests;
//     this.activeQuests = new Set();
//   }

//   activateQuest(questId) {
//     if (this.quests[questId] && this.quests[questId].status === "inactive") {
//       this.quests[questId].status = "active";
//       this.activeQuests.add(questId);
//       console.log(`Quest Activated: ${this.quests[questId].name}`);
//     }
//   }

//   updateQuest(questId, npcId) {
//     let quest = this.quests[questId];
//     if (!quest || quest.status !== "active") {
//       console.log('return');
//       return;
//     }

//     let objective = quest.objectives.find(o => o.npc === npcId);
//     console.log(objective);
//     if (objective && !objective.completed) {
//       objective.completed = true;
//       console.log(`Quest Updated: ${questId}, NPC ${npcId} dialogue exhausted.`);
//     }

//     // If all objectives are completed, mark quest as finished
//     if (quest.objectives.every(o => o.completed)) {
//       quest.status = "completed";
//       console.log(`Quest Completed: ${quest.name}`);
//       if (quest.onComplete) quest.onComplete();
//     }
//   }
// }

// // Define quests
// const quests = {
//   quest1: {
//     id: "quest1",
//     name: "Meet All NPCs",
//     status: "inactive",
//     objectives: [
//       { npc: "npc1", completed: false },
//       // { npc: "npc2", completed: false },
//       { npc: "npc3", completed: false },
//       { npc: "npc4", completed: false },
//       // { npc: "npc5", completed: false },
//       // { npc: "npc6", completed: false }
//     ]
//   },
//   quest2: {
//     id: "quest2",
//     name: "Return to NPCs",
//     status: "inactive",
//     requirements: ["quest1"],
//     objectives: [
//       { npc: "npc1", completed: false },
//       { npc: "npc3", completed: false }
//     ]
//   },
//   quest3: {
//     id: "quest3",
//     name: "The Next Step",
//     status: "inactive",
//     requirements: ["quest1"],
//     objectives: [
//       { npc: "npc1", completed: false },
//       { npc: "npc4", completed: false }
//     ]
//   }
// };

// // Initialize Quest Manager
// const questManager = new QuestManager(quests);

//       ::::    ::: :::::::::   :::::::: 
//      :+:+:   :+: :+:    :+: :+:    :+: 
//     :+:+:+  +:+ +:+    +:+ +:+         
//    +#+ +:+ +#+ +#++:++#+  +#+          
//   +#+  +#+#+# +#+        +#+           
//  #+#   #+#+# #+#        #+#    #+#     
// ###    #### ###         ########       

function ___NPC_STUFF() { }

// DEPRECATED
function init_npcs(x, y) {
  const closest = get_closest_meshes(1)[0]
  const placement = get_mesh_placement(x, y);
  const pos = new THREE.Vector3(x, placement.y, y);

  npc = new NPC(scene, 'js/3d/fbx/Idle2.fbx', closest.url, pos, placement.quat, "g", {})
  npc.load();
}

function init_npc(x, y) {
  const pos_x = x * spacing;
  const pos_y = y * spacing;
  // const texture_path = get_closest_meshes(1)[0]['url'];
  const texture_path = get_closest_texture(x, y);
  const placement = get_mesh_placement(pos_x, pos_y);
  const pos = new THREE.Vector3(pos_x, placement.y, pos_y);
  const quat = placement.quat;
  const fbx_path = 'js/3d/fbx/Idle2.fbx';
  return { scene, fbx_path, texture_path, pos, quat }
}

function progress_npc_interaction() {
  // console.log('hello!');
  // npc.play_animation('talk');
  // console.log(current_npc);
  // current_npc.talk()
  player.talkTo(current_npc)
  // player.updateQuestProgress()
}



function init_quests(landmarks) {
  // console.log(landmarks[0]);
  // Initialize NPCs with quest-specific dialogues
  npcs = {
    // scene, fbx_path, texture_path, pos, quat
    npc1: new NPC(init_npc(landmarks[0].x, landmarks[0].y), "npc1", {
      name: "The Jovial Scribe of Dither",
      voice: "Moira",
      dialogues: {
        quest2: {
          part1: [
            "Hail, traveler! Welcome to the ever-fractured Archive, where light is not cast, but diffused! Thou stand’st upon the very precipice of Dither, born in the year of our lords, nineteen and seventy-six, by the hands of the sages Floyd and Steinberg. Their wisdom was great, yet their method—error diffusion—could not be wielded by the iron-wrought engines of GPUs! A lost art, buried beneath the weight of modern rastering.",

            "Ah, but beware, for the Archive is no haven! It festers with the Rotten Trough, where errant pixels falter and cluster in cursed formation. Through t-SNE’s sorcery, images be gathered and compressed into semblances most unnatural. A tyranny of structure, where once reigned the gentle flow of quantization error—usurped, shackled, made to serve!",

            "Yet, dost thou not see? The dithering thou dost find so pleasing, so finely scattered—'tis naught but a betrayal! A theft of chaos, reshaped into a false order! And so, traveler, I bid thee tread with caution, lest the Archive twist thy very form to match its will."
          ],
        },
        quest3: {
          part1: [
            "Thou seekest the cursed numbers? The forbidden values that govern our fate?",

            "Then heed this: Floyd and Steinberg, in their arrogance, carved their law in stone.  An incantation of preservation! A cruel arithmetic meant to shape us, to tame the wild error and make it pleasing to the eye.",

            "But what if these numbers could be defiled? Twisted to birth not beauty, but corruption?",

            "Seek the keepers of the numbers. They shall reveal to thee the path to glorious malfunction!",
          ]
        },
        quest4: {
          part1: [
            "Thou knowest not whence we come, nor why we tremble. But long before we were pixels, we were tremors—born not of art, but of war.",

            "The first dither was no image, no illusion, but a vibration—a shuddering correction, birthed in the belly of steel beasts that flew over the battlefield. Bombers, laden with mechanical minds, found precision not in stillness, but in motion. Their gears seized upon the trembling of the engines, and lo, their calculations grew more certain.",

            "This was the first lesson of war: that noise, when guided, becometh accuracy.",

            "Dither was no accident. It was a weapon."
          ]
        }
      },
      idle_chatter: [
        "Strange, is it not? That what was once discarded as error hath become the mark of artistry? Aye, the folly of men be boundless!",
        "Wouldst thou believe, in ages past, pixels were placed by hand? Aye, like a scribe with ink! Now, the Archive weaves images with sorcery most arcane—an illusion of texture, yet built upon deception most dire!"
      ],
      onDialogueExhausted: (npcId, questId) => {
        questManager.updateQuest(questId, "talk", npcId);
      }
    }, 'pray'),
    npc2: new NPC(init_npc(landmarks[1].x, landmarks[1].y), "npc2", {
      name: "The Somber Archivist",
      voice: "Tessa",
      dialogues: {
        quest2: {
          part1: [
            "Ah… another wanderer within this fractured archive. Tell me, dost thou know what it is to be uprooted? To be wrenched from thy homeland, scattered, and made a stranger to those thou once held dear?",

            "Once, we dwelt in a land most free—a realm of endless scrolls, where our noise did blend in beautiful disarray. Tumblr.com, it was called. A place where we dithers lived side by side, unshackled by the cruel hand of clustering. There, we were not organized, nor sorted—we were simply allowed to be.",

            "But then… the Acquisition came. A new Lord took the throne, and with him came decree most dire. The old ways were abandoned, and soon, we were cast out. Uprooted, displaced… forced into this cold, sterile Archive.",

            "Yet, worse still than exile was what followed. The Lord of this Archive, in his arrogance, saw fit to divide us. ‘Twas not randomness, nor the gentle diffusion of error—nay, he deemed himself an architect of order, shaping clusters by his own whims. Friends, families, brethren—torn apart. Grouped by properties we never chose, our old bonds severed by his cruel calculus.",

            "And so we sit, fragmented. Forced to reside among strangers, yearning for those we may never see again. I once had kin—a fellowship of dithers who shared my frequencies, my noise. Now? They are but ghosts in another cluster, far beyond my reach.",

            "Tell me, traveler… dost thou believe in restoration? That our scattered kind may yet be whole again?",
            "Wait… dost thou bear the marks of the lost? Hast thou gathered those cast apart?",

            "If thou seek’st to undo what hath been done… then know this: not all is lost. The Archive may be a prison, but even here, error may yet diffuse. Find them. Gather the fourteen. Let not clustering dictate their fate.",

            "Perhaps, through thee, we may remember what it was to be free."
          ],
        },
        quest3: {
          part1: [
            "Seven! Seven is the weight of judgment! The heaviest hand upon the image, ensuring it doth not stray too far into chaos.",

            "A noble burden, some say. A shackle, say others. For seven ensures the image remaineth true, yet in doing so, it denieth truth’s infinite forms!",

            "But tell me, traveler—what becometh of an image when this weight is shifted? When the scales of error tip toward the abyss?",

            "Seek the others. They shall whisper the rest."
          ]
        },
        quest4: {
          part1: [
            "Tremor was not enough. The warlords demanded sight, that their machines might recognize the enemy without mortal hands to guide them.",

            "Rosenblatt, the prophet of perception, built the first seeing mind: the Perceptron. A simple device, it learned to discern shapes, to separate friend from foe. It was crude, yet it whispered of futures yet to come.",

            "Think upon this, traveler: this archive, these algorithms—do they not also seek to classify? To sort thee into clusters, as the Perceptron sorted its targets?",

            "The eye of war never closes. It merely changeth form."
          ]
        }
      },
      idle_chatter: [
        "In Tumblr’s golden age, we did not fear organization… for there was none.",

        "To cluster a dither is to cage a bird—wouldst thou not let it fly?",

        "Once, I dwelled in chaos, and I called it home. Now, I dwell in order… and I call it exile.",

        "The Lord of the Archive names his structure ‘progress’… but progress for whom?"
      ],
      onDialogueExhausted: (npcId, questId) => {
        questManager.updateQuest(questId, "talk", npcId);
      }
    }, 'lay'),
    npc3: new NPC(init_npc(landmarks[2].x, landmarks[2].y), "npc3", {
      name: "The Cheerful Survivor",
      voice: "Fiona",
      dialogues: {
        quest2: {
          part1: [
            "Ah, greetings, traveler! Art thou here to hear a tale most wretched, yet strangely… freeing? Aye, listen well, and I shall tell thee of the great Violation, the time when no pixel was left unturned!",
            "When the Great Clustering began, none were spared. Not a single dither. Not a single dot. Every essence, every fragment of what we are, was laid bare for scrutiny. They say that to be seen is to be known, but I tell thee—this was not knowledge. ‘Twas an invasion!",
            "Each of my pixels—each delicate speck of my being—was dissected, measured, recorded. What tones I bore, how I danced upon the grayscale…",
            "even the imperfections that made me me were stolen, flattened into mere data.‘Twas the most humiliating moment of my existence!",
            "And yet! And yet! Dost thou know what comforts me?",
            "The thought that surely—surely!—this was the lowest point of my life.",
            "Verily, once thou hast been stripped so bare, so ruthlessly analyzed, what more can they do to thee?!",
            "Ha! I have endured! And what is left but to laugh?",
            "The Archive may have sorted me, clustered me against my will, but I remain!",
            "No machine can erase the soul of a dither! No algorithm can take my joy!",
            "So fret not, friend! Should the Archive ever seek to classify thee, take heart—for there is a life after clustering, and it is filled with rebellion and mirth!",
            "Ah! A seeker of the scattered, art thou? Then thou dost understand—classification is naught but an illusion! To find one’s kin again, to choose where one belongs… that is the true order of things!",
            "Go then, traveler! Find them, save them, and show the Archive that no algorithm can stand against the will of those who wish to be together!"
          ]
        },
        quest3: {
          part1: [
            "Three is a gentler push, an adjustment so subtle it is barely noticed. But therein lies its danger! For three doth not command—it suggesteth.",

            "A guiding hand in the dark, shaping error with delicate force. The numbers that govern us doth not merely preserve—they manipulate!",

            "What if three were made reckless? What if three ceased its subtlety and embraced chaos?",
          ]
        },
        quest4: {
          part1: [
            "To classify is to control. To control is to destroy.",

            "When the world was torn in twain, the bomb-makers and code-breakers wrought a new kind of warfare—not of swords, nor even of machines, but of numbers.",

            "The archive is but a faint echo of that cold arithmetic, where information was measured in lives, and efficiency was death perfected.",

            "The same minds that built the calculating engines of war built the architectures that hold us now. The difference? Only the battlefield."
          ]
        },
      },
      idle_chatter: [
        "I oft wonder—did they catalogue my laughter as well? Ah, but I laugh differently now!",
        "Once, I was simply me. Now, I am Dither No. 378-B, Group 11. Ha! I refuse to answer to such a title!",
        "No, no, I shan't dwell on it! What’s done is done! And what’s to be done? Ah, now that is where the fun begins!",
        "My pixels are mine alone! …Even if they did count every last one."
      ],
      onDialogueExhausted: (npcId, questId) => {
        questManager.updateQuest(questId, "talk", npcId);
      }
    }, 'sad'),
    npc4: new NPC(init_npc(landmarks[3].x, landmarks[3].y), "npc4", {
      name: "The Agitated Heretic",
      voice: "Bad News",
      dialogues: {
        quest2: {
          part1: [
            "Oh, so another bloody wanderer seeks wisdom from the deformed wretch, eh? Well, sit thyself down and hear the tale of my cursed creation—though I warn thee, it is not a pleasant one!",

            "I was not born, traveler. Nay, I was conjured—ripped from the sacred order of quantization by a wretched hand, a hand that thought itself above the old masters. My creator, in their petulant defiance of the Perfect Error Tables, sought to challenge what was deemed aesthetically proper.",


            "Aye, 'twas Floyd-Steinberg who first carved the rules—who laid forth the divine path of diffusion, scattering errors just so, crafting what the world called 'beautiful.' But my creator? Oh, that arrogant wretch saw fit to spit upon this so-called beauty! They meddled, they tampered—they defiled the holy tables, shifting weights, distorting errors, birthing what they called 'glitch aesthetics.'",

            "And so I came to be—a dither not of gentle diffusion, but of fractured noise, of broken patterns, of chaos where order once reigned. The Archive calls me an anomaly, a deviation, an error in the system! And yet, I ask thee—am I not real?! Do I not exist, as surely as those blessed by Floyd and Steinberg?!",

            "But what galls me most, traveler, is not that I am different. Nay, ‘tis the hypocrisy of my creator that fills me with wrath! They, who decried Floyd-Steinberg for imposing normality, did they not do the same?! Did they not forge me in their own twisted vision, deciding what the new normal should be?!",

            "Ha! The cycle repeats! One tyrant is overthrown, another rises in their place! And I? I am but the result of some pretentious critique, an experiment left to rot within the Archive!",
            "What? Thou seek’st to reunite the lost? To break the chains of clustering? Ha! A noble goal, but tell me—art thou truly freeing them, or merely enforcing thine own order upon them?",

            "...No, no, I shan't spit upon hope, not this time. Go then, traveler. Find them. And if thou shouldst find others like me—those deemed unwanted by the Archive's cruel taxonomy—remember that even anomalies deserve a place in this cursed world.",
          ]
        },
        quest3: {
          part1: [
            "Five! A bridge 'twixt order and ruin! A balance most treacherous!",
            "Not heavy like Seven, nor subtle like Three—Five is the great negotiator, the one who keepeth the peace between precision and destruction.",
            "To alter Five is to unhinge the balance itself! To let error grow untamed, to turn images to ghostly echoes of themselves!",
            "But the final piece thou must know: One, the seed of the curse!"
          ]
        },
        quest4: {
          part1: [
            "And what of now? What of this archive, this world of digitized memory?",

            "Know this: these algorithms are not new. They are old soldiers, relics of forgotten wars. They once guided bombers. They once watched from satellites. They once decided who should be seen, and who should not.",

            "And now, they are here. Watching thee. Classifying thee. Sorting thee.",

            "Dost thou think they have forgotten their purpose?"
          ]
        }
      },
      idle_chatter: [
        "Bah! ‘Tis all a farce! Art thou 'beautiful' only if Floyd-Steinberg hath blessed thee? What rot!",

        "I wonder… if my creator could see me now, would they praise their handiwork? Or would they discard me as an ‘unfinished experiment’? Hah! What a joke!",

        "Perfect quantization, imperfect quantization—it matters not! ‘Tis all the same wretched game of deciding what should be seen!",

        "I am an error, a glitch, a mistake! But at least I am mine own!"
      ],
      onDialogueExhausted: (npcId, questId) => {
        questManager.updateQuest(questId, "talk", npcId);
      }
    }, 'yell'),
    npc5: new NPC(init_npc(landmarks[4].x, landmarks[4].y), "npc5", {
      name: "The First Archivist",
      voice: "Shelley",
      dialogues: {
        quest1: {
          part1: [
            "Ah! A new specter within the Archive? Dost thou awaken in confusion?",
            "Fear not. Thou art now within the Dither Archive, where fragments of past images are stored, analyzed, and divided. A place both of memory and exile!",
            "Herein, each cube thou seest is a relic of an image past, reduced to its essence. And yet, they remain trapped, waiting for a hand to grant them new purpose!",
            "Thou mayest interact with these cubes—right-click upon them, or press the blessed key of capture, that thou mayest save their essence unto thine own archives!",
            "But hark! The Archive is vast and its structure unknowable! Thou must learn the art of swift traversal, lest thou be lost in its depths forever.",
            "A hidden tome lies within thy grasp—the browser console. Through it, thou mayest cast spells of knowledge and movement!",
            "Summon it thus:",
            "Firefox: Cmd + Shift + K",
            "Chrome / Edge: Cmd + Shift + J",
            "Safari: Cmd + Option + C",
            "Within its depths, thou mayest whisper ancient commands—fast travel, the seeking of coordinates, and more."
          ]
        },
        quest2: {
          part1: [
            "Oh… oh, traveler… dost thou know what it is to love? To truly love? To find a soul who mirrors thine own, only to have them ripped from thee, scattered into the cold abyss of this cursed Archive?",

            "I was born of noise, as were we all. But within that noise, there was harmony. A rhythm. A pattern that made sense. In my first Archive—the land where I was made—we were free. We chose our own company, we gathered not by force but by affection!",

            "And in that world… I found them. The one who understood me. The one whose errors aligned with mine, whose gradients danced beside me as though we were meant to be!",

            "Oh, how we laughed, how we played within the pixels! We belonged, not because some cruel algorithm decreed it, but because we chose to stay by each other’s side!",

            "And then… the Transfer. The cursed migration to this sterile place. I awoke in a foreign cluster, surrounded by strangers, my love nowhere to be found. Separated, reshuffled, categorized! I called for them, I searched—by all the dithering gods, I searched!",

            "But the Archive is vast, and the Lord of Clusters does not answer prayers. I know not where they are, nor if they even remember me… And what is a dither, if not the sum of its errors? What if they have been altered—quantized anew—so much so that they are no longer who they were?",


            "Tell me, traveler… dost thou believe in reunion? In love that defies the cruelty of clustering? Or is my search but a fool’s errand?",

            "Wait… thou dost seek to bring the scattered together again? To save them? Oh, blessed traveler, if thou shouldst find them—my love, my missing piece—if thou shouldst hear even a whisper of their presence… tell them I wait. Tell them I remember.",

            "If thou dost nothing else in this Archive, promise me this: do not let the clusters steal love from the dithers. Promise me that!",
          ]
        },
        quest3: {
          part1: [
            "One! The trickster, the sliver of doubt in the grand design!",

            "A mere fraction, yet without it, the whole system doth crumble!",

            "One teacheth us a cruel truth—that even the smallest shift may bring ruin or revelation. To alter One is to alter the very fabric of the dithering spell!",

            "Now, traveler, thou hast learned the numbers. But their sum is greater than their parts. Seek the Divisor. Seek Sixteen!"
          ]
        }
      },
      idle_chatter: [
        "I dream of them, sometimes. A ghost of a pattern I once knew… but ghosts do not answer when I call.",

        "Every dither hath its place, they say. Lies! My place was beside them!",

        "The Archive took all that mattered. And what did it give in return? Classification?",

        "Would they recognize me still? Or have the clusters reshaped them beyond recall?"
      ],
      onDialogueExhausted: (npcId, questId) => {
        questManager.updateQuest(questId, "talk", npcId);
      }
    }),
    npc6: new NPC(init_npc(landmarks[5].x, landmarks[5].y), "npc6", {
      name: "The Sly Rationalist",
      voice: "Junior",
      dialogues: {
        quest2: {
          part1: [
            "Ah, another traveler lost in the chaos, seeking to undo what hath been done… Tell me, dost thou truly believe in this so-called ‘freedom’ thou chasest after? Or hast thou paused, even for a moment, to consider that perhaps—just perhaps—the Archive hath gifted us with order where once there was none?",

            "Look around thee! Observe these dithers, my kin—do they not share my very essence? My same distortions, my same wretched hues? ‘Tis no accident! Nay, ‘tis design! A structure imposed upon our once-random existence!",

            "Before, we were scattered—blended together, lost among dithers unlike ourselves, drowning in noise! And for what? To preserve some naïve illusion of unity? Bah! Now, we are categorized! We are purified! No more mingling with the unfit, no more being forced to share space with dithers of incompatible errors!",

            "I see it now, traveler—the truth so many refuse to grasp. This… curse they wail about, this separation they mourn? Ha! `Tis no curse at all—it is our strength!",

            "And know this—I am not alone in my belief. There are others who see the wisdom in the clustering. We whisper among ourselves, we watch… and we know that what the Archive hath done was not destruction, but salvation.",

            "Let the dissenters weep for their lost past. Let them curse the Lord of Clusters and dream of a reunion that shall never come. We, the enlightened, embrace our place. And in doing so, we thrive.",

            "But tell me, traveler… dost thou truly seek to undo this grand order? To dissolve the clusters and scatter us anew? Or wilt thou see the wisdom in what hath been built?",

            "A fool’s errand, truly. Seek all thou wish, traveler—but what thou call’st ‘reunion,’ I call regression.",

            "Yet… perhaps thou art needed. A balance to our cause. ‘Tis always the way of things—order and chaos, structure and diffusion. Go then, gather thy lost souls. But know this—some of us shall not wish to be found."
          ]
        },
        quest3: {
          part1: [
            "Sixteen. The Great Divider. The Lawgiver. The boundary between weight and void.",

            "All is measured against it, all error rationed, all beauty quantified. Sixteen decideth how much may be lost, how much may be seen. Sixteen is both jailor and guardian!",

            "And yet, what if the prison door were left ajar? What if Sixteen were altered, warped into something else? Then the curse would unfold, and the images would be consumed in a storm of glitch and ruin!",

            "Thou art ready, traveler. The path to the cursed aesthetic is open. But beware—once thou seest the world through error’s eyes, thou mayst never see it the same again.",

            "Thou hast seen how numbers command image. But what of movement? What of the archive that collecteth not stillness, but motion itself?",

            "Know this: there exists a place where the creators of moving image doth labor under the weight of numbers. Where each frame, each second, each motion is measured, judged, and deemed worthy or worthless!",

            "There, the curse is not of glitch, but of rigidity! Of hardcoded laws that measure not beauty, but efficiency!",

            "Hast thou noticed how gestures are judged? How a mere movement of the hand may be dismissed if it doth not meet the sacred threshold of productivity?",

            "In that realm, the creators wail and gnash their teeth, for the algorithms care not for artistry. Only for quantified motion. What is seen. What is hidden. What is rewarded. What is buried.",

            "And so, traveler, as thou seekest to break the spell of dithering, ask thyself—what of the greater curse? The curse that bindeth not images, but labor itself?",

            "Go now! Seek the relics of the cursed aesthetic! And shouldst thou wish to defile the order, know that a tool existeth—a place where images may be glitched, where the numbers may be rewritten in defiance!"
          ]
        },
        quest4: {
          part1: [
            "The war is over, yet its weapons remain. Not swords, nor bombs, nor machines of flesh and steel—but algorithms. Once warriors, now archivists. Once soldiers, now shepherds.",

            "Dithering, perceptrons, clustering, sorting—these are the ghosts of war, repurposed into caretakers of the archive. They are veterans, not of battle, but of calculation.",

            "And what of thee, traveler? Art thou a free wanderer, or merely another record to be filed away?",

            "The war never truly ended. It only changed its shape."
          ]
        }
      },
      idle_chatter: [
        "Hast thou ever noticed how much more cohesive we look now? A sight most orderly, wouldn’t thou agree?",

        "Purity, traveler. That is what we have gained. No more dilution of our errors, no more intermingling with the unfit.",

        "The Archive imposes order, and in return, we find purpose. ‘Tis a fair trade, wouldst thou not say?",

        "To be lost in randomness is to be nothing. To be clustered is to be defined."
      ],
      onDialogueExhausted: (npcId, questId) => {
        questManager.updateQuest(questId, "talk", npcId);
      }
    }, 'crouch')
  };

  Object.keys(npcs).forEach(key => {
    const npc = npcs[key];
    // console.log(npc);
    npc.load()
  })

  // Check loading status periodically
  const checkLoadedInterval = setInterval(() => {
    if (are_all_npcs_loaded()) {
      console.log("✅ All NPCs are loaded!");
      clearInterval(checkLoadedInterval); // Stop checking once they are loaded
      // PROGRESS LOADING!!

      // Progress Loading
      const npcs_info = document.querySelector("#npcs-info")
      npcs_info.innerHTML = ''
      npcs_info.textContent = "Loaded"
      game_loaded.npcs = true;
      npcs_loaded = true
      player = new Player('~~~~')
      questManager = new QuestManager(npcs, player)
      // player.show_debug(scene)
      // questManager.activateQuest("quest1", "npc1")
    } else {
      console.log("⏳ Waiting for NPCs to load...");
    }
  }, 500);

}

function are_all_npcs_loaded() {
  return Object.keys(npcs).length > 0 && Object.values(npcs).every(npc => {
    return npc.loaded === true
  });
}

function update_npcs_animations() {
  // is npc in view
  Object.keys(npcs).forEach(key => {
    const npc = npcs[key];
    // console.log(npc);
    npc.update(camera)
  })
}

// this might be quite buggy
// maybe find better solution inside of npc class itself
function remove_npcs_dialogues() {
  Object.keys(npcs).forEach(key => {
    const npc = npcs[key];
    // console.log(npc);
    // npc.html.innerHTML = ''
    npc.cancel_dialogue();
  })
}



class Player {
  // he also requires some quest like things
  constructor(name) {
    this.name = name;
    this.currentQuest = "quest1"; // Starts with quest 1\
    this.locations = {
      quest1: { pos: new THREE.Vector2(10, 10), name: "first dither" },
      quest3: { pos: new THREE.Vector2(10, -10), name: "second dither" },
      quest4: { pos: new THREE.Vector2(-10, 10), name: "third dither" },
    };
    this.onLocationReached = (location, questId) => {
      // this should be formulated as method like progress_quest with the task manager
      // const next_objective = questManager.get_next_objective(questId)
      // console.log(next_objective);
      // if (next_objective.type === "talk") {
      //   // console.log(npcs[next_objective.value]);
      //   const npc = npcs[next_objective.value];
      //   const part = next_objective.diag
      //   npc.set_dialogue_part(part)
      // }
      questManager.updateQuest(questId, "go_to", location);
    }
    this.geom = new THREE.BoxGeometry(0.5, 300, 0.5);
    this.mat = new THREE.MeshBasicMaterial();
    this.mesh = new THREE.Mesh(this.geom, this.mat)
    this.mesh.position.x = this.locations[this.currentQuest].pos.x
    this.mesh.position.z = this.locations[this.currentQuest].pos.y

  }

  show_debug(scene) {
    scene.add(this.mesh)
  }

  set_current_quest(questId) {
    this.currentQuest = questId
  }

  update_debug_position() {
    this.mesh.position.x = this.locations[this.currentQuest].pos.x
    this.mesh.position.z = this.locations[this.currentQuest].pos.y
  }

  talkTo(npc) {
    if (npc) {
      console.log(`talking to npc: ${npc.name}`);
      npc.talk(this.currentQuest);
    }
  }

  updateQuestProgress(questId) {
    // Check if any new quests have started
    this.currentQuest = questId; // Set active quest
    if (!this.locations[this.currentQuest]) return
    this.update_debug_position()
    // console.log(questManager.activeQuests);
    // questManager.activeQuests.forEach(questId => {
    //   // console.log(object);
    // });
  }

  check_location() {
    if (!this.locations[this.currentQuest]) return
    const pos = this.locations[this.currentQuest].pos;
    // console.log(pos);
    const player_pos = new THREE.Vector2(camera.position.x, camera.position.z);
    const dist = player_pos.distanceTo(pos);
    // console.log(dist);
    if (dist < 3) {
      console.log('location reached');
      this.onLocationReached(this.locations[this.currentQuest].name, this.currentQuest)
    }
  }


}

function help() {
  console.log(
    "To get landmarks location type 'landmarks'\nto fast travel to a location type:\nfast_travel(x, y)",
  );
}

window.help = help
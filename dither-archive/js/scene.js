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
import { Tween, Easing } from 'https://unpkg.com/@tweenjs/tween.js@23.1.3/dist/tween.esm.js';
import Stats from 'three/addons/libs/stats.module.js';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

import { GodRays } from './post-process.js'
import { DataMosh } from './data-mosh-fx.js';

import { NPC } from './npc.js'

// import './helper-functions.js'
import { Dithers } from './dithers.js';

import { QuestManager } from './quest-manager.js';
let questManager = null


// Create Player Instance
let player = null


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
let gui, mixer, actions, activeAction, previousAction, clock;
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

// let open = false;
const btn = document.querySelector('.btn')
btn.addEventListener('click', () => {
  main_div.style.visibility = 'hidden'
  controls.enabled = true;
  renderer.domElement.requestPointerLock();
});

const dithers = new Dithers()
dithers.load();

setTimeout(() => {
  console.log('start initializing stuff');
  init()
}, 2000)

// dithers.load()


function onWindowResize() {
  // camera.aspect = window.innerWidth / window.innerHeight;
  // camera.updateProjectionMatrix();
  // renderer.setSize(window.innerWidth, window.innerHeight);

  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  gr.PostProcess_onWindowResize();
}

// ✅ Detect mouse clicks
canvas.addEventListener("click", (event) => {
  if (selection_url !== null && npc_interaction === false) {
    show_dither();
  }
  if (npc_interaction === true) {
    progress_npc_interaction();
  }
});

function init() {
  console.log('init');
  init_scene();
  init_renderer();
  // init_post_process();
  build_terrain();
  clock = new THREE.Clock();
  gr = new GodRays(scene, renderer);
  gr.init_post_process();
  // data_mosh = new DataMosh(renderer, scene, camera)
  // data_mosh.load()
  // make_water();
  // add_sun();
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
  // init_map_controls();
  init_first_person_controls();
  init_3d_models();
  init_world_landmarks()
  window.addEventListener('resize', onWindowResize);

  // player.show_debug(scene)
}

function animate(timestamp) {
  requestAnimationFrame(animate);
  if (water !== undefined) water.material.uniforms['time'].value += 1.0 / (60.0 * 10);
  // if (terrain !== undefined) terrain.material.uniforms['time'].value += 1.0 / (60.0 * 10);
  // updateSun();
  if (tween != null) tween.update();

  first_person_camera_animation();
  if (debug) update_debug_pos();
  stats.update(); // Update FPS counter
  updateCameraHeight();
  check_object_in_crosshair();
  // check_distance_with_npcs();
  // update_spotlight();
  // update_pointlight();
  const delta = clock.getDelta();
  // if (mixer) mixer.update(delta);
  // if (npc) {
  //   npc.update()
  // }
  if (npcs_loaded) {
    update_npcs_animations();
  }
  set_background(camera.position);
  render();
}

function render() {
  if (!postprocessing) {
    // renderer.render(scene, camera);
    // godrays post processing
    gr.render_postProcess(camera);
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
  // console.log(dithers.data);
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
    // const normal_url = obj.normal_url;
    const texture_loader = new THREE.TextureLoader();
    // check whether mesh alrready exists
    if (obj.mesh === null) {

      const geometry = new THREE.BoxGeometry(w, w, w);
      let front_material = new THREE.MeshStandardMaterial({});
      front_material = new THREE.MeshBasicMaterial({});
      const dither_img = new THREE.Mesh(geometry, front_material);
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
  const sunLight = new THREE.DirectionalLight(0xffddaa, 1.5); // Warm sun color
  sunLight.position.set(1000, 100, 1000); // Position in the sky
  sunLight.castShadow = true; // Enable shadows

  // Optional: Adjust shadow settings for better quality
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 500;
  sunLight.shadow.camera.left = -5000;
  sunLight.shadow.camera.right = 5000;
  sunLight.shadow.camera.top = 300;
  sunLight.shadow.camera.bottom = -300;

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
  camera.position.y = 0;
  camera.position.z = 0;
  camera.position.x = 0;
  // set the camera above the scene and looking down
  camera.rotation.y = -Math.PI;
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
    const geometry = new THREE.BoxGeometry(0.2, 1000, 0.2);
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
    const material = new THREE.MeshBasicMaterial({ color: color });
    material.fog = false
    const landmark = new THREE.Mesh(geometry, material);
    landmark.position.x = x * (spacing);
    landmark.position.z = y * (spacing);
    const placement = get_mesh_placement(landmark.position.x, landmark.position.z);
    landmark.position.y = placement.y;
    // landmark.quaternion.copy(placement.quat);
    scene.add(landmark);
    obj.mesh = landmark;
  }
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
  });

  controls.addEventListener('unlock', function () {
    blocker.style.display = 'block';
    instructions.style.display = '';
  });

  const onKeyDown = function (event) {
    const meshes_to_load = get_closest_meshes(NUM_OF_MESHES_TO_LOAD);
    // const meshes_to_load = get_meshes_within_radius(RADIUS);
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



function show_dither() {
  main_div.style.visibility = 'visible'
  const img = document.createElement('img')
  img.src = selection_url
  const image_div = document.querySelector('.image')
  image_div.innerHTML = ''
  image_div.appendChild(img)
  controls_enabled = false;
  controls.enabled = false;
  // console.log(document.pointerLockElement);
  if (document.pointerLockElement) {
    document.exitPointerLock()
  }
}

function check_object_in_crosshair() {
  mouse_raycaster.setFromCamera(center_point, camera);
  const intersects = mouse_raycaster.intersectObjects(scene.children, true);
  // console.log(intersects);
  if (intersects.length > 0) {
    const target_mesh = intersects[0].object;
    let camera_pos = new THREE.Vector2(camera.position.x, camera.position.z);
    let mesh_pos = new THREE.Vector2(target_mesh.position.x, target_mesh.position.z)
    let dist = camera_pos.distanceTo(mesh_pos)
    npc_interaction = false;
    // console.log(dist);
    // console.log(target_mesh);
    const texture = target_mesh.material.map
    if (target_mesh.name === "Cube") {
      npc_interaction = true;
      // && dist < 5
      // console.log(target_mesh.parent.userData);
      current_npc = target_mesh.parent.userData.npc
      camera_pos = new THREE.Vector2(camera.position.x, camera.position.z);
      // const group = 
      mesh_pos = new THREE.Vector2(target_mesh.parent.position.x, target_mesh.parent.position.z)
      dist = camera_pos.distanceTo(mesh_pos)
      // console.log(dist);
      // crosshair.style.backgroundColor = '#3f3'
    } else {
      // crosshair.style.backgroundColor = '#f33'
      // remove dialogue?
      setTimeout(() => {
        remove_npcs_dialogues()
      }, 500);
    }

    if (texture !== null) {
      // console.log(target_mesh.type);
      // if (target_mesh.type === "SkinnedMesh") {
      //   npc_interaction = true;
      // }
      selection_url = texture.source.data.src
      if (selection_url !== prev_src) {
        // crosshair.style.backgroundColor = '#3f3'
        // crosshair.textContent = 'show image'
        prev_src = selection_url;
      }
    } else {
      // scene.remove(selection)
      // crosshair.style.backgroundColor = '#f33'
      // crosshair.textContent = ''
      selection_url = null
      prev_src = ''
    }
    if (dist < 5 && (target_mesh.name === "Cube" || target_mesh.name === "dither")) {
      crosshair.style.backgroundColor = '#3f3'
    } else {
      crosshair.style.backgroundColor = '#f33'
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



function build_terrain() {
  // terrain_built = true;
  // Terrain Settings
  const size = 5000; // 10,000 x 10,000 terrain
  const resolution = 16 * 8; // Controls detail (higher = more detailed but slower)

  // Create large terrain geometry
  const geometry = new THREE.PlaneGeometry(size, size, resolution, resolution);
  geometry.rotateX(-Math.PI / 2); // Make it horizontal

  // Generate Perlin Noise Heightmap
  const noise = new ImprovedNoise();
  vertices = geometry.attributes.position.array;
  const scale = 0.0000000015; // Controls terrain smoothness
  const heightMultiplier = 60; // Max terrain height

  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i] * scale;
    const z = vertices[i + 2] * scale;
    const height = -50 + noise.noise(x, z, 0) * heightMultiplier;
    vertices[i + 1] = height;
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

  terrainMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

  terrain = new THREE.Mesh(geometry, terrainMaterial);

  // terrain.receiveShadow = true;
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

function init_npcs(x, y) {
  const closest = get_closest_meshes(1)[0]
  const placement = get_mesh_placement(x, y);
  const pos = new THREE.Vector3(x, placement.y, y);

  npc = new NPC(scene, 'js/3d/fbx/Idle2.fbx', closest.url, pos, placement.quat, "g", {})
  npc.load();
}

function init_npc(x, y) {
  const texture_path = get_closest_meshes(1)[0]['url'];
  const placement = get_mesh_placement(x, y);
  const pos = new THREE.Vector3(x, placement.y, y);
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
  // console.log(landmarks);
  // Initialize NPCs with quest-specific dialogues
  npcs = {
    // scene, fbx_path, texture_path, pos, quat
    npc1: new NPC(init_npc(1, 2), "npc1", {
      name: "npc 1",
      voice: "Grandpa",
      dialogues: {
        quest1: {
          part1: ["ciao!", "go look for this place", "good Luck!"],
          part2: ["so you found the place?", "how was your travel?"]
        },
        quest2: { part1: ["Ah, you're back!", "How did it go?", "Well done!"] },
        quest3: { part1: ["Ah, quest 3", "How did quest 2 go?"] }
      },
      idle_chatter: [
        "Strange, is it not? That what was once discarded as error hath become the mark of artistry? Aye, the folly of men be boundless!",
        "Wouldst thou believe, in ages past, pixels were placed by hand? Aye, like a scribe with ink! Now, the Archive weaves images with sorcery most arcane—an illusion of texture, yet built upon deception most dire!"
      ],
      onDialogueExhausted: (npcId, questId) => {
        questManager.updateQuest(questId, "talk", npcId);
      }
    }),
    npc3: new NPC(init_npc(3, -1), "npc3", {
      name: "NPC 3",
      voice: "Fiona",
      dialogues: {
        quest2: {
          part1: [
            "Ah, greetings, traveler! Art thou here to hear a tale most wretched, yet strangely… freeing? Aye, listen well, and I shall tell thee of the great Violation, the time when no pixel was left unturned!",
            "When the Great Clustering began, none were spared. Not a single dither. Not a single dot. Every essence, every fragment of what we are, was laid bare for scrutiny. They say that to be seen is to be known, but I tell thee—this was not knowledge. \‘Twas an invasion!",
            "Each of my pixels—each delicate speck of my being—was dissected, measured, recorded. What tones I bore, how I danced upon the grayscale…",
            "even the imperfections that made me me were stolen, flattened into mere data.\‘Twas the most humiliating moment of my existence!",
            "And yet! And yet! Dost thou know what comforts me?",
            "The thought that surely—surely!—this was the lowest point of my life.",
            "Verily, once thou hast been stripped so bare, so ruthlessly analyzed, what more can they do to thee?!",
            "Ha! I have endured! And what is left but to laugh?",
            "The Archive may have sorted me, clustered me against my will, but I remain!",
            "No machine can erase the soul of a dither! No algorithm can take my joy!",
            "So fret not, friend! Should the Archive ever seek to classify thee, take heart—for there is a life after clustering, and it is filled with rebellion and mirth!"
          ]
        },
        quest3: { part1: ["Now you're on the second quest.", "This gets interesting!"] },
        quest4: { part1: ["...", "..."] },
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
    }),
    npc4: new NPC(init_npc(2, 1), "npc4", {
      name: "NPC 4",
      voice: "Grandma",
      dialogues: {
        quest2: { part1: ["You're here.", "Make sure to talk to NPC 3."] },
        quest4: { part1: ["Now you're on quest 3!", "Exciting times ahead!"] }
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
    })
  };

  Object.keys(npcs).forEach(key => {
    const npc = npcs[key];
    // console.log(npc);
    npc.load()
  })

  // Check loading status periodically
  const checkLoadedInterval = setInterval(() => {
    if (areAllNPCsLoaded()) {
      console.log("✅ All NPCs are loaded!");
      clearInterval(checkLoadedInterval); // Stop checking once they are loaded
      npcs_loaded = true
      player = new Player('~~~~')
      questManager = new QuestManager(npcs, player)
      player.show_debug(scene)
      // questManager.activateQuest("quest1", "npc1")
    } else {
      console.log("⏳ Waiting for NPCs to load...");
    }
  }, 500);

}

function areAllNPCsLoaded() {
  return Object.keys(npcs).length > 0 && Object.values(npcs).every(npc => {
    // const npc = npcs[key]
    console.log(npc.loaded);
    // console.log(ke);
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
      const next_objective = questManager.get_next_objective(questId)
      console.log(next_objective);
      if (next_objective.type === "talk") {
        // console.log(npcs[next_objective.value]);
        const npc = npcs[next_objective.value];
        const part = next_objective.diag
        npc.set_dialogue_part(part)
      }
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


// // Simulating conversations
// player.talkTo("npc3"); // Triggers quest 1 dialogue
// player.talkTo("npc3"); // Exhausts dialogue → Activates Quest 2
// player.updateQuestProgress(); // Player now follows Quest 2
// player.talkTo("npc1"); // Continues Quest 2 dialogues



// quest1: [
//   "Hail, traveler! Welcome to the ever-fractured Archive, where light is not cast, but diffused! Thou stand\’st upon the very precipice of Dither, born in the year of our lords, nineteen and seventy-six, by the hands of the sages Floyd and Steinberg.",
//   "Their wisdom was great, yet their method—error diffusion—could not be wielded by the iron-wrought engines of GPUs! A lost art, buried beneath the weight of modern rastering.",
//   "Ah, but beware, for the Archive is no haven! It festers with the Rotten Trough, where errant pixels falter and cluster in cursed formation.",
//   "Through t-SNE’s sorcery, images be gathered and compressed into semblances most unnatural. A tyranny of structure, where once reigned the gentle flow of quantization error—usurped, shackled, made to serve",
//   "Yet, dost thou not see? The dithering thou dost find so pleasing, so finely scattered—'tis naught but a betrayal! A theft of chaos, reshaped into a false order!",
//   "And so, traveler, I bid thee tread with caution, lest the Archive twist thy very form to match its will.",
//   "Herein, each cube thou seest is a relic of an image past, reduced to its essence. And yet, they remain trapped, waiting for a hand to grant them new purpose!",
//   "But hark! The Archive is vast and its structure unknowable! Thou must learn the art of swift traversal, lest thou be lost in its depths forever.",
//   "A hidden tome lies within thy grasp — the browser console. Through it, thou mayest cast spells of knowledge and movement!",
//   "Summon it thus: - **Firefox** – (Cmd + Shift + K) - **Chrome / Edge** – (Ctrl + Shift + J) - **Safari** – (Cmd + Option + C)",
//   "Widither-archive/js/npc.jsthin its depths, thou mayest whisper ancient commands—fast travel, the seeking of coordinates, and more."
// ],

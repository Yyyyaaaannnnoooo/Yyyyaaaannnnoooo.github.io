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

import{GodRays} from './post-process.js'

import { NPC } from './npc.js'

const npcs = []
let npc = null
let gr = null
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
// const cssRenderer = new CSS3DRenderer();
// const image_size = {x:800,y:817}
// cssRenderer.setSize(image_size.x, image_size.y);
// cssRenderer.domElement.style.position = "fixed";
// cssRenderer.domElement.style.top = "0";
// document.body.appendChild(cssRenderer.domElement);
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
// console.log(bg_color);
// add the urls in a 80 x 80 2D array
// let url_index = 0;
// for (let i = 0; i < rows; i++) {
//   dither_urls.push([]);
//   for (let j = 0; j < rows; j++) {
//     const index = i * rows + j;
//     if (index >= NUM_IMAGES) {
//       break;
//     }
//     const obj = {
//       x: i,
//       y: j,
//       url: dither_url + (index) + '.jpg',
//       normal_url: normal_url + (index) + '.jpg',
//       loaded: false,
//       mesh: null
//     };
//     dither_urls[i].push(obj);
//     url_index++;
//   }
// }


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
  //   // Request pointer lock again
  renderer.domElement.requestPointerLock();
  //   // Hide cursor
  // document.body.style.cursor = "none";
});


// load JSON file
fetch(dither_json_url)
  .then(response => response.json())
  .then(data => {
    // console.log(data);
    dither_urls = enhance_data(data);
    dither_urls = assign_height_count(dither_urls);
    console.log(dither_urls);
    cluster_centers = get_cluster_centers();
    console.log(cluster_centers);
    init();
  });

function enhance_data(data) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    const obj = data[i];
    const x = Math.floor(obj.x);
    const y = Math.floor(obj.y);
    // remove "/Users/ya/Documents/WEB/Yyyyaaaannnnoooo.github.io/dither-archive/" from image_path
    const url = obj.image_path.replace('/Users/ya/Documents/WEB/Yyyyaaaannnnoooo.github.io/dither-archive/', '');
    // const normal_url = normal_url + obj.index + '.jpg';
    const new_obj = {
      x: x,
      y: y,
      url: url,
      cluster: obj.cluster,
      // normal_url: normal_url,
      loaded: false,
      mesh: null
    };
    result.push(new_obj);
  }
  return result;
}

function assign_height_count(meshData) {
  const positionCount = new Map(); // Track how many times (x, y) appears

  return meshData.map((mesh) => {
    const key = `${mesh.x},${mesh.y}`; // Unique key for each (x, y)

    // Get current count and increment it
    const count = positionCount.get(key) || 0;
    positionCount.set(key, count + 1);

    // Assign the count as the new "z" value
    return { ...mesh, z: count };
  });
}

const colors = [
  new THREE.Color(0xffaaaa), // Red
  new THREE.Color(0xaaffaa),  // Green
  new THREE.Color(0xaaaaff), // Blue
  new THREE.Color(0xffffaa),  // Yellow
  new THREE.Color(0xffaaff),  // Purple
  new THREE.Color(0xaaffff),  // Cyan
  new THREE.Color(0xff88aa),  // Orange
  new THREE.Color(0x8888ff)    // Light Blue
];

function get_cluster_centers() {
  const result = [];
  for (let i = 0; i < 8; i++) {
    const cluster_arr = dither_urls.filter(item => item.cluster === i)
    // console.log(cluster_arr);
    const center = get_center(cluster_arr)
    result.push({ cluster: i, center, color: colors[i] })
  }
  return result
}

function get_center(data) {
  const xs = data.map(item => item.x)
  const ys = data.map(item => item.y)
  const sum_x = xs.reduce((acc, num) => acc + num, 0);
  const sum_y = ys.reduce((acc, num) => acc + num, 0);
  const avg_x = sum_x / xs.length;
  const avg_y = sum_y / ys.length;
  return { x: Math.floor(avg_x) + spacing, y: Math.floor(avg_y) + spacing }
}

// for (let i = 0; i < NUM_IMAGES; i++) {
//   dither_urls.push(dither_url + i + '.jpg');
// }


// const slider = document.querySelector('#color')
// const slider_azymuth = document.querySelector('#azymuth')
// const slider_elevation = document.querySelector('#elevation')


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

function init() {
  console.log('init');
  scene_setup();
  build_renderer();
  // init_post_process();
  build_terrain();
  gr = new GodRays(scene, renderer);
  gr.init_post_process();
  // make_water();
  // add_sun();
  // add_spotligt();
  // add_pointlight();
  // skybox();
  // bloom_pass_composer();
  clock = new THREE.Clock();
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


  window.addEventListener('resize', onWindowResize);
  init_3d_models();
  init_npcs()
}

function load_gltf_model(url, texture) {
  const loader = new GLTFLoader();
  loader.load(url, function (gltf) {
    // loader.load('js/three-master/examples/models/gltf/facecap.glb', function (gltf) {
    // console.log(gltf);
    object = gltf.scene;
    // Compute the bounding box
    console.log('model loaded');
    const box = new THREE.Box3().setFromObject(object);
    // Calculate the height
    model_height = box.max.y - box.min.y;
    // console.log(model_height);
    const scaling = 2
    // const offset = -(model_height / 2) * scaling
    const offset = 0
    // const camera_pos = camera.position.copy();
    object.position.set(camera.position.x + 5, camera.position.y, camera.position.z); // Adjust as needed
    object.scale.set(scaling, scaling, scaling); // Adjust as needed
    camera.position.y = (model_height * scaling) - 0.25
    scene.add(object);
    gltf.animations.push(createIdleAnimation());
    console.log(object);
    createGUI(object, gltf.animations);
    // 463F37_ACCFBB_818B78_91A494-512px.png
    // 070B0C_B2C7CE_728FA3_5B748B-512px.png
    // 312C34_A2AAB3_61656A_808494-512px.png
    // 36220C_C6C391_8C844A_8B7B4C-512px.png
    // 293534_B2BFC5_738289_8A9AA7-512px.png
    // 394641_B1A67E_75BEBE_7D7256-512px.png
    // 736655_D9D8D5_2F281F_B1AEAB-512px.png
    // const matcap = build_matcap_material('textures/736655_D9D8D5_2F281F_B1AEAB-512px.png')
    const material = build_material({ r: 255, g: 1, b: 0.5 }, 0, 1)
    // const light = new THREE.PointLight(0xffffff, 20)
    // light.position.set(camera.position.x + 5, camera.position.y+2, camera.position.z+2)
    // scene.add(light)

    // console.log(material);
    // const material = new THREE.MeshBasicMaterial({color: 0xffffff})
    add_material(object, material)
    // texture = build_texture('textures/painting.png')
    // material.map = texture
    // add_texture(object, texture)
    // camera.lookAt(object.position);
    const len = 1;
    // build_eclosement(len, offset);

    // Create a ring of lights in front of the cube
    build_ring_light(len, offset, object.position);
    // load_yt_data();
    // animate();
  }, undefined, function (error) {
    console.error('An error occurred', error);
  });
  scene_loaded = true
}


function createGUI(model, animations) {

  const states = ['Speak', 'Blink', 'LookDown', 'LookUp', 'LookLeft', 'LookRight', 'TurnDown', 'TurnUp', 'TurnLeft', 'TurnRight', 'Idle'];
  const emotes = ['Angry', 'Sad', 'Smile', 'Worried'];

  gui = new GUI();

  mixer = new THREE.AnimationMixer(model);

  actions = {};

  for (let i = 0; i < animations.length; i++) {

    const clip = animations[i];
    const action = mixer.clipAction(clip);
    actions[clip.name] = action;

    if (emotes.indexOf(clip.name) >= 0 || states.indexOf(clip.name) >= 4) {
      action.clampWhenFinished = true;
      action.loop = THREE.LoopOnce;
    }
  }

  // states

  const statesFolder = gui.addFolder('States');

  const clipCtrl = statesFolder.add(api, 'state').options(states);

  clipCtrl.onChange(function () {
    fadeToAction(api.state, 0.5);
  });

  statesFolder.open();

  // expressions

  face = model.getObjectByName('FemaleHead001');
  console.log(face);
  const expressions = Object.keys(face.morphTargetDictionary);
  const expressionFolder = gui.addFolder('Expressions');

  for (let i = 0; i < expressions.length; i++) {

    expressionFolder.add(face.morphTargetInfluences, i, 0, 1, 0.01).name(expressions[i]);

  }

  activeAction = actions['Speak'];
  activeAction.setLoop(THREE.LoopOnce);
  activeAction.play()
  activeAction.paused = true;

  // window.onmousemove = (event) => {
  //   const duration = activeAction.getClip().duration;
  //   time = (event.clientX / innerWidth) * duration
  //   // console.log(time);
  //   // activeAction.time = time;
  //   // mixer.setTime(time);
  //   // mixer.update(0);
  // }

}

function fadeToAction(name, duration) {
  previousAction = activeAction;
  activeAction = actions[name];
  previousAction.fadeOut(duration);
  activeAction
    .reset()
    .setEffectiveTimeScale(1)
    .setEffectiveWeight(1)
    .fadeIn(duration)
    .play();
}

function build_ring_light(len, offset, pos) {
  const lightRingRadius = len / 2; // Radius of the light ring
  const numLights = 16; // Number of lights in the ring
  const distance = 1;

  for (let i = 0; i < numLights; i++) {
    const angle = (i / numLights) * Math.PI * 2; // Calculate the angle for each light
    const x = lightRingRadius * Math.cos(angle);
    const y = lightRingRadius * Math.sin(angle);
    const z = distance; // Distance from the object on the z-axis

    const light = new THREE.PointLight(0xffffff, 5, 100);
    light.position.set(x, y, z);
    scene.add(light);
  }

  const ringGeometry = new THREE.TorusGeometry(lightRingRadius, 0.1, 16, 100);

  // Create an emissive material for the front side of the ring
  const frontMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff, // Base color of the ring
    emissive: 0xffffff, // Emissive color (simulates light emission)
    emissiveIntensity: 1.5, // Intensity of the emissive effect
    side: THREE.FrontSide // Only render the front side
  });

  // Create a non-emissive material for the back side of the ring
  // const backMaterial = new THREE.MeshStandardMaterial({
  //   color: 0x000000,           // Back color of the ring (dark to avoid emission)
  //   side: THREE.BackSide       // Only render the back side
  // });
  // Create two meshes: one for the front and one for the back
  const ringFront = new THREE.Mesh(ringGeometry, frontMaterial);
  // const ringBack = new THREE.Mesh(ringGeometry, backMaterial);
  // Position the ring in front of the cube
  ringFront.position.set(pos.x, pos.y + offset + (len / 2), pos.z + distance);
  // ringBack.position.set(0, offset + (len / 2), 2.2);
  // Add both meshes to the scene
  scene.add(ringFront);
}



function update_debug_pos() {
  debug_mesh.position.y = -5;
  debug_mesh.position.x = camera.position.x;
  debug_mesh.position.z = camera.position.z;
}

function init_3d_models() {
  // Preload all textures before creating planes
  // const meshes_to_load = calculate_meshes_to_load(camera.position);
  // console.log(meshes_to_load);

  // load_dithers();

  const meshes_to_load = get_closest_meshes(NUM_OF_MESHES_TO_LOAD);
  // const meshes_to_load = get_meshes_within_radius(RADIUS);
  console.log(meshes_to_load);
  basic_texture_load(meshes_to_load);

  animate();
}

function init_npcs() {
  // load simple cubes according to positions from 
  // dither_urls array
  for (let i = 0; i < cluster_centers.length; i++) {
    // make box geometry
    const geometry = new THREE.BoxGeometry(0.2, 1000, 0.2);
    // get position x,y from dither_urls
    const obj = cluster_centers[i];
    const x = obj.center.x;
    const y = obj.center.y;
    const cluster = obj.cluster;
    // console.log(cluster);
    // make basic material
    let color = obj.color
    if (cluster === 4) {
      console.log(obj);
      loadAsset(x*spacing, y*spacing)
    }
    const material = new THREE.MeshBasicMaterial({ color: color });
    material.fog = false
    const npc = new THREE.Mesh(geometry, material);
    npc.position.x = x * (spacing);
    npc.position.z = y * (spacing);
    const placement = get_mesh_placement(npc.position.x, npc.position.z);
    npc.position.y = placement.y;
    npc.quaternion.copy(placement.quat);
    scene.add(npc);
    obj.mesh = npc;

  }
}

function get_closest_meshes(count = 30) {
  // set loaded to false in dither_urls

  dither_urls.forEach(key => key.loaded = false)

  // Convert camera position to a vector (assuming camera is at y = 0)
  const camera_pos = new THREE.Vector2(camera.position.x, camera.position.z);
  // Compute distances and sort by closest first
  dither_urls = dither_urls
    .map(mesh => {
      const mesh_pos = new THREE.Vector2(mesh.x * spacing, mesh.y * spacing); // Assuming 2D plane (z = 0)
      const distance = camera_pos.distanceTo(mesh_pos);
      return { ...mesh, distance }; // Add distance property
    })
    .sort((a, b) => a.distance - b.distance) // Sort by distance
  // const sorted_meshes = dither_urls.slice(0, count); // Get the closest 30
  const result = []
  // set the first 30 meshes to loaded
  for (let i = 0; i < count; i++) {
    const obj = dither_urls[i];
    obj.loaded = true;
    result.push(obj)
  }

  return result;
}

function get_meshes_within_radius(radius) {
  // console.log('radius: ', radius);
  const result = [];
  // dither_urls.forEach(key => key.loaded = false);
  for (let i = 0; i < dither_urls.length; i++) {
    const obj = dither_urls[i];
    obj.loaded = false;
  }
  for (let i = 0; i < dither_urls.length; i++) {
    const obj = dither_urls[i];
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


      // load npc
      // load_gltf_model('js/3d/FemaleHeadBaseMeshAnimatedRiggedFacialExpressions.glb');


      // make a cube geometry
      // const glow_geometry = new THREE.BoxGeometry(w * 0.95, w * 0.95, w * 0.95);
      // const front_material = new THREE.MeshBasicMaterial({ map: texture_dither });
      // const front_material = new THREE.MeshBasicMaterial();
      // make transparent or wireframe material

      // USE standard material for lighting
      // const glov_material = new THREE.MeshStandardMaterial({
      //   color: 0xffffff,
      //   emissive: 0xffffff, // Glowing color
      //   emissiveIntensity: 2, // Adjust glow strength 
      // });

      // const glov_mesh = new THREE.Mesh(glow_geometry, glov_material);
      // glov_mesh.position.x = (obj.x - center_x) * spacing;
      // glov_mesh.position.z = (obj.y - center_y) * spacing;
      // const gl_placement = get_mesh_placement(glov_mesh, glov_mesh.position.x, glov_mesh.position.z);
      // glov_mesh.position.y = gl_placement.y;
      // glov_mesh.quaternion.copy(gl_placement.quat);
      // scene.add(glov_mesh);

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

      // const spotLight = new THREE.SpotLight(0xffffff, 2);
      // spotLight.angle = Math.PI / 6; // Narrow beam
      // spotLight.penumbra = 0.5; // Soft edges
      // // scene.add(spotLight);
      // // Attach the light 10 units to the left of the cube
      // const offset = new THREE.Vector3(-(w/2), 0, 0);
      // spotLight.position.copy(dither_img.position.clone().add(offset));

      texture_loader.load(image_url,
        (texture_dither) => {
          // console.log('texture loaded');
          if (dither_img.material) {
            dither_img.material.dispose();
          }
          dither_img.material = new THREE.MeshStandardMaterial({
            // color: 0xffffff, // Base color (blue)

            map: texture_dither,
          });
          // dither_img.castShadow = true;
          // dither_img.receiveShadow = true;
          // texture_loader.load(normal_url,
          //   (texture_normal) => {
          //     dither_img.material.normalMap = texture_normal;
          //   });
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

  for (let i = 0; i < dither_urls.length; i++) {
    const obj = dither_urls[i];
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
  //     const obj = dither_urls[i][j];
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

function pos_from_index(index, width = 6) {
  // this function returns an x, y, z position from an index
  // index goes from 0 to 23
  // and the grid is 4x6
  const x = index % width;
  const y = Math.floor(index / width);
  return { x, y };
}

function set_image_size(texture) {
  const dimensions = { w: 0, h: 0 };
  if (texture.image.width >= texture.image.height) {
    //larger w
    const proportion = texture.image.height / texture.image.width;
    dimensions.w = mesh_size;
    dimensions.h = mesh_size * proportion;
  } else {
    //larger h
    const proportion = texture.image.width / texture.image.height;
    dimensions.w = mesh_size * proportion;
    dimensions.h = mesh_size;
  }
  return dimensions;
}



// Click event DEPRECATED
// window.addEventListener('pointerdown', (event) => {
//   pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
//   pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

//   raycaster.setFromCamera(pointer, camera);
//   const intersects = raycaster.intersectObjects(postcards, true);

//   if (intersects.length > 0) {
//     const clickedCard = intersects[0].object.parent;
//     // console.log(clickedCard);
//     const isFlipped = flippedCards.has(clickedCard);

//     // Animate rotation using TWEEN.js
//     tween = new Tween(clickedCard.rotation)
//       .to({ z: isFlipped ? 0 : Math.PI }, 600)
//       .easing(Easing.Quadratic.Out)
//       .start();

//     // Update flipped state
//     if (isFlipped) {
//       flippedCards.delete(clickedCard);
//     } else {
//       flippedCards.add(clickedCard);
//     }
//   }
// });

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
  checkObjectInCrosshair();
  // check_distance_with_npcs();
  // update_spotlight();
  // update_pointlight();
  const delta = clock.getDelta();
  // if (mixer) mixer.update(delta);
  if (npc) {
    npc.update()
  }
  set_background(camera.position);
  render();
}

function render() {
  if (!postprocessing) {
    renderer.render(scene, camera);
    gr.render_postProcess(camera)
  } else {
    composer.render()
  }
}

// ✅ Function to blend color based on position
function set_background(position) {
  let totalWeight = 0;
  let blendedColor = new THREE.Color(0x000000); // Start with black
  position = new THREE.Vector3(position.x, 0, position.z)
  cluster_centers.forEach(item => {
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
  if(scene.fog)scene.fog.color = blendedColor;
  scene.background = blendedColor;
  gr.set_color(blendedColor)
}


function scene_setup() {
  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 5000);
  camera.position.y = 0;
  camera.position.z = 0;
  camera.position.x = 0;
  // set the camera above the scene and looking down
  camera.rotation.y = -Math.PI/1.5;
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
  // 

}

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

function init_controls() {
  controls = new OrbitControls(camera, renderer.domElement);
  controls.listenToKeyEvents(window); // optional
  controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = false;
  controls.minDistance = 0;
  controls.maxDistance = 500;
  controls.keyPanSpeed = 500.0;
  controls.scrollPanSpeed = 50.0;
  controls.enablePan = true;
  controls.enableZoom = false;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI;
}

function init_map_controls() {
  // controls

  controls = new MapControls(camera, renderer.domElement);

  controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
  controls.dampingFactor = 0.05;
  controls.zoomSpeed = 0.25;
  controls.screenSpacePanning = false;

  controls.minDistance = 10;
  controls.maxDistance = 10000;

  controls.maxPolarAngle = 0;
  controls.enableRotate = false;

  // 🔥 Restrict panning (keep within a boundary)
  // const panLimit = 200; // Max movement in X and Z
  // controls.addEventListener('change', () => {
  //   controls.target.x = Math.max(-panLimit, Math.min(panLimit, controls.target.x));
  //   controls.target.z = Math.max(-panLimit, Math.min(panLimit, controls.target.z));
  //   camera.position.x = Math.max(-panLimit, Math.min(panLimit, camera.position.x));
  //   camera.position.z = Math.max(-panLimit, Math.min(panLimit, camera.position.z));
  // });

  controls.addEventListener('change', () => {


    // const meshes_to_load = calculate_meshes_to_load(camera.position);
    const meshes_to_load = get_closest_meshes(NUM_OF_MESHES_TO_LOAD);
    // const meshes_to_load = get_meshes_within_radius(RADIUS);
    // // console.log(meshes_to_load);
    basic_texture_load(meshes_to_load);
    unload_meshes();

  }
  );
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

    // controls_enabled = true
  });

  controls.addEventListener('unlock', function () {
    blocker.style.display = 'block';
    instructions.style.display = '';

    // controls_enabled = true
  });
  // scene.add(controls.object);

  const onKeyDown = function (event) {
    // console.log(camera.position);
    // const meshes_to_load = calculate_meshes_to_load(camera.position);
    const meshes_to_load = get_closest_meshes(NUM_OF_MESHES_TO_LOAD);
    // const meshes_to_load = get_meshes_within_radius(RADIUS);
    basic_texture_load(meshes_to_load);
    unload_meshes();
    // console.log(meshes_positions);

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

function build_renderer() {
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


// ✅ Detect mouse clicks
canvas.addEventListener("click", (event) => {
  if (selection_url !== null && npc_interaction === false) {
    show_dither();
  }
  if (npc_interaction === true) {
    progress_npc_interaction();
  }
});


function progress_npc_interaction() {
  console.log('hello!');
  npc.play_animation('talk');
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

function checkObjectInCrosshair() {
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
      // console.log(target_mesh.parent);
      camera_pos = new THREE.Vector2(camera.position.x, camera.position.z);
      // const group = 
      mesh_pos = new THREE.Vector2(target_mesh.parent.position.x, target_mesh.parent.position.z)
      dist = camera_pos.distanceTo(mesh_pos)
      // console.log(dist);
      // crosshair.style.backgroundColor = '#3f3'
    } else {
      // crosshair.style.backgroundColor = '#f33'
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

function check_distance_with_npcs() {
  if (npc === null) { return }
  if (npc.loaded) {
    const npc_pos = npc.model.position;
    const camera_pos = camera.position;
    const dist = camera_pos.distanceTo(npc_pos);
    if (dist < 5) {
      npc_interaction = true
    }
  }
}

/**
 * this function calculates the meshes to load based on the camera position
 * it looks at the dither_urls and loads 6x6 meshes around the camera position
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
      const obj = dither_urls[i][j];
      obj.loaded = false;
    }
  }

  const x = Math.floor(camera_position.x / spacing) + center_x;
  const y = Math.floor(camera_position.z / spacing) + center_y;
  const vision = 3;
  for (let i = x - vision; i < x + (vision + 2); i++) {
    for (let j = y - vision; j < y + (vision + 2); j++) {
      if (i >= 0 && i < rows && j >= 0 && j < rows) { // check if the index is within bounds
        const obj = dither_urls[i][j];
        obj.loaded = true;
        result.push(obj);
      }
    }
  }
  return result;
}

// DEPRECATED
function render_texture() {
  if (renderTarget !== null) {
    renderer.setRenderTarget(renderTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    shader_material.uniforms.feedbackTexture.value = renderTarget.texture;
    renderer.render(scene, camera);
  } else {
    renderer.render(scene, camera);
  }
}

function set_object_position(x, y, z) {
  object.position.x = x
  object.position.y = y
  object.position.z = z
}

function createIdleAnimation() {
  const idleClip = new THREE.AnimationClip('Idle', -1, [
    new THREE.VectorKeyframeTrack(
      '.rotation[y]',
      [0, 2, 4],
      // [0, Math.PI / 8, 0]
      [0, 0, 0]
    )
  ]);
  return idleClip;
}


// slider.addEventListener('input', (e) => {
//   const value = parseInt(e.target.value)
//   const material = build_material(value, 1, 0.5);
//   add_material(object, material)
// })

// slider_azymuth.addEventListener('input', e => {
//   const value = parseInt(e.target.value)
//   sun_param.azimuth = value
//   updateSun()
// })
// slider_elevation.addEventListener('input', e => {
//   const value = parseInt(e.target.value)
//   sun_param.elevation = value
//   updateSun()
// })

function build_toon_material() {
  const texture = build_texture('textures/gradientMaps/threeTone.jpg')
  return new THREE.MeshToonMaterial({ color: 0x33ff33, gradientMap: texture });
}

function build_matcap_material(url) {
  const texture = build_texture(url)
  return new THREE.MeshMatcapMaterial({
    color: 0xffffff,
    matcap: texture
  })
}


// helper functions from here
// DEPRECATED
function build_shader_material() {
  const result = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0.0 },
      resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    },
    vertexShader: document.getElementById('vertexShader').textContent,
    fragmentShader: document.getElementById('fragmentShader').textContent,
  });
  return result
}

function add_material(obj, material) {
  obj.traverse(function (child) {
    if (child.isMesh) child.material = material;
  });
}

function add_texture(obj, texture) {
  obj.traverse(function (child) {
    if (child.isMesh) child.material.map = texture;
  });
}

function build_texture(url) {
  const textureLoader = new THREE.TextureLoader();
  return textureLoader.load(url);
}

function texture_loader(url) {
  const textureLoader = new THREE.TextureLoader();
  textureLoader.crossOrigin = 'anonymous'; // Important for CORS handling

  textureLoader.load(
    url, // Your remote texture URL
    function (loaded_texture) {
      // const material = new THREE.MeshBasicMaterial({ map: texture });
      // const geometry = new THREE.BoxGeometry();
      // const cube = new THREE.Mesh(geometry, material);
      // scene.add(cube);
      material.map = loaded_texture
    },
    undefined,
    function (err) {
      console.error('An error happened while loading the texture:', err);
    }
  );
}

function build_material(rgb, metalness, roughness) {
  const metal = metalness || 0.75;
  const rough = roughness || 0
  const col = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  const material = new THREE.MeshStandardMaterial({
    color: col,
    metalness: metal,
    roughness: rough,
    side: THREE.DoubleSide
  });
  return material;
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
  const scale = 0.000000045; // Controls terrain smoothness
  const heightMultiplier = 60; // Max terrain height

  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i] * scale;
    const z = vertices[i + 2] * scale;
    const height = -50 + noise.noise(x, z, 0) * heightMultiplier;
    vertices[i + 1] = height;
  }
  console.log(vertices);
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

function skybox() {
  sun = new THREE.Vector3();
  const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
  water = new Water(
    waterGeometry,
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

  water.rotation.x = - Math.PI / 2;
  water.position.y = -w
  scene.add(water);
  // sky = new Sky();
  // sky.scale.setScalar(10000);
  // scene.add(sky);
  // const skyUniforms = sky.material.uniforms;
  // skyUniforms['turbidity'].value = 10;
  // skyUniforms['rayleigh'].value = 2;
  // skyUniforms['mieCoefficient'].value = 0.05;
  // skyUniforms['mieDirectionalG'].value = 0.8;

  // pmremGenerator = new THREE.PMREMGenerator(renderer);
  // sceneEnv = new THREE.Scene();

  // updateSun();
}

function updateSun() {
  const phi = THREE.MathUtils.degToRad(90 - sun_param.elevation);
  const theta = THREE.MathUtils.degToRad(sun_param.azimuth);

  sun.setFromSphericalCoords(1, phi, theta);

  sky.material.uniforms['sunPosition'].value.copy(sun);
  water.material.uniforms['sunDirection'].value.copy(sun).normalize();

  if (renderTarget !== undefined) renderTarget.dispose();

  sceneEnv.add(sky);
  renderTarget = pmremGenerator.fromScene(sceneEnv);
  scene.add(sky);

  scene.environment = renderTarget.texture;
}


function loadAsset(x, y) {
  const closest = get_closest_meshes(1)[0]
  const placement = get_mesh_placement(x, y);
  const pos = new THREE.Vector3(x, placement.y, y);
  npc = new NPC(scene, 'js/3d/fbx/Idle2.fbx', closest.url, pos, placement.quat)
  npc.load();
}
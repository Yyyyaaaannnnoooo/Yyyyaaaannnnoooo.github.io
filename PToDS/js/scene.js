import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { FirstPersonControls } from 'three/addons/controls/FirstPersonControls.js'
import { Water } from 'three/addons/objects/Water.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Tween, Easing } from 'https://unpkg.com/@tweenjs/tween.js@23.1.3/dist/tween.esm.js'



let camera, scene, renderer, controls, face, model_height;
let gui, mixer, actions, activeAction, previousAction, clock;
const api = { state: 'Idle' };
let texture, material
let shader_material
let object = null;
let renderTarget = undefined

let composer;
let postprocessing = false
let scene_loaded = false
let water = undefined, sun, sky;
let pmremGenerator
let sceneEnv

// Raycaster for click detection
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let flippedCards = new Set();
let tween = null;

const NUM_IMAGES = 24;
const back_url = 'imgs/back/back-';
const front_url = 'imgs/front/front-';
const postcards = [];
const front_urls = [];
const back_urls = [];
for (let i = 0; i < NUM_IMAGES; i++) {
  front_urls.push(front_url + i + '.jpg');
  back_urls.push(back_url + i + '.jpg');
}

const sun_param = {
  elevation: -1,
  azimuth: 180
};


const params = {
  threshold: 0.125,
  strength: 0.125,
  radius: 0.1,
  exposure: 10
};

// const slider = document.querySelector('#color')
// const slider_azymuth = document.querySelector('#azymuth')
// const slider_elevation = document.querySelector('#elevation')
const canvas = document.querySelector('#c')

function init() {
  console.log('init');
  scene_setup();
  // load_gltf_model('js/3d/FemaleHeadBaseMeshAnimatedRiggedFacialExpressions.glb');
  build_renderer()
  skybox();
  // bloom_pass_composer();
  clock = new THREE.Clock();
  // init_controls();
  init_map_controls();
  // init_first_person_controls();

  window.addEventListener('resize', onWindowResize);
  init_3d_models();
}

init();

const animation_type = {
  home: 'home',
  away: 'away',
  filter: 'filter'
}



function init_3d_models() {
  // Preload all textures before creating planes
  // async_texture_load();
  basic_texture_load();
  animate();
}

function basic_texture_load() {
  for (let i = 0; i < NUM_IMAGES; i++) {
    const image_front_url = front_url + i + '.jpg';
    const image_back_url = back_url + i + '.jpg';
    const texture_loader = new THREE.TextureLoader();
    texture_loader.load(image_front_url,
      (texture_front) => {
        texture_loader.load(image_back_url,
          (texture_back) => {
            const dimensions = set_image_size(texture_front);
            const w = dimensions.w;
            const h = dimensions.h;
            // apply texture to plane geometry
            const geometry = new THREE.PlaneGeometry(w, h);
            // const geometry = new THREE.BoxBufferGeometry(512, 250, 1);
            const front_material = new THREE.MeshBasicMaterial({ map: texture_front });
            const back_material = new THREE.MeshBasicMaterial({ map: texture_back });
            const object_front = new THREE.Mesh(geometry, front_material);
            const object_back = new THREE.Mesh(geometry, back_material);
            object_front.rotation.x = -Math.PI / 2;
            object_back.rotation.x = Math.PI / 2;
            object_back.rotation.z = Math.PI;
            object_back.position.y = 2.5;

            const postcard = new THREE.Group();
            postcard.add(object_front);
            postcard.add(object_back);
            postcard.position.x = (pos_from_index(i).x * 60) - (3 * 60);
            postcard.position.z = (pos_from_index(i).y * 60) - (2 * 60);
            postcard.position.y = 0;
            // rotate images belly up
            scene.add(postcard);
            postcards.push(postcard);
          });
      });
  }
}

function pos_from_index(index) {
  // this function returns an x, y, z position from an index
  // index goes from 0 to 23
  // and the grid is 4x6
  const x = index % 6;
  const y = Math.floor(index / 6);
  return { x, y };
}

function set_image_size(texture) {
  const dimensions = { w: 0, h: 0 };
  if (texture.image.width >= texture.image.height) {
    //larger w
    const proportion = texture.image.height / texture.image.width;
    dimensions.w = 50;
    dimensions.h = 50 * proportion;
  } else {
    //larger h
    const proportion = texture.image.width / texture.image.height;
    dimensions.w = 50 * proportion;
    dimensions.h = 50;
  }
  return dimensions;
}



// Click event
window.addEventListener('pointerdown', (event) => {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(postcards, true);

  if (intersects.length > 0) {
    const clickedCard = intersects[0].object.parent;
    // console.log(clickedCard);
    const isFlipped = flippedCards.has(clickedCard);

    // Animate rotation using TWEEN.js
    tween = new Tween(clickedCard.rotation)
      .to({ z: isFlipped ? 0 : Math.PI }, 600)
      .easing(Easing.Quadratic.Out)
      .start();

    // Update flipped state
    if (isFlipped) {
      flippedCards.delete(clickedCard);
    } else {
      flippedCards.add(clickedCard);
    }
  }
});

function animate(timestamp) {
  requestAnimationFrame(animate);
  if (water !== undefined) water.material.uniforms['time'].value += 1.0 / (60.0 * 10);
  // updateSun();
  if (tween != null) tween.update();
  render()
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

function scene_setup() {
  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 5000);
  camera.position.y = 100;
  camera.position.z = 0;
  camera.position.x = 0;
  // set the camera above the scene and looking down
  // camera.rotation.x = -Math.PI / 2;
  scene = new THREE.Scene();
  // scene.background = new THREE.Color(0xffffff)
  const ambientLight = new THREE.AmbientLight(0xffffff);
  scene.add(ambientLight);
  // const fogColor = 0x000000; // Light sky blue color
  // scene.fog = new THREE.Fog(fogColor, 1, 30);
  // const pointLight = new THREE.PointLight(0xffffff, 15);
  // camera.add(pointLight);
  scene.add(camera);

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
  controls.maxDistance = 300;

  controls.maxPolarAngle = 0;
  controls.enableRotate = false;

  // 🔥 Restrict panning (keep within a boundary)
  const panLimit = 200; // Max movement in X and Z
  controls.addEventListener('change', () => {
    controls.target.x = Math.max(-panLimit, Math.min(panLimit, controls.target.x));
    controls.target.z = Math.max(-panLimit, Math.min(panLimit, controls.target.z));
    camera.position.x = Math.max(-panLimit, Math.min(panLimit, camera.position.x));
    camera.position.z = Math.max(-panLimit, Math.min(panLimit, camera.position.z));
  });
}

function init_first_person_controls() {
  controls = new FirstPersonControls(camera, renderer.domElement);
  controls.movementSpeed = 70;
  controls.lookSpeed = 0.05;
  controls.lookVertical = true;
}

function build_renderer() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  console.log(renderer);
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

function render() {
  if (!postprocessing) {
    renderer.render(scene, camera);
  } else {
    composer.render()
  }
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
// DEPRECATED
function sin_func(boundary, inc) {
  return Math.sin(inc) * boundary
}
function cos_func(boundary, inc) {
  return Math.cos(inc) * boundary
}
// DEPRECATED
function sin_func_positive(boundary, inc) {
  return ((Math.sin(inc) + 1) / 2) * boundary
}
// DEPRECATED
function load_model(manager, url) {
  function onProgress(xhr) {
    if (xhr.lengthComputable) {
      const percentComplete = xhr.loaded / xhr.total * 100;
      console.log('model ' + Math.round(percentComplete, 2) + '% downloaded');
    }
  }
  function onError() {
    console.log('error when loading model');
  }
  const loader = new OBJLoader(manager);
  loader.load(url, function (obj) {
    object = obj;
  }, onProgress, onError);
}
// DEPRECATED
function load_texture(manager, url) {
  const textureLoader = new THREE.TextureLoader(manager);
  const texture = textureLoader.load(url, render);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function add_material(obj, material) {
  obj.traverse(function (child) {
    if (child.isMesh) child.material = material;
  });
}
// DEPRECATED
function random_material(obj) {
  obj.traverse(child => {
    if (child.isMesh) {
      const material = build_material(Math.random() * 360, 1, 0.5)
      child.material = material
    }
  })
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

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
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
      sunColor: 0xffcc00,
      waterColor: 0x001e0f,
      distortionScale: 10.7,
      fog: scene.fog !== undefined
    }
  );

  water.rotation.x = - Math.PI / 2;
  water.position.y = -30
  scene.add(water);
  sky = new Sky();
  sky.scale.setScalar(10000);
  scene.add(sky);
  const skyUniforms = sky.material.uniforms;
  skyUniforms['turbidity'].value = 10;
  skyUniforms['rayleigh'].value = 2;
  skyUniforms['mieCoefficient'].value = 0.05;
  skyUniforms['mieDirectionalG'].value = 0.8;

  pmremGenerator = new THREE.PMREMGenerator(renderer);
  sceneEnv = new THREE.Scene();

  updateSun();
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

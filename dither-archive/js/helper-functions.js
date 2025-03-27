console.log('helper functions');


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
import * as THREE from 'three';

/** Soft casino lighting so felt and cards read physical, not flat. */
export function createLights(scene: THREE.Scene): void {
  const hemi = new THREE.HemisphereLight(0xfff2e0, 0x1a2a22, 0.42);
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(0xfff5e6, 0.22);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xfff0d5, 1.05);
  key.position.set(3.2, 9.5, 4.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.00025;
  key.shadow.normalBias = 0.035;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 24;
  key.shadow.camera.left = -7;
  key.shadow.camera.right = 7;
  key.shadow.camera.top = 7;
  key.shadow.camera.bottom = -7;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xa8c0d8, 0.38);
  fill.position.set(-5, 6, -2.5);
  scene.add(fill);

  // Warm overhead pool — gentle falloff across the rail
  const pendant = new THREE.PointLight(0xffcc88, 0.55, 14, 2);
  pendant.position.set(0, 4.2, 0.2);
  scene.add(pendant);

  const rim = new THREE.PointLight(0xffb070, 0.28, 10, 2);
  rim.position.set(0, 2.4, -3.4);
  scene.add(rim);
}

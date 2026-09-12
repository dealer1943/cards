import * as THREE from 'three';

export function createLights(scene: THREE.Scene): void {
  const ambient = new THREE.AmbientLight(0xfff5e6, 0.45);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xfff0d5, 0.85);
  key.position.set(3, 8, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 20;
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 6;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -6;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xb0c4de, 0.35);
  fill.position.set(-4, 5, -2);
  scene.add(fill);

  const rim = new THREE.PointLight(0xffcc88, 0.4, 12);
  rim.position.set(0, 3, -3);
  scene.add(rim);
}

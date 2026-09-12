import * as THREE from 'three';
import { createFelt } from './felt';
import { createLights } from './lights';
import { createTableCamera, MildOrbit } from './camera';

export interface TableScene {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  cardGroup: THREE.Group;
  chipGroup: THREE.Group;
  orbit: MildOrbit;
  resize: () => void;
  dispose: () => void;
}

export function createTableScene(canvas: HTMLCanvasElement): TableScene {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x14101a);
  scene.fog = new THREE.Fog(0x14101a, 12, 26);

  const camera = createTableCamera(window.innerWidth / window.innerHeight);
  createLights(scene);
  scene.add(createFelt());

  const cardGroup = new THREE.Group();
  cardGroup.name = 'cards';
  scene.add(cardGroup);

  const chipGroup = new THREE.Group();
  chipGroup.name = 'chips';
  scene.add(chipGroup);

  // Floor under table
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({
      color: 0x100e16,
      roughness: 0.95,
      metalness: 0.0,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.22;
  floor.receiveShadow = true;
  scene.add(floor);

  const orbit = new MildOrbit(camera, canvas);

  const resize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener('resize', resize);

  return {
    renderer,
    scene,
    camera,
    cardGroup,
    chipGroup,
    orbit,
    resize,
    dispose: () => {
      window.removeEventListener('resize', resize);
      orbit.dispose();
      renderer.dispose();
    },
  };
}

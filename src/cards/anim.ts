import * as THREE from 'three';
import { CardMesh } from './CardMesh';

export function dealTo(
  card: CardMesh,
  pos: THREE.Vector3,
  faceUp: boolean,
  delay = 0,
  duration = 0.4,
): Promise<void> {
  return new Promise((resolve) => {
    const start = () => {
      card.mesh.visible = true;
      const rot = new THREE.Euler(
        faceUp ? 0 : Math.PI,
        0,
        0,
      );
      card.faceUp = faceUp;
      card.animateTo(pos, rot, duration, () => resolve());
    };
    if (delay <= 0) start();
    else setTimeout(start, delay * 1000);
  });
}

export function layoutRow(
  count: number,
  centerX: number,
  z: number,
  spacing = 0.72,
  y = 0.03,
): THREE.Vector3[] {
  const positions: THREE.Vector3[] = [];
  const start = centerX - ((count - 1) * spacing) / 2;
  for (let i = 0; i < count; i++) {
    positions.push(new THREE.Vector3(start + i * spacing, y, z));
  }
  return positions;
}

export function stackOffset(i: number, base: THREE.Vector3, dy = 0.012): THREE.Vector3 {
  return new THREE.Vector3(base.x, base.y + i * dy, base.z);
}

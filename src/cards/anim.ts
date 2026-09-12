import * as THREE from 'three';
import { CardMesh } from './CardMesh';
import { TABLE_SURFACE_Y } from '../table/surface';

/** Dealer shoe / deal origin above the near rail. */
export const DEAL_ORIGIN = new THREE.Vector3(0, 1.35, 3.05);

/**
 * Smooth deal with ease, slight arc, and in-flight flip.
 * Prefer stagger via `delay` so hands feel sequential, not teleported.
 */
export function dealTo(
  card: CardMesh,
  pos: THREE.Vector3,
  faceUp: boolean,
  delay = 0,
  duration = 0.48,
  options?: { arcHeight?: number; from?: THREE.Vector3 },
): Promise<void> {
  return new Promise((resolve) => {
    const start = () => {
      const from = options?.from ?? DEAL_ORIGIN;
      card.mesh.visible = true;
      card.mesh.position.copy(from);
      card.setFaceUp(false, true);

      const targetRot = new THREE.Euler(faceUp ? 0 : Math.PI, 0, 0);
      // Small yaw twist while flipping so the motion reads less linear
      const startRot = new THREE.Euler(
        Math.PI,
        faceUp ? 0.35 : 0,
        faceUp ? -0.08 : 0,
      );
      card.mesh.rotation.copy(startRot);
      card.faceUp = faceUp;

      const arc = options?.arcHeight ?? Math.min(0.55, 0.28 + from.distanceTo(pos) * 0.08);
      card.animateTo(pos, targetRot, duration, () => resolve(), arc);
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
  y = TABLE_SURFACE_Y,
): THREE.Vector3[] {
  const positions: THREE.Vector3[] = [];
  const start = centerX - ((count - 1) * spacing) / 2;
  for (let i = 0; i < count; i++) {
    positions.push(new THREE.Vector3(start + i * spacing, y, z));
  }
  return positions;
}

export function stackOffset(i: number, base: THREE.Vector3, dy = 0.014): THREE.Vector3 {
  return new THREE.Vector3(base.x, base.y + i * dy, base.z);
}

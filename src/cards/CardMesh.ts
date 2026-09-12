import * as THREE from 'three';
import {
  CardId,
  cardKey,
  createBackTexture,
  createChipTexture,
  createFaceTexture,
} from './textures';
import { CARD_THICKNESS, TABLE_SURFACE_Y } from '../table/surface';

export const CARD_W = 0.63;
export const CARD_H = 0.88;
/** Slight thickness so rims catch light. */
export const CARD_D = CARD_THICKNESS;

export interface AnimTarget {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  duration: number;
  elapsed: number;
  fromPos: THREE.Vector3;
  fromRot: THREE.Euler;
  /** Peak height above the straight-line lerp (deal arc). */
  arcHeight: number;
  onDone?: () => void;
}

export class CardMesh {
  readonly mesh: THREE.Mesh;
  readonly id: CardId;
  faceUp = false;
  private anim: AnimTarget | null = null;
  private faceMat: THREE.MeshStandardMaterial;
  private backMat: THREE.MeshStandardMaterial;
  private edgeMat: THREE.MeshStandardMaterial;

  constructor(id: CardId) {
    this.id = id;
    const geo = new THREE.BoxGeometry(CARD_W, CARD_D, CARD_H);
    this.faceMat = new THREE.MeshStandardMaterial({
      map: createFaceTexture(id),
      roughness: 0.72,
      metalness: 0.02,
    });
    this.backMat = new THREE.MeshStandardMaterial({
      map: createBackTexture(),
      roughness: 0.7,
      metalness: 0.04,
    });
    this.edgeMat = new THREE.MeshStandardMaterial({
      color: 0xe8e0d0,
      roughness: 0.85,
      metalness: 0.0,
    });
    // Box: +x -x +y -y +z -z — +y face, -y back
    const mats = [
      this.edgeMat,
      this.edgeMat,
      this.faceMat,
      this.backMat,
      this.edgeMat,
      this.edgeMat,
    ];
    this.mesh = new THREE.Mesh(geo, mats);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.userData.card = this;
    this.mesh.userData.cardKey = cardKey(id);
    this.setFaceUp(false, true);
  }

  get key(): string {
    return cardKey(this.id);
  }

  setFaceUp(up: boolean, instant = false): void {
    this.faceUp = up;
    const targetX = up ? 0 : Math.PI;
    if (instant) {
      this.mesh.rotation.x = targetX;
      return;
    }
    this.animateTo(
      this.mesh.position.clone(),
      new THREE.Euler(targetX, this.mesh.rotation.y, this.mesh.rotation.z),
      0.38,
    );
  }

  animateTo(
    position: THREE.Vector3,
    rotation: THREE.Euler,
    duration = 0.45,
    onDone?: () => void,
    arcHeight = 0,
  ): void {
    this.anim = {
      position: position.clone(),
      rotation: rotation.clone(),
      duration,
      elapsed: 0,
      fromPos: this.mesh.position.clone(),
      fromRot: this.mesh.rotation.clone(),
      arcHeight,
      onDone,
    };
  }

  update(dt: number): void {
    if (!this.anim) return;
    this.anim.elapsed += dt;
    const t = Math.min(1, this.anim.elapsed / this.anim.duration);
    const e = easeOutCubic(t);
    this.mesh.position.lerpVectors(this.anim.fromPos, this.anim.position, e);
    if (this.anim.arcHeight > 0) {
      // Parabolic lift: peaks mid-flight
      const lift = Math.sin(Math.PI * t) * this.anim.arcHeight;
      this.mesh.position.y += lift;
    }
    this.mesh.rotation.x = lerp(this.anim.fromRot.x, this.anim.rotation.x, e);
    this.mesh.rotation.y = lerp(this.anim.fromRot.y, this.anim.rotation.y, e);
    this.mesh.rotation.z = lerp(this.anim.fromRot.z, this.anim.rotation.z, e);
    if (t >= 1) {
      const done = this.anim.onDone;
      this.anim = null;
      done?.();
    }
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    // Face/back maps are shared via texCache — do not dispose them here.
    this.faceMat.dispose();
    this.backMat.dispose();
    this.edgeMat.dispose();
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function makeChip(color: number, label: string, y = TABLE_SURFACE_Y): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(0.18, 0.18, 0.04, 32);
  const hex = '#' + color.toString(16).padStart(6, '0');
  const mat = new THREE.MeshStandardMaterial({
    map: createChipTexture(hex, label),
    roughness: 0.55,
    metalness: 0.15,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = y;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

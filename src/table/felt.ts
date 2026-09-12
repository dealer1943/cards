import * as THREE from 'three';
import { FELT_SURFACE_Y } from './surface';

export type TableStyleId = 'nap' | 'plain';

export const TABLE_STYLES: { id: TableStyleId; label: string }[] = [
  { id: 'nap', label: 'Casino nap' },
  { id: 'plain', label: 'Plain felt' },
];

const FELT_W = 7.5;
const FELT_D = 4.6;
const FELT_CORNER = 0.55;
const FELT_DEPTH = 0.09;

/** Soft procedural nap / noise for casino felt (no external textures). */
function createFeltNapTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Base green
  ctx.fillStyle = '#1a6b3c';
  ctx.fillRect(0, 0, size, size);

  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    // Fine fiber noise + subtle directional nap
    const x = (i / 4) % size;
    const y = Math.floor(i / 4 / size);
    const n =
      (Math.random() - 0.5) * 28 +
      Math.sin(x * 0.35 + y * 0.12) * 4 +
      Math.sin(y * 0.55) * 3;
    d[i] = clampByte(d[i]! + n * 0.35);
    d[i + 1] = clampByte(d[i + 1]! + n);
    d[i + 2] = clampByte(d[i + 2]! + n * 0.45);
  }
  ctx.putImageData(img, 0, 0);

  // Very soft vignette so center reads richer
  const g = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.15,
    size / 2,
    size / 2,
    size * 0.72,
  );
  g.addColorStop(0, 'rgba(255,255,255,0.06)');
  g.addColorStop(0.55, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.18)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.4, 1.6);
  tex.anisotropy = 8;
  return tex;
}

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, v | 0));
}

function createNapMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: createFeltNapTexture(),
    roughness: 0.94,
    metalness: 0.0,
  });
}

/** Clean solid casino green — no visible nap / pattern / noise. */
function createPlainMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x1a6b3c,
    roughness: 0.92,
    metalness: 0.0,
  });
}

function disposeMaterial(mat: THREE.Material): void {
  const m = mat as THREE.MeshStandardMaterial;
  if (m.map) {
    m.map.dispose();
    m.map = null;
  }
  m.dispose();
}

/** Wooden rail rim around the felt. */
function createWoodRail(w: number, d: number): THREE.Mesh {
  const shape = new THREE.Shape();
  const outerW = w / 2 + 0.28;
  const outerD = d / 2 + 0.28;
  const r = 0.62;
  shape.moveTo(-outerW + r, -outerD);
  shape.lineTo(outerW - r, -outerD);
  shape.quadraticCurveTo(outerW, -outerD, outerW, -outerD + r);
  shape.lineTo(outerW, outerD - r);
  shape.quadraticCurveTo(outerW, outerD, outerW - r, outerD);
  shape.lineTo(-outerW + r, outerD);
  shape.quadraticCurveTo(-outerW, outerD, -outerW, outerD - r);
  shape.lineTo(-outerW, -outerD + r);
  shape.quadraticCurveTo(-outerW, -outerD, -outerW + r, -outerD);

  // Inner hole (felt opening)
  const hole = new THREE.Path();
  const iw = w / 2 + 0.02;
  const id = d / 2 + 0.02;
  const ir = 0.52;
  hole.moveTo(-iw + ir, -id);
  hole.lineTo(iw - ir, -id);
  hole.quadraticCurveTo(iw, -id, iw, -id + ir);
  hole.lineTo(iw, id - ir);
  hole.quadraticCurveTo(iw, id, iw - ir, id);
  hole.lineTo(-iw + ir, id);
  hole.quadraticCurveTo(-iw, id, -iw, id - ir);
  hole.lineTo(-iw, -id + ir);
  hole.quadraticCurveTo(-iw, -id, -iw + ir, -id);
  shape.holes.push(hole);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.16,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.03,
    bevelSegments: 2,
  });
  geo.rotateX(-Math.PI / 2);

  const mat = new THREE.MeshStandardMaterial({
    color: 0x5c3a1e,
    roughness: 0.55,
    metalness: 0.08,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = -0.12;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createFeltShape(w: number, d: number, r: number): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 + r, -d / 2);
  shape.lineTo(w / 2 - r, -d / 2);
  shape.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
  shape.lineTo(w / 2, d / 2 - r);
  shape.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2);
  shape.lineTo(-w / 2 + r, d / 2);
  shape.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r);
  shape.lineTo(-w / 2, -d / 2 + r);
  shape.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
  return shape;
}

/** Rounded green felt playing surface with wood rail. Style is swappable live. */
export function createFelt(style: TableStyleId = 'nap'): THREE.Group {
  const group = new THREE.Group();
  group.name = 'felt';
  group.userData.tableStyle = style as TableStyleId;

  const w = FELT_W;
  const d = FELT_D;
  const r = FELT_CORNER;

  const geo = new THREE.ExtrudeGeometry(createFeltShape(w, d, r), {
    depth: FELT_DEPTH,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.035,
    bevelSegments: 3,
  });
  geo.rotateX(-Math.PI / 2);

  const mat = style === 'plain' ? createPlainMaterial() : createNapMaterial();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'felt-surface';
  mesh.receiveShadow = true;
  // Extrusion maps to +Y after rotateX; pin the top face to FELT_SURFACE_Y.
  mesh.position.y = FELT_SURFACE_Y - FELT_DEPTH;
  group.add(mesh);

  // Dark padded cushion under the wood (classic table sandwich)
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.42, 0.07, d + 0.42),
    new THREE.MeshStandardMaterial({
      color: 0x0c2e1c,
      roughness: 0.9,
      metalness: 0.0,
    }),
  );
  pad.position.y = -0.1;
  pad.receiveShadow = true;
  group.add(pad);

  group.add(createWoodRail(w, d));

  return group;
}

/** Swap nap ↔ plain felt on an existing table without remounting games. */
export function setFeltStyle(group: THREE.Group, style: TableStyleId): void {
  if (group.userData.tableStyle === style) return;
  const mesh = group.getObjectByName('felt-surface') as THREE.Mesh | undefined;
  if (!mesh) return;

  const prev = mesh.material;
  const next = style === 'plain' ? createPlainMaterial() : createNapMaterial();
  mesh.material = next;
  group.userData.tableStyle = style;

  if (Array.isArray(prev)) prev.forEach(disposeMaterial);
  else disposeMaterial(prev as THREE.Material);
}

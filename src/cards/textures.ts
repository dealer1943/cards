import * as THREE from 'three';

export type Suit = 'S' | 'H' | 'D' | 'C';
export type Rank =
  | 'A'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K';

export interface CardId {
  suit: Suit;
  rank: Rank;
}

export const SUITS: Suit[] = ['S', 'H', 'D', 'C'];
export const RANKS: Rank[] = [
  'A',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
];

export const SUIT_SYMBOL: Record<Suit, string> = {
  S: '♠',
  H: '♥',
  D: '♦',
  C: '♣',
};

export const SUIT_COLOR: Record<Suit, string> = {
  S: '#141414',
  H: '#b91c1c',
  D: '#b91c1c',
  C: '#141414',
};

export function cardKey(c: CardId): string {
  return `${c.rank}${c.suit}`;
}

export function rankValue(rank: Rank): number {
  if (rank === 'A') return 14;
  if (rank === 'K') return 13;
  if (rank === 'Q') return 12;
  if (rank === 'J') return 11;
  return parseInt(rank, 10);
}

const texCache = new Map<string, THREE.CanvasTexture>();

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Classic pip layouts (normalized 0–1 inside the face). */
function pipLayout(rank: Rank): Array<[number, number]> {
  const cx = 0.5;
  const L = 0.32;
  const R = 0.68;
  const t = 0.22;
  const m = 0.5;
  const b = 0.78;
  const tm = 0.34;
  const bm = 0.66;
  switch (rank) {
    case 'A':
      return [[cx, m]];
    case '2':
      return [
        [cx, t],
        [cx, b],
      ];
    case '3':
      return [
        [cx, t],
        [cx, m],
        [cx, b],
      ];
    case '4':
      return [
        [L, t],
        [R, t],
        [L, b],
        [R, b],
      ];
    case '5':
      return [
        [L, t],
        [R, t],
        [cx, m],
        [L, b],
        [R, b],
      ];
    case '6':
      return [
        [L, t],
        [R, t],
        [L, m],
        [R, m],
        [L, b],
        [R, b],
      ];
    case '7':
      return [
        [L, t],
        [R, t],
        [cx, tm],
        [L, m],
        [R, m],
        [L, b],
        [R, b],
      ];
    case '8':
      return [
        [L, t],
        [R, t],
        [cx, tm],
        [L, m],
        [R, m],
        [cx, bm],
        [L, b],
        [R, b],
      ];
    case '9':
      return [
        [L, t],
        [R, t],
        [L, 0.38],
        [R, 0.38],
        [cx, m],
        [L, 0.62],
        [R, 0.62],
        [L, b],
        [R, b],
      ];
    case '10':
      return [
        [L, t],
        [R, t],
        [cx, 0.3],
        [L, 0.4],
        [R, 0.4],
        [L, 0.6],
        [R, 0.6],
        [cx, 0.7],
        [L, b],
        [R, b],
      ];
    default:
      return [[cx, m]];
  }
}

function drawCorner(
  ctx: CanvasRenderingContext2D,
  label: string,
  sym: string,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = `bold ${label === '10' ? 40 : 46}px "Segoe UI", Georgia, serif`;
  ctx.fillText(label, 0, 0);
  ctx.font = '34px Georgia, serif';
  ctx.fillText(sym, label === '10' ? 2 : 6, 48);
}

export function createFaceTexture(card: CardId, w = 288, h = 420): THREE.CanvasTexture {
  const key = `face:${cardKey(card)}`;
  const hit = texCache.get(key);
  if (hit) return hit;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Soft paper body + rim
  ctx.fillStyle = '#f4efe4';
  roundRect(ctx, 3, 3, w - 6, h - 6, 20);
  ctx.fill();
  ctx.strokeStyle = '#cfc6b4';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // Inner hairline
  ctx.strokeStyle = '#e7e0d2';
  ctx.lineWidth = 1;
  roundRect(ctx, 10, 10, w - 20, h - 20, 14);
  ctx.stroke();

  const color = SUIT_COLOR[card.suit];
  const sym = SUIT_SYMBOL[card.suit];
  const label = card.rank;
  const isFace = label === 'J' || label === 'Q' || label === 'K';

  // Top-left corner
  ctx.save();
  ctx.translate(16, 14);
  drawCorner(ctx, label, sym, color);
  ctx.restore();

  // Bottom-right mirrored
  ctx.save();
  ctx.translate(w - 16, h - 14);
  ctx.rotate(Math.PI);
  drawCorner(ctx, label, sym, color);
  ctx.restore();

  ctx.fillStyle = color;
  if (isFace || label === 'A') {
    // Large center emblem for A / face cards
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${label === 'A' ? 150 : 120}px Georgia, serif`;
    ctx.fillText(sym, w / 2, h / 2 + (label === 'A' ? 0 : 8));
    if (isFace) {
      ctx.font = 'bold 52px Georgia, serif';
      ctx.fillText(label, w / 2, h / 2 - 78);
    }
  } else {
    // Number pips
    const pads = { l: 48, r: 48, t: 70, b: 70 };
    const iw = w - pads.l - pads.r;
    const ih = h - pads.t - pads.b;
    const pipSize = label === '10' ? 42 : 48;
    ctx.font = `${pipSize}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const [nx, ny] of pipLayout(label)) {
      const px = pads.l + nx * iw;
      const py = pads.t + ny * ih;
      // Flip lower-half pips for classic look
      if (ny > 0.55) {
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(Math.PI);
        ctx.fillText(sym, 0, 0);
        ctx.restore();
      } else {
        ctx.fillText(sym, px, py);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  texCache.set(key, tex);
  return tex;
}

export function createBackTexture(w = 288, h = 420): THREE.CanvasTexture {
  const key = 'back';
  const hit = texCache.get(key);
  if (hit) return hit;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0c1f33';
  roundRect(ctx, 3, 3, w - 6, h - 6, 20);
  ctx.fill();

  // Diamond lattice
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, 18, 18, w - 36, h - 36, 12);
  ctx.clip();
  ctx.strokeStyle = '#1a4560';
  ctx.lineWidth = 1.5;
  const step = 22;
  for (let y = -h; y < h * 2; y += step) {
    for (let x = -w; x < w * 2; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, y + step / 2);
      ctx.lineTo(x + step / 2, y);
      ctx.lineTo(x + step, y + step / 2);
      ctx.lineTo(x + step / 2, y + step);
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.restore();

  // Gold double border
  ctx.strokeStyle = '#d4a017';
  ctx.lineWidth = 5;
  roundRect(ctx, 14, 14, w - 28, h - 28, 14);
  ctx.stroke();
  ctx.strokeStyle = '#f0d78c';
  ctx.lineWidth = 1.5;
  roundRect(ctx, 22, 22, w - 44, h - 44, 10);
  ctx.stroke();

  // Center medallion
  ctx.fillStyle = 'rgba(12, 31, 51, 0.82)';
  roundRect(ctx, w / 2 - 70, h / 2 - 42, 140, 84, 12);
  ctx.fill();
  ctx.strokeStyle = '#d4a017';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#e8c547';
  ctx.font = 'bold 26px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FELT', w / 2, h / 2 - 12);
  ctx.fillText('TABLE', w / 2, h / 2 + 16);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  texCache.set(key, tex);
  return tex;
}

export function createChipTexture(color: string, valueLabel: string, size = 128): THREE.CanvasTexture {
  const key = `chip:${color}:${valueLabel}`;
  const hit = texCache.get(key);
  if (hit) return hit;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.strokeStyle = '#fff8';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 6, 0, Math.PI * 2);
  ctx.stroke();

  // Edge ticks
  ctx.strokeStyle = '#ffffffaa';
  ctx.lineWidth = 4;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2));
    ctx.lineTo(cx + Math.cos(a) * (r - 14), cy + Math.sin(a) * (r - 14));
    ctx.stroke();
  }

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(valueLabel, cx, cy);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, tex);
  return tex;
}

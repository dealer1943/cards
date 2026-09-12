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
  S: '#1a1a1a',
  H: '#c0392b',
  D: '#c0392b',
  C: '#1a1a1a',
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

export function createFaceTexture(card: CardId, w = 256, h = 384): THREE.CanvasTexture {
  const key = `face:${cardKey(card)}`;
  const hit = texCache.get(key);
  if (hit) return hit;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Card body
  ctx.fillStyle = '#f7f3e8';
  roundRect(ctx, 4, 4, w - 8, h - 8, 18);
  ctx.fill();
  ctx.strokeStyle = '#d0c8b0';
  ctx.lineWidth = 3;
  ctx.stroke();

  const color = SUIT_COLOR[card.suit];
  const sym = SUIT_SYMBOL[card.suit];
  const label = card.rank;

  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = `bold ${label === '10' ? 42 : 48}px Georgia, serif`;
  ctx.fillText(label, 18, 16);
  ctx.font = '36px Georgia, serif';
  ctx.fillText(sym, 22, 68);

  // Center pip
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '120px Georgia, serif';
  ctx.fillText(sym, w / 2, h / 2);

  // Bottom-right mirrored
  ctx.save();
  ctx.translate(w - 18, h - 16);
  ctx.rotate(Math.PI);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = `bold ${label === '10' ? 42 : 48}px Georgia, serif`;
  ctx.fillText(label, 0, 0);
  ctx.font = '36px Georgia, serif';
  ctx.fillText(sym, 4, 52);
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  texCache.set(key, tex);
  return tex;
}

export function createBackTexture(w = 256, h = 384): THREE.CanvasTexture {
  const key = 'back';
  const hit = texCache.get(key);
  if (hit) return hit;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0d2137';
  roundRect(ctx, 4, 4, w - 8, h - 8, 18);
  ctx.fill();

  // Decorative diamond lattice
  ctx.strokeStyle = '#1e4d6b';
  ctx.lineWidth = 2;
  const step = 28;
  for (let y = 20; y < h - 20; y += step) {
    for (let x = 20; x < w - 20; x += step) {
      ctx.strokeRect(x, y, step - 6, step - 6);
    }
  }

  // Inner border
  ctx.strokeStyle = '#c9a227';
  ctx.lineWidth = 6;
  roundRect(ctx, 16, 16, w - 32, h - 32, 12);
  ctx.stroke();

  ctx.fillStyle = '#c9a227';
  ctx.font = 'bold 28px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FELT', w / 2, h / 2 - 16);
  ctx.fillText('TABLE', w / 2, h / 2 + 16);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
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

import * as THREE from 'three';
import { Rng } from '../core/rng';
import { CardId, RANKS, SUITS } from './textures';
import { CardMesh } from './CardMesh';

export function makeStandardDeckIds(): CardId[] {
  const cards: CardId[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({ suit, rank });
    }
  }
  return cards;
}

export class Deck {
  private ids: CardId[] = [];
  private rng: Rng;

  constructor(rng?: Rng) {
    this.rng = rng ?? new Rng();
    this.reset();
  }

  reset(): void {
    this.ids = makeStandardDeckIds();
    this.shuffle();
  }

  shuffle(): void {
    this.rng.shuffle(this.ids);
  }

  get remaining(): number {
    return this.ids.length;
  }

  draw(): CardId {
    const c = this.ids.pop();
    if (!c) throw new Error('Deck empty');
    return c;
  }

  drawMany(n: number): CardId[] {
    const out: CardId[] = [];
    for (let i = 0; i < n; i++) out.push(this.draw());
    return out;
  }
}

export class CardPool {
  private map = new Map<string, CardMesh>();
  private sceneGroup: THREE.Group | null = null;

  setGroup(group: THREE.Group): void {
    this.sceneGroup = group;
  }

  getOrCreate(id: CardId): CardMesh {
    const key = `${id.rank}${id.suit}`;
    let card = this.map.get(key);
    if (!card) {
      card = new CardMesh(id);
      this.map.set(key, card);
      this.sceneGroup?.add(card.mesh);
    } else if (this.sceneGroup && card.mesh.parent !== this.sceneGroup) {
      this.sceneGroup.add(card.mesh);
    }
    return card;
  }

  hideAll(): void {
    for (const c of this.map.values()) {
      c.mesh.visible = false;
    }
  }

  clear(): void {
    for (const c of this.map.values()) {
      c.mesh.parent?.remove(c.mesh);
      c.dispose();
    }
    this.map.clear();
  }

  update(dt: number): void {
    for (const c of this.map.values()) c.update(dt);
  }

  all(): CardMesh[] {
    return [...this.map.values()];
  }
}

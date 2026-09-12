import * as THREE from 'three';
import { CardId, rankValue, Suit } from '../cards/textures';
import { CARD_H, CARD_W, CardMesh } from '../cards/CardMesh';
import { CardPool, Deck } from '../cards/deck';
import type { GameContext, GameMode } from './types';
import { TABLE_SURFACE_Y } from '../table/surface';

type PileKind = 'stock' | 'waste' | 'foundation' | 'tableau';

interface Pile {
  kind: PileKind;
  index: number;
  cards: CardId[];
  faceUp: boolean[]; // parallel to cards
}

const TAB_X0 = -3.15;
const TAB_DX = 1.05;
const TAB_Z = 0.55;
const ROW_DZ = 0.28;
const FOUND_Z = -1.55;
const STOCK_X = 2.8;
const WASTE_X = 1.7;
const TOP_Z = -1.55;

export class SolitaireGame implements GameMode {
  readonly id = 'solitaire';
  readonly title = 'Klondike Solitaire';

  private ctx!: GameContext;
  private pool = new CardPool();
  private deck = new Deck();
  private stock: Pile = { kind: 'stock', index: 0, cards: [], faceUp: [] };
  private waste: Pile = { kind: 'waste', index: 0, cards: [], faceUp: [] };
  private foundations: Pile[] = [];
  private tableau: Pile[] = [];
  private selected: { pile: Pile; index: number } | null = null;
  private message = 'Draw-3 Klondike — click to move';
  private won = false;
  private meshes = new Map<string, CardMesh>();

  mount(ctx: GameContext): void {
    this.ctx = ctx;
    this.pool.setGroup(ctx.cardGroup);
    this.newGame();
  }

  unmount(): void {
    this.pool.clear();
    this.meshes.clear();
    this.selected = null;
  }

  update(dt: number): void {
    this.pool.update(dt);
  }

  private newGame(): void {
    this.pool.hideAll();
    this.meshes.clear();
    this.selected = null;
    this.won = false;
    this.deck.reset();
    this.foundations = [0, 1, 2, 3].map((i) => ({
      kind: 'foundation' as const,
      index: i,
      cards: [],
      faceUp: [],
    }));
    this.tableau = [0, 1, 2, 3, 4, 5, 6].map((i) => ({
      kind: 'tableau' as const,
      index: i,
      cards: [],
      faceUp: [],
    }));
    this.stock = { kind: 'stock', index: 0, cards: [], faceUp: [] };
    this.waste = { kind: 'waste', index: 0, cards: [], faceUp: [] };

    // Deal tableau: column i gets i+1 cards, last face up
    for (let col = 0; col < 7; col++) {
      for (let n = 0; n <= col; n++) {
        const c = this.deck.draw();
        this.tableau[col]!.cards.push(c);
        this.tableau[col]!.faceUp.push(n === col);
      }
    }
    while (this.deck.remaining > 0) {
      const c = this.deck.draw();
      this.stock.cards.push(c);
      this.stock.faceUp.push(false);
    }
    this.message = 'New game — draw-3 from stock';
    this.layoutAll(true);
    this.syncHud();
  }

  private key(c: CardId): string {
    return `${c.rank}${c.suit}`;
  }

  private ensureMesh(c: CardId): CardMesh {
    const k = this.key(c);
    let m = this.meshes.get(k);
    if (!m) {
      m = this.pool.getOrCreate(c);
      this.meshes.set(k, m);
    }
    m.mesh.visible = true;
    m.mesh.userData.solitaireKey = k;
    return m;
  }

  private pileWorldPos(pile: Pile, cardIndex: number): THREE.Vector3 {
    if (pile.kind === 'stock') {
      return new THREE.Vector3(STOCK_X, TABLE_SURFACE_Y + cardIndex * 0.008, TOP_Z);
    }
    if (pile.kind === 'waste') {
      // fan last few
      const fromEnd = pile.cards.length - 1 - cardIndex;
      const fan = Math.min(2, Math.max(0, 2 - fromEnd));
      return new THREE.Vector3(
        WASTE_X - fan * 0.22,
        TABLE_SURFACE_Y + cardIndex * 0.01,
        TOP_Z,
      );
    }
    if (pile.kind === 'foundation') {
      const x = TAB_X0 + pile.index * TAB_DX;
      return new THREE.Vector3(x, TABLE_SURFACE_Y + cardIndex * 0.012, FOUND_Z);
    }
    // tableau
    const x = TAB_X0 + pile.index * TAB_DX;
    return new THREE.Vector3(
      x,
      TABLE_SURFACE_Y + cardIndex * 0.01,
      TAB_Z + cardIndex * ROW_DZ,
    );
  }

  private layoutAll(instant: boolean): void {
    const place = (pile: Pile): void => {
      pile.cards.forEach((c, i) => {
        const mesh = this.ensureMesh(c);
        const pos = this.pileWorldPos(pile, i);
        const faceUp = pile.faceUp[i]!;
        mesh.faceUp = faceUp;
        const rot = new THREE.Euler(faceUp ? 0 : Math.PI, 0, 0);
        if (instant) {
          mesh.mesh.position.copy(pos);
          mesh.mesh.rotation.copy(rot);
        } else {
          mesh.animateTo(pos, rot, 0.25);
        }
        // Highlight selected
        const sel =
          this.selected &&
          this.selected.pile === pile &&
          i >= this.selected.index;
        mesh.mesh.position.y = pos.y + (sel ? 0.08 : 0);
        if (sel && instant) mesh.mesh.position.y = pos.y + 0.08;
      });
    };
    place(this.stock);
    place(this.waste);
    this.foundations.forEach(place);
    this.tableau.forEach(place);

    // Empty pile hit targets via invisible markers? use raycast on cards only;
    // stock click when empty recycles waste — handled in onPointer empty zones via HUD Draw button too.
  }

  private syncHud(): void {
    this.ctx.setHud({
      title: 'Klondike Solitaire (Draw-3)',
      status: this.won ? 'You win!' : this.message,
      lines: [
        `Stock: ${this.stock.cards.length}  ·  Waste: ${this.waste.cards.length}`,
        `Foundations: ${this.foundations.map((f) => f.cards.length).join('/')}`,
        this.selected
          ? `Selected: ${this.selected.pile.cards[this.selected.index]!.rank}${this.selected.pile.cards[this.selected.index]!.suit}+`
          : 'Click a face-up card, then destination',
      ],
      actions: [
        { id: 'draw', label: 'Draw 3' },
        { id: 'new', label: 'New Game' },
      ],
    });
  }

  async onAction(id: string): Promise<void> {
    if (id === 'new') {
      this.newGame();
      return;
    }
    if (id === 'draw') {
      this.drawStock();
      return;
    }
  }

  private drawStock(): void {
    if (this.won) return;
    this.selected = null;
    if (this.stock.cards.length === 0) {
      // Recycle waste → stock (face down)
      while (this.waste.cards.length > 0) {
        const c = this.waste.cards.pop()!;
        this.waste.faceUp.pop();
        this.stock.cards.push(c);
        this.stock.faceUp.push(false);
      }
      this.message = 'Recycled waste into stock';
      this.layoutAll(false);
      this.syncHud();
      return;
    }
    const n = Math.min(3, this.stock.cards.length);
    for (let i = 0; i < n; i++) {
      const c = this.stock.cards.pop()!;
      this.stock.faceUp.pop();
      this.waste.cards.push(c);
      this.waste.faceUp.push(true);
    }
    this.message = `Drew ${n}`;
    this.layoutAll(false);
    this.checkWin();
    this.syncHud();
  }

  private color(suit: Suit): 'red' | 'black' {
    return suit === 'H' || suit === 'D' ? 'red' : 'black';
  }

  private canDropOnTableau(card: CardId, dest: Pile): boolean {
    if (dest.cards.length === 0) return card.rank === 'K';
    const top = dest.cards[dest.cards.length - 1]!;
    return (
      this.color(card.suit) !== this.color(top.suit) &&
      rankValue(card.rank) === rankValue(top.rank) - 1
    );
  }

  private canDropOnFoundation(card: CardId, dest: Pile): boolean {
    if (dest.cards.length === 0) return card.rank === 'A';
    const top = dest.cards[dest.cards.length - 1]!;
    return (
      card.suit === top.suit &&
      rankValue(card.rank) === rankValue(top.rank) + 1
    );
  }

  private moveCards(from: Pile, fromIndex: number, to: Pile): void {
    const moving = from.cards.splice(fromIndex);
    const movingUp = from.faceUp.splice(fromIndex);
    to.cards.push(...moving);
    to.faceUp.push(...movingUp.map(() => true));
    // Flip new tableau top
    if (from.kind === 'tableau' && from.cards.length > 0) {
      from.faceUp[from.cards.length - 1] = true;
    }
  }

  private tryMoveTo(dest: Pile): boolean {
    if (!this.selected) return false;
    const { pile, index } = this.selected;
    if (pile === dest) {
      this.selected = null;
      return true;
    }
    const card = pile.cards[index]!;
    // Only single card to foundation; runs to tableau
    if (dest.kind === 'foundation') {
      if (index !== pile.cards.length - 1) return false;
      if (!this.canDropOnFoundation(card, dest)) return false;
      this.moveCards(pile, index, dest);
      this.selected = null;
      return true;
    }
    if (dest.kind === 'tableau') {
      if (!this.canDropOnTableau(card, dest)) return false;
      this.moveCards(pile, index, dest);
      this.selected = null;
      return true;
    }
    return false;
  }

  private findPileOf(card: CardId): { pile: Pile; index: number } | null {
    const check = (pile: Pile): { pile: Pile; index: number } | null => {
      const i = pile.cards.findIndex(
        (c) => c.rank === card.rank && c.suit === card.suit,
      );
      return i >= 0 ? { pile, index: i } : null;
    };
    for (const t of this.tableau) {
      const h = check(t);
      if (h) return h;
    }
    const w = check(this.waste);
    if (w) return w;
    for (const f of this.foundations) {
      const h = check(f);
      if (h) return h;
    }
    const s = check(this.stock);
    if (s) return s;
    return null;
  }

  private autoFoundation(cardLoc: { pile: Pile; index: number }): boolean {
    if (cardLoc.index !== cardLoc.pile.cards.length - 1) return false;
    const card = cardLoc.pile.cards[cardLoc.index]!;
    for (const f of this.foundations) {
      if (this.canDropOnFoundation(card, f)) {
        this.moveCards(cardLoc.pile, cardLoc.index, f);
        return true;
      }
    }
    return false;
  }

  private checkWin(): void {
    if (this.foundations.every((f) => f.cards.length === 13)) {
      this.won = true;
      this.message = 'Congratulations — Klondike cleared!';
    }
  }

  onPointer(ray: THREE.Raycaster, event: PointerEvent): void {
    if (this.won) return;
    const objs: THREE.Object3D[] = [];
    for (const m of this.meshes.values()) {
      if (m.mesh.visible) objs.push(m.mesh);
    }
    const hits = ray.intersectObjects(objs, false);
    if (hits.length === 0) {
      // Click empty — try foundations/tableau empty slots via xz plane
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const pt = new THREE.Vector3();
      if (!ray.ray.intersectPlane(plane, pt)) {
        this.selected = null;
        this.layoutAll(true);
        this.syncHud();
        return;
      }
      if (this.selected) {
        // Empty foundation?
        for (let i = 0; i < 4; i++) {
          const x = TAB_X0 + i * TAB_DX;
          if (
            Math.abs(pt.x - x) < CARD_W * 0.55 &&
            Math.abs(pt.z - FOUND_Z) < CARD_H * 0.55
          ) {
            if (this.tryMoveTo(this.foundations[i]!)) {
              this.layoutAll(false);
              this.checkWin();
              this.syncHud();
              return;
            }
          }
        }
        for (let i = 0; i < 7; i++) {
          const x = TAB_X0 + i * TAB_DX;
          const pile = this.tableau[i]!;
          const z =
            pile.cards.length === 0
              ? TAB_Z
              : TAB_Z + (pile.cards.length - 1) * ROW_DZ;
          if (
            Math.abs(pt.x - x) < CARD_W * 0.55 &&
            Math.abs(pt.z - z) < CARD_H * 0.7
          ) {
            if (this.tryMoveTo(pile)) {
              this.layoutAll(false);
              this.checkWin();
              this.syncHud();
              return;
            }
          }
        }
        // Stock recycle area
        if (
          Math.abs(pt.x - STOCK_X) < CARD_W * 0.6 &&
          Math.abs(pt.z - TOP_Z) < CARD_H * 0.6
        ) {
          this.drawStock();
          return;
        }
      } else {
        if (
          Math.abs(pt.x - STOCK_X) < CARD_W * 0.6 &&
          Math.abs(pt.z - TOP_Z) < CARD_H * 0.6
        ) {
          this.drawStock();
          return;
        }
      }
      this.selected = null;
      this.layoutAll(true);
      this.syncHud();
      return;
    }

    // Topmost card hit
    const mesh = hits[0]!.object as THREE.Mesh;
    const cardMesh = mesh.userData.card as CardMesh;
    if (!cardMesh) return;
    const loc = this.findPileOf(cardMesh.id);
    if (!loc) return;

    // Click stock pile card → draw
    if (loc.pile.kind === 'stock') {
      this.drawStock();
      return;
    }

    // Double-click style: if already selected same top card, try auto foundation
    if (
      event.detail === 2 &&
      loc.index === loc.pile.cards.length - 1 &&
      loc.pile.faceUp[loc.index]
    ) {
      if (this.autoFoundation(loc)) {
        this.selected = null;
        this.layoutAll(false);
        this.checkWin();
        this.syncHud();
        return;
      }
    }

    if (!this.selected) {
      if (!loc.pile.faceUp[loc.index]) {
        this.message = 'That card is face-down';
        this.syncHud();
        return;
      }
      // Only waste top, foundation top, or face-up tableau run
      if (loc.pile.kind === 'waste' && loc.index !== loc.pile.cards.length - 1) {
        return;
      }
      if (
        loc.pile.kind === 'foundation' &&
        loc.index !== loc.pile.cards.length - 1
      ) {
        return;
      }
      this.selected = loc;
      this.message = `Selected ${cardMesh.id.rank}${cardMesh.id.suit}`;
      this.layoutAll(true);
      this.syncHud();
      return;
    }

    // Second click — destination
    if (this.tryMoveTo(loc.pile)) {
      this.layoutAll(false);
      this.checkWin();
      this.syncHud();
      return;
    }
    // Reselect
    if (loc.pile.faceUp[loc.index]) {
      this.selected = loc;
      this.message = `Selected ${cardMesh.id.rank}${cardMesh.id.suit}`;
      this.layoutAll(true);
      this.syncHud();
    }
  }
}

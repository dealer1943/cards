import * as THREE from 'three';
import { CardId } from '../cards/textures';
import { CardMesh, makeChip } from '../cards/CardMesh';
import { CardPool, Deck } from '../cards/deck';
import { dealTo, layoutRow } from '../cards/anim';
import {
  compareHands,
  evaluateBest,
  holdemStrength,
} from './handEval';
import type { GameContext, GameMode } from './types';

type Street = 'idle' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'over';

export class HoldemGame implements GameMode {
  readonly id = 'holdem';
  readonly title = "Texas Hold'em";

  private ctx!: GameContext;
  private deck = new Deck();
  private pool = new CardPool();
  private hero: CardId[] = [];
  private villain: CardId[] = [];
  private board: CardId[] = [];
  private heroMeshes: CardMesh[] = [];
  private villainMeshes: CardMesh[] = [];
  private boardMeshes: CardMesh[] = [];
  private street: Street = 'idle';
  private heroStack = 1000;
  private villainStack = 1000;
  private pot = 0;
  private heroBet = 0;
  private villainBet = 0;
  private toCall = 0;
  private buttonHero = true;
  private message = 'Deal a hand';
  private busy = false;
  private chips: THREE.Mesh[] = [];
  private raiseAmount = 40;
  private heroFolded = false;
  private villainFolded = false;
  private sb = 10;
  private bb = 20;

  mount(ctx: GameContext): void {
    this.ctx = ctx;
    this.pool.setGroup(ctx.cardGroup);
    this.heroStack = 1000;
    this.villainStack = 1000;
    this.resetTable();
    this.street = 'idle';
    this.message = 'Click Deal for heads-up Hold\'em';
    this.syncHud();
  }

  unmount(): void {
    this.clearChips();
    this.pool.clear();
  }

  update(dt: number): void {
    this.pool.update(dt);
  }

  private resetTable(): void {
    this.pool.hideAll();
    this.hero = [];
    this.villain = [];
    this.board = [];
    this.heroMeshes = [];
    this.villainMeshes = [];
    this.boardMeshes = [];
    this.pot = 0;
    this.heroBet = 0;
    this.villainBet = 0;
    this.toCall = 0;
    this.heroFolded = false;
    this.villainFolded = false;
    this.clearChips();
  }

  private renderPotChips(): void {
    this.clearChips();
    const n = Math.min(12, Math.max(1, Math.ceil(this.pot / 40)));
    for (let i = 0; i < n; i++) {
      const chip = makeChip(0x2e8b57, String(this.pot));
      const angle = (i / n) * Math.PI * 2;
      chip.position.set(
        Math.cos(angle) * 0.35,
        0.03 + (i % 3) * 0.04,
        Math.sin(angle) * 0.25,
      );
      this.ctx.chipGroup.add(chip);
      this.chips.push(chip);
    }
  }

  private clearChips(): void {
    for (const c of this.chips) {
      c.parent?.remove(c);
      c.geometry.dispose();
    }
    this.chips = [];
  }

  private syncHud(): void {
    const actions: { id: string; label: string; disabled?: boolean }[] = [];
    if (this.street === 'idle' || this.street === 'over') {
      actions.push({ id: 'deal', label: 'Deal', disabled: this.busy });
    } else if (
      ['preflop', 'flop', 'turn', 'river'].includes(this.street) &&
      !this.busy
    ) {
      actions.push(
        {
          id: 'fold',
          label: 'Fold',
        },
        {
          id: 'checkCall',
          label: this.toCall > 0 ? `Call $${this.toCall}` : 'Check',
        },
        {
          id: 'raise',
          label: `Raise $${this.raiseAmount}`,
          disabled: this.heroStack < this.toCall + this.raiseAmount,
        },
      );
    }

    const boardLine =
      this.board.length > 0
        ? `Board: ${this.board.map((c) => c.rank + c.suit).join(' ')}`
        : '';

    this.ctx.setHud({
      title: "Texas Hold'em (Heads-Up)",
      status: this.message,
      lines: [
        `You: $${this.heroStack}  |  AI: $${this.villainStack}`,
        `Pot: $${this.pot}  ·  Street: ${this.street}`,
        boardLine,
        this.hero.length
          ? `Hole: ${this.hero.map((c) => c.rank + c.suit).join(' ')}`
          : '',
      ].filter(Boolean),
      actions,
    });
  }

  async onAction(id: string): Promise<void> {
    if (this.busy) return;
    if (id === 'deal') {
      await this.startHand();
      return;
    }
    if (id === 'fold') {
      await this.heroFold();
      return;
    }
    if (id === 'checkCall') {
      await this.heroCheckCall();
      return;
    }
    if (id === 'raise') {
      await this.heroRaise();
      return;
    }
  }

  private async startHand(): Promise<void> {
    this.busy = true;
    this.resetTable();
    if (this.heroStack < this.bb || this.villainStack < this.bb) {
      this.heroStack = 1000;
      this.villainStack = 1000;
      this.message = 'Stacks refreshed';
    }
    this.deck.reset();
    this.buttonHero = !this.buttonHero;
    this.street = 'preflop';

    // Post blinds: button posts SB in heads-up
    if (this.buttonHero) {
      this.postBlind(true, this.sb);
      this.postBlind(false, this.bb);
      this.toCall = this.bb - this.sb;
    } else {
      this.postBlind(false, this.sb);
      this.postBlind(true, this.bb);
      this.toCall = 0; // hero already BB, villain to act first conceptually — we simplify: hero acts first always for MVP UX
      this.toCall = Math.max(0, this.villainBet - this.heroBet);
    }
    this.renderPotChips();

    this.hero = this.deck.drawMany(2);
    this.villain = this.deck.drawMany(2);

    const hPos = layoutRow(2, 0, 1.7, 0.7);
    const vPos = layoutRow(2, 0, -1.6, 0.7);

    for (let i = 0; i < 2; i++) {
      const hc = this.pool.getOrCreate(this.hero[i]!);
      hc.mesh.position.set(0, 2, 4);
      this.heroMeshes.push(hc);
      await dealTo(hc, hPos[i]!, true, 0, 0.3);

      const vc = this.pool.getOrCreate(this.villain[i]!);
      vc.mesh.position.set(0, 2, 4);
      this.villainMeshes.push(vc);
      await dealTo(vc, vPos[i]!, false, 0, 0.3);
    }

    this.message = this.toCall > 0 ? `Call $${this.toCall}, Raise, or Fold` : 'Check, Raise, or Fold';
    this.raiseAmount = Math.max(this.bb * 2, this.toCall * 2 || this.bb * 2);
    this.busy = false;
    this.syncHud();
  }

  private postBlind(hero: boolean, amount: number): void {
    if (hero) {
      const a = Math.min(amount, this.heroStack);
      this.heroStack -= a;
      this.heroBet += a;
      this.pot += a;
    } else {
      const a = Math.min(amount, this.villainStack);
      this.villainStack -= a;
      this.villainBet += a;
      this.pot += a;
    }
  }

  private async heroFold(): Promise<void> {
    this.busy = true;
    this.heroFolded = true;
    this.villainStack += this.pot;
    this.message = `You fold — AI wins pot $${this.pot}`;
    this.pot = 0;
    this.street = 'over';
    this.renderPotChips();
    this.busy = false;
    this.syncHud();
  }

  private async heroCheckCall(): Promise<void> {
    this.busy = true;
    if (this.toCall > 0) {
      const pay = Math.min(this.toCall, this.heroStack);
      this.heroStack -= pay;
      this.heroBet += pay;
      this.pot += pay;
      this.toCall = 0;
    }
    this.renderPotChips();
    await this.aiActThenAdvance();
  }

  private async heroRaise(): Promise<void> {
    this.busy = true;
    const need = this.toCall + this.raiseAmount;
    const pay = Math.min(need, this.heroStack);
    this.heroStack -= pay;
    this.heroBet += pay;
    this.pot += pay;
    this.toCall = 0;
    this.renderPotChips();
    // AI faces raise
    await this.aiRespondToRaise(this.heroBet - this.villainBet);
  }

  private async aiActThenAdvance(): Promise<void> {
    const strength = holdemStrength(this.villain, this.board);
    // Hero checked/called — AI decides check/call/raise/fold vs current toCall from AI perspective
    const aiToCall = Math.max(0, this.heroBet - this.villainBet);
    if (aiToCall === 0) {
      if (strength > 0.72 && this.villainStack > this.bb) {
        const raise = Math.min(this.raiseAmount, this.villainStack);
        this.villainStack -= raise;
        this.villainBet += raise;
        this.pot += raise;
        this.message = `AI raises $${raise}`;
        this.renderPotChips();
        // Hero must respond — set toCall
        this.toCall = this.villainBet - this.heroBet;
        this.raiseAmount = Math.max(this.bb * 2, this.toCall * 2);
        this.busy = false;
        this.syncHud();
        return;
      }
      this.message = 'AI checks';
    } else {
      if (strength < 0.28) {
        this.villainFolded = true;
        this.heroStack += this.pot;
        this.message = `AI folds — you win $${this.pot}`;
        this.pot = 0;
        this.street = 'over';
        this.renderPotChips();
        this.busy = false;
        this.syncHud();
        return;
      }
      if (strength > 0.75 && this.villainStack > aiToCall + this.bb) {
        const raiseExtra = Math.min(this.raiseAmount, this.villainStack - aiToCall);
        const pay = aiToCall + raiseExtra;
        this.villainStack -= pay;
        this.villainBet += pay;
        this.pot += pay;
        this.toCall = this.villainBet - this.heroBet;
        this.message = `AI re-raises — call $${this.toCall}?`;
        this.renderPotChips();
        this.busy = false;
        this.syncHud();
        return;
      }
      // call
      const pay = Math.min(aiToCall, this.villainStack);
      this.villainStack -= pay;
      this.villainBet += pay;
      this.pot += pay;
      this.message = `AI calls $${pay}`;
    }
    this.renderPotChips();
    await this.advanceStreet();
  }

  private async aiRespondToRaise(toCallAi: number): Promise<void> {
    const strength = holdemStrength(this.villain, this.board);
    if (strength < 0.35) {
      this.villainFolded = true;
      this.heroStack += this.pot;
      this.message = `AI folds to raise — you win $${this.pot}`;
      this.pot = 0;
      this.street = 'over';
      this.renderPotChips();
      this.busy = false;
      this.syncHud();
      return;
    }
    const pay = Math.min(toCallAi, this.villainStack);
    this.villainStack -= pay;
    this.villainBet += pay;
    this.pot += pay;
    this.message = `AI calls raise ($${pay})`;
    this.renderPotChips();
    await this.advanceStreet();
  }

  private async advanceStreet(): Promise<void> {
    // Equalize bets into pot conceptually already tracked; reset street bets
    this.heroBet = 0;
    this.villainBet = 0;
    this.toCall = 0;

    if (this.street === 'preflop') {
      this.street = 'flop';
      await this.dealBoard(3);
      this.message = 'Flop — your action';
    } else if (this.street === 'flop') {
      this.street = 'turn';
      await this.dealBoard(1);
      this.message = 'Turn — your action';
    } else if (this.street === 'turn') {
      this.street = 'river';
      await this.dealBoard(1);
      this.message = 'River — your action';
    } else if (this.street === 'river') {
      await this.showdown();
      this.busy = false;
      this.syncHud();
      return;
    }
    this.raiseAmount = this.bb * 2;
    this.busy = false;
    this.syncHud();
  }

  private async dealBoard(n: number): Promise<void> {
    const cards = this.deck.drawMany(n);
    for (const c of cards) this.board.push(c);
    const positions = layoutRow(5, 0, 0.05, 0.75);
    const startIdx = this.boardMeshes.length;
    for (let i = 0; i < n; i++) {
      const idx = startIdx + i;
      const mesh = this.pool.getOrCreate(this.board[idx]!);
      mesh.mesh.position.set(0, 2, 4);
      this.boardMeshes.push(mesh);
      await dealTo(mesh, positions[idx]!, true, 0, 0.35);
    }
  }

  private async showdown(): Promise<void> {
    this.street = 'showdown';
    this.message = 'Showdown…';
    this.syncHud();
    // Reveal villain
    for (const m of this.villainMeshes) {
      m.setFaceUp(true, false);
    }
    await new Promise((r) => setTimeout(r, 500));

    const h = evaluateBest([...this.hero, ...this.board]);
    const v = evaluateBest([...this.villain, ...this.board]);
    const cmp = compareHands(h, v);
    if (cmp > 0) {
      this.heroStack += this.pot;
      this.message = `You win $${this.pot} with ${h.name}`;
    } else if (cmp < 0) {
      this.villainStack += this.pot;
      this.message = `AI wins $${this.pot} with ${v.name}`;
    } else {
      const half = Math.floor(this.pot / 2);
      this.heroStack += half;
      this.villainStack += this.pot - half;
      this.message = `Split pot — both ${h.name}`;
    }
    this.pot = 0;
    this.street = 'over';
    this.renderPotChips();
  }

  onPointer(_ray: THREE.Raycaster, _event?: PointerEvent): void {}
}

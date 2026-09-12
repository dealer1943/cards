import * as THREE from 'three';
import { CardId } from '../cards/textures';
import { CardMesh, makeChip } from '../cards/CardMesh';
import { CardPool, Deck } from '../cards/deck';
import { dealTo, layoutRow } from '../cards/anim';
import { blackjackTotal, isBlackjack } from './handEval';
import type { GameContext, GameMode } from './types';

type Phase =
  | 'betting'
  | 'dealing'
  | 'player'
  | 'dealer'
  | 'settle'
  | 'roundOver';

export class BlackjackGame implements GameMode {
  readonly id = 'blackjack';
  readonly title = 'Blackjack';

  private ctx!: GameContext;
  private deck = new Deck();
  private pool = new CardPool();
  private player: CardId[] = [];
  private dealer: CardId[] = [];
  private playerMeshes: CardMesh[] = [];
  private dealerMeshes: CardMesh[] = [];
  private phase: Phase = 'betting';
  private bank = 1000;
  private bet = 0;
  private pendingBet = 25;
  private message = 'Place a bet';
  private chips: THREE.Mesh[] = [];
  private busy = false;

  mount(ctx: GameContext): void {
    this.ctx = ctx;
    this.pool.setGroup(ctx.cardGroup);
    this.bank = 1000;
    this.pendingBet = 25;
    this.bet = 0;
    this.resetRoundVisuals();
    this.phase = 'betting';
    this.message = 'Place a bet, then Deal';
    this.renderChips();
    this.syncHud();
  }

  unmount(): void {
    this.clearChips();
    this.pool.clear();
    this.player = [];
    this.dealer = [];
    this.playerMeshes = [];
    this.dealerMeshes = [];
  }

  update(dt: number): void {
    this.pool.update(dt);
  }

  private resetRoundVisuals(): void {
    this.pool.hideAll();
    this.player = [];
    this.dealer = [];
    this.playerMeshes = [];
    this.dealerMeshes = [];
  }

  private renderChips(): void {
    this.clearChips();
    const n = Math.min(8, Math.max(1, Math.ceil(this.bet / 25) || Math.ceil(this.pendingBet / 25)));
    for (let i = 0; i < n; i++) {
      const chip = makeChip(0xb22222, String(this.bet || this.pendingBet));
      chip.position.set(-2.2 + (i % 4) * 0.12, 0.03 + Math.floor(i / 4) * 0.05, 1.1);
      this.ctx.chipGroup.add(chip);
      this.chips.push(chip);
    }
  }

  private clearChips(): void {
    for (const c of this.chips) {
      c.parent?.remove(c);
      (c.geometry as THREE.BufferGeometry).dispose();
    }
    this.chips = [];
  }

  private syncHud(): void {
    const pTot =
      this.player.length > 0 ? blackjackTotal(this.player).total : null;
    const dTot =
      this.phase === 'player' || this.phase === 'dealing'
        ? this.dealer.length > 0 && this.dealerMeshes[0]?.faceUp
          ? blackjackTotal([this.dealer[0]!]).total
          : null
        : this.dealer.length > 0
          ? blackjackTotal(this.dealer).total
          : null;

    const actions: { id: string; label: string; disabled?: boolean }[] = [];
    if (this.phase === 'betting' || this.phase === 'roundOver') {
      actions.push(
        { id: 'bet25', label: 'Bet 25' },
        { id: 'bet50', label: 'Bet 50' },
        { id: 'bet100', label: 'Bet 100' },
        {
          id: 'deal',
          label: this.phase === 'roundOver' ? 'New Round' : 'Deal',
          disabled: this.busy || this.pendingBet > this.bank,
        },
      );
    } else if (this.phase === 'player') {
      actions.push(
        { id: 'hit', label: 'Hit', disabled: this.busy },
        { id: 'stand', label: 'Stand', disabled: this.busy },
        {
          id: 'double',
          label: 'Double',
          disabled:
            this.busy ||
            this.player.length !== 2 ||
            this.bank < this.bet,
        },
      );
    }

    this.ctx.setHud({
      title: 'Blackjack',
      status: this.message,
      lines: [
        `Bank: $${this.bank}`,
        `Bet: $${this.phase === 'betting' || this.phase === 'roundOver' ? this.pendingBet : this.bet}`,
        pTot !== null ? `You: ${pTot}` : '',
        dTot !== null ? `Dealer: ${dTot}` : '',
      ].filter(Boolean),
      actions,
    });
  }

  async onAction(id: string): Promise<void> {
    if (this.busy && id !== 'bet25' && id !== 'bet50' && id !== 'bet100') return;
    if (id === 'bet25') {
      this.pendingBet = 25;
      this.renderChips();
      this.syncHud();
      return;
    }
    if (id === 'bet50') {
      this.pendingBet = 50;
      this.renderChips();
      this.syncHud();
      return;
    }
    if (id === 'bet100') {
      this.pendingBet = 100;
      this.renderChips();
      this.syncHud();
      return;
    }
    if (id === 'deal') {
      await this.startRound();
      return;
    }
    if (id === 'hit') {
      await this.hit();
      return;
    }
    if (id === 'stand') {
      await this.stand();
      return;
    }
    if (id === 'double') {
      await this.double();
      return;
    }
  }

  private async startRound(): Promise<void> {
    if (this.pendingBet > this.bank) {
      this.message = 'Not enough chips';
      this.syncHud();
      return;
    }
    this.busy = true;
    this.bet = this.pendingBet;
    this.bank -= this.bet;
    this.resetRoundVisuals();
    this.deck.reset();
    this.phase = 'dealing';
    this.message = 'Dealing…';
    this.renderChips();
    this.syncHud();

    this.player = [this.deck.draw(), this.deck.draw()];
    this.dealer = [this.deck.draw(), this.deck.draw()];

    const pPos = layoutRow(2, 0, 1.6);
    const dPos = layoutRow(2, 0, -1.5);

    for (let i = 0; i < 2; i++) {
      const pc = this.pool.getOrCreate(this.player[i]!);
      this.playerMeshes.push(pc);
      await dealTo(pc, pPos[i]!, true, i * 0.12, 0.48);

      const dc = this.pool.getOrCreate(this.dealer[i]!);
      this.dealerMeshes.push(dc);
      await dealTo(dc, dPos[i]!, i === 0, 0.06, 0.48);
    }

    if (isBlackjack(this.player) || isBlackjack(this.dealer)) {
      await this.revealDealer();
      this.settleNatural();
      this.busy = false;
      this.syncHud();
      return;
    }

    this.phase = 'player';
    this.message = 'Hit, Stand, or Double';
    this.busy = false;
    this.syncHud();
  }

  private async hit(): Promise<void> {
    this.busy = true;
    const c = this.deck.draw();
    this.player.push(c);
    const mesh = this.pool.getOrCreate(c);
    mesh.mesh.position.set(0, 1.5, 3);
    mesh.setFaceUp(false, true);
    this.playerMeshes.push(mesh);
    const pos = layoutRow(this.player.length, 0, 1.6);
    // Re-layout existing
    for (let i = 0; i < this.playerMeshes.length; i++) {
      const m = this.playerMeshes[i]!;
      if (i < this.playerMeshes.length - 1) {
        m.animateTo(pos[i]!, new THREE.Euler(0, 0, 0), 0.2);
      }
    }
    await dealTo(mesh, pos[this.player.length - 1]!, true, 0, 0.45);

    const tot = blackjackTotal(this.player).total;
    if (tot > 21) {
      this.message = `Bust (${tot}) — you lose $${this.bet}`;
      this.phase = 'roundOver';
      await this.revealDealer();
      this.busy = false;
      this.syncHud();
      return;
    }
    this.message = `You have ${tot}`;
    this.busy = false;
    this.syncHud();
  }

  private async stand(): Promise<void> {
    this.busy = true;
    this.phase = 'dealer';
    this.message = 'Dealer plays…';
    this.syncHud();
    await this.revealDealer();
    await this.dealerPlay();
    this.settle();
    this.busy = false;
    this.syncHud();
  }

  private async double(): Promise<void> {
    if (this.player.length !== 2 || this.bank < this.bet) return;
    this.bank -= this.bet;
    this.bet *= 2;
    this.renderChips();
    this.busy = true;
    const c = this.deck.draw();
    this.player.push(c);
    const mesh = this.pool.getOrCreate(c);
    mesh.mesh.position.set(0, 1.5, 3);
    this.playerMeshes.push(mesh);
    const pos = layoutRow(3, 0, 1.6);
    for (let i = 0; i < 2; i++) {
      this.playerMeshes[i]!.animateTo(pos[i]!, new THREE.Euler(0, 0, 0), 0.2);
    }
    await dealTo(mesh, pos[2]!, true, 0, 0.45);
    const tot = blackjackTotal(this.player).total;
    if (tot > 21) {
      this.message = `Bust (${tot}) — you lose $${this.bet}`;
      this.phase = 'roundOver';
      await this.revealDealer();
      this.busy = false;
      this.syncHud();
      return;
    }
    this.phase = 'dealer';
    await this.revealDealer();
    await this.dealerPlay();
    this.settle();
    this.busy = false;
    this.syncHud();
  }

  private async revealDealer(): Promise<void> {
    if (this.dealerMeshes[1] && !this.dealerMeshes[1].faceUp) {
      await new Promise<void>((resolve) => {
        this.dealerMeshes[1]!.setFaceUp(true, false);
        setTimeout(resolve, 400);
      });
    }
  }

  private async dealerPlay(): Promise<void> {
    while (blackjackTotal(this.dealer).total < 17) {
      const c = this.deck.draw();
      this.dealer.push(c);
      const mesh = this.pool.getOrCreate(c);
      mesh.mesh.position.set(0, 1.5, 3);
      this.dealerMeshes.push(mesh);
      const pos = layoutRow(this.dealer.length, 0, -1.5);
      for (let i = 0; i < this.dealerMeshes.length - 1; i++) {
        this.dealerMeshes[i]!.animateTo(pos[i]!, new THREE.Euler(0, 0, 0), 0.2);
      }
      await dealTo(mesh, pos[this.dealer.length - 1]!, true, 0, 0.45);
    }
  }

  private settleNatural(): void {
    const pBJ = isBlackjack(this.player);
    const dBJ = isBlackjack(this.dealer);
    if (pBJ && dBJ) {
      this.bank += this.bet;
      this.message = 'Push — both blackjack';
    } else if (pBJ) {
      const win = Math.floor(this.bet * 2.5);
      this.bank += win;
      this.message = `Blackjack! +$${win - this.bet} (3:2)`;
    } else {
      this.message = `Dealer blackjack — lose $${this.bet}`;
    }
    this.phase = 'roundOver';
  }

  private settle(): void {
    const p = blackjackTotal(this.player).total;
    const d = blackjackTotal(this.dealer).total;
    if (p > 21) {
      this.message = `Bust — lose $${this.bet}`;
    } else if (d > 21) {
      this.bank += this.bet * 2;
      this.message = `Dealer busts (${d}) — win $${this.bet}`;
    } else if (p > d) {
      this.bank += this.bet * 2;
      this.message = `You win ${p} vs ${d} — +$${this.bet}`;
    } else if (p < d) {
      this.message = `Dealer ${d} beats ${p} — lose $${this.bet}`;
    } else {
      this.bank += this.bet;
      this.message = `Push ${p}`;
    }
    this.phase = 'roundOver';
  }

  onPointer(_ray: THREE.Raycaster, _event?: PointerEvent): void {
    // HUD-driven
  }
}

import type { HudState } from '../games/types';

export type ModeId = 'blackjack' | 'holdem' | 'solitaire';

export interface HudController {
  root: HTMLElement;
  setMode: (id: ModeId) => void;
  setGameHud: (state: HudState) => void;
  onModeChange: (cb: (id: ModeId) => void) => void;
  onAction: (cb: (id: string) => void) => void;
}

const MODES: { id: ModeId; label: string }[] = [
  { id: 'blackjack', label: 'Blackjack' },
  { id: 'holdem', label: "Hold'em" },
  { id: 'solitaire', label: 'Solitaire' },
];

export function createHud(container: HTMLElement): HudController {
  container.innerHTML = `
    <div class="hud-top">
      <div class="panel brand">Felt Table</div>
      <div class="panel mode-switch" id="mode-switch"></div>
      <div class="hint panel">Drag background to peek · Games use DOM buttons</div>
    </div>
    <div class="hud-bottom">
      <div class="panel status-panel" id="status-panel">
        <h2 id="game-title">—</h2>
        <p class="status" id="game-status"></p>
        <ul id="game-lines"></ul>
      </div>
      <div class="panel actions" id="game-actions"></div>
    </div>
  `;

  const modeSwitch = container.querySelector('#mode-switch')!;
  const titleEl = container.querySelector('#game-title')!;
  const statusEl = container.querySelector('#game-status')!;
  const linesEl = container.querySelector('#game-lines')!;
  const actionsEl = container.querySelector('#game-actions')!;

  let modeCb: ((id: ModeId) => void) | null = null;
  let actionCb: ((id: string) => void) | null = null;
  let current: ModeId = 'blackjack';

  for (const m of MODES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = m.label;
    btn.dataset.mode = m.id;
    btn.addEventListener('click', () => {
      current = m.id;
      paintModes();
      modeCb?.(m.id);
    });
    modeSwitch.appendChild(btn);
  }

  function paintModes(): void {
    modeSwitch.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('active', (b as HTMLButtonElement).dataset.mode === current);
    });
  }
  paintModes();

  return {
    root: container,
    setMode(id) {
      current = id;
      paintModes();
    },
    setGameHud(state) {
      titleEl.textContent = state.title;
      statusEl.textContent = state.status;
      linesEl.innerHTML = state.lines.map((l) => `<li>${escapeHtml(l)}</li>`).join('');
      actionsEl.innerHTML = '';
      for (const a of state.actions) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = a.label;
        btn.disabled = !!a.disabled;
        btn.addEventListener('click', () => actionCb?.(a.id));
        actionsEl.appendChild(btn);
      }
    },
    onModeChange(cb) {
      modeCb = cb;
    },
    onAction(cb) {
      actionCb = cb;
    },
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

import * as THREE from 'three';
import { createTableScene } from './table/scene';
import { createHud, ModeId } from './ui/hud';
import { BlackjackGame } from './games/blackjack';
import { HoldemGame } from './games/holdem';
import { SolitaireGame } from './games/solitaire';
import type { GameMode } from './games/types';

export function startApp(): void {
  const canvas = document.getElementById('scene') as HTMLCanvasElement;
  const hudRoot = document.getElementById('hud') as HTMLElement;
  if (!canvas || !hudRoot) throw new Error('Missing #scene or #hud');

  const table = createTableScene(canvas);
  const hud = createHud(hudRoot);

  const games: Record<ModeId, GameMode> = {
    blackjack: new BlackjackGame(),
    holdem: new HoldemGame(),
    solitaire: new SolitaireGame(),
  };

  let current: GameMode = games.blackjack;
  const ctx = {
    cardGroup: table.cardGroup,
    chipGroup: table.chipGroup,
    camera: table.camera,
    setHud: hud.setGameHud,
  };

  function switchMode(id: ModeId): void {
    current.unmount();
    // Clear leftover meshes
    while (table.cardGroup.children.length) {
      table.cardGroup.remove(table.cardGroup.children[0]!);
    }
    while (table.chipGroup.children.length) {
      table.chipGroup.remove(table.chipGroup.children[0]!);
    }
    current = games[id];
    hud.setMode(id);
    current.mount(ctx);
  }

  hud.onModeChange(switchMode);
  hud.onAction((id) => {
    void current.onAction(id);
  });

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  canvas.addEventListener('pointerdown', (e) => {
    if ((e.target as HTMLElement).closest?.('#hud')) return;
    // Don't steal mild orbit: only left click without drag intent for games that need it
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, table.camera);
    current.onPointer(raycaster, e);
  });

  switchMode('blackjack');

  let last = performance.now();
  function frame(now: number): void {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    current.update(dt);
    table.orbit.update(dt);
    table.renderer.render(table.scene, table.camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

import * as THREE from 'three';

export interface HudAction {
  id: string;
  label: string;
  disabled?: boolean;
}

export interface HudState {
  title: string;
  status: string;
  lines: string[];
  actions: HudAction[];
}

export interface GameContext {
  cardGroup: THREE.Group;
  chipGroup: THREE.Group;
  camera: THREE.PerspectiveCamera;
  setHud: (state: HudState) => void;
}

export interface GameMode {
  readonly id: string;
  readonly title: string;
  mount(ctx: GameContext): void;
  unmount(): void;
  update(dt: number): void;
  onAction(id: string): void | Promise<void>;
  onPointer(ray: THREE.Raycaster, event: PointerEvent): void;
}

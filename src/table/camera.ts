import * as THREE from 'three';

/** Table-centric perspective camera looking down at felt. */
export function createTableCamera(
  aspect: number,
): THREE.PerspectiveCamera {
  const cam = new THREE.PerspectiveCamera(42, aspect, 0.1, 100);
  cam.position.set(0, 7.2, 5.8);
  cam.lookAt(0, 0, 0.2);
  return cam;
}

/** Mild orbit clamp around table — drag to peek. */
export class MildOrbit {
  private azimuth = 0;
  private polar = 0.85; // ~looking down
  private radius = 9.2;
  private target = new THREE.Vector3(0, 0, 0.2);
  private dragging = false;
  private lastX = 0;
  private lastY = 0;

  constructor(
    private camera: THREE.PerspectiveCamera,
    private dom: HTMLElement,
  ) {
    this.apply();
    dom.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointermove', this.onMove);
  }

  dispose(): void {
    this.dom.removeEventListener('pointerdown', this.onDown);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointermove', this.onMove);
  }

  private onDown = (e: PointerEvent): void => {
    if ((e.target as HTMLElement).closest('#hud')) return;
    this.dragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  };

  private onUp = (): void => {
    this.dragging = false;
  };

  private onMove = (e: PointerEvent): void => {
    if (!this.dragging) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.azimuth -= dx * 0.005;
    this.polar = clamp(this.polar + dy * 0.004, 0.45, 1.25);
    this.azimuth = clamp(this.azimuth, -0.55, 0.55);
    this.apply();
  };

  private apply(): void {
    const x = this.target.x + this.radius * Math.sin(this.azimuth) * Math.sin(this.polar);
    const y = this.target.y + this.radius * Math.cos(this.polar);
    const z = this.target.z + this.radius * Math.cos(this.azimuth) * Math.sin(this.polar);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.target);
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

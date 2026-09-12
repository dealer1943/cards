import * as THREE from 'three';

/** Table-centric perspective camera looking down at felt. */
export function createTableCamera(
  aspect: number,
): THREE.PerspectiveCamera {
  const cam = new THREE.PerspectiveCamera(40, aspect, 0.1, 100);
  // Slightly lower / closer framing so rail + cards fill the view
  cam.position.set(0, 6.6, 5.35);
  cam.lookAt(0, 0, 0.15);
  return cam;
}

/** Mild orbit clamp around table — drag to peek; gentle settle on release. */
export class MildOrbit {
  private azimuth = 0;
  private polar = 0.9;
  private readonly restAzimuth = 0;
  private readonly restPolar = 0.9;
  private radius = 8.55;
  private target = new THREE.Vector3(0, 0.05, 0.15);
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private settling = false;

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

  /** Call each frame for optional settle-back after orbit peek. */
  update(dt: number): void {
    if (this.dragging || !this.settling) return;
    const k = 1 - Math.exp(-3.2 * dt);
    this.azimuth += (this.restAzimuth - this.azimuth) * k;
    this.polar += (this.restPolar - this.polar) * k;
    if (
      Math.abs(this.azimuth - this.restAzimuth) < 0.001 &&
      Math.abs(this.polar - this.restPolar) < 0.001
    ) {
      this.azimuth = this.restAzimuth;
      this.polar = this.restPolar;
      this.settling = false;
    }
    this.apply();
  }

  private onDown = (e: PointerEvent): void => {
    if ((e.target as HTMLElement).closest('#hud')) return;
    this.dragging = true;
    this.settling = false;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  };

  private onUp = (): void => {
    if (!this.dragging) return;
    this.dragging = false;
    this.settling = true;
  };

  private onMove = (e: PointerEvent): void => {
    if (!this.dragging) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.azimuth -= dx * 0.0045;
    this.polar = clamp(this.polar + dy * 0.0038, 0.52, 1.18);
    this.azimuth = clamp(this.azimuth, -0.48, 0.48);
    this.apply();
  };

  private apply(): void {
    const x =
      this.target.x + this.radius * Math.sin(this.azimuth) * Math.sin(this.polar);
    const y = this.target.y + this.radius * Math.cos(this.polar);
    const z =
      this.target.z + this.radius * Math.cos(this.azimuth) * Math.sin(this.polar);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.target);
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

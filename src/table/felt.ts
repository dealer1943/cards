import * as THREE from 'three';

/** Rounded green felt playing surface. */
export function createFelt(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'felt';

  const shape = new THREE.Shape();
  const w = 7.5;
  const d = 4.6;
  const r = 0.55;
  shape.moveTo(-w / 2 + r, -d / 2);
  shape.lineTo(w / 2 - r, -d / 2);
  shape.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
  shape.lineTo(w / 2, d / 2 - r);
  shape.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2);
  shape.lineTo(-w / 2 + r, d / 2);
  shape.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r);
  shape.lineTo(-w / 2, -d / 2 + r);
  shape.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.08,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 2,
  });
  geo.rotateX(-Math.PI / 2);

  const mat = new THREE.MeshStandardMaterial({
    color: 0x1a6b3c,
    roughness: 0.92,
    metalness: 0.02,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.position.y = -0.04;
  group.add(mesh);

  // Subtle inner rail
  const railMat = new THREE.MeshLambertMaterial({ color: 0x0f3d24 });
  const rail = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.35, 0.12, d + 0.35),
    railMat,
  );
  rail.position.y = -0.1;
  rail.receiveShadow = true;
  group.add(rail);

  return group;
}

import * as THREE from "three";
import { IMG_W, IMG_H, MAP_W, MAP_H, MAP_TEXTURE_URL, ROUTES } from "./map-static";

export function pxToWorld(x: number, y: number, elev = 0): THREE.Vector3 {
  return new THREE.Vector3((x / IMG_W - 0.5) * MAP_W, elev, (y / IMG_H - 0.5) * MAP_H);
}

function rectCenter(x1: number, y1: number, x2: number, y2: number) {
  return pxToWorld((x1 + x2) / 2, (y1 + y2) / 2, 0);
}

function disposeMaterial(mat: THREE.Material | THREE.Material[]) {
  if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
  else mat.dispose();
}

export function disposeObject3D(root: THREE.Object3D) {
  root.traverse((o) => {
    const anyObj = o as unknown as { geometry?: THREE.BufferGeometry; material?: THREE.Material | THREE.Material[] };
    anyObj.geometry?.dispose?.();
    if (anyObj.material) disposeMaterial(anyObj.material);
  });
}

function pointSegDistance2D(p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3) {
  const vx = b.x - a.x, vz = b.z - a.z, wx = p.x - a.x, wz = p.z - a.z;
  const c1 = vx * wx + vz * wz;
  if (c1 <= 0) return Math.hypot(p.x - a.x, p.z - a.z);
  const c2 = vx * vx + vz * vz;
  if (c2 <= c1) return Math.hypot(p.x - b.x, p.z - b.z);
  const t = c1 / c2;
  return Math.hypot(p.x - (a.x + t * vx), p.z - (a.z + t * vz));
}

function simplifyRDP(points: THREE.Vector3[], eps = 0.55) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1; keep[points.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop()!;
    let maxD = 0, idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = pointSegDistance2D(points[i], points[s], points[e]);
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD > eps && idx > -1) { keep[idx] = 1; stack.push([s, idx], [idx, e]); }
  }
  return points.filter((_, i) => keep[i]);
}

function removeTinySteps(points: THREE.Vector3[], minStep = 0.16) {
  if (points.length < 2) return points;
  const out: THREE.Vector3[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    if (out[out.length - 1].distanceTo(points[i]) >= minStep) out.push(points[i]);
  }
  out.push(points[points.length - 1]);
  return out;
}

function parsePathD(d: string) {
  const nums = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < nums.length; i += 2) pts.push(pxToWorld(nums[i], nums[i + 1], 0.38));
  return pts;
}

function setSRGB(texture: THREE.Texture) {
  // three r152+ uses colorSpace; older versions use encoding.
  const t = texture as THREE.Texture & { colorSpace?: unknown; encoding?: unknown };
  if ("colorSpace" in t && "SRGBColorSpace" in THREE) t.colorSpace = THREE.SRGBColorSpace;
  else if ("encoding" in t && "sRGBEncoding" in THREE) t.encoding = (THREE as unknown as { sRGBEncoding: unknown }).sRGBEncoding;
}

export function createCart(colorOrIndex: number = 0): THREE.Group {
  const palette = [0x111111, 0x0b3d91, 0xe8412f, 0xffd84d, 0x00b36b, 0xf97316, 0x8e44ad, 0xf7f7f2, 0x20c7d9, 0xff4fa3, 0x30343b, 0x2563eb];
  const color = colorOrIndex > 0xffffff ? colorOrIndex : palette[Math.abs(colorOrIndex) % palette.length];
  const mat = (c: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.08, ...opts });
  const g = new THREE.Group();
  const bodyMat = mat(color);
  const dark = mat(0x111812);
  const roof = mat(0xf8fff9);
  const glass = mat(0x9be9ff, { transparent: true, opacity: 0.55, roughness: 0.15 });

  const base = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.42, 1.12), bodyMat);
  base.position.y = 0.45; base.castShadow = true; g.add(base);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.30, 1.02), bodyMat);
  hood.position.set(0.98, 0.68, 0); hood.castShadow = true; g.add(hood);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.55, 0.88), dark);
  seat.position.set(-0.25, 0.86, 0); seat.castShadow = true; g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.72, 0.88), dark);
  back.position.set(-0.62, 1.12, 0); back.castShadow = true; g.add(back);
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.13, 1.28), roof);
  canopy.position.set(-0.18, 1.72, 0); canopy.castShadow = true; g.add(canopy);

  [[-0.98, -0.55], [-0.98, 0.55], [0.58, -0.55], [0.58, 0.55]].forEach(([x, z]) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 8), roof);
    pole.position.set(x, 1.24, z); pole.castShadow = true; g.add(pole);
  });

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.65, 0.92), glass);
  windshield.position.set(0.48, 1.17, 0); windshield.rotation.z = -0.18; g.add(windshield);

  const wheelGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.18, 18);
  const wheels: THREE.Mesh[] = [];
  [[-0.72, -0.65], [-0.72, 0.65], [0.78, -0.65], [0.78, 0.65]].forEach(([x, z]) => {
    const w = new THREE.Mesh(wheelGeo, dark);
    w.rotation.x = Math.PI / 2; w.position.set(x, 0.25, z); w.castShadow = true; wheels.push(w); g.add(w);
  });

  const lightMat = mat(0xfff3a3, { emissive: 0xffe88a, emissiveIntensity: 1.6 });
  const light1 = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), lightMat);
  light1.position.set(1.33, 0.72, -0.28); g.add(light1);
  const light2 = light1.clone(); light2.position.z = 0.28; g.add(light2);

  g.userData.wheels = wheels;
  return g;
}

export function buildStaticScene(onReady: (root: THREE.Group) => void) {
  const loader = new THREE.TextureLoader();
  loader.load(MAP_TEXTURE_URL, (tex) => {
    setSRGB(tex);
    tex.anisotropy = 8;

    const root = new THREE.Group();

    const mapMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(MAP_W, MAP_H, 1, 1),
      new THREE.MeshBasicMaterial({ map: tex }),
    );
    mapMesh.rotation.x = -Math.PI / 2;
    mapMesh.receiveShadow = true;
    root.add(mapMesh);

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(MAP_W + 2.2, 2.0, MAP_H + 2.2),
      new THREE.MeshStandardMaterial({ color: 0x1f5a37, roughness: 0.82, metalness: 0.04 }),
    );
    base.position.y = -1.08; base.receiveShadow = true; root.add(base);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(95, 96),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.08, depthWrite: false }),
    );
    floor.rotation.x = -Math.PI / 2; floor.position.y = -1.25; root.add(floor);

    function makeCropTexture(x1: number, y1: number, x2: number, y2: number) {
      const t = tex.clone();
      t.needsUpdate = true;
      t.wrapS = THREE.ClampToEdgeWrapping;
      t.wrapT = THREE.ClampToEdgeWrapping;
      t.repeat.set(Math.abs(x2 - x1) / IMG_W, Math.abs(y2 - y1) / IMG_H);
      t.offset.set(Math.min(x1, x2) / IMG_W, 1 - Math.max(y1, y2) / IMG_H);
      return t;
    }

    function addTexturedBlock(x1: number, y1: number, x2: number, y2: number, h: number, sideColor = 0x40584b, sideOpacity = 0.40, name = "") {
      const c = rectCenter(x1, y1, x2, y2);
      const w = Math.abs(x2 - x1) / IMG_W * MAP_W;
      const d = Math.abs(y2 - y1) / IMG_H * MAP_H;
      const sideMat = new THREE.MeshStandardMaterial({ color: sideColor, transparent: true, opacity: sideOpacity, roughness: 0.68, metalness: 0.02 });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), sideMat);
      mesh.position.set(c.x, h / 2 + 0.055, c.z);
      mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = name; root.add(mesh);

      const roofTex = makeCropTexture(x1, y1, x2, y2);
      const roofMat = new THREE.MeshStandardMaterial({ map: roofTex, color: 0xffffff, roughness: 0.50, metalness: 0.01 });
      const roofMesh = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.012, d * 1.012), roofMat);
      roofMesh.rotation.x = -Math.PI / 2;
      roofMesh.position.set(c.x, h + 0.07, c.z);
      roofMesh.castShadow = true; roofMesh.receiveShadow = false; root.add(roofMesh);

      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.30 }));
      edge.position.copy(mesh.position); root.add(edge);
    }

    function addLowArea(x1: number, y1: number, x2: number, y2: number, h: number, color = 0x54c86d, opacity = 0.22) {
      const c = rectCenter(x1, y1, x2, y2);
      const w = Math.abs(x2 - x1) / IMG_W * MAP_W;
      const d = Math.abs(y2 - y1) / IMG_H * MAP_H;
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, transparent: true, opacity, roughness: 0.74, metalness: 0.01 }));
      m.position.set(c.x, h / 2 + 0.04, c.z); m.castShadow = true; m.receiveShadow = true; root.add(m);
    }

    function addCylinderArea(px: number, py: number, rx: number, ry: number, h: number, color = 0xf6f0df, opacity = 0.34) {
      const p = pxToWorld(px, py, 0);
      const geo = new THREE.CylinderGeometry(1, 1, h, 48);
      const mat = new THREE.MeshStandardMaterial({ color, transparent: true, opacity, roughness: 0.62, metalness: 0.02 });
      const m = new THREE.Mesh(geo, mat);
      m.scale.set(rx / IMG_W * MAP_W, 1, ry / IMG_H * MAP_H);
      m.position.set(p.x, h / 2 + 0.06, p.z); m.castShadow = true; m.receiveShadow = true; root.add(m);
    }

    // Orijinal görüntüyü koruyan, dokulu ve daha doğal 3D kabartmalar.
    addTexturedBlock(276, 70, 545, 166, 3.2, 0x51655e, 0.34, "Hotel Left Wing");
    addTexturedBlock(545, 70, 902, 166, 3.5, 0x51655e, 0.34, "Hotel Right Wing");
    addTexturedBlock(565, 142, 690, 392, 3.15, 0x51655e, 0.32, "Hotel Vertical Wing");
    addTexturedBlock(300, 92, 880, 126, 3.75, 0x4f6a72, 0.28, "Hotel Roof Strip");

    const villas: Array<[number, number, number, number]> = [
      [62, 58, 103, 143], [116, 57, 157, 145], [178, 58, 220, 146],
      [60, 158, 101, 256], [116, 158, 157, 258], [177, 158, 218, 260],
      [57, 272, 104, 382], [121, 274, 169, 388], [182, 273, 226, 388],
      [70, 405, 119, 449], [136, 404, 190, 450],
    ];
    villas.forEach((r) => addTexturedBlock(r[0], r[1], r[2], r[3], 1.35, 0x6a5d4f, 0.32, "Villa"));

    addCylinderArea(315, 690, 66, 38, 1.35, 0xf6efe0, 0.28);
    addCylinderArea(708, 515, 48, 40, 1.55, 0xf6efe0, 0.28);
    addTexturedBlock(510, 672, 648, 812, 1.65, 0x675b55, 0.28, "Night Event");
    addTexturedBlock(278, 650, 390, 735, 1.25, 0x675b55, 0.28, "Snack Restaurant");
    addLowArea(780, 480, 918, 592, 0.50, 0x2e7dff, 0.18);
    addLowArea(655, 640, 948, 860, 0.35, 0x54c86d, 0.14);
    addLowArea(40, 565, 270, 840, 0.40, 0xdcebf4, 0.12);
    addTexturedBlock(258, 810, 390, 875, 1.10, 0x6a5d4f, 0.25, "Javara Beach Club");
    addTexturedBlock(32, 805, 118, 870, 1.00, 0x6a5d4f, 0.25, "Casita Beach Club");

    // Rota çizgisi görselin üstünde zaten var; 3D sahnede sadece hafif parlak hat veriyoruz.
    ROUTES.forEach((route) => {
      const pts = simplifyRDP(removeTinySteps(parsePathD(route.d)), 0.55);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: route.color, transparent: true, opacity: 0.35 }));
      root.add(line);
      const glow = new THREE.Line(lineGeo.clone(), new THREE.LineBasicMaterial({ color: route.color, transparent: true, opacity: 0.12 }));
      glow.position.y += 0.045; root.add(glow);
    });

    onReady(root);
  });
}

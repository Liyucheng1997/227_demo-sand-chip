/* A1 原料:石英晶簇 + 石英砂 + α-石英原子结构(真实晶体学坐标) */
import * as THREE from 'three';
import { M } from '../lib/materials.js';
import { mesh, lights, V, DEG, instanced, mat4, sphere } from '../lib/kit.js';
import { canvas, rng, noiseTex } from '../lib/textures.js';
import { fbm, displace } from '../lib/noise.js';

/** 石英单晶:不等宽六方柱 + 菱面体端面(r 面与柱面夹角 141.8°) */
function quartzGeo(r, len, rand) {
  const ring = [], top = [];
  const jit = Array.from({ length: 6 }, () => 0.8 + rand() * 0.35);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ring.push(new THREE.Vector3(Math.cos(a) * r * jit[i], 0, Math.sin(a) * r * jit[i]));
  }
  const apo = r * Math.cos(30 * DEG);
  const tipH = apo * Math.tan(51.8 * DEG);
  const apex = new THREE.Vector3((rand() - 0.5) * r * 0.25, len + tipH, (rand() - 0.5) * r * 0.25);
  ring.forEach((p) => top.push(p.clone().setY(len)));
  const v = [];
  const tri = (a, b, c) => v.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  for (let i = 0; i < 6; i++) {
    const j = (i + 1) % 6;
    tri(ring[i], top[j], ring[j]); tri(ring[i], top[i], top[j]);
    tri(top[i], apex, top[j]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  // 柱面横纹 UV(用于条纹凹凸贴图)
  const uv = [];
  for (let i = 0; i < v.length / 3; i++) uv.push(Math.atan2(v[i * 3 + 2], v[i * 3]) / Math.PI, v[i * 3 + 1] * 1.5);
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

function striationTex() {
  const [c, g] = canvas(64, 512);
  const r = rng(3);
  g.fillStyle = '#808080'; g.fillRect(0, 0, 64, 512);
  for (let y = 0; y < 512; y += 2 + r() * 6) {
    const v = 90 + r() * 90;
    g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(0, y, 64, 1 + r() * 1.5);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function sandTex() {
  const [c, g] = canvas(1024, 1024);
  const r = rng(17);
  g.fillStyle = '#a89270'; g.fillRect(0, 0, 1024, 1024);
  const cols = ['#d6c8a8', '#a3875a', '#e9e0cc', '#7d6745', '#c2ab80', '#5f5444', '#f2ead8'];
  for (let i = 0; i < 60000; i++) {
    g.fillStyle = cols[(r() * cols.length) | 0];
    g.globalAlpha = 0.35 + r() * 0.6;
    const s = 1 + r() * 2.6;
    g.fillRect(r() * 1024, r() * 1024, s, s);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 6);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/* ---------- α-石英晶体结构(P3₂21,a=4.913Å c=5.405Å,Levien 1980) ---------- */
function alphaQuartz(nx, ny, nz) {
  const a = 4.913, c = 5.405;
  const ops = [
    ([x, y, z]) => [x, y, z], ([x, y, z]) => [-y, x - y, z + 2 / 3], ([x, y, z]) => [-x + y, -x, z + 1 / 3],
    ([x, y, z]) => [y, x, -z], ([x, y, z]) => [x - y, -y, -z + 1 / 3], ([x, y, z]) => [-x, -x + y, -z + 2 / 3],
  ];
  const fr = (p) => p.map((t) => ((t % 1) + 1) % 1);
  const gen = (p) => {
    const s = [];
    ops.forEach((o) => { const q = fr(o(p)); if (!s.some((r) => r.every((t, i) => Math.abs(t - q[i]) < 1e-4))) s.push(q); });
    return s;
  };
  const toC = ([x, y, z]) => new THREE.Vector3(a * (x - y / 2), c * z, a * (y * Math.sqrt(3) / 2));
  const SiF = gen([0.4697, 0, 2 / 3]), OF = gen([0.4135, 0.2669, 0.7858]);
  const si = [], ox = [];
  for (let i = -1; i <= nx; i++) for (let j = -1; j <= ny; j++) for (let k = -1; k <= nz; k++) {
    SiF.forEach((p) => {
      const f = [p[0] + i, p[1] + j, p[2] + k];
      if (f[0] >= 0 && f[0] < nx && f[1] >= 0 && f[1] < ny && f[2] >= 0 && f[2] < nz) si.push(toC(f));
    });
    OF.forEach((p) => ox.push(toC([p[0] + i, p[1] + j, p[2] + k])));
  }
  // 只保留与选中 Si 成键的 O(保证每个四面体完整)
  const bonds = [], usedO = new Map();
  si.forEach((s, si_i) => ox.forEach((o, oi) => {
    if (s.distanceTo(o) < 1.7) {
      if (!usedO.has(oi)) usedO.set(oi, o);
      bonds.push([s, o, si_i]);
    }
  }));
  return { si, ox: [...usedO.values()], bonds };
}

// 地形高度:中心平缓,远处起伏成沙丘
function H(x, z) {
  const d = Math.hypot(x, z);
  const k = Math.min(1, Math.max(0, (d - 3) / 12));
  const ripple = Math.sin(x * 2.2 + fbm(x * 0.2, 0, z * 0.2) * 6) * 0.02;
  return fbm(x * 0.06, 3.1, z * 0.06, 4) * 6 * k * k + fbm(x * 0.5, 1, z * 0.5, 3) * 0.12 + ripple;
}

export default {
  bg: ['#6f97c8', '#e6d3ae'],
  fog: ['#d9c9a8', 22, 60],
  env: 0.8,
  exposure: 0.9,
  bloom: { strength: 0.25, threshold: 1.2 },
  zoom: [1.5, 40],
  views: [
    { name: '晶簇全景', pos: [4.5, 4.6, 11.5], target: [2.6, 2.0, -1] },
    { name: '晶体特写', pos: [-2.6, 4.4, 7.2], target: [0, 2.6, 0.2] },
    { name: '原子结构 SiO₄', pos: [11.6, 4.0, 2.4], target: [8.6, 2.4, -3.2] },
    { name: '砂粒微距', pos: [2.6, 0.9, 3.6], target: [2.2, 0.15, 1.6] },
  ],
  build({ root, label }) {
    const L = lights(root, { key: 3.2, keyColor: '#ffe6c4', keyPos: [-9, 7, 6], shadow: 9, hemi: 0.28, sky: '#9fb6ff', ground: '#5a4a33', rim: 1.6, rimPos: [6, 4, -9] });
    L.key.shadow.radius = 4;
    const rand = rng(42);

    /* 沙丘地面 */
    const gGeo = new THREE.PlaneGeometry(70, 70, 260, 260);
    gGeo.rotateX(-Math.PI / 2);
    const gp = gGeo.attributes.position;
    for (let i = 0; i < gp.count; i++) {
      const x = gp.getX(i), z = gp.getZ(i);
      gp.setY(i, H(x, z));
    }
    gGeo.computeVertexNormals();
    const sandMat = new THREE.MeshStandardMaterial({ map: sandTex(), roughness: 0.96, metalness: 0, bumpMap: noiseTex({ size: 512, blobs: 4000, scale: 0.3, repeat: [14, 14], seed: 8 }), bumpScale: 1.2 });
    mesh(gGeo, sandMat, { parent: root, cast: false });

    /* 母岩 */
    const rockGeo = displace(new THREE.IcosahedronGeometry(1.6, 6), 0.75, 1.15, 6, 2);
    rockGeo.scale(1.5, 0.55, 1.2);
    const rockMat = new THREE.MeshStandardMaterial({ color: '#6f6962', roughness: 0.95, bumpMap: noiseTex({ seed: 4, blobs: 2500, scale: 0.4 }), bumpScale: 2 });
    mesh(rockGeo, rockMat, { parent: root, pos: [0, 0.3, 0], scale: 1.3 });

    /* 石英晶簇 */
    const stri = striationTex();
    const clear = new THREE.MeshPhysicalMaterial({
      color: '#ffffff', roughness: 0.03, transmission: 1, thickness: 0.8, ior: 1.544, metalness: 0,
      attenuationColor: new THREE.Color('#e9f1ff'), attenuationDistance: 3, bumpMap: stri, bumpScale: 0.6, specularIntensity: 1,
    });
    const milky = new THREE.MeshPhysicalMaterial({
      color: '#f4f1ec', roughness: 0.22, transmission: 0.55, thickness: 1.2, ior: 1.544, bumpMap: stri, bumpScale: 0.8,
    });
    const smoky = new THREE.MeshPhysicalMaterial({
      color: '#ffffff', roughness: 0.05, transmission: 1, thickness: 1, ior: 1.544,
      attenuationColor: new THREE.Color('#a98f72'), attenuationDistance: 1.2, bumpMap: stri, bumpScale: 0.5,
    });
    const crystals = [
      // [r, len, x, z, tiltX, tiltZ, mat]
      [0.42, 2.6, 0, 0, 0.05, 0.05, clear], [0.3, 1.9, 0.75, 0.25, 0.1, -0.45, clear],
      [0.26, 1.6, -0.7, 0.3, 0.3, 0.42, milky], [0.34, 2.0, -0.2, -0.65, -0.48, 0.1, clear],
      [0.22, 1.3, 0.55, -0.55, -0.4, -0.35, smoky], [0.18, 1.1, 1.2, -0.1, 0.05, -0.8, clear],
      [0.2, 1.2, -1.15, -0.25, -0.2, 0.75, milky], [0.15, 0.9, 0.2, 0.8, 0.7, -0.1, clear],
      [0.16, 0.85, -0.45, 0.85, 0.75, 0.3, clear], [0.25, 1.4, 1.0, 0.75, 0.5, -0.5, smoky],
      [0.13, 0.7, -1.4, 0.55, 0.4, 0.9, clear], [0.12, 0.65, 1.55, 0.45, 0.3, -1.0, milky],
    ];
    const cluster = new THREE.Group();
    cluster.scale.setScalar(1.45);
    root.add(cluster);
    crystals.forEach(([r, len, x, z, tx, tz, m]) => {
      const c = mesh(quartzGeo(r, len, rand), m, { parent: cluster, pos: [x * 1.25, 0.55, z * 1.05] });
      c.rotation.set(tx, rand() * Math.PI, tz);
    });
    // 散落的小晶体与碎块
    for (let i = 0; i < 9; i++) {
      const a = rand() * Math.PI * 2, d = 3.2 + rand() * 3;
      const c = mesh(quartzGeo(0.08 + rand() * 0.12, 0.25 + rand() * 0.5, rand), rand() > 0.5 ? clear : milky, { parent: root });
      c.position.set(Math.cos(a) * d, H(Math.cos(a) * d, Math.sin(a) * d) + 0.03, Math.sin(a) * d);
      c.rotation.set(Math.PI / 2 + (rand() - 0.5), rand() * 6, rand() * 0.6);
    }

    /* 石英砂粒(实例化):半透明、棱角分明 */
    const grainGeo = new THREE.IcosahedronGeometry(0.035, 0);
    const grainMat = new THREE.MeshPhysicalMaterial({ roughness: 0.35, transmission: 0.45, thickness: 0.05, ior: 1.544, metalness: 0 });
    const mats = [], cols = [];
    const palette = ['#fffdf8', '#efe3c8', '#d9c29a', '#c9ab7c', '#f8f1e2', '#9c8a73'].map((c) => new THREE.Color(c));
    for (let i = 0; i < 3500; i++) {
      const ga = rand() * Math.PI * 2, gr = Math.sqrt(-2 * Math.log(1 - rand() * 0.98)) * 0.9;
      const x = 4.2 + Math.cos(ga) * gr * 1.4, z = 3.0 + Math.sin(ga) * gr;
      const y = H(x, z) + 0.012;
      const s = (0.4 + rand() * 1.1) * Math.max(0.35, 1 - gr * 0.25);
      mats.push(mat4([x, y, z], [rand() * 6, rand() * 6, rand() * 6], [s, s * (0.6 + rand() * 0.5), s * (0.7 + rand() * 0.4)]));
      cols.push(palette[(rand() * palette.length) | 0]);
    }
    instanced(grainGeo, grainMat, mats, { parent: root, colors: cols });

    /* α-石英原子模型 */
    const mol = new THREE.Group();
    mol.position.set(8.6, 2.4, -3.2);
    root.add(mol);
    const { si, ox, bonds } = alphaQuartz(2, 2, 2);
    const S = 0.24; // Å → 场景单位
    const center = new THREE.Vector3();
    si.forEach((p) => center.add(p)); center.divideScalar(si.length);
    const P = (p) => p.clone().sub(center).multiplyScalar(S);
    const siMat = new THREE.MeshPhysicalMaterial({ color: '#4f86d9', roughness: 0.25, metalness: 0.1, clearcoat: 0.6 });
    const oMat = new THREE.MeshPhysicalMaterial({ color: '#e0453a', roughness: 0.25, clearcoat: 0.6 });
    const sGeo = new THREE.SphereGeometry(1, 28, 18);
    instanced(sGeo, siMat, si.map((p) => mat4(P(p).toArray(), [0, 0, 0], 0.2)), { parent: mol });
    instanced(sGeo, oMat, ox.map((p) => mat4(P(p).toArray(), [0, 0, 0], 0.15)), { parent: mol });
    const bGeo = new THREE.CylinderGeometry(0.045, 0.045, 1, 10);
    bGeo.translate(0, 0.5, 0);
    const bMat = new THREE.MeshStandardMaterial({ color: '#c9ced8', roughness: 0.4, metalness: 0.3 });
    const up = new THREE.Vector3(0, 1, 0);
    const bm = bonds.map(([s, o]) => {
      const a = P(s), b = P(o), d = b.clone().sub(a);
      const q = new THREE.Quaternion().setFromUnitVectors(up, d.clone().normalize());
      return new THREE.Matrix4().compose(a, q, new THREE.Vector3(1, d.length(), 1));
    });
    instanced(bGeo, bMat, bm, { parent: mol });
    // SiO₄ 四面体(半透明多面体表示,类似 VESTA)
    const tetVerts = [];
    si.forEach((s, i) => {
      const os = bonds.filter((b) => b[2] === i).map((b) => P(b[1]));
      if (os.length !== 4) return;
      [[0, 1, 2], [0, 1, 3], [0, 2, 3], [1, 2, 3]].forEach((f) => f.forEach((k) => tetVerts.push(os[k].x, os[k].y, os[k].z)));
    });
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.Float32BufferAttribute(tetVerts, 3));
    tg.computeVertexNormals();
    mesh(tg, new THREE.MeshPhysicalMaterial({ color: '#6fa8ff', transparent: true, opacity: 0.2, roughness: 0.2, side: THREE.DoubleSide, depthWrite: false }), { parent: mol, cast: false });
    // 晶胞框
    const a = 4.913 * S, c = 5.405 * S;
    const cell = new THREE.Group();
    const corners = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([x, y]) => new THREE.Vector3(a * (x - y / 2), 0, a * (y * Math.sqrt(3) / 2)));
    const lpts = [];
    for (const z of [0, c]) corners.forEach((p, i) => { const q = corners[(i + 1) % 4]; lpts.push(p.x, z, p.z, q.x, z, q.z); });
    corners.forEach((p) => lpts.push(p.x, 0, p.z, p.x, c, p.z));
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(lpts, 3));
    cell.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.8 })));
    cell.position.copy(P(new THREE.Vector3(0, 0, 0)));
    mol.add(cell);

    // 底座光盘
    const disc = mesh(new THREE.CircleGeometry(3.2, 64), new THREE.MeshBasicMaterial({ color: '#7fb0ff', transparent: true, opacity: 0.06, depthWrite: false }), { parent: root, pos: [8.6, 0.25, -3.2], rot: [-Math.PI / 2, 0, 0], cast: false });
    disc.renderOrder = 2;

    label('石英晶体(水晶)<small>六方柱 + 菱面体端面</small>', V(0.1, 5.3, 0.2));
    label('乳白石英<small>含微小气液包裹体</small>', V(-1.9, 2.9, 0.5));
    label('茶晶<small>天然辐照形成色心</small>', V(2.2, 2.6, -1.0));
    label('母岩(脉石英围岩)', V(-2.2, 0.7, 1.4));
    label('高纯石英砂<small>SiO₂ ≥ 99.5%</small>', V(4.2, 0.3, 3.2));
    // 原子标注挂在模型上,随模型一起旋转
    const top = (arr) => arr.reduce((b, p) => (P(p).y > P(b).y ? p : b));
    label('Si 原子', P(top(si)), mol, { cls: 'big' });
    label('O 原子<small>每个 O 连接两个 Si</small>', P(ox.reduce((b, p) => (P(p).x < P(b).x ? p : b))), mol);
    label('SiO₄ 四面体<small>Si–O 键长 0.161 nm</small>', P(si.reduce((b, p) => (P(p).y < P(b).y ? p : b))), mol);
    label('α-石英晶胞<small>a = 0.491 nm, c = 0.541 nm</small>', cell.position.clone().add(V(0, c, 0)), mol);

    return {
      update(t) {
        mol.rotation.y = t * 0.18;
      },
    };
  },
};

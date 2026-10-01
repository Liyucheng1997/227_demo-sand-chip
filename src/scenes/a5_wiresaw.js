/* A5 多线切割机:导轮、线网、晶棒下压切片、冷却液、成品晶圆花篮 */
import * as THREE from 'three';
import { M } from '../lib/materials.js';
import { mesh, cyl, box, rbox, lathe, pipe, lights, V, Particles, instanced, mat4, smooth, lerp } from '../lib/kit.js';
import { canvas, rng, noiseTex, raisedFloorTex, textTex } from '../lib/textures.js';

const RI = 0.15, LEN = 0.6, N = 150, PITCH = LEN / N, THK = PITCH * 0.72;
const RR = 0.13, RX = 0.4, WY = 1.33, CYCLE = 24;

/** 导轮表面:聚氨酯包覆 + 密集线槽 */
function grooveTex() {
  const [c, g] = canvas(64, 1024);
  g.fillStyle = '#d7a548'; g.fillRect(0, 0, 64, 1024);
  for (let y = 0; y < 1024; y += 4) { g.fillStyle = 'rgba(90,60,20,0.55)'; g.fillRect(0, y, 64, 1.5); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
/** 晶圆切割面:细密的锯痕纹 */
function sawMarkTex() {
  const [c, g] = canvas(512, 512);
  const r = rng(4);
  g.fillStyle = '#8a8f96'; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 1) { const v = 125 + Math.sin(y * 0.35) * 14 + r() * 18; g.fillStyle = `rgba(${v},${v + 3},${v + 8},0.6)`; g.fillRect(0, y, 512, 1); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export default {
  bg: ['#1c2232', '#07090d'],
  env: 0.7,
  exposure: 0.95,
  bloom: { strength: 0.35, threshold: 1.5 },
  zoom: [0.3, 25],
  views: [
    { name: '线锯全景', pos: [2.2, 2.3, 2.6], target: [0, 1.15, 0] },
    { name: '线网特写', pos: [0.75, 1.55, 0.85], target: [0.05, 1.3, 0.1] },
    { name: '切割前沿', pos: [0.32, 1.36, 0.42], target: [0.1, 1.3, 0.25] },
    { name: '切好的晶圆', pos: [2.6, 1.5, 1.2], target: [1.9, 0.95, 0.1] },
  ],
  build({ root, label }) {
    lights(root, { key: 1.8, keyPos: [3, 6, 4], hemi: 0.35, shadow: 3, rim: 0.8 });

    mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ map: raisedFloorTex({ repeat: [50, 50] }), color: '#7d848e', roughness: 0.6, metalness: 0.2 }),
      { rot: [-Math.PI / 2, 0, 0], parent: root, cast: false });

    /* 机床本体:铸件底座 + 立柱 + 横梁 */
    const paint = M.paint('#e6e9ec');
    const paintDark = M.paint('#3c424a');
    box(1.6, 0.55, 1.3, paint, { parent: root, pos: [0, 0.275, -0.05] });
    box(1.6, 0.06, 1.3, paintDark, { parent: root, pos: [0, 0.58, -0.05] });
    box(0.22, 1.9, 0.42, paint, { parent: root, pos: [-0.72, 1.5, -0.45] });
    box(0.22, 1.9, 0.42, paint, { parent: root, pos: [0.72, 1.5, -0.45] });
    box(1.66, 0.25, 0.7, paint, { parent: root, pos: [0, 2.5, -0.3] });
    box(1.66, 1.9, 0.08, paint, { parent: root, pos: [0, 1.5, -0.66] });
    // 切割室接液槽
    box(1.2, 0.08, 1.0, M.steel(), { parent: root, pos: [0, 0.62, 0] });
    // 操作屏
    const scr = new THREE.Group(); scr.position.set(1.02, 1.45, 0.35); scr.rotation.y = -0.6; root.add(scr);
    rbox(0.42, 0.32, 0.05, 0.01, paintDark, { parent: scr });
    box(0.36, 0.26, 0.01, M.emissive('#4ba3ff', 0.8), { parent: scr, pos: [0, 0, 0.026] });
    cyl(0.02, 0.02, 0.35, M.steel(), { parent: root, pos: [0.85, 1.45, 0.3], rot: [0, 0, Math.PI / 2] });

    /* 四个导轮 */
    const gt = grooveTex(); gt.repeat.set(1, 1);
    const rollerMat = new THREE.MeshStandardMaterial({ map: gt, roughness: 0.55, metalness: 0.0 });
    const rollers = [];
    [[-RX, WY - RR], [RX, WY - RR], [-RX, 0.86], [RX, 0.86]].forEach(([x, y]) => {
      const r = cyl(RR, RR, 0.82, rollerMat, { parent: root, pos: [x, y, 0], rot: [Math.PI / 2, 0, 0], seg: 64 });
      cyl(RR * 0.7, RR * 0.7, 0.06, M.steel(), { parent: root, pos: [x, y, -0.44], rot: [Math.PI / 2, 0, 0] });
      cyl(0.045, 0.045, 0.32, M.chrome(), { parent: root, pos: [x, y, -0.58], rot: [Math.PI / 2, 0, 0] });
      rollers.push(r);
    });

    /* 线网:N+1 根钢线,上层水平段 + 两侧竖直段 + 下层回线 */
    const wireMat = M.chrome({ color: '#d8dde2', roughness: 0.25 });
    const wGeo = new THREE.CylinderGeometry(0.0009, 0.0009, 1, 5);
    const zs = Array.from({ length: N + 1 }, (_, i) => -LEN / 2 + i * PITCH);
    const wTop = [], wSides = [], wBottom = [];
    zs.forEach((z) => {
      wTop.push(mat4([0, WY, z], [0, 0, Math.PI / 2], [1, RX * 2, 1]));
      wBottom.push(mat4([0, 0.86 - RR, z], [0, 0, Math.PI / 2], [1, RX * 2, 1]));
      for (const sx of [-1, 1]) wSides.push(mat4([sx * (RX + RR), (WY - RR + 0.86) / 2, z], [0, 0, 0], [1, WY - RR - 0.86, 1]));
    });
    const webTop = instanced(wGeo, wireMat, wTop, { parent: root, cast: false });
    instanced(wGeo, wireMat, wBottom, { parent: root, cast: false });
    instanced(wGeo, wireMat, wSides, { parent: root, cast: false });

    /* 收放线轮 */
    [[-0.45, 0.25], [0.45, 0.25]].forEach(([x, z]) => {
      const sp = new THREE.Group(); sp.position.set(x, 0.32, 0.72); root.add(sp);
      cyl(0.16, 0.16, 0.03, M.steel(), { parent: sp, pos: [0, 0, -0.12], rot: [Math.PI / 2, 0, 0] });
      cyl(0.16, 0.16, 0.03, M.steel(), { parent: sp, pos: [0, 0, 0.12], rot: [Math.PI / 2, 0, 0] });
      cyl(0.12, 0.12, 0.22, new THREE.MeshStandardMaterial({ color: '#c9cdd2', metalness: 1, roughness: 0.3, bumpMap: grooveTex(), bumpScale: 0.6 }), { parent: sp, rot: [Math.PI / 2, 0, 0] });
      rollers.push(sp);
    });

    /* 冷却液喷管 + 液帘 */
    const coolMat = new THREE.MeshPhysicalMaterial({ color: '#cfe6ff', transparent: true, opacity: 0.35, roughness: 0.05, transmission: 0.6, depthWrite: false, side: THREE.DoubleSide });
    for (const sx of [-1, 1]) {
      cyl(0.022, 0.022, 0.75, M.steel(), { parent: root, pos: [sx * 0.27, WY + 0.12, 0], rot: [Math.PI / 2, 0, 0] });
      const sheet = mesh(new THREE.PlaneGeometry(0.66, 0.11), coolMat, { parent: root, pos: [sx * 0.27, WY + 0.06, 0], rot: [0, Math.PI / 2, 0], cast: false });
      sheet.rotation.z = sx * 0.2;
    }

    /* 晶棒 + 粘接梁 + 进给台 */
    const feed = new THREE.Group(); root.add(feed);
    const solidClip = [new THREE.Plane(new THREE.Vector3(0, 1, 0), -WY)];
    const sliceClip = [new THREE.Plane(new THREE.Vector3(0, -1, 0), WY)];
    const ingotMat = M.silicon({ color: '#8b939d', roughness: 0.3, clippingPlanes: solidClip, side: THREE.DoubleSide });
    cyl(RI, RI, LEN, ingotMat, { parent: feed, rot: [Math.PI / 2, 0, 0], seg: 96 });
    // 切片(实例化):只显示线网以下部分
    const sliceMat = new THREE.MeshStandardMaterial({ color: '#9aa1aa', map: sawMarkTex(), metalness: 0.75, roughness: 0.38, clippingPlanes: sliceClip });
    const sGeo = new THREE.CylinderGeometry(RI, RI, THK, 96); sGeo.rotateX(Math.PI / 2);
    instanced(sGeo, sliceMat, zs.slice(0, N).map((z) => mat4([0, 0, z + PITCH / 2], [0, 0, 0], 1)), { parent: feed });
    // 粘接梁(树脂 / 玻璃)+ 钢托板
    box(0.1, 0.05, LEN + 0.02, new THREE.MeshPhysicalMaterial({ color: '#2c3036', roughness: 0.4 }), { parent: feed, pos: [0, RI + 0.02, 0] });
    box(0.22, 0.04, LEN + 0.12, M.steel(), { parent: feed, pos: [0, RI + 0.065, 0] });
    box(0.3, 0.06, LEN + 0.2, M.steelDark(), { parent: feed, pos: [0, RI + 0.115, 0] });
    // 进给滑台(固定在横梁上)
    box(0.36, 0.5, 0.36, paint, { parent: root, pos: [0, 2.15, -0.1] });
    box(0.2, 0.2, 0.3, paint, { parent: root, pos: [0, 2.3, -0.3] });
    const ram = cyl(0.06, 0.06, 1, M.chrome(), { parent: root });
    ram.geometry.translate(0, 0.5, 0);

    /* 切屑粒子(从切割前沿两侧喷出) */
    const debris = new Particles(root, {
      count: 300, rate: 120, intensity: 0.7, additive: false,
      spawn(p) {
        const half = Math.sqrt(Math.max(0, RI * RI - (WY - feed.position.y) ** 2));
        const sx = Math.random() < 0.5 ? -1 : 1;
        p.pos.set(sx * half, WY, (Math.random() - 0.5) * LEN);
        p.vel.set(sx * (0.2 + Math.random() * 0.3), -0.1 - Math.random() * 0.2, 0);
        p.max = 0.6 + Math.random() * 0.5; p.size = 0.006 + Math.random() * 0.006;
        p.color.setRGB(0.55, 0.58, 0.6); p.alpha = 0.8;
      },
      step(p, dt) { p.vel.y -= 2 * dt; p.pos.addScaledVector(p.vel, dt); },
    });

    /* 成品:花篮中的晶圆 + 单片晶圆 */
    const cas = new THREE.Group(); cas.position.set(1.9, 0.8, 0.1); root.add(cas);
    box(0.6, 0.8, 0.95, M.paint('#dde1e5'), { parent: root, pos: [1.9, 0.4, 0.3] });
    const casMat = M.plastic('#3a3f47', { roughness: 0.4 });
    for (const sx of [-1, 1]) box(0.02, 0.32, 0.36, casMat, { parent: cas, pos: [sx * 0.165, 0.16, 0] });
    box(0.35, 0.02, 0.36, casMat, { parent: cas, pos: [0, 0.01, 0] });
    const wMat = new THREE.MeshStandardMaterial({ color: '#a2a9b2', map: sawMarkTex(), metalness: 0.8, roughness: 0.32 });
    const cw = new THREE.CylinderGeometry(0.15, 0.15, 0.0024, 72); cw.rotateX(Math.PI / 2);
    // 300mm 晶圆在 0.36 宽花篮里(示意缩放)
    const wm = [];
    for (let i = 0; i < 25; i++) wm.push(mat4([0, 0.165, -0.15 + i * 0.0125], [0, 0, 0], [1, 1, 1]));
    instanced(cw, wMat, wm, { parent: cas });
    for (let i = 0; i <= 25; i++) for (const sx of [-1, 1]) box(0.012, 0.3, 0.003, casMat, { parent: cas, pos: [sx * 0.15, 0.15, -0.156 + i * 0.0125] });
    mesh(cw, wMat, { parent: root, pos: [1.95, 0.802, 0.55], rot: [-Math.PI / 2, 0, 0.3], scale: [0.7, 0.7, 1] });

    /* 标注 */
    label('金刚石线网<small>一根钢线绕成上千道平行线</small>', V(0.25, WY + 0.005, 0.32));
    label('导轮<small>表面精密开槽,决定线间距</small>', V(RX, WY - RR, 0.42));
    label('单晶硅棒(粘在托板上倒挂)', V(-0.05, WY + 0.25, 0.3));
    label('已切开的晶圆片', V(0.0, WY - 0.12, 0.31));
    label('冷却液喷淋', V(-0.27, WY + 0.14, 0.38));
    label('收放线轮', V(-0.45, 0.48, 0.85));
    label('切下的晶圆<small>厚 ~775μm,表面带锯痕</small>', V(1.9, 1.15, 0.1));
    const prog = label('', V(0.2, WY + 0.48, 0.2), null, { cls: 'big' });

    return {
      update(t, dt) {
        const k = (t % CYCLE) / CYCLE;
        const g = smooth(0.05, 0.9, k);
        const top = WY + RI + 0.02, bottom = WY - RI - 0.03;
        feed.position.y = lerp(top, bottom, g) - (k > 0.95 ? (k - 0.95) * 0 : 0);
        ram.position.y = feed.position.y + RI + 0.14; ram.scale.y = 2.15 - 0.25 - ram.position.y;
        rollers.forEach((r, i) => { if (i < 4) r.rotation.y += dt * 8; else r.rotation.z += dt * 3; });
        gt.offset.y += dt * 0.5;
        const cutting = feed.position.y < WY + RI && feed.position.y > WY - RI;
        debris.rate = cutting ? 120 : 0;
        debris.update(dt);
        const depth = Math.max(0, Math.min(2 * RI, WY + RI - feed.position.y));
        prog.element.querySelector('.txt').innerHTML = `切割深度 ${Math.round(depth * 1000)} / 300 mm`;
      },
    };
  },
};

/* A3 西门子法:钟罩式还原炉(剖视)+ 精馏塔 + 多晶硅棒截面 */
import * as THREE from 'three';
import { M } from '../lib/materials.js';
import { mesh, cyl, box, lathe, shell, pipe, lights, glowLight, V, Particles, instanced, mat4, flange, sphere, smooth } from '../lib/kit.js';
import { canvas, rng, noiseTex, raisedFloorTex, dotTex } from '../lib/textures.js';
import { displace } from '../lib/noise.js';

const R = 1.3, BASE = 0.42, ROD_TOP = 2.55, CYCLE = 26;

/** 多晶硅棒横截面:中心方形细硅芯 + 同心沉积生长环 */
function rodSectionTex() {
  const [c, g] = canvas(512, 512);
  const r = rng(6);
  g.fillStyle = '#7d828a'; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 60; k++) {
    const rad = 250 - k * 4;
    const v = 105 + r() * 35;
    g.strokeStyle = `rgb(${v},${v + 2},${v + 6})`;
    g.lineWidth = 2 + r() * 2;
    g.beginPath(); g.arc(256, 256, rad, 0, Math.PI * 2); g.stroke();
  }
  g.fillStyle = '#9aa1ab'; g.fillRect(256 - 14, 256 - 14, 28, 28);
  g.strokeStyle = '#55595f'; g.lineWidth = 2; g.strokeRect(256 - 14, 256 - 14, 28, 28);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export default {
  bg: ['#141a26', '#05070b'],
  env: 0.7,
  exposure: 1.0,
  bloom: { strength: 0.6, radius: 0.5, threshold: 0.8 },
  zoom: [1, 40],
  views: [
    { name: '还原炉剖视', pos: [5.6, 4.2, 6.4], target: [0, 1.6, 0] },
    { name: '硅棒特写', pos: [2.4, 2.9, 3.0], target: [0.1, 2.0, 0] },
    { name: '硅棒截面', pos: [3.4, 1.15, 1.85], target: [2.72, 0.93, 1.58] },
    { name: '精馏塔区', pos: [6, 7.5, 13], target: [-5, 4.5, -3] },
  ],
  build({ root, label }) {
    lights(root, { key: 1.6, keyPos: [6, 12, 8], hemi: 0.3, shadow: 9, rim: 0.7 });
    const rand = rng(3);

    /* 地面:厂房钢格板 / 环氧地坪 */
    mesh(new THREE.PlaneGeometry(50, 50), new THREE.MeshStandardMaterial({ color: '#5e646c', roughness: 0.55, metalness: 0.1, map: noiseTex({ seed: 2, base: 170, amp: 25, srgb: true, repeat: [6, 6] }) }),
      { rot: [-Math.PI / 2, 0, 0], parent: root, cast: false });

    /* 底盘:厚法兰 + 电极 + 进气喷嘴 */
    const steel = M.steel();
    cyl(R + 0.25, R + 0.25, 0.14, steel, { parent: root, pos: [0, BASE - 0.07, 0], seg: 96 });
    cyl(R + 0.12, R + 0.2, BASE - 0.14, M.steelDark(), { parent: root, pos: [0, (BASE - 0.14) / 2, 0], seg: 64 });
    flange(R + 0.19, steel, { parent: root, pos: [0, BASE + 0.005, 0], bolts: 48, t: 0.02 });
    // 支腿与下方管线
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + Math.PI / 4;
      cyl(0.06, 0.06, 0.3, M.steelDark(), { parent: root, pos: [Math.cos(a) * 1.2, 0.15, Math.sin(a) * 1.2] });
    }

    /* 硅棒(18 对倒 U 形)*/
    const rodMat = M.hot('#ffa24e', 1.7, { color: '#3a2a1a', roughness: 0.55, emissiveMap: noiseTex({ seed: 44, base: 205, amp: 45, blobs: 2500, scale: 0.25, srgb: true, repeat: [1, 6] }) });
    const rodGeo = new THREE.CylinderGeometry(1, 1, 1, 24);
    const bridgeGeo = new THREE.CylinderGeometry(1, 1, 1, 24); bridgeGeo.rotateZ(Math.PI / 2);
    const jointGeo = new THREE.SphereGeometry(1, 20, 12);
    const chuckMat = M.graphite({ color: '#2d2e31' });
    const elecMat = M.chrome({ color: '#d7dbe0' });
    const pairs = [];
    const ring = (n, rr, ph) => Array.from({ length: n }, (_, i) => (i / n) * Math.PI * 2 + ph).map((a) => [rr, a]);
    const spots = [...ring(6, 0.5, 0), ...ring(12, 1.0, 0.26)];
    spots.forEach(([rr, a]) => {
      const g = new THREE.Group();
      g.position.set(Math.cos(a) * rr, 0, Math.sin(a) * rr);
      g.rotation.y = -a; // 局部 x 轴沿切向
      g.rotateY(Math.PI / 2);
      root.add(g);
      const half = rr < 0.7 ? 0.13 : 0.15;
      const h = ROD_TOP - BASE - 0.12;
      const rods = [-half, half].map((x) => {
        const m = mesh(rodGeo, rodMat, { parent: g, pos: [x, BASE + 0.12 + h / 2, 0], scale: [0.01, h, 0.01] });
        // 石墨夹头 + 水冷电极
        cyl(0.025, 0.035, 0.1, chuckMat, { parent: g, pos: [x, BASE + 0.07, 0], seg: 16 });
        cyl(0.03, 0.03, 0.04, elecMat, { parent: g, pos: [x, BASE + 0.02, 0], seg: 16 });
        return m;
      });
      const bridge = mesh(bridgeGeo, rodMat, { parent: g, pos: [0, ROD_TOP, 0], scale: [half * 2, 0.01, 0.01] });
      const joints = [-half, half].map((x) => mesh(jointGeo, rodMat, { parent: g, pos: [x, ROD_TOP, 0], scale: 0.01 }));
      pairs.push({ rods, bridge, joints, h });
    });
    // 中心进气喷嘴
    const nozzles = [V(0, 0, 0), ...ring(6, 0.78, 0.5).map(([rr, a]) => V(Math.cos(a) * rr, 0, Math.sin(a) * rr))];
    nozzles.forEach((p) => {
      cyl(0.022, 0.03, 0.12, M.steel(), { parent: root, pos: [p.x, BASE + 0.06, p.z], seg: 16 });
    });

    /* 钟罩(双层水冷壁,内壁镜面抛光以反射热辐射)— 剖去前方 1/4 */
    const cut = { phi0: Math.PI / 2, phiLen: Math.PI * 1.5 };
    const prof = [[R + 0.09, BASE + 0.02], [R + 0.09, 2.85]];
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * Math.PI / 2;
      prof.push([Math.max(0.001, (R + 0.09) * Math.cos(a)), 2.85 + Math.sin(a) * 0.95]);
    }
    const outer = shell(prof, 0.09, M.steel({ rep: [3, 3] }), { ...cut, parent: root, capMat: M.steelDark({ color: '#8b9097' }) });
    // 内壁镜面层
    const innerProf = prof.map(([r, y]) => [Math.max(0.001, r - 0.091), y]);
    lathe(innerProf, M.chrome({ color: '#aeb3ba', roughness: 0.18 }), { ...cut, parent: root }).material.side = THREE.BackSide;
    // 罩体底部法兰
    mesh(new THREE.TorusGeometry(R + 0.13, 0.05, 10, 96, Math.PI * 1.5), steel, { parent: root, pos: [0, BASE + 0.05, 0], rot: [Math.PI / 2, 0, Math.PI / 2] });
    // 冷却水环管与观察窗
    for (const y of [0.95, 1.75, 2.55]) mesh(new THREE.TorusGeometry(R + 0.14, 0.025, 8, 96, Math.PI * 1.5), M.steel(), { parent: root, pos: [0, y, 0], rot: [Math.PI / 2, 0, Math.PI / 2] });
    const portA = Math.PI * 1.15;
    const port = new THREE.Group();
    port.position.set(Math.sin(portA) * (R + 0.09), 2.2, Math.cos(portA) * (R + 0.09));
    port.lookAt(port.position.clone().multiplyScalar(2).setY(2.2));
    root.add(port);
    cyl(0.12, 0.12, 0.22, steel, { parent: port, rot: [Math.PI / 2, 0, 0], pos: [0, 0, 0.1] });
    mesh(new THREE.CircleGeometry(0.09, 32), M.emissive('#ffae4a', 3), { parent: port, pos: [0, 0, 0.215] });
    flange(0.13, steel, { parent: port, pos: [0, 0, 0.2], rot: [Math.PI / 2, 0, 0], bolts: 8, t: 0.015 });
    // 顶部吊耳与排气口
    cyl(0.12, 0.12, 0.25, steel, { parent: root, pos: [0, 2.85 + 0.95 + 0.1, 0] });
    pipe([[0, 3.95, 0], [0, 4.3, 0], [-1.2, 4.3, -0.6], [-1.2, 4.3, -3]], 0.07, M.steel(), { parent: root });

    /* 炉内光照(炽热硅棒的辐射)*/
    const glow = glowLight(root, '#ffa04a', 5, [0, 1.6, 0], 6);
    const glow2 = glowLight(root, '#ffa04a', 3, [1.6, 1.4, 1.6], 4);

    /* 混合气体(SiHCl₃ + H₂)上升粒子 */
    const gas = new Particles(root, {
      count: 260, rate: 70, intensity: 0.45,
      spawn(p) {
        const n = nozzles[(Math.random() * nozzles.length) | 0];
        p.pos.set(n.x, BASE + 0.13, n.z);
        p.vel.set((Math.random() - 0.5) * 0.2, 0.35 + Math.random() * 0.3, (Math.random() - 0.5) * 0.2);
        p.max = 3 + Math.random() * 2; p.size = 0.025 + Math.random() * 0.025;
        p.color.setRGB(0.5, 0.75, 1); p.alpha = 0.6;
      },
      step(p, dt) {
        p.pos.addScaledVector(p.vel, dt);
        // 在罩体内回流
        const rr = Math.hypot(p.pos.x, p.pos.z);
        if (rr > R - 0.1) { p.vel.x *= -1; p.vel.z *= -1; }
        if (p.pos.y > 3.4) p.vel.y = -0.2;
        p.vel.x += (Math.random() - 0.5) * dt * 0.3; p.vel.z += (Math.random() - 0.5) * dt * 0.3;
      },
    });

    /* 多晶硅棒截面样品 */
    const table = new THREE.Group(); table.position.set(2.6, 0, 1.6); root.add(table);
    box(0.9, 0.04, 0.6, M.plastic('#1d1f23', { roughness: 0.35 }), { parent: table, pos: [0, 0.8, 0] });
    for (const [x, z] of [[-0.4, -0.25], [0.4, -0.25], [-0.4, 0.25], [0.4, 0.25]]) cyl(0.02, 0.02, 0.8, M.steel(), { parent: table, pos: [x, 0.4, z], seg: 12 });
    const chunkGeo = displace(new THREE.CylinderGeometry(0.1, 0.1, 0.34, 64, 24, true), 0.006, 60, 3, 4);
    const polyMat = new THREE.MeshStandardMaterial({ color: '#8d939b', metalness: 0.75, roughness: 0.42, bumpMap: noiseTex({ seed: 31, blobs: 3000, scale: 0.2 }), bumpScale: 1.5 });
    const chunk = mesh(chunkGeo, polyMat, { parent: table, pos: [0.05, 0.92, 0], rot: [0, 0.3, Math.PI / 2] });
    const secMat = new THREE.MeshStandardMaterial({ map: rodSectionTex(), metalness: 0.5, roughness: 0.35 });
    for (const s of [-1, 1]) {
      const cap = mesh(new THREE.CircleGeometry(0.1, 64), secMat, { parent: chunk, pos: [0, s * 0.17, 0], rot: [s * -Math.PI / 2, 0, 0] });
    }
    // 第二块:破碎后的多晶硅块料
    const lumpG = displace(new THREE.IcosahedronGeometry(0.05, 2), 0.015, 25, 3, 7);
    for (let i = 0; i < 7; i++) mesh(lumpG, polyMat, { parent: table, pos: [-0.25 + (rand() - 0.5) * 0.25, 0.85, (rand() - 0.5) * 0.35], rot: [rand() * 6, rand() * 6, rand() * 6], scale: 0.6 + rand() * 0.6 });

    /* 背景:精馏塔 ×2 + 管廊 */
    const clad = new THREE.MeshStandardMaterial({ color: '#c3c8cd', metalness: 0.85, roughness: 0.35, roughnessMap: noiseTex({ seed: 9, repeat: [2, 8] }) });
    const grate = M.paint('#d4a72c', { roughness: 0.6 });
    [[-5.2, -3.4, 0.62, 13], [-7.4, -1.2, 0.5, 10.5]].forEach(([x, z, r, h]) => {
      const col = new THREE.Group(); col.position.set(x, 0, z); root.add(col);
      lathe([[0.001, 0], [r + 0.15, 0], [r + 0.15, 0.6], [r, 0.7], [r, h], [r * 0.6, h + r * 0.45], [0.12, h + r * 0.55], [0.001, h + r * 0.55]], clad, { parent: col });
      for (let y = 1.2; y < h; y += 0.9) mesh(new THREE.TorusGeometry(r + 0.005, 0.012, 6, 64), M.steelDark(), { parent: col, pos: [0, y, 0], rot: [Math.PI / 2, 0, 0] });
      // 平台(环形格栅 + 护栏)
      for (let y = 3; y < h; y += 3) {
        mesh(new THREE.RingGeometry(r, r + 0.75, 48, 1, 0, Math.PI * 1.4), grate, { parent: col, pos: [0, y, 0], rot: [-Math.PI / 2, 0, 0.6] });
        mesh(new THREE.TorusGeometry(r + 0.73, 0.02, 6, 48, Math.PI * 1.4), grate, { parent: col, pos: [0, y + 0.55, 0], rot: [Math.PI / 2, 0, -0.6] });
        for (let k = 0; k <= 8; k++) {
          const a = -0.6 - (k / 8) * Math.PI * 1.4;
          cyl(0.015, 0.015, 0.55, grate, { parent: col, pos: [Math.cos(a) * (r + 0.73), y + 0.27, -Math.sin(a) * (r + 0.73)], seg: 6 });
        }
      }
      // 爬梯
      for (let y = 0.3; y < h - 0.4; y += 0.3) box(0.4, 0.02, 0.02, M.steelDark(), { parent: col, pos: [0, y, r + 0.22] });
      for (const sx of [-0.2, 0.2]) box(0.03, h - 0.4, 0.03, M.steelDark(), { parent: col, pos: [sx, h / 2, r + 0.22] });
      // 塔顶冷凝管
      pipe([[0, h + r * 0.55, 0], [0, h + r * 0.55 + 0.6, 0], [1.6, h + r * 0.55 + 0.6, 0], [1.6, h - 2, 0]], 0.09, clad, { parent: col });
    });
    // 管廊 → 还原炉进料
    pipe([[-4.5, 1.6, -3.4], [-2.4, 1.6, -3.4], [-2.4, 0.25, -1.6], [-0.2, 0.25, -0.3], [-0.2, 0.25, 0]], 0.06, M.steel(), { parent: root });
    pipe([[-6.8, 2.2, -1.2], [-3, 2.2, -1.2], [-1.6, 0.18, -0.4], [0, 0.18, -0.4]], 0.05, M.steel(), { parent: root });
    // 母线电缆
    for (let k = 0; k < 4; k++) pipe([[0.5 - k * 0.15, 0.1, 0.5], [0.5 - k * 0.15, 0.08, 3.5], [3.5, 0.08, 4.5]], 0.035, M.copper(), { parent: root, bend: 0.4 });

    /* 标注 */
    label('U 形多晶硅棒 ×18 对<small>通电自加热至 ≈1100°C</small>', V(0.15, 2.65, 0.95), null, { cls: 'hot' });
    const prog = label('', V(-0.3, 3.2, 1.1), null, { cls: 'big' });
    label('钟罩(双层水冷)<small>内壁镜面抛光反射热辐射</small>', V(-1.1, 3.4, -0.6));
    label('底盘:电极 + 进气喷嘴', V(0.9, BASE + 0.05, 0.6));
    label('SiHCl₃ + H₂ 混合气', V(-0.4, 1.0, 0.35));
    label('观察窗', port.position.clone().add(V(-0.1, 0.15, 0)));
    label('多晶硅棒截面<small>中心为方形细硅芯,外层为同心沉积层</small>', V(2.65, 1.05, 1.6));
    label('破碎后的多晶硅块料', V(2.35, 0.92, 1.55));
    label('精馏塔<small>反复蒸馏 SiHCl₃,除去 B、P、金属</small>', V(-5.2, 9, -3.4));
    label('SiHCl₃ 进料管', V(-2.4, 1.0, -2.6));

    return {
      update(t, dt) {
        const k = (t % CYCLE) / CYCLE;
        const g = smooth(0.0, 0.92, k);
        const r = 0.006 + g * 0.068; // 8mm 细硅芯 → ~150mm 成品棒(比例示意)
        pairs.forEach(({ rods, bridge, joints }) => {
          rods.forEach((m) => { m.scale.x = m.scale.z = r; });
          bridge.scale.y = bridge.scale.z = r;
          joints.forEach((j) => j.scale.setScalar(r));
        });
        const cool = smooth(0.93, 1.0, k);
        rodMat.emissiveIntensity = 1.7 * (1 - cool) + 0.01;
        glow.intensity = 5 * (1 - cool * 0.95) * (0.97 + Math.random() * 0.03);
        glow2.intensity = 3 * (1 - cool * 0.95);
        const day = (g * 6.5).toFixed(1);
        prog.element.querySelector('.txt').innerHTML = cool > 0.5 ? '沉积完成 · 断电冷却' : `沉积第 ${day} 天 · 棒径 ≈ ${Math.round(8 + g * 142)} mm`;
        gas.rate = cool > 0.2 ? 0 : 70;
        gas.update(dt);
      },
    };
  },
};

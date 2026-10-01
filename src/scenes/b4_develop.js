/* B4 显影:扫描式狭缝喷嘴铺显影液 → 静置显影 → 去离子水冲洗 → 甩干;微观:曝光区光刻胶溶解,留下带驻波纹的胶线 */
import * as THREE from 'three';
import { M } from '../lib/materials.js';
import { mesh, cyl, box, rbox, shell, lights, V, Particles, smooth, lerp } from '../lib/kit.js';
import { cleanroom, waferGeometry } from '../lib/fab.js';
import { dieGridTex } from '../lib/textures.js';

const WY = 1.0, CYCLE = 16;
const LW = 0.032, LH = 0.075, PITCH = 0.064, NL = 7, DEPTH = 0.34;

/** 胶线截面:侧壁带驻波纹(周期 = λ / 2n ≈ 193nm / (2×1.7))+ 轻微底脚 */
function resistLineGeo() {
  const sh = new THREE.Shape();
  const waves = 5, amp = 0.0022, N = 60;
  const xAt = (y) => LW / 2 + amp * Math.sin((y / LH) * waves * Math.PI * 2) + Math.max(0, 0.004 - y) * 0.8;
  sh.moveTo(-xAt(0), 0);
  sh.lineTo(xAt(0), 0);
  for (let i = 1; i <= N; i++) { const y = (i / N) * LH; sh.lineTo(xAt(y), y); }
  for (let i = N; i >= 0; i--) { const y = (i / N) * LH; sh.lineTo(-xAt(y) * 0.995, y); }
  const g = new THREE.ExtrudeGeometry(sh, { depth: DEPTH, bevelEnabled: false, curveSegments: 4 });
  g.translate(0, 0, -DEPTH / 2);
  return g;
}

export default {
  bg: ['#8f8770', '#4d4838'],
  env: 0.55,
  exposure: 0.9,
  bloom: { strength: 0.3, threshold: 1.8 },
  zoom: [0.12, 15],
  views: [
    { name: '显影模块', pos: [0.95, 1.55, 1.15], target: [0.05, 1.0, 0] },
    { name: '狭缝喷嘴', pos: [0.32, 1.22, 0.4], target: [0, 1.0, 0] },
    { name: '胶线显形(微观)', pos: [-0.35, 1.32, 0.72], target: [-0.75, 1.07, 0.15] },
    { name: '驻波纹特写', pos: [-0.62, 1.12, 0.36], target: [-0.73, 1.06, 0.15] },
  ],
  build({ root, label }) {
    lights(root, { key: 1.1, keyColor: '#ffd98a', keyPos: [2, 6, 3], hemi: 0.4, sky: '#ffe2a0', ground: '#4a4130', shadow: 2.5, rim: 0.5, rimColor: '#ffcc66' });
    cleanroom(root, { yellow: true, rows: [[-4.2, 0], [4.2, Math.PI]] });

    const paint = M.paint('#d6cfb8');
    rbox(2.1, 0.9, 1.0, 0.02, paint, { parent: root, pos: [-0.2, 0.45, -0.05] });
    box(2.1, 0.03, 1.0, M.plastic('#8c9096', { roughness: 0.5 }), { parent: root, pos: [-0.2, 0.915, -0.05] });
    rbox(2.1, 0.9, 0.12, 0.02, paint, { parent: root, pos: [-0.2, 1.38, -0.5] });

    /* 显影杯 + 吸盘 + 晶圆 */
    const cut = { phi0: Math.PI / 2, phiLen: Math.PI * 1.5 };
    shell([[0.22, 0.93], [0.24, 1.02], [0.235, 1.07], [0.19, 1.1]], 0.012, M.plastic('#e8e4da', { roughness: 0.3 }), { ...cut, parent: root, capMat: M.matte('#cfc9bb') });
    cyl(0.05, 0.05, 0.03, M.plastic('#2b2f35'), { parent: root, pos: [0, WY - 0.02, 0] });
    const spin = new THREE.Group(); spin.position.y = WY; root.add(spin);
    // 显影后的晶圆:曝光场图形显现(胶面呈现规则的芯片阵列)
    const wTex = dieGridTex({ size: 1024, n: 12, base: '#8a5a3a', colorful: false });
    wTex.repeat.set(1 / 0.3, 1 / 0.3); wTex.offset.set(0.5, 0.5);
    const waferMat = new THREE.MeshPhysicalMaterial({ color: '#c08050', map: wTex, metalness: 0.5, roughness: 0.12, clearcoat: 1, iridescence: 0.8, iridescenceIOR: 1.65, iridescenceThicknessRange: [420, 420] });
    mesh(waferGeometry(), waferMat, { parent: spin });
    // 显影液水坑(凸起的液膜)
    const puddleMat = new THREE.MeshPhysicalMaterial({ color: '#cfe8ff', transparent: true, opacity: 0.35, roughness: 0.02, transmission: 0.7, thickness: 0.003, ior: 1.33, clearcoat: 1, depthWrite: false });
    const pg = new THREE.SphereGeometry(1, 64, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const puddle = mesh(pg, puddleMat, { parent: root, pos: [0, WY + 0.0005, 0], scale: [0.149, 0.004, 0.149], cast: false });

    /* E2 狭缝扫描喷嘴(横跨整片晶圆) */
    const gantry = new THREE.Group(); root.add(gantry);
    box(0.36, 0.03, 0.04, M.steel(), { parent: gantry, pos: [0, WY + 0.05, 0] });
    box(0.34, 0.012, 0.012, M.plastic('#2b2f35'), { parent: gantry, pos: [0, WY + 0.03, 0] });
    for (const sx of [-1, 1]) box(0.03, 0.16, 0.04, M.steel(), { parent: gantry, pos: [sx * 0.19, WY + 0.11, 0] });
    for (const sx of [-1, 1]) box(0.03, 0.03, 0.9, M.steel(), { parent: root, pos: [sx * 0.19, WY + 0.2, 0] });
    const curtain = mesh(new THREE.PlaneGeometry(0.33, 0.024), new THREE.MeshPhysicalMaterial({ color: '#cfe8ff', transparent: true, opacity: 0.45, roughness: 0.02, depthWrite: false, side: THREE.DoubleSide }), { parent: gantry, pos: [0, WY + 0.012, 0], cast: false });
    // 冲洗喷嘴
    const rinseArm = new THREE.Group(); rinseArm.position.set(0.32, WY + 0.12, -0.2); root.add(rinseArm);
    box(0.36, 0.015, 0.02, M.steel(), { parent: rinseArm, pos: [-0.18, 0, 0] });
    cyl(0.005, 0.005, 0.04, M.plastic('#f2f2f2'), { parent: rinseArm, pos: [-0.36, -0.02, 0] });
    const rinse = new Particles(root, {
      count: 200, rate: 0, intensity: 0.8,
      spawn(p) {
        const n = new THREE.Vector3(); rinseArm.localToWorld(n.set(-0.36, -0.04, 0));
        p.pos.copy(n); p.vel.set((Math.random() - 0.5) * 0.02, -0.6, (Math.random() - 0.5) * 0.02);
        p.max = 0.25; p.size = 0.005; p.color.setRGB(0.75, 0.9, 1); p.alpha = 0.8;
      },
      step(p, dt) { p.pos.addScaledVector(p.vel, dt); if (p.pos.y < WY + 0.002) { const a = Math.random() * 6.28; p.vel.set(Math.cos(a) * 0.5, 0.02, Math.sin(a) * 0.5); } },
    });

    /* 微观:胶线显影模型 */
    const mic = new THREE.Group(); mic.position.set(-0.75, 0.93, 0.15); root.add(mic);
    cyl(0.3, 0.33, 0.04, M.plastic('#2a2620', { roughness: 0.3 }), { parent: mic, pos: [0, 0.02, 0], seg: 64 });
    mesh(new THREE.TorusGeometry(0.31, 0.004, 8, 96), M.emissive('#ffcc55', 1.6), { parent: mic, pos: [0, 0.042, 0], rot: [Math.PI / 2, 0, 0], cast: false });
    const W = NL * PITCH + 0.03;
    const blk = new THREE.Group(); blk.position.y = 0.04; mic.add(blk);
    box(W, 0.07, DEPTH, new THREE.MeshStandardMaterial({ color: '#59616d', metalness: 0.6, roughness: 0.4 }), { parent: blk, pos: [0, 0.035, 0] });
    box(W, 0.02, DEPTH, new THREE.MeshPhysicalMaterial({ color: '#9fd6e6', transparent: true, opacity: 0.7, roughness: 0.1, transmission: 0.3 }), { parent: blk, pos: [0, 0.08, 0] });
    const resistMat = new THREE.MeshPhysicalMaterial({ color: '#d0782c', roughness: 0.35, clearcoat: 0.6, transparent: true, opacity: 0.92 });
    const exposedMat = new THREE.MeshPhysicalMaterial({ color: '#b56a8c', roughness: 0.6, transparent: true, opacity: 0.85 });
    const lineGeo = resistLineGeo();
    const exposed = [];
    for (let i = 0; i < NL; i++) {
      const x = -W / 2 + 0.015 + LW / 2 + i * PITCH;
      mesh(lineGeo, resistMat, { parent: blk, pos: [x, 0.09, 0] });
      if (i < NL - 1) {
        const e = box(PITCH - LW, 1, DEPTH, exposedMat, { parent: blk, pos: [x + PITCH / 2, 0.09, 0] });
        exposed.push(e);
      }
    }
    const devLayer = box(W, 1, DEPTH, new THREE.MeshPhysicalMaterial({ color: '#bfe2ff', transparent: true, opacity: 0.25, roughness: 0.05, depthWrite: false }), { parent: blk, cast: false });

    label('显影杯', V(-0.12, 1.07, 0.18));
    label('E2 狭缝扫描喷嘴<small>一次扫过即铺满显影液</small>', V(0, WY + 0.17, 0.0));
    label('显影液水坑(静置 30~60 s)', V(0.08, WY + 0.01, 0.06));
    label('去离子水冲洗喷嘴', V(0.0, WY + 0.15, -0.2));
    label('未曝光胶线(保留)<small>侧壁可见驻波纹</small>', V(-0.75 - 0.03, 0.93 + 0.13 + 0.04, 0.15 + DEPTH / 2));
    label('曝光区(溶解)', V(-0.75 + 0.065, 0.93 + 0.11, 0.15 + DEPTH / 2));
    label('SiO₂ / Si 衬底', V(-0.75 + 0.22, 0.93 + 0.08, 0.15 + DEPTH / 2));
    const st = label('', V(0, 1.32, 0), null, { cls: 'big' });

    return {
      update(t, dt) {
        const k = (t % CYCLE) / CYCLE;
        // 喷嘴 0.05~0.2 扫过晶圆
        const scan = smooth(0.05, 0.2, k);
        gantry.position.z = lerp(-0.4, 0.4, scan);
        if (k > 0.25) gantry.position.z = lerp(0.4, -0.4, smooth(0.8, 0.95, k));
        curtain.visible = k > 0.05 && k < 0.2;
        // 水坑随喷嘴铺开
        const pud = k < 0.2 ? scan : 1 - smooth(0.55, 0.65, k);
        puddle.visible = pud > 0.01;
        puddle.scale.set(0.149, 0.004 * pud, 0.149 * Math.max(0.01, pud));
        puddle.position.z = k < 0.2 ? -0.149 * (1 - pud) : 0;
        // 冲洗与甩干
        const rinsing = k > 0.55 && k < 0.72;
        rinseArm.rotation.y = lerp(-0.6, 0.56, smooth(0.5, 0.55, k) * (1 - smooth(0.72, 0.77, k)));
        rinse.rate = rinsing ? 200 : 0; rinse.update(dt);
        const rpm = k < 0.5 ? 0 : k < 0.72 ? 800 : k < 0.92 ? 3000 : 0;
        spin.rotation.y += rpm / 60 * dt * 0.25;
        // 微观溶解:显影液渗入后曝光区从上往下溶解
        const dis = smooth(0.2, 0.52, k);
        exposed.forEach((e, i) => {
          const h = LH * (1 - smooth(0, 1, dis * 1.15 - i * 0.02));
          e.scale.y = Math.max(0.0001, h); e.position.y = 0.09 + h / 2; e.visible = h > 0.0005;
        });
        devLayer.visible = k > 0.15 && k < 0.6;
        devLayer.scale.y = 0.09; devLayer.position.y = 0.09 + 0.045;
        const phase = k < 0.05 ? '后烘(PEB)完成,进入显影' : k < 0.2 ? '狭缝喷嘴铺显影液' : k < 0.52 ? `静置显影 · TMAH 2.38% · ${Math.round(dis * 100)}%` : k < 0.72 ? '去离子水冲洗' : k < 0.92 ? '高速甩干' : '显影完成 · 送检';
        st.element.querySelector('.txt').innerHTML = phase;
      },
    };
  },
};

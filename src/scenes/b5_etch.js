/* B5 等离子刻蚀:ICP 腔体剖视(射频线圈 / 陶瓷窗 / 等离子辉光 / 静电吸盘 / 分子泵)+ 微观沟槽各向异性刻蚀 */
import * as THREE from 'three';
import { M } from '../lib/materials.js';
import { mesh, cyl, box, rbox, lathe, shell, pipe, lights, glowLight, V, Particles, flange, smooth, lerp } from '../lib/kit.js';
import { cleanroom, waferGeometry } from '../lib/fab.js';
import { noiseTex } from '../lib/textures.js';

const WY = 1.05, CYCLE = 18;
const NT = 6, TP = 0.07, TW = 0.03, BD = 0.3; // 沟槽数、间距、宽度、深度方向长度

export default {
  bg: ['#9aa3ad', '#5d656f'],
  env: 0.55,
  exposure: 0.85,
  bloom: { strength: 0.45, radius: 0.5, threshold: 1.3 },
  zoom: [0.12, 15],
  views: [
    { name: 'ICP 刻蚀腔', pos: [1.35, 1.75, 1.6], target: [0, 1.2, 0] },
    { name: '等离子体', pos: [0.45, 1.3, 0.55], target: [0, 1.15, 0] },
    { name: '沟槽刻蚀(微观)', pos: [1.55, 1.3, 1.05], target: [1.2, 1.06, 0.35] },
  ],
  build({ root, label }) {
    lights(root, { key: 1.1, keyPos: [3, 7, 4], hemi: 0.45, shadow: 3, rim: 0.5, sky: '#ffffff', ground: '#8a9099' });
    cleanroom(root, { rows: [[-4.2, 0]] });
    const cut = { phi0: Math.PI / 2, phiLen: Math.PI * 1.5 };
    const alu = M.alu({ color: '#7f858c', roughness: 0.45 });

    /* 机架 */
    rbox(1.1, 0.75, 1.1, 0.02, M.paint('#d4d8dd'), { parent: root, pos: [0, 0.375, -0.1] });
    // 分子泵 + 闸板阀
    cyl(0.12, 0.12, 0.3, M.steel(), { parent: root, pos: [0, 0.6, 0] });
    cyl(0.16, 0.16, 0.05, M.steel(), { parent: root, pos: [0, 0.77, 0] });

    /* 腔体(阳极氧化铝,剖视) */
    shell([[0.36, 0.8], [0.36, 1.32]], 0.04, alu, { ...cut, parent: root, capMat: M.alu({ color: '#9da2a8' }) });
    lathe([[0.12, 0.8], [0.36, 0.8], [0.36, 0.84], [0.12, 0.84]], alu, { ...cut, parent: root });
    flange(0.38, M.steel(), { cut: true, parent: root, pos: [0, 1.32, 0], bolts: 24, t: 0.012 });
    // 陶瓷介质窗(Al₂O₃)
    lathe([[0.001, 1.32], [0.37, 1.32], [0.37, 1.36], [0.001, 1.36]], new THREE.MeshStandardMaterial({ color: '#efe9de', roughness: 0.5 }), { ...cut, parent: root });
    // 射频平面线圈(铜)
    const coilPts = [];
    for (let a = 0; a < Math.PI * 2 * 3.2; a += 0.08) { const r = 0.07 + (a / (Math.PI * 2)) * 0.07; coilPts.push(V(Math.cos(a) * r, 1.385, Math.sin(a) * r)); }
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coilPts), 400, 0.009, 8), M.copper({ roughness: 0.25 }), { parent: root });
    // 匹配器盒 + 射频电缆
    rbox(0.32, 0.18, 0.26, 0.01, M.paint('#d0d4d9'), { parent: root, pos: [0, 1.55, -0.12] });
    pipe([[0.12, 1.39, 0], [0.12, 1.46, -0.05]], 0.01, M.copper(), { parent: root });
    pipe([[0.16, 1.55, -0.25], [0.5, 1.55, -0.5], [0.5, 0.4, -0.6]], 0.02, M.plastic('#1e2126'), { parent: root });
    // 进气管
    pipe([[-0.36, 1.25, -0.1], [-0.55, 1.25, -0.1], [-0.55, 0.75, -0.4]], 0.012, M.steel(), { parent: root });

    /* 静电吸盘 + 晶圆 + 聚焦环 */
    cyl(0.17, 0.17, 0.2, alu, { parent: root, pos: [0, WY - 0.11, 0], seg: 64 });
    cyl(0.155, 0.155, 0.012, M.plastic('#e8e2d4', { roughness: 0.4 }), { parent: root, pos: [0, WY - 0.006, 0], seg: 64 });
    lathe([[0.15, WY - 0.012], [0.19, WY - 0.012], [0.19, WY + 0.004], [0.15, WY + 0.004]], new THREE.MeshStandardMaterial({ color: '#8b8f94', roughness: 0.6 }), { parent: root }); // 硅聚焦环
    mesh(waferGeometry(), new THREE.MeshPhysicalMaterial({ color: '#7b5a86', metalness: 0.6, roughness: 0.1, iridescence: 1, iridescenceIOR: 1.6, iridescenceThicknessRange: [300, 300] }), { parent: root, pos: [0, WY + 0.001, 0] });

    /* 等离子体辉光:多层加色体积 + 底部鞘层暗区 */
    const nt = noiseTex({ seed: 70, base: 160, amp: 90, blobs: 900, scale: 2, repeat: [2, 1], srgb: true });
    const plasmaMats = [];
    for (let i = 0; i < 6; i++) {
      const m = M.beam('#c27bff', 0.09, { map: nt });
      plasmaMats.push(m);
      const r = 0.31 - i * 0.035;
      cyl(r, r, 0.22 - i * 0.012, m, { parent: root, pos: [0, WY + 0.15 + i * 0.008, 0], open: false, cast: false, receive: false, seg: 48 });
    }
    const pl = glowLight(root, '#b878ff', 2.5, [0, WY + 0.16, 0], 1.2);
    // 离子(在鞘层被加速,垂直撞向晶圆)
    const ions = new Particles(root, {
      count: 300, rate: 150, intensity: 2,
      spawn(p) { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * 0.14; p.pos.set(Math.cos(a) * r, WY + 0.06, Math.sin(a) * r); p.vel.set(0, -0.9, 0); p.max = 0.065; p.size = 0.006; p.color.setRGB(0.8, 0.6, 1); },
    });
    // 刻蚀产物(SiF₄ 等挥发物)被泵走
    const byp = new Particles(root, {
      count: 200, rate: 50, intensity: 0.5, additive: false,
      spawn(p) { const a = Math.random() * 6.28, r = Math.random() * 0.14; p.pos.set(Math.cos(a) * r, WY + 0.01, Math.sin(a) * r); p.vel.set(Math.cos(a) * 0.25, 0.05, Math.sin(a) * 0.25); p.max = 1.2; p.size = 0.008; p.color.setRGB(0.55, 0.6, 0.65); p.alpha = 0.6; },
      step(p, dt) { p.pos.addScaledVector(p.vel, dt); if (Math.hypot(p.pos.x, p.pos.z) > 0.25) { p.vel.set(0, -0.3, 0); } },
    });

    /* 微观:沟槽刻蚀 */
    const mic = new THREE.Group(); mic.position.set(1.2, 0.93, 0.35); root.add(mic);
    rbox(0.6, 0.93, 0.6, 0.02, M.paint('#d4d8dd'), { parent: root, pos: [1.2, 0.465, 0.35] });
    const W = NT * TP;
    const siMat = new THREE.MeshStandardMaterial({ color: '#5d6672', metalness: 0.55, roughness: 0.4 });
    const oxMat = new THREE.MeshPhysicalMaterial({ color: '#a8dcec', roughness: 0.15, transparent: true, opacity: 0.85, transmission: 0.2 });
    const prMat = new THREE.MeshPhysicalMaterial({ color: '#d0782c', roughness: 0.4, clearcoat: 0.5 });
    const polyMat = new THREE.MeshStandardMaterial({ color: '#3c3430', roughness: 0.8, transparent: true, opacity: 0.6 });
    const OX = 0.1, SI = 0.06, PR = 0.04;
    box(W, SI, BD, siMat, { parent: mic, pos: [0, SI / 2, 0] });
    const lines = [], fills = [], prs = [], walls = [];
    for (let i = 0; i < NT; i++) {
      const x = -W / 2 + TP / 2 + i * TP;
      // 线条(被胶保护的氧化物)
      lines.push(box(TP - TW, OX, BD, oxMat, { parent: mic, pos: [x, SI + OX / 2, 0] }));
      prs.push(box(TP - TW, PR, BD, prMat, { parent: mic, pos: [x, SI + OX + PR / 2, 0] }));
      // 沟槽位置的氧化物:随刻蚀从上往下消失
      if (i < NT - 1) {
        const tx = x + TP / 2;
        fills.push(box(TW, OX, BD, oxMat, { parent: mic, pos: [tx, SI + OX / 2, 0] }));
        // 侧壁钝化聚合物
        for (const sx of [-1, 1]) walls.push(box(0.0015, 1, BD, polyMat, { parent: mic, pos: [tx + sx * (TW / 2 - 0.001), 0, 0], cast: false }));
      }
    }
    // 两端的槽位也补上
    const microIons = new Particles(root, {
      count: 200, rate: 90, intensity: 2.2,
      spawn(p) {
        const i = (Math.random() * (NT - 1)) | 0;
        const x = -W / 2 + TP * (i + 1) + (Math.random() - 0.5) * TW * 0.7;
        p.pos.set(1.2 + x, 0.93 + 0.32, 0.35 + (Math.random() - 0.5) * BD);
        p.vel.set((Math.random() - 0.5) * 0.01, -0.5, 0); p.max = 2; p.size = 0.006; p.color.setRGB(0.85, 0.6, 1);
        p.data.floor = 0;
      },
      step(p, dt) { p.pos.addScaledVector(p.vel, dt); if (p.pos.y < p.data.floor) p.life = p.max; },
    });
    let etchDepth = 0;

    label('射频线圈(13.56 MHz)<small>感应耦合产生高密度等离子体</small>', V(0.15, 1.4, 0.1), null, { cls: 'hot' });
    label('陶瓷介质窗', V(-0.25, 1.35, 0.25));
    label('等离子体辉光<small>CF₄ / C₄F₈ / Ar,1~100 mTorr</small>', V(0.0, WY + 0.2, 0.15), null, { cls: 'uv' });
    label('静电吸盘 + 射频偏压<small>吸引正离子垂直轰击</small>', V(0.14, WY - 0.06, 0.1));
    label('硅聚焦环', V(0.18, WY + 0.01, 0.0));
    label('分子泵<small>抽走 SiF₄、CO 等挥发产物</small>', V(0.1, 0.6, 0.1));
    label('光刻胶掩膜(被缓慢消耗)', V(1.2 - W / 2 + 0.02, 0.93 + 0.22, 0.35 + BD / 2));
    label('SiO₂ 沟槽<small>侧壁钝化层保护,近乎垂直</small>', V(1.2 + 0.03, 0.93 + 0.11, 0.35 + BD / 2));
    label('Si 衬底(刻蚀停止层)', V(1.2 + 0.1, 0.93 + 0.03, 0.35 + BD / 2));
    const st = label('', V(1.2, 0.93 + 0.36, 0.35), null, { cls: 'big' });

    return {
      update(t, dt) {
        const k = (t % CYCLE) / CYCLE;
        const on = k > 0.05 && k < 0.92;
        plasmaMats.forEach((m, i) => (m.opacity = on ? 0.035 + 0.015 * Math.sin(t * 7 + i) + Math.random() * 0.01 : 0));
        nt.offset.x += dt * 0.15; nt.offset.y += dt * 0.07;
        pl.intensity = on ? 1.0 + Math.random() * 0.3 : 0;
        ions.rate = on ? 150 : 0; byp.rate = on ? 50 : 0;
        ions.update(dt); byp.update(dt);
        // 刻蚀深度
        etchDepth = OX * smooth(0.1, 0.8, k);
        const prT = PR * (1 - 0.45 * smooth(0.1, 0.8, k));
        fills.forEach((f) => { const h = Math.max(0.0001, OX - etchDepth); f.scale.y = h / OX; f.position.y = SI + h / 2; f.visible = h > 0.0005; });
        prs.forEach((p) => { p.scale.y = prT / PR; p.position.y = SI + OX + prT / 2; p.visible = k < 0.94; });
        walls.forEach((w) => { w.scale.y = Math.max(0.0001, etchDepth); w.position.y = SI + OX - etchDepth / 2; w.visible = etchDepth > 0.001 && k < 0.94; });
        microIons.rate = on ? 90 : 0;
        microIons.ps.forEach((p) => { p.data.floor = 0.93 + SI + OX - etchDepth; });
        microIons.update(dt);
        const nm = Math.round((etchDepth / OX) * 500);
        st.element.querySelector('.txt').innerHTML = k < 0.05 ? '抽真空 · 通入刻蚀气体' : k < 0.92 ? `等离子刻蚀中 · 深度 ${nm} nm / 500 nm` : 'O₂ 灰化去胶 · 刻蚀完成';
      },
    };
  },
};

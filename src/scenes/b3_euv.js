/* B3 EUV 光刻机:锡滴 LPP 光源 → 收集镜 → 照明复眼 → 反射掩膜 → 6 镜投影物镜 → 双工件台扫描曝光 */
import * as THREE from 'three';
import { M } from '../lib/materials.js';
import { mesh, cyl, box, rbox, lathe, shell, pipe, lights, glowLight, V, Particles, instanced, mat4, smooth, lerp } from '../lib/kit.js';
import { cleanroom, waferGeometry } from '../lib/fab.js';
import { canvas, reticleTex, textTex, dotTex } from '../lib/textures.js';

// 光路关键点(x, y),z = 0 平面
const PF = V(-2.35, 0.95, 0);       // 等离子体 / 第一焦点
const IF = V(-1.7, 1.45, 0);        // 中间焦点
const FFM = V(-1.32, 2.5, 0);       // 场复眼反射镜
const PFM = V(-0.72, 1.92, 0);      // 光瞳复眼反射镜
const RET = V(0.15, 2.78, 0);       // 掩膜版
const POB = [V(0.36, 1.86, 0), V(-0.06, 2.3, 0), V(0.66, 2.46, 0), V(0.1, 1.58, 0), V(0.82, 1.3, 0), V(0.3, 1.78, 0)];
const WAF = V(0.48, 0.993, 0);        // 晶圆曝光点
const FW = 0.033, FH = 0.026;        // 曝光场 33 × 26 mm

function stripeTex() {
  const [c, g] = canvas(4, 128);
  for (let y = 0; y < 128; y++) { const v = 0.55 + 0.45 * Math.sin((y / 128) * Math.PI * 8); g.fillStyle = `rgba(255,255,255,${v})`; g.fillRect(0, y, 4, 1); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

export default {
  bg: ['#9aa3ad', '#5d656f'],
  env: 0.6,
  exposure: 0.85,
  bloom: { strength: 0.6, radius: 0.5, threshold: 1.4 },
  zoom: [0.2, 25],
  views: [
    { name: '整机剖视', pos: [2.4, 3.0, 4.6], target: [-0.7, 1.7, 0] },
    { name: 'EUV 光源', pos: [-1.6, 1.35, 1.35], target: [-2.35, 0.95, 0] },
    { name: '照明与掩膜', pos: [-0.2, 2.85, 1.7], target: [-0.5, 2.35, 0] },
    { name: '投影物镜', pos: [1.35, 2.1, 1.45], target: [0.35, 1.85, 0] },
    { name: '晶圆扫描曝光', pos: [0.95, 1.32, 0.5], target: [0.48, 1.06, 0] },
  ],
  build({ root, label }) {
    lights(root, { key: 1.1, keyPos: [3, 8, 5], hemi: 0.45, shadow: 4, rim: 0.5, sky: '#ffffff', ground: '#8a9099' });
    cleanroom(root, { rows: [[-4.6, 0]], oht: false });

    /* ---------- 机身:基座、真空腔、白色外罩(前方剖开) ---------- */
    const white = M.paint('#e3e6ea');
    const vac = M.steelDark({ color: '#8e949c', roughness: 0.4 });
    box(4.6, 0.3, 1.6, M.paint('#3a4048'), { parent: root, pos: [-0.75, 0.15, -0.1] });
    // 外罩:后墙 + 顶 + 两端(前方开口)
    box(4.6, 3.2, 0.06, white, { parent: root, pos: [-0.75, 1.9, -0.9] });
    box(4.6, 0.06, 1.6, white, { parent: root, pos: [-0.75, 3.5, -0.1] }).material.side = THREE.DoubleSide;
    box(0.06, 3.2, 1.6, white, { parent: root, pos: [-3.05, 1.9, -0.1] });
    box(0.06, 3.2, 1.6, white, { parent: root, pos: [1.55, 1.9, -0.1] });
    // 前方保留下半截护板
    box(4.6, 0.5, 0.06, white, { parent: root, pos: [-0.75, 0.55, 0.7] });
    // 真空腔分隔壁(灰色)
    box(0.04, 2.4, 1.0, vac, { parent: root, pos: [-1.9, 1.55, -0.3] });
    // 内部骨架
    for (const x of [-2.9, -1.9, -0.6, 1.4]) box(0.08, 3.1, 0.08, M.steel(), { parent: root, pos: [x, 1.85, -0.82] });

    /* ---------- 光源:锡滴发生器 + CO₂ 激光 + 收集镜 ---------- */
    shell([[0.55, 0.45], [0.62, 0.8], [0.62, 1.25], [0.4, 1.55], [0.18, 1.62]], 0.03, vac, { phi0: Math.PI / 2, phiLen: Math.PI, parent: root, pos: [PF.x, 0, 0], capMat: M.steelDark() });
    // 收集镜:椭球面一部分,多层膜(Mo/Si)呈金紫色
    const mlMat = new THREE.MeshPhysicalMaterial({ color: '#d8c7a0', metalness: 1, roughness: 0.08, iridescence: 1, iridescenceIOR: 1.8, iridescenceThicknessRange: [380, 380], side: THREE.DoubleSide });
    const toIF = IF.clone().sub(PF).normalize();
    const col = mesh(new THREE.SphereGeometry(0.42, 64, 24, 0, Math.PI * 2, 0, 0.95), mlMat, { parent: root });
    col.position.copy(PF).addScaledVector(toIF, 0.05);
    col.quaternion.setFromUnitVectors(V(0, 1, 0), toIF.clone().negate());
    // 收集镜背后的冷却背板
    const colBack = mesh(new THREE.SphereGeometry(0.44, 48, 16, 0, Math.PI * 2, 0, 0.95), M.steelDark({ color: '#565b62' }), { parent: root });
    colBack.position.copy(col.position); colBack.quaternion.copy(col.quaternion);
    // 锡滴发生器与接收器
    cyl(0.05, 0.05, 0.3, M.steel(), { parent: root, pos: [PF.x, PF.y, -0.55], rot: [Math.PI / 2, 0, 0] });
    cyl(0.07, 0.07, 0.12, M.paint('#c9a227'), { parent: root, pos: [PF.x, PF.y, -0.74], rot: [Math.PI / 2, 0, 0] });
    cyl(0.06, 0.06, 0.15, M.steel(), { parent: root, pos: [PF.x, PF.y, 0.42], rot: [Math.PI / 2, 0, 0] });
    // CO₂ 激光入射(从下方子厂房)
    const laserMat = M.beam('#ff3a2a', 0.5);
    const laser = cyl(0.015, 0.03, PF.y - 0.0, laserMat, { parent: root, pos: [PF.x - 0.05, PF.y / 2, 0], cast: false });
    laser.rotation.z = 0.05;
    box(0.5, 0.25, 0.5, M.paint('#cc3b2f'), { parent: root, pos: [PF.x, 0.42, -0.25] });
    // 等离子体
    const plasma = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(0.15), color: '#e7b2ff', blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    plasma.position.copy(PF); plasma.scale.setScalar(0.12); root.add(plasma);
    const plasmaLight = glowLight(root, '#c58bff', 1.5, PF.toArray(), 1.2);
    // 锡滴
    const drops = new Particles(root, {
      count: 120, rate: 40, intensity: 1.2,
      spawn(p) { p.pos.set(PF.x, PF.y, -0.42); p.vel.set(0, 0, 0.9); p.max = 0.95; p.size = 0.012; p.color.setRGB(0.85, 0.85, 0.9); p.alpha = 1; },
      step(p, dt) { p.pos.addScaledVector(p.vel, dt); if (p.pos.z > 0 && !p.data.hit) { p.data.hit = true; p.color.setRGB(0.9, 0.5, 1); p.size = 0.04; } if (p.data.hit) p.alpha *= 0.85; },
    });

    /* ---------- EUV 光路 ---------- */
    const st = stripeTex(); st.repeat.set(1, 3);
    const beamMat = M.beam('#b77cff', 0.32, { map: st });
    const beams = [];
    const seg = (a, b, r0, r1, op = 1) => {
      const d = b.clone().sub(a), L = d.length();
      const g = new THREE.CylinderGeometry(r1, r0, L, 32, 1, true);
      const m = mesh(g, beamMat, { parent: root, cast: false, receive: false });
      m.position.copy(a).addScaledVector(d, 0.5);
      m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
      beams.push(m);
      return m;
    };
    seg(PF.clone().addScaledVector(toIF, -0.17), IF, 0.31, 0.004);
    seg(IF, FFM, 0.004, 0.16);
    seg(FFM, PFM, 0.15, 0.11);
    seg(PFM, RET, 0.11, 0.05);
    const pts = [RET, ...POB, WAF];
    const radii = [0.05, 0.09, 0.07, 0.1, 0.08, 0.06, 0.13, 0.004];
    for (let i = 0; i < pts.length - 1; i++) seg(pts[i], pts[i + 1], radii[i], radii[i + 1]);

    /* ---------- 反射镜(法线 = 入射与出射方向的角平分线) ---------- */
    const mountMat = M.steelDark({ color: '#4c5158' });
    const placeMirror = (p, prev, next, r, geoFn) => {
      const n = prev.clone().sub(p).normalize().add(next.clone().sub(p).normalize()).normalize();
      const g = new THREE.Group(); g.position.copy(p); g.quaternion.setFromUnitVectors(V(0, 1, 0), n); root.add(g);
      if (geoFn) geoFn(g); else mesh(new THREE.CylinderGeometry(r, r, 0.03, 48), mlMat, { parent: g, pos: [0, -0.015, 0] });
      mesh(new THREE.TorusGeometry(r + 0.01, 0.012, 8, 48), mountMat, { parent: g, pos: [0, -0.02, 0], rot: [Math.PI / 2, 0, 0] });
      cyl(r * 0.9, r * 0.9, 0.05, mountMat, { parent: g, pos: [0, -0.06, 0] });
      return g;
    };
    // 场复眼:矩形小镜阵列
    placeMirror(FFM, IF, PFM, 0.17, (g) => {
      const ms = [];
      for (let i = -4; i <= 4; i++) for (let j = -2; j <= 2; j++) ms.push(mat4([i * 0.034, 0, j * 0.06], [((i * 7) % 5) * 0.01, 0, ((j * 3) % 4) * 0.01], 1));
      instanced(new THREE.BoxGeometry(0.03, 0.012, 0.055), mlMat, ms, { parent: g });
    });
    // 光瞳复眼:圆形小镜阵列
    placeMirror(PFM, FFM, RET, 0.13, (g) => {
      const ms = [];
      for (let i = -5; i <= 5; i++) for (let j = -5; j <= 5; j++) { const x = i * 0.022 + (j % 2) * 0.011, z = j * 0.019; if (Math.hypot(x, z) < 0.12) ms.push(mat4([x, 0, z], [0, 0, 0], 1)); }
      instanced(new THREE.CylinderGeometry(0.009, 0.009, 0.01, 12), mlMat, ms, { parent: g });
    });
    const pobR = [0.09, 0.07, 0.11, 0.09, 0.07, 0.15];
    POB.forEach((p, i) => placeMirror(p, pts[i], pts[i + 2], pobR[i]));
    // 投影物镜镜筒(半剖)
    shell([[0.62, 1.2], [0.62, 2.62]], 0.02, M.steelDark({ color: '#7b8189', roughness: 0.35 }), { phi0: Math.PI / 2, phiLen: Math.PI, parent: root, pos: [0.35, 0, 0], capMat: M.steelDark() });

    /* ---------- 掩膜台(上方,反射式掩膜正面朝下) ---------- */
    const rstage = new THREE.Group(); root.add(rstage);
    const retMat = new THREE.MeshPhysicalMaterial({ color: '#c5c9d0', metalness: 0.9, roughness: 0.1, map: reticleTex(), iridescence: 0.6, iridescenceThicknessRange: [300, 300] });
    box(0.152, 0.0064, 0.152, [M.quartz({ thickness: 0.006 }), M.quartz(), M.quartz(), retMat, M.quartz(), M.quartz()], { parent: rstage, pos: [0, RET.y + 0.004, 0] });
    box(0.5, 0.06, 0.42, M.plastic('#2a2e35', { roughness: 0.35 }), { parent: rstage, pos: [0, RET.y + 0.045, 0] });
    box(0.5, 0.012, 0.42, M.chrome(), { parent: rstage, pos: [0, RET.y + 0.08, 0] });
    for (const z of [-0.26, 0.26]) box(1.4, 0.05, 0.05, M.steel(), { parent: root, pos: [RET.x, RET.y + 0.06, z] });

    /* ---------- 晶圆台:曝光位 + 测量位,花岗岩基座 ---------- */
    const granite = new THREE.MeshStandardMaterial({ color: '#2a2b2e', roughness: 0.35, metalness: 0.1 });
    box(2.0, 0.22, 1.0, granite, { parent: root, pos: [0.85, 0.75, -0.1] });
    const mkStage = () => {
      const s = new THREE.Group();
      box(0.42, 0.1, 0.42, M.plastic('#d9d4c7', { roughness: 0.25 }), { parent: s, pos: [0, 0.92, 0] }); // 微晶陶瓷台面
      for (const [x, z] of [[0.21, 0], [-0.21, 0], [0, 0.21], [0, -0.21]]) box(x ? 0.004 : 0.42, 0.08, z ? 0.004 : 0.42, M.chrome(), { parent: s, pos: [x, 0.92, z] });
      cyl(0.155, 0.155, 0.02, M.plastic('#1b1d21'), { parent: s, pos: [0, 0.98, 0] });
      box(0.5, 0.05, 0.5, M.steelDark({ color: '#5a5f66' }), { parent: s, pos: [0, 0.885, 0] });
      root.add(s);
      return s;
    };
    const expStage = mkStage();
    const measStage = mkStage(); measStage.position.set(1.32, 0, 0);
    // 晶圆 + 曝光场贴图
    const S = 1024;
    const [wc, wg] = canvas(S, S);
    const fields = [];
    for (let i = -5; i <= 5; i++) for (let j = -6; j <= 6; j++) {
      const fx = i * FW, fz = j * FH;
      const corners = [[fx - FW / 2, fz - FH / 2], [fx + FW / 2, fz - FH / 2], [fx - FW / 2, fz + FH / 2], [fx + FW / 2, fz + FH / 2]];
      if (corners.filter(([x, z]) => Math.hypot(x, z) < 0.147).length >= 2) fields.push({ i, j, fx, fz });
    }
    // 蛇形扫描顺序
    fields.sort((a, b) => a.i - b.i || (a.i % 2 ? b.j - a.j : a.j - b.j));
    const px = (x) => (x / 0.3 + 0.5) * S, pz = (z) => (0.5 + z / 0.3) * S;
    const paintWafer = () => {
      wg.fillStyle = '#7a4f86'; wg.fillRect(0, 0, S, S); // 涂有光刻胶的晶圆(紫褐色干涉色)
      wg.strokeStyle = 'rgba(255,255,255,0.12)'; wg.lineWidth = 1;
      fields.forEach((f) => wg.strokeRect(px(f.fx - FW / 2), pz(f.fz - FH / 2), (FW / 0.3) * S, (FH / 0.3) * S));
    };
    paintWafer();
    const wtex = new THREE.CanvasTexture(wc); wtex.colorSpace = THREE.SRGBColorSpace;
    wtex.repeat.set(1 / 0.3, 1 / 0.3); wtex.offset.set(0.5, 0.5);
    const wGeo = waferGeometry();
    const waferMat = new THREE.MeshPhysicalMaterial({ map: wtex, metalness: 0.5, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 });
    const wafer = mesh(wGeo, waferMat, { parent: expStage, pos: [0, 0.991, 0] });
    mesh(wGeo, new THREE.MeshPhysicalMaterial({ color: '#7a4f86', metalness: 0.5, roughness: 0.15, clearcoat: 1 }), { parent: measStage, pos: [0, 0.991, 0] });
    // 曝光狭缝(弧形)
    const slit = mesh(new THREE.RingGeometry(0.2, 0.203, 32, 1, -0.065, 0.13), M.emissive('#d9a8ff', 6, { side: THREE.DoubleSide }), { parent: root, cast: false });
    slit.rotation.x = -Math.PI / 2; slit.position.set(WAF.x - 0.2, WAF.y + 0.003, 0);
    // 测量位:对准与调平传感器
    box(0.25, 0.35, 0.2, M.paint('#d0d4d9'), { parent: root, pos: [1.32, 1.4, 0] });
    cyl(0.04, 0.03, 0.18, M.plastic('#1d2026'), { parent: root, pos: [1.32, 1.15, 0] });
    const lvl = M.beam('#ff5a4a', 0.5);
    const lvlBeam = cyl(0.003, 0.003, 0.4, lvl, { parent: root, pos: [1.32, 1.1, 0], rot: [0, 0, 1.2], cast: false });

    /* ---------- 标注 ---------- */
    label('① 锡滴发生器<small>每秒 5 万颗 Ø27μm 锡滴</small>', V(PF.x, PF.y + 0.05, -0.7));
    label('② CO₂ 激光(来自子厂房)<small>先预脉冲压扁,再主脉冲击发</small>', V(PF.x - 0.05, 0.6, 0.05), null, { cls: 'hot' });
    label('③ 锡等离子体 ≈ 22 万°C<small>辐射 13.5nm 极紫外光</small>', V(PF.x + 0.05, PF.y, 0.05), null, { cls: 'uv' });
    label('④ 收集镜<small>椭球面 Mo/Si 多层膜</small>', PF.clone().addScaledVector(toIF, -0.3).add(V(0, -0.15, 0.2)));
    label('⑤ 中间焦点 IF', IF.clone().add(V(0.02, 0, 0)), null, { cls: 'uv' });
    label('⑥ 场复眼反射镜', FFM.clone().add(V(0.05, 0.06, 0.1)));
    label('⑦ 光瞳复眼反射镜', PFM.clone().add(V(0.06, -0.05, 0.1)));
    label('⑧ 反射式掩膜版(4× 电路图)<small>掩膜台高速扫描</small>', RET.clone().add(V(0.1, 0.1, 0.2)));
    label('⑨ 投影物镜 M1~M6<small>镜面粗糙度 < 0.1nm,缩小 4 倍</small>', V(0.75, 2.3, 0.1));
    label('⑩ 晶圆台 · 曝光位<small>与掩膜台反向同步扫描</small>', V(0.2, 1.0, 0.25));
    label('⑪ 晶圆台 · 测量位<small>对准 + 调平,与曝光并行</small>', V(1.32, 1.0, 0.25));
    label('EUV 光路(示意:真实 EUV 不可见)', V(-1.0, 2.2, 0.05), null, { cls: 'uv' });
    label('真空腔', V(-1.9, 2.8, -0.2));
    const prog = label('', V(0.48, 1.2, 0.15), null, { cls: 'big' });

    /* ---------- 动画 ---------- */
    let fi = 0, ft = 0, exposed = 0;
    const SCAN = 0.55, STEP = 0.25;
    return {
      update(t, dt) {
        // 光源脉冲
        const flick = 0.7 + Math.random() * 0.6;
        plasma.scale.setScalar(0.1 * flick + 0.04);
        plasmaLight.intensity = 1.5 * flick;
        laser.material.opacity = 0.25 + Math.random() * 0.35;
        drops.update(dt);
        st.offset.y -= dt * 1.5;
        // 扫描 + 步进
        ft += dt;
        const f = fields[fi];
        let s, scanning;
        if (ft < SCAN) { scanning = true; s = lerp(-FW / 2, FW / 2, ft / SCAN) * (f.i % 2 ? -1 : 1); }
        else {
          scanning = false;
          if (ft >= SCAN + STEP) {
            // 场曝光完成:在晶圆贴图上留下潜像
            wg.fillStyle = 'rgba(60,140,210,0.55)';
            wg.fillRect(px(f.fx - FW / 2) + 1, pz(f.fz - FH / 2) + 1, (FW / 0.3) * S - 2, (FH / 0.3) * S - 2);
            wtex.needsUpdate = true;
            exposed++;
            fi = (fi + 1) % fields.length; ft = 0;
            if (fi === 0) { paintWafer(); wtex.needsUpdate = true; exposed = 0; }
          }
          const nf = fields[fi];
          const k = smooth(SCAN, SCAN + STEP, ft);
          const sEnd = (FW / 2) * (f.i % 2 ? -1 : 1);
          s = null;
          expStage.position.set(WAF.x - lerp(f.fx + sEnd, nf.fx - (FW / 2) * (nf.i % 2 ? -1 : 1), k), 0, -lerp(f.fz, nf.fz, k));
        }
        if (scanning) expStage.position.set(WAF.x - (f.fx + s), 0, -f.fz);
        rstage.position.x = RET.x + (scanning ? 4 * s : 0) * 1.0;
        beams.forEach((b) => (b.visible = scanning || Math.random() < 0.15));
        slit.visible = scanning;
        measStage.position.x = 1.32 + Math.sin(t * 0.9) * 0.08;
        measStage.position.z = Math.cos(t * 0.6) * 0.08;
        lvlBeam.material.opacity = 0.3 + Math.random() * 0.3;
        prog.element.querySelector('.txt').innerHTML = `${scanning ? '扫描曝光中' : '步进至下一场'} · 第 ${exposed + 1} / ${fields.length} 场`;
      },
    };
  },
};

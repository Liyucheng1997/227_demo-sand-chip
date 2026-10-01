/* B8 测试·切割·封装:探针台晶圆测试 → 划片机切割 → 引线键合 → 塑封成品(剖视)+ 料盘 */
import * as THREE from 'three';
import { M } from '../lib/materials.js';
import { mesh, cyl, box, rbox, pipe, lights, V, Particles, instanced, mat4, smooth, lerp } from '../lib/kit.js';
import { cleanroom, waferGeometry } from '../lib/fab.js';
import { canvas, dieGridTex, textTex, rng } from '../lib/textures.js';

const BENCH = 0.9;
const S1 = V(-1.8, BENCH, 0), S2 = V(-0.6, BENCH, 0), S3 = V(0.6, BENCH, 0), S4 = V(1.8, BENCH, 0);
const ND = 14, DIE = 0.3 / ND;

/** 晶圆贴图上的芯片坐标(仅保留完整落在晶圆内的 die) */
function dieList() {
  const out = [];
  for (let i = 0; i < ND; i++) for (let j = 0; j < ND; j++) {
    const x = -0.15 + (i + 0.5) * DIE, z = -0.15 + (j + 0.5) * DIE;
    if (Math.hypot(Math.abs(x) + DIE / 2, Math.abs(z) + DIE / 2) < 0.147) out.push({ i, j, x, z });
  }
  return out;
}

/** 引线键合组件:芯片 + 引线框架 + 金线回路(返回金线曲线,供动画逐根显示) */
function bondedDie(parent, o = {}) {
  const g = new THREE.Group(); parent.add(g);
  const D = 0.12, LEADS = 7;
  const dieTex = dieGridTex({ size: 512, n: 1, base: '#2a3140' });
  box(0.16, 0.006, 0.16, M.alu({ color: '#c8b38a', roughness: 0.3 }), { parent: g, pos: [0, 0.003, 0] }); // 载片台(镀银)
  box(D, 0.012, D, [M.silicon(), M.silicon(), new THREE.MeshStandardMaterial({ map: dieTex, metalness: 0.4, roughness: 0.3 }), M.silicon(), M.silicon(), M.silicon()], { parent: g, pos: [0, 0.012, 0] });
  const leadMat = M.alu({ color: '#d2b07a', roughness: 0.25 }); // 镀银 / 铜引脚
  const curves = [];
  for (let side = 0; side < 4; side++) {
    const rot = (side * Math.PI) / 2;
    for (let k = 0; k < LEADS; k++) {
      const u = (k - (LEADS - 1) / 2) * 0.016;
      const lead = V(u, 0.003, 0.125).applyAxisAngle(V(0, 1, 0), rot);
      const leadEnd = V(u * 1.25, 0.003, 0.2).applyAxisAngle(V(0, 1, 0), rot);
      const dir = leadEnd.clone().sub(lead);
      const lm = box(0.008, 0.005, dir.length() + 0.02, leadMat, { parent: g });
      lm.position.copy(lead).add(leadEnd).multiplyScalar(0.5);
      lm.lookAt(leadEnd.x, lm.position.y, leadEnd.z);
      const pad = V(u * 0.62, 0.0185, 0.052).applyAxisAngle(V(0, 1, 0), rot);
      box(0.006, 0.001, 0.006, M.alu({ color: '#dfe2e6' }), { parent: g, pos: pad.toArray() });
      // 金线:球焊点上方先竖直拔高,再弧形落到引脚(典型的"反向弧"线弧)
      const top = pad.clone().add(V(0, 0.028, 0));
      const mid = pad.clone().lerp(lead, 0.45).add(V(0, 0.034, 0));
      const end = lead.clone().add(V(0, 0.0055, 0));
      curves.push(new THREE.CatmullRomCurve3([pad, top, mid, end.clone().add(V(0, 0.008, 0)).lerp(mid, 0.25), end]));
    }
  }
  const wires = curves.map((c) => {
    const m = mesh(new THREE.TubeGeometry(c, 40, 0.0011, 6), M.gold({ roughness: 0.15 }), { parent: g, cast: false });
    sphereAt(g, c.getPoint(0), 0.0024);
    m.userData.ball = g.children[g.children.length - 1];
    return m;
  });
  if (o.pos) g.position.set(...o.pos);
  if (o.scale) g.scale.setScalar(o.scale);
  return { g, curves, wires };
}
function sphereAt(parent, p, r) { return mesh(new THREE.SphereGeometry(r, 12, 8), M.gold(), { parent, pos: p.toArray(), cast: false }); }

export default {
  bg: ['#9aa3ad', '#5d656f'],
  env: 0.6,
  exposure: 0.85,
  bloom: { strength: 0.3, threshold: 1.8 },
  zoom: [0.1, 18],
  views: [
    { name: '封测产线', pos: [0.2, 2.2, 3.4], target: [0, 1.0, 0] },
    { name: '探针测试', pos: [-1.56, 0.995, 0.26], target: [-1.8, 0.96, 0] },
    { name: '划片切割', pos: [-0.25, 1.3, 0.55], target: [-0.6, 0.97, 0] },
    { name: '引线键合', pos: [0.82, 1.18, 0.32], target: [0.6, 0.97, 0] },
    { name: '封装成品', pos: [2.15, 1.25, 0.55], target: [1.8, 0.95, 0] },
  ],
  build({ root, label }) {
    lights(root, { key: 1.2, keyPos: [2, 7, 4], hemi: 0.45, shadow: 3.2, rim: 0.5, sky: '#ffffff', ground: '#8a9099' });
    cleanroom(root, { rows: [[-4.2, 0]], oht: false });
    const rand = rng(31);
    const paint = M.paint('#d4d8dd');
    [S1, S2, S3, S4].forEach((s) => {
      rbox(1.0, BENCH, 0.9, 0.02, paint, { parent: root, pos: [s.x, BENCH / 2, -0.05] });
      box(1.0, 0.02, 0.9, M.plastic('#2a2e35', { roughness: 0.45 }), { parent: root, pos: [s.x, BENCH + 0.01, -0.05] });
    });
    const dies = dieList();

    /* ---------- ① 探针台 ---------- */
    const chuck = new THREE.Group(); chuck.position.set(S1.x, BENCH + 0.02, 0); root.add(chuck);
    cyl(0.16, 0.16, 0.03, M.chrome({ color: '#c9a95c' }), { parent: chuck, pos: [0, 0.015, 0], seg: 64 }); // 镀金吸盘
    const pTex = dieGridTex({ size: 2048, n: ND });
    pTex.repeat.set(1 / 0.3, 1 / 0.3); pTex.offset.set(0.5, 0.5);
    mesh(waferGeometry(), new THREE.MeshPhysicalMaterial({ map: pTex, metalness: 0.6, roughness: 0.18, clearcoat: 0.6 }), { parent: chuck, pos: [0, 0.031, 0] });
    // 探针卡:PCB + 加强板 + 一圈悬臂钨针
    const card = new THREE.Group(); card.position.set(S1.x, BENCH + 0.13, 0); root.add(card);
    const pcbTex = (() => {
      const [c, g] = canvas(512, 512);
      g.fillStyle = '#1f5a34'; g.fillRect(0, 0, 512, 512);
      g.strokeStyle = '#d6b25e'; g.lineWidth = 2;
      for (let i = 0; i < 90; i++) { const a = (i / 90) * Math.PI * 2; g.beginPath(); g.moveTo(256 + Math.cos(a) * 60, 256 + Math.sin(a) * 60); g.lineTo(256 + Math.cos(a) * 240, 256 + Math.sin(a) * 240); g.stroke(); }
      g.fillStyle = '#0d0d0d'; g.beginPath(); g.arc(256, 256, 55, 0, 6.3); g.fill();
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
        // PCB 环形板(中心开窗,可以从上方看到针尖)
    const pcbSh = new THREE.Shape(); pcbSh.absarc(0, 0, 0.2, 0, Math.PI * 2, false);
    const win = new THREE.Path(); win.absarc(0, 0, 0.045, 0, Math.PI * 2, true); pcbSh.holes.push(win);
    const pcbG = new THREE.ExtrudeGeometry(pcbSh, { depth: 0.01, bevelEnabled: false, curveSegments: 64 }); pcbG.rotateX(-Math.PI / 2);
    pcbTex.repeat.set(1 / 0.4, 1 / 0.4); pcbTex.offset.set(0.5, 0.5);
    mesh(pcbG, new THREE.MeshStandardMaterial({ map: pcbTex, roughness: 0.45 }), { parent: card, pos: [0, -0.005, 0] });
    mesh(new THREE.TorusGeometry(0.11, 0.008, 8, 64), M.steel(), { parent: card, pos: [0, 0.01, 0], rot: [Math.PI / 2, 0, 0] });
    const needles = [];
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const tip = V(Math.cos(a) * DIE * 0.42, -0.078, Math.sin(a) * DIE * 0.42);
      const base = V(Math.cos(a) * 0.05, -0.006, Math.sin(a) * 0.05);
      needles.push(pipe([base, base.clone().lerp(tip, 0.8).add(V(0, 0.01, 0)), tip], 0.0007, M.tungsten({ roughness: 0.2 }), { parent: card, smooth: true, segs: 12, rs: 4, cast: false }));
    }
    // 测试头 + 显示晶圆图的屏幕
    box(0.4, 0.1, 0.4, M.paint('#3a4048'), { parent: root, pos: [S1.x, BENCH + 0.6, -0.05] });
    for (const sx of [-1, 1]) box(0.03, 0.45, 0.03, M.steel(), { parent: root, pos: [S1.x + sx * 0.22, BENCH + 0.35, -0.3] });
    const [mc, mg] = canvas(512, 512);
    const mtex = new THREE.CanvasTexture(mc); mtex.colorSpace = THREE.SRGBColorSpace;
    const paintMap = () => { mg.fillStyle = '#0b1220'; mg.fillRect(0, 0, 512, 512); mg.strokeStyle = '#3a5a8a'; mg.lineWidth = 3; mg.beginPath(); mg.arc(256, 256, 236, 0, 6.3); mg.stroke(); dies.forEach((d) => { mg.fillStyle = '#26324a'; mg.fillRect(36 + d.i * 31, 36 + d.j * 31, 28, 28); }); mtex.needsUpdate = true; };
    paintMap();
    const scr = new THREE.Group(); scr.position.set(S1.x + 0.36, BENCH + 0.32, -0.3); scr.rotation.y = -0.5; root.add(scr);
    rbox(0.32, 0.26, 0.02, 0.008, M.plastic('#1b1d22'), { parent: scr });
    mesh(new THREE.PlaneGeometry(0.24, 0.24), new THREE.MeshBasicMaterial({ map: mtex, toneMapped: false }), { parent: scr, pos: [0, 0, 0.011], cast: false });
    cyl(0.01, 0.01, 0.2, M.steel(), { parent: root, pos: [S1.x + 0.36, BENCH + 0.1, -0.3] });

    /* ---------- ② 划片机 ---------- */
    const frame = new THREE.Group(); frame.position.set(S2.x, BENCH + 0.025, 0); root.add(frame);
    cyl(0.2, 0.2, 0.02, M.plastic('#3a3f46'), { parent: root, pos: [S2.x, BENCH + 0.01, 0], seg: 64 }); // 多孔陶瓷吸盘工作台
    // 钢制框架(带定位缺口)+ 蓝膜
    const ringSh = new THREE.Shape(); ringSh.absarc(0, 0, 0.23, 0, Math.PI * 2, false);
    const hole = new THREE.Path(); hole.absarc(0, 0, 0.19, 0, Math.PI * 2, true); ringSh.holes.push(hole);
    const ringG = new THREE.ExtrudeGeometry(ringSh, { depth: 0.004, bevelEnabled: false, curveSegments: 64 }); ringG.rotateX(-Math.PI / 2);
    mesh(ringG, M.steel(), { parent: frame, pos: [0, 0.002, 0] });
    mesh(new THREE.CircleGeometry(0.2, 64), new THREE.MeshPhysicalMaterial({ color: '#3f86d8', transparent: true, opacity: 0.75, roughness: 0.25, clearcoat: 0.5 }), { parent: frame, pos: [0, 0.0005, 0], rot: [-Math.PI / 2, 0, 0], cast: false });
    const dTex = dieGridTex({ size: 2048, n: ND });
    const [dc, dg] = canvas(2048, 2048);
    dg.drawImage(dTex.image, 0, 0);
    const cutTex = new THREE.CanvasTexture(dc); cutTex.colorSpace = THREE.SRGBColorSpace;
    cutTex.repeat.set(1 / 0.3, 1 / 0.3); cutTex.offset.set(0.5, 0.5);
    mesh(waferGeometry(), new THREE.MeshPhysicalMaterial({ map: cutTex, metalness: 0.6, roughness: 0.18 }), { parent: frame, pos: [0, 0.001, 0] });
    // 主轴 + 刀片 + 刀罩 + 冷却水嘴
    const spindle = new THREE.Group(); root.add(spindle);
    cyl(0.04, 0.04, 0.22, M.steel(), { parent: spindle, rot: [0, 0, Math.PI / 2], pos: [0.13, 0.06, 0] });
    rbox(0.1, 0.1, 0.12, 0.01, paint, { parent: spindle, pos: [0.27, 0.06, 0] });
    const blade = cyl(0.028, 0.028, 0.0004, new THREE.MeshStandardMaterial({ color: '#7d7f84', metalness: 0.9, roughness: 0.45 }), { parent: spindle, rot: [0, 0, Math.PI / 2], pos: [0.0, 0.03, 0] });
    cyl(0.01, 0.01, 0.012, M.chrome(), { parent: spindle, rot: [0, 0, Math.PI / 2], pos: [0.008, 0.03, 0] });
    const cover = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.02, 32, 1, false, 0, Math.PI), M.paint('#e6e8ea'));
    cover.rotation.z = Math.PI / 2; cover.rotation.y = Math.PI / 2; cover.position.set(0, 0.03, 0); spindle.add(cover);
    for (const sz of [-1, 1]) pipe([[0.02, 0.07, sz * 0.02], [-0.01, 0.02, sz * 0.012]], 0.0025, M.chrome(), { parent: spindle });
    const spray = new Particles(root, {
      count: 220, rate: 0, intensity: 0.7,
      spawn(p) { const b = new THREE.Vector3(); blade.getWorldPosition(b); p.pos.set(b.x, BENCH + 0.03, b.z); p.vel.set(-0.3 + Math.random() * 0.15, 0.1 + Math.random() * 0.15, (Math.random() - 0.5) * 0.25); p.max = 0.4; p.size = 0.004; p.color.setRGB(0.8, 0.92, 1); p.alpha = 0.7; },
      step(p, dt) { p.vel.y -= 2 * dt; p.pos.addScaledVector(p.vel, dt); },
    });
    const streets = Array.from({ length: ND + 1 }, (_, k) => -0.15 + k * DIE);

    /* ---------- ③ 引线键合 ---------- */
    const bondStage = new THREE.Group(); bondStage.position.set(S3.x, BENCH + 0.02, 0); root.add(bondStage);
    rbox(0.5, 0.02, 0.5, 0.005, M.steel(), { parent: bondStage, pos: [0, 0.0, 0] }); // 加热台
    const bd = bondedDie(bondStage, { pos: [0, 0.01, 0] });
    bd.wires.forEach((w) => { w.visible = false; w.userData.ball.visible = false; });
    // 键合头 + 瓷嘴 + 超声换能器
    const head = new THREE.Group(); root.add(head);
    box(0.16, 0.012, 0.012, M.chrome(), { parent: head, pos: [0.08, 0.06, 0] });
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.0008, 0.06, 12), new THREE.MeshPhysicalMaterial({ color: '#f2efe8', roughness: 0.3 }));
    cap.position.set(0, 0.03, 0); head.add(cap);
    rbox(0.1, 0.07, 0.08, 0.008, paint, { parent: head, pos: [0.2, 0.07, 0] });
    cyl(0.01, 0.01, 0.06, M.paint('#3a4048'), { parent: head, pos: [0.12, 0.09, 0] });
    // 金线卷
    cyl(0.025, 0.025, 0.03, M.gold(), { parent: root, pos: [S3.x + 0.25, BENCH + 0.25, -0.15], rot: [Math.PI / 2, 0, 0] });

    /* ---------- ④ 封装成品 ---------- */
    // 剖开的 QFN:后半为黑色环氧塑封,前半透明以露出内部
    const pkg = new THREE.Group(); pkg.position.set(S4.x - 0.12, BENCH + 0.03, 0.05); root.add(pkg);
    const pk = bondedDie(pkg, {});
    const moldBlack = new THREE.MeshStandardMaterial({ color: '#18191b', roughness: 0.55, metalness: 0.0 });
    box(0.42, 0.075, 0.21, moldBlack, { parent: pkg, pos: [0, 0.0375, -0.105] });
    box(0.42, 0.075, 0.21, new THREE.MeshPhysicalMaterial({ color: '#2a2c30', transparent: true, opacity: 0.22, roughness: 0.2, depthWrite: false }), { parent: pkg, pos: [0, 0.0375, 0.105], cast: false });
    mesh(new THREE.PlaneGeometry(0.3, 0.08), new THREE.MeshStandardMaterial({ map: textTex(['SAND2CHIP', 'SX-3N  2026'], { w: 512, h: 140, font: 'bold 50px Consolas', color: '#8b8e94' }), transparent: true, roughness: 0.6 }),
      { parent: pkg, pos: [0, 0.0752, -0.1], rot: [-Math.PI / 2, 0, Math.PI], cast: false });
    // 料盘(JEDEC Tray)里的成品芯片
    const tray = new THREE.Group(); tray.position.set(S4.x + 0.22, BENCH + 0.02, -0.05); root.add(tray);
    box(0.32, 0.02, 0.5, M.plastic('#1d2026', { roughness: 0.6 }), { parent: tray, pos: [0, 0.01, 0] });
    const chipTex = textTex(['SAND2CHIP', '2026'], { w: 256, h: 256, font: 'bold 36px Consolas', color: '#8b8e94', bg: '#17181a' });
    const chipMats = [moldBlack, moldBlack, new THREE.MeshStandardMaterial({ map: chipTex, roughness: 0.55 }), moldBlack, moldBlack, moldBlack];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 5; j++) box(0.07, 0.012, 0.07, chipMats, { parent: tray, pos: [-0.1 + i * 0.1, 0.026, -0.2 + j * 0.1] });

    /* 标注 */
    label('① 探针卡<small>钨针扎在焊盘上逐颗电测</small>', V(S1.x + 0.1, BENCH + 0.15, 0.1));
    label('晶圆图(绿 = 合格,红 = 失效)', V(S1.x + 0.36, BENCH + 0.47, -0.3));
    label('② 金刚石刀片 30000 rpm<small>沿切割道切开,冷却水冲洗</small>', V(S2.x, BENCH + 0.12, 0.05));
    label('蓝膜 + 钢框<small>切开后芯片仍贴在膜上</small>', V(S2.x - 0.2, BENCH + 0.03, 0.12));
    label('③ 瓷嘴 + 金线 Ø20μm<small>热超声球焊</small>', V(S3.x, BENCH + 0.12, 0.05));
    label('芯片焊盘 → 引脚', V(S3.x + 0.1, BENCH + 0.04, 0.1));
    label('④ 环氧塑封(剖视)<small>保护芯片与金线</small>', V(S4.x - 0.12, BENCH + 0.1, -0.05));
    label('激光打标', V(S4.x - 0.12, BENCH + 0.11, -0.12));
    label('成品芯片料盘', V(S4.x + 0.22, BENCH + 0.05, 0.2));
    const st1 = label('', V(S1.x, BENCH + 0.42, 0.1), null, { cls: 'big' });
    const st2 = label('', V(S2.x, BENCH + 0.3, 0.1), null, { cls: 'big' });
    const st3 = label('', V(S3.x, BENCH + 0.25, 0.1), null, { cls: 'big' });

    let pIdx = 0, pT = 0, pass = 0;
    const fails = new Set(dies.filter(() => rand() < 0.08).map((d) => d.i * 100 + d.j));
    let lastCut = -1, lastBond = -1;
    const DCYC = 24, BCYC = 30;
    return {
      update(t, dt) {
        /* 探针台:逐颗步进 */
        pT += dt;
        if (pT > 0.35) {
          pT = 0;
          const d = dies[pIdx];
          const ok = !fails.has(d.i * 100 + d.j);
          if (ok) pass++;
          mg.fillStyle = ok ? '#2fbf62' : '#e0453a'; mg.fillRect(36 + d.i * 31, 36 + d.j * 31, 28, 28); mtex.needsUpdate = true;
          pIdx = (pIdx + 1) % dies.length;
          if (pIdx === 0) { paintMap(); pass = 0; }
        }
        const cd = dies[pIdx];
        chuck.position.x = lerp(chuck.position.x, S1.x - cd.x, Math.min(1, dt * 12));
        chuck.position.z = lerp(chuck.position.z, -cd.z, Math.min(1, dt * 12));
        chuck.position.y = BENCH + 0.02 + (pT > 0.08 && pT < 0.28 ? 0.004 : 0) - 0.004;
        st1.element.querySelector('.txt').innerHTML = `探针测试 ${pIdx}/${dies.length} · 良率 ${pIdx ? Math.round((pass / pIdx) * 100) : 100}%`;

        /* 划片:先切 x 方向,转 90° 再切 z 方向 */
        const dk = (t % DCYC) / DCYC;
        if (dk < 0.02 && lastCut !== -1) { dg.drawImage(dTex.image, 0, 0); cutTex.needsUpdate = true; lastCut = -1; frame.rotation.y = 0; }
        const phase2 = dk >= 0.5 ? 1 : 0;
        const kk = (dk % 0.5) / 0.5;
        const n = streets.length;
        const li = Math.min(n - 1, Math.floor(kk * n));
        const along = (kk * n) % 1;
        frame.rotation.y = phase2 ? Math.PI / 2 : 0;
        const s = streets[li];
        spindle.position.set(S2.x + lerp(-0.2, 0.2, along), BENCH + 0.025, s);
        blade.rotation.x += dt * 60;
        const cutIdx = phase2 * 100 + li;
        if (cutIdx !== lastCut && li > 0) {
          // 画上一条完成的切缝
          const prev = streets[li - 1];
          const px = (v) => (v / 0.3 + 0.5) * 2048;
          dg.fillStyle = 'rgba(20,24,30,0.9)';
          if (!phase2) dg.fillRect(0, px(prev) - 2, 2048, 4); else dg.fillRect(px(-prev) - 2, 0, 4, 2048);
          cutTex.needsUpdate = true;
        }
        lastCut = cutIdx;
        spray.rate = Math.abs(spindle.position.x - S2.x) < 0.16 ? 220 : 0;
        spray.update(dt);
        st2.element.querySelector('.txt').innerHTML = `划片 · ${phase2 ? '纵向' : '横向'}第 ${li + 1}/${n} 道`;

        /* 引线键合:逐根打线 */
        const bt = t % BCYC;
        const per = (BCYC - 4) / bd.curves.length;
        const wi = Math.min(bd.curves.length - 1, Math.floor(bt / per));
        const wk = (bt % per) / per;
        if (bt < 0.05 && lastBond > 0) { bd.wires.forEach((w) => { w.visible = false; w.userData.ball.visible = false; }); }
        bd.wires.forEach((w, i) => { if (i < wi || bt > BCYC - 4) { w.visible = true; w.userData.ball.visible = true; } });
        lastBond = wi;
        if (bt <= BCYC - 4) {
          const c = bd.curves[wi];
          const p = c.getPoint(smooth(0.1, 0.9, wk)).add(V(S3.x, BENCH + 0.03, 0));
          head.position.copy(p);
          bd.wires[wi].userData.ball.visible = wk > 0.1;
        } else head.position.set(S3.x + 0.12, BENCH + 0.12, 0);
        st3.element.querySelector('.txt').innerHTML = bt <= BCYC - 4 ? `引线键合 第 ${wi + 1}/${bd.curves.length} 根` : '键合完成 → 塑封';
      },
    };
  },
};

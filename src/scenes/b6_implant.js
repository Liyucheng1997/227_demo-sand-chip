/* B6 离子注入机:离子源 → 引出 → 90° 质量分析磁铁 → 加速管 → 扫描 → 终端台;微观:硅金刚石晶格中的硼离子注入与退火 */
import * as THREE from 'three';
import { M } from '../lib/materials.js';
import { mesh, cyl, box, rbox, pipe, lights, glowLight, V, Particles, instanced, mat4, smooth, lerp } from '../lib/kit.js';
import { cleanroom, waferGeometry } from '../lib/fab.js';
import { rng } from '../lib/textures.js';

const BY = 1.2, R = 0.55;
const P0 = V(-1.75, BY, -1.5), BEND_C = V(-1.75 + R, BY, -0.95), P1 = V(-1.75 + R, BY, -0.95 + R);
const WAFX = 1.75;
const CYCLE = 20;

/** 束流路径:直线 → 90° 圆弧 → 直线 */
function beamPath(r = R, endZ = 0) {
  const path = new THREE.CurvePath();
  const start = V(-1.75, BY, -1.5), a0 = V(-1.75, BY, -0.95);
  path.add(new THREE.LineCurve3(start, a0));
  const c = V(-1.75 + r, BY, -0.95);
  const arc = new THREE.Curve();
  arc.getPoint = (t) => { const a = Math.PI - t * Math.PI / 2; return V(c.x + Math.cos(a) * r, BY, c.z + Math.sin(a) * r); };
  path.add(arc);
  const e = V(c.x, BY, c.z + r);
  return { path, exit: e };
}

/** 硅金刚石晶格(a = 0.543 nm) */
function diamond(nx, ny, nz) {
  const basis = [[0, 0, 0], [0, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 0.5, 0], [0.25, 0.25, 0.25], [0.25, 0.75, 0.75], [0.75, 0.25, 0.75], [0.75, 0.75, 0.25]];
  const pts = [], key = new Set();
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= ny; j++) for (let k = 0; k <= nz; k++) basis.forEach(([x, y, z]) => {
    const p = [i + x, j + y, k + z];
    if (p[0] > nx + 1e-6 || p[1] > ny + 1e-6 || p[2] > nz + 1e-6) return;
    const s = p.map((v) => v.toFixed(3)).join(',');
    if (!key.has(s)) { key.add(s); pts.push(V(...p)); }
  });
  const bonds = [];
  const d0 = Math.sqrt(3) / 4;
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) if (Math.abs(pts[i].distanceTo(pts[j]) - d0) < 0.01) bonds.push([i, j]);
  return { pts, bonds };
}

export default {
  bg: ['#9aa3ad', '#5d656f'],
  env: 0.55,
  exposure: 0.85,
  bloom: { strength: 0.55, radius: 0.5, threshold: 1.3 },
  zoom: [0.15, 20],
  views: [
    { name: '注入机束线', pos: [0.3, 3.0, 3.6], target: [-0.3, 1.1, -0.3] },
    { name: '质量分析磁铁', pos: [-0.6, 1.9, 0.6], target: [-1.35, 1.2, -0.75] },
    { name: '终端台', pos: [2.4, 1.6, 0.9], target: [1.6, 1.2, -0.4] },
    { name: '晶格注入(微观)', pos: [0.55, 1.55, 1.75], target: [0.55, 1.1, 0.95] },
  ],
  build({ root, label }) {
    lights(root, { key: 1.1, keyPos: [3, 7, 4], hemi: 0.45, shadow: 4, rim: 0.5, sky: '#ffffff', ground: '#8a9099' });
    cleanroom(root, { rows: [[-4.2, 0]] });
    const rand = rng(17);
    const ss = M.steel();
    const { path, exit } = beamPath();

    /* 高压终端(离子源所在的高压舱,外加接地防护网) */
    const term = new THREE.Group(); term.position.set(-1.75, 0, -1.95); root.add(term);
    rbox(0.8, 1.6, 0.8, 0.03, M.paint('#d4d8dd'), { parent: term, pos: [0, 0.8, -0.2] });
    const cage = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.1, 1.9, 1.2, 4, 6, 4)), new THREE.LineBasicMaterial({ color: '#c9a227' }));
    cage.position.set(0, 0.95, -0.1); term.add(cage);
    // 离子源(弧室)+ 气瓶
    cyl(0.1, 0.1, 0.3, ss, { parent: root, pos: [-1.75, BY, -1.62], rot: [Math.PI / 2, 0, 0] });
    for (let i = 0; i < 3; i++) cyl(0.07, 0.07, 0.55, M.paint(['#5b7fa8', '#7a9a4a', '#a8743a'][i]), { parent: term, pos: [-0.25 + i * 0.25, 0.4, -0.45] });
    // 引出电极
    for (let i = 0; i < 3; i++) { const e = box(0.22, 0.22, 0.012, M.steelDark(), { parent: root, pos: [-1.75, BY, -1.42 + i * 0.05] }); }

    /* 90° 分析磁铁:扇形磁极 + 铜线圈 + 轭铁 */
    const sector = (r0, r1, hole) => {
      const sh = new THREE.Shape();
      sh.absarc(0, 0, r1, 0, Math.PI / 2, false);
      sh.absarc(0, 0, r0, Math.PI / 2, 0, true);
      return sh;
    };
    const poleGeo = new THREE.ExtrudeGeometry(sector(R - 0.13, R + 0.13), { depth: 0.12, bevelEnabled: true, bevelSize: 0.005, bevelThickness: 0.005, curveSegments: 32 });
    const coilGeo = new THREE.ExtrudeGeometry(sector(R - 0.2, R + 0.2), { depth: 0.06, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, curveSegments: 32 });
    const poleMat = M.paint('#3f6db3', { roughness: 0.45 });
    const coilMat = M.copper({ roughness: 0.35 });
    // 扇形在 XY 平面,绕 (BEND_C) 旋转到束流所在水平面;圆弧对应从 -x 方向转到 +z 方向
    for (const sy of [-1, 1]) {
      const pole = mesh(poleGeo, poleMat, { parent: root });
      pole.rotation.x = Math.PI / 2; pole.rotation.z = Math.PI / 2;
      pole.position.set(BEND_C.x, BY + sy * 0.035 + (sy > 0 ? 0.12 : 0), BEND_C.z);
      const coil = mesh(coilGeo, coilMat, { parent: root });
      coil.rotation.x = Math.PI / 2; coil.rotation.z = Math.PI / 2;
      coil.position.set(BEND_C.x, BY + sy * 0.18 + (sy > 0 ? 0.06 : 0), BEND_C.z);
    }
    // 轭铁背板
    const yoke = new THREE.Group(); yoke.position.copy(BEND_C); root.add(yoke);
    for (const a of [0.25, 0.8, 1.3]) {
      const p = box(0.12, 0.5, 0.12, poleMat, { parent: yoke, pos: [-Math.cos(a) * (R + 0.26), 0, Math.sin(a) * (R + 0.26)] });
    }
    // 分析磁铁内的飞行管(半透明)
    const tubeMat = M.glass({ opacity: 0.25, transmission: 0.6 });
    mesh(new THREE.TubeGeometry(path, 80, 0.05, 16, false), tubeMat, { parent: root, cast: false });

    /* 分辨狭缝 → 加速管 → 扫描板 → 终端台 */
    const lineStart = exit.clone();
    box(0.02, 0.2, 0.2, M.steelDark(), { parent: root, pos: [lineStart.x + 0.25, BY, lineStart.z] }).visible = true;
    box(0.02, 0.06, 0.2, M.emissive('#3a3', 0), { parent: root, pos: [lineStart.x + 0.25, BY, lineStart.z] });
    // 加速管:金属电极环 + 陶瓷绝缘环交替
    const colX0 = lineStart.x + 0.45, colX1 = colX0 + 0.9;
    for (let i = 0; i < 18; i++) {
      const x = colX0 + (i / 17) * (colX1 - colX0);
      cyl(0.2, 0.2, 0.025, i % 2 ? M.plastic('#f1ece2', { roughness: 0.5 }) : M.chrome(), { parent: root, pos: [x, BY, lineStart.z], rot: [0, 0, Math.PI / 2], tl: Math.PI * 1.5, t0: Math.PI / 2 });
    }
    // 扫描电极板
    for (const sz of [-1, 1]) box(0.25, 0.14, 0.012, M.steel(), { parent: root, pos: [colX1 + 0.25, BY, lineStart.z + sz * 0.06] });
    // 终端台腔体(半剖)+ 晶圆
    const es = new THREE.Group(); es.position.set(WAFX, 0, lineStart.z); root.add(es);
    rbox(0.8, 1.6, 1.0, 0.03, M.paint('#d4d8dd'), { parent: es, pos: [0.35, 0.8, -0.35] });
    box(0.05, 0.9, 1.0, M.steelDark(), { parent: es, pos: [-0.1, BY, -0.35] }).material.transparent = false;
    const platen = new THREE.Group(); platen.position.set(0, BY, 0); platen.rotation.z = -7 * Math.PI / 180; es.add(platen);
    cyl(0.17, 0.17, 0.03, M.plastic('#2b2f35'), { parent: platen, pos: [0.03, 0, 0], rot: [0, 0, Math.PI / 2] });
    const w = mesh(waferGeometry(), M.thinFilm(30, 1.46, '#9aa2ad'), { parent: platen, pos: [0.0, 0, 0], rot: [0, 0, Math.PI / 2] });
    // 束线外管(下半,剖视)
    pipe([lineStart.clone().add(V(0.05, 0, 0)), V(WAFX - 0.12, BY, lineStart.z)], 0.05, tubeMat, { parent: root, cast: false });
    // 支架
    for (const x of [-1.2, -0.3, 0.5, 1.2]) cyl(0.04, 0.05, BY - 0.25, ss, { parent: root, pos: [x, (BY - 0.25) / 2, lineStart.z - 0.1] });

    /* 束流:B⁺ 离子沿路径飞行;质量不符的离子偏转半径不同,撞到管壁 */
    const beamMat = M.beam('#5fd8ff', 0.5);
    mesh(new THREE.TubeGeometry(path, 80, 0.008, 8, false), beamMat, { parent: root, cast: false });
    const straight = new THREE.LineCurve3(lineStart, V(WAFX, BY, lineStart.z));
    const beam2 = mesh(new THREE.TubeGeometry(straight, 4, 0.008, 8, false), beamMat, { parent: root, cast: false });
    const ions = new Particles(root, {
      count: 400, rate: 160, intensity: 2.2,
      spawn(p) {
        p.data.s = 0; p.data.m = Math.random() < 0.75 ? 1 : (Math.random() < 0.5 ? 0.7 : 1.4); // 质量比
        p.max = 3; p.size = 0.02; p.alpha = 1;
        if (p.data.m === 1) p.color.setRGB(0.4, 0.9, 1); else p.color.setRGB(1, 0.5, 0.3);
        p.pos.copy(P0);
      },
      step(p, dt) {
        p.data.s += dt * 1.2;
        const L1 = 0.55, arcL = (Math.PI / 2) * R;
        const s = p.data.s;
        if (s < L1) p.pos.set(-1.75, BY, -1.5 + s);
        else if (p.data.m !== 1) {
          // 偏转半径 ∝ √m:轻离子转得急、重离子转得缓,都撞上管壁
          const r = R * Math.sqrt(p.data.m), a = (s - L1) / r;
          const c = V(-1.75 + r, BY, -0.95);
          p.pos.set(c.x - Math.cos(a) * r, BY, c.z + Math.sin(a) * r);
          if (Math.abs(Math.hypot(p.pos.x - BEND_C.x, p.pos.z - BEND_C.z) - R) > 0.05) { p.life = p.max; }
        } else if (s < L1 + arcL) { const a = (s - L1) / R; p.pos.set(BEND_C.x - Math.cos(a) * R, BY, BEND_C.z + Math.sin(a) * R); }
        else {
          const x = lineStart.x + (s - L1 - arcL);
          const scan = x > colX1 + 0.25 ? Math.sin(p.data.ph ?? (p.data.ph = performance.now() * 0.006)) * (x - colX1 - 0.25) * 0.35 : 0;
          p.pos.set(x, BY, lineStart.z + scan);
          if (x > WAFX - 0.01) p.life = p.max;
        }
      },
    });

    /* 微观:硅晶格 + 硼离子 */
    const mic = new THREE.Group(); mic.position.set(0.55, 0.93, 0.95); root.add(mic);
    rbox(0.6, 0.93, 0.5, 0.02, M.paint('#d4d8dd'), { parent: root, pos: [0.55, 0.465, 0.95] });
    const NX = 3, NY = 4, NZ = 2, A = 0.085;
    const { pts, bonds } = diamond(NX, NY, NZ);
    const off = V(-NX * A / 2, 0.02, -NZ * A / 2);
    const P = (p) => V(p.x * A, (NY - p.y) * A, p.z * A).add(off).add(V(0, 0, 0));
    const base = pts.map((p) => V(p.x * A, p.y * A, p.z * A).add(off));
    const sGeo = new THREE.SphereGeometry(1, 16, 10);
    const siM = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.3, clearcoat: 0.5 });
    const atoms = instanced(sGeo, siM, base.map((p) => mat4(p.toArray(), [0, 0, 0], 0.011)), { parent: mic, colors: base.map(() => new THREE.Color('#7f9fd0')) });
    const bG = new THREE.CylinderGeometry(0.0025, 0.0025, 1, 6); bG.translate(0, 0.5, 0);
    const up = V(0, 1, 0);
    instanced(bG, new THREE.MeshStandardMaterial({ color: '#b8c2d6', roughness: 0.5 }), bonds.map(([i, j]) => {
      const a = base[i], d = base[j].clone().sub(a);
      return new THREE.Matrix4().compose(a, new THREE.Quaternion().setFromUnitVectors(up, d.clone().normalize()), V(1, d.length(), 1));
    }), { parent: mic, cast: false });
    const topY = NY * A + 0.02;
    // 硼离子池
    const NB = 36;
    const bMat = new THREE.MeshPhysicalMaterial({ color: '#4ade80', emissive: '#2bd46a', emissiveIntensity: 0.6, roughness: 0.3 });
    const bIons = instanced(sGeo, bMat, Array.from({ length: NB }, () => mat4([0, -10, 0], [0, 0, 0], 0.009)), { parent: mic });
    const ionState = Array.from({ length: NB }, () => ({ active: false, pos: V(), vel: V(), stopY: 0, done: false }));
    const displaced = new Map(); // 原子索引 → 位移量
    const tmpM = new THREE.Matrix4(), red = new THREE.Color('#ff4d4d'), blue = new THREE.Color('#7f9fd0'), green = new THREE.Color('#4ade80');
    const annealGlow = mesh(new THREE.BoxGeometry(NX * A + 0.04, NY * A + 0.04, NZ * A + 0.04), M.beam('#ff8a30', 0), { parent: mic, pos: [0, NY * A / 2 + 0.02, 0], cast: false });
    let nextIon = 0, launched = 0;

    label('离子源 + 引出电极<small>BF₃ 电离,高压引出 B⁺</small>', V(-1.75, BY + 0.15, -1.55));
    label('高压终端(防护网)', V(-1.75, 1.95, -1.9));
    label('90° 质量分析磁铁<small>只有 m/q 正确的离子能转过弯道</small>', V(BEND_C.x - 0.2, BY + 0.3, BEND_C.z));
    label('被滤除的杂离子(撞壁)', V(-1.5, BY, -0.85), null, { cls: 'hot' });
    label('加速管<small>电极环 + 陶瓷绝缘环,keV~MeV</small>', V((colX0 + colX1) / 2, BY + 0.22, lineStart.z));
    label('静电扫描板<small>束流来回扫过整片晶圆</small>', V(colX1 + 0.25, BY + 0.1, lineStart.z));
    label('终端台:晶圆倾斜 7°<small>避免沿晶格通道"沟道效应"</small>', V(WAFX, BY + 0.2, lineStart.z + 0.1));
    label('Si 晶格(金刚石结构)', V(0.55 - 0.15, 0.93 + 0.3, 0.95 + 0.08));
    label('B 离子(停留在晶格中)', V(0.55 + 0.13, 0.93 + 0.18, 0.95 + 0.08), null, { cls: 'big' });
    label('被撞离位的 Si(晶格损伤)', V(0.55 + 0.13, 0.93 + 0.08, 0.95 + 0.08), null, { cls: 'hot' });
    const st = label('', V(0.55, 0.93 + 0.42, 0.95), null, { cls: 'big' });

    let lastK = 0;
    return {
      update(t, dt) {
        ions.update(dt);
        platen.position.y = BY + Math.sin(t * 0.8) * 0.06; // 机械慢扫描
        const k = (t % CYCLE) / CYCLE;
        if (k < lastK) {
          // 新周期:复位
          ionState.forEach((s) => { s.active = false; s.done = false; });
          displaced.clear(); launched = 0;
          base.forEach((p, i) => { atoms.setMatrixAt(i, mat4(p.toArray(), [0, 0, 0], 0.011)); atoms.setColorAt(i, blue); });
          atoms.instanceMatrix.needsUpdate = true; atoms.instanceColor.needsUpdate = true;
        }
        lastK = k;
        // 注入阶段:发射离子
        if (k < 0.65 && launched < NB && Math.random() < dt * 4) {
          const s = ionState[nextIon]; nextIon = (nextIon + 1) % NB; launched++;
          s.active = true; s.done = false;
          s.pos.set((Math.random() - 0.5) * NX * A * 0.8, topY + 0.25, (Math.random() - 0.5) * NZ * A * 0.8);
          s.vel.set(0, -0.35, 0);
          // 投影射程 Rp 附近的高斯分布
          const g = (Math.random() + Math.random() + Math.random() - 1.5) * 0.06;
          s.stopY = topY - (0.13 + g);
        }
        ionState.forEach((s, i) => {
          if (!s.active) { bIons.setMatrixAt(i, mat4([0, -10, 0], [0, 0, 0], 0.001)); return; }
          if (!s.done) {
            s.pos.addScaledVector(s.vel, dt);
            if (s.pos.y < topY) {
              // 碰撞:随机偏折并减速,撞离附近的 Si 原子
              if (Math.random() < dt * 12) {
                s.vel.x += (Math.random() - 0.5) * 0.25; s.vel.z += (Math.random() - 0.5) * 0.25; s.vel.multiplyScalar(0.85);
                let best = -1, bd = 1e9;
                base.forEach((p, j) => { const d = p.distanceToSquared(s.pos); if (d < bd) { bd = d; best = j; } });
                if (best >= 0 && !displaced.has(best) && bd < 0.0015 && Math.random() < 0.45) {
                  const dv = V((Math.random() - 0.5) * 0.03, (Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.03);
                  displaced.set(best, dv);
                  atoms.setMatrixAt(best, mat4(base[best].clone().add(dv).toArray(), [0, 0, 0], 0.011)); atoms.setColorAt(best, red);
                  atoms.instanceMatrix.needsUpdate = true; atoms.instanceColor.needsUpdate = true;
                }
              }
              s.vel.y = Math.min(s.vel.y, -0.08);
            }
            if (s.pos.y <= s.stopY) s.done = true;
          }
          bIons.setMatrixAt(i, mat4(s.pos.toArray(), [0, 0, 0], 0.009));
        });
        bIons.instanceMatrix.needsUpdate = true;
        // 退火:损伤原子归位,硼占据替位
        const an = smooth(0.7, 0.85, k);
        annealGlow.material.opacity = an > 0 && an < 1 ? 0.12 * Math.sin(an * Math.PI) : k > 0.7 && k < 0.88 ? 0.06 : 0;
        if (an > 0) {
          displaced.forEach((dv, j) => {
            atoms.setMatrixAt(j, mat4(base[j].clone().addScaledVector(dv, 1 - an).toArray(), [0, 0, 0], 0.011));
            atoms.setColorAt(j, an > 0.95 ? blue : red);
          });
          atoms.instanceMatrix.needsUpdate = true; atoms.instanceColor.needsUpdate = true;
        }
        st.element.querySelector('.txt').innerHTML = k < 0.68 ? `注入 B⁺ · 30 keV · 已注入 ${launched} 个` : k < 0.88 ? '快速热退火 1050°C · 修复晶格' : '退火完成 · 硼被激活(P 型区)';
      },
    };
  },
};

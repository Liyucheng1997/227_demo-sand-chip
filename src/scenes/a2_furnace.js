/* A2 埋弧式矿热电弧炉(1/4 剖视):三相石墨电极、电弧空腔、液态硅熔池、出硅与烟气 */
import * as THREE from 'three';
import { M } from '../lib/materials.js';
import { mesh, cyl, box, lathe, shell, pipe, lights, glowLight, V, DEG, Particles, instanced, mat4, flange } from '../lib/kit.js';
import { canvas, rng, noiseTex, brickTex, dotTex, smokeTex } from '../lib/textures.js';
import { fbm, displace } from '../lib/noise.js';

const R_IN = 3.6, R_OUT = 4.2, H_TOP = 3.4, POOL0 = 1.0, POOL1 = 1.45;
const ELEC_R = 0.55, PITCH = 1.6, TIP = 2.0;
// 三根电极:一根正好被 z=0 剖面切开,另两根完整
const ELECS = [[PITCH, 0], [-PITCH / 2, -PITCH * 0.866], [-PITCH / 2, PITCH * 0.866]];

/** 剖面贴图:color 与 emissive 两张,s 为沿剖面方向的坐标 */
function sectionTextures(withCrater, craterS, faint) {
  const W = 1024, Hh = 1024;
  const [c, g] = canvas(W, Hh), [ce, ge] = canvas(W, Hh);
  const r = rng(withCrater ? 5 : 9);
  const X = (s) => (s / R_IN) * W, Y = (y) => (1 - y / 3.5) * Hh;
  ge.fillStyle = '#000'; ge.fillRect(0, 0, W, Hh);
  // 炉料:石英块(白)+ 焦炭(黑)+ 木片(褐)
  g.fillStyle = '#5d564f'; g.fillRect(0, 0, W, Hh);
  for (let i = 0; i < 2600; i++) {
    const k = r();
    g.fillStyle = k < 0.35 ? '#d9d4cb' : k < 0.7 ? '#1d1b1a' : k < 0.85 ? '#7a5a3a' : '#8a837a';
    g.beginPath();
    const x = r() * W, y = r() * Y(POOL1), s = 4 + r() * 14;
    for (let j = 0; j < 6; j++) { const a = (j / 6) * 6.28 + r() * 0.6; g.lineTo(x + Math.cos(a) * s * (0.6 + r() * 0.5), y + Math.sin(a) * s * (0.6 + r() * 0.5)); }
    g.fill();
  }
  // 反应区:从电弧空腔向外辐射的赤热区(SiC 与半熔料)
  const cx = X(craterS), cy = Y(1.85);
  const glowR = withCrater ? 400 : 300;
  const grd = g.createRadialGradient(cx, cy, 30, cx, cy, glowR);
  grd.addColorStop(0, 'rgba(255,170,60,0.9)'); grd.addColorStop(0.3, 'rgba(190,55,12,0.6)'); grd.addColorStop(1, 'rgba(90,20,5,0)');
  g.fillStyle = grd; g.globalAlpha = faint ? 0.55 : 1; g.fillRect(0, 0, W, Hh); g.globalAlpha = 1;
  const gre = ge.createRadialGradient(cx, cy, 20, cx, cy, glowR);
  gre.addColorStop(0, 'rgba(255,140,40,0.9)'); gre.addColorStop(0.3, 'rgba(120,30,6,0.45)'); gre.addColorStop(1, 'rgba(0,0,0,0)');
  ge.fillStyle = gre; ge.globalAlpha = faint ? 0.4 : 1; ge.fillRect(0, 0, W, Hh); ge.globalAlpha = 1;
  // 电弧空腔(气体腔室,内壁炽白)
  if (withCrater) {
    for (const gg of [g, ge]) {
      gg.save();
      gg.beginPath();
      gg.ellipse(cx, Y(1.72), X(1.0), (Y(1.45) - Y(2.15)) * 1.15, 0, 0, Math.PI * 2);
      const cg = gg.createRadialGradient(cx, Y(1.6), 10, cx, Y(1.75), X(1.05));
      cg.addColorStop(0, '#fff6dc'); cg.addColorStop(0.25, '#ffc070'); cg.addColorStop(0.7, '#a83a0c'); cg.addColorStop(0.92, '#3a1205'); cg.addColorStop(1, '#ff7a2a');
      gg.fillStyle = cg; gg.fill();
      gg.restore();
    }
  }
  // 熔池(液态硅)
  for (const gg of [g, ge]) {
    const pg = gg.createLinearGradient(0, Y(POOL1), 0, Y(POOL0));
    pg.addColorStop(0, '#fff3c0'); pg.addColorStop(0.5, '#ffb347'); pg.addColorStop(1, '#ff7a1a');
    gg.fillStyle = pg;
    gg.beginPath(); gg.moveTo(0, Y(POOL1));
    for (let s = 0; s <= R_IN + 0.01; s += 0.05) gg.lineTo(X(s), Y(POOL1 + Math.sin(s * 5) * 0.02 - (withCrater ? Math.exp(-((s - craterS) ** 2) * 3) * 0.08 : 0)));
    gg.lineTo(W, Y(POOL0)); gg.lineTo(0, Y(POOL0)); gg.fill();
  }
  // 炉底碳砖
  g.fillStyle = '#252528'; g.fillRect(0, Y(POOL0), W, Hh - Y(POOL0));
  g.strokeStyle = '#4a4a50'; g.lineWidth = 3;
  for (let y = POOL0; y > 0; y -= 0.33) {
    g.beginPath(); g.moveTo(0, Y(y)); g.lineTo(W, Y(y)); g.stroke();
    const off = (Math.round(y * 3) % 2) * 0.4;
    for (let s = off; s < R_IN; s += 0.8) { g.beginPath(); g.moveTo(X(s), Y(y)); g.lineTo(X(s), Y(y - 0.33)); g.stroke(); }
  }
  const mk = (cv) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  return [mk(c), mk(ce)];
}

export default {
  bg: ['#1a1310', '#050302'],
  env: 0.35,
  exposure: 1.0,
  bloom: { strength: 0.6, radius: 0.5, threshold: 0.9 },
  zoom: [3, 60],
  views: [
    { name: '剖视全景', pos: [13.5, 10.5, 15.5], target: [0, 3.2, 0] },
    { name: '电弧空腔', pos: [5.2, 3.6, 8.8], target: [1.5, 2.0, 0] },
    { name: '电极夹持器', pos: [8.5, 8.6, 9.5], target: [0.6, 5.0, 0] },
    { name: '出硅口', pos: [-9.5, 3.6, 11], target: [-3.6, 1.0, 5] },
  ],
  build({ root, label }) {
    lights(root, { key: 1.3, keyPos: [10, 16, 8], keyColor: '#ffe2c8', hemi: 0.18, sky: '#8899bb', ground: '#2a1a10', rim: 0.6, shadow: 12 });
    const rand = rng(7);

    /* 地坪 */
    const floor = mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({
      color: '#3b3936', roughness: 0.95, map: noiseTex({ seed: 12, repeat: [10, 10], base: 150, amp: 30, srgb: true }), bumpMap: noiseTex({ seed: 13, repeat: [24, 24], blobs: 3000, scale: 0.3 }), bumpScale: 0.4,
    }), { rot: [-Math.PI / 2, 0, 0], parent: root, cast: false });

    /* 炉壳 + 碳砖内衬(1/4 剖视:去掉 x>0 且 z>0 的象限) */
    const cut = { phi0: Math.PI / 2, phiLen: Math.PI * 1.5 };
    const brick = M.matte('#ffffff', { map: brickTex({ repeat: [3, 3], color: [70, 66, 66] }), roughness: 0.9 });
    shell([[R_OUT - 0.05, 0], [R_OUT - 0.05, H_TOP + 0.6]], R_OUT - 0.05 - R_IN, brick, { ...cut, parent: root, capMat: M.matte('#5c534d', { map: brickTex({ repeat: [1.2, 1.2], color: [120, 60, 40] }) }) });
    const steel = M.steelDark({ color: '#4d5156', roughness: 0.55 });
    shell([[R_OUT + 0.06, 0], [R_OUT + 0.06, H_TOP + 0.6]], 0.11, steel, { ...cut, parent: root });
    // 炉壳加强筋与环箍
    for (let i = 0; i < 18; i++) {
      const a = Math.PI / 2 + (i + 0.5) * (Math.PI * 1.5 / 18);
      const rib = box(0.1, H_TOP + 0.6, 0.22, steel, { parent: root, pos: [Math.sin(a) * (R_OUT + 0.15), (H_TOP + 0.6) / 2, Math.cos(a) * (R_OUT + 0.15)] });
      rib.rotation.y = a;
    }
    for (const y of [0.5, 1.8, 3.1]) mesh(new THREE.TorusGeometry(R_OUT + 0.14, 0.07, 8, 96, Math.PI * 1.5), steel, { parent: root, pos: [0, y, 0], rot: [Math.PI / 2, 0, Math.PI / 2] });
    // 炉底钢板
    lathe([[0, 0], [R_OUT + 0.17, 0], [R_OUT + 0.17, 0.08], [0, 0.08]], steel, { ...cut, parent: root });

    /* 剖面:z=0 平面(切过 1 号电极) 与 x=0 平面 */
    const [tA, eA] = sectionTextures(true, PITCH, false);
    const secA = mesh(new THREE.PlaneGeometry(R_IN, 3.5), new THREE.MeshStandardMaterial({ map: tA, emissiveMap: eA, emissive: '#ffffff', emissiveIntensity: 0.9, roughness: 0.9 }),
      { parent: root, pos: [R_IN / 2, 1.75, 0.0], cast: false });
    const [tB, eB] = sectionTextures(false, R_IN - PITCH * 0.866, true);
    const secB = mesh(new THREE.PlaneGeometry(R_IN, 3.5), new THREE.MeshStandardMaterial({ map: tB, emissiveMap: eB, emissive: '#ffffff', emissiveIntensity: 0.8, roughness: 0.9 }),
      { parent: root, pos: [0, 1.75, R_IN / 2], rot: [0, Math.PI / 2, 0], cast: false });

    /* 料面:微微隆起,电极周围下陷;铺满石英块与焦炭 */
    const top = lathe(Array.from({ length: 40 }, (_, i) => { const r = (i / 39) * R_IN; return [r, H_TOP + 0.25 * Math.cos((r / R_IN) * Math.PI * 0.5)]; }).concat([[R_IN, H_TOP - 0.01]]).reverse(),
      new THREE.MeshStandardMaterial({ color: '#57514b', roughness: 0.95, bumpMap: noiseTex({ seed: 3, repeat: [4, 4], blobs: 2000 }), bumpScale: 2 }), { ...cut, seg: 120, parent: root });
    top.material.side = THREE.DoubleSide;
    const lumpGeo = displace(new THREE.IcosahedronGeometry(0.11, 1), 0.04, 6, 2, 1);
    const quartzLump = new THREE.MeshPhysicalMaterial({ color: '#e9e5dc', roughness: 0.4, transmission: 0.25, thickness: 0.2 });
    const coke = new THREE.MeshStandardMaterial({ color: '#1a1918', roughness: 0.7, metalness: 0.2 });
    const qm = [], cm = [];
    for (let i = 0; i < 1600; i++) {
      const a = Math.PI / 2 + rand() * Math.PI * 1.5, rr = Math.sqrt(rand()) * (R_IN - 0.15);
      const x = Math.sin(a) * rr, z = Math.cos(a) * rr;
      if (ELECS.some(([ex, ez]) => Math.hypot(x - ex, z - ez) < ELEC_R + 0.12)) continue;
      const y = H_TOP + 0.25 * Math.cos((rr / R_IN) * Math.PI * 0.5) + 0.02;
      const s = 0.6 + rand() * 1.2;
      (rand() < 0.55 ? qm : cm).push(mat4([x, y, z], [rand() * 6, rand() * 6, rand() * 6], [s, s * 0.7, s]));
    }
    instanced(lumpGeo, quartzLump, qm, { parent: root });
    instanced(lumpGeo, coke, cm, { parent: root });

    /* 电极 + 电弧 */
    const graphite = M.graphite({ color: '#232325', roughness: 0.88 });
    const elecTop = 9.2;
    const arcs = [], arcLights = [];
    const arcMat = M.beam('#cfe3ff', 1);
    ELECS.forEach(([x, z], i) => {
      const h = elecTop - TIP;
      if (i === 0) {
        // 被剖开的电极:半圆柱 + 截面
        cyl(ELEC_R, ELEC_R, h, graphite, { parent: root, pos: [x, TIP + h / 2, z], t0: Math.PI / 2, tl: Math.PI });
        const capTex = noiseTex({ seed: 21, base: 70, amp: 25, srgb: true });
        mesh(new THREE.PlaneGeometry(ELEC_R * 2, h), new THREE.MeshStandardMaterial({ color: '#4a4b4f', map: capTex, roughness: 0.85 }),
          { parent: root, pos: [x, TIP + h / 2, 0.004] });
        // 电极端部炽热
        cyl(ELEC_R * 0.98, ELEC_R * 0.7, 0.25, M.hot('#ff9a40', 4), { parent: root, pos: [x, TIP - 0.1, z], t0: Math.PI / 2, tl: Math.PI });
      } else {
        cyl(ELEC_R, ELEC_R, h, graphite, { parent: root, pos: [x, TIP + h / 2, z] });
      }
      // 电极接头(每 2.4m 一节,螺纹接头处略有缝)
      for (let y = TIP + 2.2; y < elecTop; y += 2.4) torus(root, x, y, z, i === 0);
      // 电弧(只在剖开的那根可见)
      if (i === 0) {
        const arc = new THREE.Group();
        for (let k = 0; k < 3; k++) {
          const pts = [];
          for (let s = 0; s <= 8; s++) pts.push(V(x + (rand() - 0.5) * 0.25, TIP - 0.15 - (s / 8) * (TIP - 0.15 - POOL1 - 0.05), 0.03 + rand() * 0.05));
          const m = pipe(pts, 0.025 - k * 0.006, arcMat, { smooth: true, segs: 40, rs: 6, cast: false });
          arc.add(m);
        }
        root.add(arc);
        arcs.push(arc);
        // 电弧光晕
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(0.25), color: '#ffd9a0', blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
        sp.position.set(x, 1.72, 0.15); sp.scale.set(1.3, 0.8, 1); sp.material.opacity = 0.55;
        root.add(sp); arcs.push(sp);
      }
      arcLights.push(glowLight(root, '#ff9a4a', i === 0 ? 6 : 10, [x, i === 0 ? 1.9 : H_TOP + 0.3, i === 0 ? 0.6 : z], 7));
    });
    function torus(parent, x, y, z, half) {
      mesh(new THREE.TorusGeometry(ELEC_R + 0.005, 0.012, 6, 48, half ? Math.PI : Math.PI * 2), M.steelDark({ color: '#222' }), {
        parent, pos: [x, y, z], rot: [Math.PI / 2, 0, half ? 0 : 0],
      }).rotation.z = half ? Math.PI : 0;
    }

    /* 电极夹持器:铜接触瓦 + 压力环 + 水冷铜管母线 */
    const cu = M.copper({ roughness: 0.3 });
    ELECS.forEach(([x, z], i) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      root.add(g);
      const n = 8;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        if (i === 0 && Math.cos(a) > 0.05) continue; // 剖开的一半
        const shoe = box(0.36, 0.7, 0.1, cu, { parent: g, pos: [Math.sin(a) * (ELEC_R + 0.06), 4.75, Math.cos(a) * (ELEC_R + 0.06)] });
        shoe.rotation.y = a;
      }
      mesh(new THREE.TorusGeometry(ELEC_R + 0.2, 0.09, 12, 48, i === 0 ? Math.PI : Math.PI * 2), M.steel(), { parent: g, pos: [0, 5.2, 0], rot: [Math.PI / 2, 0, i === 0 ? Math.PI : 0] });
      mesh(new THREE.TorusGeometry(ELEC_R + 0.2, 0.07, 12, 48, i === 0 ? Math.PI : Math.PI * 2), M.steel(), { parent: g, pos: [0, 4.35, 0], rot: [Math.PI / 2, 0, i === 0 ? Math.PI : 0] });
      // 吊挂油缸
      for (const a of [0.6, 2.7, 4.8]) {
        if (i === 0 && Math.cos(a) > 0) continue;
        const px = Math.sin(a) * (ELEC_R + 0.45), pz = Math.cos(a) * (ELEC_R + 0.45);
        cyl(0.07, 0.07, 2.2, M.chrome(), { parent: g, pos: [px, 6.4, pz] });
        cyl(0.11, 0.11, 1.4, M.paint('#c99a2e'), { parent: g, pos: [px, 7.9, pz] });
      }
      // 铜管母线(水冷),向后方变压器延伸
      const dir = V(-0.3, 0, -1).normalize();
      for (const off of [-0.18, 0.18]) {
        const s = V(x, 5.0 + off * 0.5, z);
        pipe([s.clone().add(V(off, 0, -ELEC_R - 0.1)), s.clone().add(V(off, 1.6, -1.2)), V(x * 0.3 + off, 7.2, -6.5), V(x * 0.3 + off, 7.2, -9)], 0.06, cu, { parent: root, bend: 0.5 });
      }
    });

    /* 烟罩(1/4 剖) */
    const hood = M.steelDark({ color: '#565a60', roughness: 0.6 });
    shell([[R_OUT + 0.35, 5.6], [R_OUT + 0.35, 6.3], [2.2, 8.2], [1.2, 8.6]], 0.08, hood, { ...cut, parent: root });
    // 支柱
    for (const a of [Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75]) {
      cyl(0.12, 0.12, 5.6 - H_TOP - 0.6 + 0.6, steel, { parent: root, pos: [Math.sin(a) * (R_OUT + 0.3), H_TOP + 0.6 + (5.6 - H_TOP - 0.6) / 2 + 0.3, Math.cos(a) * (R_OUT + 0.3)] });
    }
    // 加料管
    for (let k = 0; k < 6; k++) {
      const a = Math.PI / 2 + 0.35 + k * 0.72;
      if (a > Math.PI * 2) continue;
      const e = V(Math.sin(a) * 2.7, H_TOP + 0.6, Math.cos(a) * 2.7), s = V(Math.sin(a) * 1.6, 11, Math.cos(a) * 1.6);
      pipe([s, e], 0.17, M.steelDark({ color: '#6a6e74' }), { parent: root });
    }
    // 变压器房墙
    box(16, 11, 0.5, M.matte('#2e2c2b', { map: noiseTex({ seed: 30, base: 110, srgb: true, repeat: [3, 2] }) }), { parent: root, pos: [0, 5.5, -9.5] });
    for (let k = -1; k <= 1; k++) box(1.5, 1.5, 0.2, M.paint('#3a4048'), { parent: root, pos: [k * 3.2, 7.2, -9.2] });

    /* 出硅口 + 流槽 + 硅包 */
    const tapA = -0.65; // 出硅口方位
    const tapDir = V(Math.sin(Math.PI * 2 + tapA), 0, Math.cos(tapA)).normalize();
    const tapPos = tapDir.clone().multiplyScalar(R_OUT + 0.2).setY(1.15);
    const tapG = new THREE.Group();
    tapG.position.copy(tapPos);
    tapG.lookAt(tapPos.clone().add(tapDir));
    root.add(tapG);
    box(0.9, 0.9, 0.5, M.copper({ color: '#b07050', roughness: 0.5 }), { parent: tapG, pos: [0, 0, 0.1] });
    mesh(new THREE.CircleGeometry(0.12, 24), M.hot('#ffd27a', 6), { parent: tapG, pos: [0, 0, 0.36] });
    // 流槽
    const launder = box(0.5, 0.18, 1.6, M.matte('#5b4d43'), { parent: tapG, pos: [0, -0.12, 1.15] });
    launder.rotation.x = 0.12;
    box(0.36, 0.04, 1.55, M.hot('#ffb347', 4), { parent: tapG, pos: [0, -0.02, 1.15], rot: [0.12, 0, 0] });
    // 液态硅流(曲线 + 流动贴图)
    const streamTex = noiseTex({ seed: 40, base: 200, amp: 55, repeat: [1, 3], srgb: true });
    const streamMat = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffb04a', emissiveIntensity: 5, emissiveMap: streamTex, roughness: 0.3 });
    const s0 = tapPos.clone().add(tapDir.clone().multiplyScalar(1.95)).setY(0.98);
    const ladlePos = tapPos.clone().add(tapDir.clone().multiplyScalar(2.9)).setY(0);
    pipe([s0, s0.clone().add(tapDir.clone().multiplyScalar(0.35)).setY(0.95), ladlePos.clone().setY(0.6)], 0.06, streamMat, { parent: root, smooth: true, segs: 40, cast: false });
    // 硅包
    const ladle = new THREE.Group(); ladle.position.copy(ladlePos); root.add(ladle);
    lathe([[0.55, 0.05], [0.75, 0.05], [0.9, 1.05], [0.95, 1.12], [0.82, 1.12], [0.68, 0.18], [0, 0.18]], M.steelDark({ color: '#3f3b38' }), { parent: ladle });
    mesh(new THREE.CircleGeometry(0.79, 48), M.hot('#ffb347', 3.5, { emissiveMap: noiseTex({ seed: 41, base: 200, amp: 60, srgb: true }) }), { parent: ladle, pos: [0, 0.9, 0], rot: [-Math.PI / 2, 0, 0] });
    for (const sx of [-1, 1]) cyl(0.1, 0.1, 0.25, M.steel(), { parent: ladle, pos: [sx * 0.95, 0.85, 0], rot: [0, 0, Math.PI / 2] });
    ladle.scale.setScalar(0.6);
    glowLight(root, '#ffaa55', 10, [ladlePos.x, 1.6, ladlePos.z], 6);

    /* 粒子:料面火焰、微硅粉烟气、出硅火花 */
    const flames = new Particles(root, {
      count: 200, rate: 70, intensity: 1.3,
      spawn(p) {
        let a, rr, x, z;
        do { a = Math.PI / 2 + Math.random() * Math.PI * 1.5; rr = Math.random() * (R_IN - 0.3); x = Math.sin(a) * rr; z = Math.cos(a) * rr; } while (!ELECS.some(([ex, ez]) => Math.hypot(x - ex, z - ez) < ELEC_R + 0.9));
        p.pos.set(x, H_TOP + 0.3, z);
        p.vel.set((Math.random() - 0.5) * 0.2, 0.6 + Math.random() * 0.6, (Math.random() - 0.5) * 0.2);
        p.max = 0.5 + Math.random() * 0.6;
        p.size = 0.25 + Math.random() * 0.35;
        p.color.setRGB(1, 0.4 + Math.random() * 0.3, 0.1);
        p.alpha = 0.5;
      },
    });
    const smoke = new Particles(root, {
      count: 120, rate: 12, additive: false, map: smokeTex(), intensity: 1,
      spawn(p) {
        const a = Math.PI / 2 + Math.random() * Math.PI * 1.5, rr = Math.random() * 3;
        p.pos.set(Math.sin(a) * rr, H_TOP + 0.5, Math.cos(a) * rr);
        p.vel.set((Math.random() - 0.5) * 0.25, 0.7 + Math.random() * 0.4, (Math.random() - 0.5) * 0.25);
        p.max = 5 + Math.random() * 3;
        p.size = 2 + Math.random() * 2;
        const v = 0.38 + Math.random() * 0.12;
        p.color.setRGB(v, v * 0.97, v * 0.95);
        p.alpha = 0.16;
      },
      step(p, dt) { p.pos.addScaledVector(p.vel, dt); p.size += dt * 1.1; p.vel.x += Math.sin(p.life + p.pos.y) * dt * 0.1; },
    });
    const sparks = new Particles(root, {
      count: 200, rate: 70, intensity: 3,
      spawn(p) {
        p.pos.copy(ladlePos).setY(0.58);
        const a = Math.random() * Math.PI * 2;
        p.vel.set(Math.cos(a) * (0.5 + Math.random()), 1.2 + Math.random() * 1.8, Math.sin(a) * (0.5 + Math.random()));
        p.max = 0.5 + Math.random() * 0.7; p.size = 0.08 + Math.random() * 0.1;
        p.color.setRGB(1, 0.7, 0.3);
      },
      step(p, dt) { p.vel.y -= 5 * dt; p.pos.addScaledVector(p.vel, dt); },
    });

    /* 标注 */
    label('石墨电极 ×3<small>Ø1.1~1.5 m,三相交流供电</small>', V(-PITCH / 2, 8.4, -PITCH * 0.866));
    label('电弧空腔<small>> 2000°C,弧光 + 等离子体</small>', V(PITCH + 0.75, 2.0, 0.05), null, { cls: 'hot' });
    label('液态硅熔池<small>≈ 1600~1800°C,沉在炉底</small>', V(3.0, 1.2, 0.05), null, { cls: 'hot' });
    label('料层<small>石英块 + 焦炭 + 木片</small>', V(0.3, 2.9, 0.05));
    label('碳砖炉衬 / 炉底', V(R_IN - 0.3, 0.5, 0.05));
    label('铜接触瓦<small>把数万安培电流导入电极</small>', V(PITCH + 0.45, 4.75, -0.2));
    label('水冷铜管母线', V(0.5, 7.2, -6.5));
    label('烟罩', V(-2.6, 7.6, 2.4));
    label('加料管', V(-1.9, 7.5, 1.0));
    label('出硅口 → 硅包<small>液态硅定时放出</small>', ladlePos.clone().setY(1.3), null, { cls: 'hot' });
    label('微硅粉烟气 + CO 火焰', V(-1.6, 5.2, -0.6));

    return {
      update(t, dt) {
        const f = 0.75 + Math.random() * 0.5;
        arcs.forEach((a) => { a.visible = Math.random() > 0.06; });
        arcs[1].material.opacity = 0.6 + Math.random() * 0.4;
        arcLights.forEach((l, i) => (l.intensity = (i === 0 ? 6 : 10) * f));
        secA.material.emissiveIntensity = 0.85 + Math.sin(t * 9) * 0.05 + Math.random() * 0.1;
        streamTex.offset.y -= dt * 2.5;
        flames.update(dt); smoke.update(dt); sparks.update(dt);
      },
    };
  },
};

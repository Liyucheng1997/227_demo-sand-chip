/* A4 直拉法单晶炉(剖视):热场、坩埚、熔体、晶棒实时生长 + 成品晶棒 */
import * as THREE from 'three';
import { M } from '../lib/materials.js';
import { mesh, cyl, box, rbox, lathe, shell, pipe, lights, glowLight, V, Particles, flange, smooth, lerp, clamp01 } from '../lib/kit.js';
import { canvas, rng, noiseTex, raisedFloorTex, textTex } from '../lib/textures.js';

const MELT_Y = 1.22;          // 熔体液面高度(由坩埚升降保持恒定)
const RB = 0.15;              // 晶棒半径:300mm
const CYCLE = 34;

/** 晶棒外形:籽晶 → 缩颈 → 放肩 → 等径 → (尾锥) ,返回 [r, y] 自下而上 */
function ingotProfile(body, tail = 0) {
  const p = [];
  if (tail > 0) for (let i = 0; i <= 10; i++) { const k = i / 10; p.push([RB * Math.sqrt(k) * 0.98 + 0.002, -tail + tail * k]); }
  else p.push([0.001, 0], [RB * 0.985, 0]);
  p.push([RB, 0.01], [RB, body]);
  // 放肩:近似 45° 圆弧过渡
  for (let i = 1; i <= 12; i++) { const k = i / 12; p.push([lerp(RB, 0.004, 1 - Math.cos((k * Math.PI) / 2)), body + 0.13 * Math.sin((k * Math.PI) / 2)]); }
  p.push([0.0035, body + 0.13], [0.0035, body + 0.3], [0.006, body + 0.31], [0.006, body + 0.4], [0.001, body + 0.4]);
  return p;
}

function heaterAlpha() {
  const [c, g] = canvas(512, 128);
  g.fillStyle = '#fff'; g.fillRect(0, 0, 512, 128);
  g.fillStyle = '#000';
  for (let i = 0; i < 32; i++) {
    const x = i * 16 + 6;
    if (i % 2) g.fillRect(x, 0, 4, 108); else g.fillRect(x, 20, 4, 108);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; return t;
}

function gradientTex(stops) {
  const [c, g] = canvas(4, 256);
  const grd = g.createLinearGradient(0, 256, 0, 0);
  stops.forEach(([o, col]) => grd.addColorStop(o, col));
  g.fillStyle = grd; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** 晶棒表面的生长条纹(环向细纹) */
function striTex() {
  const [c, g] = canvas(16, 512);
  const r = rng(12);
  for (let y = 0; y < 512; y++) { const v = 118 + Math.sin(y * 0.9) * 20 + r() * 25; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(0, y, 16, 1); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 3); return t;
}

export default {
  bg: ['#1a2030', '#06080c'],
  env: 0.6,
  exposure: 0.9,
  bloom: { strength: 0.5, radius: 0.45, threshold: 1.4 },
  zoom: [0.4, 30],
  views: [
    { name: '单晶炉全景', pos: [4.2, 3.6, 5.2], target: [0, 2.4, 0] },
    { name: '热场剖视', pos: [1.5, 1.75, 2.0], target: [0.05, 1.25, 0] },
    { name: '固液界面', pos: [0.55, 1.45, 0.75], target: [0.05, 1.28, 0] },
    { name: '成品晶棒', pos: [0.9, 1.25, 1.9], target: [1.9, 0.72, 0.75] },
  ],
  build({ root, label }) {
    lights(root, { key: 1.8, keyPos: [5, 9, 6], hemi: 0.35, shadow: 6, rim: 0.7 });
    const rand = rng(5);

    /* 洁净厂房高架地板 */
    mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ map: raisedFloorTex({ repeat: [50, 50] }), color: '#7d848e', roughness: 0.6, metalness: 0.2 }),
      { rot: [-Math.PI / 2, 0, 0], parent: root, cast: false });

    const cut = { phi0: Math.PI / 2, phiLen: Math.PI * 1.5 };
    const ss = M.steel({ rep: [3, 2] });
    const ssDark = M.steelDark({ color: '#9aa0a8' });

    /* 机架 */
    for (const [x, z] of [[-0.75, -0.75], [0.75, -0.75], [-0.75, 0.75]]) cyl(0.05, 0.05, 0.8, ssDark, { parent: root, pos: [x, 0.4, z], seg: 16 });
    box(1.8, 0.08, 1.8, M.paint('#9aa1aa'), { parent: root, pos: [0, 0.8, 0] });

    /* 下炉室(双层水冷不锈钢)*/
    const lowProf = [[0.78, 0.84], [0.78, 1.95]];
    for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI / 2; lowProf.push([0.28 + 0.5 * Math.cos(a), 1.95 + 0.38 * Math.sin(a)]); }
    shell(lowProf, 0.05, ss, { ...cut, parent: root, capMat: ssDark });
    flange(0.82, ss, { cut: true, parent: root, pos: [0, 1.95, 0], bolts: 36, t: 0.025 });
    // 观察窗(朝向熔体的斜视窗)
    [Math.PI * 0.85, Math.PI * 1.35].forEach((a) => {
      const g = new THREE.Group();
      g.position.set(Math.sin(a) * 0.62, 2.22, Math.cos(a) * 0.62);
      g.lookAt(Math.sin(a) * 2, 3.0, Math.cos(a) * 2);
      root.add(g);
      cyl(0.07, 0.07, 0.2, ss, { parent: g, rot: [Math.PI / 2, 0, 0], pos: [0, 0, 0.08] });
      mesh(new THREE.CircleGeometry(0.055, 24), M.emissive('#ffb060', 2.5), { parent: g, pos: [0, 0, 0.181] });
    });
    // 隔离阀 + 副炉室(提拉室)
    rbox(0.7, 0.18, 0.45, 0.03, M.paint('#cfd4da'), { parent: root, pos: [0, 2.42, 0] }).visible = true;
    shell([[0.27, 2.5], [0.27, 5.0]], 0.035, ss, { ...cut, parent: root, capMat: ssDark });
    flange(0.3, ss, { cut: true, parent: root, pos: [0, 2.52, 0], bolts: 16, t: 0.02 });
    flange(0.3, ss, { cut: true, parent: root, pos: [0, 4.98, 0], bolts: 16, t: 0.02 });
    // 提拉头:钢丝绳卷筒 + 晶转电机
    const head = new THREE.Group(); head.position.y = 5.0; root.add(head);
    cyl(0.3, 0.3, 0.12, ss, { parent: head, pos: [0, 0.06, 0] });
    rbox(0.55, 0.42, 0.45, 0.04, M.paint('#e8ebee'), { parent: head, pos: [0, 0.35, 0] });
    cyl(0.12, 0.12, 0.5, M.paint('#3a3f46'), { parent: head, pos: [0, 0.35, 0.32], rot: [Math.PI / 2, 0, 0] });
    const drumRot = cyl(0.1, 0.1, 0.3, M.chrome(), { parent: head, pos: [0, 0.35, -0.3], rot: [0, 0, Math.PI / 2] });
    // 炉体旁的水冷管与氩气管
    pipe([[0.85, 0.9, -0.3], [0.85, 2.0, -0.3], [0.5, 2.6, -0.3], [0.32, 3.2, -0.15]], 0.025, M.steel(), { parent: root });
    pipe([[-0.85, 0.9, -0.3], [-0.85, 1.6, -0.3], [-0.79, 1.6, -0.3]], 0.025, M.steel(), { parent: root });
    pipe([[0.32, 4.7, -0.12], [0.55, 4.7, -0.12], [0.55, 5.7, -0.12], [1.4, 5.7, -0.12]], 0.022, M.copper(), { parent: root });
    // 控制柜
    const cab = new THREE.Group(); cab.position.set(-1.8, 0, -0.6); root.add(cab);
    rbox(0.8, 1.9, 0.6, 0.03, M.paint('#e4e7ea'), { parent: cab, pos: [0, 0.95, 0] });
    box(0.5, 0.36, 0.02, M.emissive('#5fb4ff', 0.9), { parent: cab, pos: [0, 1.45, 0.31] });
    box(0.5, 0.36, 0.01, M.plastic('#111'), { parent: cab, pos: [0, 1.45, 0.305] });

    /* 热场:保温毡 + 石墨加热器 + 石墨托 + 石英坩埚 + 热屏 */
    const felt = new THREE.MeshStandardMaterial({ color: '#2a2b2d', roughness: 1, bumpMap: noiseTex({ seed: 8, blobs: 3000, scale: 0.15, repeat: [4, 4] }), bumpScale: 2 });
    shell([[0.7, 0.88], [0.7, 1.75]], 0.1, felt, { ...cut, parent: root });
    lathe([[0.001, 0.88], [0.7, 0.88], [0.7, 0.96], [0.001, 0.96]], felt, { ...cut, parent: root });
    const hAlpha = heaterAlpha();
    hAlpha.repeat.set(3, 1);
    const heaterMat = new THREE.MeshStandardMaterial({ color: '#3a2214', emissive: '#ff8a3a', emissiveIntensity: 2.6, alphaMap: hAlpha, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7 });
    const heater = cyl(0.5, 0.5, 0.62, heaterMat, { parent: root, pos: [0, 1.2, 0], open: true, seg: 96, t0: Math.PI / 2, tl: Math.PI * 1.5 });
    glowLight(root, '#ff9a50', 3, [0, 1.3, 0.3], 2.5);

    const crucible = new THREE.Group(); root.add(crucible);
    const graphite = M.graphite({ color: '#3a3b3f' });
    shell([[0.43, 0.98], [0.43, 1.35]], 0.035, graphite, { ...cut, parent: crucible, capMat: M.matte('#55565a') });
    lathe([[0.001, 0.93], [0.43, 0.93], [0.43, 0.99], [0.001, 0.99]], graphite, { ...cut, parent: crucible });
    cyl(0.06, 0.06, 0.4, graphite, { parent: crucible, pos: [0, 0.75, 0] });
    // 石英坩埚:内层透明、外层含气泡呈乳白
    const qProf = [[0.395, 1.38], [0.395, 1.1]];
    for (let i = 1; i <= 8; i++) { const a = (i / 8) * Math.PI / 2; qProf.push([0.395 - 0.12 * (1 - Math.cos(a)) - 0.0 * i, 1.1 - 0.1 * Math.sin(a)]); }
    qProf.push([0.001, 1.0]);
    shell(qProf.reverse(), 0.018, new THREE.MeshPhysicalMaterial({ color: '#f3efe6', roughness: 0.35, transmission: 0.3, thickness: 0.05 }), { ...cut, parent: crucible, capMat: M.matte('#efe9dc') });
    // 熔体:液面 + 剖面
    const meltTex = noiseTex({ seed: 50, base: 210, amp: 45, blobs: 1500, srgb: true });
    const meltMat = new THREE.MeshStandardMaterial({ color: '#2a1206', emissive: '#ffb050', emissiveIntensity: 3.2, emissiveMap: meltTex, roughness: 0.08, metalness: 0.3 });
    const meltProf = [[0.001, 1.004], ...qProf.filter(([r, y]) => y <= MELT_Y && r > 0.01).map(([r, y]) => [r - 0.019, y + 0.004]), [0.376, MELT_Y], [0.001, MELT_Y]];
    shell(meltProf, 0, meltMat, { ...cut, solid: true, parent: crucible, capMat: meltMat });
    // 热屏(钼 / 石墨涂层倒锥)
    shell([[0.42, 1.62], [0.2, 1.31]], 0.03, M.steelDark({ color: '#6f747b', roughness: 0.35 }), { ...cut, parent: root, capMat: M.matte('#55595f') });
    mesh(new THREE.TorusGeometry(0.41, 0.012, 8, 64, Math.PI * 1.5), ssDark, { parent: root, pos: [0, 1.62, 0], rot: [Math.PI / 2, 0, Math.PI / 2] });

    /* 晶棒 */
    const finMat = M.silicon({ color: '#808893', roughness: 0.16, bumpMap: striTex(), bumpScale: 0.4 });
    const clip = [new THREE.Plane(new THREE.Vector3(0, 1, 0), -MELT_Y)];
    const crystalMat = M.silicon({ color: '#808893', roughness: 0.16, clippingPlanes: clip });
    const crystal = new THREE.Group(); root.add(crystal);
    let ingot = null;
    const hotTex = gradientTex([[0, 'rgba(255,200,120,1)'], [0.25, 'rgba(255,120,40,0.55)'], [1, 'rgba(0,0,0,0)']]);
    const hotMat = new THREE.MeshBasicMaterial({ map: hotTex, clippingPlanes: clip, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const hotSleeve = cyl(RB + 0.002, RB + 0.002, 0.3, hotMat, { parent: crystal, pos: [0, 0.15, 0], open: true, cast: false });
    const ridges = [];
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const rdg = box(0.006, 1, 0.006, crystalMat, { parent: crystal, pos: [Math.cos(a) * RB, 0.5, Math.sin(a) * RB], rot: [0, -a, 0] });
      ridges.push(rdg);
    }
    // 弯月面光环
    const menis = mesh(new THREE.TorusGeometry(RB + 0.006, 0.0045, 10, 96), M.emissive('#ffe2a8', 3), { parent: root, pos: [0, MELT_Y + 0.004, 0], rot: [Math.PI / 2, 0, 0], cast: false });
    // 籽晶夹头 + 钢丝绳
    const chuck = cyl(0.018, 0.012, 0.06, M.chrome(), { parent: crystal, pos: [0, 0.4, 0] });
    const cableGeo = new THREE.CylinderGeometry(0.0025, 0.0025, 1, 6); cableGeo.translate(0, 0.5, 0);
    const cable = mesh(cableGeo, M.chrome(), { parent: root });

    /* 氩气(自上而下吹扫) */
    const argon = new Particles(root, {
      count: 160, rate: 40, intensity: 0.5,
      spawn(p) { const a = Math.random() * Math.PI * 2, r = 0.16 + Math.random() * 0.08; p.pos.set(Math.cos(a) * r, 2.8 + Math.random() * 1.5, Math.sin(a) * r); p.vel.set(0, -0.5, 0); p.max = 4; p.size = 0.012; p.color.setRGB(0.6, 0.8, 1); p.alpha = 0.7; },
      step(p, dt) {
        p.pos.addScaledVector(p.vel, dt);
        if (p.pos.y < 1.45) { const r = Math.hypot(p.pos.x, p.pos.z); p.vel.set(p.pos.x / r * 0.4, -0.15, p.pos.z / r * 0.4); }
      },
    });

    /* 成品晶棒(躺在托架上) */
    const fin = new THREE.Group(); fin.position.set(2.2, 0.72, 0.9); fin.rotation.set(0, -0.5, Math.PI / 2); root.add(fin);
    lathe(ingotProfile(1.6, 0.12), finMat, { parent: fin, pos: [0, -0.8, 0], seg: 128 });
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      box(0.006, 1.6, 0.006, finMat, { parent: fin, pos: [Math.cos(a) * RB, 0, Math.sin(a) * RB], rot: [0, -a, 0] });
    }
    const cradle = new THREE.Group(); cradle.position.set(2.2, 0, 0.9); cradle.rotation.y = -0.5; root.add(cradle);
    for (const x of [-0.55, 0.55]) {
      box(0.08, 0.5, 0.36, M.paint('#3e66a8'), { parent: cradle, pos: [0, 0.25, 0] }).position.x = x;
      box(0.1, 0.06, 0.36, M.rubber(), { parent: cradle, pos: [x, 0.53, 0] });
    }
    box(1.4, 0.06, 0.4, M.paint('#3e66a8'), { parent: cradle, pos: [0, 0.03, 0] });
    mesh(new THREE.PlaneGeometry(0.42, 0.1), new THREE.MeshBasicMaterial({ map: textTex(['<100> P-type  Ø300mm'], { w: 512, h: 120, font: 'bold 42px Consolas', color: '#2b3d5c', bg: '#f2f2f0' }) }),
      { parent: cradle, pos: [0, 0.3, 0.181], cast: false });

    /* 标注 */
    label('单晶硅棒(生长中)<small>直径 300mm,晶转 ~10 rpm</small>', V(0.08, 1.9, 0.12));
    label('固液界面 / 弯月面', V(0.16, MELT_Y + 0.02, 0.05), null, { cls: 'hot' });
    label('硅熔体 1420°C', V(0.3, 1.12, 0.02), null, { cls: 'hot' });
    label('石英坩埚<small>由石墨托支撑,反向旋转并逐渐上升</small>', V(0.4, 1.05, 0.0));
    label('石墨加热器<small>电阻加热,蛇形开槽</small>', V(0.5, 1.45, 0.0), null, { cls: 'hot' });
    label('热屏<small>控制温度梯度与氩气流</small>', V(0.32, 1.52, 0.0));
    label('保温毡', V(0.66, 1.65, 0.0));
    label('副炉室(提拉室)', V(0.28, 4.2, 0.0));
    label('提拉头:钢丝绳卷筒 + 晶转电机', V(0.25, 5.6, 0.2));
    label('观察窗', V(-0.5, 2.4, -0.3));
    label('成品晶棒<small>可见 4 条 <100> 生长棱线</small>', V(2.2, 0.92, 0.9));
    const stage = label('', V(-0.1, 2.75, 0.3), null, { cls: 'big' });

    const ridgeOffsets = ridges.map((r) => r.position.clone());
    let lastBody = -1;
    return {
      update(t, dt) {
        const k = (t % CYCLE) / CYCLE;
        // 0-0.08 引晶/缩颈, 0.08-0.16 放肩, 0.16-0.95 等径
        const neck = smooth(0, 0.08, k), shoulder = smooth(0.08, 0.16, k), body = smooth(0.16, 0.95, k) * 1.25;
        // 晶体最底部(界面)位于 MELT_Y;按阶段确定可见部分长度
        const bodyLen = body;
        const q = Math.round(bodyLen * 200) / 200;
        if (q !== lastBody) {
          lastBody = q;
          if (ingot) { crystal.remove(ingot); ingot.geometry.dispose(); }
          const prof = ingotProfile(Math.max(0.001, q)).filter(([, y]) => true);
          ingot = lathe(prof, crystalMat, { seg: 96 });
          crystal.add(ingot);
        }
        // 放肩前只露出缩颈与籽晶
        const reveal = (1 - shoulder) * 0.13 + (1 - neck) * 0.17;
        crystal.position.y = MELT_Y - reveal;
        ingot.visible = true;
        hotSleeve.scale.y = 1; hotSleeve.position.y = 0.15 + reveal * 0;
        hotSleeve.visible = shoulder > 0.5;
        ridges.forEach((r, i) => { r.scale.y = Math.max(0.001, q); r.position.y = q / 2; r.visible = q > 0.02; });
        chuck.position.y = q + 0.42;
        menis.visible = true;
        menis.scale.setScalar(lerp(0.05, 1, shoulder));
        crystal.rotation.y += dt * 1.0;
        const topY = crystal.position.y + q + 0.45;
        cable.position.y = topY; cable.scale.y = 5.2 - topY;
        drumRot.rotation.x += dt * 0.6;
        meltTex.offset.x += dt * 0.02; meltTex.rotation += dt * 0.05;
        heaterMat.emissiveIntensity = 2.6 + Math.sin(t * 2) * 0.15;
        argon.update(dt);
        const st = k < 0.08 ? '① 引晶 · 缩颈(排除位错)' : k < 0.16 ? '② 放肩:直径扩大到 300mm' : k < 0.95 ? `③ 等径生长 · 已拉 ${Math.round(q * 1000)} mm` : '④ 收尾';
        stage.element.querySelector('.txt').innerHTML = st;
      },
    };
  },
};

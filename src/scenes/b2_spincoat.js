/* B2 旋涂光刻胶(黄光区):涂胶杯剖视、滴胶臂、胶液铺展与甩胶、薄膜干涉色、软烘热板 */
import * as THREE from 'three';
import { M } from '../lib/materials.js';
import { mesh, cyl, box, rbox, lathe, shell, pipe, lights, V, Particles, smooth, lerp } from '../lib/kit.js';
import { cleanroom, waferGeometry } from '../lib/fab.js';

const WY = 1.0, CYCLE = 16;

export default {
  bg: ['#8f8770', '#4d4838'],
  env: 0.55,
  exposure: 0.9,
  bloom: { strength: 0.35, threshold: 1.8 },
  zoom: [0.15, 15],
  views: [
    { name: '涂胶显影机', pos: [1.25, 1.65, 1.35], target: [0.2, 1.0, 0] },
    { name: '旋涂特写', pos: [0.3, 1.32, 0.42], target: [0, 1.0, 0] },
    { name: '软烘热板', pos: [1.25, 1.35, 0.75], target: [0.75, 1.0, 0] },
    { name: '膜层剖面', pos: [-0.45, 1.3, 0.8], target: [-0.6, 1.08, 0.25] },
  ],
  build({ root, label }) {
    lights(root, { key: 1.1, keyColor: '#ffd98a', keyPos: [2, 6, 3], hemi: 0.4, sky: '#ffe2a0', ground: '#4a4130', shadow: 2.5, rim: 0.4, rimColor: '#ffcc66' });
    cleanroom(root, { yellow: true, rows: [[-4.2, 0], [4.2, Math.PI]] });

    /* 机台(Track) */
    const paint = M.paint('#d6cfb8');
    rbox(1.9, 0.9, 1.0, 0.02, paint, { parent: root, pos: [0.3, 0.45, -0.05] });
    box(1.9, 0.03, 1.0, M.plastic('#8c9096', { roughness: 0.5 }), { parent: root, pos: [0.3, 0.915, -0.05] });
    rbox(1.9, 0.9, 0.12, 0.02, paint, { parent: root, pos: [0.3, 1.38, -0.5] });

    /* 涂胶杯(剖视) */
    const cut = { phi0: Math.PI / 2, phiLen: Math.PI * 1.5 };
    const cupMat = M.plastic('#e8e4da', { roughness: 0.3 });
    shell([[0.22, 0.93], [0.24, 1.02], [0.235, 1.07], [0.19, 1.1]], 0.012, cupMat, { ...cut, parent: root, capMat: M.matte('#cfc9bb') });
    // 胶在杯壁上的残留
    shell([[0.226, 0.96], [0.228, 1.02], [0.224, 1.06]], 0.002, new THREE.MeshPhysicalMaterial({ color: '#c8641e', transparent: true, opacity: 0.55, roughness: 0.1 }), { ...cut, parent: root });
    // 真空吸盘
    const chuck = cyl(0.05, 0.05, 0.03, M.plastic('#2b2f35'), { parent: root, pos: [0, WY - 0.02, 0] });
    cyl(0.015, 0.015, 0.1, M.steel(), { parent: root, pos: [0, WY - 0.08, 0] });

    /* 晶圆 + 光刻胶膜 */
    const spin = new THREE.Group(); spin.position.y = WY; root.add(spin);
    const waferMat = M.thinFilm(100, 1.46, '#a8afb8');
    const wafer = mesh(waferGeometry(), waferMat, { parent: spin });
    const film = new THREE.MeshPhysicalMaterial({
      color: '#e39a52', transparent: true, opacity: 0.55, roughness: 0.04, metalness: 0, clearcoat: 1,
      iridescence: 1, iridescenceIOR: 1.65, iridescenceThicknessRange: [900, 900], depthWrite: false,
    });
    const puddle = mesh(new THREE.CylinderGeometry(1, 1, 1, 96), film, { parent: spin, pos: [0, 0.0006, 0], scale: [0.001, 0.0004, 0.001], cast: false });
    const notchMark = box(0.01, 0.0015, 0.004, M.plastic('#2b2f35'), { parent: spin, pos: [0, 0.0006, 0.147] });

    /* 滴胶臂 */
    const arm = new THREE.Group(); arm.position.set(-0.38, 1.18, -0.25); root.add(arm);
    cyl(0.03, 0.03, 0.28, M.steel(), { parent: root, pos: [-0.38, 1.04, -0.25] });
    box(0.06, 0.05, 0.06, paint, { parent: arm });
    const beam = box(0.44, 0.025, 0.035, M.steel(), { parent: arm, pos: [0.22, 0, 0] });
    const nozzle = new THREE.Group(); nozzle.position.set(0.44, -0.04, 0); arm.add(nozzle);
    cyl(0.01, 0.006, 0.07, M.plastic('#f3f3f3'), { parent: nozzle });
    pipe([[0.0, 0.03, 0], [0.0, 0.06, 0], [-0.44, 0.06, 0]], 0.004, M.plastic('#c86a24', { roughness: 0.2 }), { parent: nozzle });
    const stream = cyl(0.0025, 0.0025, 1, new THREE.MeshPhysicalMaterial({ color: '#c8641e', roughness: 0.05, transparent: true, opacity: 0.85 }), { parent: root, cast: false });
    // 边缘去胶喷嘴(EBR)
    cyl(0.004, 0.004, 0.05, M.steel(), { parent: root, pos: [0.15, WY + 0.04, -0.03], rot: [0, 0, 0.5] });

    /* 甩出的胶滴 */
    const fling = new Particles(root, {
      count: 260, rate: 0, additive: false, intensity: 1,
      spawn(p) {
        const a = Math.random() * Math.PI * 2;
        p.pos.set(Math.cos(a) * 0.15, WY + 0.002, Math.sin(a) * 0.15);
        const v = 0.6 + Math.random() * 0.5;
        p.vel.set(-Math.sin(a) * v + Math.cos(a) * 0.3, 0.05 + Math.random() * 0.1, Math.cos(a) * v + Math.sin(a) * 0.3);
        p.max = 0.4; p.size = 0.004 + Math.random() * 0.004; p.color.setRGB(0.78, 0.4, 0.12); p.alpha = 0.95;
      },
      step(p, dt) { p.pos.addScaledVector(p.vel, dt); p.vel.y -= 1.5 * dt; if (Math.hypot(p.pos.x, p.pos.z) > 0.215) p.life = p.max; },
    });

    /* 软烘热板 */
    const hp = new THREE.Group(); hp.position.set(0.75, 0.93, 0); root.add(hp);
    rbox(0.42, 0.06, 0.42, 0.01, M.steelDark({ color: '#8d9299' }), { parent: hp, pos: [0, 0.03, 0] });
    cyl(0.17, 0.17, 0.012, M.alu({ roughness: 0.25 }), { parent: hp, pos: [0, 0.066, 0], seg: 64 });
    for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2; cyl(0.003, 0.003, 0.03, M.chrome(), { parent: hp, pos: [Math.cos(a) * 0.08, 0.075, Math.sin(a) * 0.08], seg: 8 }); }
    mesh(waferGeometry(), new THREE.MeshPhysicalMaterial({ color: '#b4672a', metalness: 0.6, roughness: 0.06, iridescence: 1, iridescenceIOR: 1.65, iridescenceThicknessRange: [420, 420] }), { parent: hp, pos: [0, 0.074, 0] });
    // 热板盖(抬起)
    const lid = new THREE.Group(); lid.position.set(0, 0.2, -0.05); lid.rotation.x = -0.35; hp.add(lid);
    rbox(0.42, 0.04, 0.42, 0.01, M.steel(), { parent: lid });
    // 热气流
    const heat = new Particles(root, {
      count: 60, rate: 12, intensity: 0.35,
      spawn(p) { p.pos.set(0.75 + (Math.random() - 0.5) * 0.25, 1.01, (Math.random() - 0.5) * 0.25); p.vel.set(0, 0.06, 0); p.max = 2; p.size = 0.03; p.color.setRGB(1, 0.85, 0.6); p.alpha = 0.25; },
    });

    /* 膜层剖面块 */
    const blk = new THREE.Group(); blk.position.set(-0.6, 0.93, 0.25); root.add(blk);
    box(0.3, 0.1, 0.18, new THREE.MeshStandardMaterial({ color: '#59616d', metalness: 0.6, roughness: 0.4 }), { parent: blk, pos: [0, 0.05, 0] });
    box(0.3, 0.012, 0.18, new THREE.MeshPhysicalMaterial({ color: '#bfe4ee', transparent: true, opacity: 0.6, roughness: 0.05 }), { parent: blk, pos: [0, 0.106, 0] });
    const resBlk = box(0.3, 1, 0.18, new THREE.MeshPhysicalMaterial({ color: '#d27a2a', transparent: true, opacity: 0.75, roughness: 0.1, clearcoat: 1 }), { parent: blk });

    label('涂胶杯(剖视)<small>收集甩出的多余光刻胶</small>', V(-0.1, 1.08, 0.2));
    label('真空吸盘', V(0.04, WY - 0.03, 0.06));
    label('滴胶喷嘴', V(0.06, 1.16, -0.25));
    label('光刻胶膜<small>干涉色随厚度变化</small>', V(0.07, WY + 0.005, 0.08));
    label('边缘去胶(EBR)喷嘴', V(0.16, WY + 0.07, -0.03));
    label('软烘热板 100°C<small>烘掉溶剂,胶膜固化</small>', V(0.75, 1.03, 0.1));
    label('Si 衬底 / SiO₂ / 光刻胶', V(-0.6, 1.13, 0.34));
    label('黄光照明<small>滤除 <500nm 波长,防止胶感光</small>', V(-1.0, 3.5, 0.5));
    const st = label('', V(-0.05, 1.3, 0.0), null, { cls: 'big' });

    let rpm = 0;
    return {
      update(t, dt) {
        const k = (t % CYCLE) / CYCLE;
        // 手臂:移入 → 滴胶 → 移出
        const armIn = smooth(0.0, 0.12, k) * (1 - smooth(0.32, 0.42, k));
        arm.rotation.y = lerp(1.0, -0.58, armIn);
        const dispensing = k > 0.13 && k < 0.3;
        nozzle.updateMatrixWorld(true);
        const np = new THREE.Vector3(); nozzle.getWorldPosition(np);
        stream.visible = dispensing;
        stream.position.set(np.x, (np.y - 0.035 + WY) / 2, np.z); stream.scale.y = np.y - 0.035 - WY;
        // 转速曲线:低速铺展 → 高速甩胶 → 减速
        const target = k < 0.3 ? 500 : k < 0.75 ? 4000 : k < 0.85 ? 1000 : 0;
        rpm += (target - rpm) * Math.min(1, dt * 3);
        spin.rotation.y += (rpm / 60) * Math.PI * 2 * dt * 0.05; // 视觉上放慢
        // 胶液半径与厚度
        const r = k < 0.13 ? 0.001 : lerp(0.02, 0.06, smooth(0.13, 0.3, k)) + smooth(0.3, 0.45, k) * 0.09;
        const thick = lerp(0.004, 0.0004, smooth(0.3, 0.7, k));
        puddle.scale.set(Math.min(0.1503, r), thick, Math.min(0.1503, r));
        puddle.position.y = thick / 2 + 0.0004;
        const nm = lerp(3200, 850, smooth(0.3, 0.75, k));
        film.iridescenceThicknessRange = [nm, nm];
        film.opacity = lerp(0.85, 0.22, smooth(0.3, 0.7, k));
        // 胶膜铺满后,晶圆的反射色由胶层干涉决定
        const covered = smooth(0.4, 0.46, k);
        const wnm = lerp(100, nm, covered);
        waferMat.iridescenceThicknessRange = [wnm, wnm];
        waferMat.iridescenceIOR = lerp(1.46, 1.65, covered);
        puddle.visible = k > 0.13;
        fling.rate = k > 0.32 && k < 0.6 ? 260 : 0;
        fling.update(dt); heat.update(dt);
        resBlk.scale.y = lerp(0.001, 0.05, smooth(0.13, 0.4, k)) * lerp(1, 0.5, smooth(0.3, 0.75, k));
        resBlk.position.y = 0.112 + resBlk.scale.y / 2;
        resBlk.visible = k > 0.13;
        const phase = k < 0.13 ? '机械臂移入' : k < 0.3 ? '滴胶 · 低速铺展 500 rpm' : k < 0.75 ? `高速甩胶 ${Math.round(rpm)} rpm` : '减速 · 边缘去胶';
        st.element.querySelector('.txt').innerHTML = `${phase} · 胶厚 ≈ ${Math.round(nm)} nm`;
      },
    };
  },
};

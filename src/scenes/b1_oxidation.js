/* B1 立式氧化炉:石英炉管 + 晶舟升降 + 薄膜干涉色(物理计算)+ 氧化层剖面 + 颜色对照卡 */
import * as THREE from 'three';
import { M } from '../lib/materials.js';
import { mesh, cyl, box, rbox, lathe, shell, pipe, lights, glowLight, V, Particles, instanced, mat4, smooth, lerp } from '../lib/kit.js';
import { cleanroom, waferGeometry } from '../lib/fab.js';
import { textTex } from '../lib/textures.js';

const CYCLE = 30, TMAX = 320; // 最终氧化层厚度 nm
const Y0 = 1.45, NW = 46, WP = 0.024;

const oxideMat = (nm) => new THREE.MeshPhysicalMaterial({
  color: '#b4bac2', metalness: 1, roughness: 0.05,
  iridescence: 1, iridescenceIOR: 1.46, iridescenceThicknessRange: [nm, nm],
});

export default {
  bg: ['#9aa3ad', '#5d656f'],
  env: 0.6,
  exposure: 0.85,
  bloom: { strength: 0.45, radius: 0.5, threshold: 1.8 },
  zoom: [0.2, 20],
  views: [
    { name: '立式炉剖视', pos: [2.6, 2.4, 3.0], target: [0, 1.75, 0] },
    { name: '晶舟与炉管', pos: [0.95, 2.15, 1.05], target: [0, 1.95, 0] },
    { name: '氧化层剖面', pos: [-1.2, 1.55, 1.75], target: [-1.35, 1.2, 0.6] },
    { name: '干涉色对照', pos: [1.35, 1.55, 1.45], target: [1.35, 0.98, 0.72] },
  ],
  build({ root, label }) {
    lights(root, { key: 1.2, keyPos: [3, 7, 4], hemi: 0.45, shadow: 3.5, rim: 0.6, sky: '#ffffff', ground: '#8a9099' });
    cleanroom(root, { rows: [[-4.2, 0]] });
    const cut = { phi0: Math.PI / 2, phiLen: Math.PI * 1.5 };

    /* 炉体机柜(下部装载区 + 上部加热炉) */
    const paint = M.paint('#d4d8dd');
    const cab = new THREE.Group(); root.add(cab);
    box(1.3, 1.25, 0.08, paint, { parent: cab, pos: [0, 0.625, -0.65] });
    box(0.08, 1.25, 1.3, paint, { parent: cab, pos: [-0.65, 0.625, 0] });
    box(1.3, 0.05, 1.3, M.steel(), { parent: cab, pos: [0, 1.25, 0] });
    box(1.3, 0.04, 1.3, M.steel(), { parent: cab, pos: [0, 0.02, 0] });

    /* 加热炉:不锈钢外壳 → 保温层 → 电阻丝 → 石英管 */
    shell([[0.55, 1.28], [0.55, 3.05]], 0.03, M.steel({ rep: [2, 3] }), { ...cut, parent: root, capMat: M.steelDark() });
    lathe([[0.001, 3.05], [0.55, 3.05], [0.55, 3.1], [0.001, 3.1]], M.steel(), { ...cut, parent: root });
    const fiber = new THREE.MeshStandardMaterial({ color: '#cfc6b6', roughness: 1 });
    shell([[0.52, 1.3], [0.52, 3.05]], 0.17, fiber, { ...cut, parent: root, capMat: M.matte('#e6dccb') });
    lathe([[0.001, 2.9], [0.52, 2.9], [0.52, 3.05], [0.001, 3.05]], fiber, { ...cut, parent: root });
    // 螺旋电阻丝(Kanthal),分三个温区
    const coilMat = M.hot('#ff7b2e', 1.5);
    // 石英炉管(钟形顶)
    const quartz = M.quartz({ thickness: 0.02, roughness: 0.03 });
    const tubeProf = [[0.27, 1.32], [0.27, 2.75]];
    for (let i = 1; i <= 10; i++) { const a = (i / 10) * Math.PI / 2; tubeProf.push([Math.max(0.001, 0.27 * Math.cos(a)), 2.75 + 0.12 * Math.sin(a)]); }
    shell(tubeProf, 0.006, quartz, { ...cut, parent: root, capMat: quartz });
    // 进气喷射管
    pipe([[0.235, 1.2, -0.08], [0.235, 2.8, -0.08]], 0.008, quartz, { parent: root, cast: false });
    pipe([[0.3, 1.18, -0.6], [0.235, 1.18, -0.08], [0.235, 1.22, -0.08]], 0.01, M.steel(), { parent: root });

    /* 晶舟 + 保温帽 + 升降平台 */
    const boat = new THREE.Group(); root.add(boat);
    const qBoat = new THREE.MeshPhysicalMaterial({ color: '#f6f8fb', roughness: 0.15, transmission: 0.6, thickness: 0.02 });
    for (const a of [0.5, 2.6, 3.7, 5.8]) cyl(0.008, 0.008, NW * WP + 0.06, qBoat, { parent: boat, pos: [Math.cos(a) * 0.155, Y0 + (NW * WP) / 2, Math.sin(a) * 0.155], seg: 10 });
    cyl(0.17, 0.17, 0.012, qBoat, { parent: boat, pos: [0, Y0 - 0.02, 0] });
    cyl(0.17, 0.17, 0.012, qBoat, { parent: boat, pos: [0, Y0 + NW * WP + 0.03, 0] });
    // 保温帽(石英翅片堆叠)
    for (let i = 0; i < 6; i++) cyl(0.2, 0.2, 0.006, qBoat, { parent: boat, pos: [0, Y0 - 0.06 - i * 0.03, 0] });
    cyl(0.03, 0.03, 0.2, qBoat, { parent: boat, pos: [0, Y0 - 0.14, 0] });
    cyl(0.31, 0.31, 0.03, M.steel(), { parent: boat, pos: [0, Y0 - 0.25, 0] }); // 炉口密封盖
    const wMat = oxideMat(1);
    const wGeo = waferGeometry();
    instanced(wGeo, wMat, Array.from({ length: NW }, (_, i) => mat4([0, Y0 + 0.01 + i * WP, 0], [0, i * 0.7, 0], 1)), { parent: boat });
    // 升降丝杠
    cyl(0.025, 0.025, 1.2, M.chrome(), { parent: root, pos: [-0.45, 0.62, -0.45] });
    const arm = box(0.5, 0.04, 0.08, M.steel(), { parent: boat, pos: [-0.25, Y0 - 0.27, -0.25], rot: [0, -Math.PI / 4, 0] });

    /* 炉内辉光与气流 */
    const glow = glowLight(root, '#ff8a3a', 3, [0, 2.1, 0.15], 1.6);
    const gas = new Particles(root, {
      count: 160, rate: 50, intensity: 0.6,
      spawn(p) { p.pos.set(0.235, 1.3 + Math.random() * 1.4, -0.08); p.vel.set(-0.15 - Math.random() * 0.1, 0.2, (Math.random() - 0.5) * 0.1); p.max = 1.5; p.size = 0.012; p.color.setRGB(0.6, 0.85, 1); p.alpha = 0.6; },
      step(p, dt) { p.pos.addScaledVector(p.vel, dt); if (Math.hypot(p.pos.x, p.pos.z) > 0.25) p.vel.multiplyScalar(-0.5); },
    });

    /* 氧化层剖面模型(左侧展台) */
    const sec = new THREE.Group(); sec.position.set(-1.35, 0.95, 0.6); root.add(sec);
    rbox(0.6, 0.9, 0.5, 0.02, paint, { parent: root, pos: [-1.35, 0.45, 0.6] });
    const siBlk = box(0.4, 0.16, 0.25, new THREE.MeshStandardMaterial({ color: '#59616d', metalness: 0.6, roughness: 0.4 }), { parent: sec, pos: [0, 0.08, 0] });
    const oxBlk = box(0.4, 1, 0.25, new THREE.MeshPhysicalMaterial({ color: '#cfe9f2', transparent: true, opacity: 0.55, roughness: 0.05, transmission: 0.5, thickness: 0.05 }), { parent: sec, pos: [0, 0.2, 0] });
    const origLine = box(0.42, 0.002, 0.26, M.emissive('#ff5a3a', 2), { parent: sec, pos: [0, 0.16, 0], cast: false });
    const topSkin = box(0.4, 0.001, 0.25, oxideMat(1), { parent: sec, pos: [0, 0.2, 0] });

    /* 干涉色对照卡:不同厚度 SiO₂ 的真实颜色 */
    const card = new THREE.Group(); card.position.set(1.35, 0.93, 0.75); card.rotation.x = 0.55; root.add(card);
    rbox(0.95, 0.9, 0.5, 0.02, paint, { parent: root, pos: [1.35, 0.45, 0.75] });
    box(0.9, 0.012, 0.3, M.plastic('#1b1e23'), { parent: card });
    const chart = [0, 50, 100, 150, 200, 250, 300, 400];
    chart.forEach((nm, i) => {
      const x = -0.385 + i * 0.11;
      mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.003, 48), oxideMat(Math.max(1, nm)), { parent: card, pos: [x, 0.008, -0.03] });
      mesh(new THREE.PlaneGeometry(0.09, 0.03), new THREE.MeshBasicMaterial({ map: textTex(nm + ' nm', { w: 256, h: 84, font: 'bold 52px Consolas', color: '#e8ecf3' }), transparent: true }),
        { parent: card, pos: [x, 0.0065, 0.09], rot: [-Math.PI / 2, 0, 0], cast: false });
    });

    /* 标注 */
    label('石英炉管<small>高纯熔融石英,耐 1200°C</small>', V(0.12, 2.86, 0.2));
    label('电阻加热丝 · 三温区<small>控温精度 ±0.5°C</small>', V(0.3, 2.45, 0.1), null, { cls: 'hot' });
    label('保温层(陶瓷纤维)', V(0.46, 2.2, 0.0));
    label('石英晶舟<small>一次装载 100~150 片</small>', V(0.14, 1.75, 0.05));
    label('O₂ / H₂O 进气管', V(0.24, 1.3, 0.0));
    label('晶舟升降机', V(-0.45, 0.8, -0.4));
    const st = label('', V(-0.25, 3.25, 0.2), null, { cls: 'big' });
    label('Si 衬底', V(0.0, 1.0, 0.15));
    const oxL = label('', V(0.22, 1.2, 0.13));
    label('原始硅表面<small>每长 1nm SiO₂ 消耗 0.44nm Si</small>', V(-0.22, 1.11, 0.13));
    label('SiO₂ 薄膜干涉色对照卡', V(1.35, 1.06, 0.62));

    // 生成电阻丝(分段管)
    const segs = [];
    let cur = [];
    for (let i = 0; i <= 2200; i++) {
      const a = i * 0.16; const y = 1.36 + (i / 2200) * 1.5;
      const phi = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      if (phi < Math.PI / 2 + 0.05) { if (cur.length > 2) segs.push(cur); cur = []; continue; }
      cur.push(new THREE.Vector3(Math.sin(a) * 0.35, y, Math.cos(a) * 0.35));
    }
    if (cur.length > 2) segs.push(cur);
    segs.forEach((s) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(s), s.length * 2, 0.006, 6), coilMat, { parent: root, cast: false }));

    let lastNm = -1;
    return {
      update(t, dt) {
        const k = (t % CYCLE) / CYCLE;
        const load = smooth(0.0, 0.15, k) * (1 - smooth(0.85, 0.98, k));
        boat.position.y = lerp(-1.18, 0, load);
        const grow = smooth(0.18, 0.8, k);
        const nm = Math.max(1, grow * TMAX);
        if (Math.abs(nm - lastNm) > 2) {
          lastNm = nm;
          wMat.iridescenceThicknessRange = [nm, nm];
          topSkin.material.iridescenceThicknessRange = [nm, nm];
        }
        // 剖面:氧化层厚度示意(放大),56% 在原表面之上、44% 在之下
        const vis = 0.02 + grow * 0.1;
        oxBlk.scale.y = vis; oxBlk.position.y = 0.16 - vis * 0.44 + vis / 2;
        siBlk.scale.y = (0.16 - vis * 0.44) / 0.16; siBlk.position.y = (0.16 - vis * 0.44) / 2;
        topSkin.position.y = 0.16 + vis * 0.56 + 0.001;
        oxL.position.set(0.22, vis * 0.56 + 0.17, 0.13);
        oxL.element.querySelector('.txt').innerHTML = `SiO₂ ${Math.round(nm)} nm`;
        const T = k < 0.15 ? lerp(600, 1000, k / 0.15) : k < 0.8 ? 1000 : lerp(1000, 650, (k - 0.8) / 0.2);
        coilMat.emissiveIntensity = 0.6 + ((T - 600) / 400) * 2.2;
        glow.intensity = 0.5 + ((T - 600) / 400) * 1.5;
        const phase = k < 0.15 ? '晶舟上升装载' : k < 0.8 ? '湿氧氧化中' : k < 0.98 ? '降温 · 出舟' : '待机';
        st.element.querySelector('.txt').innerHTML = `${phase} · ${Math.round(T)}°C · SiO₂ ${Math.round(nm)} nm`;
        gas.rate = k > 0.15 && k < 0.8 ? 50 : 0;
        gas.update(dt);
      },
    };
  },
};

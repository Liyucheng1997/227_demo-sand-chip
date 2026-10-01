/* A6 化学机械抛光:抛光台 / 抛光头 / 抛光液臂 / 修整器 + AFM 表面形貌 */
import * as THREE from 'three';
import { M } from '../lib/materials.js';
import { mesh, cyl, box, rbox, lathe, pipe, lights, V, Particles, smooth, lerp } from '../lib/kit.js';
import { canvas, rng, raisedFloorTex, noiseTex } from '../lib/textures.js';
import { fbm } from '../lib/noise.js';

const PR = 0.4, PY = 1.0, CYCLE = 18;

/** 抛光垫:IC1000 类聚氨酯,同心圆沟槽 + 微孔 */
function padTexture() {
  const [c, g] = canvas(2048, 2048);
  const r = rng(8);
  g.fillStyle = '#cdb78a'; g.fillRect(0, 0, 2048, 2048);
  for (let i = 0; i < 40000; i++) { g.fillStyle = `rgba(110,90,55,${r() * 0.3})`; g.beginPath(); g.arc(r() * 2048, r() * 2048, 1 + r() * 1.5, 0, 6.3); g.fill(); }
  g.strokeStyle = 'rgba(95,75,45,0.9)'; g.lineWidth = 4;
  for (let rad = 20; rad < 1024; rad += 15) { g.beginPath(); g.arc(1024, 1024, rad, 0, Math.PI * 2); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function slurryAlpha() {
  const [c, g] = canvas(512, 512);
  g.fillStyle = '#000'; g.fillRect(0, 0, 512, 512);
  const r = rng(3);
  for (let i = 0; i < 260; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 230;
    const grd = g.createRadialGradient(256 + Math.cos(a) * d, 256 + Math.sin(a) * d, 0, 256 + Math.cos(a) * d, 256 + Math.sin(a) * d, 30 + r() * 50);
    grd.addColorStop(0, 'rgba(255,255,255,0.35)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 512, 512);
  }
  const t = new THREE.CanvasTexture(c); return t;
}
/** AFM 伪彩色(afmhot) */
function afmColor(h, out) {
  const t = Math.max(0, Math.min(1, h));
  out.setRGB(Math.min(1, t * 2), Math.max(0, Math.min(1, t * 2 - 0.5)), Math.max(0, Math.min(1, t * 2 - 1)));
  out.convertSRGBToLinear();
  return out;
}

export default {
  bg: ['#1c2232', '#07090d'],
  env: 0.75,
  exposure: 0.85,
  bloom: { strength: 0.3, threshold: 1.6 },
  zoom: [0.3, 20],
  views: [
    { name: '抛光机全景', pos: [1.5, 2.0, 1.9], target: [0, 1.0, 0] },
    { name: '抛光头特写', pos: [0.55, 1.35, 0.75], target: [0.12, 1.02, 0.12] },
    { name: '表面形貌 AFM', pos: [2.25, 1.75, 1.15], target: [1.55, 1.25, 0.15] },
  ],
  build({ root, label }) {
    lights(root, { key: 1.8, keyPos: [2, 6, 3], hemi: 0.4, shadow: 2.5, rim: 0.8 });
    mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ map: raisedFloorTex({ repeat: [50, 50] }), color: '#7d848e', roughness: 0.6, metalness: 0.2 }),
      { rot: [-Math.PI / 2, 0, 0], parent: root, cast: false });

    /* 机台 */
    const paint = M.paint('#e7eaee');
    rbox(1.3, 0.9, 1.1, 0.02, paint, { parent: root, pos: [0, 0.45, -0.05] });
    box(1.3, 0.04, 1.1, M.steel(), { parent: root, pos: [0, 0.92, -0.05] });
    // 防溅罩
    lathe([[PR + 0.03, 0.92], [PR + 0.06, 0.92], [PR + 0.06, 1.03], [PR + 0.05, 1.03], [PR + 0.05, 0.94], [PR + 0.03, 0.94]], M.plastic('#5d6670', { roughness: 0.3 }), { parent: root });

    /* 抛光台 + 抛光垫 */
    const platen = new THREE.Group(); platen.position.y = PY; root.add(platen);
    cyl(PR, PR, 0.05, M.steel(), { parent: platen, pos: [0, -0.03, 0], seg: 96 });
    const pad = mesh(new THREE.CylinderGeometry(PR, PR, 0.006, 128), [
      new THREE.MeshStandardMaterial({ color: '#b39b6c', roughness: 0.8 }),
      new THREE.MeshPhysicalMaterial({ map: padTexture(), color: '#d8b778', roughness: 0.5, clearcoat: 0.5, clearcoatRoughness: 0.2 }),
      new THREE.MeshStandardMaterial({ color: '#b39b6c', roughness: 0.8 }),
    ], { parent: platen, pos: [0, 0.0, 0] });
    // 抛光液膜(半透明乳白)
    const slurry = mesh(new THREE.CircleGeometry(PR * 0.97, 96), new THREE.MeshPhysicalMaterial({
      color: '#f4f7fa', transparent: true, alphaMap: slurryAlpha(), roughness: 0.05, clearcoat: 1, depthWrite: false,
    }), { parent: platen, pos: [0, 0.0035, 0], rot: [-Math.PI / 2, 0, 0], cast: false });

    /* 抛光头(载片头 + 保持环 + 主轴 + 摆臂) */
    const headArm = new THREE.Group(); root.add(headArm);
    const head = new THREE.Group(); headArm.add(head);
    cyl(0.17, 0.17, 0.035, M.plastic('#2f3439', { roughness: 0.35 }), { parent: head, pos: [0, 0.021, 0], seg: 96 }); // 保持环
    cyl(0.165, 0.17, 0.06, M.steel(), { parent: head, pos: [0, 0.07, 0], seg: 96 });
    cyl(0.1, 0.14, 0.05, M.steel(), { parent: head, pos: [0, 0.125, 0], seg: 64 });
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; cyl(0.008, 0.008, 0.01, M.chrome(), { parent: head, pos: [Math.cos(a) * 0.13, 0.105, Math.sin(a) * 0.13], seg: 8 }); }
    const marker = box(0.04, 0.005, 0.012, M.paint('#d33'), { parent: head, pos: [0.15, 0.1, 0] });
    cyl(0.035, 0.035, 0.45, M.chrome(), { parent: headArm, pos: [0, 0.37, 0] });
    rbox(0.18, 0.2, 0.18, 0.02, paint, { parent: headArm, pos: [0, 0.68, 0] });
    box(0.12, 0.08, 0.9, paint, { parent: headArm, pos: [0, 0.7, -0.5] });
    cyl(0.08, 0.08, 0.95, paint, { parent: root, pos: [0.2, 1.18, -0.75] });
    // 晶圆边缘(从保持环下露出一点)
    cyl(0.15, 0.15, 0.002, M.silicon(), { parent: head, pos: [0, 0.004, 0], seg: 96 });

    /* 抛光液输送臂 */
    const slArm = new THREE.Group(); slArm.position.set(-0.5, 1.12, -0.25); root.add(slArm);
    cyl(0.03, 0.03, 0.2, M.steel(), { parent: root, pos: [-0.5, 1.02, -0.25] });
    pipe([[0, 0, 0], [0.32, 0, 0.18], [0.42, -0.04, 0.22]], 0.016, M.plastic('#e8ecef'), { parent: slArm });
    const nozzle = V(-0.5 + 0.42, 1.12 - 0.05, -0.25 + 0.22);

    /* 修整器(金刚石盘)*/
    const condArm = new THREE.Group(); condArm.position.set(0.55, 1.1, 0.3); root.add(condArm);
    cyl(0.04, 0.04, 0.2, paint, { parent: root, pos: [0.55, 1.0, 0.3] });
    box(0.36, 0.04, 0.06, paint, { parent: condArm, pos: [-0.18, 0, 0] });
    const disk = new THREE.Group(); disk.position.set(-0.36, -0.07, 0); condArm.add(disk);
    cyl(0.05, 0.05, 0.02, M.steel(), { parent: disk, pos: [0, 0.0, 0] });
    cyl(0.05, 0.05, 0.004, new THREE.MeshStandardMaterial({ color: '#5a5d63', roughness: 0.7, bumpMap: noiseTex({ seed: 9, blobs: 4000, scale: 0.1 }), bumpScale: 3 }), { parent: disk, pos: [0, -0.012, 0] });
    cyl(0.015, 0.015, 0.06, M.chrome(), { parent: disk, pos: [0, 0.04, 0] });

    /* 抛光液滴 */
    const drops = new Particles(root, {
      count: 120, rate: 30, additive: false, intensity: 1,
      spawn(p) { p.pos.copy(nozzle); p.vel.set(0, -0.2, 0); p.max = 0.5; p.size = 0.012; p.color.setRGB(0.95, 0.97, 1); p.alpha = 0.9; },
      step(p, dt) { p.vel.y -= 3 * dt; p.pos.addScaledVector(p.vel, dt); if (p.pos.y < PY + 0.005) p.life = p.max; },
    });

    /* AFM 表面形貌(右侧全息台) */
    const afm = new THREE.Group(); afm.position.set(1.55, 1.0, 0.15); root.add(afm);
    cyl(0.32, 0.36, 0.04, M.plastic('#22272e', { roughness: 0.3 }), { parent: afm, pos: [0, 0.02, 0], seg: 64 });
    mesh(new THREE.TorusGeometry(0.34, 0.004, 8, 96), M.emissive('#4da3ff', 2), { parent: afm, pos: [0, 0.042, 0], rot: [Math.PI / 2, 0, 0], cast: false });
    const NS = 120, SZ = 0.42;
    const sg = new THREE.PlaneGeometry(SZ, SZ, NS, NS); sg.rotateX(-Math.PI / 2);
    const base = new Float32Array(sg.attributes.position.count);
    const cols = new Float32Array(sg.attributes.position.count * 3);
    for (let i = 0; i < base.length; i++) {
      const x = sg.attributes.position.getX(i), z = sg.attributes.position.getZ(i);
      base[i] = fbm(x * 18, 0.5, z * 18, 5) + Math.sin((x + z) * 60) * 0.15; // 锯痕方向性
    }
    sg.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const surf = mesh(sg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.1, side: THREE.DoubleSide }), { parent: afm, pos: [0, 0.16, 0], cast: false });
    // 坐标框
    const fr = new THREE.BoxGeometry(SZ, 0.16, SZ);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(fr), new THREE.LineBasicMaterial({ color: '#7fb3ff', transparent: true, opacity: 0.5 }));
    edges.position.y = 0.16; afm.add(edges);
    const tmpC = new THREE.Color();

    /* 标注 */
    label('抛光垫<small>聚氨酯,同心圆沟槽导流</small>', V(-0.15, PY + 0.01, 0.3));
    label('抛光头<small>真空吸住晶圆,正面朝下加压</small>', V(0.25, PY + 0.2, 0.18));
    label('抛光液臂<small>纳米 SiO₂ 胶体 + 弱碱</small>', V(-0.12, 1.12, 0.0));
    label('金刚石修整盘<small>持续"打毛"抛光垫</small>', V(0.25, PY + 0.06, 0.32));
    const ra = label('', V(1.55, 1.42, 0.15), null, { cls: 'big' });
    label('AFM 表面形貌(42×42 μm 视场)', V(1.8, 1.05, 0.45));

    let frameN = 0;
    return {
      update(t, dt) {
        platen.rotation.y += dt * 2.2;
        const sweep = Math.sin(t * 0.7) * 0.05;
        const hr = 0.2 + sweep;
        headArm.position.set(hr * Math.cos(0.6), PY + 0.004, hr * Math.sin(0.6));
        head.rotation.y += dt * 2.0;
        condArm.rotation.y = Math.sin(t * 0.9) * 0.45 - 0.2;
        disk.rotation.y += dt * 4;
        drops.update(dt);
        // AFM:粗糙度随抛光时间指数下降
        const k = (t % CYCLE) / CYCLE;
        const amp = lerp(0.07, 0.0012, smooth(0.08, 0.85, k));
        if (frameN++ % 2 === 0) {
          const pos = sg.attributes.position;
          for (let i = 0; i < base.length; i++) {
            const h = base[i];
            pos.setY(i, h * amp);
            afmColor(0.5 + h * 0.9, tmpC);
            cols[i * 3] = tmpC.r; cols[i * 3 + 1] = tmpC.g; cols[i * 3 + 2] = tmpC.b;
          }
          pos.needsUpdate = true; sg.attributes.color.needsUpdate = true;
          sg.computeVertexNormals();
        }
        const raNm = 800 * (amp / 0.07) ** 2;
        ra.element.querySelector('.txt').innerHTML = raNm >= 100 ? `表面粗糙度 Ra ≈ ${(raNm / 1000).toFixed(2)} μm` : `表面粗糙度 Ra ≈ ${raNm.toFixed(raNm < 10 ? 2 : 1)} nm`;
      },
    };
  },
};

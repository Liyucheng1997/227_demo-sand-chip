/* B7 芯片剖面:FinFET 晶体管(FEOL)+ 7 层铜互连与通孔(BEOL)+ 铝焊盘,按工艺顺序逐层生长 */
import * as THREE from 'three';
import { M } from '../lib/materials.js';
import { mesh, box, lights, V, instanced, mat4, smooth, lerp } from '../lib/kit.js';
import { rng } from '../lib/textures.js';

const XW = 3.2, ZW = 2.4;               // 剖面块尺寸
const FINS = [-0.78, -0.26, 0.26, 0.78]; // 鳍(沿 x 方向)
const GATES = [-1.2, -0.6, 0, 0.6, 1.2]; // 栅(沿 z 方向)
const GL = 0.14, SP = 0.035;
const CYCLE = 42;

// 金属层:方向、间距、线宽、底部高度、厚度、名称
const LEVELS = [
  { dir: 'x', pitch: 0.14, w: 0.07, y: 1.66, h: 0.09, name: 'M1', note: '线间距 ~36 nm' },
  { dir: 'z', pitch: 0.16, w: 0.08, y: 1.88, h: 0.1, name: 'M2' },
  { dir: 'x', pitch: 0.2, w: 0.1, y: 2.12, h: 0.12, name: 'M3' },
  { dir: 'z', pitch: 0.28, w: 0.14, y: 2.4, h: 0.16, name: 'M4' },
  { dir: 'x', pitch: 0.38, w: 0.19, y: 2.74, h: 0.2, name: 'M5' },
  { dir: 'z', pitch: 0.55, w: 0.27, y: 3.16, h: 0.28, name: 'M6' },
  { dir: 'x', pitch: 0.8, w: 0.42, y: 3.72, h: 0.4, name: 'M7', note: '粗铜电源 / 全局走线' },
];

export default {
  bg: ['#1b2232', '#06080d'],
  env: 0.85,
  exposure: 1.0,
  bloom: { strength: 0.25, threshold: 1.6 },
  zoom: [0.8, 30],
  views: [
    { name: '芯片剖面全景', pos: [5.6, 5.0, 6.4], target: [0, 2.0, 0] },
    { name: 'FinFET 晶体管', pos: [2.3, 1.85, 2.6], target: [0.2, 0.95, 0.4] },
    { name: '铜互连与通孔', pos: [3.4, 3.4, 3.2], target: [0.4, 2.4, 0.3] },
    { name: '俯视走线', pos: [0.6, 7.5, 1.2], target: [0, 2.5, 0] },
  ],
  build({ root, label }) {
    lights(root, { key: 2.0, keyPos: [5, 9, 6], hemi: 0.45, shadow: 4, rim: 1.0, rimPos: [-6, 4, -5] });
    const rand = rng(77);
    const layers = []; // { g, t0, name }
    const addLayer = (name, t0, y0) => { const g = new THREE.Group(); g.position.y = y0; root.add(g); layers.push({ g, t0, name, y0 }); return g; };

    // 展台
    box(XW + 0.5, 0.1, ZW + 0.5, M.plastic('#15181e', { roughness: 0.3 }), { parent: root, pos: [0, -0.05, 0] });
    mesh(new THREE.BoxGeometry(XW + 0.52, 0.02, ZW + 0.52), M.emissive('#3b7bd6', 0.8), { parent: root, pos: [0, -0.09, 0], cast: false });

    const si = new THREE.MeshStandardMaterial({ color: '#68717d', metalness: 0.55, roughness: 0.35 });
    const oxide = M.dielectric('#a8dcec', 0.22);
    const sin = new THREE.MeshStandardMaterial({ color: '#e4e1d6', roughness: 0.5 });
    const gateM = new THREE.MeshStandardMaterial({ color: '#4a4f58', metalness: 0.85, roughness: 0.3 });
    const hik = new THREE.MeshStandardMaterial({ color: '#c8a2e8', roughness: 0.4 });
    const sige = new THREE.MeshPhysicalMaterial({ color: '#e08aa6', roughness: 0.35, clearcoat: 0.4 });
    const sip = new THREE.MeshPhysicalMaterial({ color: '#7ccf9a', roughness: 0.35, clearcoat: 0.4 });
    const tung = M.tungsten();
    const cu = M.copper({ roughness: 0.26 });
    const etchStop = new THREE.MeshStandardMaterial({ color: '#5d6a7c', roughness: 0.5, transparent: true, opacity: 0.55, depthWrite: false });
    const lowk = M.dielectric('#9ec9ff', 0.1);

    /* ---------- FEOL ---------- */
    // 硅衬底 + 鳍
    const L0 = addLayer('硅衬底 + 鳍刻蚀', 0, 0);
    box(XW, 0.5, ZW, si, { parent: L0, pos: [0, 0.25, 0] });
    FINS.forEach((z) => {
      box(XW, 0.55, 0.06, si, { parent: L0, pos: [0, 0.775, z] });
    });
    // STI 浅槽隔离氧化物
    const L1 = addLayer('浅槽隔离 STI', 1.2, 0.5);
    box(XW, 0.25, ZW, M.dielectric('#cfe4ee', 0.55), { parent: L1, pos: [0, 0.125, 0] });
    // 高 k + 金属栅 + 侧墙 + 栅帽
    const L2 = addLayer('高 k 金属栅 + 侧墙', 2.4, 0.75);
    GATES.forEach((x) => {
      box(GL, 0.6, ZW - 0.2, gateM, { parent: L2, pos: [x, 0.3, 0] });
      box(GL + 0.012, 0.012, ZW - 0.2, hik, { parent: L2, pos: [x, 0.006, 0] });
      FINS.forEach((z) => box(GL + 0.012, 0.32, 0.075, hik, { parent: L2, pos: [x, 0.15, z] }));
      for (const sx of [-1, 1]) box(SP, 0.67, ZW - 0.2, sin, { parent: L2, pos: [x + sx * (GL / 2 + SP / 2), 0.335, 0] });
      box(GL, 0.07, ZW - 0.2, sin, { parent: L2, pos: [x, 0.635, 0] });
    });
    // 源漏外延(菱形截面):p 型 SiGe / n 型 Si:P
    const L3 = addLayer('源漏外延 SiGe / Si:P', 3.6, 0.75);
    const rh = new THREE.Shape(); rh.moveTo(0, 0); rh.lineTo(0.1, 0.17); rh.lineTo(0, 0.36); rh.lineTo(-0.1, 0.17); rh.lineTo(0, 0);
    const between = [];
    for (let i = 0; i < GATES.length - 1; i++) between.push([(GATES[i] + GATES[i + 1]) / 2, GATES[i + 1] - GATES[i] - GL - SP * 2 - 0.02]);
    between.push([-1.5, 0.22], [1.5, 0.22]);
    between.forEach(([x, len]) => FINS.forEach((z, fi) => {
      const g = new THREE.ExtrudeGeometry(rh, { depth: len, bevelEnabled: false });
      g.translate(0, 0, -len / 2); g.rotateY(Math.PI / 2);
      mesh(g, fi < 2 ? sige : sip, { parent: L3, pos: [x, 0.02, z] });
    }));
    // 接触:钨塞
    const L4 = addLayer('层间介质 + 钨接触', 4.8, 0.75);
    box(XW, 0.85, ZW, M.dielectric('#bfe6f2', 0.18), { parent: L4, pos: [0, 0.425, 0] });
    between.forEach(([x, len]) => {
      if (Math.abs(x) > 1.4) return;
      for (const zz of [[-0.52, 0.72], [0.52, 0.72]]) box(Math.min(0.13, len), 0.55, zz[1], tung, { parent: L4, pos: [x, 0.62, zz[0]] });
    });
    GATES.forEach((x, i) => box(0.08, 0.2, 0.08, tung, { parent: L4, pos: [x, 0.79, i % 2 ? 1.05 : -1.05] }));

    /* ---------- BEOL:铜互连 ---------- */
    const segsOf = []; // 每层的线段 [{c, a0, a1}]
    LEVELS.forEach((lv, li) => {
      const L = addLayer(`${lv.name} 铜互连(双大马士革)`, 6 + li * 2.4, lv.y - 0.06);
      // 刻蚀停止层 + 低 k 介质
      box(XW, 0.015, ZW, etchStop, { parent: L, pos: [0, 0.0075, 0], cast: false });
      const nextY = li < LEVELS.length - 1 ? LEVELS[li + 1].y - 0.06 : lv.y + lv.h + 0.15;
      box(XW, nextY - (lv.y - 0.06) - 0.015, ZW, lowk, { parent: L, pos: [0, (nextY - (lv.y - 0.06)) / 2 + 0.0075, 0], cast: false });
      // 走线:轨道上随机断开,形成真实的布线端点
      const span = lv.dir === 'x' ? XW : ZW, across = lv.dir === 'x' ? ZW : XW;
      const n = Math.floor((across - lv.w) / lv.pitch);
      const segs = [];
      const ms = [];
      for (let k = 0; k <= n; k++) {
        const c = -across / 2 + lv.w / 2 + (across - lv.w - n * lv.pitch) / 2 + k * lv.pitch;
        let a = -span / 2;
        while (a < span / 2) {
          const len = Math.min(span / 2 - a, lv.pitch * (3 + rand() * 12));
          if (len > lv.w * 1.5) {
            segs.push({ c, a0: a, a1: a + len });
            const mid = a + len / 2;
            ms.push(lv.dir === 'x' ? mat4([mid, 0.06 + lv.h / 2, c], [0, 0, 0], [len, lv.h, lv.w]) : mat4([c, 0.06 + lv.h / 2, mid], [0, 0, 0], [lv.w, lv.h, len]));
          }
          a += len + lv.pitch * (rand() < 0.5 ? 1 : 2);
        }
      }
      instanced(new THREE.BoxGeometry(1, 1, 1), cu, ms, { parent: L });
      segsOf.push(segs);
      // 通孔:连接到下一层
      if (li > 0) {
        const lo = LEVELS[li - 1], loSegs = segsOf[li - 1];
        const vh = lv.y - (lo.y + lo.h);
        const vs = [];
        segs.forEach((s) => loSegs.forEach((t) => {
          // 两层方向正交,交点为 (x, z)
          const x = lv.dir === 'x' ? t.c : s.c, z = lv.dir === 'x' ? s.c : t.c;
          const onS = lv.dir === 'x' ? x > s.a0 && x < s.a1 : z > s.a0 && z < s.a1;
          const onT = lo.dir === 'x' ? x > t.a0 && x < t.a1 : z > t.a0 && z < t.a1;
          if (onS && onT && rand() < 0.12) vs.push(mat4([x, 0.06 - vh / 2, z], [0, 0, 0], [Math.min(lv.w, lo.w) * 0.9, vh + 0.01, Math.min(lv.w, lo.w) * 0.9]));
        }));
        if (vs.length) instanced(new THREE.BoxGeometry(1, 1, 1), cu, vs, { parent: L });
      } else {
        // V0:M1 落到接触上
        const vs = [];
        segs.forEach((s) => { if (rand() < 0.5) vs.push(mat4([lerp(s.a0, s.a1, 0.3 + rand() * 0.4), 0.0, s.c], [0, 0, 0], [0.06, 0.12, 0.06])); });
        instanced(new THREE.BoxGeometry(1, 1, 1), tung, vs, { parent: L });
      }
    });
    // 钝化层 + 铝焊盘
    const LP = addLayer('钝化层 + 铝焊盘', 6 + LEVELS.length * 2.4, 4.27);
    const padMat = M.alu({ color: '#d9dce0', roughness: 0.3 });
    box(XW, 0.12, ZW, new THREE.MeshPhysicalMaterial({ color: '#d8c9e8', transparent: true, opacity: 0.45, roughness: 0.2, depthWrite: false }), { parent: LP, pos: [0, 0.06, 0], cast: false });
    box(0.9, 0.16, 0.9, padMat, { parent: LP, pos: [0, 0.1, 0] });
    box(0.3, 0.12, 0.3, cu, { parent: LP, pos: [0, -0.04, 0] });

    /* 标注 */
    label('硅鳍 Fin<small>宽 ~6 nm,高 ~50 nm</small>', V(-1.55, 1.0, FINS[3]));
    label('金属栅(高 k / TiN / W)<small>三面包裹鳍,控制沟道</small>', V(GATES[2], 1.3, -1.1));
    label('氮化硅侧墙', V(GATES[3] + GL / 2 + SP, 1.25, 1.1));
    label('p 型源漏 SiGe', V(-0.9, 0.95, FINS[0] - 0.08));
    label('n 型源漏 Si:P', V(-0.9, 0.95, FINS[3] + 0.08));
    label('钨接触塞', V(0.3, 1.45, 0.9));
    label('STI 隔离氧化物', V(1.55, 0.62, 0.0));
    LEVELS.forEach((lv) => label(`${lv.name}${lv.note ? `<small>${lv.note}</small>` : ''}`, V(XW / 2, lv.y + lv.h / 2, ZW / 2), null, { cls: lv.name === 'M1' || lv.name === 'M7' ? 'big' : '' }));
    label('铜通孔 Via', V(-1.3, 2.05, 1.2));
    label('低 k 介质 + 刻蚀停止层', V(-XW / 2, 2.6, ZW / 2));
    label('铝焊盘(外部连线落点)', V(0, 4.45, 0.45), null, { cls: 'big' });
    const st = label('', V(-XW / 2, 4.9, 0), null, { cls: 'big' });

    return {
      update(t) {
        const tt = t % CYCLE;
        let cur = layers[0].name;
        layers.forEach((L) => {
          const k = smooth(L.t0, L.t0 + 1.2, tt);
          L.g.visible = k > 0.001;
          L.g.scale.y = Math.max(0.001, k);
          L.g.position.y = L.y0 + (1 - k) * 0.6;
          if (tt >= L.t0) cur = L.name;
        });
        const done = tt > layers[layers.length - 1].t0 + 1.2;
        st.element.querySelector('.txt').innerHTML = done ? '完成:晶体管 + 7 层铜互连(实际可达 15 层以上)' : `工艺进行中:${cur}`;
      },
    };
  },
};

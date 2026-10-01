/* 晶圆厂通用环境与部件:洁净室、FOUP、晶圆 */
import * as THREE from 'three';
import { M } from './materials.js';
import { mesh, box, rbox, cyl, V, instanced, mat4 } from './kit.js';
import { raisedFloorTex, textTex, canvas } from './textures.js';

/**
 * 洁净室:高架地板 + 天花板 FFU 灯格 + 两侧设备前脸
 * o.yellow:黄光区(光刻区,滤掉 500nm 以下波长)
 */
export function cleanroom(root, o = {}) {
  const W = o.w ?? 14, D = o.d ?? 14, H = o.h ?? 3.6;
  const yellow = !!o.yellow;
  mesh(new THREE.PlaneGeometry(W * 2, D * 2), new THREE.MeshStandardMaterial({
    map: raisedFloorTex({ repeat: [W * 3.3, D * 3.3] }), color: yellow ? '#8d8670' : '#7d848e', roughness: 0.55, metalness: 0.25,
  }), { rot: [-Math.PI / 2, 0, 0], parent: root, cast: false });
  // 天花板:FFU(风机过滤单元)+ 灯带
  const ceil = new THREE.Group(); ceil.position.y = H; root.add(ceil);
  const ffu = new THREE.MeshStandardMaterial({ color: '#b9bec5', roughness: 0.8, side: THREE.DoubleSide });
  mesh(new THREE.PlaneGeometry(W * 2, D * 2), ffu, { rot: [Math.PI / 2, 0, 0], parent: ceil, cast: false, receive: false });
  const lampCol = yellow ? '#ffc94a' : '#f4f8ff';
  const lamp = M.emissive(lampCol, yellow ? 1.5 : 1.7);
  const lm = [];
  for (let x = -W; x <= W; x += 1.2) for (let z = -D; z <= D; z += 2.4) lm.push(mat4([x, -0.01, z], [Math.PI / 2, 0, 0], [0.08, 1.1, 1]));
  instanced(new THREE.PlaneGeometry(1, 1), lamp, lm, { parent: ceil, cast: false, receive: false });
  // 四周墙板
  const wall = new THREE.MeshStandardMaterial({ color: yellow ? '#b5ad94' : '#aeb4bb', roughness: 0.7 });
  for (const [x, z, ry] of [[0, -D, 0], [0, D, Math.PI], [-W, 0, Math.PI / 2], [W, 0, -Math.PI / 2]]) {
    mesh(new THREE.PlaneGeometry(W * 2, H), wall, { parent: root, pos: [x, H / 2, z], rot: [0, ry, 0], cast: false });
  }
  // 设备前脸(两排)
  const rows = o.rows ?? [[-4.2, 0], [4.2, Math.PI]];
  const toolPaint = M.paint(yellow ? '#d9d0b4' : '#d4d8dd');
  const dark = M.paint('#3a4048');
  rows.forEach(([z, ry]) => {
    for (let i = -4; i <= 4; i++) {
      const g = new THREE.Group(); g.position.set(i * 1.9, 0, z); g.rotation.y = ry; root.add(g);
      const h = 2.1 + ((i * 7919) % 5) * 0.12;
      rbox(1.75, h, 1.4, 0.03, toolPaint, { parent: g, pos: [0, h / 2, -0.7] });
      box(1.6, 0.06, 0.02, dark, { parent: g, pos: [0, h - 0.25, 0.005] });
      // 装载口(Load Port)
      for (const lx of [-0.45, 0.45]) {
        box(0.42, 0.04, 0.42, M.steel(), { parent: g, pos: [lx, 0.9, 0.21] });
        box(0.44, 0.44, 0.02, dark, { parent: g, pos: [lx, 1.15, 0.01] });
      }
      // 状态灯塔
      const tower = new THREE.Group(); tower.position.set(0.75, h + 0.02, -0.15); g.add(tower);
      ['#30d158', '#ffd60a', '#ff453a'].forEach((c, k) => cyl(0.025, 0.025, 0.05, M.emissive(c, k === 0 ? 2 : 0.15), { parent: tower, pos: [0, 0.03 + k * 0.052, 0], seg: 12 }));
    }
  });
  // 天车(OHT)轨道
  if (o.oht !== false) {
    const rail = M.steel();
    // 轨道正对装载口上方
    rows.forEach(([z, ry]) => {
      const rz = z + (ry === 0 ? 0.21 : -0.21);
      box(W * 2, 0.08, 0.14, rail, { parent: root, pos: [0, H - 0.45, rz] });
      for (let x = -W; x <= W; x += 2) box(0.04, 0.45, 0.04, rail, { parent: root, pos: [x, H - 0.22, rz] });
    });
  }
  return { H };
}

/** 300mm 抛光晶圆:带倒角边缘和 V 形缺口 */
export function waferGeometry(R = 0.15, T = 0.00078, notch = 0.0035) {
  const sh = new THREE.Shape();
  const nA = 0.016; // 缺口半角(弧度)
  sh.moveTo(0, -R + notch);
  sh.lineTo(Math.sin(nA) * R, -Math.cos(nA) * R);
  sh.absarc(0, 0, R, -Math.PI / 2 + nA, Math.PI * 1.5 - nA, false);
  sh.lineTo(0, -R + notch);
  const g = new THREE.ExtrudeGeometry(sh, { depth: T * 0.6, bevelEnabled: true, bevelThickness: T * 0.2, bevelSize: T * 0.25, bevelSegments: 3, curveSegments: 160 });
  g.translate(0, 0, -T * 0.3);
  g.rotateX(-Math.PI / 2);
  return g;
}

/** 激光刻印(点阵字符) */
export function laserMarkTex(text) {
  const [c, g] = canvas(512, 96);
  g.clearRect(0, 0, 512, 96);
  g.font = 'bold 64px Consolas, monospace';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#fff'; g.fillText(text, 256, 50);
  const img = g.getImageData(0, 0, 512, 96);
  g.clearRect(0, 0, 512, 96);
  for (let y = 2; y < 96; y += 6) for (let x = 2; x < 512; x += 6) {
    if (img.data[(y * 512 + x) * 4 + 3] > 120) { g.fillStyle = 'rgba(40,44,52,0.85)'; g.beginPath(); g.arc(x, y, 2.3, 0, 6.3); g.fill(); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** FOUP 前开式晶圆传送盒(25 片) */
export function foup(o = {}) {
  const g = new THREE.Group();
  const W = 0.39, H = 0.335, D = 0.33;
  const shellMat = new THREE.MeshPhysicalMaterial({ color: o.tint ?? '#6f8db0', transparent: true, opacity: 0.38, roughness: 0.12, metalness: 0, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
  const frame = M.plastic('#2f3540', { roughness: 0.35 });
  // 壳体:顶、底、两侧、后壁(前方开口)
  box(W, 0.012, D, shellMat, { parent: g, pos: [0, H, 0], cast: false });
  box(W, 0.02, D, frame, { parent: g, pos: [0, 0.01, 0] });
  box(0.012, H, D, shellMat, { parent: g, pos: [-W / 2, H / 2, 0], cast: false });
  box(0.012, H, D, shellMat, { parent: g, pos: [W / 2, H / 2, 0], cast: false });
  rbox(W, H, 0.02, 0.01, shellMat, { parent: g, pos: [0, H / 2, -D / 2], cast: false });
  // 前框
  for (const sx of [-1, 1]) box(0.02, H, 0.02, frame, { parent: g, pos: [sx * (W / 2 - 0.01), H / 2, D / 2] });
  box(W, 0.02, 0.02, frame, { parent: g, pos: [0, H - 0.01, D / 2] });
  // 顶部天车抓取法兰
  box(0.06, 0.04, 0.06, frame, { parent: g, pos: [0, H + 0.025, 0] });
  rbox(0.2, 0.012, 0.16, 0.004, frame, { parent: g, pos: [0, H + 0.05, 0] });
  // 侧面把手
  for (const sx of [-1, 1]) rbox(0.02, 0.05, 0.16, 0.008, frame, { parent: g, pos: [sx * (W / 2 + 0.015), H * 0.62, 0] });
  // 槽齿(25 槽)
  const teeth = [];
  for (let i = 0; i < 26; i++) for (const sx of [-1, 1]) teeth.push(mat4([sx * 0.165, 0.035 + i * 0.01, -0.02], [0, 0, 0], [0.04, 0.003, 0.2]));
  instanced(new THREE.BoxGeometry(1, 1, 1), frame, teeth, { parent: g });
  // 晶圆
  if (o.wafers !== false) {
    const wg = waferGeometry();
    const wm = [];
    for (let i = 0; i < (o.count ?? 25); i++) wm.push(mat4([0, 0.04 + i * 0.01, 0.0], [0, Math.PI, 0], 1));
    instanced(wg, o.waferMat ?? M.silicon({ color: '#a6aeb9', roughness: 0.04, metalness: 1 }), wm, { parent: g });
  }
  // 运动学定位底座
  box(0.3, 0.012, 0.26, M.plastic('#1e2228'), { parent: g, pos: [0, -0.006, 0] });
  // 条码标签
  mesh(new THREE.PlaneGeometry(0.1, 0.03), new THREE.MeshBasicMaterial({ map: textTex('FP-0217', { w: 256, h: 76, font: 'bold 44px Consolas', color: '#111', bg: '#f4f4f0' }) }), { parent: g, pos: [W / 2 + 0.007, 0.08, 0.06], rot: [0, Math.PI / 2, 0], cast: false });
  return g;
}

/** FOUP 前门 */
export function foupDoor() {
  const g = new THREE.Group();
  rbox(0.38, 0.32, 0.03, 0.012, M.plastic('#3a414c', { roughness: 0.4 }), { parent: g });
  for (const sx of [-1, 1]) cyl(0.025, 0.025, 0.008, M.plastic('#22262c'), { parent: g, pos: [sx * 0.1, 0, 0.018], rot: [Math.PI / 2, 0, 0], seg: 20 });
  return g;
}

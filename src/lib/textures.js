/* 程序化纹理:全部用 Canvas 现场绘制,零外部资源 */
import * as THREE from 'three';

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function tex(c, { repeat = [1, 1], srgb = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = aniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// 简单可复现的伪随机
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function gradientBackground([top, bottom]) {
  const [c, g] = canvas(4, 512);
  const grd = g.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, top);
  grd.addColorStop(1, bottom);
  g.fillStyle = grd;
  g.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** 灰度噪声(用作粗糙度/凹凸) */
export function noiseTex({ size = 256, scale = 1, base = 128, amp = 60, repeat = [1, 1], seed = 7, blobs = 600, srgb = false } = {}) {
  const [c, g] = canvas(size, size);
  const r = rng(seed);
  g.fillStyle = `rgb(${base},${base},${base})`;
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < blobs; i++) {
    const v = Math.max(0, Math.min(255, base + (r() - 0.5) * 2 * amp));
    g.fillStyle = `rgba(${v},${v},${v},${0.15 + r() * 0.25})`;
    const x = r() * size, y = r() * size, rad = (2 + r() * 14) * scale;
    for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) {
      g.beginPath(); g.arc(x + dx, y + dy, rad, 0, Math.PI * 2); g.fill();
    }
  }
  return tex(c, { repeat, srgb });
}

/** 拉丝金属(横向细纹) */
export function brushedTex({ repeat = [1, 1], seed = 3 } = {}) {
  const [c, g] = canvas(512, 512);
  const r = rng(seed);
  g.fillStyle = '#808080'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1400; i++) {
    const v = 100 + r() * 70;
    g.strokeStyle = `rgba(${v},${v},${v},${0.25 + r() * 0.35})`;
    g.lineWidth = 0.5 + r() * 1.2;
    const y = r() * 512;
    g.beginPath(); g.moveTo(0, y); g.lineTo(512, y + (r() - 0.5) * 2); g.stroke();
  }
  return tex(c, { repeat, srgb: false });
}

/** 耐火砖墙 */
export function brickTex({ repeat = [1, 1], color = [150, 70, 45] } = {}) {
  const [c, g] = canvas(512, 512);
  const r = rng(11);
  g.fillStyle = '#3a2a22'; g.fillRect(0, 0, 512, 512);
  const bw = 128, bh = 48;
  for (let row = 0; row < 512 / bh + 1; row++) {
    for (let col = -1; col < 512 / bw + 1; col++) {
      const x = col * bw + (row % 2 ? bw / 2 : 0), y = row * bh;
      const k = 0.75 + r() * 0.35;
      g.fillStyle = `rgb(${color[0] * k | 0},${color[1] * k | 0},${color[2] * k | 0})`;
      g.fillRect(x + 3, y + 3, bw - 6, bh - 6);
      for (let i = 0; i < 25; i++) {
        g.fillStyle = `rgba(0,0,0,${r() * 0.12})`;
        g.fillRect(x + 3 + r() * (bw - 10), y + 3 + r() * (bh - 10), 2 + r() * 6, 2 + r() * 4);
      }
    }
  }
  return tex(c, { repeat });
}

/** 洁净室高架地板(穿孔铝板) */
export function raisedFloorTex({ repeat = [8, 8] } = {}) {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#c9ced4'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = '#8d939b'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, 253, 253);
  g.fillStyle = '#5d636b';
  for (let y = 18; y < 240; y += 12) for (let x = 18; x < 240; x += 12) {
    g.beginPath(); g.arc(x, y, 3.2, 0, Math.PI * 2); g.fill();
  }
  return tex(c, { repeat });
}

/** CMP 抛光垫:XY 沟槽 + 微孔 */
export function padTex() {
  const [c, g] = canvas(1024, 1024);
  const r = rng(5);
  g.fillStyle = '#d9c9a6'; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = `rgba(120,100,70,${r() * 0.25})`;
    g.fillRect(r() * 1024, r() * 1024, 2, 2);
  }
  g.strokeStyle = 'rgba(110,92,62,0.85)'; g.lineWidth = 3;
  for (let i = 0; i <= 1024; i += 32) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 1024); g.stroke();
    g.beginPath(); g.moveTo(0, i); g.lineTo(1024, i); g.stroke();
  }
  return tex(c, { repeat: [1, 1] });
}

/** 晶圆上的芯片阵列(含切割道、各 die 内部纹理) */
export function dieGridTex({ size = 2048, n = 14, base = '#7b8494', dies = true, colorful = true, rejects = [] } = {}) {
  const [c, g] = canvas(size, size);
  g.fillStyle = base; g.fillRect(0, 0, size, size);
  if (!dies) return tex(c);
  const r = rng(21);
  const cell = size / n, street = cell * 0.06;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const x = i * cell + street / 2, y = j * cell + street / 2, w = cell - street;
    // die 背景:先进工艺芯片表面呈现彩虹般的干涉色块
    const hue = colorful ? 200 + r() * 70 : 210;
    g.fillStyle = `hsl(${hue},${colorful ? 28 : 8}%,${32 + r() * 6}%)`;
    g.fillRect(x, y, w, w);
    // 功能区块
    const blocks = [[0.06, 0.06, 0.55, 0.42], [0.65, 0.06, 0.29, 0.42], [0.06, 0.52, 0.36, 0.42], [0.46, 0.52, 0.48, 0.2], [0.46, 0.76, 0.48, 0.18]];
    blocks.forEach(([bx, by, bw, bh], k) => {
      const h2 = colorful ? (hue + 40 * k + r() * 40) % 360 : 215;
      g.fillStyle = `hsl(${h2},${colorful ? 35 : 6}%,${30 + r() * 18}%)`;
      g.fillRect(x + bx * w, y + by * w, bw * w, bh * w);
      g.strokeStyle = 'rgba(255,255,255,0.08)';
      g.lineWidth = 1;
      for (let s = 0; s < 8; s++) {
        const yy = y + (by + bh * s / 8) * w;
        g.beginPath(); g.moveTo(x + bx * w, yy); g.lineTo(x + (bx + bw) * w, yy); g.stroke();
      }
    });
    // 焊盘环
    g.fillStyle = 'rgba(220,210,170,0.55)';
    for (let s = 0; s < 18; s++) {
      const p = 0.04 + s * 0.052;
      g.fillRect(x + p * w, y + 0.01 * w, w * 0.025, w * 0.025);
      g.fillRect(x + p * w, y + 0.965 * w, w * 0.025, w * 0.025);
    }
    if (rejects.some(([a, b]) => a === i && b === j)) {
      g.fillStyle = '#c0261d';
      g.beginPath(); g.arc(x + w / 2, y + w / 2, w * 0.12, 0, Math.PI * 2); g.fill();
    }
  }
  return tex(c);
}

/** 掩膜版图形:铬上的电路线条 */
export function reticleTex() {
  const [c, g] = canvas(1024, 1024);
  const r = rng(9);
  g.fillStyle = '#1b1d22'; g.fillRect(0, 0, 1024, 1024);
  for (let f = 0; f < 4; f++) {
    const fx = 120 + (f % 2) * 400, fy = 120 + (f >> 1) * 400;
    g.fillStyle = '#3a3f4a'; g.fillRect(fx, fy, 380, 380);
    g.fillStyle = '#c9d2df';
    for (let k = 0; k < 60; k++) {
      const horiz = r() > 0.5;
      const x = fx + r() * 360, y = fy + r() * 360;
      if (horiz) g.fillRect(x, y, Math.min(380 - (x - fx), 20 + r() * 140), 3);
      else g.fillRect(x, y, 3, Math.min(380 - (y - fy), 20 + r() * 140));
    }
  }
  return tex(c);
}

/** 激光刻印字符 */
export function textTex(lines, { w = 512, h = 128, color = '#ddd', bg = 'rgba(0,0,0,0)', font = 'bold 56px Consolas, monospace', align = 'center' } = {}) {
  const [c, g] = canvas(w, h);
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = color; g.font = font; g.textAlign = align; g.textBaseline = 'middle';
  const arr = Array.isArray(lines) ? lines : [lines];
  arr.forEach((s, i) => g.fillText(s, align === 'center' ? w / 2 : 12, (h / (arr.length + 1)) * (i + 1)));
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** 柔和圆形光点(粒子贴图) */
export function dotTex(soft = 0.5) {
  const [c, g] = canvas(64, 64);
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(soft, 'rgba(255,255,255,0.45)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** 烟雾贴图 */
export function smokeTex() {
  const [c, g] = canvas(128, 128);
  const r = rng(4);
  for (let i = 0; i < 40; i++) {
    const x = 64 + (r() - 0.5) * 50, y = 64 + (r() - 0.5) * 50, rad = 10 + r() * 30;
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    grd.addColorStop(0, 'rgba(255,255,255,0.12)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** 石墨加热器蛇形缝 / 通用条纹 alpha */
export function stripeTex({ n = 24, duty = 0.7, vertical = true } = {}) {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#fff';
  const w = 256 / n;
  for (let i = 0; i < n; i++) {
    if (vertical) g.fillRect(i * w, 0, w * duty, 256);
    else g.fillRect(0, i * w, 256, w * duty);
  }
  return tex(c, { srgb: false });
}

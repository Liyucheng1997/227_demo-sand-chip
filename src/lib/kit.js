/* 建模工具箱:几何体快捷构造、管道、灯光、地面、粒子系统 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { dotTex } from './textures.js';

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
/** 粒子尺寸换算:屏幕像素 / 世界单位(由引擎在 resize 时更新) */
export const PSCALE = { value: 900 };
export const DEG = Math.PI / 180;

/** 创建网格并设置常用属性 */
export function mesh(geo, mat, o = {}) {
  const m = new THREE.Mesh(geo, mat);
  if (o.pos) m.position.set(...o.pos);
  if (o.rot) m.rotation.set(...o.rot);
  if (o.scale) typeof o.scale === 'number' ? m.scale.setScalar(o.scale) : m.scale.set(...o.scale);
  m.castShadow = o.cast ?? true;
  m.receiveShadow = o.receive ?? true;
  if (o.parent) o.parent.add(m);
  if (o.name) m.name = o.name;
  return m;
}

export const box = (w, h, d, mat, o) => mesh(new THREE.BoxGeometry(w, h, d), mat, o);
export const rbox = (w, h, d, r, mat, o) => mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat, o);
export const cyl = (rt, rb, h, mat, o = {}) =>
  mesh(new THREE.CylinderGeometry(rt, rb, h, o.seg ?? 48, o.hseg ?? 1, o.open ?? false, o.t0 ?? 0, o.tl ?? Math.PI * 2), mat, o);
export const sphere = (r, mat, o = {}) => mesh(new THREE.SphereGeometry(r, o.seg ?? 32, o.seg2 ?? 20, 0, Math.PI * 2, 0, o.tl ?? Math.PI), mat, o);
export const torus = (R, r, mat, o = {}) => mesh(new THREE.TorusGeometry(R, r, o.rs ?? 16, o.ts ?? 64, o.arc ?? Math.PI * 2), mat, o);

/** 旋转体:profile 为 [[半径, 高度], ...];phiLength < 2π 即剖视 */
export function lathe(profile, mat, o = {}) {
  const pts = profile.map(([r, y]) => new THREE.Vector2(r, y));
  const g = new THREE.LatheGeometry(pts, o.seg ?? 96, o.phi0 ?? 0, o.phiLen ?? Math.PI * 2);
  return mesh(g, mat, o);
}

/** 带壁厚的旋转壳体(剖视用):外轮廓 + 内轮廓 + 截面封口;o.solid 时轮廓本身即闭合截面 */
export function shell(profileOuter, thickness, mat, o = {}) {
  const outer = profileOuter;
  const inner = o.solid ? [] : [...profileOuter].reverse().map(([r, y]) => [Math.max(0.0001, r - thickness), y]);
  const closed = [...outer, ...inner, outer[0]];
  const g = new THREE.LatheGeometry(closed.map(([r, y]) => new THREE.Vector2(r, y)), o.seg ?? 96, o.phi0 ?? 0, o.phiLen ?? Math.PI * 2);
  const grp = new THREE.Group();
  mat.side = THREE.DoubleSide;
  grp.add(mesh(g, mat, o));
  // 剖面封口(颜色更浅,模拟切割面)
  if ((o.phiLen ?? Math.PI * 2) < Math.PI * 2 - 1e-3) {
    const shape = new THREE.Shape(closed.map(([r, y]) => new THREE.Vector2(r, y)));
    const capMat = o.capMat || mat;
    const sg = new THREE.ShapeGeometry(shape);
    for (const phi of [o.phi0 ?? 0, (o.phi0 ?? 0) + o.phiLen]) {
      const cap = mesh(sg, capMat, {});
      // Lathe 绕 y 轴:点 (r, y) 在角度 phi 处的位置为 (r sinφ, y, r cosφ)
      cap.rotation.y = phi - Math.PI / 2;
      cap.material.side = THREE.DoubleSide;
      grp.add(cap);
    }
  }
  if (o.pos) grp.position.set(...o.pos);
  if (o.parent) o.parent.add(grp);
  return grp;
}

/** 圆角折线路径(工业管道) */
export function pipePath(points, bend = 0.3) {
  const P = points.map((p) => (p.isVector3 ? p : V(...p)));
  const path = new THREE.CurvePath();
  let prev = P[0].clone();
  for (let i = 1; i < P.length - 1; i++) {
    const a = P[i - 1], b = P[i], c = P[i + 1];
    const d1 = b.clone().sub(a), d2 = c.clone().sub(b);
    const r = Math.min(bend, d1.length() / 2, d2.length() / 2);
    const p1 = b.clone().sub(d1.normalize().multiplyScalar(r));
    const p2 = b.clone().add(d2.normalize().multiplyScalar(r));
    path.add(new THREE.LineCurve3(prev, p1));
    path.add(new THREE.QuadraticBezierCurve3(p1, b.clone(), p2));
    prev = p2;
  }
  path.add(new THREE.LineCurve3(prev, P[P.length - 1].clone()));
  return path;
}

export function pipe(points, radius, mat, o = {}) {
  const path = o.smooth ? new THREE.CatmullRomCurve3(points.map((p) => (p.isVector3 ? p : V(...p)))) : pipePath(points, o.bend ?? radius * 3);
  const g = new THREE.TubeGeometry(path, o.segs ?? 160, radius, o.rs ?? 16, false);
  return mesh(g, mat, o);
}

/** 法兰(管道/腔体连接处的螺栓圈) */
export function flange(R, mat, o = {}) {
  const g = new THREE.Group();
  // o.cut:与剖视一致,去掉 x>0 且 z>0 的四分之一
  const tg = new THREE.TorusGeometry(R, o.t ?? R * 0.08, 10, 64, o.cut ? Math.PI * 1.5 : Math.PI * 2);
  tg.rotateX(Math.PI / 2);
  if (o.cut) tg.rotateY(-Math.PI / 2);
  g.add(mesh(tg, mat));
  const n = o.bolts ?? 16;
  const bg = new THREE.CylinderGeometry(R * 0.035, R * 0.035, (o.t ?? R * 0.08) * 2.6, 6);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.01;
    if (o.cut && Math.cos(a) > 0 && Math.sin(a) > 0) continue;
    g.add(mesh(bg, mat, { pos: [Math.cos(a) * R, 0, Math.sin(a) * R] }));
  }
  if (o.pos) g.position.set(...o.pos);
  if (o.rot) g.rotation.set(...o.rot);
  if (o.parent) o.parent.add(g);
  return g;
}

/** 标准三点布光 + 阴影 */
export function lights(root, o = {}) {
  const hemi = new THREE.HemisphereLight(o.sky ?? '#c8d6ff', o.ground ?? '#20180f', o.hemi ?? 0.35);
  root.add(hemi);
  const key = new THREE.DirectionalLight(o.keyColor ?? '#fff4e6', o.key ?? 2.2);
  key.position.set(...(o.keyPos ?? [6, 10, 6]));
  key.castShadow = true;
  const s = o.shadow ?? 8;
  Object.assign(key.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 0.5, far: 60 });
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.target.position.set(...(o.target ?? [0, 0, 0]));
  root.add(key, key.target);
  const rim = new THREE.DirectionalLight(o.rimColor ?? '#9fc3ff', o.rim ?? 0.8);
  rim.position.set(...(o.rimPos ?? [-8, 5, -6]));
  root.add(rim);
  return { hemi, key, rim };
}

/** 点光源(炽热物体的环境照明) */
export function glowLight(root, color, intensity, pos, distance = 10) {
  const l = new THREE.PointLight(color, intensity, distance, 2);
  l.position.set(...pos);
  root.add(l);
  return l;
}

/** 地面 */
export function ground(root, mat, size = 40, y = 0) {
  const m = mesh(new THREE.PlaneGeometry(size, size), mat, { rot: [-Math.PI / 2, 0, 0], pos: [0, y, 0], cast: false });
  root.add(m);
  return m;
}

/* ---------------- 粒子系统 ---------------- */
const pVert = /* glsl */`
  attribute float aSize; attribute float aAlpha; attribute vec3 aColor;
  varying float vAlpha; varying vec3 vColor;
  uniform float uScale;
  void main(){
    vAlpha = aAlpha; vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position,1.0);
    gl_PointSize = aSize * uScale / -mv.z;
    gl_Position = projectionMatrix * mv;
  }`;
const pFrag = /* glsl */`
  uniform sampler2D uMap; uniform float uIntensity;
  varying float vAlpha; varying vec3 vColor;
  void main(){
    vec4 t = texture2D(uMap, gl_PointCoord);
    gl_FragColor = vec4(vColor * uIntensity, t.a * vAlpha);
    if (gl_FragColor.a < 0.003) discard;
  }`;

/**
 * 通用粒子池
 * spawn(p, i)  初始化粒子:p = {pos:V, vel:V, life, max, size, color:Color, alpha}
 * step(p, dt)  每帧更新(可选,默认匀速 + 重力)
 */
export class Particles {
  constructor(root, { count = 300, map = dotTex(), additive = true, intensity = 1, spawn, step, rate = 60 }) {
    this.count = count; this.spawn = spawn; this.step = step; this.rate = rate; this.acc = 0;
    this.ps = Array.from({ length: count }, () => ({ pos: V(), vel: V(), life: 0, max: 0, size: 1, color: new THREE.Color(1, 1, 1), alpha: 1, a0: 1, dead: true, data: {} }));
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(count), 1));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(count), 1));
    g.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: map }, uScale: PSCALE, uIntensity: { value: intensity } },
      vertexShader: pVert, fragmentShader: pFrag, transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    root.add(this.points);
    this.geo = g;
  }
  emit(n) {
    for (const p of this.ps) {
      if (n <= 0) break;
      if (!p.dead) continue;
      p.dead = false; p.life = 0; p.alpha = 1; p.size = 1; p.vel.set(0, 0, 0); p.color.setRGB(1, 1, 1);
      this.spawn(p);
      p.a0 = p.alpha;
      n--;
    }
  }
  update(dt) {
    this.acc += this.rate * dt;
    const n = Math.floor(this.acc);
    if (n > 0) { this.acc -= n; this.emit(n); }
    const pos = this.geo.attributes.position.array, sz = this.geo.attributes.aSize.array;
    const al = this.geo.attributes.aAlpha.array, col = this.geo.attributes.aColor.array;
    this.ps.forEach((p, i) => {
      if (!p.dead) {
        p.life += dt;
        if (p.life >= p.max) p.dead = true;
        else if (this.step) this.step(p, dt);
        else p.pos.addScaledVector(p.vel, dt);
      }
      const k = p.dead ? 0 : 1;
      pos[i * 3] = p.pos.x; pos[i * 3 + 1] = p.pos.y; pos[i * 3 + 2] = p.pos.z;
      sz[i] = p.size * k;
      const fade = p.max ? Math.min(1, (1 - p.life / p.max) * 4, p.life * 10) : 1;
      al[i] = p.alpha * fade * k;
      col[i * 3] = p.color.r; col[i * 3 + 1] = p.color.g; col[i * 3 + 2] = p.color.b;
    });
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
    this.geo.attributes.aColor.needsUpdate = true;
  }
}

/** 用实例化网格批量放置同一零件 */
export function instanced(geo, mat, matrices, o = {}) {
  const im = new THREE.InstancedMesh(geo, mat, matrices.length);
  matrices.forEach((m, i) => im.setMatrixAt(i, m));
  im.castShadow = o.cast ?? true;
  im.receiveShadow = o.receive ?? true;
  if (o.colors) o.colors.forEach((c, i) => im.setColorAt(i, c));
  if (o.parent) o.parent.add(im);
  return im;
}

export const mat4 = (pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) =>
  new THREE.Matrix4().compose(V(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), V(...(typeof scale === 'number' ? [scale, scale, scale] : scale)));

export const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;

/* 渲染引擎:渲染器 / 后期辉光 / 轨道控制 / 3D 标注 / 场景切换 / 镜头飞行 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { gradientBackground } from './lib/textures.js';
import { PSCALE } from './lib/kit.js';

const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export function createEngine(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;
  container.appendChild(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.className = 'label-layer';
  container.appendChild(labelRenderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.01, 500);
  camera.position.set(8, 5, 10);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI * 0.62;
  controls.autoRotateSpeed = 0.6;

  // 带 MSAA 的 HDR 渲染目标,保证后期处理下依然抗锯齿
  const rt = new THREE.WebGLRenderTarget(16, 16, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.45, 1.0);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  let current = null;     // { def, root, api, t }
  let fly = null;         // 镜头飞行状态
  let showLabels = true;
  const clock = new THREE.Clock();

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = w + 'px';
    renderer.domElement.style.height = h + 'px';
    labelRenderer.setSize(w, h);
    composer.setSize(w, h);
    bloom.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    PSCALE.value = (h * renderer.getPixelRatio()) / (2 * Math.tan((camera.fov * Math.PI) / 360));
  }
  new ResizeObserver(resize).observe(container);
  resize();

  /* ---------- 3D 标注 ---------- */
  function label(text, position, parent, opts = {}) {
    const el = document.createElement('div');
    el.className = 'lbl3d' + (opts.cls ? ' ' + opts.cls : '');
    el.innerHTML = `<span class="dot"></span><span class="txt">${text}</span>`;
    const obj = new CSS2DObject(el);
    obj.position.copy(position instanceof THREE.Vector3 ? position : new THREE.Vector3(...position));
    obj.center.set(0, 0.5);
    obj.userData.isLabel = true;
    (parent || current.root).add(obj);
    obj.visible = showLabels;
    return obj;
  }

  function disposeTree(obj) {
    obj.traverse((o) => {
      if (o.isCSS2DObject && o.element.parentNode) o.element.parentNode.removeChild(o.element);
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        ms.forEach((m) => {
          for (const k in m) if (m[k] && m[k].isTexture && !m[k].userData.shared) m[k].dispose();
          m.dispose();
        });
      }
    });
  }

  /* ---------- 场景加载 ---------- */
  function load(def) {
    if (current) {
      scene.remove(current.root);
      disposeTree(current.root);
      if (current.api && current.api.dispose) current.api.dispose();
      if (scene.background && scene.background.isTexture) scene.background.dispose();
    }
    const root = new THREE.Group();
    scene.add(root);
    current = { def, root, api: null, t: 0 };

    scene.background = gradientBackground(def.bg || ['#1b2236', '#06080e']);
    scene.environmentIntensity = def.env ?? 0.8;
    scene.fog = def.fog ? new THREE.Fog(def.fog[0], def.fog[1], def.fog[2]) : null;
    renderer.toneMappingExposure = def.exposure ?? 1.0;
    bloom.strength = def.bloom?.strength ?? 0.55;
    bloom.radius = def.bloom?.radius ?? 0.5;
    bloom.threshold = def.bloom?.threshold ?? 1.3;
    controls.minDistance = def.zoom?.[0] ?? 1;
    controls.maxDistance = def.zoom?.[1] ?? 60;

    const ctx = { THREE, root, scene, camera, renderer, label, engine: api };
    current.api = def.build(ctx) || {};
    const v = def.views[0];
    camera.position.set(...v.pos).add(new THREE.Vector3(...v.pos).sub(new THREE.Vector3(...v.target)).multiplyScalar(0.35));
    controls.target.set(...v.target);
    flyTo(0, 1.6);
  }

  function flyTo(index, dur = 1.4) {
    if (!current) return;
    const v = current.def.views[index];
    if (!v) return;
    fly = {
      p0: camera.position.clone(), t0: controls.target.clone(),
      p1: new THREE.Vector3(...v.pos), t1: new THREE.Vector3(...v.target),
      k: 0, dur,
    };
    if (current.api.onView) current.api.onView(index);
  }

  function setLabels(on) {
    showLabels = on;
    if (current) current.root.traverse((o) => { if (o.userData.isLabel) o.visible = on; });
  }

  /* ---------- 主循环 ---------- */
  function tick(dt) {
    if (fly) {
      fly.k = Math.min(1, fly.k + dt / fly.dur);
      const e = ease(fly.k);
      camera.position.lerpVectors(fly.p0, fly.p1, e);
      controls.target.lerpVectors(fly.t0, fly.t1, e);
      if (fly.k >= 1) fly = null;
    }
    controls.update();
    if (current) {
      current.t += dt;
      if (current.api.update) current.api.update(current.t, dt);
    }
  }
  function draw() {
    composer.render();
    labelRenderer.render(scene, camera);
  }
  function frame() {
    requestAnimationFrame(frame);
    tick(Math.min(clock.getDelta(), 0.05));
    draw();
  }
  frame();

  controls.addEventListener('start', () => { fly = null; });

  const api = {
    THREE, renderer, scene, camera, controls,
    load, flyTo, setLabels,
    setAutoRotate(on) { controls.autoRotate = on; },
    get labelsOn() { return showLabels; },
    /** 调试:手动推进 sec 秒并渲染(页面不可见时 rAF 会暂停) */
    advance(sec = 1, fps = 30) { for (let i = 0; i < sec * fps; i++) tick(1 / fps); draw(); },
  };
  return api;
}

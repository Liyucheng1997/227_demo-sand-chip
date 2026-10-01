/* 应用入口:导航、信息面板、视角切换 */
import { createEngine } from './engine.js';
import { CHAPTERS } from './data.js';
import { SCENES } from './scenes/index.js';

const $ = (id) => document.getElementById(id);
const nav = $('stepNav'), infoPanel = $('infoPanel'), progBar = $('progBar'), counter = $('counter');
const tabs = document.querySelectorAll('.tab');
const viewport = $('viewport');

if (/[?&]shot/.test(location.search)) document.body.classList.add('shot');

let engine;
try {
  engine = createEngine(viewport);
} catch (e) {
  $('loading').textContent = '无法初始化 WebGL:请使用最新版 Chrome / Edge / Firefox 打开。';
  throw e;
}
$('loading').remove();
window.__engine = engine;

let curCh = 0, curStep = 0, playing = false, playTimer = null, curView = 0;

function renderViews(def) {
  const box = $('ovViews');
  box.innerHTML = def.views.map((v, i) => `<button class="chip ${i === 0 ? 'on' : ''}" data-v="${i}">${v.name}</button>`).join('');
  box.querySelectorAll('.chip').forEach((b) => (b.onclick = () => setView(+b.dataset.v)));
}
function setView(i) {
  curView = i;
  engine.flyTo(i);
  $('ovViews').querySelectorAll('.chip').forEach((b, k) => b.classList.toggle('on', k === i));
}

function render() {
  const ch = CHAPTERS[curCh];
  const st = ch.steps[curStep];

  nav.innerHTML = `<div class="chapter-title">${ch.title}</div>` + ch.steps.map((s, i) =>
    `<button class="step-btn ${i === curStep ? 'active' : ''} ${i < curStep ? 'done' : ''}" data-i="${i}">
       <span class="num">${i < curStep ? '✓' : i + 1}</span>${s.name}</button>`).join('');
  nav.querySelectorAll('.step-btn').forEach((b) => (b.onclick = () => { stopPlay(); goto(+b.dataset.i); }));

  const def = SCENES[st.scene];
  engine.load(def);
  curView = 0;
  renderViews(def);
  $('ovKicker').textContent = `${curCh === 0 ? 'CHAPTER 1' : 'CHAPTER 2'} · STEP ${curStep + 1}`;
  $('ovTitle').textContent = st.name.replace(' ★', '');

  infoPanel.innerHTML = `
    <h2>${st.name}<span class="badge">${st.badge}</span></h2>
    <div class="desc">${st.desc}</div>
    <div class="facts">${st.facts.map((f) => `<div class="fact"><b>${f[0]}</b><span>${f[1]}</span></div>`).join('')}</div>
    ${st.eq ? `<div class="eq">${st.eq}</div>` : ''}`;

  const total = ch.steps.length;
  progBar.style.width = ((curStep + 1) / total) * 100 + '%';
  counter.textContent = `${curStep + 1} / ${total}`;
  tabs.forEach((t, i) => t.classList.toggle('active', i === curCh));
}

function goto(i) {
  const ch = CHAPTERS[curCh];
  if (i < 0) {
    if (curCh === 0) return;
    curCh--; curStep = CHAPTERS[curCh].steps.length - 1;
  } else if (i >= ch.steps.length) {
    if (curCh === CHAPTERS.length - 1) { stopPlay(); return; }
    curCh++; curStep = 0;
  } else curStep = i;
  render();
}

$('btnPrev').onclick = () => { stopPlay(); goto(curStep - 1); };
$('btnNext').onclick = () => { stopPlay(); goto(curStep + 1); };

const btnPlay = $('btnPlay');
function stopPlay() {
  playing = false; clearTimeout(playTimer);
  btnPlay.textContent = '▶ 自动播放'; btnPlay.classList.add('primary');
}
// 自动播放:每步先依次浏览各个视角,再进入下一步
function tick() {
  if (!playing) return;
  const def = SCENES[CHAPTERS[curCh].steps[curStep].scene];
  if (curView < def.views.length - 1) setView(curView + 1);
  else goto(curStep + 1);
  playTimer = setTimeout(tick, 7000);
}
btnPlay.onclick = () => {
  if (playing) { stopPlay(); return; }
  playing = true;
  btnPlay.textContent = '⏸ 暂停';
  playTimer = setTimeout(tick, 7000);
};

tabs.forEach((t, i) => (t.onclick = () => { stopPlay(); curCh = i; curStep = 0; render(); }));

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') { stopPlay(); goto(curStep + 1); }
  if (e.key === 'ArrowLeft') { stopPlay(); goto(curStep - 1); }
  if (/^[1-9]$/.test(e.key)) {
    const def = SCENES[CHAPTERS[curCh].steps[curStep].scene];
    const v = +e.key - 1;
    if (v < def.views.length) setView(v);
  }
});

const tglLabels = $('tglLabels'), tglRotate = $('tglRotate');
tglLabels.onclick = () => { const on = !engine.labelsOn; engine.setLabels(on); tglLabels.classList.toggle('on', on); };
let rot = false;
tglRotate.onclick = () => { rot = !rot; engine.setAutoRotate(rot); tglRotate.classList.toggle('on', rot); };
$('tglFull').onclick = () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else viewport.requestFullscreen?.();
};

// 支持 #b3 这样的锚点直接跳转
const [hash, hv] = location.hash.slice(1).split('.');
CHAPTERS.forEach((c, ci) => c.steps.forEach((s, si) => { if (s.scene === hash) { curCh = ci; curStep = si; } }));
render();
if (hv) setTimeout(() => setView(+hv), 300);

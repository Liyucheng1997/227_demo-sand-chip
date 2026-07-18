/* 步骤数据 + 导航逻辑 */
const CHAPTERS = [
  {
    title: "第一章 · 硅的提取与提纯",
    steps: [
      {
        id: "sc-a1", name: "原料:石英砂", badge: "SiO₂",
        desc: "芯片的起点不是海滩上的普通沙子,而是<b>高纯石英砂</b>(硅石)。硅是地壳中含量第二高的元素(27.7%),但它从不单独存在,总是和氧结合成二氧化硅。想得到硅,第一步就是把氧'抢'走。",
        facts: [["主要成分", "SiO₂ ≥ 99%"], ["硅在地壳含量", "27.7%,第 2 位"], ["常见来源", "脉石英 / 石英岩矿"]],
        eq: null
      },
      {
        id: "sc-a2", name: "电弧炉冶炼", badge: "2000°C",
        desc: "把石英砂和焦炭混合投入<b>矿热电弧炉</b>。三根石墨电极通入强电流,电弧温度高达 2000°C。碳原子在高温下夺走 SiO₂ 中的氧,生成 CO 气体逸出,炉底流出的就是液态硅 —— 冷却后得到<b>冶金级硅(MG-Si)</b>,纯度约 98%~99%。这种纯度可以做铝合金、硅胶,但离芯片还差得远。",
        facts: [["温度", "≈ 2000°C"], ["产物纯度", "98%~99%"], ["耗电", "≈ 12~14 度电 / 公斤硅"]],
        eq: "SiO₂ + 2C → Si + 2CO↑"
      },
      {
        id: "sc-a3", name: "西门子法提纯", badge: "9 个 9",
        desc: "芯片要求纯度 <b>99.9999999%</b>(9 个 9)—— 十亿个硅原子里最多混进一个杂质原子。诀窍是'固体难提纯,气液好提纯':① 硅粉与氯化氢反应生成液态<b>三氯氢硅 SiHCl₃</b>(沸点仅 31.8°C);② 在精馏塔中反复蒸馏,硼、磷、金属氯化物因沸点不同被逐级分离;③ 超纯 SiHCl₃ 与氢气进入还原炉,在 1100°C 炽热硅芯棒上分解,沉积出<b>电子级多晶硅</b>。",
        facts: [["提纯前", "98%"], ["提纯后", "99.9999999%"], ["关键中间体", "SiHCl₃(沸点 31.8°C)"], ["还原温度", "≈ 1100°C"]],
        eq: "Si + 3HCl → SiHCl₃ + H₂ ; SiHCl₃ + H₂ → Si + 3HCl"
      },
      {
        id: "sc-a4", name: "直拉法拉单晶", badge: "CZ 法",
        desc: "多晶硅内部晶粒方向杂乱,晶界会散射电子,做不了芯片。<b>直拉法(Czochralski)</b>:把多晶硅在石英坩埚中熔化(1414°C 以上),用一颗方向完美的<b>籽晶</b>轻触液面,边旋转边以每分钟毫米级的速度缓缓上提 —— 液态硅原子会照着籽晶的晶格'排队结晶',最终拉出一根直径 300mm、长约 2 米、原子排列完全一致的<b>单晶硅棒</b>。",
        facts: [["熔点", "1414°C"], ["拉速", "~0.5-2 mm/min"], ["转速", "~28 rpm"], ["成品", "Ø300mm × ~2m 单晶锭"]],
        eq: null
      },
      {
        id: "sc-a5", name: "线锯切片", badge: "775μm",
        desc: "用直径仅 0.05mm 的<b>金刚石线</b>组成线网,高速往复运动,像切火腿一样把硅锭一次切成上千片厚约 775 微米的薄圆片。切割中不断喷淋冷却液带走热量;切完的晶圆边缘还要<b>倒角</b>(防崩边)、<b>研磨</b>(磨平锯痕)。",
        facts: [["线径", "~0.05 mm"], ["切片厚度", "~775 μm (300mm 晶圆)"], ["单次产出", "上千片"]],
        eq: null
      },
      {
        id: "sc-a6", name: "化学机械抛光", badge: "CMP",
        desc: "光刻要求晶圆表面平整到<b>纳米级</b>。化学机械抛光(CMP)= 化学腐蚀 + 机械研磨:抛光液中的纳米二氧化硅磨粒配合弱碱腐蚀,晶圆被抛光头压在旋转的抛光垫上,双重作用把表面磨成完美镜面 —— 起伏小于 1 纳米。",
        facts: [["表面粗糙度", "< 1 nm"], ["磨粒尺寸", "纳米级 SiO₂ 胶体"], ["类比", "晶圆放大成地球,最高山不过几米"]],
        eq: null
      },
      {
        id: "sc-a7", name: "成品晶圆", badge: "Wafer",
        desc: "至此,一片<b>抛光晶圆</b>诞生:直径 300mm、镜面般平整、纯度 9 个 9 的单晶硅圆片。边缘的小缺口(Notch)用于标记晶向、在设备中定位。它将被送入晶圆厂的百级洁净室,由光刻机在上面雕出数十亿个晶体管 —— 请进入<b>第二章</b>。",
        facts: [["直径", "300 mm"], ["单片可切芯片", "数百颗 Die"], ["下一站", "晶圆厂 · 光刻"]],
        eq: null
      },
    ]
  },
  {
    title: "第二章 · 光刻与芯片制造",
    steps: [
      {
        id: "sc-b1", name: "热氧化打底", badge: "1000°C",
        desc: "晶圆进厂第一步:放入 1000°C 的氧化炉,通入氧气或水汽,表面的硅原子与氧结合,<b>生长</b>出一层致密的二氧化硅薄膜。这层膜是绝缘体,既保护晶圆,又充当后续掺杂的'挡板'和晶体管的栅介质。",
        facts: [["温度", "900~1200°C"], ["膜厚", "几 nm ~ 几百 nm"], ["作用", "绝缘 / 保护 / 掺杂掩蔽"]],
        eq: "Si + O₂ → SiO₂(干氧) ; Si + 2H₂O → SiO₂ + 2H₂(湿氧)"
      },
      {
        id: "sc-b2", name: "旋涂光刻胶", badge: "感光层",
        desc: "在晶圆表面滴几毫升<b>光刻胶</b> —— 一种对特定波长光敏感的高分子液体。晶圆以每分钟数千转高速旋转,离心力把胶甩成厚度约 1 微米、均匀性达纳米级的薄膜,再放到热板上'软烘'蒸掉溶剂。它就是即将承接电路图案的'感光底片'。",
        facts: [["转速", "3000~6000 rpm"], ["胶厚", "~1 μm"], ["均匀性", "± 纳米级"]],
        eq: null
      },
      {
        id: "sc-b3", name: "光刻机曝光 ★", badge: "核心",
        desc: "光刻机本质是一台<b>把电路图缩小投影到晶圆上的极致照相机</b>。光路:① <b>光源</b>发出深紫外(DUV 193nm)或极紫外(EUV 13.5nm)光;② <b>照明系统</b>把光整形均匀;③ 光穿过<b>掩膜版</b> —— 一块刻着放大 4 倍电路图案的石英板;④ <b>投影物镜</b>把图案缩小 4 倍聚焦到光刻胶上;⑤ <b>晶圆台</b>曝光完一格立即步进到下一格,重复上百次铺满整片晶圆。被光照到的胶发生光化学反应 —— 图案就这样'拍'了上去,此刻还看不见。",
        facts: [["DUV 波长", "193 nm(ArF 激光)"], ["EUV 波长", "13.5 nm(锡等离子体)"], ["缩小倍率", "4 : 1"], ["套刻精度", "< 2 nm"], ["EUV 单价", "≈ 1.5 亿欧元"]],
        eq: null
      },
      {
        id: "sc-b4", name: "显影", badge: "图形显现",
        desc: "晶圆浸入/喷淋<b>显影液</b>(TMAH 碱性溶液):正性光刻胶被曝光的区域化学键断裂、溶解冲走,未曝光区域保留 —— 电路图案第一次'显形'在胶层上。此时会做光学检查,图形不合格可以把胶全部洗掉重来;一旦进入蚀刻就没有回头路了。",
        facts: [["显影液", "TMAH 2.38%"], ["正胶", "曝光区溶解"], ["负胶", "曝光区固化保留"]],
        eq: null
      },
      {
        id: "sc-b5", name: "等离子蚀刻", badge: "RIE",
        desc: "光刻胶只是'模板',图案要真正刻进材料。在真空腔中把 CF₄/SF₆ 等气体电离成<b>等离子体</b>,射频电场驱动离子垂直轰击晶圆:没有胶保护的区域被物理轰击+化学反应刻蚀掉,胶保护的区域完好无损。蚀刻可做到近乎 90° 的垂直侧壁。完成后用氧等离子体把残留的光刻胶'烧'掉。",
        facts: [["方式", "反应离子蚀刻 RIE"], ["气体", "CF₄ / SF₆ / Cl₂"], ["垂直度", "≈ 90°,深宽比 >50:1"]],
        eq: "SiO₂ + CF₄(等离子体) → SiF₄↑ + CO₂↑"
      },
      {
        id: "sc-b6", name: "离子注入", badge: "掺杂",
        desc: "纯硅几乎不导电,必须<b>精确掺入杂质</b>:把硼/磷/砷离子化,电场加速到极高速度,像微型炮弹一样打进硅晶格。掺磷得到多电子的 <b>N 型</b>区,掺硼得到多空穴的 <b>P 型</b>区 —— N 和 P 区拼合就构成晶体管的源极、漏极。SiO₂ 挡住的地方打不进去,所以掺杂位置由上一步光刻精确定义。注入后 1000°C 快速退火,修复晶格并'激活'杂质。",
        facts: [["能量", "keV ~ MeV 级"], ["剂量精度", "原子个数级控制"], ["退火", "~1000°C 快速热退火"]],
        eq: null
      },
      {
        id: "sc-b7", name: "沉积与多层互连", badge: "×30~100 层",
        desc: "一颗现代芯片不是刻一次就完 —— <b>涂胶→曝光→显影→蚀刻/注入/沉积→磨平</b>这个循环要重复 30~100 多次:底层造出数十亿晶体管,上面再用化学气相沉积(CVD)铺绝缘层、电镀铜填出一层层<b>金属导线</b>(先进芯片多达 15+ 层金属),把所有晶体管连成完整电路,像盖一座百层摩天大楼。每一层之间的对准误差不能超过几纳米。",
        facts: [["光刻层数", "30~100+ 道"], ["金属互连层", "10~15+ 层"], ["总工序", "上千道,历时 2~3 个月"]],
        eq: null
      },
      {
        id: "sc-b8", name: "测试·切割·封装", badge: "完成 🎉",
        desc: "探针台逐颗电测晶圆上的每个 Die,标记不合格品;金刚石刀片/激光沿切割道把晶圆切成一颗颗芯片;合格 Die 被贴装到基板上,用比头发丝还细的金线(或倒装焊球)把芯片焊盘与外部引脚连通;最后注塑封装、打标、终测 —— 你手机里那颗黑色小方块,就这样从一粒沙走完了它的全部旅程。",
        facts: [["测试", "探针逐颗电测"], ["切割精度", "±μm,切缝 ~30μm"], ["键合线径", "~20 μm 金线"]],
        eq: null
      },
    ]
  }
];

let curCh = 0, curStep = 0, playing = false, playTimer = null;

const nav = document.getElementById('stepNav');
const sceneWrap = document.getElementById('sceneWrap');
const infoPanel = document.getElementById('infoPanel');
const progBar = document.getElementById('progBar');
const counter = document.getElementById('counter');
const tabs = document.querySelectorAll('.tab');

function getTpl(id){
  return document.getElementById(id) || null;
}

function render(){
  const ch = CHAPTERS[curCh];
  const st = ch.steps[curStep];

  // 侧边步骤列表
  nav.innerHTML = `<div class="chapter-title">${ch.title}</div>` + ch.steps.map((s,i)=>
    `<button class="step-btn ${i===curStep?'active':''} ${i<curStep?'done':''}" data-i="${i}">
       <span class="num">${i<curStep?'✓':i+1}</span>${s.name}</button>`).join('');
  nav.querySelectorAll('.step-btn').forEach(b=>b.onclick=()=>{ goto(+b.dataset.i); });

  // 场景
  const tpl = getTpl(st.id);
  sceneWrap.innerHTML = '';
  if(tpl){
    const div = document.createElement('div');
    div.className = 'scene active';
    div.appendChild(tpl.content.cloneNode(true));
    sceneWrap.appendChild(div);
  }

  // 信息面板
  infoPanel.innerHTML = `
    <h2>${st.name}<span class="badge">${st.badge}</span></h2>
    <div class="desc">${st.desc}</div>
    <div class="facts">${st.facts.map(f=>`<div class="fact"><b>${f[0]}</b><span>${f[1]}</span></div>`).join('')}</div>
    ${st.eq?`<div class="eq">${st.eq}</div>`:''}`;

  // 进度
  const total = ch.steps.length;
  progBar.style.width = ((curStep+1)/total*100)+'%';
  counter.textContent = `${curStep+1} / ${total}`;

  tabs.forEach((t,i)=>t.classList.toggle('active', i===curCh));
}

function goto(i){
  const ch = CHAPTERS[curCh];
  if(i < 0){
    if(curCh > 0){ curCh--; curStep = CHAPTERS[curCh].steps.length-1; }
  } else if(i >= ch.steps.length){
    if(curCh < CHAPTERS.length-1){ curCh++; curStep = 0; }
    else { stopPlay(); return; }
  } else {
    curStep = i;
  }
  render();
}

document.getElementById('btnPrev').onclick = ()=>{ stopPlay(); goto(curStep-1); };
document.getElementById('btnNext').onclick = ()=>{ stopPlay(); goto(curStep+1); };

const btnPlay = document.getElementById('btnPlay');
function stopPlay(){ playing=false; clearInterval(playTimer); btnPlay.textContent='▶ 自动播放'; btnPlay.classList.add('primary'); }
btnPlay.onclick = ()=>{
  if(playing){ stopPlay(); return; }
  playing = true;
  btnPlay.textContent = '⏸ 暂停';
  playTimer = setInterval(()=>goto(curStep+1), 9000);
};

tabs.forEach((t,i)=>t.onclick=()=>{ stopPlay(); curCh=i; curStep=0; render(); });

document.addEventListener('keydown', e=>{
  if(e.key==='ArrowRight'){ stopPlay(); goto(curStep+1); }
  if(e.key==='ArrowLeft'){ stopPlay(); goto(curStep-1); }
});

render();

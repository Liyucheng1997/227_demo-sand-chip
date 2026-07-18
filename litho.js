/* 第二章:光刻与芯片制造 —— 场景 SVG 模板,注入到 #sceneTemplates2 */
document.getElementById('sceneTemplates2').innerHTML = `

<!-- ============ 场景 B1:热氧化 ============ -->
<template id="sc-b1">
<svg viewBox="0 0 900 420" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="tubeG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a4258"/><stop offset=".5" stop-color="#232a3d"/><stop offset="1" stop-color="#3a4258"/>
    </linearGradient>
    <marker id="arrO2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#7dd3fc"/></marker>
  </defs>
  <text x="30" y="40" class="lbl-b" font-size="15">STEP 1 · 热氧化:给晶圆穿上"绝缘外衣"</text>
  <text x="30" y="62" class="lbl">在 1000°C 高温炉中通入氧气,晶圆表面生长出一层致密的 SiO₂ 绝缘膜</text>

  <!-- 管式炉 -->
  <g transform="translate(80,110)">
    <rect x="0" y="30" width="480" height="120" rx="60" fill="url(#tubeG)" stroke="#4b5570" stroke-width="2"/>
    <rect x="30" y="50" width="420" height="80" rx="40" fill="#1a1208"/>
    <!-- 加热线圈 -->
    <g stroke="#ff6b4a" stroke-width="5" class="pulse">
      <path d="M40 24 q 10 -14 20 0 q 10 14 20 0 q 10 -14 20 0 q 10 14 20 0 q 10 -14 20 0 q 10 14 20 0 q 10 -14 20 0 q 10 14 20 0 q 10 -14 20 0 q 10 14 20 0 q 10 -14 20 0 q 10 14 20 0 q 10 -14 20 0 q 10 14 20 0 q 10 -14 20 0 q 10 14 20 0 q 10 -14 20 0 q 10 14 20 0 q 10 -14 20 0 q 10 14 20 0" fill="none"/>
      <path d="M40 156 q 10 14 20 0 q 10 -14 20 0 q 10 14 20 0 q 10 -14 20 0 q 10 14 20 0 q 10 -14 20 0 q 10 14 20 0 q 10 -14 20 0 q 10 14 20 0 q 10 -14 20 0 q 10 14 20 0 q 10 -14 20 0 q 10 14 20 0 q 10 -14 20 0 q 10 14 20 0 q 10 -14 20 0 q 10 14 20 0 q 10 -14 20 0 q 10 14 20 0 q 10 -14 20 0" fill="none"/>
    </g>
    <!-- 石英舟上的晶圆 -->
    <g>
      <rect x="90" y="118" width="300" height="8" rx="4" fill="#4b5570"/>
      <g fill="#9fb0d4" stroke="#dfe8fa">
        <ellipse cx="130" cy="90" rx="9" ry="30"/><ellipse cx="170" cy="90" rx="9" ry="30"/>
        <ellipse cx="210" cy="90" rx="9" ry="30"/><ellipse cx="250" cy="90" rx="9" ry="30"/>
        <ellipse cx="290" cy="90" rx="9" ry="30"/><ellipse cx="330" cy="90" rx="9" ry="30"/>
      </g>
    </g>
    <!-- O2 气流 -->
    <path d="M -60 90 H 20" stroke="#7dd3fc" stroke-width="3" class="flow" fill="none" marker-end="url(#arrO2)"/>
    <text x="-40" y="72" class="lbl">O₂ / 水汽</text>
    <path d="M 462 90 H 540" stroke="#5b6a8f" stroke-width="3" class="flow-slow" fill="none" marker-end="url(#arrO2)"/>
    <text x="240" y="190" text-anchor="middle" class="lbl">卧式氧化炉(约 900~1200°C),一炉可同时处理上百片</text>
  </g>

  <!-- 剖面 -->
  <g transform="translate(640,90)">
    <rect x="0" y="0" width="230" height="220" rx="12" fill="#1a2135" stroke="#2a3350"/>
    <text x="115" y="30" text-anchor="middle" class="lbl-b" font-size="13">晶圆剖面(放大)</text>
    <g transform="translate(35,60)">
      <rect x="0" y="60" width="160" height="70" fill="#5f6d8e"/>
      <text x="80" y="102" text-anchor="middle" font-size="12" fill="#dfe8fa">硅衬底 Si</text>
      <rect x="0" y="38" width="160" height="22" fill="#2dd4bf" opacity=".9" class="grow1"/>
      <text x="80" y="54" text-anchor="middle" font-size="11" fill="#04332d" font-weight="bold">SiO₂ 氧化层</text>
      <text x="80" y="20" text-anchor="middle" class="lbl-s">厚度仅几纳米~几百纳米</text>
    </g>
    <text x="115" y="205" text-anchor="middle" class="lbl-s">作用:绝缘、保护、做栅介质</text>
  </g>
</svg>
</template>

<!-- ============ 场景 B2:旋涂光刻胶 ============ -->
<template id="sc-b2">
<svg viewBox="0 0 900 420" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="chuckW" cx=".4" cy=".35" r="1">
      <stop offset="0" stop-color="#dfe8fa"/><stop offset="1" stop-color="#7e8aa8"/>
    </radialGradient>
  </defs>
  <text x="30" y="40" class="lbl-b" font-size="15">STEP 2 · 旋涂光刻胶:铺一层"感光墨水"</text>
  <text x="30" y="62" class="lbl">光刻胶遇特定波长的光会改变化学性质 —— 它是图形转移的媒介</text>

  <!-- 旋涂机俯视 -->
  <g transform="translate(110,110)">
    <circle cx="150" cy="140" r="145" fill="#141b2d" stroke="#2a3350" stroke-width="2"/>
    <g class="spin-fast">
      <circle cx="150" cy="140" r="110" fill="url(#chuckW)" stroke="#eef2fb" stroke-width="2"/>
      <path d="M 150 30 A 110 110 0 0 1 260 140" fill="none" stroke="#fff" stroke-width="6" opacity=".35"/>
    </g>
    <!-- 展开的光刻胶 -->
    <circle cx="150" cy="140" r="78" fill="#f59e0b" opacity=".85"/>
    <circle cx="150" cy="140" r="78" fill="none" stroke="#ffd08a" stroke-width="3" class="pulse"/>
    <!-- 滴胶喷嘴 -->
    <g transform="translate(150,10)">
      <rect x="-8" y="-30" width="16" height="52" rx="5" fill="#39445f" stroke="#5b6a8f"/>
      <circle cx="0" cy="46" r="5" fill="#f59e0b" class="float-up" style="animation-direction:reverse;animation-duration:1.2s"/>
      <circle cx="0" cy="72" r="4" fill="#f59e0b" class="float-up" style="animation-direction:reverse;animation-duration:1.2s;animation-delay:.6s"/>
    </g>
    <!-- 甩出液滴 -->
    <g fill="#f59e0b" opacity=".7">
      <circle cx="288" cy="80" r="4" class="shimmer"/>
      <circle cx="20" cy="200" r="4" class="shimmer" style="animation-delay:.7s"/>
      <circle cx="270" cy="220" r="4" class="shimmer" style="animation-delay:1.3s"/>
    </g>
    <text x="150" y="308" text-anchor="middle" class="lbl">真空吸盘高速旋转 3000~6000 转/分,离心力把胶甩成均匀薄膜</text>
  </g>

  <!-- 剖面 -->
  <g transform="translate(560,90)">
    <rect x="0" y="0" width="310" height="230" rx="12" fill="#1a2135" stroke="#2a3350"/>
    <text x="155" y="30" text-anchor="middle" class="lbl-b" font-size="13">晶圆剖面</text>
    <g transform="translate(55,60)">
      <rect x="0" y="76" width="200" height="60" fill="#5f6d8e"/>
      <text x="100" y="112" text-anchor="middle" font-size="12" fill="#dfe8fa">硅衬底</text>
      <rect x="0" y="58" width="200" height="18" fill="#2dd4bf" opacity=".9"/>
      <text x="100" y="71" text-anchor="middle" font-size="10" fill="#04332d" font-weight="bold">SiO₂</text>
      <rect x="0" y="36" width="200" height="22" fill="#f59e0b" class="grow1"/>
      <text x="100" y="52" text-anchor="middle" font-size="11" fill="#4a2a05" font-weight="bold">光刻胶(~1μm)</text>
    </g>
    <text x="155" y="185" text-anchor="middle" class="lbl-s">涂完还要"软烘":90~110°C 烤干溶剂</text>
    <text x="155" y="207" text-anchor="middle" class="lbl-s">厚度均匀性要求:±1 纳米级</text>
  </g>
</svg>
</template>

<!-- ============ 场景 B3:光刻机曝光(核心大场景) ============ -->
<template id="sc-b3">
<svg viewBox="0 0 900 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="uvBeam" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#c4b5fd" stop-opacity=".95"/><stop offset="1" stop-color="#7c3aed" stop-opacity=".55"/>
    </linearGradient>
    <linearGradient id="machineG" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#232a3d"/><stop offset=".5" stop-color="#2c3550"/><stop offset="1" stop-color="#232a3d"/>
    </linearGradient>
  </defs>
  <text x="30" y="36" class="lbl-b" font-size="15">STEP 3 · 光刻机曝光:把电路图"拍照"到晶圆上(核心步骤)</text>
  <text x="30" y="58" class="lbl">光刻机本质是一台极致精密的"投影仪":光源 → 掩膜版 → 缩小镜头 → 晶圆</text>

  <!-- 机身外框 -->
  <rect x="330" y="70" width="240" height="390" rx="14" fill="url(#machineG)" stroke="#4b5570" stroke-width="2"/>

  <!-- ① 光源 -->
  <g transform="translate(450,100)">
    <circle r="22" fill="#a78bfa" class="pulse glow-uv"/>
    <circle r="34" fill="none" stroke="#a78bfa" stroke-width="1.5" opacity=".5" class="pulse"/>
    <text x="66" y="-8" class="lbl-b" font-size="12" fill="#c4b5fd">① 光源</text>
    <text x="66" y="10" class="lbl-s">DUV: ArF 准分子激光 193nm</text>
    <text x="66" y="26" class="lbl-s">EUV: 激光轰击锡滴 13.5nm</text>
  </g>

  <!-- 光束(分段闪烁,模拟脉冲曝光) -->
  <g class="beam-blink">
    <polygon points="443,124 457,124 462,168 438,168" fill="url(#uvBeam)"/>
    <!-- 匀光镜组 -->
    <polygon points="436,196 464,196 470,238 430,238" fill="url(#uvBeam)"/>
    <!-- 穿过掩膜后带图形的光 -->
    <polygon points="428,268 472,268 490,352 410,352" fill="url(#uvBeam)" opacity=".8"/>
    <!-- 经物镜缩小 4 倍聚焦 -->
    <polygon points="418,382 482,382 458,428 442,428" fill="url(#uvBeam)"/>
    <polygon points="442,428 458,428 452,446 448,446" fill="#e9d5ff"/>
  </g>

  <!-- ② 照明镜组 -->
  <g transform="translate(450,182)">
    <ellipse rx="46" ry="9" fill="#385a8f" stroke="#7ea6dd" stroke-width="2"/>
    <text x="70" y="4" class="lbl-b" font-size="12" fill="#9fd0ff">② 照明系统</text>
    <text x="70" y="20" class="lbl-s">把激光整形成均匀光束</text>
  </g>

  <!-- ③ 掩膜版 -->
  <g transform="translate(400,246)">
    <rect x="0" y="0" width="100" height="14" rx="2" fill="#0d1322" stroke="#8b96b3" stroke-width="1.5"/>
    <!-- 掩膜图形:透光缝 -->
    <g fill="#c4b5fd" class="pulse">
      <rect x="12" y="3" width="8" height="8"/><rect x="30" y="3" width="14" height="8"/>
      <rect x="54" y="3" width="8" height="8"/><rect x="72" y="3" width="16" height="8"/>
    </g>
    <text x="120" y="6" class="lbl-b" font-size="12" fill="#9fd0ff">③ 掩膜版 Reticle</text>
    <text x="120" y="22" class="lbl-s">石英板+铬膜,刻着放大 4 倍的电路图</text>
  </g>

  <!-- ④ 投影物镜 -->
  <g transform="translate(450,362)">
    <ellipse rx="52" ry="10" fill="#385a8f" stroke="#7ea6dd" stroke-width="2"/>
    <ellipse cy="18" rx="40" ry="8" fill="#385a8f" stroke="#7ea6dd" stroke-width="2"/>
    <text x="76" y="0" class="lbl-b" font-size="12" fill="#9fd0ff">④ 投影物镜</text>
    <text x="76" y="16" class="lbl-s">数十片镜片,把图形缩小 4 倍</text>
    <text x="76" y="32" class="lbl-s">精度:纳米级像差校正</text>
  </g>

  <!-- ⑤ 晶圆台(步进) -->
  <g transform="translate(360,440)">
    <rect x="-20" y="14" width="220" height="16" rx="6" fill="#39445f"/>
    <g class="stepper">
      <rect x="0" y="0" width="44" height="14" rx="3" fill="#8fa2c8" stroke="#dfe8fa"/>
    </g>
    <text x="240" y="12" class="lbl-b" font-size="12" fill="#9fd0ff">⑤ 晶圆工作台</text>
    <text x="240" y="28" class="lbl-s">每曝光一个区域就"步进"到下一格</text>
  </g>

  <!-- 左侧:曝光场俯视 -->
  <g transform="translate(60,120)">
    <rect x="0" y="0" width="220" height="250" rx="12" fill="#1a2135" stroke="#2a3350"/>
    <text x="110" y="28" text-anchor="middle" class="lbl-b" font-size="13">晶圆俯视:逐格曝光</text>
    <g transform="translate(38,50)">
      <circle cx="72" cy="72" r="76" fill="#222b42" stroke="#4b5570"/>
      <clipPath id="wc2"><circle cx="72" cy="72" r="72"/></clipPath>
      <g clip-path="url(#wc2)">
        <g stroke="#39445f"><path d="M0 24h144M0 48h144M0 72h144M0 96h144M0 120h144M24 0v144M48 0v144M72 0v144M96 0v144M120 0v144"/></g>
        <g class="stepper" style="animation-duration:6s">
          <rect x="14" y="38" width="22" height="17" fill="#a78bfa" class="glow-uv"/>
        </g>
      </g>
    </g>
    <text x="110" y="220" text-anchor="middle" class="lbl-s">一片晶圆要曝光上百次</text>
    <text x="110" y="238" text-anchor="middle" class="lbl-s">对准精度 < 2 纳米</text>
  </g>

  <!-- 右侧:关键数据 -->
  <g transform="translate(620,120)">
    <rect x="0" y="0" width="250" height="250" rx="12" fill="#1a2135" stroke="#2a3350"/>
    <text x="125" y="30" text-anchor="middle" class="lbl-b" font-size="13">为什么这么难?</text>
    <g font-size="12.5" fill="#c3cbe0">
      <text x="20" y="62">光波长越短,能刻的线越细</text>
      <text x="20" y="88" fill="#a78bfa">EUV 13.5nm 光在空气中都会</text>
      <text x="20" y="106" fill="#a78bfa">被吸收 → 全程真空 + 反射镜</text>
      <text x="20" y="134">反射镜平整度:皮米级</text>
      <text x="20" y="160">晶圆台移动速度 > 1m/s,</text>
      <text x="20" y="178">定位却准到原子直径级别</text>
      <text x="20" y="206" fill="#ffb347">一台 EUV 光刻机 ≈ 1.5 亿欧元</text>
      <text x="20" y="228" fill="#ffb347">10 万+ 零件,全球仅 ASML 能造</text>
    </g>
  </g>
</svg>
</template>

<!-- ============ 场景 B4:显影 ============ -->
<template id="sc-b4">
<svg viewBox="0 0 900 420" xmlns="http://www.w3.org/2000/svg">
  <text x="30" y="40" class="lbl-b" font-size="15">STEP 4 · 显影:让"看不见的照片"显形</text>
  <text x="30" y="62" class="lbl">被光照过的胶(正胶)溶于显影液,冲洗后电路图案便留在胶层上</text>

  <!-- 剖面动画:曝光区溶解 -->
  <g transform="translate(90,110)">
    <rect x="-20" y="-20" width="440" height="270" rx="12" fill="#1a2135" stroke="#2a3350"/>
    <text x="200" y="8" text-anchor="middle" class="lbl-b" font-size="13">剖面:曝光区域被溶解冲走</text>
    <!-- 显影液喷淋 -->
    <g fill="#7dd3fc">
      <circle cx="80" cy="50" r="3.5" class="float-up" style="animation-direction:reverse;animation-duration:1.4s"/>
      <circle cx="160" cy="44" r="3.5" class="float-up" style="animation-direction:reverse;animation-duration:1.4s;animation-delay:.5s"/>
      <circle cx="240" cy="50" r="3.5" class="float-up" style="animation-direction:reverse;animation-duration:1.4s;animation-delay:.9s"/>
      <circle cx="320" cy="46" r="3.5" class="float-up" style="animation-direction:reverse;animation-duration:1.4s;animation-delay:.2s"/>
    </g>
    <text x="200" y="34" text-anchor="middle" class="lbl-s">TMAH 显影液喷淋</text>
    <g transform="translate(40,120)">
      <rect x="0" y="60" width="320" height="60" fill="#5f6d8e"/>
      <text x="160" y="96" text-anchor="middle" font-size="12" fill="#dfe8fa">硅衬底</text>
      <rect x="0" y="42" width="320" height="18" fill="#2dd4bf" opacity=".9"/>
      <text x="160" y="55" text-anchor="middle" font-size="10" fill="#04332d" font-weight="bold">SiO₂</text>
      <!-- 未曝光的胶:保留 -->
      <g fill="#f59e0b">
        <rect x="0" y="14" width="52" height="28"/>
        <rect x="96" y="14" width="60" height="28"/>
        <rect x="200" y="14" width="46" height="28"/>
        <rect x="290" y="14" width="30" height="28"/>
      </g>
      <!-- 曝光的胶:溶解消失 -->
      <g fill="#c084fc">
        <rect x="52" y="14" width="44" height="28" class="dissolve"/>
        <rect x="156" y="14" width="44" height="28" class="dissolve" style="animation-delay:.5s"/>
        <rect x="246" y="14" width="44" height="28" class="dissolve" style="animation-delay:1s"/>
      </g>
      <text x="160" y="-8" text-anchor="middle" class="lbl-s">紫色=被曝光(溶解) 橙色=未曝光(保留)</text>
    </g>
  </g>

  <g transform="translate(560,100)">
    <rect x="0" y="0" width="310" height="240" rx="12" fill="#1a2135" stroke="#2a3350"/>
    <text x="155" y="32" text-anchor="middle" class="lbl-b" font-size="13">正胶 vs 负胶</text>
    <g font-size="13" fill="#c3cbe0">
      <text x="24" y="70" fill="#f59e0b">正胶:被光照的部分溶解</text>
      <text x="24" y="94" class="lbl">→ 留下的图形和掩膜相同</text>
      <text x="24" y="130" fill="#a78bfa">负胶:被光照的部分固化</text>
      <text x="24" y="154" class="lbl">→ 留下的图形和掩膜相反</text>
      <text x="24" y="196" fill="#4ade80">显影后检查图形,不合格可以</text>
      <text x="24" y="218" fill="#4ade80">洗掉重来 —— 蚀刻之后就不行了</text>
    </g>
  </g>
</svg>
</template>

<!-- ============ 场景 B5:蚀刻 ============ -->
<template id="sc-b5">
<svg viewBox="0 0 900 420" xmlns="http://www.w3.org/2000/svg">
  <text x="30" y="40" class="lbl-b" font-size="15">STEP 5 · 等离子蚀刻:把图案真正"刻"进材料</text>
  <text x="30" y="62" class="lbl">光刻胶只是模板;等离子体轰击没有胶保护的区域,把图形刻入 SiO₂/硅</text>

  <!-- 蚀刻腔 -->
  <g transform="translate(90,100)">
    <rect x="0" y="0" width="420" height="270" rx="14" fill="#141b2d" stroke="#4b5570" stroke-width="2"/>
    <text x="210" y="26" text-anchor="middle" class="lbl-s">真空反应腔(RIE 反应离子蚀刻)</text>
    <!-- 上电极 -->
    <rect x="60" y="40" width="300" height="12" rx="4" fill="#39445f"/>
    <text x="210" y="34" text-anchor="middle" class="lbl-s" opacity="0">.</text>
    <!-- 等离子体辉光 -->
    <rect x="60" y="52" width="300" height="90" fill="#7c3aed" opacity=".22" class="pulse"/>
    <text x="210" y="80" text-anchor="middle" font-size="12" fill="#c4b5fd">CF₄ / SF₆ 等离子体辉光</text>
    <!-- 离子往下轰 -->
    <g stroke="#c4b5fd" stroke-width="2.5">
      <line x1="110" y1="100" x2="110" y2="146" class="etch-ion"/>
      <line x1="170" y1="100" x2="170" y2="146" class="etch-ion" style="animation-delay:.3s"/>
      <line x1="230" y1="100" x2="230" y2="146" class="etch-ion" style="animation-delay:.6s"/>
      <line x1="290" y1="100" x2="290" y2="146" class="etch-ion" style="animation-delay:.15s"/>
      <line x1="330" y1="100" x2="330" y2="146" class="etch-ion" style="animation-delay:.45s"/>
    </g>
    <!-- 晶圆剖面 -->
    <g transform="translate(60,150)">
      <g fill="#f59e0b">
        <rect x="0" y="0" width="52" height="20"/><rect x="96" y="0" width="60" height="20"/>
        <rect x="200" y="0" width="46" height="20"/><rect x="270" y="0" width="30" height="20"/>
      </g>
      <!-- SiO2 层:开口处被刻穿 -->
      <path d="M0 20 h52 v0 h0 V20 h0 z" fill="none"/>
      <g fill="#2dd4bf" opacity=".9">
        <rect x="0" y="20" width="52" height="16"/><rect x="96" y="20" width="60" height="16"/>
        <rect x="200" y="20" width="46" height="16"/><rect x="270" y="20" width="30" height="16"/>
      </g>
      <!-- 被刻出的沟槽 -->
      <g fill="#0d1120">
        <rect x="52" y="20" width="44" height="16"/><rect x="156" y="20" width="44" height="16"/>
        <rect x="246" y="20" width="24" height="16"/>
      </g>
      <rect x="0" y="36" width="300" height="50" fill="#5f6d8e"/>
      <text x="150" y="66" text-anchor="middle" font-size="12" fill="#dfe8fa">硅衬底</text>
    </g>
    <rect x="60" y="240" width="300" height="12" rx="4" fill="#39445f"/>
    <text x="210" y="266" text-anchor="middle" class="lbl-s">下电极(射频偏压,吸引离子垂直轰击)</text>
  </g>

  <g transform="translate(560,100)">
    <rect x="0" y="0" width="310" height="240" rx="12" fill="#1a2135" stroke="#2a3350"/>
    <text x="155" y="32" text-anchor="middle" class="lbl-b" font-size="13">蚀刻完成后:去胶</text>
    <g transform="translate(55,60)">
      <g fill="#2dd4bf" opacity=".9">
        <rect x="0" y="20" width="36" height="16"/><rect x="66" y="20" width="42" height="16"/>
        <rect x="138" y="20" width="32" height="16"/><rect x="188" y="20" width="22" height="16"/>
      </g>
      <rect x="0" y="36" width="210" height="46" fill="#5f6d8e"/>
      <text x="105" y="64" text-anchor="middle" font-size="12" fill="#dfe8fa">硅衬底</text>
      <text x="105" y="8" text-anchor="middle" class="lbl-s">O₂ 等离子"灰化"洗掉光刻胶</text>
    </g>
    <g font-size="12.5" fill="#c3cbe0">
      <text x="24" y="176">掩膜上的图案至此永久转移</text>
      <text x="24" y="198">到了晶圆表面的材料层上</text>
      <text x="24" y="224" fill="#4ade80">垂直度可达 90°,深宽比 > 50:1</text>
    </g>
  </g>
</svg>
</template>

<!-- ============ 场景 B6:离子注入 ============ -->
<template id="sc-b6">
<svg viewBox="0 0 900 420" xmlns="http://www.w3.org/2000/svg">
  <text x="30" y="40" class="lbl-b" font-size="15">STEP 6 · 离子注入:给硅"掺入杂质"造晶体管</text>
  <text x="30" y="62" class="lbl">纯硅几乎不导电;精确打入硼/磷离子,才能形成 PN 结 —— 晶体管的心脏</text>

  <!-- 注入机 -->
  <g transform="translate(70,110)">
    <rect x="0" y="30" width="130" height="60" rx="10" fill="#1a2135" stroke="#2a3350"/>
    <text x="65" y="56" text-anchor="middle" class="lbl-b" font-size="12">离子源</text>
    <text x="65" y="76" text-anchor="middle" class="lbl-s">B⁺ / P⁺ / As⁺</text>
    <!-- 加速管 -->
    <rect x="140" y="45" width="180" height="30" rx="8" fill="#141b2d" stroke="#4b5570"/>
    <g stroke="#5b6a8f" stroke-width="2"><line x1="170" y1="45" x2="170" y2="75"/><line x1="210" y1="45" x2="210" y2="75"/><line x1="250" y1="45" x2="250" y2="75"/><line x1="290" y1="45" x2="290" y2="75"/></g>
    <text x="230" y="34" text-anchor="middle" class="lbl-s">静电加速(可达数百 keV)</text>
    <!-- 束流 -->
    <line x1="140" y1="60" x2="330" y2="60" stroke="#4ade80" stroke-width="3" class="flow glow-blue"/>
    <!-- 偏转磁铁 -->
    <g transform="translate(335,30)">
      <path d="M0 30 Q 40 30 55 70 L 40 82 Q 30 50 0 50 Z" fill="#39445f" stroke="#5b6a8f"/>
      <text x="70" y="30" class="lbl-s">分析磁铁:按质量筛选</text>
      <text x="70" y="46" class="lbl-s">只放行需要的离子</text>
    </g>
    <line x1="380" y1="105" x2="430" y2="185" stroke="#4ade80" stroke-width="3" class="flow glow-blue"/>
  </g>

  <!-- 晶圆截面接收注入 -->
  <g transform="translate(360,290)">
    <g stroke="#4ade80" stroke-width="2.5">
      <line x1="60" y1="0" x2="60" y2="40" class="implant"/>
      <line x1="105" y1="0" x2="105" y2="40" class="implant" style="animation-delay:.3s"/>
      <line x1="150" y1="0" x2="150" y2="40" class="implant" style="animation-delay:.6s"/>
      <line x1="195" y1="0" x2="195" y2="40" class="implant" style="animation-delay:.15s"/>
    </g>
    <g transform="translate(20,42)">
      <g fill="#2dd4bf" opacity=".9">
        <rect x="0" y="0" width="42" height="14"/><rect x="88" y="0" width="50" height="14"/><rect x="186" y="0" width="44" height="14"/>
      </g>
      <rect x="0" y="14" width="230" height="52" fill="#5f6d8e"/>
      <!-- 掺杂区(只在开口下方) -->
      <ellipse cx="65" cy="22" rx="22" ry="9" fill="#4ade80" opacity=".85" class="pulse"/>
      <ellipse cx="162" cy="22" rx="23" ry="9" fill="#4ade80" opacity=".85" class="pulse" style="animation-delay:.7s"/>
      <text x="115" y="50" text-anchor="middle" font-size="11" fill="#dfe8fa">SiO₂ 挡住的地方不被注入 → 精确定域掺杂</text>
    </g>
  </g>

  <g transform="translate(640,100)">
    <rect x="0" y="0" width="230" height="165" rx="12" fill="#1a2135" stroke="#2a3350"/>
    <text x="115" y="30" text-anchor="middle" class="lbl-b" font-size="13">掺杂改变导电性</text>
    <g font-size="12.5" fill="#c3cbe0">
      <text x="20" y="60">掺磷 P(5 价)→ N 型:多电子</text>
      <text x="20" y="86">掺硼 B(3 价)→ P 型:多空穴</text>
      <text x="20" y="112" fill="#4ade80">N + P 拼起来 = 晶体管开关</text>
      <text x="20" y="140" class="lbl-s">注入后需 ~1000°C 退火激活</text>
    </g>
  </g>
</svg>
</template>

<!-- ============ 场景 B7:沉积与多层互连 ============ -->
<template id="sc-b7">
<svg viewBox="0 0 900 440" xmlns="http://www.w3.org/2000/svg">
  <text x="30" y="40" class="lbl-b" font-size="15">STEP 7 · 薄膜沉积 + 金属互连:一层层盖起"摩天大楼"</text>
  <text x="30" y="62" class="lbl">光刻→蚀刻→沉积循环重复 数十次,把数十亿晶体管用铜导线连成电路</text>

  <!-- 分层结构 -->
  <g transform="translate(120,90)">
    <rect x="-30" y="-16" width="420" height="330" rx="12" fill="#1a2135" stroke="#2a3350"/>
    <text x="180" y="8" text-anchor="middle" class="lbl-b" font-size="13">芯片剖面(约 30~100+ 道光刻层)</text>
    <g transform="translate(30,40)">
      <!-- 衬底与晶体管层 -->
      <rect x="0" y="220" width="300" height="40" fill="#5f6d8e"/>
      <text x="150" y="245" text-anchor="middle" font-size="11" fill="#dfe8fa">硅衬底</text>
      <!-- 晶体管 -->
      <g>
        <ellipse cx="60" cy="222" rx="20" ry="7" fill="#4ade80"/>
        <ellipse cx="120" cy="222" rx="20" ry="7" fill="#4ade80"/>
        <rect x="78" y="196" width="24" height="18" fill="#f472b6"/>
        <ellipse cx="200" cy="222" rx="20" ry="7" fill="#4ade80"/>
        <ellipse cx="260" cy="222" rx="20" ry="7" fill="#4ade80"/>
        <rect x="218" y="196" width="24" height="18" fill="#f472b6"/>
        <text x="90" y="190" text-anchor="middle" class="lbl-s">栅极</text>
      </g>
      <rect x="0" y="170" width="300" height="50" fill="#2dd4bf" opacity=".35"/>
      <!-- 触点 -->
      <g fill="#fbbf24">
        <rect x="55" y="176" width="10" height="44"/><rect x="115" y="176" width="10" height="44"/>
        <rect x="195" y="176" width="10" height="44"/><rect x="255" y="176" width="10" height="44"/>
      </g>
      <!-- 金属层 M1 -->
      <g class="grow1" style="animation-delay:.2s">
        <rect x="0" y="140" width="300" height="30" fill="#26314e"/>
        <rect x="40" y="150" width="90" height="12" fill="#fbbf24"/>
        <rect x="180" y="150" width="95" height="12" fill="#fbbf24"/>
        <rect x="118" y="120" width="10" height="42" fill="#fbbf24"/>
      </g>
      <!-- 金属层 M2 -->
      <g class="grow1" style="animation-delay:1s">
        <rect x="0" y="105" width="300" height="35" fill="#222c47"/>
        <rect x="70" y="112" width="160" height="12" fill="#fbbf24"/>
        <rect x="90" y="84" width="10" height="40" fill="#fbbf24"/>
      </g>
      <!-- 金属层 M3 -->
      <g class="grow1" style="animation-delay:1.8s">
        <rect x="0" y="70" width="300" height="35" fill="#1e2740"/>
        <rect x="40" y="78" width="220" height="14" fill="#fbbf24"/>
      </g>
      <!-- 顶层焊盘 -->
      <g class="grow1" style="animation-delay:2.6s">
        <rect x="0" y="40" width="300" height="30" fill="#1a2338"/>
        <rect x="120" y="44" width="60" height="18" fill="#e2b13c"/>
        <text x="150" y="32" text-anchor="middle" class="lbl-s">顶层铝/铜焊盘</text>
      </g>
      <!-- 层标注 -->
      <g class="lbl-s" font-size="10">
        <text x="310" y="158">金属层 M1</text>
        <text x="310" y="122">金属层 M2</text>
        <text x="310" y="88">金属层 M3…M15</text>
        <text x="310" y="200">钨触点</text>
        <text x="310" y="226">晶体管层</text>
      </g>
    </g>
  </g>

  <!-- 循环图 -->
  <g transform="translate(590,100)">
    <rect x="0" y="0" width="280" height="290" rx="12" fill="#1a2135" stroke="#2a3350"/>
    <text x="140" y="32" text-anchor="middle" class="lbl-b" font-size="13">核心循环(每层重复)</text>
    <g transform="translate(140,160)">
      <circle r="88" fill="none" stroke="#34406a" stroke-width="1.5" stroke-dasharray="4 5"/>
      <g class="spin" style="animation-duration:10s">
        <circle cx="0" cy="-88" r="5" fill="#4da3ff" class="glow-blue"/>
      </g>
      <g font-size="12" text-anchor="middle">
        <text x="0" y="-100" fill="#f59e0b">沉积薄膜</text>
        <text x="96" y="-30" fill="#a78bfa">涂胶·曝光</text>
        <text x="82" y="66" fill="#7dd3fc">显影</text>
        <text x="0" y="106" fill="#ff8a65">蚀刻/注入</text>
        <text x="-88" y="60" fill="#4ade80">去胶·清洗</text>
        <text x="-92" y="-34" fill="#e8ecf6">CMP 磨平</text>
      </g>
      <text x="0" y="6" text-anchor="middle" font-size="13" fill="#8b96b3">× 30~100 层</text>
    </g>
  </g>
</svg>
</template>

<!-- ============ 场景 B8:切割封装 ============ -->
<template id="sc-b8">
<svg viewBox="0 0 900 420" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="pkgG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2c3550"/><stop offset="1" stop-color="#1a2135"/>
    </linearGradient>
  </defs>
  <text x="30" y="40" class="lbl-b" font-size="15">STEP 8 · 测试、切割与封装:芯片诞生</text>
  <text x="30" y="62" class="lbl">探针逐颗电测 → 金刚石刀切割 → 键合引线 → 塑封成你熟悉的"黑色小方块"</text>

  <!-- 切割 -->
  <g transform="translate(60,110)">
    <circle cx="110" cy="120" r="105" fill="#222b42" stroke="#4b5570"/>
    <clipPath id="wc3"><circle cx="110" cy="120" r="100"/></clipPath>
    <g clip-path="url(#wc3)">
      <g stroke="#39445f"><path d="M10 60h200M10 95h200M10 130h200M10 165h200M10 200h200M45 20v200M80 20v200M115 20v200M150 20v200M185 20v200"/></g>
      <g fill="#4da3ff" opacity=".6">
        <rect x="46" y="61" width="33" height="33"/><rect x="81" y="96" width="33" height="33"/>
        <rect x="116" y="61" width="33" height="33"/><rect x="151" y="131" width="33" height="33"/>
        <rect x="46" y="131" width="33" height="33"/><rect x="116" y="166" width="33" height="33"/>
      </g>
      <g fill="#ff6b4a" opacity=".55">
        <rect x="81" y="26" width="33" height="33"/><rect x="151" y="61" width="33" height="33"/>
      </g>
      <!-- 切割刀线 -->
      <line x1="10" y1="95" x2="210" y2="95" stroke="#ffd08a" stroke-width="2.5" class="wiresaw glow-hot"/>
    </g>
    <text x="110" y="250" text-anchor="middle" class="lbl">蓝=合格 Die,红=测试不合格</text>
    <text x="110" y="270" text-anchor="middle" class="lbl-s">切割精度 ±微米,切缝 ~30μm</text>
  </g>

  <!-- 键合 -->
  <g transform="translate(340,120)">
    <rect x="0" y="0" width="230" height="210" rx="12" fill="#1a2135" stroke="#2a3350"/>
    <text x="115" y="28" text-anchor="middle" class="lbl-b" font-size="13">引线键合</text>
    <g transform="translate(35,60)">
      <rect x="0" y="70" width="160" height="26" rx="4" fill="#39445f"/>
      <rect x="52" y="38" width="56" height="34" fill="#4da3ff" opacity=".85"/>
      <text x="80" y="60" text-anchor="middle" font-size="10" fill="#04101f" font-weight="bold">Die</text>
      <!-- 引脚 -->
      <g fill="#8b98b8">
        <rect x="-14" y="76" width="16" height="8"/><rect x="158" y="76" width="16" height="8"/>
        <rect x="-14" y="90" width="16" height="8"/><rect x="158" y="90" width="16" height="8"/>
      </g>
      <!-- 金线(逐条画出) -->
      <g stroke="#fbbf24" stroke-width="2" fill="none">
        <path d="M58 40 Q 20 8 -6 74" class="draw"/>
        <path d="M102 40 Q 145 8 166 74" class="draw" style="animation-delay:.7s"/>
        <path d="M66 40 Q 12 26 -6 88" class="draw" style="animation-delay:1.4s"/>
        <path d="M94 40 Q 150 26 166 88" class="draw" style="animation-delay:2.1s"/>
      </g>
    </g>
    <text x="115" y="192" text-anchor="middle" class="lbl-s">头发丝 1/4 细的金线连接内外</text>
  </g>

  <!-- 成品芯片 -->
  <g transform="translate(620,110)">
    <rect x="0" y="0" width="250" height="230" rx="12" fill="#1a2135" stroke="#2a3350"/>
    <text x="125" y="30" text-anchor="middle" class="lbl-b" font-size="13">成品芯片 🎉</text>
    <g transform="translate(50,60)" class="rise">
      <rect x="0" y="0" width="150" height="100" rx="8" fill="url(#pkgG)" stroke="#4b5570" stroke-width="2"/>
      <g fill="#8b98b8">
        <rect x="-16" y="12" width="16" height="7"/><rect x="-16" y="30" width="16" height="7"/>
        <rect x="-16" y="48" width="16" height="7"/><rect x="-16" y="66" width="16" height="7"/><rect x="-16" y="84" width="16" height="7"/>
        <rect x="150" y="12" width="16" height="7"/><rect x="150" y="30" width="16" height="7"/>
        <rect x="150" y="48" width="16" height="7"/><rect x="150" y="66" width="16" height="7"/><rect x="150" y="84" width="16" height="7"/>
      </g>
      <circle cx="18" cy="16" r="5" fill="#0d1120" stroke="#4b5570"/>
      <text x="75" y="48" text-anchor="middle" font-size="13" fill="#9fd0ff" font-family="Consolas,monospace">SILICON</text>
      <text x="75" y="68" text-anchor="middle" font-size="10" fill="#5b6a8f" font-family="Consolas,monospace">from SAND · 2026</text>
    </g>
    <text x="125" y="200" text-anchor="middle" font-size="12" fill="#4ade80">从一粒沙,到数十亿晶体管</text>
    <text x="125" y="218" text-anchor="middle" class="lbl-s">整个流程 2~3 个月,上千道工序</text>
  </g>
</svg>
</template>
`;

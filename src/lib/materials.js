/* PBR 材质库:参数尽量贴近真实材料的反射率 / 粗糙度 / 折射率 */
import * as THREE from 'three';
import { brushedTex, noiseTex } from './textures.js';

const std = (o) => new THREE.MeshStandardMaterial(o);
const phy = (o) => new THREE.MeshPhysicalMaterial(o);

export const M = {
  // 不锈钢腔体(拉丝)
  steel: (o = {}) => std({ color: '#c9ced3', metalness: 1, roughness: 0.32, roughnessMap: brushedTex({ repeat: o.rep || [2, 2] }), ...o.p }),
  steelDark: (o = {}) => std({ color: '#7d838b', metalness: 1, roughness: 0.45, ...o }),
  chrome: (o = {}) => std({ color: '#e6e9ec', metalness: 1, roughness: 0.08, ...o }),
  alu: (o = {}) => std({ color: '#d4d7db', metalness: 1, roughness: 0.38, ...o }),
  // 设备喷涂面板(半导体设备常见的白色/浅灰烤漆)
  paint: (color = '#e8ebee', o = {}) => phy({ color, metalness: 0, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.3, ...o }),
  plastic: (color = '#333', o = {}) => std({ color, metalness: 0, roughness: 0.55, ...o }),
  rubber: (color = '#1d1f22') => std({ color, metalness: 0, roughness: 0.9 }),
  copper: (o = {}) => std({ color: '#e7a07a', metalness: 1, roughness: 0.22, ...o }),
  gold: (o = {}) => std({ color: '#ffcf70', metalness: 1, roughness: 0.18, ...o }),
  tungsten: (o = {}) => std({ color: '#a7abb0', metalness: 1, roughness: 0.35, ...o }),
  graphite: (o = {}) => std({ color: '#2b2c2f', metalness: 0.15, roughness: 0.78, roughnessMap: noiseTex({ seed: 5 }), ...o }),
  // 单晶硅抛光面:带金属光泽的蓝灰色,可见光反射率 ~35%
  silicon: (o = {}) => phy({ color: '#8a929e', metalness: 0.92, roughness: 0.07, ...o }),
  siliconRough: (o = {}) => std({ color: '#7e858f', metalness: 0.8, roughness: 0.5, roughnessMap: noiseTex({ seed: 2, amp: 80 }), ...o }),
  // 熔融石英(透明,IOR 1.46)
  quartz: (o = {}) => phy({ color: '#ffffff', metalness: 0, roughness: 0.04, transmission: 1, thickness: 0.3, ior: 1.46, transparent: true, ...o }),
  // 视窗玻璃 / 透明腔体(用于剖视时的半透明外罩)
  glass: (o = {}) => phy({ color: '#dfe9f2', metalness: 0, roughness: 0.05, transmission: 0.92, thickness: 0.05, ior: 1.5, transparent: true, ...o }),
  // 氧化层 / 介质薄膜:物理薄膜干涉(iridescence)
  thinFilm: (nm, ior = 1.46, base = '#8a929e', o = {}) => phy({
    color: base, metalness: 0.9, roughness: 0.06,
    iridescence: 1, iridescenceIOR: ior, iridescenceThicknessRange: [nm, nm], ...o,
  }),
  // 高温发光体(配合 Bloom)
  hot: (color = '#ff7a2a', intensity = 3, o = {}) => std({ color: '#2a1206', emissive: color, emissiveIntensity: intensity, roughness: 0.6, ...o }),
  emissive: (color, intensity = 2, o = {}) => std({ color: '#000', emissive: color, emissiveIntensity: intensity, ...o }),
  // 加色混合光束(激光、等离子体、离子束)
  beam: (color, opacity = 0.5, o = {}) => new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, ...o,
  }),
  // 介质(低 k / 氧化物)透明块
  dielectric: (color = '#9fd6e6', opacity = 0.18, o = {}) => phy({
    color, metalness: 0, roughness: 0.15, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, ...o,
  }),
  matte: (color, o = {}) => std({ color, metalness: 0, roughness: 0.85, ...o }),
};

/* A7 成品晶圆:镜面抛光晶圆(缺口 + 激光刻号)、FOUP 晶圆盒、洁净室与天车 */
import * as THREE from 'three';
import { M } from '../lib/materials.js';
import { mesh, cyl, box, rbox, lights, V, smooth, lerp } from '../lib/kit.js';
import { cleanroom, waferGeometry, laserMarkTex, foup, foupDoor } from '../lib/fab.js';

export default {
  bg: ['#9aa3ad', '#5d656f'],
  env: 0.7,
  exposure: 0.9,
  bloom: { strength: 0.3, threshold: 2.0 },
  zoom: [0.15, 20],
  views: [
    { name: '镜面晶圆', pos: [0.55, 1.55, 0.75], target: [0, 1.12, 0] },
    { name: '缺口与刻号', pos: [0.02, 1.17, 0.27], target: [0, 1.04, 0.13] },
    { name: 'FOUP 晶圆盒', pos: [1.3, 1.4, 1.2], target: [0.75, 1.05, 0.05] },
    { name: '晶圆厂', pos: [3.6, 2.4, 4.0], target: [0, 1.3, -1.5] },
  ],
  build({ root, label, renderer, scene }) {
    lights(root, { key: 1.4, keyPos: [2, 6, 3], hemi: 0.6, shadow: 3, rim: 0.6, sky: '#ffffff', ground: '#8a9099' });
    const { H } = cleanroom(root, { rows: [[-4.2, 0], [4.2, Math.PI]] });

    /* 宏观检查台:可倾斜旋转的真空吸盘 + 检查灯 */
    const st = new THREE.Group(); root.add(st);
    rbox(0.7, 0.9, 0.6, 0.02, M.paint('#e4e7ea'), { parent: st, pos: [0, 0.45, 0] });
    box(0.7, 0.03, 0.6, M.plastic('#1e2126'), { parent: st, pos: [0, 0.915, 0] });
    cyl(0.04, 0.05, 0.14, M.steel(), { parent: st, pos: [0, 1.0, 0] });
    const tilt = new THREE.Group(); tilt.position.set(0, 1.08, 0); tilt.rotation.x = 0.35; st.add(tilt);
    const spin = new THREE.Group(); tilt.add(spin);
    cyl(0.06, 0.06, 0.015, M.plastic('#2a2e35'), { parent: spin, pos: [0, -0.008, 0] });
    const waferMat = new THREE.MeshPhysicalMaterial({ color: '#8d97a4', metalness: 1, roughness: 0.02 });
    const wafer = mesh(waferGeometry(0.15, 0.00078, 0.006), waferMat, { parent: spin, pos: [0, 0.001, 0] });
    // 激光刻号(在缺口附近)
    const mark = mesh(new THREE.PlaneGeometry(0.05, 0.0095), new THREE.MeshBasicMaterial({ map: laserMarkTex('SX0217-07'), transparent: true, depthWrite: false }),
      { parent: spin, pos: [0, 0.0012, 0.127], rot: [-Math.PI / 2, 0, 0], cast: false });
    // 检查灯
    const lampArm = new THREE.Group(); lampArm.position.set(-0.3, 0.93, -0.25); root.add(lampArm);
    cyl(0.015, 0.015, 0.9, M.steel(), { parent: lampArm, pos: [0, 0.45, 0] });
    const lampHead = new THREE.Group(); lampHead.position.set(0.1, 0.92, 0.1); lampHead.rotation.set(0.5, 0.8, 0); lampArm.add(lampHead);
    cyl(0.08, 0.05, 0.1, M.paint('#3a4048'), { parent: lampHead, rot: [Math.PI / 2, 0, 0] });
    mesh(new THREE.CircleGeometry(0.075, 32), M.emissive('#fffaf0', 4), { parent: lampHead, pos: [0, 0, 0.051] });
    const spot = new THREE.SpotLight('#fff8ec', 1.5, 3, 0.5, 0.5, 1.5);
    spot.position.set(-0.2, 1.85, -0.15); spot.target.position.set(0, 1.08, 0);
    root.add(spot, spot.target);

    /* 桌面上的 FOUP(门已打开)*/
    const f = foup(); f.position.set(0.8, 0.93, 0.0); f.rotation.y = -0.6; root.add(f);
    box(0.6, 0.9, 0.5, M.paint('#e4e7ea'), { parent: root, pos: [0.8, 0.45, 0] });
    const door = foupDoor(); door.position.set(0.98, 1.11, 0.38); door.rotation.set(0, -0.2, 0); root.add(door);
    door.visible = false;

    /* 天车(OHT)运送另一只 FOUP 到设备装载口 */
    const ohtX = -0.45, railZ = -3.99;
    const veh = new THREE.Group(); veh.position.set(ohtX, H - 0.62, railZ); root.add(veh);
    rbox(0.7, 0.26, 0.5, 0.03, M.paint('#f0f2f4'), { parent: veh });
    box(0.5, 0.02, 0.4, M.paint('#2f3540'), { parent: veh, pos: [0, -0.13, 0] });
    const f2 = foup({ wafers: true, count: 25 }); f2.rotation.y = 0; root.add(f2);
    const belts = [];
    for (const [x, z] of [[-0.08, -0.06], [0.08, -0.06], [0, 0.07]]) {
      const b = box(0.012, 1, 0.003, M.plastic('#1a1c20'), { parent: root, cast: false });
      b.userData.off = [x, z];
      belts.push(b);
    }
    const grip = box(0.24, 0.03, 0.2, M.paint('#d5d9de'), { parent: root });

    /* 标注 */
    label('300mm 抛光晶圆<small>厚 775μm · 镜面 · 纯度 9N+</small>', V(-0.12, 1.2, 0.0));
    label('缺口 Notch<small>标记 <110> 晶向</small>', V(0.0, 0.002, 0.148), spin);
    label('激光刻号(晶圆 ID)', V(0.026, 0.002, 0.127), spin);
    label('FOUP 前开式晶圆盒<small>25 片 · 内部充氮/洁净</small>', V(0.75, 1.33, 0.0));
    label('天车 OHT<small>沿天花板轨道自动运送 FOUP</small>', V(ohtX + 0.3, H - 0.5, railZ + 0.25));
    label('设备装载口 Load Port', V(-0.45, 0.95, railZ + 0.35));
    label('FFU 风机过滤单元<small>ISO 1~3 级洁净度</small>', V(1.2, H - 0.05, 0.6));

    // 用立方体相机实时捕获周围洁净室,让镜面晶圆反射出真实的天花板灯格
    const cubeRT = new THREE.WebGLCubeRenderTarget(512, { type: THREE.HalfFloatType });
    const cc = new THREE.CubeCamera(0.02, 40, cubeRT);
    cc.position.set(0, 1.12, 0);
    root.add(cc);
    let captured = false;

    return {
      dispose() { cubeRT.dispose(); },
      update(t, dt) {
        if (!captured) {
          captured = true;
          wafer.visible = false; mark.visible = false;
          cc.update(renderer, scene);
          wafer.visible = true; mark.visible = true;
          waferMat.envMap = cubeRT.texture; waferMat.envMapIntensity = 1.0; waferMat.needsUpdate = true;
        }
        spin.rotation.y = Math.sin(t * 0.3) * 0.6;
        // 天车:下放 → 停留 → 收回
        const k = (t % 16) / 16;
        const down = smooth(0.1, 0.4, k) * (1 - smooth(0.6, 0.9, k));
        const top = H - 0.75 - 0.4, bottom = 0.92;
        const y = lerp(top, bottom, down);
        f2.position.set(ohtX, y, railZ + 0.2);
        grip.position.set(ohtX, y + 0.4, railZ + 0.2);
        belts.forEach((b) => {
          const [x, z] = b.userData.off;
          const y0 = H - 0.75, y1 = y + 0.42;
          b.position.set(ohtX + x, (y0 + y1) / 2, railZ + 0.2 + z);
          b.scale.y = Math.max(0.01, y0 - y1);
        });
      },
    };
  },
};

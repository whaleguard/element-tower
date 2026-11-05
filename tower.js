// 엘리멘트 타워 3D — 층마다 미션(현실 2 + 탑 안 퍼즐 1) → 보호자 승인 → 관문이 열리면 다음 층
import * as THREE from 'three';

/* ================= 데이터 ================= */
const ROOMS = [
  { key: 'study', name: '교육실', desc: '퀴즈·배움 카드' },
  { key: 'arcade', name: '오락실', desc: '기억력 카드 게임' },
  { key: 'lab', name: '실험실', desc: '원소 물약 만들기' },
  { key: 'lounge', name: '휴게실', desc: '숨 고르기 1분' },
  { key: 'snack', name: '간식바', desc: '건강 간식 고르기' },
];
const FLOORS = [
  { n: 1, place: '수습생의 아지트', rank: '수습생', pts: '0 P', el: '돌', icon: '⛰', color: '#d9a35a', floor: '#3a2f26', wall: '#1a1612', guard: '등불 지기', item: '모험가 망토', itemKind: 'cape',
    missions: ['물건 10개 정리', '신발 5켤레 정리'], puzzle: 'study',
    quiz: [['물건을 쓴 다음 해야 할 일은?', ['제자리에 두기', '바닥에 두기', '숨기기'], 0], ['정리할 때 가장 먼저 할 일은?', ['쓸 것과 안 쓸 것 나누기', '전부 버리기', '침대 밑에 넣기'], 0], ['신발을 정리하는 곳은?', ['신발장', '책상 위', '냉장고'], 0]] },
  { n: 2, place: '견습생의 대장간', rank: '견습생', pts: '6,000 P', el: '불', icon: '🔥', color: '#ff7a2f', floor: '#3d231a', wall: '#1c100c', guard: '대장장이 드워프', item: '강철 방패', itemKind: 'shield',
    missions: ['책 20쪽 읽기', '일기·독서록 쓰기'], puzzle: 'lab',
    potion: ['숯불 가루', '강철 조각', '불꽃 씨앗', '맑은 물'] },
  { n: 3, place: '탐험가의 숲', rank: '탐험가', pts: '13,000 P', el: '숲', icon: '🌳', color: '#5fd16a', floor: '#22371f', wall: '#0f1a0e', guard: '숲의 정령', item: '탐험가 나침반', itemKind: 'compass',
    missions: ['퀴즈 20문제 (2라운드)', '문제집 10쪽 풀기'], puzzle: 'study',
    quiz: [['해가 뜨는 방향은?', ['동쪽', '서쪽', '북쪽'], 0], ['나무가 내뿜어 우리가 숨 쉬는 기체는?', ['산소', '수소', '질소'], 0], ['북극성을 찾을 때 많이 쓰는 별자리는?', ['북두칠성', '오리온', '전갈'], 0]] },
  { n: 4, place: '전문가의 연구실', rank: '전문가', pts: '23,000 P', el: '수정', icon: '💎', color: '#4fa8ff', floor: '#1d2c45', wall: '#0b1322', guard: '수정 연구원', item: '푸른 수정', itemKind: 'potion',
    missions: ['학교 숙제 다 하기', '학원 숙제 다 하기'], puzzle: 'arcade' },
  { n: 5, place: '마스터의 전당', rank: '마스터', pts: '36,000 P', el: '비전', icon: '🌀', color: '#a56bff', floor: '#2c1f45', wall: '#120b20', guard: '대마법사', item: '마스터 지팡이', itemKind: 'staff',
    missions: ['가벼운 운동 10분', '아이디어 1개 또는 디자인 작품'], puzzle: 'lab',
    potion: ['별빛 가루', '보랏빛 수정', '달빛 이슬', '비전 잉크'] },
  { n: 6, place: '왕의 성소', rank: '왕', pts: '54,000 P', el: '황금', icon: '👑', color: '#ffc94a', floor: '#3f321a', wall: '#1a140a', guard: '왕의 파수꾼', item: '왕관', itemKind: 'crown',
    missions: ['가족과 한 공간 함께 청소', '가족 회의에서 내 의견 말하기'], puzzle: 'arcade' },
];
const ROOM_OF = k => ROOMS.find(r => r.key === k);

/* ================= 저장 ================= */
const KEY = 'element-tower-v1';
const blank = () => ({ name: '', top: 1, done: {}, items: [], pin: '0000' });
let S = blank();
try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && !v.v2) { v.v2 = 1; } if (v && v.done) S = { ...blank(), ...v }; } catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
const fs = n => (S.done[n] ||= { m0: '', m1: '', p: false });
const floorClear = n => { const d = fs(n); return d.m0 === 'ok' && d.m1 === 'ok' && d.p; };
const countDone = n => { const d = fs(n); return (d.m0 === 'ok') + (d.m1 === 'ok') + (d.p ? 1 : 0); };

/* ================= 3D 기본 ================= */
const $ = s => document.querySelector(s);
const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
let scene = null, world = null, cur = 0; // cur 0 = 탑 앞 광장, 1~6 = 층
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, ...o });
const box = (w, h, d, m) => { const x = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); x.castShadow = x.receiveShadow = true; return x; };
const cyl = (rt, rb, h, m, s = 20) => { const x = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, s), m); x.castShadow = x.receiveShadow = true; return x; };
const at = (o, x, y, z, p) => { o.position.set(x, y, z); p && p.add(o); return o; };
const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
const sign = (text, w, h, bg, fg, font = 'Jua') => { const t = canvasTex(512, Math.round(512 * h / w), (g, W, H) => { g.fillStyle = bg; g.beginPath(); g.roundRect(0, 0, W, H, 28); g.fill(); g.fillStyle = fg; g.font = `${Math.round(H * 0.55)}px ${font}, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, W / 2, H / 2 + 4); }); return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide })); };

/* ================= 아바타 ================= */
function makeHero() {
  const g = new THREE.Group();
  const skin = M('#f2c9a5'), cloth = M('#3c5bd6'), dark = M('#2b2420');
  at(cyl(0.32, 0.38, 0.75, cloth), 0, 0.72, 0, g);
  at(new THREE.Mesh(new THREE.SphereGeometry(0.33, 18, 14), skin), 0, 1.38, 0, g);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.35, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), dark); at(hair, 0, 1.42, -0.01, g);
  for (const sx of [-0.11, 0.11]) at(new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), dark), sx, 1.4, 0.3, g);
  for (const sx of [-0.14, 0.14]) { const leg = at(cyl(0.09, 0.09, 0.38, dark, 10), sx, 0.2, 0, g); leg.userData.leg = sx; }
  g.userData.items = new THREE.Group(); g.add(g.userData.items);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
function dressHero(h) {
  const it = h.userData.items; while (it.children.length) it.remove(it.children[0]);
  for (const n of S.items) {
    const F = FLOORS[n - 1], c = F.color;
    if (F.itemKind === 'cape') { const cape = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.8), M(c, { side: THREE.DoubleSide })); cape.position.set(0, 0.85, -0.36); cape.rotation.x = 0.12; it.add(cape); }
    if (F.itemKind === 'potion') { at(new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), M(c, { emissive: c, emissiveIntensity: 0.6 })), 0.38, 0.62, 0.05, it); }
    if (F.itemKind === 'compass') { const cp = cyl(0.12, 0.12, 0.03, M('#d9c38a', { metalness: 0.6 })); cp.rotation.x = Math.PI / 2; at(cp, 0, 0.92, 0.36, it); }
    if (F.itemKind === 'shield') { const sh = cyl(0.3, 0.3, 0.05, M(c, { metalness: 0.4 }), 24); sh.rotation.z = Math.PI / 2; at(sh, -0.42, 0.75, 0.05, it); }
    if (F.itemKind === 'staff') { at(cyl(0.025, 0.025, 1.3, M('#8a6a3a'), 8), 0.45, 0.8, 0.1, it); at(new THREE.Mesh(new THREE.OctahedronGeometry(0.12), M(c, { emissive: c, emissiveIntensity: 1 })), 0.45, 1.5, 0.1, it); }
    if (F.itemKind === 'crown') { const cr = cyl(0.24, 0.22, 0.16, M('#f3c45b', { metalness: 0.8, roughness: 0.3 }), 8); at(cr, 0, 1.76, 0, it); }
  }
}

/* ================= 탑 앞 광장 ================= */
function buildOutside() {
  const sc = new THREE.Scene();
  sc.background = canvasTex(16, 256, (g, W, H) => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0b0f24'); gr.addColorStop(0.55, '#2b2f5a'); gr.addColorStop(1, '#6b4f6e'); g.fillStyle = gr; g.fillRect(0, 0, W, H); });
  sc.fog = new THREE.FogExp2('#1a2140', 0.012);
  sc.add(new THREE.HemisphereLight('#b8c4ff', '#3a3048', 1.6));
  const moon = new THREE.DirectionalLight('#e6ecff', 2.6); moon.position.set(-30, 50, 30); moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048); Object.assign(moon.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, far: 150 }); sc.add(moon);
  // 별
  const sg = new THREE.BufferGeometry(); const sp = []; for (let i = 0; i < 700; i++) { const a = Math.random() * Math.PI * 2, b = Math.random() * 0.45 + 0.08, r = 180; sp.push(Math.cos(a) * Math.cos(b) * r, Math.sin(b) * r, Math.sin(a) * Math.cos(b) * r); }
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); sc.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 0.8, sizeAttenuation: true })));
  // 땅·광장
  const ground = new THREE.Mesh(new THREE.CircleGeometry(150, 64), M('#2c3a2a', { roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; sc.add(ground);
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(16, 64), new THREE.MeshStandardMaterial({ map: canvasTex(512, 512, (g, W) => { g.fillStyle = '#8a7c6a'; g.fillRect(0, 0, W, W); for (let r = 0; r < 16; r++) for (let i = 0; i < 16; i++) { g.fillStyle = ['#9a8b77', '#86786a', '#a39380', '#7d7062'][(r * 3 + i) % 4]; g.fillRect(i * 32 + (r % 2) * 16 + 1, r * 32 + 1, 30, 30); } }), roughness: 0.95 }));
  plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.02; plaza.receiveShadow = true; sc.add(plaza);
  // 탑: 6층, 위로 갈수록 좁아짐
  const tower = new THREE.Group(); sc.add(tower); const clickTower = [];
  const stone = M('#5f5a66', { roughness: 0.92 }); let y = 0; const cores = [];
  const floorY = [];
  FLOORS.forEach((F, i) => {
    const r = 7.2 - i * 0.75, h = 4.6; floorY.push(y);
    const body = at(cyl(r - 0.25, r, h, stone, 36), 0, y + h / 2, 0, tower); body.userData.floor = F.n; clickTower.push(body);
    const unlocked = F.n <= S.top, cleared = floorClear(F.n);
    const band = at(cyl(r + 0.08, r + 0.08, 0.5, M(F.color, { emissive: F.color, emissiveIntensity: unlocked ? (cleared ? 1.1 : 0.55) : 0.05 }), 36), 0, y + h - 0.3, 0, tower);
    // 창문
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + i * 0.3; const win = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.3), new THREE.MeshStandardMaterial({ color: unlocked ? '#ffe2a0' : '#2a2a35', emissive: unlocked ? F.color : '#000', emissiveIntensity: unlocked ? 0.9 : 0 })); win.position.set(Math.sin(a) * (r - 0.12), y + 2.1, Math.cos(a) * (r - 0.12)); win.lookAt(Math.sin(a) * r * 2, y + 2.1, Math.cos(a) * r * 2); tower.add(win); }
    at(cyl(r + 0.35, r + 0.35, 0.3, M('#4e4a58'), 36), 0, y + h, 0, tower);
    // 층 안의 원소 빛 (시안: 층마다 다른 색 빛이 아치창으로 새어 나옴)
    const pl = new THREE.PointLight(F.color, unlocked ? 40 : 6, r * 2.6, 1.6); pl.position.set(0, y + 2.2, r + 1.5); sc.add(pl);
    const core = at(new THREE.Mesh(F.n === 3 ? new THREE.IcosahedronGeometry(1.6, 1) : F.n === 4 ? new THREE.OctahedronGeometry(1.5) : F.n === 5 ? new THREE.TorusKnotGeometry(0.9, 0.25, 64, 8) : F.n === 6 ? new THREE.CylinderGeometry(1.1, 0.9, 0.9, 8) : new THREE.ConeGeometry(1.0, 2.0, 12), new THREE.MeshStandardMaterial({ color: F.color, emissive: F.color, emissiveIntensity: unlocked ? 2.2 : 0.2 })), 0, y + 2.2, r - 0.9, tower);
    cores.push(core);
    const arch = at(new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.2), new THREE.MeshBasicMaterial({ color: F.color, transparent: true, opacity: unlocked ? 0.55 : 0.12 })), 0, y + 2.1, r + 0.02, tower);
    y += h + 0.3;
  });
  // 꼭대기 원소 구슬
  const orb = at(new THREE.Mesh(new THREE.IcosahedronGeometry(1.4, 2), M('#ffffff', { emissive: '#f3c45b', emissiveIntensity: S.top > 6 ? 1.4 : 0.3, roughness: 0.2 })), 0, y + 1.8, 0, tower);
  at(new THREE.Mesh(new THREE.ConeGeometry(3.3, 2.4, 36), M('#3a3550')), 0, y + 0.6, 0, tower);
  // 바깥 나선 계단
  const stepM = M('#8b8597');
  for (let i = 0; i < 120; i++) { const t = i / 120, a = t * Math.PI * 2 * 3, rr = 7.8 - t * 4.2; const s = box(1.5, 0.22, 0.8, stepM); s.position.set(Math.sin(a) * rr, t * (y - 1), Math.cos(a) * rr); s.rotation.y = a; tower.add(s); }
  // 문
  const door = at(new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.4), M('#5a3a24', { emissive: '#ffb04a', emissiveIntensity: 0.35 })), 0, 1.7, 7.21, tower); door.userData.floor = 'enter'; clickTower.push(door);
  at(sign('엘리멘트 타워', 4.4, 0.9, '#f3c45b', '#2a1f05'), 0, 3.9, 7.25, tower);
  // 횃불·나무
  const torches = [];
  for (const sx of [-2.6, 2.6]) { at(cyl(0.08, 0.1, 2.2, M('#3a2a1e'), 8), sx, 1.1, 8.2, sc); const fl = at(new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffb04a' })), sx, 2.35, 8.2, sc); const pl = new THREE.PointLight('#ffb04a', 6, 12, 1.6); pl.position.set(sx, 2.6, 8.4); sc.add(pl); torches.push(fl); }
  const treeM = M('#2f5a3a'), trunkM = M('#4a3626');
  for (let i = 0; i < 46; i++) { const a = Math.random() * Math.PI * 2, r = 22 + Math.random() * 40; const t = new THREE.Group(); at(cyl(0.2, 0.3, 2, trunkM, 8), 0, 1, 0, t); for (let k = 0; k < 3; k++) at(new THREE.Mesh(new THREE.ConeGeometry(1.8 - k * 0.45, 2, 9), treeM), 0, 2.4 + k * 1.1, 0, t); t.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); t.scale.setScalar(0.8 + Math.random() * 0.8); t.traverse(o => { if (o.isMesh) o.castShadow = true; }); sc.add(t); }
  // 층 이름표 앵커
  const anchors = FLOORS.map((F, i) => { const o = new THREE.Object3D(); const r = 7.2 - i * 0.75; o.position.set(r * 0.72 + 1.2, floorY[i] + 2.6, r * 0.72); sc.add(o); return { o, F }; });
  return { scene: sc, clickables: clickTower, anim: t => { orb.rotation.y = t * 0.4; cores.forEach((c, i) => { c.rotation.y = t * (0.5 + i * 0.1); c.scale.setScalar(1 + Math.sin(t * 2 + i) * 0.06); }); orb.position.y = y + 1.8 + Math.sin(t * 1.5) * 0.25; torches.forEach((f, i) => f.scale.setScalar(1 + Math.sin(t * 9 + i) * 0.12)); }, anchors, view: 'out', towerH: y };
}

/* ================= 층 내부 ================= */
const R_IN = 16, R_HUB = 6;
function roomAngle(i) { return -Math.PI / 2 + (i + 0.5) * (Math.PI * 2 / 6) + Math.PI / 6; } // 6칸 중 5칸 = 방, 남쪽(입구) 1칸 비움
function buildFloor(n) {
  const F = FLOORS[n - 1]; const sc = new THREE.Scene();
  sc.background = new THREE.Color(F.wall); sc.fog = new THREE.Fog(F.wall, 30, 70);
  sc.add(new THREE.HemisphereLight('#fff4e0', F.wall, 0.75));
  const key = new THREE.DirectionalLight('#fff1d6', 1.1); key.position.set(10, 26, 14); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, far: 80 }); sc.add(key);
  const glow = new THREE.PointLight(F.color, 30, 22, 1.4); glow.position.set(0, 6, 0); sc.add(glow);
  const anim = [], clickables = [], anchors = [];
  // 바닥: 원소 문양 타일
  const ft = canvasTex(1024, 1024, (g, W) => { g.fillStyle = F.floor; g.fillRect(0, 0, W, W); for (let r = 0; r < 16; r++) for (let i = 0; i < 16; i++) { g.fillStyle = (r + i) % 2 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.12)'; g.fillRect(i * 64 + 2, r * 64 + 2, 60, 60); } g.strokeStyle = F.color; g.globalAlpha = 0.5; g.lineWidth = 10; g.beginPath(); g.arc(W / 2, W / 2, W * 0.18, 0, Math.PI * 2); g.stroke(); g.lineWidth = 4; g.beginPath(); g.arc(W / 2, W / 2, W * 0.46, 0, Math.PI * 2); g.stroke(); });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(R_IN, 72), new THREE.MeshStandardMaterial({ map: ft, roughness: 0.85 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; floor.userData.ground = true; sc.add(floor);
  // 둥근 벽 + 창
  const wallM = new THREE.MeshStandardMaterial({ color: '#7a7484', roughness: 0.95, side: THREE.BackSide, map: canvasTex(1024, 256, (g, W, H) => { g.fillStyle = '#8a8494'; g.fillRect(0, 0, W, H); for (let r = 0; r < 8; r++) for (let i = 0; i < 32; i++) { g.fillStyle = ['#938d9c', '#7f7989', '#8c8696'][(r * 5 + i) % 3]; g.fillRect(i * 32 + (r % 2) * 16 + 1, r * 32 + 1, 30, 30); } }) });
  wallM.map.wrapS = THREE.RepeatWrapping; wallM.map.repeat.set(4, 1);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(R_IN, R_IN, 7, 72, 1, true), wallM); wall.position.y = 3.5; wall.receiveShadow = true; sc.add(wall);
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; const w = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.4), new THREE.MeshBasicMaterial({ color: F.color, transparent: true, opacity: 0.55 })); w.position.set(Math.sin(a) * (R_IN - 0.05), 4.2, Math.cos(a) * (R_IN - 0.05)); w.lookAt(0, 4.2, 0); sc.add(w); }
  // 천장 링
  const ceil = new THREE.Mesh(new THREE.RingGeometry(R_HUB + 1, R_IN, 72), M('#3a3546', { side: THREE.DoubleSide })); ceil.rotation.x = Math.PI / 2; ceil.position.y = 7; sc.add(ceil);
  // 방 칸막이 (6칸 경계, 입구 칸 제외)
  const partM = M('#cfc6b6', { roughness: 0.9 }); const trimM = M(F.color, { emissive: F.color, emissiveIntensity: 0.35 });
  for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * Math.PI / 3 + Math.PI / 6; const len = R_IN - R_HUB - 1.2; const p = box(0.35, 2.6, len, partM); const mid = R_HUB + 1.2 + len / 2; p.position.set(Math.cos(a) * mid, 1.3, Math.sin(a) * mid); p.rotation.y = -a + Math.PI / 2; sc.add(p); const tr = box(0.4, 0.12, len, trimM); tr.position.set(p.position.x, 2.66, p.position.z); tr.rotation.y = p.rotation.y; sc.add(tr); }
  // 중앙 관문: 원형 단 + 문 + 나선 계단
  const hub = new THREE.Group(); sc.add(hub);
  at(cyl(R_HUB - 1.2, R_HUB - 0.9, 0.3, M('#4a4556'), 48), 0, 0.15, 0, hub);
  const stepM = M('#b9b0c4');
  for (let i = 0; i < 26; i++) { const a = i * 0.42 + Math.PI, s = box(1.8, 0.2, 0.7, stepM); s.position.set(Math.cos(a) * 1.9, 0.4 + i * 0.26, Math.sin(a) * 1.9); s.rotation.y = -a; hub.add(s); }
  at(cyl(0.45, 0.45, 7, M('#8a8296'), 16), 0, 3.5, 0, hub);
  const cleared = floorClear(n);
  const gateFrame = new THREE.Group(); gateFrame.position.set(0, 0, 3.4); hub.add(gateFrame);
  at(box(0.4, 3.6, 0.5, M('#5a5468')), -1.5, 1.8, 0, gateFrame); at(box(0.4, 3.6, 0.5, M('#5a5468')), 1.5, 1.8, 0, gateFrame); at(box(3.4, 0.5, 0.5, M('#5a5468')), 0, 3.7, 0, gateFrame);
  const runeM = new THREE.MeshStandardMaterial({ color: F.color, emissive: F.color, emissiveIntensity: cleared ? 1.4 : 0.5, transparent: true, opacity: 0.85 });
  const door = at(new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.4), runeM), 0, 1.75, 0, gateFrame); door.userData.gate = true; clickables.push(door);
  const doorT = canvasTex(256, 336, (g, W, H) => { g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 6; g.beginPath(); g.arc(W / 2, H / 2, 70, 0, Math.PI * 2); g.stroke(); g.font = '64px Jua, sans-serif'; g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(cleared ? '열림' : '잠김', W / 2, H / 2 + 4); });
  const doorFace = at(new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.4), new THREE.MeshBasicMaterial({ map: doorT, transparent: true })), 0, 1.75, 0.02, gateFrame); doorFace.userData.gate = true; clickables.push(doorFace);
  const gateA = new THREE.Object3D(); gateA.position.set(0, 4.5, 3.4); sc.add(gateA); anchors.push({ o: gateA, kind: 'gate' });
  if (cleared) anim.push(t => { door.position.y = 1.75 + Math.min(3.6, (t % 1000) * 0) ; runeM.opacity = 0.35 + Math.sin(t * 3) * 0.15; });
  // 관문 수호자
  const gd = new THREE.Group(); gd.position.set(2.8, 0, 4.6); sc.add(gd);
  at(new THREE.Mesh(new THREE.ConeGeometry(0.8, 2.2, 16), M(F.color, { roughness: 0.6 })), 0, 1.1, 0, gd);
  const gh = at(new THREE.Mesh(new THREE.SphereGeometry(0.55, 18, 14), M('#f6efe2')), 0, 2.5, 0, gd);
  for (const sx of [-0.18, 0.18]) at(new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), M('#1d1a24')), sx, 2.55, 0.5, gd);
  at(new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.9, 16), M(F.color)), 0, 3.15, 0, gd);
  const halo = at(new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.05, 8, 36), new THREE.MeshBasicMaterial({ color: F.color })), 0, 3.7, 0, gd); halo.rotation.x = Math.PI / 2;
  gd.traverse(o => { if (o.isMesh) { o.userData.guard = true; clickables.push(o); o.castShadow = true; } });
  anim.push(t => { gd.position.y = Math.sin(t * 2) * 0.12; halo.rotation.z = t; gd.rotation.y = Math.sin(t * 0.7) * 0.3; });
  const gA = new THREE.Object3D(); gA.position.set(2.8, 4.3, 4.6); sc.add(gA); anchors.push({ o: gA, kind: 'guard' });
  // 방 5개
  const roomPos = {};
  ROOMS.forEach((R, i) => {
    const a = roomAngle(i); const rc = (R_HUB + R_IN) / 2 + 0.6; const cx = Math.cos(a) * rc, cz = Math.sin(a) * rc;
    const g = new THREE.Group(); g.position.set(cx, 0, cz); g.rotation.y = -a - Math.PI / 2; sc.add(g); // 방 안쪽(-z)이 바깥벽
    roomPos[R.key] = { x: cx * 0.78, z: cz * 0.78, a };
    PROPS[R.key](g, F, anim);
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 3, 16), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 1.5; hit.userData.room = R.key; g.add(hit); clickables.push(hit);
    const lb = new THREE.Object3D(); lb.position.set(cx, 3.6, cz); sc.add(lb); anchors.push({ o: lb, kind: 'room', R, puzzle: F.puzzle === R.key });
  });
  return { scene: sc, clickables, anim: t => anim.forEach(f => f(t)), anchors, view: 'floor', floor: floor, roomPos, F };
}

/* 방 소품 (방 그룹 기준: x 좌우, z 앞(+)·뒤(-) / 뒤가 바깥벽) */
const PROPS = {
  study(g, F) {
    const wood = M('#9a7652'), metal = M('#3a3d48');
    for (let r = 0; r < 2; r++) for (let c = -1; c <= 1; c++) { const d = new THREE.Group(); d.position.set(c * 1.7, 0, 0.6 + r * 1.6); g.add(d); at(box(1.3, 0.08, 0.7, wood), 0, 0.75, 0, d); for (const lx of [-0.55, 0.55]) at(box(0.06, 0.75, 0.06, metal), lx, 0.37, 0, d); at(box(0.5, 0.06, 0.5, M(F.color)), 0, 0.45, 0.7, d); at(box(0.5, 0.5, 0.06, M(F.color)), 0, 0.72, 0.95, d); at(box(0.32, 0.04, 0.24, M('#f4efe4')), 0.25, 0.81, 0, d); }
    const board = sign('오늘의 배움', 3.6, 1.6, '#1f3a2c', '#e8f5e0'); at(board, 0, 2.1, -1.6, g);
    at(box(3.9, 1.9, 0.1, M('#6a4a30')), 0, 2.1, -1.68, g);
    const shelf = at(box(0.5, 2.2, 1.6, wood), -3.1, 1.1, -0.6, g);
    for (let k = 0; k < 9; k++) at(box(0.3, 0.42, 0.12, M(['#d65a4a', '#4a7ad6', '#e0b84a', '#5ab46a'][k % 4])), -2.85, 0.35 + Math.floor(k / 3) * 0.72, -1.2 + (k % 3) * 0.4, g);
  },
  arcade(g, F, anim) {
    const cols = ['#e05ab0', '#4ad0e0', '#f0c040', '#7a6af0'];
    for (let k = 0; k < 4; k++) { const m = new THREE.Group(); m.position.set(-2.4 + k * 1.6, 0, -1.2); g.add(m); at(box(1.1, 1.9, 0.9, M('#24203a')), 0, 0.95, 0, m); const scr = at(new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.6), new THREE.MeshStandardMaterial({ color: '#000', emissive: cols[k], emissiveIntensity: 1 })), 0, 1.35, 0.46, m); at(box(1.12, 0.3, 0.92, M(cols[k], { emissive: cols[k], emissiveIntensity: 0.6 })), 0, 2.05, 0, m); at(box(0.9, 0.1, 0.4, M('#3a3550')), 0, 0.95, 0.6, m); anim.push(t => { scr.material.emissiveIntensity = 0.7 + Math.sin(t * 4 + k) * 0.3; }); }
    const claw = new THREE.Group(); claw.position.set(2.4, 0, 1.0); g.add(claw); at(box(1.3, 0.8, 1.3, M('#d8406a')), 0, 0.4, 0, claw);
    at(new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), new THREE.MeshPhysicalMaterial({ color: '#cfe9ff', transparent: true, opacity: 0.25, roughness: 0.05 })), 0, 1.4, 0, claw);
    for (let k = 0; k < 7; k++) at(new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), M(cols[k % 4])), -0.35 + (k % 3) * 0.35, 0.95, -0.3 + Math.floor(k / 3) * 0.3, claw);
    at(sign('오락실', 2.6, 0.8, '#24203a', '#ffd6f0'), 0, 2.7, -1.6, g);
  },
  lab(g, F, anim) {
    const top = M('#2b2f3a'), legM = M('#9aa0aa', { metalness: 0.5 });
    for (const x of [-1.6, 1.6]) { const t = new THREE.Group(); t.position.set(x, 0, -0.4); g.add(t); at(box(2.4, 0.1, 1.0, top), 0, 0.9, 0, t); for (const lx of [-1.05, 1.05]) at(box(0.08, 0.9, 0.9, legM), lx, 0.45, 0, t); for (let k = 0; k < 3; k++) { const c = [F.color, '#e0b84a', '#d65a8a'][k]; at(cyl(0.08, 0.08, 0.32, new THREE.MeshPhysicalMaterial({ color: '#e8f6ff', transparent: true, opacity: 0.35 }), 10), -0.6 + k * 0.6, 1.12, 0, t); const liq = at(new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), M(c, { emissive: c, emissiveIntensity: 0.9 })), -0.6 + k * 0.6, 1.05, 0, t); anim.push(tt => liq.scale.setScalar(1 + Math.sin(tt * 3 + k + x) * 0.08)); } }
    const pot = new THREE.Group(); pot.position.set(0, 0, 1.4); g.add(pot); at(new THREE.Mesh(new THREE.SphereGeometry(0.8, 18, 12, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.65), M('#2a2a30', { side: THREE.DoubleSide })), 0, 0.85, 0, pot);
    const brew = at(new THREE.Mesh(new THREE.CircleGeometry(0.62, 24), new THREE.MeshBasicMaterial({ color: F.color })), 0, 1.22, 0, pot); brew.rotation.x = -Math.PI / 2;
    const bubbles = []; for (let k = 0; k < 5; k++) bubbles.push(at(new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: F.color, transparent: true, opacity: 0.8 })), (k - 2) * 0.18, 1.3, 0, pot));
    anim.push(t => bubbles.forEach((b, k) => { const p = (t * 0.6 + k * 0.2) % 1; b.position.y = 1.25 + p * 1.2; b.material.opacity = 0.8 * (1 - p); }));
    const pl = new THREE.PointLight(F.color, 6, 6, 1.6); pl.position.set(0, 1.8, 1.4); g.add(pl);
    const sh = at(box(3.4, 0.08, 0.4, M('#6a4a30')), 0, 2.2, -1.6, g); for (let k = 0; k < 8; k++) at(cyl(0.1, 0.12, 0.3, M(['#4fc6d6', '#f3c45b', '#9b8cf2', '#6cc46a'][k % 4], { emissive: '#222' }), 8), -1.4 + k * 0.4, 2.4, -1.6, g);
  },
  lounge(g, F) {
    const sofaM = M(F.color, { roughness: 0.95 });
    const sofa = new THREE.Group(); sofa.position.set(0, 0, -1.0); g.add(sofa); at(box(3.0, 0.45, 1.0, sofaM), 0, 0.42, 0, sofa); at(box(3.0, 0.8, 0.3, sofaM), 0, 0.85, -0.38, sofa); for (const x of [-1.4, 1.4]) at(box(0.25, 0.65, 1.0, sofaM), x, 0.55, 0, sofa);
    for (const [x, z, c] of [[-2.2, 1.2, '#e0b84a'], [2.2, 1.0, '#d65a8a'], [0.4, 1.6, '#4ad0e0']]) { const b = at(new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), M(c, { roughness: 1 })), x, 0.38, z, g); b.scale.set(1, 0.65, 1); b.castShadow = true; }
    const rug = at(new THREE.Mesh(new THREE.CircleGeometry(2.2, 32), M('#e8dcc6', { roughness: 1 })), 0, 0.02, 0.6, g); rug.rotation.x = -Math.PI / 2;
    for (const x of [-3, 3]) { at(cyl(0.3, 0.25, 0.5, M('#8a6a4a'), 12), x, 0.25, -1.4, g); at(new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 1), M('#4f8a3c')), x, 0.95, -1.4, g); }
    const lamp = new THREE.PointLight('#ffd9a0', 5, 6, 1.6); lamp.position.set(0, 2.2, 0); g.add(lamp); at(new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.4, 16, 1, true), M('#f4e2b8', { emissive: '#ffd9a0', emissiveIntensity: 0.6, side: THREE.DoubleSide })), 0, 2.4, 0, g);
  },
  snack(g, F) {
    const counter = new THREE.Group(); counter.position.set(0, 0, -0.2); g.add(counter); at(box(3.6, 1.0, 0.8, M('#c8a070')), 0, 0.5, 0, counter); at(box(3.8, 0.08, 1.0, M('#efe6d6')), 0, 1.04, 0, counter);
    const shelfM = M('#6a4a30'); for (let r = 0; r < 3; r++) { at(box(3.4, 0.06, 0.4, shelfM), 0, 1.0 + r * 0.6, -1.6, g); for (let k = 0; k < 7; k++) at(box(0.32, 0.38, 0.22, M(['#e05a4a', '#f0c040', '#4ac06a', '#4a8ae0', '#f07a8a'][(k + r) % 5])), -1.4 + k * 0.47, 1.22 + r * 0.6, -1.6, g); }
    const fr = new THREE.Group(); fr.position.set(2.6, 0, -1.2); g.add(fr); at(box(1.0, 2.1, 0.8, M('#e8eef4', { metalness: 0.3 })), 0, 1.05, 0, fr); at(new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.7), new THREE.MeshStandardMaterial({ color: '#cfe9ff', emissive: '#9fd8ff', emissiveIntensity: 0.5, transparent: true, opacity: 0.8 })), 0, 1.1, 0.41, fr);
    for (const x of [-1.2, 0, 1.2]) { at(cyl(0.25, 0.25, 0.06, M(F.color), 16), x, 0.75, 0.9, g); at(cyl(0.04, 0.04, 0.72, M('#9aa0aa'), 8), x, 0.36, 0.9, g); }
    at(sign('간식바', 2.4, 0.8, '#c8a070', '#2a1f05'), 0, 2.9, -1.62, g);
  },
};

/* ================= 이동·카메라 ================= */
let hero = null, heroTarget = null, onArrive = null;
const view = { yaw: 0, pitch: 0.55, dist: 11 };
function placeHero(x, z) { hero.position.set(x, 0, z); heroTarget = null; }
function walkTo(x, z, cb) { const r = Math.hypot(x, z); if (r > R_IN - 1.2) { x *= (R_IN - 1.2) / r; z *= (R_IN - 1.2) / r; } heroTarget = new THREE.Vector3(x, 0, z); onArrive = cb || null; }
function updateHero(dt, t) {
  if (!hero || !heroTarget) { if (hero) hero.children.forEach(c => { if (c.userData.leg) c.rotation.x = 0; }); return; }
  const d = heroTarget.clone().sub(hero.position); d.y = 0; const L = d.length();
  if (L < 0.08) { heroTarget = null; const cb = onArrive; onArrive = null; cb && cb(); return; }
  const step = Math.min(L, dt * 4.2); d.normalize(); hero.position.addScaledVector(d, step); hero.rotation.y = Math.atan2(d.x, d.z);
  // 방 칸막이 통과 단순 처리: 허브 기둥 피하기
  const r = Math.hypot(hero.position.x, hero.position.z); if (r < 1.0) hero.position.multiplyScalar(1.0 / Math.max(r, 0.01));
  hero.children.forEach(c => { if (c.userData.leg) c.rotation.x = Math.sin(t * 12) * 0.5 * Math.sign(c.userData.leg); });
}
function updateCamera() {
  if (!world) return;
  if (world.view === 'out') { const a = view.yaw, d = 46; camera.position.set(Math.sin(a) * d, 20, Math.cos(a) * d); camera.lookAt(0, world.towerH * 0.42, 0); return; }
  const p = hero.position; const a = view.yaw; const d = view.dist;
  camera.position.set(p.x + Math.sin(a) * d * Math.cos(view.pitch), 1.6 + d * Math.sin(view.pitch), p.z + Math.cos(a) * d * Math.cos(view.pitch));
  camera.lookAt(p.x, 1.4, p.z);
}

/* ================= 이름표 ================= */
const labelsEl = $('#labels'); let labelEls = [];
function buildLabels() {
  labelsEl.innerHTML = ''; labelEls = [];
  const add = (anchor, html, cls, onClick, style) => { const el = document.createElement('button'); el.className = 'lb ' + cls; el.innerHTML = html; if (style) el.setAttribute('style', style); if (onClick) el.onclick = onClick; else el.style.pointerEvents = 'none'; labelsEl.appendChild(el); labelEls.push({ el, o: anchor }); return el; };
  if (world.view === 'out') world.anchors.forEach(({ o, F }) => add(o, `${F.n}F ${F.place}`, 'floor' + (floorClear(F.n) ? ' clear' : ''), F.n <= S.top ? () => enterFloor(F.n) : () => toast(`${F.n - 1}층을 먼저 올라가요`), `--c:${F.color}`));
  else world.anchors.forEach(a => {
    if (a.kind === 'room') add(a.o, `${a.R.name}<small>${a.puzzle ? '퍼즐 ★' : a.R.desc}</small>`, 'room', () => goRoom(a.R.key));
    if (a.kind === 'guard') add(a.o, `${world.F.guard}`, 'guard', () => talkGuard());
    if (a.kind === 'gate') add(a.o, floorClear(cur) ? (cur < 6 ? '다음 층으로 ▲' : '왕좌에 오르기 ★') : '관문 · 잠김', 'gate' + (floorClear(cur) ? ' open' : ''), () => tryGate());
  });
  if (hero && world.view === 'floor') { const o = new THREE.Object3D(); o.position.y = 2.2; hero.add(o); add(o, S.name || '나', 'me'); }
}
const _v = new THREE.Vector3();
function updateLabels() { const w = innerWidth, h = innerHeight; for (const { el, o } of labelEls) { o.getWorldPosition(_v); _v.project(camera); const vis = _v.z < 1 && Math.abs(_v.x) < 1.1 && Math.abs(_v.y) < 1.1; el.style.display = vis ? '' : 'none'; if (vis) { el.style.left = ((_v.x + 1) / 2 * w) + 'px'; el.style.top = ((1 - _v.y) / 2 * h) + 'px'; } } }

/* ================= 화면 전환 ================= */
const fadeEl = $('#fade');
async function fade(on) { fadeEl.classList.toggle('on', on); await new Promise(r => setTimeout(r, on ? 460 : 10)); }
function disposeScene(sc) { sc && sc.traverse(o => { o.geometry?.dispose?.(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach(mm => { mm.map?.dispose?.(); mm.dispose?.(); }); }); }
async function showOutside() {
  await fade(true); disposeScene(scene); world = buildOutside(); scene = world.scene; cur = 0; hero = null;
  $('#panel').hidden = true; $('#where-t').textContent = '탑 앞 광장'; $('#where-s').textContent = S.top > 6 ? '모든 층을 올랐어요. 왕관을 받았어요!' : `지금 ${Math.min(S.top, 6)}층까지 열렸어요`;
  $('#hint').textContent = '탑 문이나 층 이름표를 누르면 들어가요'; document.documentElement.style.setProperty('--el', '#f3c45b');
  view.yaw = 0.35; buildLabels(); renderDots(); await fade(false);
}
async function enterFloor(n) {
  n = Math.max(1, Math.min(n, Math.min(S.top, 6)));
  await fade(true); disposeScene(scene); world = buildFloor(n); scene = world.scene; cur = n;
  hero = makeHero(); dressHero(hero); scene.add(hero); placeHero(0, R_IN - 3.2); hero.rotation.y = Math.PI; view.yaw = 0; view.pitch = 0.5; view.dist = innerWidth < 720 ? 13 : 11;
  const F = FLOORS[n - 1]; document.documentElement.style.setProperty('--el', F.color);
  $('#where-t').textContent = `${n}F · ${F.place}`; $('#where-s').textContent = `관문 수호자: ${F.guard}`; $('#hint').textContent = '바닥을 눌러 이동 · 방 이름표를 누르면 들어가요';
  $('#panel').hidden = false; renderPanel(); buildLabels(); renderDots(); await fade(false);
}

/* ================= 패널 ================= */
function renderDots() {
  const el = $('#dots'); el.innerHTML = '';
  FLOORS.forEach(F => { const b = document.createElement('button'); b.textContent = F.n; b.style.setProperty('--c', F.color); b.className = (floorClear(F.n) ? 'clear ' : '') + (cur === F.n ? 'now' : ''); b.disabled = F.n > S.top; b.title = `${F.n}F ${F.place}`; b.setAttribute('aria-label', `${F.n}층 ${F.rank}${floorClear(F.n) ? ' (완료)' : ''}`); b.onclick = () => enterFloor(F.n); el.appendChild(b); });
}
function renderPanel() {
  if (!cur) return; const F = FLOORS[cur - 1], d = fs(cur), done = countDone(cur);
  $('#pn-rank').textContent = `${cur}F`; $('#pn-name').textContent = F.place; $('#pn-count').textContent = `${done} / 3`;
  $('#pn-guard').textContent = floorClear(cur) ? `${F.guard}: "훌륭해요! 관문이 열렸어요."` : `${F.guard}: "이 세 가지를 마치면 관문을 열어 줄게요."`;
  const st = s => s === 'ok' ? ['ok', '완료', '✓'] : s === 'wait' ? ['wait', '승인 기다리는 중', '…'] : ['', '', '•'];
  const list = $('#pn-list'); list.innerHTML = '';
  F.missions.forEach((m, i) => { const s = d['m' + i], [cls, label, ic] = st(s); const li = document.createElement('li'); li.className = cls; li.innerHTML = `<span class="ic">${ic}</span><span class="t">${m}<small>현실 미션 · ${label || '보호자 승인 필요'}</small></span>`; const b = document.createElement('button'); b.className = 'act'; if (s === 'ok') { b.textContent = '완료'; b.disabled = true; } else if (s === 'wait') { b.textContent = '대기 중'; b.disabled = true; } else { b.textContent = '다 했어요'; b.onclick = () => { d['m' + i] = 'wait'; save(); renderPanel(); toast('보호자에게 알렸어요. 승인을 기다려요'); }; } li.appendChild(b); list.appendChild(li); });
  const R = ROOM_OF(F.puzzle); const li = document.createElement('li'); li.className = d.p ? 'ok' : ''; li.innerHTML = `<span class="ic">${d.p ? '✓' : '★'}</span><span class="t">${R.name} 퍼즐 풀기<small>탑 안 미션 · ${R.desc}</small></span>`; const b = document.createElement('button'); b.className = 'act'; if (d.p) { b.textContent = '완료'; b.disabled = true; } else { b.textContent = '가기'; b.onclick = () => goRoom(F.puzzle); } li.appendChild(b); list.appendChild(li);
  const go = $('#pn-go'); const cl = floorClear(cur); go.disabled = !cl; go.textContent = cl ? (cur < 6 ? `${cur + 1}층으로 올라가기` : '왕좌에 오르기') : '관문이 잠겨 있어요';
  go.onclick = () => tryGate();
}
$('#pn-toggle').onclick = () => { const p = $('#panel'); p.classList.toggle('min'); $('#pn-toggle').setAttribute('aria-expanded', String(!p.classList.contains('min'))); };

/* ================= 모달 ================= */
const modal = $('#modal'), mBody = $('#m-body');
function openModal(title, html) { $('#m-title').textContent = title; mBody.innerHTML = html; modal.hidden = false; }
function closeModal() { modal.hidden = true; mBody.innerHTML = ''; }
$('#m-x').onclick = closeModal; modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
let toastT; function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2400); }
const puzzleDone = () => { const d = fs(cur); if (!d.p) { d.p = true; save(); toast('퍼즐 완료! 관문 미션 1개를 마쳤어요'); afterProgress(); } };
function afterProgress() { renderPanel(); buildLabels(); renderDots(); if (floorClear(cur)) { const keep = cur; setTimeout(() => { if (cur === keep) { disposeScene(scene); const yaw = view.yaw; const pos = hero.position.clone(); world = buildFloor(keep); scene = world.scene; hero = makeHero(); dressHero(hero); scene.add(hero); hero.position.copy(pos); view.yaw = yaw; buildLabels(); toast('관문이 열렸어요!'); } }, 300); } }

function goRoom(key) { if (!world || world.view !== 'floor') return; const p = world.roomPos[key]; walkTo(p.x, p.z, () => openRoom(key)); }
function openRoom(key) {
  const F = FLOORS[cur - 1], R = ROOM_OF(key), isP = F.puzzle === key, d = fs(cur);
  const tag = isP ? `<span class="m-tag">${d.p ? '이 층 퍼즐 완료' : '이 층 관문 퍼즐'}</span>` : '';
  if (key === 'study') return quizRoom(F, tag, isP);
  if (key === 'arcade') return memoryRoom(F, tag, isP);
  if (key === 'lab') return potionRoom(F, tag, isP);
  if (key === 'lounge') { openModal('휴게실', `${tag}<p class="m-p">원이 커질 때 들이마시고, 작아질 때 내쉬어요. 30초만 함께 숨을 골라요.</p><div class="breath"></div><p class="m-p" id="br-t" style="text-align:center">30</p>`); let s = 30; const iv = setInterval(() => { if (modal.hidden) return clearInterval(iv); s--; const el = $('#br-t'); if (!el) return clearInterval(iv); el.textContent = s > 0 ? s : '잘 쉬었어요!'; if (s <= 0) clearInterval(iv); }, 1000); return; }
  if (key === 'snack') { const sn = [['사과 조각', '아삭하고 달콤해요'], ['요거트', '배가 든든해요'], ['견과류 한 줌', '머리가 맑아져요'], ['물 한 컵', '탑을 오를 힘이 나요']]; openModal('간식바', `${tag}<p class="m-p">오늘 먹을 간식을 골라 보세요. 실제 간식은 보호자와 함께 정해요.</p><div class="snacks">${sn.map(([a, b], i) => `<button data-i="${i}"><b>${a}</b>${b}</button>`).join('')}</div><div class="res" id="sn-r" hidden></div>`); mBody.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { const r = $('#sn-r'); r.hidden = false; r.textContent = `${sn[b.dataset.i][0]}를(을) 골랐어요. 맛있게 먹고 다시 올라가요!`; }); }
}
function quizRoom(F, tag, isP) {
  const Q = F.quiz || FLOORS[0].quiz; let i = 0, score = 0;
  const step = () => {
    if (i >= Q.length) { const pass = score === Q.length; mBody.innerHTML = `${tag}<div class="res">${score} / ${Q.length} 맞혔어요. ${pass ? (isP ? '관문 퍼즐을 풀었어요!' : '멋져요!') : '모두 맞히면 퍼즐이 풀려요. 다시 해 볼까요?'}</div><div class="row">${pass ? '<button class="btn-main" id="q-ok">닫기</button>' : '<button class="btn-main" id="q-re">다시 풀기</button>'}</div>`; if (pass && isP) puzzleDone(); const ok = $('#q-ok'); if (ok) ok.onclick = closeModal; const re = $('#q-re'); if (re) re.onclick = () => { i = 0; score = 0; step(); }; return; }
    const [q, a, c] = Q[i]; const order = a.map((_, k) => k).sort(() => Math.random() - 0.5);
    mBody.innerHTML = `${tag}<p class="m-p">${i + 1} / ${Q.length}</p><p class="quiz-q">${q}</p><div class="ans">${order.map(k => `<button data-k="${k}">${a[k]}</button>`).join('')}</div>`;
    mBody.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { const k = +b.dataset.k; if (k === c) score++; mBody.querySelectorAll('[data-k]').forEach(x => { x.disabled = true; if (+x.dataset.k === c) x.classList.add('ok'); else if (x === b) x.classList.add('bad'); }); setTimeout(() => { i++; step(); }, 700); });
  };
  openModal('교육실', ''); step();
}
function memoryRoom(F, tag, isP) {
  const icons = FLOORS.map(f => [f.el, f.color]); const deck = [...icons, ...icons].map((v, i) => ({ v, i })).sort(() => Math.random() - 0.5);
  openModal('오락실', `${tag}<p class="m-p">같은 원소 카드 두 장을 찾아요. 6쌍을 모두 찾으면 성공!</p><div class="mem" id="mem">${deck.map((c, k) => `<button data-k="${k}" style="--cc:${c.v[1]}" aria-label="카드 ${k + 1}">${c.v[0]}</button>`).join('')}</div><p class="m-p" id="mem-s" style="margin-top:10px">0 / 6쌍</p>`);
  let open = [], found = 0, lock = false;
  mBody.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { if (lock || b.classList.contains('up')) return; b.classList.add('up'); open.push(b); if (open.length === 2) { lock = true; const [x, y] = open; const same = deck[x.dataset.k].v[0] === deck[y.dataset.k].v[0]; setTimeout(() => { if (same) { x.classList.add('gone'); y.classList.add('gone'); found++; $('#mem-s').textContent = `${found} / 6쌍`; if (found === 6) { $('#mem-s').textContent = isP ? '모두 찾았어요! 관문 퍼즐 완료' : '모두 찾았어요!'; if (isP) puzzleDone(); } } else { x.classList.remove('up'); y.classList.remove('up'); } open = []; lock = false; }, 650); } });
}
function potionRoom(F, tag, isP) {
  const ing = F.potion || ['민트 잎', '맑은 물', '푸른 수정', '달빛 이슬']; const cols = ['#6cc46a', '#4fc6d6', '#9b8cf2', '#f3c45b'];
  const target = ing.map((_, k) => k).sort(() => Math.random() - 0.5); let got = [];
  openModal('실험실', `${tag}<p class="m-p">비법서에 적힌 순서대로 재료를 넣어 ${F.el}의 물약을 만들어요.</p><p class="m-p"><b>비법서:</b> ${target.map(k => ing[k]).join(' → ')}</p><div class="seq" id="seq"></div><div class="pot">${ing.map((n, k) => `<button data-k="${k}" style="--cc:${cols[k]}">${n}</button>`).join('')}</div><div class="res" id="pot-r" hidden></div>`);
  const draw = () => { $('#seq').innerHTML = target.map((k, i) => `<span class="${i < got.length ? '' : 'dim'}" style="--cc:${cols[k]}">${i + 1}</span>`).join(''); }; draw();
  mBody.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { const k = +b.dataset.k; if (k !== target[got.length]) { got = []; draw(); const r = $('#pot-r'); r.hidden = false; r.textContent = `앗, ${ing[k]} 차례가 아니에요. 처음부터 다시!`; return; } got.push(k); draw(); b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 200); if (got.length === target.length) { const r = $('#pot-r'); r.hidden = false; r.textContent = isP ? `${F.el}의 물약 완성! 관문 퍼즐 완료` : `${F.el}의 물약 완성!`; if (isP) puzzleDone(); } });
}
function talkGuard() {
  const F = FLOORS[cur - 1]; const cl = floorClear(cur);
  openModal(F.guard, `<p class="m-p">${cl ? `"관문이 열렸어요. ${F.item}을(를) 받았어요! ${cur < 6 ? '다음 층에서 만나요.' : '이제 왕좌에 올라요.'}"` : `"${F.rank}이(가) 되고 싶나요? 아래 세 가지를 해 오면 관문을 열어 줄게요."`}</p><ul class="pn-list">${F.missions.map(m => `<li><span class="ic">•</span><span class="t">${m}<small>현실 미션 · 보호자 승인</small></span><span></span></li>`).join('')}<li><span class="ic">★</span><span class="t">${ROOM_OF(F.puzzle).name} 퍼즐<small>탑 안 미션</small></span><span></span></li></ul><div class="row"><button class="btn-main" id="g-ok">알겠어요</button></div>`);
  $('#g-ok').onclick = closeModal;
}
function tryGate() {
  if (!floorClear(cur)) { toast(`관문이 잠겨 있어요 · ${countDone(cur)} / 3`); return; }
  const F = FLOORS[cur - 1];
  if (!S.items.includes(cur)) { S.items.push(cur); save(); }
  if (S.top <= cur) { S.top = cur + 1; save(); }
  if (cur < 6) { openModal(`${F.item} 획득!`, `<p class="m-p">${F.rank} 계급을 달성했어요. ${F.item}이(가) 아바타에 장착됐어요.</p><div class="row"><button class="btn-main" id="g-up">${cur + 1}층으로 올라가기</button></div>`); $('#g-up').onclick = () => { closeModal(); enterFloor(cur + 1); }; }
  else showCert();
}
function showCert() {
  const c = document.createElement('canvas'); c.width = 1000; c.height = 680; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 680); gr.addColorStop(0, '#2a2f4d'); gr.addColorStop(1, '#141726'); g.fillStyle = gr; g.fillRect(0, 0, 1000, 680);
  g.strokeStyle = '#f3c45b'; g.lineWidth = 10; g.strokeRect(30, 30, 940, 620); FLOORS.forEach((F, i) => { g.fillStyle = F.color; g.beginPath(); g.arc(250 + i * 100, 560, 26, 0, Math.PI * 2); g.fill(); });
  g.fillStyle = '#f3c45b'; g.textAlign = 'center'; g.font = '64px Jua, sans-serif'; g.fillText('엘리멘트 타워의 왕', 500, 180);
  g.fillStyle = '#f4efe4'; g.font = '44px Jua, sans-serif'; g.fillText(`${S.name || '용사'} 님`, 500, 280);
  g.font = '28px "Gowun Dodum", sans-serif'; g.fillText('여섯 층의 미션을 모두 마치고 탑의 꼭대기에 올랐습니다.', 500, 360); g.fillText(new Date().toLocaleDateString('ko-KR'), 500, 420);
  openModal('왕관을 받았어요!', `<img class="cert" alt="엘리멘트 타워의 왕 인증서" src="${c.toDataURL('image/png')}"><p class="m-p" style="margin-top:12px">보호자가 정한 진짜 선물을 받으세요. 인증서는 화면을 길게 눌러 저장할 수 있어요.</p><div class="row"><button class="btn-main" id="c-out">탑 밖으로 나가기</button></div>`);
  $('#c-out').onclick = () => { closeModal(); showOutside(); };
}

/* ================= 보호자 ================= */
let parentOk = false;
$('#btn-parent').onclick = () => {
  if (!parentOk) { openModal('보호자 확인', `<p class="m-p">보호자 비밀번호 4자리를 입력하세요. (체험판 기본값 0000)</p><div class="pin"><input id="pin" inputmode="numeric" maxlength="4" autocomplete="off" aria-label="보호자 비밀번호"><button class="btn-sub" id="pin-ok">확인</button></div><p class="m-p" id="pin-e" style="color:#f08a8a;margin-top:8px"></p>`); const go = () => { if ($('#pin').value === S.pin) { parentOk = true; parentView(); } else $('#pin-e').textContent = '비밀번호가 맞지 않아요.'; }; $('#pin-ok').onclick = go; $('#pin').addEventListener('keydown', e => { if (e.key === 'Enter') go(); }); setTimeout(() => $('#pin')?.focus(), 50); return; }
  parentView();
};
function parentView() {
  const items = []; FLOORS.forEach(F => { const d = fs(F.n); F.missions.forEach((m, i) => { if (d['m' + i] === 'wait') items.push({ F, i, m }); }); });
  const prog = FLOORS.map(F => `<li style="--c:${F.color}"><b>${F.n}</b>${F.rank} · ${countDone(F.n)}/3</li>`).join('');
  openModal('보호자 승인함', `<p class="m-p">${S.name || '아이'}가 '다 했어요'를 보낸 미션이에요. 직접 확인한 뒤 승인해 주세요.</p>${items.length ? items.map((x, k) => `<div class="par-item"><span>${x.m}<small>${x.F.n}층 · ${x.F.rank}</small></span><button class="ok" data-a="${k}">승인</button><button class="no" data-r="${k}">다시 하기</button></div>`).join('') : '<div class="res">기다리는 미션이 없어요.</div>'}<p class="m-p" style="margin-top:14px">층별 진행</p><ol class="intro-floors">${prog}</ol><div class="row"><button class="btn-sub" id="p-reset">처음부터 다시</button><button class="btn-sub" id="p-close">닫기</button></div>`);
  mBody.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { const x = items[b.dataset.a]; fs(x.F.n)['m' + x.i] = 'ok'; save(); toast(`'${x.m}' 승인했어요`); if (cur === x.F.n) afterProgress(); else { renderDots(); } parentView(); });
  mBody.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { const x = items[b.dataset.r]; fs(x.F.n)['m' + x.i] = ''; save(); toast('다시 하기로 돌려보냈어요'); if (cur === x.F.n) renderPanel(); parentView(); });
  $('#p-close').onclick = closeModal;
  $('#p-reset').onclick = () => { const b = $('#p-reset'); if (b.dataset.sure) { const name = S.name; S = blank(); S.name = name; save(); closeModal(); showOutside(); } else { b.dataset.sure = '1'; b.textContent = '한 번 더 누르면 초기화'; } };
}

/* ================= 입력 ================= */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let drag = null;
canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, yaw: view.yaw, pitch: view.pitch, moved: false }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.hypot(dx, dy) > 6) drag.moved = true; if (drag.moved) { view.yaw = drag.yaw - dx * 0.006; if (world?.view === 'floor') view.pitch = Math.max(0.15, Math.min(1.2, drag.pitch + dy * 0.004)); } });
canvas.addEventListener('pointerup', e => { const d = drag; drag = null; if (!d || d.moved || !modal.hidden) return; pick(e.clientX, e.clientY); });
canvas.addEventListener('wheel', e => { if (world?.view === 'floor') { view.dist = Math.max(5, Math.min(18, view.dist + e.deltaY * 0.01)); e.preventDefault(); } }, { passive: false });
function pick(x, y) {
  if (!world) return; ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(world.clickables, false);
  if (world.view === 'out') { const h = hits[0]; if (h) { const f = h.object.userData.floor; enterFloor(f === 'enter' ? Math.min(S.top, 6) : (f <= S.top ? f : Math.min(S.top, 6))); } return; }
  if (hits.length) { const u = hits[0].object.userData; if (u.room) return goRoom(u.room); if (u.guard) return walkTo(2.8, 6.2, talkGuard); if (u.gate) return walkTo(0, 5.4, tryGate); }
  const g = ray.intersectObject(world.floor)[0]; if (g) walkTo(g.point.x, g.point.z);
}
addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });
$('#go-out').onclick = () => { if (cur) showOutside(); };

/* ================= 시작 ================= */
$('#intro-floors').innerHTML = FLOORS.slice().reverse().map(F => `<li style="--c:${F.color}"><b>${F.icon}</b><span>${F.n}F ${F.place}</span></li>`).join('');
$('#ranks').innerHTML = FLOORS.map((F, i) => `${i ? '<i>→</i>' : ''}<div class="rk" style="--c:${F.color}"><span class="badge">${F.icon}</span><b>${F.rank}</b><small>${F.pts}</small></div>`).join('');
$('#hero-name').value = S.name || '';
document.documentElement.classList.add('intro');
$('#btn-start').onclick = () => { document.documentElement.classList.remove('intro'); S.name = $('#hero-name').value.trim().slice(0, 8); save(); $('#intro').hidden = true; enterFloor(Math.min(S.top, 6)); };
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.fov = innerWidth < 720 ? 62 : 50; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
world = buildOutside(); scene = world.scene; view.yaw = 0.35; buildLabels(); renderDots();
let last = performance.now();
function loop(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = now / 1000; if (world.view === 'out' && !drag) view.yaw += dt * 0.08; updateHero(dt, t); world.anim(t); updateCamera(); renderer.render(scene, camera); updateLabels(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);
window.__tower = { S, enterFloor, showOutside, approveAll: () => { FLOORS.forEach(F => { const d = fs(F.n); d.m0 = d.m1 = 'ok'; }); save(); }, puzzleDone, openRoom, tryGate, get cur() { return cur; } };

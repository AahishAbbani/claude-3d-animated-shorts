// "What happens to your brain when you study until 2 AM" — a ~50 s explainer short on the office/home sets.
// index.html?viewer=1&study=1&set=home|office ; the dorm (night) shots need set=home, the exam-room shots set=office.
// render: tools/render-study.sh renders each part on its own set and joins them. Timings: film/study_timing.json
// (tools/tts_piper.py → timing.json). Science beats are 2D panels drawn over the 3D frame (top third of the frame).
export async function runStudy(C) {
  const { THREE, Q, WW, HH, scene, renderer, camera, canvas, post, U, hemi, sun, SUNDIR, SR, OUTF, thua, ti, ex, ALL, base, face, place, idle, arm, leg, hips, headTurn, yawTo, Lw, dirW, LEFT, headC, look, resetScene, setLook, O, put, FY, Z, clamp, ease, eio, lerp, V, vl } = C;
  window.ready = false;
  const SET = Q.get('set') || 'office', HOME = SET === 'home', ZB = Z - 6, ZD = Z - 2.9;
  const T = await (await fetch('./film/study_timing.json')).json(), LN = Object.fromEntries(T.lines.map(l => [l.id, l]));
  const norm = s => s.toLowerCase().replace(/[^a-z0-9']/g, '');
  const S = id => LN[id].start, E = id => LN[id].end;
  const wt = (id, w, n = 0) => { const ws = LN[id].words.filter(x => norm(x.w).startsWith(w)); return ws[n] ? ws[n].t : LN[id].start; };
  const talking = (id, t) => LN[id].words.some(w => t >= w.t && t < w.t + Math.max(0.09, (w.e - w.t) * 0.7));
  const DUR = T.duration, B1 = Math.round((S('blank') - 0.2) * 30) / 30, B2 = Math.round((S('adeno') - 0.25) * 30) / 30;
  window.SEGS = [[0, B1, 'home'], [B1, B2, 'office'], [B2, DUR, 'home']];
  const UP = V(0, 1, 0), PI = Math.PI;
  const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.userData = { c, g, draw }; return t; };
  const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0, ...o });
  const mesh = (g, m, p, parent = O) => { const x = new THREE.Mesh(g, m); x.castShadow = x.receiveShadow = true; if (p) x.position.copy(p); parent.add(x); return x; };

  // ---------- cast ----------
  const mk = (o, i) => { const c = SR.build({ ...base, ...o }); c.root.scale.setScalar(0.8); c.phase = 1.3 + i * 0.53; c.root.rotation.order = 'YXZ'; face(c, 'calm'); c.tint = c.hm.material.uniforms.base.value.clone(); ALL.push(c); return c; };
  const LEO = OUTF[0], ROOMIE = OUTF[2];   // blue hoodie + backwards red cap; green polo
  const extra = [mk({ jacket: '#9a6ad6', jacket2: '#6e46a6', details: ['collar'], collarCol: '#ffffff', pattern: ['hstripes', '#c5a6ef'] }, 0),
    mk({ jacket: '#e5483a', jacket2: '#b02e24', details: ['hoodie'], hat: 'beret', hatCol: '#2b2230' }, 1),
    mk({ jacket: '#f6efe0', jacket2: '#cfc4ad', details: ['buttons', 'tie'], tieCol: '#1d3c8f', pattern: ['pinstripe', '#bcd8f7'] }, 2)];

  // ---------- poses ----------
  const sitDown = (c, x, z, ry, t, o = {}) => {   // on a chair behind a desk; o.lean (+ forward), o.noArms
    place(c, x, z, ry, FY); SR.clipAt(c, 'idle', 0.4 + (o.breathe === false ? 0 : (t + c.phase) * 0.15));
    const hp = SR.wp(c.bone('Hips')); hips(c, FY + 0.47 - hp.y, 0.02);
    const fy = (FY + 0.035 - c.root.position.y) / c.root.scale.x;
    leg(c, 'Left', Lw(c, 0.13, fy, 0.52), dirW(c, 0.1, 0.7, 1)); leg(c, 'Right', Lw(c, -0.13, fy, 0.52), dirW(c, -0.1, 0.7, 1));
    if (o.lean) SR.rotWorld(c.bone('Spine1'), LEFT(c), o.lean);
    if (!o.noArms) { arm(c, 'Left', Lw(c, 0.2, 0.86, 0.5)); arm(c, 'Right', Lw(c, -0.2, 0.86, 0.5)); } };
  const deskHands = (c, P, w = 0.17) => { const l = LEFT(c); arm(c, 'Left', P.clone().addScaledVector(l, w)); arm(c, 'Right', P.clone().addScaledVector(l, -w)); };
  const armsCrossed = c => { arm(c, 'Left', Lw(c, -0.12, 1.1, 0.26), dirW(c, 1, -0.4, 0.2)); arm(c, 'Right', Lw(c, 0.12, 1.06, 0.28), dirW(c, -1, -0.4, 0.2)); };

  // ---------- sprites: "?" "!" "Z" bubbles ----------
  const bubT = {}; const bubbleTex = (ch, col) => bubT[ch] ||= tex(128, 128, g => { g.fillStyle = '#fff'; g.beginPath(); g.arc(64, 60, 50, 0, 7); g.fill(); g.lineWidth = 6; g.strokeStyle = '#2a1612'; g.stroke(); g.fillStyle = col; g.font = '72px Anton'; g.textAlign = 'center'; g.fillText(ch, 64, 88); });
  const sprites = [0, 1, 2].map(() => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false })); s.renderOrder = 10; s.visible = false; scene.add(s); return s; });
  const bubble = (i, ch, col, P, t0, t, sc = 0.3) => { const s = sprites[i]; if (t < t0) return; s.visible = true; s.material.map = bubbleTex(ch, col); s.position.copy(P).add(V(0, 0.05 * Math.sin(t * 7 + i), 0)); s.scale.setScalar(sc * Math.min(1, (t - t0) * 6)); };

  // ---------- sets ----------
  const DX = -5.6, DZ = ZB + 1.9, DY = FY + 0.66, LZ = DZ - 0.62;   // home desk (in front of the left window); Leo sits behind it facing +z
  let clockT, clockM, bookG, flipP, pageT, mugs = [], lampL, hl, bedObj;
  const RZ = [Z + 0.4, Z - 1.4, Z - 3.2], CX = [-0.85, 0.85];        // exam: 3 rows x 2 columns receding from the camera (9:16 frame)
  const XL = CX[1], ZL = RZ[0], LZX = ZL - 0.62;                     // Leo: front row, right
  const EXAM = [[ROOMIE, CX[0], RZ[0]], [ex[4], CX[0], RZ[1]], [extra[0], CX[1], RZ[1]], [ti, CX[0], RZ[2]], [extra[2], CX[1], RZ[2]]];
  const find = n => O.children.filter(o => o.name === n);
  if (HOME) {
    for (const n of ['couch_pillows', 'table_low', 'rug_rectangle_stripes_B', 'armchair_pillows', 'cabinetTelevision', 'televisionModern']) find(n).forEach(o => (o.visible = false));
    bedObj = await put('kaykit', 'bed_single_A', -1.0, ZB + 1.25, 0, { k: 1.3 });
    await put('kaykit', 'rug_rectangle_stripes_B', -2.2, Z - 2.6, 0, { k: 2.2, y: FY + 0.005, noInk: true });
    await put('polyhaven', 'metal_office_desk', DX, DZ, 0); await put('polyhaven', 'modern_arm_chair_01', DX + 0.05, DZ - 0.95, PI);
    await put('polyhaven', 'desk_lamp_arm_01', DX - 0.62, DZ - 0.12, 0.7, { y: DY });
    await put('polyhaven', 'book_encyclopedia_set_01', DX + 0.62, DZ - 0.18, -0.15, { y: DY, k: 0.8 });
    for (const [i, [x, z, ry, c]] of [[DX - 0.42, DZ + 0.18, 0.3, '#3d7be0'], [DX - 0.44, DZ + 0.16, 0.1, '#e8442a'], [DX - 0.41, DZ + 0.17, -0.2, '#f2cf2c']].entries()) {   // closed textbooks, stacked
      const b = mesh(new THREE.BoxGeometry(0.2, 0.035, 0.27), std(c, { roughness: 0.7 }), V(x, DY + 0.018 + i * 0.036, z)); b.rotation.y = ry;
      mesh(new THREE.BoxGeometry(0.19, 0.03, 0.26), std('#f4efe2'), V(0.006, 0, 0), b); }
    // the open book: two page blocks + one flipping page (pivot on the spine); every line highlighted
    pageT = tex(256, 340, (g, w, h) => { g.fillStyle = '#fbf7ec'; g.fillRect(0, 0, w, h); g.fillStyle = '#2a2a33'; g.font = 'bold 26px InterB'; g.fillText('CHAPTER 7', 22, 42);
      for (let i = 0; i < 13; i++) { const y = 70 + i * 20, len = i % 4 === 3 ? 120 : 200; g.fillStyle = 'rgba(255,233,40,0.85)'; g.fillRect(18, y - 9, len + 8, 15); g.fillStyle = '#55555f'; g.fillRect(22, y - 4, len, 5); } });
    bookG = new THREE.Group(); bookG.position.set(DX, DY + 0.004, DZ - 0.1); O.add(bookG);
    const pm = new THREE.MeshStandardMaterial({ map: pageT, roughness: 0.85 });
    for (const sd of [-1, 1]) { const b = mesh(new THREE.BoxGeometry(0.2, 0.022, 0.27), [std('#f4efe2'), std('#f4efe2'), pm, std('#f4efe2'), std('#f4efe2'), std('#f4efe2')], V(sd * 0.103, 0.011, 0), bookG); b.rotation.z = -sd * 0.06; }
    mesh(new THREE.BoxGeometry(0.43, 0.006, 0.29), std('#2f6b3a'), V(0, 0.001, 0), bookG);
    flipP = new THREE.Group(); flipP.position.set(0, 0.024, 0); bookG.add(flipP);
    const pg = mesh(new THREE.PlaneGeometry(0.2, 0.27), new THREE.MeshStandardMaterial({ map: pageT, roughness: 0.85, side: THREE.DoubleSide }), V(0.1, 0, 0), flipP); pg.rotation.x = -PI / 2;
    hl = mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.12, 10), std('#f7e21b', { emissive: '#3a3400' })); hl.visible = false;
    // digital alarm clock, front facing +z
    clockT = tex(256, 112, () => {}); const drawClock = (s) => { const { g } = clockT.userData; g.fillStyle = '#0b0b0e'; g.fillRect(0, 0, 256, 112); g.shadowColor = '#ff3b30'; g.shadowBlur = 16; g.fillStyle = '#ff4a3a'; g.font = '84px Anton'; g.textAlign = 'center'; g.fillText(s, 128, 92); g.shadowBlur = 0; clockT.needsUpdate = true; };
    clockT.userData.set = drawClock; drawClock('2:00');
    const ck = mesh(new THREE.BoxGeometry(0.2, 0.09, 0.07), std('#22222a', { roughness: 0.4 }), V(DX + 0.38, DY + 0.045, DZ + 0.16)); ck.rotation.y = -0.25;
    clockM = mesh(new THREE.PlaneGeometry(0.17, 0.074), new THREE.MeshBasicMaterial({ map: clockT, toneMapped: false, color: new THREE.Color(1.5, 1.5, 1.5) }), V(0, 0, 0.0355), ck);
    // three coffee mugs (appear one by one)
    for (const [i, [x, z, c]] of [[DX + 0.12, DZ + 0.2, '#ffffff'], [DX - 0.16, DZ + 0.24, '#e8442a'], [DX + 0.24, DZ + 0.05, '#3d7be0']].entries()) {
      const m = new THREE.Group(); m.position.set(x, DY, z); O.add(m); mesh(new THREE.CylinderGeometry(0.038, 0.034, 0.095, 20), std(c, { roughness: 0.35 }), V(0, 0.048, 0), m);
      const h = mesh(new THREE.TorusGeometry(0.024, 0.008, 8, 16), std(c, { roughness: 0.35 }), V(0.042, 0.05, 0), m); mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.004, 20), std('#3a2213', { roughness: 0.2 }), V(0, 0.088, 0), m); m.rotation.y = 0.6 + i; mugs.push(m); }
    // "EXAM 9 AM" note on the wall between the windows
    const note = mesh(new THREE.PlaneGeometry(0.42, 0.42), new THREE.MeshStandardMaterial({ map: tex(256, 256, g => { g.fillStyle = '#ffe66b'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#c8241c'; g.font = '78px Anton'; g.textAlign = 'center'; g.fillText('EXAM', 128, 105); g.fillText('9 AM!!', 128, 200); }), roughness: 0.9 }), V(-4.7, FY + 1.95, ZB + 0.17)); note.rotation.z = 0.06;
    // night: dark sky with moon in the windows, no sun shafts, ceiling strips off, a warm desk lamp
    const night = tex(256, 192, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#060a1c'); gr.addColorStop(1, '#16224a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#fff';
      for (let i = 0; i < 40; i++) { g.globalAlpha = 0.4 + (i * 37 % 10) / 16; g.fillRect((i * 97) % w, (i * 53) % (h * 0.7), 2, 2); } g.globalAlpha = 1; g.fillStyle = '#f6ecc8'; g.beginPath(); g.arc(70, 52, 22, 0, 7); g.fill(); g.fillStyle = 'rgba(180,170,140,0.5)'; g.beginPath(); g.arc(62, 46, 5, 0, 7); g.arc(78, 60, 4, 0, 7); g.fill(); });
    O.traverse(o => { if (o.userData.win) o.material = new THREE.MeshBasicMaterial({ map: night, color: new THREE.Color(1.3, 1.3, 1.3), toneMapped: false }); if (o.userData.shaft) o.visible = false;
      if (o.userData.city) o.material = new THREE.MeshBasicMaterial({ color: '#0b1120' }); if (o.userData.strip) o.material = new THREE.MeshBasicMaterial({ color: '#2a2a30' }); });
    scene.traverse(o => { if (o.userData.ceiling) o.intensity = 0; });
    lampL = new THREE.PointLight('#ffb067', 7, 4.5, 1.4); lampL.position.set(DX - 0.38, DY + 0.5, DZ + 0.02); scene.add(lampL);
    const bulb = mesh(new THREE.SphereGeometry(0.025, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.4, 1.6), toneMapped: false }), lampL.position.clone().add(V(0, -0.03, 0))); bulb.castShadow = false;
    const moonL = new THREE.PointLight('#6f86d6', 2.5, 7, 1.2); moonL.position.set(-4.7, FY + 2.4, ZB + 1.0); scene.add(moonL);
  } else {
    for (const n of ['computerScreen', 'laptop', 'computerKeyboard', 'computerMouse', 'office_notepads', 'clipboard', 'alarm_clock_01', 'potted_plant_04', 'ceramic_vase_01', 'desk_lamp_arm_01', 'CoffeeCart_01']) find(n).forEach(o => (o.visible = false));
    for (const n of ['metal_office_desk', 'modern_arm_chair_01', 'rug_rectangle_stripes_A']) find(n).forEach(o => (o.visible = false));
    for (const z of RZ) for (const x of CX) { await put('polyhaven', 'metal_office_desk', x, z, 0); await put('polyhaven', 'modern_arm_chair_01', x + 0.05, z - 0.95, PI); }
    const paperT = tex(512, 660, (g, w, h) => { g.fillStyle = '#fbfaf5'; g.fillRect(0, 0, w, h); g.fillStyle = '#1c1c24'; g.font = '50px Anton'; g.fillText('FINAL EXAM', 36, 74); g.font = '22px InterB'; g.fillStyle = '#555'; g.fillText('Name: ____________   Time: 2 h', 36, 118);
      g.fillStyle = '#1c1c24'; g.font = '30px InterB'; g.fillText('1. Explain how the brain', 36, 190); g.fillText('    stores new memories.', 36, 230); g.font = '22px InterB'; g.fillStyle = '#777'; g.fillText('(20 points)', 36, 268);
      g.strokeStyle = '#c9ccd6'; g.lineWidth = 2; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(36, 320 + i * 36); g.lineTo(476, 320 + i * 36); g.stroke(); } });
    const pm = new THREE.MeshStandardMaterial({ map: paperT, roughness: 0.9 });
    for (const z of RZ) for (const x of CX) { const me = x === XL && z === ZL, p = mesh(new THREE.PlaneGeometry(0.21 * (me ? 1.25 : 1), 0.27 * (me ? 1.25 : 1)), pm, V(x + (me ? 0 : 0.03), DY + 0.003, z - 0.08)); p.rotation.x = -PI / 2; p.rotation.z = me ? PI : ((x + z) * 7 % 3 - 1) * 0.06; }
    O.traverse(o => { if (o.userData.hand) o.rotation.z = o.userData.hand < 0.22 ? -1.5 * PI : 0; });   // wall clock at 9:00
    O.children.forEach(o => { if (o.isMesh && o.position.z > ZB + 0.17 && o.position.z < ZB + 0.21 && Math.abs(o.position.y - FY - 2.5) < 0.4 && o.position.x > 1 && o.position.x < 3.3) o.visible = false; });   // coloured marks on the whiteboard
    const wbT = tex(680, 320, g => { g.fillStyle = '#fbfbf8'; g.fillRect(0, 0, 680, 320); g.fillStyle = '#c8241c'; g.font = '96px Anton'; g.textAlign = 'center'; g.fillText('FINAL EXAM', 340, 130); g.fillStyle = '#2b5cc8'; g.font = '54px Anton'; g.fillText('9:00 – 11:00   NO PHONES', 340, 230); });
    const wb = mesh(new THREE.PlaneGeometry(3.3, 1.5), new THREE.MeshStandardMaterial({ map: wbT, roughness: 0.5 }), V(2.2, FY + 2.4, ZB + 0.18)); wb.castShadow = false;
  }
  const LEOP = HOME ? V(DX, 0, LZ) : V(XL, 0, LZX);

  // ---------- lighting per set ----------
  function light() {
    setLook('day');
    if (HOME) { hemi.intensity = 0.16; hemi.color.set('#6f86c8'); hemi.groundColor.set('#2a2030'); sun.intensity = 0.55; sun.color.set('#8aa2ff'); SUNDIR.set(-0.15, 0.55, -0.82).normalize();
      scene.environmentIntensity = 0.16; U.uSat.value = 1.12; U.uCon.value = 1.18; U.uWarm.value = 0.1; renderer.toneMappingExposure = 0.62; U.uVig.value = 0.45; }
    else { hemi.intensity = 0.32; hemi.color.set('#9fb4e0'); sun.intensity = 2.6; sun.color.set('#ffd29a'); SUNDIR.set(0.35, 0.5, -0.75).normalize(); scene.environmentIntensity = 0.55;
      U.uSat.value = 1.2; U.uCon.value = 1.22; U.uWarm.value = 0.07; renderer.toneMappingExposure = 0.42; U.uVig.value = 0.55; }
    U.uFade.value = 0; }

  // ---------- 2D panel (science beats) ----------
  const out = document.createElement('canvas'); out.width = WW; out.height = HH; const og = out.getContext('2d'); const K = WW / 1080;
  const INK = '#2a1612', PANEL = [50, 120, 980, 640];
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  const txt = (g, s, x, y, size, col = INK, font = 'Anton', align = 'center') => { g.font = `${size}px ${font}`; g.textAlign = align; g.fillStyle = col; g.fillText(s, x, y); };
  const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  function brain(g, cx, cy, r, glow = 0) {
    const lobes = [[0, 0, 1], [-0.45, -0.2, 0.62], [0.42, -0.22, 0.6], [-0.15, -0.42, 0.55], [0.22, -0.4, 0.55], [-0.55, 0.15, 0.5], [0.52, 0.12, 0.52], [0.0, 0.25, 0.6]];
    g.fillStyle = INK; for (const [x, y, k] of lobes) { g.beginPath(); g.arc(cx + x * r, cy + y * r, k * r * 0.62 + 7, 0, 7); g.fill(); }
    g.fillStyle = INK; g.beginPath(); g.ellipse(cx + 0.2 * r, cy + 0.62 * r, 0.16 * r + 7, 0.28 * r + 7, -0.3, 0, 7); g.fill();
    g.fillStyle = '#e98a9e'; g.beginPath(); g.ellipse(cx + 0.2 * r, cy + 0.62 * r, 0.16 * r, 0.28 * r, -0.3, 0, 7); g.fill();
    g.fillStyle = glow ? `rgb(${246},${166 - glow * 60},${184 - glow * 80})` : '#f6a6b8'; for (const [x, y, k] of lobes) { g.beginPath(); g.arc(cx + x * r, cy + y * r, k * r * 0.62, 0, 7); g.fill(); }
    g.strokeStyle = '#d97a92'; g.lineWidth = 6; g.lineCap = 'round';
    for (const [x, y, a] of [[-0.4, -0.25, 0.4], [0.35, -0.3, -0.5], [-0.1, 0.05, 1.2], [0.3, 0.15, 0.3], [-0.5, 0.25, -0.6], [0.05, -0.45, 0.1]]) { g.beginPath(); g.save(); g.translate(cx + x * r, cy + y * r); g.rotate(a); g.moveTo(-0.18 * r, 0); g.bezierCurveTo(-0.08 * r, -0.1 * r, 0.02 * r, 0.1 * r, 0.16 * r, -0.02 * r); g.restore(); g.stroke(); } }
  const dot = (g, x, y, r, col = '#7b4fd6') => { g.fillStyle = INK; g.beginPath(); g.arc(x, y, r + 4, 0, 7); g.fill(); g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, 7); g.fill(); };
  const bean = (g, x, y, a = 0, s = 1) => { g.save(); g.translate(x, y); g.rotate(a); g.scale(s, s); g.fillStyle = INK; g.beginPath(); g.ellipse(0, 0, 26, 19, 0, 0, 7); g.fill(); g.fillStyle = '#8a5a34'; g.beginPath(); g.ellipse(0, 0, 22, 15, 0, 0, 7); g.fill(); g.strokeStyle = '#3a2213'; g.lineWidth = 4; g.beginPath(); g.moveTo(-15, 2); g.quadraticCurveTo(0, -8, 15, 2); g.stroke(); g.restore(); };
  const meter = (g, x, y, w, h, k, label) => { rr(g, x - 5, y - 5, w + 10, h + 10, 18); g.fillStyle = INK; g.fill(); rr(g, x, y, w, h, 14); g.fillStyle = '#efe6d6'; g.fill();
    const c = k < 0.5 ? `rgb(${Math.round(90 + 330 * k)},190,90)` : `rgb(240,${Math.round(190 - 260 * (k - 0.5))},70)`; g.save(); rr(g, x, y, w, h, 14); g.clip(); g.fillStyle = c; g.fillRect(x, y + h * (1 - k), w, h * k); g.restore(); if (label) txt(g, label, x + w / 2, y + h + 50, 34); };
  const usb = (g, x, y, k, col = '#f2cf2c', full = false) => { rr(g, x - 95, y - 50, 170, 100, 18); g.fillStyle = INK; g.fill(); rr(g, x - 89, y - 44, 158, 88, 14); g.fillStyle = '#3d7be0'; g.fill();
    rr(g, x + 75, y - 30, 56, 60, 6); g.fillStyle = INK; g.fill(); rr(g, x + 80, y - 25, 46, 50, 4); g.fillStyle = '#c9ced8'; g.fill(); g.fillStyle = INK; g.fillRect(x + 92, y - 14, 10, 10); g.fillRect(x + 108, y - 14, 10, 10);
    rr(g, x - 72, y - 16, 124, 32, 8); g.fillStyle = '#1d3c8f'; g.fill(); g.fillStyle = full ? '#e8442a' : col; g.fillRect(x - 70, y - 14, 120 * k, 28); };
  const drive = (g, x, y, k) => { rr(g, x - 110, y - 120, 220, 240, 26); g.fillStyle = INK; g.fill(); rr(g, x - 103, y - 113, 206, 226, 20); g.fillStyle = '#9aa3ad'; g.fill();
    g.fillStyle = INK; g.beginPath(); g.arc(x, y - 20, 72, 0, 7); g.fill(); g.fillStyle = '#d7dbe2'; g.beginPath(); g.arc(x, y - 20, 66, 0, 7); g.fill(); g.fillStyle = INK; g.beginPath(); g.arc(x, y - 20, 12, 0, 7); g.fill();
    rr(g, x - 80, y + 70, 160, 26, 8); g.fillStyle = '#1d3c8f'; g.fill(); g.fillStyle = '#2fa36b'; g.fillRect(x - 78, y + 72, 156 * k, 22); };
  const file = (g, x, y, s = 1, a = 0, col = '#ffffff') => { g.save(); g.translate(x, y); g.rotate(a); g.scale(s, s); g.fillStyle = INK; g.fillRect(-24, -30, 48, 60); g.fillStyle = col; g.beginPath(); g.moveTo(-19, -25); g.lineTo(9, -25); g.lineTo(19, -15); g.lineTo(19, 25); g.lineTo(-19, 25); g.closePath(); g.fill();
    g.fillStyle = '#9aa3ad'; for (let i = 0; i < 3; i++) g.fillRect(-12, -8 + i * 10, 24, 4); g.restore(); };
  const cross = (g, x, y, s = 1) => { g.strokeStyle = '#e8442a'; g.lineWidth = 16 * s; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - 30 * s, y - 30 * s); g.lineTo(x + 30 * s, y + 30 * s); g.moveTo(x + 30 * s, y - 30 * s); g.lineTo(x - 30 * s, y + 30 * s); g.stroke(); };
  const arrow = (g, x0, x1, y, col = INK) => { g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 12; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1 - 30, y); g.stroke(); g.beginPath(); g.moveTo(x1, y); g.lineTo(x1 - 40, y - 26); g.lineTo(x1 - 40, y + 26); g.closePath(); g.fill(); };
  const clock12 = (h) => { const hh = Math.floor(h) % 24, ap = hh < 12 ? 'AM' : 'PM', d = hh % 12 || 12; return `${d}:00 ${ap}`; };
  const PANELS = [['adeno', S('adeno') - 0.1, S('caffeine') - 0.2], ['caffeine', S('caffeine') - 0.2, S('alcohol') - 0.2], ['alcohol', S('alcohol') - 0.2, S('usb') - 0.2], ['usb', S('usb') - 0.2, S('nocopy') - 0.2], ['nocopy', S('nocopy') - 0.2, E('nocopy') + 0.3]];
  function panel(t) {
    const P = PANELS.find(([, a, b]) => t >= a && t < b); if (!P) return; const [kind, a, b] = P;
    const first = kind === 'adeno', last = kind === 'nocopy', pop = first ? eio(clamp((t - a) / 0.25)) : 1, out_ = last ? 1 - eio(clamp((t - (b - 0.25)) / 0.25)) : 1, s = pop * out_;
    const g = og; g.save(); g.scale(K, K); const [px, py, pw, ph] = PANEL; g.translate(px + pw / 2, py + ph / 2); g.scale(0.6 + 0.4 * s, 0.6 + 0.4 * s); g.globalAlpha = clamp(s * 1.5); g.translate(-pw / 2, -ph / 2);
    g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 30; g.shadowOffsetY = 10; rr(g, 0, 0, pw, ph, 44); g.fillStyle = INK; g.fill(); g.shadowColor = 'transparent';
    rr(g, 9, 9, pw - 18, ph - 18, 36); g.fillStyle = '#fff8ec'; g.fill(); g.save(); rr(g, 9, 9, pw - 18, ph - 18, 36); g.clip();
    const u = clamp((t - a) / (b - a)), sh = (amp, f = 40) => Math.sin(t * f) * amp;
    if (kind === 'adeno') {
      txt(g, 'ADENOSINE PILES UP', pw / 2, 92, 66);
      const k = clamp((t - wt('adeno', 'chemical')) / (wt('adeno', "that's") - wt('adeno', 'chemical') + 0.4)), n = Math.floor(64 * k), cx = 330, cy = 360, r = 230;
      brain(g, cx, cy, r, k * 0.4);
      for (let i = 0; i < n; i++) { const an = rnd(i) * 7, rad = Math.sqrt(rnd(i + 99)) * r * 0.62, x = cx + Math.cos(an) * rad * 1.05, y = cy - 30 + Math.sin(an) * rad * 0.82, ap = clamp((k * 64 - i) / 3); dot(g, x + sh(1.5, 9 + i), y, 13 * ap); }
      meter(g, 640, 160, 70, 330, k, ''); txt(g, 'SLEEP', 675, 540, 34); txt(g, 'PRESSURE', 675, 576, 34);
      txt(g, 'AWAKE', 845, 200, 34, '#7a6a60'); txt(g, clock12(7 + 19 * k), 845, 270, 58, '#c8241c');
      dot(g, 770, 380, 14); txt(g, '= adenosine', 792, 390, 26, INK, 'InterB', 'left');
      if (t > wt('adeno', "that's")) { g.save(); g.translate(845, 470); g.rotate(-0.12); g.scale(1 + 0.08 * Math.sin(t * 8), 1 + 0.08 * Math.sin(t * 8)); txt(g, 'SLEEPY', 0, 20, 64, '#7b4fd6'); g.restore(); }
    }
    if (kind === 'caffeine') {
      const tb = wt('caffeine', 'blocks'), tu = wt('caffeine', 'until'), tw = wt('caffeine', 'wears'), tc = wt('caffeine', 'crash'), crash = t > tc;
      txt(g, crash ? 'CRASH' : t > tu ? '...UNTIL IT WEARS OFF' : 'COFFEE BLOCKS THE SENSORS', pw / 2, 92, crash ? 80 : 58, crash ? '#e8442a' : INK);
      const my = 470; g.fillStyle = INK; g.fillRect(40, my - 6, pw - 80, 70); g.fillStyle = '#f0c9a0'; g.fillRect(40, my, pw - 80, 58); g.fillStyle = '#e3b386'; for (let x = 60; x < pw - 60; x += 46) { g.beginPath(); g.arc(x, my + 29, 9, 0, 7); g.fill(); }
      const cups = [180, 380, 580, 780];
      cups.forEach((x, i) => { g.fillStyle = INK; g.beginPath(); g.moveTo(x - 52, my - 70); g.lineTo(x - 52, my); g.lineTo(x + 52, my); g.lineTo(x + 52, my - 70); g.lineTo(x + 30, my - 70); g.lineTo(x + 30, my - 26); g.lineTo(x - 30, my - 26); g.lineTo(x - 30, my - 70); g.closePath(); g.fill();
        g.fillStyle = crash ? '#e8442a' : '#2fb3a6'; g.beginPath(); g.moveTo(x - 45, my - 64); g.lineTo(x - 45, my - 6); g.lineTo(x + 45, my - 6); g.lineTo(x + 45, my - 64); g.lineTo(x + 37, my - 64); g.lineTo(x + 37, my - 19); g.lineTo(x - 37, my - 19); g.lineTo(x - 37, my - 64); g.closePath(); g.fill();
        // caffeine beans: drop in, then leave when it wears off
        const tin = a + 0.15 + i * 0.22, din = eio(clamp((t - tin) / 0.4)), lv = eio(clamp((t - tu - i * 0.12) / 0.5)), by = lerp(lerp(-40, my - 46, din), -60, lv);
        if (t > tin) bean(g, x + lv * (i % 2 ? 60 : -60), by, lv * 2 + (i - 1.5) * 0.2, 1.05);
        // adenosine: hovers above (bounced) while blocked, slams in after the beans leave
        const dIn = eio(clamp((t - tw - 0.15 * i) / 0.35)), hover = my - 150 - Math.abs(Math.sin(t * 5 + i * 1.7)) * 40, dy = lerp(hover, my - 44, dIn);
        dot(g, x + (1 - dIn) * Math.sin(t * 3 + i) * 18, dy, 20); for (const j of [1, 2]) dot(g, x - 60 + j * 40 + Math.sin(t * 4 + i + j) * 10, my - 230 - j * 30 + Math.sin(t * 3 + j * i) * 12, 14); });
      g.globalAlpha = 1; dot(g, 120, 595, 15); txt(g, 'adenosine', 150, 606, 30, INK, 'InterB', 'left'); bean(g, 520, 594, 0, 0.8); txt(g, 'caffeine', 555, 606, 30, INK, 'InterB', 'left');
      if (crash) { g.save(); g.translate(pw / 2 + sh(8, 50), 260 + sh(6, 47)); g.rotate(-0.1); g.scale(1.4 - 0.4 * eio(clamp((t - tc) / 0.2)), 1.4 - 0.4 * eio(clamp((t - tc) / 0.2))); txt(g, 'ALL AT ONCE!', 0, 30, 96, '#e8442a'); g.restore(); }
    }
    if (kind === 'alcohol') {
      const ta = wt('alcohol', 'awake'), ty = wt('alcohol', 'your'), k = eio(clamp((t - wt('alcohol', 'by')) / (ta - wt('alcohol', 'by') + 0.3)));
      txt(g, `${Math.round(19 * k)} HOURS AWAKE`, pw / 2, 92, 70, k > 0.99 ? '#c8241c' : INK);
      const cx = 250, cy = 345, R = 165; g.fillStyle = INK; g.beginPath(); g.arc(cx, cy, R + 9, 0, 7); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
      g.fillStyle = 'rgba(232,68,42,0.22)'; const h0 = 7, hh = 7 + 19 * k, A = h => (h % 12) / 12 * PI * 2 - PI / 2; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R - 8, A(h0), A(h0) + (hh - h0) / 12 * PI * 2); g.closePath(); g.fill();
      for (let i = 0; i < 12; i++) { const an = i / 12 * PI * 2; g.fillStyle = INK; g.beginPath(); g.arc(cx + Math.cos(an) * (R - 22), cy + Math.sin(an) * (R - 22), i % 3 ? 5 : 9, 0, 7); g.fill(); }
      g.strokeStyle = INK; g.lineCap = 'round'; g.lineWidth = 16; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(A(hh)) * R * 0.5, cy + Math.sin(A(hh)) * R * 0.5); g.stroke();
      g.lineWidth = 9; g.beginPath(); g.moveTo(cx, cy); const mA = (hh % 1) * PI * 2 - PI / 2 + k * 19 * PI * 2; g.lineTo(cx + Math.cos(mA) * R * 0.78, cy + Math.sin(mA) * R * 0.78); g.stroke();
      txt(g, '7 AM', cx - 150, cy + R + 60, 40, '#7a6a60'); txt(g, '→', cx, cy + R + 60, 40, '#7a6a60'); txt(g, clock12(hh), cx + 140, cy + R + 60, 40, '#c8241c');
      if (t > ty - 0.1) { const q = eio(clamp((t - ty + 0.1) / 0.3)); g.save(); g.globalAlpha = q; g.translate(0, (1 - q) * 30);
        txt(g, '≈', 470, 380, 120); const gx = 610, gy = 300;   // glass of beer
        g.fillStyle = INK; g.beginPath(); g.moveTo(gx - 70, gy - 100); g.lineTo(gx + 70, gy - 100); g.lineTo(gx + 56, gy + 110); g.lineTo(gx - 56, gy + 110); g.closePath(); g.fill();
        g.fillStyle = '#f2b52c'; g.beginPath(); g.moveTo(gx - 60, gy - 60); g.lineTo(gx + 60, gy - 60); g.lineTo(gx + 48, gy + 100); g.lineTo(gx - 48, gy + 100); g.closePath(); g.fill();
        g.fillStyle = '#fffaf0'; for (const [x, y, r] of [[-40, -80, 28], [-5, -88, 32], [32, -80, 28], [55, -66, 18], [-58, -64, 18]]) { g.beginPath(); g.arc(gx + x, gy + y, r, 0, 7); g.fill(); }
        g.strokeStyle = INK; g.lineWidth = 14; g.beginPath(); g.arc(gx + 78, gy + 10, 40, -PI / 2, PI / 2); g.stroke();
        txt(g, '0.05%', 845, 330, 76, '#c8241c'); txt(g, 'BLOOD', 845, 400, 40); txt(g, 'ALCOHOL', 845, 442, 40);
        txt(g, 'Williamson & Feyer, 2000', pw - 40, ph - 40, 24, '#8a7a70', 'InterB', 'right'); g.restore(); }
    }
    if (kind === 'usb' || kind === 'nocopy') {
      const nc = kind === 'nocopy', td = wt('usb', 'deep'), sx = 220, dx = 750, y = 330;
      txt(g, nc ? 'NO SLEEP = NO SAVE' : t > td ? 'DEEP SLEEP = SAVING...' : 'WHERE NEW FACTS LIVE', pw / 2, 92, 64, nc ? '#c8241c' : INK);
      const cp = nc ? 0 : clamp((t - td - 0.3) / (b - td - 0.4)), fill = nc ? 1 : lerp(0.9, 0.25, cp);
      usb(g, sx, y, fill, '#f2cf2c', nc); txt(g, 'HIPPOCAMPUS', sx + 15, y + 115, 40); txt(g, 'short-term · small', sx + 15, y + 152, 26, '#7a6a60', 'InterB');
      drive(g, dx, y, nc ? 0.35 : lerp(0.35, 0.95, cp)); txt(g, 'CORTEX', dx, y + 180, 40); txt(g, 'long-term · huge', dx, y + 215, 26, '#7a6a60', 'InterB');
      arrow(g, 380, 610, y, nc ? '#bdb2a6' : INK);
      if (!nc && t > td) { const q = eio(clamp((t - td) / 0.3)); g.save(); g.globalAlpha = q; g.fillStyle = '#f6ecc8'; g.beginPath(); g.arc(495, 215, 38, 0, 7); g.fill(); g.fillStyle = '#fff8ec'; g.beginPath(); g.arc(515, 200, 34, 0, 7); g.fill();
        txt(g, 'z', 560, 200, 40, '#3d7be0'); txt(g, 'Z', 590, 170, 54, '#3d7be0'); g.restore();
        for (let i = 0; i < 4; i++) { const f = ((t - td) * 0.9 + i / 4) % 1; file(g, lerp(sx + 60, dx - 60, f), y - 90 - Math.sin(f * PI) * 90, 0.9, f * 0.6); } }
      if (nc) { cross(g, 495, y, 1.1); const ta = wt('nocopy', 'and');
        for (let i = 0; i < 3; i++) { const t0 = ta + i * 0.45; if (t < t0) continue; const f = clamp((t - t0) / 0.5), bx = lerp(520, sx + 100, f), by = y - 160 + i * 20; const bo = t - t0 - 0.5;
          if (bo < 0) file(g, bx, by, 0.85, 0, '#ffe66b'); else { file(g, sx + 100 + bo * 260, by + bo * bo * 900, 0.85, bo * 5, '#ffe66b'); if (bo < 0.35) cross(g, sx + 120, y - 130, 0.6); } }
        txt(g, 'FULL', sx - 10, y + 13, 34, '#ffffff'); }
    }
    g.restore(); g.restore();
  }
  // big flash between the exam and the science (white) and caption-safe vignette
  const flash = (t) => { const k = Math.max(clamp((t - (B2 - 0.35)) / 0.35) * (t < B2 ? 1 : 0), t >= B2 ? 1 - clamp((t - B2) / 0.4) : 0); if (k > 0) { og.fillStyle = `rgba(255,250,240,${k})`; og.fillRect(0, 0, WW, HH); } };

  // ---------- shots ----------
  const SHOTS = [];
  const shot = (t0, fn) => SHOTS.push({ t0, fn });
  let dofD = 0, dofA = 0; const dof = (d, a = 0.012) => { dofD = d; dofA = a; };
  const hand = (t, a = 1) => V(Math.sin(t * 0.9) * 0.012 * a + Math.sin(t * 1.7 + 1) * 0.006 * a, Math.sin(t * 1.1 + 2) * 0.009 * a, 0);
  const LH = () => headC(LEO);
  // Leo at the home desk, reading; flip(u) = page turning back (0..1); extra(t) for one-off actions
  const BOOKP = () => bookG.position.clone();
  function leoDesk(t, o = {}) {
    sitDown(LEO, DX, LZ, 0, t, { lean: o.lean ?? 0.18, noArms: true });
    if (o.pitch !== undefined) headTurn(LEO, o.yaw || 0, o.pitch); else headTurn(LEO, 0, 0.25);
    const bp = BOOKP(); const l = LEFT(LEO);
    arm(LEO, 'Left', bp.clone().add(V(0, 0.02, 0.0)).addScaledVector(l, 0.24), dirW(LEO, 1, -0.6, -0.2));
    if (o.flip !== undefined) { const a = PI * (1 - eio(o.flip)); flipP.rotation.z = a; const edge = bp.clone().add(V(Math.cos(a) * 0.19, 0.03 + Math.sin(a) * 0.19, -0.02)); arm(LEO, 'Right', edge, dirW(LEO, -1, -0.4, -0.3)); }
    else { flipP.rotation.z = 0; arm(LEO, 'Right', bp.clone().add(V(0, 0.025, 0.02)).addScaledVector(l, -0.16 - 0.03 * Math.sin(t * 2)), dirW(LEO, -1, -0.6, -0.2)); }
    face(LEO, o.mood || 'sleepy');
  }
  const mugsOn = (t, t0 = -1) => mugs.forEach((m, i) => { const k = t0 < 0 ? 1 : eio(clamp((t - t0 - i * 0.22) / 0.18)); m.visible = k > 0.01; m.scale.setScalar(Math.max(0.01, k * (1 + 0.25 * Math.sin(k * PI)))); });
  const roomieAt = V(-3.25, 0, -23.0);
  const roomie = (t, mood) => { place(ROOMIE, roomieAt.x, roomieAt.z, yawTo(roomieAt.x, roomieAt.z, DX, LZ), FY); idle(ROOMIE, t); armsCrossed(ROOMIE); face(ROOMIE, mood); };

  if (HOME) {
    const T1 = 2.3, Tn = wt('hook', 'remembered');
    // 1 — ECU on the clock "2:00", pull back and rise to Leo reading (focus racks clock → Leo)
    const hook1 = (t, u) => { leoDesk(t, { mood: 'sleepy' }); mugsOn(t, 1e9); const ck = clockM.getWorldPosition(V(0, 0, 0)), h = LH();
      look(vl(ck.clone().add(V(0.06, 0.04, 0.32)), V(DX + 0.75, h.y + 0.12, DZ + 2.35), eio(u)).add(hand(t, 0.5)), vl(ck, h.clone().add(V(0, -0.2, 0)), eio(u)), lerp(32, 36, u)); dof(lerp(0.33, 3.0, eio(u)), 0.012); };
    shot(0, t => hook1(t, clamp(t / T1)));
    // 2 — MCU: he flips back to the same page; at "remembered none of it" his face goes blank, "?"
    shot(T1, t => { const fu = clamp((t - T1) / 0.9); leoDesk(t, { mood: t > Tn ? 'blank' : 'sleepy', flip: fu < 1 ? fu : undefined, pitch: t > Tn ? 0.08 : 0.28 }); mugsOn(t, 1e9);
      const h = LH(), u = eio(clamp((t - T1) / (S('context') - T1))); look(V(DX + lerp(0.75, 0.55, u), h.y + 0.12, lerp(DZ + 2.35, DZ + 1.95, u)).add(hand(t, 0.4)), h.clone().add(V(0, -0.2, 0)), 36); dof(lerp(3.0, 2.6, u), 0.012);
      if (t > Tn) bubble(0, '?', '#3d7be0', h.clone().add(V(0.22, 0.32, 0)), Tn + 0.1, t, 0.26); });
    // 3 — insert: the sticky note "EXAM 9 AM!!", then the wide establishing crane (books, the dark dorm, the moon)
    const tc = wt('context', 'his');
    shot(S('context') - 0.15, t => { leoDesk(t, { mood: 'sleepy' }); mugsOn(t, 1e9); const u = eio(clamp((t - S('context') + 0.15) / (tc - S('context') + 0.15)));
      look(V(-4.55 + 0.1 * u, FY + 1.92, ZB + lerp(1.05, 0.85, u)), V(-4.7, FY + 1.95, ZB + 0.17), 36); dof(0.8, 0.02); });
    shot(tc - 0.05, t => { leoDesk(t, { mood: 'sleepy' }); mugsOn(t, 1e9); roomie(t, 'calm'); ROOMIE.root.visible = false; const u = eio(clamp((t - tc) / (S('mock') - tc + 0.3)));
      look(V(lerp(-1.6, -2.4, u), lerp(FY + 3.3, FY + 2.5, u), lerp(Z + 1.6, Z + 0.4, u)), V(lerp(-5.5, -5.9, u), FY + 0.85, DZ - 0.3), 42); });
    // 4 — the roommate in the room, arms crossed: "Dude. You've highlighted the whole book." (OTS past Leo's head)
    shot(S('mock') - 0.3, t => { leoDesk(t, { mood: 'flat', pitch: 0.05, yaw: 0.55 }); mugsOn(t, 1e9); roomie(t, talking('mock', t) ? 'smugt' : 'smug');
      const r = headC(ROOMIE), u = eio(clamp((t - S('mock') + 0.3) / (S('reply') - S('mock') + 0.3)));
      look(V(DX - 0.1, FY + 1.3, LZ - 0.5).lerp(V(DX + 0.15, FY + 1.28, LZ - 0.4), u), r.clone().add(V(0, -0.25, 0)), lerp(40, 36, u)); dof(r.distanceTo(camera.position), 0.015); });
    // 5 — Leo, close and stubborn: "Sleep is for people who already know this."
    shot(S('reply') - 0.3, t => { leoDesk(t, { mood: talking('reply', t) ? 'serioust' : 'serious', pitch: 0.0, yaw: 0.45 }); mugsOn(t, 1e9); roomie(t, 'smug');
      const h = LH(), u = eio(clamp((t - S('reply') + 0.3) / (S('coffee') - S('reply'))));
      look(h.clone().add(V(lerp(1.15, 0.95, u), 0.0, lerp(2.3, 2.0, u))), h.clone().add(V(0.02, -0.12, 0)), 32); dof(h.distanceTo(camera.position), 0.016); });
    // 6 — "Three coffees later": the mugs pop in one by one, he is wide awake and jittery; low hero angle
    const t3 = wt('coffee', 'three');
    shot(S('coffee') - 0.25, t => { leoDesk(t, { mood: t > wt('coffee', 'he') ? 'wide' : 'flat', pitch: 0.0 }); mugsOn(t, t3); const jit = t > wt('coffee', 'he') ? V(Math.sin(t * 60) * 0.006, 0, 0) : V(0, 0, 0); LEO.root.position.add(jit);
      const h = LH(), u = eio(clamp((t - S('coffee') + 0.25) / (B1 - S('coffee') + 0.25)));
      look(V(DX + lerp(0.35, 0.2, u), DY + lerp(0.1, 0.16, u), DZ + lerp(2.1, 1.7, u)), vl(V(DX, DY + 0.1, DZ + 0.15), h.clone().add(V(0, -0.1, 0)), 0.45 + 0.55 * u), lerp(42, 38, u)); dof(lerp(2.0, 2.2, u), 0.01);
      if (t > wt('coffee', 'unstoppable')) bubble(0, '!', '#e8442a', h.clone().add(V(0.22, 0.3, 0)), wt('coffee', 'unstoppable'), t, 0.26); });
    // ---- science (home, night) ----
    const frameLow = (t, h, d = 3.2, up = 0.24, x = 0.2, fov = 40) => { look(V(DX + x, h.y + up * 0.6, h.z + d).add(hand(t, 0.5)), V(DX + x * 0.3, h.y + up, h.z), fov); dof(d, 0.008); };
    // adenosine: he yawns and stretches; the panel fills with dots
    shot(B2, t => { const ty = wt('adeno', 'chemical'), y = clamp((t - ty) / 1.6), yawning = y > 0 && y < 1;
      leoDesk(t, { mood: yawning ? 'yawn' : t > wt('adeno', "that's") ? 'sleepy' : 'flat', pitch: yawning ? -0.35 * Math.sin(y * PI) : 0.2 }); mugsOn(t);
      if (yawning) { const k = Math.sin(y * PI); arm(LEO, 'Left', vl(BOOKP().addScaledVector(LEFT(LEO), 0.24), Lw(LEO, 0.35, 1.95, 0.0), k)); arm(LEO, 'Right', vl(BOOKP().addScaledVector(LEFT(LEO), -0.2), Lw(LEO, -0.35, 1.95, 0.0), k), dirW(LEO, -1, 0.2, -0.3)); }
      const h = LH(), u = eio(clamp((t - B2) / (S('caffeine') - B2))); frameLow(t, h, lerp(3.4, 3.0, u), 0.24, 0.3);
      if (t > wt('adeno', "that's")) bubble(1, 'Z', '#3d7be0', h.clone().add(V(0.25, 0.3, 0)), wt('adeno', "that's"), t, 0.24); });
    // caffeine: he sips the coffee, eyes pop; "the crash hits" → head drops onto the book
    shot(S('caffeine') - 0.2, t => { const tc = wt('caffeine', 'crash'), ts = S('caffeine') - 0.1, sip = clamp((t - ts) / 1.6), drop = eio(clamp((t - tc + 0.05) / 0.3));
      leoDesk(t, { mood: drop > 0.5 ? 'dizzy' : sip > 0.35 ? 'wide' : 'sleepy', lean: 0.18 + drop * 0.5, pitch: 0.2 + drop * 0.55 }); mugsOn(t);
      const m = mugs[0], home = V(DX + 0.12, DY, DZ + 0.2);
      if (sip < 1 && drop === 0) { const k = Math.sin(sip * PI), h = LH(), lip = h.clone().add(dirW(LEO, 0, 0, 1).multiplyScalar(0.3)).add(V(-0.06, -0.18, 0)); const P = vl(home.clone().add(V(-0.05, 0.05, 0)), lip, k);
        arm(LEO, 'Right', P.clone().add(V(0.045, 0.04, 0)), dirW(LEO, -1, -0.6, 0)); m.position.copy(P); m.rotation.z = -0.9 * k; } else { m.position.copy(home); m.rotation.z = 0; }
      const h = LH(), u = eio(clamp((t - S('caffeine') + 0.2) / (S('alcohol') - S('caffeine')))); if (drop > 0) { const v = eio(clamp((t - tc) / 1.2)); look(V(DX + lerp(1.0, 0.85, v), FY + lerp(2.1, 2.0, v), LZ + lerp(2.0, 1.8, v)), V(DX + 0.0, FY + 0.85, LZ + 0.3), 40); dof(2.3, 0.01); } else frameLow(t, V(DX, FY + 1.12, LZ), lerp(3.2, 2.9, u), 0.26, -0.3);
      if (drop > 0) { const s = Math.max(0, 1 - (t - tc) * 3) * 0.02; camera.position.add(V(Math.sin(t * 70) * s, Math.cos(t * 63) * s, 0)); } });
    // 19 hours awake ~ a couple of drinks: he sways, dizzy; dutch tilt
    shot(S('alcohol') - 0.2, t => { const ty = wt('alcohol', 'your'), dz = clamp((t - ty + 0.2) / 0.4), sw = Math.sin(t * 2.6) * 0.12 * dz;
      leoDesk(t, { mood: dz > 0.3 ? 'dizzy' : 'sleepy', lean: 0.1, pitch: 0.1, yaw: sw * 1.5 }); mugsOn(t); SR.rotWorld(LEO.bone('Spine1'), dirW(LEO, 0, 0, 1), sw);
      const h = LH(), u = eio(clamp((t - S('alcohol') + 0.2) / (S('usb') - S('alcohol')))); look(V(DX - 0.4 + u * 0.7, h.y + 0.14, h.z + lerp(3.3, 2.9, u)).add(hand(t, 0.6)), V(DX, h.y + 0.24, h.z), 40, -0.12 * dz * Math.sin(t * 1.3 + 0.6)); dof(3.0, 0.008); });
    // hippocampus = USB stick: Leo stares at the page; "deep sleep" → the empty bed in the moonlight
    const td = wt('usb', 'deep');
    shot(S('usb') - 0.2, t => { leoDesk(t, { mood: 'sleepy', pitch: 0.3 }); mugsOn(t); const h = LH(), u = eio(clamp((t - S('usb') + 0.2) / (td - S('usb') + 0.2)));
      look(V(DX + 1.1 - 0.3 * u, h.y + 0.16, h.z + 3.0).add(hand(t, 0.5)), V(DX + 0.2, h.y + 0.24, h.z), 40); dof(3.1, 0.008); });
    shot(td - 0.05, t => { leoDesk(t, { mood: 'sleepy' }); mugsOn(t); const u = eio(clamp((t - td) / (S('nocopy') - td + 0.2))), b = bedObj.position;
      look(V(b.x + lerp(1.9, 1.6, u), FY + lerp(1.5, 1.35, u), b.z + lerp(2.6, 2.2, u)), V(b.x + 0.2, FY + lerp(1.2, 1.05, u), b.z - 0.3), 42); dof(2.6, 0.01); });
    // no copy: back on Leo, the "?" and the page that does not stick
    shot(S('nocopy') - 0.2, t => { const ta = wt('nocopy', 'and'); leoDesk(t, { mood: t > ta ? 'pale' : 'blank', pitch: t > ta ? 0.05 : 0.3 }); mugsOn(t); const h = LH(), u = eio(clamp((t - S('nocopy') + 0.2) / (S('loop') - S('nocopy'))));
      look(V(DX + 0.2, h.y + 0.15, h.z + lerp(3.2, 2.7, u)).add(hand(t, 0.4)), V(DX + 0.05, h.y + 0.24, h.z), 38); dof(lerp(3.2, 2.7, u), 0.01);
      if (t > ta + 0.3) bubble(0, '?', '#3d7be0', h.clone().add(V(0.24, 0.3, 0)), ta + 0.3, t, 0.24); if (t > ta + 0.6) bubble(1, '?', '#3d7be0', h.clone().add(V(-0.22, 0.36, 0)), ta + 0.6, t, 0.2); });
    // loop: back to 2:00, same flip; the camera glides down onto the clock so the ending meets frame 1
    shot(S('loop') - 0.2, t => { const t0 = S('loop') - 0.2, u = clamp((t - t0) / (DUR - t0)); leoDesk(t, { mood: 'sleepy', flip: clamp((t - t0) / 1.0) < 1 ? clamp((t - t0) / 1.0) : undefined }); mugsOn(t, 1e9);
      const ck = clockM.getWorldPosition(V(0, 0, 0)), h = LH(), v = eio(clamp((u - 0.35) / 0.65));
      look(vl(V(DX + 0.6, h.y + 0.12, DZ + 2.0), ck.clone().add(V(0.06, 0.04, 0.32)), v).add(hand(t, 0.5)), vl(h.clone().add(V(0, -0.2, 0)), ck, v), lerp(36, 32, v)); dof(lerp(2.7, 0.33, v), 0.012); });
  } else {
    // exam room — 7 students at desks, 9:00 on the wall clock
    const students = t => EXAM.forEach(([c, x, z], i) => { sitDown(c, x, z - 0.62, 0, t, { lean: 0.25, noArms: true }); headTurn(c, 0, 0.35); deskHands(c, V(x, DY + 0.03, z - 0.1)); face(c, c === ROOMIE ? 'smug' : 'calm');
      const wr = c.bone('RightHand'); if (i % 2 === 0) { const p = V(x - 0.1 + 0.02 * Math.sin(t * 9 + i), DY + 0.03 + 0.01 * Math.abs(Math.sin(t * 12 + i)), z - 0.12); arm(c, 'Right', p); } });
    const leoExam = (t, mood, pitch = 0.3) => { sitDown(LEO, XL, LZX, 0, t, { lean: 0.22, noArms: true }); headTurn(LEO, 0, pitch); deskHands(LEO, V(XL, DY + 0.03, ZL - 0.1)); face(LEO, mood); };
    const tq = wt('blank', 'question'), tt = wt('blank', 'total');
    // 7 — establish: crane down over the exam room, clock 9:00
    shot(B1, t => { students(t); leoExam(t, 'flat'); const u = eio(clamp((t - B1) / (tq - B1)));
      look(V(lerp(1.6, 1.0, u), lerp(FY + 3.4, FY + 2.5, u), lerp(Z + 5.6, Z + 4.6, u)), V(lerp(0.4, 0.3, u), lerp(FY + 1.1, FY + 0.85, u), Z - 1.6), 50); });
    // 8 — OTS: question one on the paper ("Explain how the brain stores new memories")
    shot(tq - 0.1, t => { students(t); leoExam(t, 'flat', 0.5); const u = eio(clamp((t - tq) / (tt - tq))), P = V(XL, DY, ZL - 0.08);
      LEO.root.visible = false; look(V(XL + 0.02, DY + lerp(0.8, 0.72, u), P.z - 0.22), P.clone().add(V(0, 0, 0.01)), 36); dof(P.distanceTo(camera.position), 0.012); });
    // 9 — "Total blank": dolly zoom + dutch on his face; then the push into his head, white flash into the science
    shot(tt - 0.1, t => { students(t); leoExam(t, 'blank', 0.05); const h = LH(), t1 = S('turn') - 0.05;
      if (t < t1) { const u = eio(clamp((t - tt + 0.1) / (t1 - tt + 0.1))), dz = lerp(1.6, 4.0, u), fov = 2 * Math.atan(0.6 / dz) * 180 / PI; look(h.clone().add(V(0.02, -0.04, dz)), h.clone().add(V(0, -0.04, 0)), fov, -0.1 * u); dof(dz, 0.014); }
      else { const u = clamp((t - t1) / (B2 - t1)), dz = lerp(3.6, 0.3, eio(u)); look(h.clone().add(V(0.0, 0.02, dz)), h.clone().add(V(0, 0.04, 0)), lerp(34, 50, u * u)); dof(dz, 0.01); } });
  }

  // ---------- frame ----------
  function frame(t) {
    resetScene(); light(); sprites.forEach(s => (s.visible = false)); OUTF.forEach(c => (c.root.visible = false)); ex.forEach(c => (c.root.visible = false)); dofD = 0;
    if (HOME) { mugs.forEach(m => (m.visible = true)); clockT.userData.set('2:00'); }
    let i = 0; for (let k = 0; k < SHOTS.length; k++) if (t >= SHOTS[k].t0) i = k; SHOTS[i].fn(t);
    ALL.forEach(c => SR.updateLimbs(c));
    if (hl && LEO.root.visible) { hl.visible = true; const hp = SR.wp(LEO.bone('RightHand')); hl.position.copy(hp).add(V(0, 0.05, 0.02)); hl.rotation.set(0.5, 0, 0.4); }
    post.bokeh.enabled = dofD > 0; if (dofD > 0) { post.bokeh.uniforms.focus.value = dofD; post.bokeh.uniforms.aperture.value = dofA; }
    const f = HOME ? V(DX, 1, DZ) : V(0, 1, ZD + 1); sun.target.position.copy(f); sun.position.copy(f).addScaledVector(SUNDIR, 60); const sc = sun.shadow.camera; sc.left = sc.bottom = -9; sc.right = sc.top = 9; sc.near = 1; sc.far = 140; sc.updateProjectionMatrix();
    U.uTime.value = t; post.render();
    og.clearRect(0, 0, WW, HH); og.drawImage(canvas, 0, 0); if (HOME) panel(t); flash(t);
    return out.toDataURL('image/jpeg', 0.92);
  }
  // speed knobs for software rendering: &noao=1 drops the n8ao pass, &aohalf=1 runs it at half resolution, &shadow=1024
  const aoPass = post.composer.passes.find(p => p.constructor.name.includes('N8AO')); if (aoPass) { if (Q.has('noao')) aoPass.enabled = false; if (Q.has('aohalf')) aoPass.configuration.halfRes = true; }
  if (Q.get('shadow')) { sun.shadow.mapSize.set(+Q.get('shadow'), +Q.get('shadow')); sun.shadow.map?.dispose(); sun.shadow.map = null; }
  window.frame = frame; window.DUR = DUR; window.ready = true;
}

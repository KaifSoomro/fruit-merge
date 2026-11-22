
(() => {
  const W = 360,
    H = 560,
    L = 14,
    R = W - 14,
    F = H - 14,
    LINE = 100,
    G = 0.32;
  const N = [
    "cherry",
    "strawberry",
    "grape",
    "orange",
    "apple",
    "pear",
    "peach",
    "pineapple",
    "melon",
    "watermelon",
  ];
  const RAD = [14, 19, 24, 30, 37, 45, 55, 66, 79, 93];
  const COL = [
    "#e5484d",
    "#ff5c8a",
    "#9b5de5",
    "#ff9f1c",
    "#e03131",
    "#8cc63f",
    "#ff9b7a",
    "#f4c20d",
    "#8fd14f",
    "#2f9e44",
  ];
  const PNG = new Set(["strawberry", "grape", "orange", "apple", "peach", "pear", "watermelon", "pineapple"]);
  const src = (n) => "images/" + n + (PNG.has(n) ? ".png" : ".svg");
  const FIT = N.map((n) => (PNG.has(n) ? 0.86 : 1));
  const PR = 20, 
    BLAST = 65, 
    COMBO_FOR_POWER = 5, 
    MAXSTOCK = 3;
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (id) => document.getElementById(id),
    cv = $("c"),
    ctx = cv.getContext("2d"),
    stage = document.querySelector(".stage");
  const dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = W * dpr;
  cv.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  let balls,
    score,
    best = 0,
    cur,
    nxt,
    aimX,
    cool,
    over,
    fx,
    pops,
    overT,
    shake,
    combo,
    comboT,
    started = false,
    paused = false,
    flash = 0,
    wasD = false,
    goT,
    stock = 0,
    armed = false,
    AC,
    last = 0,
    acc = 0;
  try {
    best = +localStorage.getItem("fm-best") || 0;
  } catch (e) {}
  const S = { sound: true, music: true, vibe: true };
  try {
    Object.assign(S, JSON.parse(localStorage.getItem("fm-settings")) || {});
  } catch (e) {}
  const saveS = () => {
    try {
      localStorage.setItem("fm-settings", JSON.stringify(S));
    } catch (e) {}
  };
  $("best").textContent = best;
  $("startBest").textContent = best;
  let loaded = 0;
  const imgs = N.map((n) => {
    const i = new Image();
    i.onload = i.onerror = () => {
      if (++loaded === N.length) {
        reset();
        requestAnimationFrame(loop);
      }
    };
    i.src = src(n);
    return i;
  });
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)),
    rnd = () => Math.floor(Math.random() * 4);

  const BOOST = 5; 
  const MUSIC_VOL = 1; 

  function audio() {
    if (!AC) {
      try {
        if (navigator.audioSession) navigator.audioSession.type = "playback"; 
        AC = new (window.AudioContext || window.webkitAudioContext)();
        const lim = AC.createDynamicsCompressor();
        lim.threshold.value = -6;
        lim.knee.value = 6;
        lim.ratio.value = 20;
        lim.attack.value = 0.002;
        lim.release.value = 0.1;
        lim.connect(AC.destination);
        AC.out = lim;
        const mg = AC.createGain(),
          dl = AC.createDelay(),
          fb = AC.createGain(),
          wet = AC.createGain();
        mg.gain.value = 0;
        dl.delayTime.value = 0.29;
        fb.gain.value = 0.28;
        wet.gain.value = 0.35;
        mg.connect(lim);
        mg.connect(dl);
        dl.connect(fb);
        fb.connect(dl);
        dl.connect(wet);
        wet.connect(lim);
        AC.mus = mg;
      } catch (e) {
        AC = null;
        return null;
      }
    }
    if (AC.state !== "running") AC.resume(); 
    return AC;
  }

  function beep(f, d = 0.09, v = 0.07, ty = "sine") {
    if (!S.sound || !audio()) return;
    try {
      const o = AC.createOscillator(),
        g = AC.createGain(),
        t = AC.currentTime;
      o.type = ty;
      o.frequency.value = f;
      g.gain.setValueAtTime(v * BOOST, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(g);
      g.connect(AC.out);
      o.start();
      o.stop(t + d);
    } catch (e) {}
  }

  const mf = (m) => 440 * Math.pow(2, (m - 69) / 12),
    EIGHTH = 60 / 104 / 2,
    CH = [[60, 64, 67], [57, 60, 64], [57, 60, 65], [59, 62, 67]],
    BASS = [48, 45, 41, 43],
    __ = null,
    MEL = [
      76, __, 72, __, 79, __, 76, __,
      76, __, 72, __, 69, __, 72, __,
      74, __, 77, __, 76, __, 74, __,
      72, __, 74, __, 79, __, __, __,
      79, __, 76, __, 72, __, 76, __,
      81, __, 79, __, 76, __, 72, __,
      77, __, 76, __, 74, __, 72, __,
      71, __, 74, __, 72, __, __, __,
    ];
  let mTimer = 0,
    mStep = 0,
    mNext = 0;
  function mnote(m, t, d, v) {
    [[1, "triangle", 1], [2, "sine", 0.25]].forEach(([k, ty, a]) => {
      const o = AC.createOscillator(),
        g = AC.createGain();
      o.type = ty;
      o.frequency.value = mf(m) * k;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(v * a, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g);
      g.connect(AC.mus);
      o.start(t);
      o.stop(t + d + 0.05);
    });
  }
  function mstep(i, t) {
    const bar = i >> 3,
      s = i & 7,
      ch = CH[bar & 3];
    mnote(ch[[0, 1, 2, 1, 0, 1, 2, 1][s]], t, 0.5, 0.14);
    if (MEL[i] != null) mnote(MEL[i], t, 0.9, 0.3);
    if (s === 0 || s === 4) mnote(BASS[bar & 3], t, 0.6, 0.3);
  }
  function musicOn() {
    if (!S.music || !started || !audio()) return;
    AC.mus.gain.setTargetAtTime(MUSIC_VOL, AC.currentTime, 0.08);
    if (mTimer) return;
    mNext = AC.currentTime + 0.12;
    mTimer = setInterval(() => {
      while (mNext < AC.currentTime + 0.35) {
        mstep(mStep, mNext);
        mNext += EIGHTH;
        mStep = (mStep + 1) % 64;
      }
    }, 90);
  }
  function musicOff() {
    if (AC && AC.mus) AC.mus.gain.setTargetAtTime(0, AC.currentTime, 0.06);
    clearInterval(mTimer);
    mTimer = 0;
  }

  function buzz(n) {
    try {
      S.vibe && navigator.vibrate && navigator.vibrate(n);
    } catch (e) {}
  }
  function setNext() {
    $("next").src = src(N[nxt]);
  }
  function reset() {
    balls = [];
    fx = [];
    pops = [];
    score = 0;
    cur = rnd();
    nxt = rnd();
    aimX = W / 2;
    cool = 0;
    over = false;
    overT = 0;
    shake = 0;
    flash = 0;
    wasD = false;
    clearTimeout(goT);
    stage.className = "stage";
    combo = 0;
    comboT = 0;
    stock = 0;
    armed = false;
    updPower();
    $("score").textContent = 0;
    setNext();
    $("over").hidden = true;
  }
  function drop() {
    if (!started || paused || over || cool > 0) return;
    if (armed) {
      balls.push({
        x: clamp(aimX, L + PR, R - PR),
        y: LINE - PR - 6,
        vx: 0,
        vy: 0,
        t: -1,
        pw: 1,
        r: PR,
        age: 0,
        a: 0,
        s: 1,
        sv: 0,
      });
      stock--;
      armed = false;
      updPower();
      beep(200, 0.12, 0.07, "sawtooth");
      cool = 28;
      return;
    }
    const r = RAD[cur];
    balls.push({
      x: clamp(aimX, L + r, R - r),
      y: LINE - r - 6,
      vx: 0,
      vy: 0,
      t: cur,
      r,
      age: 0,
      a: 0,
      s: RM ? 1 : 0.6,
      sv: 0,
    });
    beep(240, 0.06, 0.05);
    cur = nxt;
    nxt = rnd();
    cool = 28;
    setNext();
  }
  function add(n, x, y) {
    score += n;
    const e = $("score");
    e.textContent = score;
    e.classList.remove("bump");
    void e.offsetWidth;
    e.classList.add("bump");
    pops.push({ x, y, t: "+" + n, life: 1 });
  }
  function updPower() {
    const b = $("power");
    $("pwn").textContent = stock;
    b.disabled = stock === 0 && !armed;
    b.classList.toggle("armed", armed);
    b.classList.toggle("has", stock > 0);
    b.setAttribute("aria-pressed", armed);
  }
  function togglePower() {
    if (!started || paused || over) return;
    if (armed) armed = false;
    else if (stock > 0) armed = true;
    else return;
    updPower();
    beep(armed ? 880 : 500, 0.08, 0.07, "triangle");
    buzz(10);
  }
  function givePower(x, y) {
    if (stock < MAXSTOCK) stock++;
    else add(50, x, y - 10);
    updPower();
    pops.push({ x, y: y - 28, t: "\u26A1 POWER BALL!", life: 1.5 });
    fx.push({ k: "ring", x, y, r: 20, c: "#ffb300", life: 1, g: 60 });
    [660, 880, 1175].forEach((f, i) =>
      setTimeout(() => beep(f, 0.12, 0.08, "triangle"), i * 80),
    );
    buzz([20, 30, 20]);
  }
  function boom(p) {
    p.dead = 1;
    const x = p.x,
      y = p.y;
    let n = 0,
      sum = 0;
    for (const b of balls) {
      if (b.dead) continue;
      const dx = b.x - x,
        dy = b.y - y,
        d = Math.hypot(dx, dy) || 1;
      if (d - b.r < BLAST) {
        b.dead = 1;
        n++;
        sum += ((b.t + 1) * (b.t + 2)) / 2 + 5;
        fx.push({ k: "ring", x: b.x, y: b.y, r: b.r * 0.6, c: COL[b.t], life: 1 });
        for (let k = 0; k < (RM ? 0 : 6); k++) {
          const g = Math.random() * 6.28,
            v = 2 + Math.random() * 4;
          fx.push({
            k: "dot",
            x: b.x,
            y: b.y,
            vx: Math.cos(g) * v,
            vy: Math.sin(g) * v - 1,
            c: COL[b.t],
            life: 1,
          });
        }
      } else if (d < BLAST * 2.4) {
        const k = 3.5 * (1 - d / (BLAST * 2.4));
        b.vx += (dx / d) * k;
        b.vy += (dy / d) * k - 0.5;
      }
    }
    fx.push({ k: "ring", x, y, r: 10, c: "#ffb300", life: 1, g: BLAST * 1.1 });
    fx.push({ k: "ring", x, y, r: 6, c: "#ff5a00", life: 1, g: BLAST * 0.7 });
    for (let k = 0; k < (RM ? 0 : 24); k++) {
      const g = Math.random() * 6.28,
        v = 3 + Math.random() * 6;
      fx.push({
        k: "dot",
        x,
        y,
        vx: Math.cos(g) * v,
        vy: Math.sin(g) * v,
        c: k % 2 ? "#ffd43b" : "#ff6a00",
        life: 1,
      });
    }
    if (n) add(Math.round(sum * (1 + 0.25 * n)), x, y);
    if (!RM) shake = 12;
    beep(90, 0.35, 0.14, "sawtooth");
    beep(180, 0.2, 0.1, "square");
    setTimeout(() => beep(420, 0.15, 0.08, "triangle"), 80);
    buzz([30, 20, 60]);
  }
  function physics() {
    const bombs = [];
    for (const b of balls) {
      b.age++;
      b.vy += G;
      b.x += b.vx;
      b.y += b.vy;
      b.vx *= 0.995;
      b.vy *= 0.995;
      b.a += b.vx / b.r;
      b.sv += (1 - b.s) * 0.22;
      b.sv *= 0.76;
      b.s += b.sv;
      if (b.x - b.r < L) {
        b.x = L + b.r;
        b.vx *= -0.2;
      }
      if (b.x + b.r > R) {
        b.x = R - b.r;
        b.vx *= -0.2;
      }
      if (b.y + b.r > F) {
        if (b.pw && !b.boom) {
          b.boom = 1;
          bombs.push(b);
        }
        if (b.vy > 4 && !RM) b.sv -= 0.03 * b.vy;
        b.y = F - b.r;
        b.vy *= -0.2;
        b.vx *= 0.92;
      }
    }
    const m = [];
    for (let it = 0; it < 4; it++)
      for (let i = 0; i < balls.length; i++) {
        const a = balls[i];
        for (let j = i + 1; j < balls.length; j++) {
          const b = balls[j],
            dx = b.x - a.x,
            dy = b.y - a.y,
            rs = a.r + b.r;
          if (Math.abs(dx) > rs || Math.abs(dy) > rs) continue;
          const d = Math.hypot(dx, dy);
          if (d >= rs || !d) continue;
          if (a.pw || b.pw) {
            const p = a.pw ? a : b;
            if (!a.dead && !b.dead && !p.boom) {
              p.boom = 1;
              bombs.push(p);
            }
            continue;
          }
          if (a.t === b.t && !a.dead && !b.dead) {
            a.dead = b.dead = 1;
            m.push([a, b]);
            continue;
          }
          if (a.dead || b.dead) continue;
          const nx = dx / d,
            ny = dy / d,
            ov = rs - d,
            ma = a.r * a.r,
            mb = b.r * b.r,
            s = ma + mb;
          a.x -= ((nx * ov * mb) / s) * 0.8;
          a.y -= ((ny * ov * mb) / s) * 0.8;
          b.x += ((nx * ov * ma) / s) * 0.8;
          b.y += ((ny * ov * ma) / s) * 0.8;
          const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (vn < 0) {
            const k = (-1.1 * vn) / (1 / ma + 1 / mb);
            a.vx -= (k * nx) / ma;
            a.vy -= (k * ny) / ma;
            b.vx += (k * nx) / mb;
            b.vy += (k * ny) / mb;
          }
        }
      }
    for (const [a, b] of m) {
      const x = (a.x + b.x) / 2,
        y = (a.y + b.y) / 2,
        t = a.t + 1;
      combo = comboT > 0 ? combo + 1 : 1;
      comboT = 70;
      if (combo % COMBO_FOR_POWER === 0) givePower(x, y);
      fx.push({ k: "ring", x, y, r: a.r, c: COL[a.t], life: 1 });
      for (let k = 0; k < (RM ? 0 : 12); k++) {
        const g = Math.random() * 6.28,
          v = 2 + Math.random() * 4;
        fx.push({
          k: "dot",
          x,
          y,
          vx: Math.cos(g) * v,
          vy: Math.sin(g) * v - 1,
          c: COL[a.t],
          life: 1,
        });
      }
      const pts = (t < N.length ? ((t + 1) * (t + 2)) / 2 : 100) * combo;
      add(pts, x, y);
      beep(300 + t * 60, 0.12, 0.08);
      buzz(10);
      if (t >= 7 && !RM) shake = 8;
      if (t < N.length)
        balls.push({
          x,
          y,
          vx: 0,
          vy: 0,
          t,
          r: RAD[t],
          age: 30,
          a: 0,
          s: RM ? 1 : 1.28,
          sv: 0,
        });
    }
    for (const p of bombs) if (!p.dead) boom(p);
    if (m.length || bombs.length) balls = balls.filter((b) => !b.dead);
    if (comboT > 0) comboT--;
    let danger = false;
    for (const b of balls)
      if (!b.pw && b.age > 60 && b.y - b.r < LINE && Math.abs(b.vy) < 1.5) danger = true;
    overT = danger ? overT + 1 : Math.max(0, overT - 2);
    if (danger && overT % 30 === 1) beep(500 + overT * 3, 0.07, 0.06, "square");
    const dg = overT > 0;
    if (dg !== wasD) {
      wasD = dg;
      stage.classList.toggle("danger", dg);
    }
    if (overT > 150) end();
  }
  function end() {
    over = true;
    stage.classList.remove("danger");
    stage.classList.add("dead");
    [392, 330, 262, 196].forEach((f, i) =>
      setTimeout(() => beep(f, 0.28, 0.1, "triangle"), i * 170),
    );
    setTimeout(() => beep(80, 0.5, 0.12, "sawtooth"), 700);
    buzz([80, 50, 160]);
    if (!RM) {
      shake = 16;
      flash = 1;
    }
    if (score > best) {
      best = score;
      $("best").textContent = best;
      try {
        localStorage.setItem("fm-best", best);
      } catch (e) {}
    }
    $("final").textContent =
      "Score: " + score + (score >= best && score ? "  \uD83C\uDFC6" : "");
    goT = setTimeout(
      () => {
        $("over").hidden = false;
        $("again").focus();
      },
      RM ? 0 : 900,
    );
  }
  const BUB = {};
  function highlights(g, r) {
    g.save();
    g.rotate(-0.72);
    const hg = g.createLinearGradient(0, -r * 0.8, 0, -r * 0.5);
    hg.addColorStop(0, "rgba(255,255,255,.95)");
    hg.addColorStop(1, "rgba(255,255,255,.25)");
    g.fillStyle = hg;
    g.beginPath();
    g.ellipse(0, -r * 0.66, r * 0.34, r * 0.12, 0, 0, 7);
    g.fill();
    g.restore();
    g.fillStyle = "rgba(255,255,255,.85)";
    g.beginPath();
    g.arc(-r * 0.66, -r * 0.14, Math.max(1, r * 0.06), 0, 7);
    g.fill();
    g.strokeStyle = "rgba(255,255,255,.4)";
    g.lineWidth = Math.max(1.2, r * 0.07);
    g.lineCap = "round";
    g.beginPath();
    g.arc(0, 0, r * 0.84, 0.18 * Math.PI, 0.46 * Math.PI);
    g.stroke();
  }
  function bubble(t, r) {
    if (BUB[t]) return BUB[t];
    const pw = t < 0,
      c = pw ? "#ffb300" : COL[t],
      sz = Math.ceil((r + 4) * 2),
      cvs = document.createElement("canvas");
    cvs.width = cvs.height = sz * dpr;
    const g = cvs.getContext("2d");
    g.scale(dpr, dpr);
    g.translate(sz / 2, sz / 2);
    if (pw) {
      const core = g.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
      core.addColorStop(0, "#fff7c2");
      core.addColorStop(0.45, "#ffc928");
      core.addColorStop(1, "#ff6a00");
      g.fillStyle = core;
      g.beginPath();
      g.arc(0, 0, r, 0, 7);
      g.fill();
      g.strokeStyle = "#b34700";
      g.lineWidth = 2;
      g.stroke();
      g.fillStyle = "#fff";
      g.strokeStyle = "#b34700";
      g.lineWidth = 1.4;
      g.lineJoin = "round";
      g.beginPath();
      [[0.15, -0.7], [-0.45, 0.1], [-0.05, 0.1], [-0.2, 0.75], [0.45, -0.15], [0.05, -0.15]].forEach(
        ([px, py], i) => (i ? g.lineTo(px * r, py * r) : g.moveTo(px * r, py * r)),
      );
      g.closePath();
      g.fill();
      g.stroke();
    } else {
      const body = g.createRadialGradient(0, 0, r * 0.5, 0, 0, r);
      body.addColorStop(0, c + "00");
      body.addColorStop(0.8, c + "24");
      body.addColorStop(1, c + "70");
      g.fillStyle = body;
      g.beginPath();
      g.arc(0, 0, r, 0, 7);
      g.fill();
      const rim = g.createLinearGradient(-r, -r, r, r);
      rim.addColorStop(0, "rgba(255,255,255,.95)");
      rim.addColorStop(0.4, c + "88");
      rim.addColorStop(0.72, "rgba(120,220,255,.65)");
      rim.addColorStop(1, "rgba(255,150,225,.75)");
      g.strokeStyle = rim;
      g.lineWidth = Math.max(1.6, r * 0.05);
      g.beginPath();
      g.arc(0, 0, r - 1, 0, 7);
      g.stroke();
    }
    highlights(g, r);
    return (BUB[t] = { cvs, sz });
  }
  function ball(x, y, r, t, s, a) {
    const ga = ctx.globalAlpha;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    if (t < 0) {
      const k = 1 + 0.1 * Math.sin(performance.now() / 110);
      ctx.globalAlpha = ga * 0.3;
      ctx.fillStyle = "#ffb300";
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.45 * k, 0, 7);
      ctx.fill();
      ctx.globalAlpha = ga;
    } else {
      ctx.save();
      ctx.rotate(a * 0.5);
      const z = r * 2 * FIT[t];
      ctx.drawImage(imgs[t], -z / 2, -z / 2, z, z);
      ctx.restore();
    }
    const b = bubble(t, t < 0 ? PR : RAD[t]);
    const q = (r / (t < 0 ? PR : RAD[t])) * b.sz;
    ctx.drawImage(b.cvs, -q / 2, -q / 2, q, q);
    ctx.restore();
  }
  function draw() {
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    if (shake > 0) {
      ctx.translate(
        (Math.random() - 0.5) * shake,
        (Math.random() - 0.5) * shake,
      );
      shake *= 0.82;
      if (shake < 0.3) shake = 0;
    }
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = "#e5484d";
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.35 + 0.65 * Math.min(1, overT / 60);
    ctx.beginPath();
    ctx.moveTo(L, LINE);
    ctx.lineTo(R, LINE);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    if (overT > 0 && !over) {
      const p = Math.min(1, overT / 150);
      ctx.fillStyle = "rgba(229,72,77," + (0.08 + 0.18 * p) + ")";
      ctx.fillRect(L, 0, R - L, LINE);
      ctx.fillStyle = "#e5484d";
      ctx.fillRect(L, LINE - 4, (R - L) * p, 4);
      ctx.font = 'bold 16px "Trebuchet MS",sans-serif';
      ctx.textAlign = "center";
      ctx.fillText(
        "\u26A0 DANGER " + Math.ceil((150 - overT) / 60),
        W / 2,
        LINE - 14,
      );
    }
    if (!over) {
      const r = armed ? PR : RAD[cur],
        x = clamp(aimX, L + r, R - r);
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = "#888";
      ctx.beginPath();
      ctx.moveTo(x, LINE);
      ctx.lineTo(x, F);
      ctx.stroke();
      ctx.globalAlpha = cool > 0 ? 0.45 : 1;
      ball(x, LINE - r - 6, r, armed ? -1 : cur, 1, 0);
      ctx.globalAlpha = 1;
    }
    for (const b of balls) ball(b.x, b.y, b.r, b.t, Math.max(0.1, b.s), b.a);
    for (const p of fx) {
      ctx.globalAlpha = Math.max(0, p.life);
      if (p.k === "ring") {
        ctx.strokeStyle = p.c;
        ctx.lineWidth = 5 * p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + (1 - p.life) * (p.g || 40), 0, 7);
        ctx.stroke();
        p.life -= 0.06;
      } else {
        ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3 * p.life + 1, 0, 7);
        ctx.fill();
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12;
        p.vx *= 0.97;
        p.life -= 0.035;
      }
    }
    ctx.textAlign = "center";
    ctx.font = 'bold 20px "Trebuchet MS",sans-serif';
    for (const p of pops) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#fff";
      const px = clamp(p.x, L + ctx.measureText(p.t).width / 2 + 4, R - ctx.measureText(p.t).width / 2 - 4);
      ctx.strokeText(p.t, px, p.y);
      ctx.fillStyle = "#d9480f";
      ctx.fillText(p.t, px, p.y);
      p.y -= 0.8;
      p.life -= 0.02;
    }
    if (combo > 1 && comboT > 0) {
      ctx.globalAlpha = Math.min(1, comboT / 30);
      ctx.fillStyle = "#d9480f";
      ctx.font = 'bold 18px "Trebuchet MS",sans-serif';
      ctx.fillText("Combo x" + combo, W / 2, LINE - 34);
    }
    if (flash > 0) {
      ctx.fillStyle = "rgba(255,60,60," + flash * 0.5 + ")";
      ctx.fillRect(0, 0, W, H);
      flash = Math.max(0, flash - 0.05);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    fx = fx.filter((p) => p.life > 0);
    pops = pops.filter((p) => p.life > 0);
  }
  function loop(ts) {
    acc += Math.min(50, ts - last);
    last = ts;
    while (acc >= 16.67) {
      acc -= 16.67;
      if (!over && started && !paused) {
        physics();
        if (cool > 0) cool--;
      }
    }
    draw();
    requestAnimationFrame(loop);
  }
  const pos = (e) => {
    const r = cv.getBoundingClientRect();
    aimX = ((e.clientX - r.left) * W) / r.width;
  };
  cv.addEventListener("pointerdown", (e) => {
    cv.setPointerCapture(e.pointerId);
    pos(e);
  });
  cv.addEventListener("pointermove", pos);
  cv.addEventListener("pointerup", (e) => {
    pos(e);
    drop();
  });
  addEventListener("keydown", (e) => {
    if (!started || paused) return;
    if (e.key === "ArrowLeft") aimX -= 14;
    else if (e.key === "ArrowRight") aimX += 14;
    else if (e.key === "r" || e.key === "R") reset();
    else if (e.key === "p" || e.key === "P" || e.key === "b" || e.key === "B")
      togglePower();
    else if (e.key === " " && !over) {
      e.preventDefault();
      drop();
    }
  });
  $("power").onclick = togglePower;
  $("again").onclick = reset;
  $("restart").onclick = () => {
    reset();
    beep(520, 0.08, 0.06);
  };
  const startEl = $("start"),
    appEl = $("app");
  $("play").onclick = (e) => {
    if (started) return;
    started = true;
    const r = e.currentTarget.getBoundingClientRect();
    startEl.style.setProperty("--cx", r.left + r.width / 2 + "px");
    startEl.style.setProperty("--cy", r.top + r.height / 2 + "px");
    startEl.classList.add("leaving");
    reset();
    beep(523, 0.1, 0.08);
    setTimeout(() => beep(659, 0.1, 0.08), 90);
    setTimeout(() => beep(784, 0.18, 0.08), 180);
    buzz(15);
    musicOn();
    setTimeout(() => appEl.classList.remove("pre"), RM ? 0 : 250);
    setTimeout(() => (startEl.hidden = true), RM ? 200 : 800);
  };

  const setEl = $("settings"),
    opts = { sound: $("optSound"), music: $("optMusic"), vibe: $("optVibe") };
  let lastFocus = null;
  for (const k in opts) {
    opts[k].checked = S[k];
    opts[k].onchange = () => {
      S[k] = opts[k].checked;
      saveS();
      if (k === "music") S.music ? musicOn() : musicOff();
      if (k === "vibe" && S.vibe) buzz(20);
      beep(S[k] ? 740 : 420, 0.07, 0.07);
    };
  }
  function openSettings() {
    if (!setEl.hidden) return;
    lastFocus = document.activeElement;
    paused = true;
    setEl.classList.remove("closing");
    setEl.hidden = false;
    beep(420, 0.07, 0.07);
    setTimeout(() => beep(640, 0.1, 0.07), 70);
    $("done").focus({ preventScroll: true });
  }
  function closeSettings() {
    if (setEl.hidden || setEl.classList.contains("closing")) return;
    setEl.classList.add("closing");
    beep(640, 0.06, 0.07);
    setTimeout(() => beep(420, 0.09, 0.07), 60);
    setTimeout(
      () => {
        setEl.hidden = true;
        setEl.classList.remove("closing");
        paused = false;
        if (lastFocus && lastFocus.isConnected)
          lastFocus.focus({ preventScroll: true });
      },
      RM ? 0 : 180,
    );
  }
  $("gear").onclick = $("gearStart").onclick = openSettings;
  $("done").onclick = $("closeX").onclick = closeSettings;
  setEl.addEventListener("pointerdown", (e) => {
    if (e.target === setEl) closeSettings();
  });
  addEventListener("keydown", (e) => {
    if (setEl.hidden) return;
    if (e.key === "Escape") closeSettings();
    else if (e.key === "Tab") {
      const f = [$("closeX"), opts.sound, opts.music, opts.vibe, $("done")],
        i = f.indexOf(document.activeElement),
        n = (i + (e.shiftKey ? -1 : 1) + f.length) % f.length;
      e.preventDefault();
      f[n].focus();
    }
  });
  document.addEventListener("visibilitychange", () => {
    acc = 0;
    if (!AC) return;
    document.hidden ? AC.suspend() : AC.resume();
  });
})();

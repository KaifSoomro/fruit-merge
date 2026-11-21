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
    mute = false,
    flash = 0,
    wasD = false,
    goT,
    AC,
    last = 0,
    acc = 0;
  try {
    best = +localStorage.getItem("fm-best") || 0;
  } catch (e) {}
  $("best").textContent = best;
  let loaded = 0;
  const imgs = N.map((n) => {
    const i = new Image();
    i.onload = i.onerror = () => {
      if (++loaded === N.length) {
        reset();
        requestAnimationFrame(loop);
      }
    };
    i.src = "images/" + n + ".svg";
    return i;
  });
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)),
    rnd = () => Math.floor(Math.random() * 4);
  function beep(f, d = 0.09, v = 0.07, ty = "sine") {
    if (mute) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      const o = AC.createOscillator(),
        g = AC.createGain(),
        t = AC.currentTime;
      o.type = ty;
      o.frequency.value = f;
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(g);
      g.connect(AC.destination);
      o.start();
      o.stop(t + d);
    } catch (e) {}
  }
  function buzz(n) {
    try {
      navigator.vibrate && navigator.vibrate(n);
    } catch (e) {}
  }
  function setNext() {
    $("next").src = "images/" + N[nxt] + ".svg";
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
    $("score").textContent = 0;
    setNext();
    $("over").hidden = true;
  }
  function drop() {
    if (over || cool > 0) return;
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
  function physics() {
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
    if (m.length) balls = balls.filter((b) => !b.dead);
    if (comboT > 0) comboT--;
    let danger = false;
    for (const b of balls)
      if (b.age > 60 && b.y - b.r < LINE && Math.abs(b.vy) < 1.5) danger = true;
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
  function ball(x, y, r, t, s, a) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = COL[t] + "3a";
    ctx.strokeStyle = COL[t] + "aa";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, 7);
    ctx.fill();
    ctx.stroke();
    ctx.rotate(a * 0.5);
    const z = r * 2 * 0.98;
    ctx.drawImage(imgs[t], -z / 2, -z / 2, z, z);
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
      const r = RAD[cur],
        x = clamp(aimX, L + r, R - r);
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = "#888";
      ctx.beginPath();
      ctx.moveTo(x, LINE);
      ctx.lineTo(x, F);
      ctx.stroke();
      ctx.globalAlpha = cool > 0 ? 0.45 : 1;
      ball(x, LINE - r - 6, r, cur, 1, 0);
      ctx.globalAlpha = 1;
    }
    for (const b of balls) ball(b.x, b.y, b.r, b.t, Math.max(0.1, b.s), b.a);
    for (const p of fx) {
      ctx.globalAlpha = Math.max(0, p.life);
      if (p.k === "ring") {
        ctx.strokeStyle = p.c;
        ctx.lineWidth = 5 * p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + (1 - p.life) * 40, 0, 7);
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
      ctx.strokeText(p.t, p.x, p.y);
      ctx.fillStyle = "#d9480f";
      ctx.fillText(p.t, p.x, p.y);
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
      if (!over) {
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
    if (e.key === "ArrowLeft") aimX -= 14;
    else if (e.key === "ArrowRight") aimX += 14;
    else if (e.key === "r" || e.key === "R") reset();
    else if (e.key === " " && !over) {
      e.preventDefault();
      drop();
    }
  });
  $("again").onclick = reset;
  $("restart").onclick = () => {
    reset();
    beep(520, 0.08, 0.06);
  };
  $("mute").onclick = (e) => {
    mute = !mute;
    e.currentTarget.textContent = mute ? "🔇" : "🔊";
    e.currentTarget.setAttribute("aria-pressed", mute);
  };
  document.addEventListener("visibilitychange", () => {
    acc = 0;
  });
})();

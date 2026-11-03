// neural gas clock. this clock learns something new every second.
// originally processing.js (2014). processing.js died, so: plain js (2026).
// usage: <canvas id="clock"></canvas><script src="/clock.js"></script>

(function () {
  var cv = document.getElementById("clock");
  if (!cv) return;
  var W = 820, H = 250, N = 100, T_MAX = 500, NB = 10;
  var dpr = window.devicePixelRatio || 1;
  cv.width = W * dpr; cv.height = H * dpr;
  var g = cv.getContext("2d");
  g.scale(dpr, dpr);
  var ink = cv.dataset.ink || "#0b0b0b";

  function halton(i, b) {
    var r = 0, f = 1 / b;
    while (i > 0) { r += f * (i % b); i = Math.floor(i / b); f /= b; }
    return r;
  }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  // seven segments, as line segments a point can land on
  var SEG = {
    0: [1,2,4,5,6,7], 1: [4,7], 2: [1,3,4,5,6], 3: [1,3,4,6,7], 4: [2,3,4,7],
    5: [1,2,3,6,7], 6: [1,2,3,5,6,7], 7: [1,4,7], 8: [1,2,3,4,5,6,7], 9: [1,2,3,4,6,7]
  };
  function sample(x, y, d, s) {
    var c = SEG[d][Math.floor(Math.random() * SEG[d].length)];
    switch (c) {
      case 1: return [rnd(x, x + s), y];
      case 2: return [x, rnd(y, y + s)];
      case 3: return [rnd(x, x + s), y + s];
      case 4: return [x + s, rnd(y, y + s)];
      case 5: return [x, rnd(y + s, y + 2 * s)];
      case 6: return [rnd(x, x + s), y + 2 * s];
      case 7: return [x + s, rnd(y + s, y + 2 * s)];
    }
  }

  var gas = [];
  for (var j = 0; j < 6; j++) {
    gas[j] = [];
    for (var i = 0; i < N; i++)
      gas[j].push({ x: halton(i, 2) * (W / 6) + j * (W / 6), y: halton(i, 3) * H, k: i, t: 1, time: 1 });
  }
  function reset(j) { gas[j].forEach(function (v) { v.t = 1; v.time = 1; }); }

  var last = { h: -1, m: -1, s: -1 };
  function tick() {
    var now = new Date(), h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
    // whenever a digit changes, its gas forgets everything and learns the new one
    if (h !== last.h) { if (Math.floor(h / 10) !== Math.floor(last.h / 10)) reset(0); reset(1); }
    if (m !== last.m) { if (Math.floor(m / 10) !== Math.floor(last.m / 10)) reset(2); reset(3); }
    if (s !== last.s) { if (Math.floor(s / 10) !== Math.floor(last.s / 10)) reset(4); reset(5); }
    last = { h: h, m: m, s: s };

    var digits = [Math.floor(h / 10), h % 10, Math.floor(m / 10), m % 10, Math.floor(s / 10), s % 10];
    var shift = [0, 0, 50, 50, 100, 100];

    g.clearRect(0, 0, W, H);
    g.fillStyle = ink;
    for (var j = 0; j < 6; j++) {
      var p = sample(20 + j * 120 + shift[j], 30, digits[j], 80);
      var cb = gas[j];
      cb.sort(function (a, b) {
        return (a.x - p[0]) * (a.x - p[0]) + (a.y - p[1]) * (a.y - p[1])
             - (b.x - p[0]) * (b.x - p[0]) - (b.y - p[1]) * (b.y - p[1]);
      });
      for (var i = 0; i < N; i++) {
        var v = cb[i];
        var eta = 1 - v.t / T_MAX;
        var lam = Math.max(NB - NB * v.t / T_MAX, 1e-3);  // the 2014 version divided by zero eventually. oops
        var l = eta * Math.exp(-i / lam);
        v.x += l * (p[0] - v.x);
        v.y += l * (p[1] - v.y);
        v.t = T_MAX * (1 - Math.exp(-0.012 * (++v.time)));
        g.fillRect(v.x - 0.8, v.y - 0.8, 1.6, 1.6);
      }
    }
    requestAnimationFrame(tick);
  }
  tick();
})();

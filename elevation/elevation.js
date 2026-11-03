// elevation | frequency, 2016 -> 2026.
// click on the map, every new segment gets sampled (100 points, open-meteo),
// and the terrain is piped straight into an oscillator. metres become hertz.
// nothing is normalised. hills are low notes. the alps scream.

(function () {
  var urach = [48.496403, 9.394493];   // urach/tuebingen is "huegelig"
  var map = L.map("map").setView(urach, 10);
  L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
    maxZoom: 15, attribution: "&copy; OpenStreetMap, SRTM &middot; OpenTopoMap (CC-BY-SA)"
  }).addTo(map);

  var pts = [], voices = [], ac = null;
  var cv = document.getElementById("profile"), g = cv.getContext("2d");

  function draw(el) {
    var lo = Math.min.apply(null, el), hi = Math.max.apply(null, el) + 1;
    g.clearRect(0, 0, cv.width, cv.height);
    g.fillStyle = "#0b0b0b";
    var w = cv.width / el.length;
    el.forEach(function (e, i) {
      var h = 8 + (e - lo) / (hi - lo) * (cv.height - 16);
      g.fillRect(i * w, cv.height - h, Math.max(w - 1, 1), h);
    });
    g.font = "11px Courier New"; g.fillStyle = "#d40000";
    g.fillText(Math.round(lo) + "m ... " + Math.round(hi) + "m", 4, 12);
  }

  function play(el) {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    var osc = ac.createOscillator(), amp = ac.createGain();
    amp.gain.value = 0.08;
    osc.connect(amp).connect(ac.destination);
    osc.start();
    var notes = el.filter(function (_, i) { return i % 4 === 0; }), n = 0;
    // same as 2016: loop through the terrain forever, 50ms per step
    var iv = setInterval(function () {
      osc.frequency.setValueAtTime(Math.floor(notes[n++ % notes.length]) % 8800 + 40, ac.currentTime);
    }, 50);
    voices.push({ osc: osc, iv: iv });
  }

  map.on("click", function (e) {
    pts.push(e.latlng);
    L.circleMarker(e.latlng, { radius: 4, color: "#d40000", weight: 2 }).addTo(map);
    if (pts.length < 2) return;
    var a = pts[pts.length - 2], b = pts[pts.length - 1], la = [], lo = [], line = [];
    for (var i = 0; i < 100; i++) {
      var t = i / 99;
      la.push((a.lat + (b.lat - a.lat) * t).toFixed(5));
      lo.push((a.lng + (b.lng - a.lng) * t).toFixed(5));
      line.push([+la[i], +lo[i]]);
    }
    fetch("https://api.open-meteo.com/v1/elevation?latitude=" + la.join(",") + "&longitude=" + lo.join(","))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d.elevation) throw new Error(d.reason || "no elevation");
        L.polyline(line, { color: "#0b0b0b", weight: 2, opacity: 0.6 }).addTo(map);
        draw(d.elevation);
        play(d.elevation);
      })
      .catch(function (err) { alert("elevation service failed: " + err.message); });
  });

  document.getElementById("stop").onclick = function (e) {
    e.preventDefault();
    voices.forEach(function (v) { clearInterval(v.iv); v.osc.stop(); });
    voices = [];
  };
})();

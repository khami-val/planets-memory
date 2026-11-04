(function () {
  "use strict";

  var D = window.ECO;
  var SRC_KEYS = Object.keys(D.sources);
  var SCALE = { min: -50, max: 400 };          // шкала смуг CO2e, кг на одне прощання
  var FIELD_M2 = 105 * 68;                      // футбольне поле за рекомендацією FIFA, м²
  var NS = "http://www.w3.org/2000/svg";
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var state = { id: "traditional", count: 1, years: 25 };

  var $ = function (id) { return document.getElementById(id); };
  var nf = function (v, d) { return v.toLocaleString("uk-UA", { maximumFractionDigits: d == null ? 0 : d }); };
  var byId = function (id) { return D.scenarios.filter(function (s) { return s.id === id; })[0]; };
  var pct = function (v) { return ((v - SCALE.min) / (SCALE.max - SCALE.min)) * 100; };
  var growth = function () { return 0.45 + 0.55 * (state.years - 10) / 40; };

  function cite(src) {
    if (!src) return "";
    var list = Array.isArray(src) ? src : [src];
    return " <span class=\"cite\">" + list.map(function (k) {
      return "<a href=\"#src-" + k + "\">[" + (SRC_KEYS.indexOf(k) + 1) + "]</a>";
    }).join(" ") + "</span>";
  }
  var tagA = " <span class=\"tag\">припущення</span>";

  /* ---------- URL state ---------- */
  function readUrl() {
    try {
      var p = new URLSearchParams(location.search);
      if (p.get("s") && byId(p.get("s"))) state.id = p.get("s");
      var n = +p.get("n"); if ([1, 100, 1000, 10000].indexOf(n) > -1) state.count = n;
      var y = +p.get("y"); if (y >= 10 && y <= 50 && y % 5 === 0) state.years = y;
    } catch (e) {}
  }
  function shareUrl(withState) {
    var base = location.origin + location.pathname;
    if (!withState) return base;
    return base + "?s=" + state.id + "&n=" + state.count + "&y=" + state.years + "#calc";
  }

  /* ---------- Header ---------- */
  function initHeader() {
    var menu = $("menu-toggle"), nav = $("site-nav");
    menu.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      menu.setAttribute("aria-expanded", open);
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") { nav.classList.remove("open"); menu.setAttribute("aria-expanded", "false"); }
    });
    $("theme-toggle").addEventListener("click", function () {
      var root = document.documentElement;
      var dark = root.dataset.theme ? root.dataset.theme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.dataset.theme = dark ? "light" : "dark";
      try { localStorage.setItem("theme", root.dataset.theme); } catch (e) {}
    });
  }

  /* ---------- Hero animation ---------- */
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function rng(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  var GREENS = ["#8fa98f", "#7f9a83", "#9db59a", "#6f8b73", "#a9bfa3"];
  var SPRITE = "/img/sprite.svg#fe-";
  // Іконка зі спрайта: x, y = центр нижнього краю
  function icon(parent, name, x, y, size, cls) {
    var u = el("use", { href: SPRITE + name, x: x - size / 2, y: y - size, width: size, height: size }, parent);
    if (cls) u.setAttribute("class", cls);
    return u;
  }

  function initHero() {
    var svg = $("hero-svg"), rand = rng(7);
    var defs = el("defs", {}, svg);
    var gr = el("linearGradient", { id: "hg", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el("stop", { offset: "0", "stop-color": "#2f5540" }, gr);
    el("stop", { offset: "1", "stop-color": "#203a2c" }, gr);
    icon(el("g", { "class": "h-sun" }, svg), "sun", 330, 86, 54);
    el("ellipse", { cx: 200, cy: 236, rx: 196, ry: 84, fill: "url(#hg)" }, svg);
    el("ellipse", { cx: 200, cy: 236, rx: 196, ry: 84, fill: "none", stroke: "rgba(201,163,90,.25)", "stroke-dasharray": "2 6" }, svg);
    var pts = [];
    for (var r = 0; r < 3; r++) for (var c = 0; c < 5; c++) pts.push([84 + c * 58 - r * 12 + (r % 2) * 8, 196 + r * 36]);
    var slabs = el("g", {}, svg);
    pts.forEach(function (p, i) {
      var s = el("g", { "class": "h-slab", style: "animation-delay:" + (0.6 + i * 0.07).toFixed(2) + "s" }, slabs);
      el("rect", { x: p[0] - 18, y: p[1] - 4, width: 36, height: 12, rx: 2, fill: "#8b908a" }, s);
      icon(s, "headstone", p[0], p[1] + 2, 30);
    });
    var trees = el("g", {}, svg);
    pts.forEach(function (p, i) {
      var g = el("g", { "class": "h-tree", style: "animation-delay:" + (1.7 + i * 0.09).toFixed(2) + "s" }, trees);
      var kind = i % 3 === 1 ? "evergreen-tree" : "deciduous-tree";
      icon(el("g", { "class": "crown", style: "animation-delay:" + (-rand() * 6).toFixed(2) + "s" }, g), kind, p[0] + (rand() - 0.5) * 8, p[1] + 8, 40 + rand() * 18);
    });
    var flowers = ["blossom", "tulip", "herb", "sunflower", "seedling"];
    for (var f = 0; f < 14; f++) {
      var fx = 40 + rand() * 320, fy = 170 + rand() * 140;
      if (Math.pow((fx - 200) / 186, 2) + Math.pow((fy - 236) / 76, 2) > 1) continue;
      icon(el("g", { "class": "h-tree", style: "animation-delay:" + (3 + f * 0.12).toFixed(2) + "s" }, svg), flowers[f % 5], fx, fy, 14 + rand() * 6);
    }
    icon(el("g", { "class": "h-fly h-fly-a" }, svg), "butterfly", 120, 130, 22);
    icon(el("g", { "class": "h-fly h-fly-b" }, svg), "butterfly", 270, 150, 18);
    for (var m = 0; m < 12; m++) {
      el("circle", { "class": "h-mote", cx: 60 + rand() * 280, cy: 140 + rand() * 120, r: 1 + rand() * 1.4, fill: "#E9CF96", style: "animation-delay:" + (3 + rand() * 9).toFixed(2) + "s" }, svg);
    }
  }

  /* ---------- Controls ---------- */
  function buildOptions() {
    var box = $("scenario-options");
    box.innerHTML = D.scenarios.map(function (s) {
      return "<label class=\"opt\"><input type=\"radio\" name=\"scenario\" value=\"" + s.id + "\"" + (s.id === state.id ? " checked" : "") + ">" +
        "<span class=\"chip\"><svg class=\"opt-ic\" aria-hidden=\"true\"><use href=\"" + SPRITE + s.icon + "\"/></svg><span class=\"txt\"><span class=\"short\">" + s.chip + "</span><span class=\"full\">" + s.name + "</span><span class=\"tagline\">" + s.tagline + "</span></span></span></label>";
    }).join("");
    box.addEventListener("change", function (e) {
      if (e.target.name === "scenario") { state.id = e.target.value; render(); }
    });
    var checked = box.querySelector("input:checked");
    if (checked && checked.parentNode.scrollIntoView && state.id !== "traditional") {
      box.scrollLeft = checked.parentNode.offsetLeft - 16;
    }

    var seg = $("scale");
    function syncScale() {
      Array.prototype.forEach.call(seg.querySelectorAll("button"), function (b) {
        b.setAttribute("aria-checked", +b.dataset.n === state.count);
        b.tabIndex = +b.dataset.n === state.count ? 0 : -1;
      });
    }
    seg.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      state.count = +b.dataset.n; syncScale(); render(true);
    });
    seg.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      var bs = Array.prototype.slice.call(seg.querySelectorAll("button"));
      var i = bs.findIndex(function (b) { return +b.dataset.n === state.count; });
      i = (i + (e.key === "ArrowRight" ? 1 : bs.length - 1)) % bs.length;
      state.count = +bs[i].dataset.n; syncScale(); bs[i].focus(); render(true);
    });
    syncScale();

    var years = $("years");
    years.value = state.years; $("years-out").textContent = state.years;
    years.addEventListener("input", function (e) {
      state.years = +e.target.value;
      $("years-out").textContent = state.years;
      $("sim").style.setProperty("--g", growth());
      render(true);
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-intent]"), function (b) {
      b.addEventListener("click", function () {
        var plan = b.dataset.intent === "plan";
        Array.prototype.forEach.call(document.querySelectorAll("[data-intent]"), function (x) {
          x.classList.toggle("is-on", x === b); x.setAttribute("aria-pressed", x === b);
        });
        $("intent-note").hidden = !plan;
        document.querySelector(".scale-field").hidden = plan;
        if (plan) { state.count = 1; syncScale(); render(true); }
      });
    });

    $("co2e-tip").previousElementSibling.querySelector(".term").addEventListener("click", function () {
      var tip = $("co2e-tip"); tip.hidden = !tip.hidden; this.setAttribute("aria-expanded", !tip.hidden);
    });
  }

  /* ---------- Results ---------- */
  var shown = { min: 0, max: 0 };
  function fmtMass(a, b) {
    var big = Math.max(Math.abs(a), Math.abs(b)) >= 10000, k = big ? 1000 : 1;
    var d = big && Math.max(Math.abs(a), Math.abs(b)) < 100000 ? 1 : 0;
    var x = nf(a / k, d), y = nf(b / k, d);
    return { text: x === y ? x : x + " – " + y, unit: big ? "т" : "кг" };
  }
  function tweenCo2(toMin, toMax) {
    var fromMin = shown.min, fromMax = shown.max, t0 = performance.now(), dur = reduceMotion ? 0 : 550;
    function step(t) {
      var k = dur ? Math.min(1, (t - t0) / dur) : 1, e = 1 - Math.pow(1 - k, 3);
      var a = Math.round(fromMin + (toMin - fromMin) * e), b = Math.round(fromMax + (toMax - fromMax) * e);
      var m = fmtMass(a, b);
      $("co2-range").textContent = m.text; $("co2-unit").textContent = m.unit;
      if (k < 1) requestAnimationFrame(step); else { shown.min = toMin; shown.max = toMax; }
    }
    requestAnimationFrame(step);
  }
  function fmtRange(min, max, unit) {
    var d = max < 1 ? 2 : max < 10 ? 1 : 0;
    return (min === max ? nf(min, d) : nf(min, d) + "–" + nf(max, d)) + " " + unit;
  }

  function renderResults(s) {
    var n = state.count;
    tweenCo2(s.co2.min * n, s.co2.max * n);
    var bar = $("co2-bar");
    bar.style.left = pct(s.co2.min) + "%";
    bar.style.width = (pct(s.co2.max) - pct(s.co2.min)) + "%";
    $("co2-basis").innerHTML = s.co2Basis.map(function (b) {
      return "<li>" + b.text + (b.assumption ? tagA : "") + cite(b.src) + "</li>";
    }).join("");

    $("res-list").innerHTML = s.resources.map(function (r) {
      var v;
      if (r.text) v = "<small>" + r.text + "</small>";
      else if (r.max === 0) v = "0 " + r.unit;
      else v = fmtRange(r.min * n, r.max * n, r.unit);
      return "<li><span>" + r.label + (r.assumption ? tagA : "") + cite(r.src) + "</span><span class=\"v\">" + v + "</span></li>";
    }).join("");

    var area = s.land.m2 * n;
    $("land-m2").textContent = nf(area, area < 10 ? 1 : 0);
    var label = { sealed: "Запечатана поверхня", living: "Живий ґрунт", none: "Земля лишається вільною" }[s.land.state];
    $("land-state").innerHTML = "<span class=\"dot " + s.land.state + "\"></span><span><strong>" + label + ".</strong> " + s.land.note + "</span>";
    var fields = area / FIELD_M2;
    var fieldTxt = fields >= 0.1 ? " Це ≈ " + nf(fields, fields < 10 ? 1 : 0) + " футбольного поля (105 × 68 м)." : "";
    $("land-years").textContent = s.land.state === "none"
      ? "Через " + state.years + " років ділянка під поховання не потрібна."
      : (s.land.state === "sealed"
        ? "Через " + state.years + " років ця площа досі виведена з екосистеми." + fieldTxt
        : "Через " + state.years + " років ця площа є частиною лугу чи лісу." + fieldTxt);

    $("ss-name").textContent = s.chip;
    $("ss-co2").textContent = fmtMass(s.co2.min * n, s.co2.max * n).text + " " + fmtMass(s.co2.min * n, s.co2.max * n).unit;
  }

  /* ---------- Compare chart ---------- */
  function buildCompare() {
    var box = $("compare-chart");
    var rows = D.scenarios.map(function (s) {
      var mid = (s.co2.min + s.co2.max) / 2;
      return "<button type=\"button\" class=\"crow\" data-id=\"" + s.id + "\" aria-label=\"" + s.name + ": від " + s.co2.min + " до " + s.co2.max + " кг CO2e\">" +
        "<span class=\"cname\">" + s.name + "</span>" +
        "<span class=\"ctrack\"><span class=\"zero\" style=\"left:" + pct(0) + "%\"></span>" +
        "<span class=\"band\" style=\"left:" + pct(s.co2.min) + "%;width:" + (pct(s.co2.max) - pct(s.co2.min)) + "%\"></span>" +
        "<span class=\"mid\" style=\"left:" + pct(mid) + "%\"></span></span>" +
        "<span class=\"cval\">" + nf(s.co2.min) + "…" + nf(s.co2.max) + " кг</span></button>";
    }).join("");
    var ticks = [0, 100, 200, 300, 400].map(function (t) { return "<span style=\"left:" + pct(t) + "%\">" + t + "</span>"; }).join("");
    box.innerHTML = rows + "<div class=\"caxis\" aria-hidden=\"true\">" + ticks + "</div>";
    box.addEventListener("click", function (e) {
      var row = e.target.closest(".crow"); if (!row) return;
      state.id = row.dataset.id;
      document.querySelector("input[value=\"" + state.id + "\"]").checked = true;
      render();
      $("calc").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    });
  }
  function renderCompare() {
    Array.prototype.forEach.call(document.querySelectorAll(".crow"), function (r) {
      r.classList.toggle("active", r.dataset.id === state.id);
      r.setAttribute("aria-pressed", r.dataset.id === state.id);
    });
  }

  /* ---------- Simulator ---------- */
  function tree(g, x, y, r, rand, kind) {
    var t = el("g", { "class": "tree" }, g);
    icon(t, kind || (rand() < 0.3 ? "evergreen-tree" : "deciduous-tree"), x, y + r * 1.1, r * 2.8);
    return t;
  }
  function plant(g, name, x, y, size) { var t = el("g", { "class": "tree" }, g); icon(t, name, x, y, size); return t; }
  function grass(g, rand, n, color) {
    for (var i = 0; i < n; i++) {
      var x = rand() * 360, y = 30 + rand() * 190;
      el("path", { d: "M" + x + " " + y + "l-2 -5M" + x + " " + y + "l0 -6M" + x + " " + y + "l2 -5", stroke: color, "stroke-width": 1, fill: "none", "stroke-linecap": "round" }, g);
    }
  }
  function flowers(g, rand, n) {
    var c = ["#e8e2c8", "#d9c7d6", "#efe6b5", "#ffffff"];
    for (var i = 0; i < n; i++) el("circle", { cx: rand() * 360, cy: 30 + rand() * 190, r: 1.6, fill: c[i % 4] }, g);
  }
  function bg(g, color) { el("rect", { x: 0, y: 0, width: 360, height: 220, fill: color }, g); }

  var SIMS = {
    grid: { text: "Ділянки запечатані бетоном і каменем. Ґрунт під ними не бере участі в кругообігу речовин.", draw: function (g) {
      bg(g, "#dcddd8");
      for (var r = 0; r < 4; r++) for (var c = 0; c < 7; c++) {
        var x = 14 + c * 48, y = 16 + r * 50, s = el("g", { "class": "slab" }, g);
        el("rect", { x: x, y: y + 12, width: 38, height: 30, fill: "#c3c6c0", stroke: "#a9aca6", "stroke-width": 1, rx: 1 }, s);
        icon(s, "headstone", x + 19, y + 18, 24);
      }
    } },
    columbarium: { text: "Прах займає компактну нішу. Решта ділянки може лишатися газоном.", draw: function (g, rand) {
      bg(g, "#e1e8dc"); grass(g, rand, 60, "#a9bfa3");
      var w = el("g", { "class": "slab" }, g);
      el("rect", { x: 20, y: 30, width: 120, height: 165, fill: "#b8bbb5", rx: 4 }, w);
      for (var r = 0; r < 7; r++) for (var c = 0; c < 5; c++) el("rect", { x: 28 + c * 22, y: 38 + r * 22, width: 18, height: 18, fill: "#9ea29c", rx: 1 }, w);
      el("path", { d: "M160 220 C 200 160, 260 150, 360 120", stroke: "#d6d3c8", "stroke-width": 10, fill: "none" }, g);
      tree(g, 230, 70, 16, rand); tree(g, 310, 170, 14, rand); tree(g, 185, 190, 10, rand);
    } },
    meadow: { text: "Без бетону й надгробків ділянка лишається лугом, а позначки стоять урівень із землею.", draw: function (g, rand) {
      bg(g, "#d7e3cd"); grass(g, rand, 220, "#9cb594"); flowers(g, rand, 70);
      for (var i = 0; i < 12; i++) el("ellipse", { cx: 30 + (i % 6) * 55 + rand() * 10, cy: 60 + Math.floor(i / 6) * 90 + rand() * 20, rx: 5, ry: 2.5, fill: "#c9c8bd" }, g);
      var fl = ["blossom", "tulip", "sunflower", "herb"];
      for (var k = 0; k < 16; k++) plant(g, fl[k % 4], 16 + rand() * 328, 40 + rand() * 175, 12 + rand() * 6);
      tree(g, 70, 120, 15, rand); tree(g, 200, 70, 13, rand); tree(g, 300, 150, 16, rand); tree(g, 140, 200, 11, rand);
      icon(g, "butterfly", 250, 60, 16, "sim-fly");
    } },
    park: { text: "Кістковий мінерал повертають родині. Землю під поховання не відводять, простір лишається парком.", draw: function (g, rand) {
      bg(g, "#dde7d6"); grass(g, rand, 120, "#a9bfa3");
      el("path", { d: "M0 160 C 90 120, 160 200, 360 110", stroke: "#e2ddcf", "stroke-width": 14, fill: "none" }, g);
      el("circle", { cx: 250, cy: 60, r: 22, fill: "#cfdfe0" }, g); el("circle", { cx: 250, cy: 60, r: 14, fill: "#dfeaea" }, g);
      tree(g, 60, 70, 18, rand); tree(g, 140, 100, 12, rand); tree(g, 320, 190, 16, rand); tree(g, 110, 200, 12, rand);
      plant(g, "blossom", 200, 150, 14); plant(g, "tulip", 220, 160, 14); icon(g, "dove", 290, 40, 22, "sim-fly");
    } },
    garden: { text: "З одного тіла утворюється ≈0,76 м³ ґрунту. Він повертається в сад або в лісовідновлення.", draw: function (g, rand) {
      bg(g, "#dfe6d6");
      for (var r = 0; r < 4; r++) {
        var y = 22 + r * 50;
        el("rect", { x: 16, y: y, width: 328, height: 30, fill: "#c4ad92", rx: 12 }, g);
        for (var i = 0; i < 18; i++) {
          var x = 26 + i * 18 + rand() * 4;
          plant(g, (i + r) % 7 === 3 ? "mushroom" : (i % 3 ? "seedling" : "herb"), x, y + 26, 14 + rand() * 6);
        }
      }
    } },
    forest: { text: "Кожна біо-урна стає основою для дерева, а кладовище перетворюється на ліс пам'яті.", draw: function (g, rand) {
      bg(g, "#cfdcc8"); grass(g, rand, 120, "#93ad8c");
      for (var r = 0; r < 4; r++) for (var c = 0; c < 6; c++) {
        var x = 30 + c * 60 + (r % 2) * 25 + rand() * 10, y = 40 + r * 50 + rand() * 8;
        tree(g, x, y, 13 + rand() * 9, rand);
        plant(g, "seedling", x + 12, y + 20, 9);
      }
    } }
  };

  var current = null;
  function renderSim(s) {
    var svg = $("sim"), def = SIMS[s.sim];
    $("sim-name").textContent = s.name;
    $("sim-text").textContent = def.text;
    $("sim-desc").textContent = s.name + ". " + def.text;
    svg.style.setProperty("--g", growth());
    if (current && current.dataset.mode === s.sim) return;
    var g = el("g", { "class": "layer entering" }, svg);
    g.dataset.mode = s.sim;
    def.draw(g, rng(42));
    var old = current; current = g;
    void g.getBoundingClientRect();
    requestAnimationFrame(function () { requestAnimationFrame(function () { g.classList.remove("entering"); }); });
    if (old) { old.classList.add("leaving"); setTimeout(function () { old.remove(); }, reduceMotion ? 0 : 800); }
  }

  /* ---------- Share ---------- */
  function toast(msg) {
    var t = $("toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(function () { t.hidden = true; }, 2600);
  }
  function share(withState) {
    var s = byId(state.id), url = shareUrl(withState);
    var m = fmtMass(s.co2.min * state.count, s.co2.max * state.count);
    var text = withState
      ? s.name + ": " + m.text + " " + m.unit + " CO₂e. Порівняйте способи прощання на «ЕкоСлід Пам'яті»."
      : "Який слід лишає прощання? Калькулятор CO₂ різних способів поховання з джерелами.";
    if (navigator.share) {
      navigator.share({ title: "ЕкоСлід Пам'яті", text: text, url: url }).catch(function () {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text + " " + url).then(function () { toast("Посилання скопійовано"); }, function () { toast(url); });
    } else { toast(url); }
  }
  function initShare() {
    $("share-btn").addEventListener("click", function () { share(true); });
    Array.prototype.forEach.call(document.querySelectorAll("[data-share]"), function (b) {
      b.addEventListener("click", function () { share(false); });
    });
  }

  /* ---------- Sticky summary + reveal ---------- */
  function initObservers() {
    if (!("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(document.querySelectorAll(".reveal"), function (n) { n.classList.add("in"); });
      return;
    }
    var sum = $("sticky-sum"), inCalc = false, co2Seen = false;
    function upd() { sum.hidden = false; sum.classList.toggle("hide", !(inCalc && !co2Seen)); }
    new IntersectionObserver(function (es) { es.forEach(function (e) { inCalc = e.isIntersecting; }); upd(); }, { threshold: 0 }).observe($("calc"));
    new IntersectionObserver(function (es) { es.forEach(function (e) { co2Seen = e.isIntersecting; }); upd(); }, { threshold: 0.3 }).observe(document.querySelector(".result.co2"));

    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("in"); io.unobserve(e.target);
        var st = e.target.querySelector(".stat[data-count]");
        if (st && !reduceMotion) countUp(st);
      });
    }, { threshold: 0.2 });
    Array.prototype.forEach.call(document.querySelectorAll(".reveal"), function (n) { io.observe(n); });
  }
  function countUp(node) {
    var to = +node.dataset.count, dec = +node.dataset.dec, t0 = performance.now();
    function step(t) {
      var k = Math.min(1, (t - t0) / 1200), e = 1 - Math.pow(1 - k, 3);
      node.textContent = nf(to * e, dec);
      if (k < 1) requestAnimationFrame(step); else node.textContent = nf(to, dec);
    }
    requestAnimationFrame(step);
  }

  /* ---------- Quiz ---------- */
  function initQuiz() {
    var box = $("quiz-box"), Q = D.quiz, i = 0, score = 0;
    function srcLinks(src) {
      return (Array.isArray(src) ? src : [src]).map(function (k) {
        return "<a href=\"" + D.sources[k].url + "\" target=\"_blank\" rel=\"noopener\">" + D.sources[k].short + "</a>";
      }).join(", ");
    }
    function progress() {
      return "<div class=\"q-progress\" aria-hidden=\"true\">" + Q.map(function (_, k) {
        return "<span class=\"" + (k < i ? "done" : k === i ? "now" : "") + "\"></span>";
      }).join("") + "</div>";
    }
    function show() {
      if (i >= Q.length) {
        box.innerHTML = progress() + "<div class=\"q-score\"><p class=\"big\">" + score + " / " + Q.length + "</p>" +
          "<p>" + (score >= 6 ? "Ви добре орієнтуєтесь у темі." : score >= 4 ? "Непогано. Кілька фактів, імовірно, стали новими." : "Тема повна міфів, і ви щойно розвінчали кілька з них.") + "</p>" +
          "<div class=\"q-actions\"><button type=\"button\" id=\"q-again\">Ще раз</button><button type=\"button\" id=\"q-share\">Поділитися</button></div></div>";
        $("q-again").onclick = function () { i = 0; score = 0; show(); };
        $("q-share").onclick = function () { share(false); };
        return;
      }
      var q = Q[i];
      box.innerHTML = progress() + "<p class=\"small muted\">Твердження " + (i + 1) + " з " + Q.length + "</p>" +
        "<p class=\"q-text\">" + q.q + "</p>" +
        "<div class=\"q-actions\"><button type=\"button\" data-a=\"1\">Правда</button><button type=\"button\" data-a=\"0\">Міф</button></div><div id=\"q-after\"></div>";
      Array.prototype.forEach.call(box.querySelectorAll("[data-a]"), function (b) {
        b.onclick = function () {
          var said = b.dataset.a === "1", ok = said === q.a;
          if (ok) score++;
          Array.prototype.forEach.call(box.querySelectorAll("[data-a]"), function (x) {
            x.disabled = true; x.classList.add((x.dataset.a === "1") === q.a ? "right" : "wrong");
          });
          $("q-after").innerHTML = "<div class=\"q-why\"><span class=\"verdict\"><svg class=\"q-ic\" aria-hidden=\"true\"><use href=\"/img/sprite.svg#ph-" + (ok ? "check-bold" : "x-bold") + "\"/></svg>" + (ok ? "Так! " : "Насправді ні. ") + (q.a ? "Це правда." : "Це міф.") + "</span>" +
            q.why + " <span class=\"small muted\">Джерело: " + srcLinks(q.src) + ".</span></div>" +
            "<button type=\"button\" class=\"btn btn-primary q-next\" id=\"q-next\">" + (i + 1 < Q.length ? "Далі" : "Результат") + "</button>";
          $("q-next").focus();
          $("q-next").onclick = function () { i++; show(); box.focus && box.querySelector(".q-text, .q-score") && box.querySelector(".q-text, .q-score").scrollIntoView({ block: "nearest" }); };
        };
      });
    }
    show();
  }

  function render(quantityOnly) {
    var s = byId(state.id);
    renderResults(s);
    if (!quantityOnly) { renderSim(s); renderCompare(); }
    else { $("sim").style.setProperty("--g", growth()); }
  }

  readUrl();
  initHeader();
  initHero();
  buildOptions();
  buildCompare();
  initShare();
  initObservers();
  initQuiz();
  render();
})();

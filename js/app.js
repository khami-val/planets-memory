(function () {
  "use strict";

  var D = window.ECO;
  var SRC_KEYS = Object.keys(D.sources);
  var COUNTS = [1, 10, 100, 1000, 10000];
  var SCALE = { min: -50, max: 400 }; // шкала смуг CO2e, кг на одне прощання
  var NS = "http://www.w3.org/2000/svg";

  var state = { id: "traditional", count: 1, years: 25 };

  var $ = function (id) { return document.getElementById(id); };
  var nf = function (v, d) {
    return v.toLocaleString("uk-UA", { maximumFractionDigits: d == null ? 0 : d, minimumFractionDigits: 0 });
  };
  var byId = function (id) { return D.scenarios.filter(function (s) { return s.id === id; })[0]; };
  var pct = function (v) { return ((v - SCALE.min) / (SCALE.max - SCALE.min)) * 100; };

  function cite(src) {
    if (!src) return "";
    var list = Array.isArray(src) ? src : [src];
    return " <span class=\"cite\">" + list.map(function (k) {
      return "<a href=\"#src-" + k + "\">[" + (SRC_KEYS.indexOf(k) + 1) + "]</a>";
    }).join(" ") + "</span>";
  }
  var tagA = " <span class=\"tag\">припущення</span>";

  function fmtMass(kgMin, kgMax) {
    var big = Math.max(Math.abs(kgMin), Math.abs(kgMax)) >= 10000;
    var k = big ? 1000 : 1;
    var d = big && Math.max(Math.abs(kgMin), Math.abs(kgMax)) < 100000 ? 1 : 0;
    var a = nf(kgMin / k, d), b = nf(kgMax / k, d);
    return { text: kgMin === kgMax ? a : a + " – " + b, unit: big ? "т" : "кг" };
  }

  function fmtRange(min, max, unit) {
    var d = max < 1 ? 2 : max < 10 ? 1 : 0;
    var t = min === max ? nf(min, d) : nf(min, d) + "–" + nf(max, d);
    return t + " " + unit;
  }

  /* ---------- Controls ---------- */
  function buildOptions() {
    var box = $("scenario-options");
    box.innerHTML = D.scenarios.map(function (s) {
      return "<label class=\"opt\"><input type=\"radio\" name=\"scenario\" value=\"" + s.id + "\"" +
        (s.id === state.id ? " checked" : "") + "><strong>" + s.name + "</strong><span>" + s.tagline + "</span></label>";
    }).join("");
    box.addEventListener("change", function (e) {
      if (e.target.name === "scenario") { state.id = e.target.value; render(); }
    });

    $("count").addEventListener("input", function (e) {
      state.count = COUNTS[+e.target.value];
      $("count-out").textContent = nf(state.count);
      render(true);
    });
    $("years").addEventListener("input", function (e) {
      state.years = +e.target.value;
      $("years-out").textContent = state.years + " років";
      render(true);
    });
  }

  /* ---------- Results ---------- */
  function renderResults(s) {
    var n = state.count;
    var m = fmtMass(s.co2.min * n, s.co2.max * n);
    $("co2-range").textContent = m.text;
    document.querySelector(".co2 .unit").textContent = m.unit;
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
    var label = { sealed: "Запечатана поверхня", living: "Живий ґрунт", none: "Земля не займається" }[s.land.state];
    $("land-state").innerHTML = "<span class=\"dot " + s.land.state + "\"></span><span><strong>" + label + ".</strong> " + s.land.note + "</span>";
    var ly = area * state.years;
    $("land-years").textContent = s.land.state === "none"
      ? "За " + state.years + " років: 0 м²·років."
      : "За " + state.years + " років: " + nf(ly) + " м²·років " +
        (s.land.state === "sealed" ? "виведено з екосистеми." : "у складі живої екосистеми.");
  }

  /* ---------- Compare chart ---------- */
  function buildCompare() {
    var box = $("compare-chart");
    box.style.setProperty("--zero", pct(0) + "%");
    box.innerHTML = D.scenarios.map(function (s) {
      return "<button type=\"button\" class=\"crow\" data-id=\"" + s.id + "\" aria-label=\"" + s.name + ": від " + s.co2.min + " до " + s.co2.max + " кг\">" +
        "<span class=\"cname\">" + s.name + "</span>" +
        "<span class=\"ctrack\" style=\"--zero:" + pct(0) + "%\"><span style=\"left:" + pct(s.co2.min) + "%;width:" + (pct(s.co2.max) - pct(s.co2.min)) + "%\"></span></span>" +
        "<span class=\"cval\">" + nf(s.co2.min) + "…" + nf(s.co2.max) + " кг</span></button>";
    }).join("");
    box.addEventListener("click", function (e) {
      var row = e.target.closest(".crow");
      if (!row) return;
      state.id = row.dataset.id;
      document.querySelector("input[value=\"" + state.id + "\"]").checked = true;
      render();
    });
  }
  function renderCompare() {
    Array.prototype.forEach.call(document.querySelectorAll(".crow"), function (r) {
      r.classList.toggle("active", r.dataset.id === state.id);
      r.setAttribute("aria-pressed", r.dataset.id === state.id);
    });
  }

  /* ---------- Simulator ---------- */
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function rng(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

  var GREENS = ["#8fa98f", "#7f9a83", "#9db59a", "#6f8b73", "#a9bfa3"];
  function tree(g, x, y, r, rand) {
    el("rect", { x: x - 1.5, y: y, width: 3, height: r * 1.1, fill: "#8a7660", rx: 1 }, g);
    el("circle", { cx: x, cy: y - r * 0.2, r: r, fill: GREENS[Math.floor(rand() * GREENS.length)] }, g);
    el("circle", { cx: x - r * 0.5, cy: y + r * 0.1, r: r * 0.65, fill: GREENS[Math.floor(rand() * GREENS.length)], opacity: 0.9 }, g);
  }
  function grass(g, rand, n, color) {
    for (var i = 0; i < n; i++) {
      var x = rand() * 360, y = 30 + rand() * 190;
      el("path", { d: "M" + x + " " + y + "l-2 -5M" + x + " " + y + "l0 -6M" + x + " " + y + "l2 -5", stroke: color, "stroke-width": 1, fill: "none", "stroke-linecap": "round" }, g);
    }
  }
  function flowers(g, rand, n) {
    var c = ["#e8e2c8", "#d9c7d6", "#efe6b5", "#ffffff"];
    for (var i = 0; i < n; i++) el("circle", { cx: rand() * 360, cy: 30 + rand() * 190, r: 1.6, fill: c[i % c.length] }, g);
  }
  function sky(g, color) {
    el("rect", { x: 0, y: 0, width: 360, height: 220, fill: color }, g);
  }

  var SIMS = {
    grid: {
      text: " Ділянки запечатані бетоном і каменем. Ґрунт під ними не бере участі в кругообігу речовин.",
      draw: function (g) {
        sky(g, "#dcddd8");
        for (var r = 0; r < 4; r++) for (var c = 0; c < 7; c++) {
          var x = 14 + c * 48, y = 16 + r * 50;
          el("rect", { x: x, y: y + 12, width: 38, height: 30, fill: "#c3c6c0", stroke: "#a9aca6", "stroke-width": 1, rx: 1 }, g);
          el("rect", { x: x + 9, y: y, width: 20, height: 14, fill: "#8d918b", rx: 3 }, g);
          el("line", { x1: x + 4, y1: y + 27, x2: x + 34, y2: y + 27, stroke: "#b2b5af", "stroke-width": 1 }, g);
        }
      }
    },
    columbarium: {
      text: " Прах займає компактну нішу. Решта ділянки може лишатися газоном.",
      draw: function (g, rand) {
        sky(g, "#e1e8dc");
        grass(g, rand, 60, "#a9bfa3");
        el("rect", { x: 20, y: 30, width: 120, height: 165, fill: "#b8bbb5", rx: 4 }, g);
        for (var r = 0; r < 7; r++) for (var c = 0; c < 5; c++)
          el("rect", { x: 28 + c * 22, y: 38 + r * 22, width: 18, height: 18, fill: "#9ea29c", stroke: "#8b8f89", "stroke-width": 0.8, rx: 1 }, g);
        el("path", { d: "M160 220 C 200 160, 260 150, 360 120", stroke: "#d6d3c8", "stroke-width": 10, fill: "none" }, g);
        tree(g, 230, 70, 16, rand); tree(g, 310, 170, 14, rand); tree(g, 185, 190, 10, rand);
      }
    },
    meadow: {
      text: " Без бетону та надгробків: ділянка лишається лугом, позначки врівень із землею.",
      draw: function (g, rand) {
        sky(g, "#d7e3cd");
        grass(g, rand, 220, "#9cb594");
        flowers(g, rand, 70);
        for (var i = 0; i < 12; i++) el("ellipse", { cx: 30 + (i % 6) * 55 + rand() * 10, cy: 60 + Math.floor(i / 6) * 90 + rand() * 20, rx: 5, ry: 2.5, fill: "#c9c8bd" }, g);
        tree(g, 70, 120, 13, rand); tree(g, 200, 70, 11, rand); tree(g, 300, 150, 14, rand);
      }
    },
    park: {
      text: " Кістковий мінерал повертають родині. Земля під поховання не відводиться, простір лишається парком.",
      draw: function (g, rand) {
        sky(g, "#dde7d6");
        grass(g, rand, 120, "#a9bfa3");
        el("path", { d: "M0 160 C 90 120, 160 200, 360 110", stroke: "#e2ddcf", "stroke-width": 14, fill: "none" }, g);
        el("circle", { cx: 250, cy: 60, r: 22, fill: "#cfdfe0" }, g);
        el("circle", { cx: 250, cy: 60, r: 14, fill: "#dfeaea" }, g);
        tree(g, 60, 70, 18, rand); tree(g, 140, 100, 12, rand); tree(g, 320, 190, 16, rand); tree(g, 110, 200, 12, rand);
        el("rect", { x: 175, y: 150, width: 24, height: 4, fill: "#a08a72", rx: 1 }, g);
      }
    },
    garden: {
      text: " ≈0,76 м³ ґрунту з одного тіла повертається в сад або в лісовідновлення.",
      draw: function (g, rand) {
        sky(g, "#dfe6d6");
        for (var r = 0; r < 4; r++) {
          var y = 22 + r * 50;
          el("rect", { x: 16, y: y, width: 328, height: 30, fill: "#c4ad92", rx: 12 }, g);
          for (var i = 0; i < 18; i++) {
            var x = 30 + i * 17 + rand() * 4, h = 6 + rand() * 10;
            el("path", { d: "M" + x + " " + (y + 22) + "q -6 -" + h + " 0 -" + (h + 4) + " q 6 " + (h / 2) + " 0 " + (h + 4), fill: GREENS[i % GREENS.length] }, g);
          }
        }
      }
    },
    forest: {
      text: " Кожна біо-урна стає основою для дерева, а кладовище перетворюється на ліс пам'яті.",
      draw: function (g, rand) {
        sky(g, "#cfdcc8");
        grass(g, rand, 120, "#93ad8c");
        var pts = [];
        for (var r = 0; r < 4; r++) for (var c = 0; c < 6; c++) pts.push([30 + c * 60 + (r % 2) * 25 + rand() * 10, 40 + r * 50 + rand() * 8]);
        pts.forEach(function (p) {
          tree(g, p[0], p[1], 12 + rand() * 9, rand);
          el("rect", { x: p[0] + 7, y: p[1] + 14, width: 6, height: 3, fill: "#b9a993", rx: 1 }, g);
        });
      }
    }
  };

  var current = null;
  function renderSim(s) {
    var svg = $("sim");
    var def = SIMS[s.sim];
    $("sim-name").textContent = s.name + ".";
    $("sim-text").textContent = def.text;
    $("sim-desc").textContent = s.name + "." + def.text;
    if (current && current.dataset.mode === s.sim) return;
    var g = el("g", { "class": "layer", opacity: 0 }, svg);
    g.dataset.mode = s.sim;
    def.draw(g, rng(42));
    var old = current;
    current = g;
    requestAnimationFrame(function () { g.setAttribute("opacity", 1); g.style.opacity = 1; });
    if (old) {
      old.style.opacity = 0;
      setTimeout(function () { old.remove(); }, 550);
    }
  }

  /* ---------- Methodology ---------- */
  function buildMethod() {
    $("method-body").innerHTML = D.scenarios.map(function (s) {
      return "<tr><td>" + s.name + "</td><td>" + nf(s.co2.min) + "…" + nf(s.co2.max) + "</td><td><ul>" +
        s.co2Basis.map(function (b) { return "<li>" + b.text + (b.assumption ? tagA : "") + cite(b.src) + "</li>"; }).join("") +
        "</ul></td></tr>";
    }).join("");

    var a = D.assumptions;
    $("assumptions").innerHTML = [
      "Бетонний склеп: ≈" + nf(a.vaultMassT, 1) + " т армованого бетону. Коефіцієнт втіленого вуглецю: " + a.concreteEF[0] + "–" + a.concreteEF[1] + " кг CO2e/кг (порядок величин для армованого бетону).",
      "Бальзамувальна рідина: 8–15 л на тіло. Сумарне споживання у США ≈16 млн л/рік" + cite("woodsen") + ", поділ на одне тіло є оцінкою моделі.",
      "Деревина труни: 0,05–0,1 м³.",
      "Площа могили з проходом: " + nf(a.plotM2, 1) + " м²; урнова ділянка: " + nf(a.urnPlotM2, 1) + " м²; ділянка під деревом пам'яті: " + nf(a.treePlotM2, 1) + " м². Місцеві норми можуть відрізнятися.",
      "Ґрунт після компостування: ≈1 куб. ярд ≈ 0,76 м³" + cite("mit") + "."
    ].map(function (t) { return "<li>" + t + "</li>"; }).join("");

    $("sources").innerHTML = SRC_KEYS.map(function (k) {
      var s = D.sources[k];
      return "<li id=\"src-" + k + "\">" + s.title + ". <a href=\"" + s.url + "\" target=\"_blank\" rel=\"noopener\">Відкрити</a></li>";
    }).join("");
  }

  function render(quantityOnly) {
    var s = byId(state.id);
    renderResults(s);
    if (!quantityOnly) { renderSim(s); renderCompare(); }
  }

  buildOptions();
  buildCompare();
  buildMethod();
  render();
})();

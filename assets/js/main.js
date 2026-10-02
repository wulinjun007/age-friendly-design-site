/* ============================================================
   适老化设计手册 · 站点脚本
   - 字号三档切换 + 高对比模式(localStorage 记忆,读屏播报)
   - 对比度演示器(WCAG 公式实时计算)
   - 视觉模拟器 / 触控热区演示
   ============================================================ */
(function () {
  "use strict";

  var FONT_KEY = "adh-font";
  var CONTRAST_KEY = "adh-contrast";
  var root = document.documentElement;
  var live = document.getElementById("liveStatus");

  function announce(msg) {
    if (live) live.textContent = msg;
  }

  /* ---------- 字号切换 ---------- */
  var FONT_NAMES = { base: "标准", large: "大", xlarge: "特大" };
  var fontBtns = Array.prototype.slice.call(document.querySelectorAll(".font-btn"));

  function applyFont(v, announceIt) {
    if (!FONT_NAMES[v]) v = "base";
    root.setAttribute("data-font", v);
    try { localStorage.setItem(FONT_KEY, v); } catch (e) {}
    fontBtns.forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-font") === v));
    });
    if (announceIt) announce("字号已切换为" + FONT_NAMES[v]);
  }
  fontBtns.forEach(function (b) {
    b.addEventListener("click", function () { applyFont(b.getAttribute("data-font"), true); });
  });

  /* ---------- 高对比模式 ---------- */
  var contrastBtn = document.getElementById("contrastBtn");
  function applyContrast(on, announceIt) {
    root.setAttribute("data-contrast", on ? "high" : "normal");
    try { localStorage.setItem(CONTRAST_KEY, on ? "high" : "normal"); } catch (e) {}
    if (contrastBtn) contrastBtn.setAttribute("aria-pressed", String(on));
    if (announceIt) announce(on ? "已开启高对比模式" : "已恢复标准配色");
  }
  if (contrastBtn) {
    contrastBtn.addEventListener("click", function () {
      applyContrast(root.getAttribute("data-contrast") !== "high", true);
    });
  }

  /* ---------- 初始化(读取记忆) ---------- */
  try {
    var savedFont = localStorage.getItem(FONT_KEY);
    if (savedFont) applyFont(savedFont, false);
    if (localStorage.getItem(CONTRAST_KEY) === "high") applyContrast(true, false);
  } catch (e) {}

  /* ---------- WCAG 对比度计算 ---------- */
  function channel(c) {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  function luminance(hex) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  }
  function contrastRatio(hex1, hex2) {
    var l1 = luminance(hex1), l2 = luminance(hex2);
    var hi = Math.max(l1, l2), lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
  }
  /* 滑杆 0~100 → 灰阶色 */
  function grayAt(t) {
    var v = Math.round(255 * (t / 100));
    var h = v.toString(16);
    if (h.length < 2) h = "0" + h;
    return "#" + h + h + h;
  }

  var cdFg = document.getElementById("cdFg");
  var cdBg = document.getElementById("cdBg");
  var cdStage = document.getElementById("cdStage");
  var cdBody = document.getElementById("cdBody");
  var cdSmall = document.getElementById("cdSmall");
  var cdBtn = document.getElementById("cdBtn");
  var cdRatio = document.getElementById("cdRatio");
  var cdBadge = document.getElementById("cdBadge");

  function updateContrastDemo() {
    if (!cdFg || !cdBg || !cdStage) return;
    var bg = cdBg.value;
    var fg = grayAt(Number(cdFg.value));
    cdStage.style.background = bg;
    cdBody.style.color = fg;
    cdSmall.style.color = fg;
    cdBtn.style.background = fg;
    var r = contrastRatio(fg, bg);
    var badge;
    if (r < 3) {
      badge = '<span class="badge badge-fail">不达标(正文要求 ≥ 4.5:1)</span>';
    } else if (r < 4.5) {
      badge = '<span class="badge badge-fail">仅够大字(≥3:1),正文不够(需 ≥4.5:1)</span>';
    } else if (r < 7) {
      badge = '<span class="badge badge-aa">AA 达标(4.5:1 ~ 7:1)</span>';
    } else {
      badge = '<span class="badge badge-aaa">AAA 优秀(≥ 7:1)</span>';
    }
    cdBadge.innerHTML = badge;
    if (cdRatio) cdRatio.textContent = r.toFixed(2) + " : 1";
    cdBadge.setAttribute("aria-label", "当前对比度 " + r.toFixed(2) + " 比 1," + (r >= 4.5 ? "达到 AA 标准" : "未达到 AA 标准"));
  }
  if (cdFg && cdBg) {
    cdFg.addEventListener("input", updateContrastDemo);
    cdBg.addEventListener("change", updateContrastDemo);
    updateContrastDemo();
  }

  /* ---------- 视觉模拟器 ---------- */
  var SIM_NOTES = {
    none: "正常视力下的界面。对照下面的其他模式,观察信息在哪一刻开始丢失。",
    blur: "老花(近似):近距离对焦能力下降,小字先糊成一片——这正是 12px 小字的下场。",
    cataract: "白内障(近似):整体模糊、泛黄、怕光。对比度不足的文字和蓝紫色信息最先失效。",
    contrast: "对比敏感度下降:灰阶和浅色的差别被抹平,凡靠浅灰、水印传达的信息全部消失。",
    glare: "夜间眩光:强光在视网膜上晕开。玻璃门、镜面、屏幕高光都可能变成白茫茫一片。"
  };
  var simBtns = Array.prototype.slice.call(document.querySelectorAll(".sim-btn"));
  var simStage = document.getElementById("simStage");
  var simNote = document.getElementById("simNote");
  simBtns.forEach(function (b) {
    b.addEventListener("click", function () {
      simBtns.forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
      b.setAttribute("aria-pressed", "true");
      var s = b.getAttribute("data-sim");
      if (simStage) simStage.setAttribute("data-sim", s);
      if (simNote) simNote.textContent = SIM_NOTES[s] || "";
      announce("已切换模拟模式:" + b.textContent);
    });
  });

  /* ---------- 触控热区演示 ---------- */
  var zoneToggle = document.getElementById("ttZoneToggle");
  var ttStage = document.getElementById("ttStage");
  var ttFeedback = document.getElementById("ttFeedback");
  var ttCount = 0;
  if (ttStage) {
    Array.prototype.slice.call(ttStage.querySelectorAll("button")).forEach(function (btn) {
      btn.addEventListener("click", function () {
        ttCount += 1;
        if (ttFeedback) {
          ttFeedback.textContent =
            "第 " + ttCount + " 次点击成功,点中的是「" +
            (btn.getAttribute("data-name") || btn.textContent.trim()) + "」。";
        }
      });
    });
  }
  if (zoneToggle && ttStage) {
    zoneToggle.addEventListener("click", function () {
      var on = zoneToggle.getAttribute("aria-pressed") !== "true";
      zoneToggle.setAttribute("aria-pressed", String(on));
      ttStage.classList.toggle("zones", on);
      announce(on ? "已显示点击热区" : "已隐藏点击热区");
    });
  }
})();

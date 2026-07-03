(function () {
  "use strict";

  var STORAGE_KEY = "cft_entries_v1";
  var BUSINESS_KEY = "cft_business_name_v1";

  var els = {
    businessName: document.getElementById("businessName"),
    width: document.getElementById("width"),
    thickness: document.getElementById("thickness"),
    length: document.getElementById("length"),
    lengthUnitToggle: document.getElementById("lengthUnitToggle"),
    piecesPerBundle: document.getElementById("piecesPerBundle"),
    bundles: document.getElementById("bundles"),
    note: document.getElementById("note"),
    livePreview: document.getElementById("livePreview"),
    addBtn: document.getElementById("addBtn"),
    entryList: document.getElementById("entryList"),
    emptyState: document.getElementById("emptyState"),
    clearAllBtn: document.getElementById("clearAllBtn"),
    totalValue: document.getElementById("totalValue"),
    partyName: document.getElementById("partyName"),
    shareBtn: document.getElementById("shareBtn"),
    renderCanvas: document.getElementById("renderCanvas"),
  };

  var state = {
    lengthUnit: "ft",
    entries: [],
  };

  // ---------- persistence ----------
  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) state.entries = parsed;
      }
      var biz = localStorage.getItem(BUSINESS_KEY);
      if (biz) els.businessName.value = biz;
    } catch (e) {}
  }

  function saveEntries() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
    } catch (e) {}
  }

  els.businessName.addEventListener("input", function () {
    try {
      localStorage.setItem(BUSINESS_KEY, els.businessName.value);
    } catch (e) {}
  });

  // ---------- calculation ----------
  function computeCft(width, thickness, length, lengthUnit, piecesPerBundle, bundles) {
    var divisor = lengthUnit === "in" ? 1728 : 144;
    var totalPieces = piecesPerBundle * bundles;
    return (width * thickness * length * totalPieces) / divisor;
  }

  function fmt(n) {
    if (!isFinite(n)) return "0.00";
    return n.toFixed(2);
  }

  // ---------- length unit toggle ----------
  els.lengthUnitToggle.addEventListener("click", function (e) {
    var btn = e.target.closest(".toggle-btn");
    if (!btn) return;
    state.lengthUnit = btn.getAttribute("data-unit");
    Array.prototype.forEach.call(els.lengthUnitToggle.querySelectorAll(".toggle-btn"), function (b) {
      b.classList.toggle("active", b === btn);
    });
    updateLivePreview();
  });

  // ---------- live preview ----------
  function readFormValues() {
    return {
      width: parseFloat(els.width.value),
      thickness: parseFloat(els.thickness.value),
      length: parseFloat(els.length.value),
      lengthUnit: state.lengthUnit,
      piecesPerBundle: parseInt(els.piecesPerBundle.value, 10) || 1,
      bundles: parseInt(els.bundles.value, 10) || 1,
      note: els.note.value.trim(),
    };
  }

  function updateLivePreview() {
    var v = readFormValues();
    if (!v.width || !v.thickness || !v.length) {
      els.livePreview.textContent = "Enter dimensions to see CFT";
      return;
    }
    var cft = computeCft(v.width, v.thickness, v.length, v.lengthUnit, v.piecesPerBundle, v.bundles);
    var totalPieces = v.piecesPerBundle * v.bundles;
    els.livePreview.textContent =
      v.width + '"x' + v.thickness + '"x' + v.length + (v.lengthUnit === "in" ? '"' : "'") +
      "  ×  " + totalPieces + " pcs  =  " + fmt(cft) + " CFT";
  }

  ["width", "thickness", "length", "piecesPerBundle", "bundles"].forEach(function (id) {
    els[id].addEventListener("input", updateLivePreview);
  });

  // ---------- add entry ----------
  els.addBtn.addEventListener("click", function () {
    var v = readFormValues();
    if (!v.width || v.width <= 0) return showToast("Enter a valid width");
    if (!v.thickness || v.thickness <= 0) return showToast("Enter a valid thickness");
    if (!v.length || v.length <= 0) return showToast("Enter a valid length");

    var cft = computeCft(v.width, v.thickness, v.length, v.lengthUnit, v.piecesPerBundle, v.bundles);

    state.entries.push({
      id: Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      width: v.width,
      thickness: v.thickness,
      length: v.length,
      lengthUnit: v.lengthUnit,
      piecesPerBundle: v.piecesPerBundle,
      bundles: v.bundles,
      note: v.note,
      cft: cft,
    });

    saveEntries();
    renderEntries();

    // reset form (keep unit toggle as-is for faster repeat entry)
    els.width.value = "";
    els.thickness.value = "";
    els.length.value = "";
    els.piecesPerBundle.value = "1";
    els.bundles.value = "1";
    els.note.value = "";
    updateLivePreview();
    els.width.focus();
  });

  // ---------- clear all ----------
  els.clearAllBtn.addEventListener("click", function () {
    if (!state.entries.length) return;
    if (!confirm("Clear all entries and start a new calculation?")) return;
    state.entries = [];
    saveEntries();
    renderEntries();
  });

  // ---------- render entries ----------
  function describeEntry(e) {
    var dims = e.width + '"×' + e.thickness + '"×' + e.length + (e.lengthUnit === "in" ? '"' : "'");
    var totalPieces = e.piecesPerBundle * e.bundles;
    var pieceDesc;
    if (e.bundles > 1) {
      pieceDesc = e.piecesPerBundle + " pcs/bundle × " + e.bundles + " bundles = " + totalPieces + " pcs";
    } else {
      pieceDesc = totalPieces + " pc" + (totalPieces > 1 ? "s" : "");
    }
    return { dims: dims, pieceDesc: pieceDesc };
  }

  function renderEntries() {
    els.entryList.innerHTML = "";
    if (!state.entries.length) {
      els.entryList.appendChild(els.emptyState);
      els.emptyState.style.display = "";
    } else {
      state.entries.forEach(function (e) {
        var d = describeEntry(e);
        var row = document.createElement("div");
        row.className = "entry";
        row.innerHTML =
          '<div class="entry-info">' +
            '<div class="entry-dims">' + d.dims + "</div>" +
            '<div class="entry-detail">' + d.pieceDesc + "</div>" +
            (e.note ? '<div class="entry-note">' + escapeHtml(e.note) + "</div>" : "") +
          "</div>" +
          '<div class="entry-cft">' + fmt(e.cft) + '<br><span style="font-size:10px;font-weight:600;color:var(--muted);">CFT</span></div>' +
          '<button class="entry-delete" data-id="' + e.id + '" aria-label="Delete">×</button>';
        els.entryList.appendChild(row);
      });
    }
    updateTotal();
  }

  els.entryList.addEventListener("click", function (e) {
    var btn = e.target.closest(".entry-delete");
    if (!btn) return;
    var id = btn.getAttribute("data-id");
    state.entries = state.entries.filter(function (en) { return en.id !== id; });
    saveEntries();
    renderEntries();
  });

  function updateTotal() {
    var total = state.entries.reduce(function (sum, e) { return sum + e.cft; }, 0);
    els.totalValue.textContent = fmt(total);
    els.shareBtn.disabled = state.entries.length === 0;
  }

  function escapeHtml(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  // ---------- toast ----------
  var toastTimer = null;
  function showToast(msg) {
    var t = document.querySelector(".toast");
    if (!t) {
      t = document.createElement("div");
      t.className = "toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    requestAnimationFrame(function () { t.classList.add("show"); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2200);
  }

  // ---------- WhatsApp share (image) ----------
  els.shareBtn.addEventListener("click", function () {
    if (!state.entries.length) return;
    shareAsImage();
  });

  function shareAsImage() {
    var canvas = buildSummaryCanvas();
    canvas.toBlob(async function (blob) {
      if (!blob) return showToast("Could not generate image");
      var fileName = "CFT-Calculation-" + Date.now() + ".png";
      var file = new File([blob], fileName, { type: "image/png" });

      var total = state.entries.reduce(function (sum, e) { return sum + e.cft; }, 0);
      var shareText = (els.businessName.value.trim() || "CFT Calculation") +
        (els.partyName.value.trim() ? " - " + els.partyName.value.trim() : "") +
        " | Total: " + fmt(total) + " CFT";

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: "CFT Calculation",
            text: shareText,
          });
          return;
        } catch (err) {
          if (err && err.name === "AbortError") return; // user cancelled
        }
      }

      // Fallback: download the image, then open WhatsApp with text
      downloadBlob(blob, fileName);
      showToast("Image saved. Opening WhatsApp — attach the saved image.");
      setTimeout(function () {
        window.open("https://wa.me/?text=" + encodeURIComponent(shareText), "_blank");
      }, 600);
    }, "image/png", 0.95);
  }

  function downloadBlob(blob, fileName) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function buildSummaryCanvas() {
    var scale = 2; // crisp on high-dpi screens
    var width = 720;
    var rowHeight = 74;
    var headerHeight = 150;
    var partyHeight = els.partyName.value.trim() ? 40 : 0;
    var footerHeight = 110;
    var height = headerHeight + partyHeight + state.entries.length * rowHeight + footerHeight;

    var canvas = els.renderCanvas;
    canvas.width = width * scale;
    canvas.height = height * scale;
    var ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);

    var wood = "#8B4513";
    var woodDark = "#6b3410";
    var ink = "#2a1e15";
    var muted = "#7a6a5a";
    var border = "#e3d5c4";
    var bg = "#ffffff";
    var stripe = "#faf3ea";

    // background
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // header band
    var grad = ctx.createLinearGradient(0, 0, width, headerHeight);
    grad.addColorStop(0, wood);
    grad.addColorStop(1, woodDark);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, headerHeight);

    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "alphabetic";
    ctx.font = "bold 30px Arial";
    var bizName = els.businessName.value.trim() || "Timber CFT Calculation";
    ctx.fillText(bizName, 28, 52);

    ctx.font = "16px Arial";
    ctx.globalAlpha = 0.9;
    var now = new Date();
    var dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
      "  ·  " + now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    ctx.fillText("CFT Calculation Summary  —  " + dateStr, 28, 80);
    ctx.globalAlpha = 1;

    ctx.font = "bold 15px Arial";
    ctx.fillText(state.entries.length + " entr" + (state.entries.length === 1 ? "y" : "ies") + " listed below", 28, headerHeight - 16);

    var y = headerHeight;

    if (partyHeight) {
      ctx.fillStyle = "#fff8ee";
      ctx.fillRect(0, y, width, partyHeight);
      ctx.fillStyle = woodDark;
      ctx.font = "bold 16px Arial";
      ctx.fillText("Party: " + els.partyName.value.trim(), 28, y + 26);
      y += partyHeight;
    }

    // column headers
    ctx.fillStyle = "#f0e4d6";
    ctx.fillRect(0, y, width, 34);
    ctx.fillStyle = woodDark;
    ctx.font = "bold 13px Arial";
    ctx.fillText("#", 20, y + 22);
    ctx.fillText("DIMENSIONS (W x T x L)", 55, y + 22);
    ctx.fillText("PIECES", 430, y + 22);
    ctx.fillText("CFT", 630, y + 22);
    y += 34;

    ctx.font = "16px Arial";
    state.entries.forEach(function (e, idx) {
      var d = describeEntry(e);
      if (idx % 2 === 0) {
        ctx.fillStyle = stripe;
        ctx.fillRect(0, y, width, rowHeight);
      }
      ctx.fillStyle = border;
      ctx.fillRect(0, y + rowHeight - 1, width, 1);

      ctx.fillStyle = ink;
      ctx.font = "bold 13px Arial";
      ctx.fillText(String(idx + 1), 20, y + 30);

      ctx.font = "bold 19px Arial";
      ctx.fillText(d.dims, 55, y + 30);
      ctx.font = "13px Arial";
      ctx.fillStyle = muted;
      if (e.note) ctx.fillText(e.note, 55, y + 52);

      ctx.fillStyle = ink;
      ctx.font = "14px Arial";
      wrapText(ctx, d.pieceDesc, 430, y + 30, 180, 18);

      ctx.fillStyle = woodDark;
      ctx.font = "bold 20px Arial";
      ctx.fillText(fmt(e.cft), 630, y + 34);

      y += rowHeight;
    });

    // total band
    var total = state.entries.reduce(function (sum, e) { return sum + e.cft; }, 0);
    ctx.fillStyle = wood;
    ctx.fillRect(0, y, width, footerHeight);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px Arial";
    ctx.fillText("TOTAL CFT", 28, y + 45);
    ctx.font = "bold 46px Arial";
    ctx.textAlign = "right";
    ctx.fillText(fmt(total), width - 28, y + 55);
    ctx.textAlign = "left";

    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.8;
    ctx.font = "12px Arial";
    ctx.fillText("Generated with CFT Calculator", 28, y + footerHeight - 16);
    ctx.globalAlpha = 1;

    return canvas;
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    var words = text.split(" ");
    var line = "";
    var lines = [];
    for (var i = 0; i < words.length; i++) {
      var testLine = line + words[i] + " ";
      if (ctx.measureText(testLine).width > maxWidth && line) {
        lines.push(line);
        line = words[i] + " ";
      } else {
        line = testLine;
      }
    }
    lines.push(line);
    lines.forEach(function (l, i) {
      ctx.fillText(l.trim(), x, y + i * lineHeight - (lines.length - 1) * (lineHeight / 2));
    });
  }

  // ---------- init ----------
  loadState();
  renderEntries();
  updateLivePreview();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }
})();

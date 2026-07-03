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
    noteToggle: document.getElementById("noteToggle"),
    noteField: document.getElementById("noteField"),
    livePreview: document.getElementById("livePreview"),
    addBtn: document.getElementById("addBtn"),
    entryTable: document.getElementById("entryTable"),
    entryTableBody: document.getElementById("entryTableBody"),
    emptyState: document.getElementById("emptyState"),
    clearAllBtn: document.getElementById("clearAllBtn"),
    totalValue: document.getElementById("totalValue"),
    totalPcs: document.getElementById("totalPcs"),
    totalBundles: document.getElementById("totalBundles"),
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

  // ---------- note toggle ----------
  els.noteToggle.addEventListener("click", function () {
    var show = els.noteField.hidden;
    els.noteField.hidden = !show;
    els.noteToggle.textContent = show ? "− Hide note" : "+ Add note";
    if (show) els.note.focus();
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

    // reset form for the next entry — width & thickness carry over since a
    // worker typically measures many logs of the same stock before the
    // dimensions change, only length/pieces/bundles/note vary per log
    els.length.value = "";
    els.piecesPerBundle.value = "";
    els.bundles.value = "";
    els.note.value = "";
    updateLivePreview();
    els.length.focus();
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
  function lengthLabel(e) {
    return e.length + (e.lengthUnit === "in" ? '"' : "'");
  }

  function renderEntries() {
    els.entryTableBody.innerHTML = "";
    els.entryTable.style.display = state.entries.length ? "" : "none";
    els.emptyState.style.display = state.entries.length ? "none" : "";

    state.entries.forEach(function (e, idx) {
      var row = document.createElement("tr");
      row.innerHTML =
        "<td>" + (idx + 1) + "</td>" +
        "<td>" + e.width + '"</td>' +
        "<td>" + e.thickness + '"</td>' +
        "<td>" + lengthLabel(e) + "</td>" +
        "<td>" + e.piecesPerBundle + "</td>" +
        "<td>" + e.bundles + "</td>" +
        '<td class="col-cft">' + fmt(e.cft) + "</td>" +
        '<td><button class="entry-delete" data-id="' + e.id + '" aria-label="Delete">×</button></td>';
      els.entryTableBody.appendChild(row);

      if (e.note) {
        var noteRow = document.createElement("tr");
        noteRow.className = "entry-note-row";
        noteRow.innerHTML = '<td colspan="8" class="col-note">' + escapeHtml(e.note) + "</td>";
        els.entryTableBody.appendChild(noteRow);
      }
    });

    updateTotal();
  }

  els.entryTableBody.addEventListener("click", function (e) {
    var btn = e.target.closest(".entry-delete");
    if (!btn) return;
    var id = btn.getAttribute("data-id");
    state.entries = state.entries.filter(function (en) { return en.id !== id; });
    saveEntries();
    renderEntries();
  });

  function updateTotal() {
    var totalCft = state.entries.reduce(function (sum, e) { return sum + e.cft; }, 0);
    var totalPcs = state.entries.reduce(function (sum, e) { return sum + e.piecesPerBundle * e.bundles; }, 0);
    var totalBundles = state.entries.reduce(function (sum, e) { return sum + e.bundles; }, 0);
    els.totalValue.textContent = fmt(totalCft);
    els.totalPcs.textContent = totalPcs;
    els.totalBundles.textContent = totalBundles;
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
    var rowHeight = 44;
    var noteRowHeight = 24;
    var noteRows = state.entries.filter(function (e) { return e.note; }).length;
    var headerHeight = 150;
    var partyHeight = els.partyName.value.trim() ? 40 : 0;
    var colHeaderHeight = 34;
    var footerHeight = 130;
    var height = headerHeight + partyHeight + colHeaderHeight +
      state.entries.length * rowHeight + noteRows * noteRowHeight + footerHeight;

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

    // column layout: # | W | T | L | Pcs | Bdl | CFT — grid edges define 7 columns
    var edges = [16, 60, 195, 330, 460, 550, 620, width - 16];
    var cols = [
      { key: "#", x: edges[0] + 8, align: "left" },
      { key: "W", x: edges[2] - 10, align: "right" },
      { key: "T", x: edges[3] - 10, align: "right" },
      { key: "L", x: edges[4] - 10, align: "right" },
      { key: "PCS", x: edges[5] - 10, align: "right" },
      { key: "BDL", x: edges[6] - 10, align: "right" },
      { key: "CFT", x: edges[7] - 10, align: "right" },
    ];

    var headerTop = y;

    ctx.fillStyle = "#f0e4d6";
    ctx.fillRect(0, y, width, colHeaderHeight);
    ctx.fillStyle = woodDark;
    ctx.font = "bold 13px Arial";
    cols.forEach(function (c) {
      ctx.textAlign = c.align;
      ctx.fillText(c.key, c.x, y + 22);
    });
    ctx.textAlign = "left";
    y += colHeaderHeight;

    var rowSegments = [{ top: headerTop, bottom: y }]; // header row grid segment

    state.entries.forEach(function (e, idx) {
      if (idx % 2 === 0) {
        ctx.fillStyle = stripe;
        ctx.fillRect(0, y, width, rowHeight);
      }

      var midY = y + rowHeight / 2 + 6;
      ctx.fillStyle = ink;
      ctx.font = "13px Arial";
      ctx.textAlign = "left";
      ctx.fillText(String(idx + 1), cols[0].x, midY);

      ctx.font = "bold 16px Arial";
      ctx.textAlign = "right";
      ctx.fillText(e.width + '"', cols[1].x, midY);
      ctx.fillText(e.thickness + '"', cols[2].x, midY);
      ctx.fillText(lengthLabel(e), cols[3].x, midY);

      ctx.font = "15px Arial";
      ctx.fillText(String(e.piecesPerBundle), cols[4].x, midY);
      ctx.fillText(String(e.bundles), cols[5].x, midY);

      ctx.fillStyle = woodDark;
      ctx.font = "bold 17px Arial";
      ctx.fillText(fmt(e.cft), cols[6].x, midY);
      ctx.textAlign = "left";

      rowSegments.push({ top: y, bottom: y + rowHeight });
      y += rowHeight;

      if (e.note) {
        ctx.fillStyle = muted;
        ctx.font = "italic 13px Arial";
        ctx.fillText("Note: " + e.note, edges[0] + 8, y + 16);
        y += noteRowHeight;
      }
    });

    var gridBottom = y;

    // grid lines — vertical dividers only across header/data rows, skipping note rows
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    edges.forEach(function (ex) {
      rowSegments.forEach(function (seg) {
        ctx.beginPath();
        ctx.moveTo(ex + 0.5, seg.top);
        ctx.lineTo(ex + 0.5, seg.bottom);
        ctx.stroke();
      });
    });
    // horizontal rules between every row (including header)
    rowSegments.forEach(function (seg) {
      ctx.beginPath();
      ctx.moveTo(0, seg.bottom + 0.5);
      ctx.lineTo(width, seg.bottom + 0.5);
      ctx.stroke();
    });
    ctx.beginPath();
    ctx.moveTo(0, headerTop + 0.5);
    ctx.lineTo(width, headerTop + 0.5);
    ctx.stroke();
    ctx.strokeStyle = woodDark;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0.75, headerTop + 0.75, width - 1.5, gridBottom - headerTop - 1.5);

    // total band
    var totalCft = state.entries.reduce(function (sum, e) { return sum + e.cft; }, 0);
    var totalPcs = state.entries.reduce(function (sum, e) { return sum + e.piecesPerBundle * e.bundles; }, 0);
    var totalBundles = state.entries.reduce(function (sum, e) { return sum + e.bundles; }, 0);

    ctx.fillStyle = wood;
    ctx.fillRect(0, y, width, footerHeight);

    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.85;
    ctx.font = "bold 14px Arial";
    ctx.fillText("TOTAL PIECES", 28, y + 32);
    ctx.fillText("TOTAL BUNDLES", 28, y + 62);
    ctx.font = "bold 22px Arial";
    ctx.globalAlpha = 1;
    ctx.fillText(String(totalPcs), 190, y + 34);
    ctx.fillText(String(totalBundles), 190, y + 64);

    ctx.font = "bold 20px Arial";
    ctx.globalAlpha = 0.85;
    ctx.textAlign = "right";
    ctx.fillText("TOTAL CFT", width - 28, y + 40);
    ctx.font = "bold 44px Arial";
    ctx.globalAlpha = 1;
    ctx.fillText(fmt(totalCft), width - 28, y + 82);
    ctx.textAlign = "left";

    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.8;
    ctx.font = "12px Arial";
    ctx.fillText("Generated with CFT Calculator", 28, y + footerHeight - 14);
    ctx.globalAlpha = 1;

    return canvas;
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

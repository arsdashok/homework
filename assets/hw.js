/* Shared behaviour for online homework pages. Page supplies <body data-student data-sheet data-sheet-id>. */
(function () {
  var SEND_URL = "https://script.google.com/macros/s/AKfycbwtEVGXzip6vzoLC7oY_wzfmHGe31Vm2uFB9FMwHsSyVHdbyMOKpu16z-a6SdQXXVg/exec";
  var SEND_KEY = "89949615279890a2";
  var B = document.body, META = { student: B.dataset.student || "", sheet: B.dataset.sheet || "", sheetId: B.dataset.sheetId || "" };
  var STORE = "hw-" + META.sheetId, state = {};
  try { state = JSON.parse(localStorage.getItem(STORE) || "{}"); } catch (e) { state = {}; }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {} }

  // click-to-circle: any element with class "circle-words" gets its words wrapped
  var n = 0;
  document.querySelectorAll(".circle-words").forEach(function (el) {
    el.innerHTML = el.textContent.replace(/([A-Za-z']+)/g, function (m) { n++; return '<span class="hw-w" data-w="w' + n + '">' + m + "</span>"; });
  });
  // "circle-words break-lines" (Dasha, 7 Oct 2026): a tapped word ends its line, so the text breaks
  // after it (and after its own comma or full stop); tapping it again joins the line back.
  // The words are still marked by the same key ("set" of the tapped words).
  function syncBreaks(box) {
    box.querySelectorAll("br.hw-br").forEach(function (b) { b.remove(); });
    box.querySelectorAll(".hw-w.hw-circled").forEach(function (w) {
      var at = w, nx = w.nextSibling;
      if (nx && nx.nodeType === 3) {
        var p = nx.textContent.match(/^[^\sA-Za-z']*/)[0].length;
        if (p) { if (p < nx.textContent.length) nx.splitText(p); at = nx; }
      }
      var br = document.createElement("br"); br.className = "hw-br";
      at.parentNode.insertBefore(br, at.nextSibling);
    });
  }
  document.querySelectorAll(".hw-w").forEach(function (w) {
    if (state[w.dataset.w]) w.classList.add("hw-circled");
    w.addEventListener("click", function () {
      w.classList.toggle("hw-circled"); state[w.dataset.w] = w.classList.contains("hw-circled"); save();
      var box = w.closest(".break-lines"); if (box) syncBreaks(box);
    });
  });
  document.querySelectorAll(".circle-words.break-lines").forEach(syncBreaks);
  function isCtl(el) { return /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName); }
  function val(el) { return isCtl(el) ? el.value : el.innerText; }
  document.querySelectorAll("[data-k]").forEach(function (el) {
    if (el.classList.contains("circle-words")) return;
    if (state[el.dataset.k]) { if (isCtl(el)) el.value = state[el.dataset.k]; else el.textContent = state[el.dataset.k]; }
    function keep() { state[el.dataset.k] = val(el); save(); }
    el.addEventListener("input", keep); el.addEventListener("change", keep);
  });

  var pdfPending = null;
  function makePDF() {
    if (pdfPending) return pdfPending;
    // html2pdf measures page breaks with getBoundingClientRect. Rendering the live,
    // scrolled document mixed viewport coordinates with PDF coordinates, adding huge
    // blank areas and losing the tail. A separate, unscrolled document has one origin.
    var frame = document.createElement("iframe"), timer;
    frame.title = "Preparing homework PDF";
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    frame.style.cssText = "position:fixed;left:-10000px;top:0;width:800px;height:1100px;border:0;pointer-events:none;";
    var job = new Promise(function (resolve, reject) {
      timer = setTimeout(function () { reject(new Error("PDF export timed out. Please try again.")); }, 60000);
      B.appendChild(frame);
      var doc = frame.contentDocument;
      doc.open(); doc.write("<!doctype html><html><head></head><body></body></html>"); doc.close();
      var base = doc.createElement("base"); base.href = document.baseURI; doc.head.appendChild(base);
      var styles = [];
      document.querySelectorAll('style, link[rel="stylesheet"]').forEach(function (node) {
        var copy = doc.importNode(node, true);
        if (node.tagName === "LINK") {
          copy.href = node.href;
          styles.push(new Promise(function (ok, fail) { copy.onload = ok; copy.onerror = function () { fail(new Error("PDF stylesheet failed to load")); }; }));
        }
        doc.head.appendChild(copy);
      });
      var sheet = doc.importNode(document.getElementById("sheet"), true);
      sheet.querySelectorAll("script, .hw-bar, .save-bar").forEach(function (node) { node.remove(); });
      // Read current field properties, not HTML attributes or only the visible portion
      // of a textarea. Plain wrapping blocks preserve every line, including long words.
      var originals = document.getElementById("sheet").querySelectorAll("[data-k]");
      sheet.querySelectorAll("[data-k]").forEach(function (copy, i) {
        var original = originals[i];
        if (copy.classList.contains("circle-words")) return;
        // A hidden select/input is the saved value behind a visible drop zone or
        // choice group. Printing that storage field again duplicates the answer.
        var twin = [].find.call(document.getElementById("sheet").querySelectorAll("[data-field]"), function (node) {
          return node.dataset.field === original.dataset.k;
        });
        if (!seen(original) && seen(twin)) { copy.remove(); return; }
        var answer = doc.createElement("span");
        answer.className = copy.className + " hw-pdf-answer";
        answer.dataset.k = original.dataset.k;
        if (original.tagName === "INPUT" || original.tagName === "SELECT") answer.classList.add("hw-pdf-inline");
        if (original.classList.contains("hw-gap")) answer.classList.add("hw-pdf-gap");
        answer.textContent = val(original) || "\u00a0";
        copy.replaceWith(answer);
      });
      // Keep each wrong response with its correction. Putting extra inline text
      // into an equation row can otherwise push the last answer off the page.
      sheet.querySelectorAll(".hw-pdf-answer").forEach(function (answer) {
        var mark = answer.nextElementSibling;
        if (!answer.classList.contains("hw-pdf-inline") || !mark || !mark.classList.contains("hw-no")) return;
        var group = doc.createElement("span");
        group.className = "hw-pdf-response";
        answer.parentNode.insertBefore(group, answer);
        group.appendChild(answer); group.appendChild(mark);
      });
      doc.body.className = "hw-pdf-mode";
      doc.body.appendChild(sheet);
      // Dragging belongs only to the live page. Use ordinary flow boxes in the
      // export: html2canvas misplaces inline flex children in centred drop zones.
      sheet.querySelectorAll(".dragging, .picked, .over, .ready").forEach(function (node) {
        node.classList.remove("dragging", "picked", "over", "ready");
      });
      sheet.querySelectorAll(".tile, .chip").forEach(function (node) {
        // The same class also names picture cards; preserve their grid layout.
        if (node.querySelector("img, svg, [data-k]")) return;
        node.classList.add("hw-pdf-tile");
      });
      sheet.querySelectorAll(".slot, .drop, .dz, .pslot, .dslot").forEach(function (node) {
        if (node.querySelector(".tile, .chip")) {
          node.classList.add("hw-pdf-drop");
          if (node.tagName === "SPAN") node.classList.add("hw-pdf-drop-inline");
        }
      });
      var fixes = doc.createElement("style");
      fixes.textContent = [
        // Leave a small horizontal safety gutter inside html2pdf's rounded A4 container.
        "html,body{margin:0!important;padding:0!important;max-width:none!important;width:680px!important;height:auto!important;min-height:0!important;overflow:visible!important;background:white!important;}",
        "#sheet{margin:0!important;padding:0!important;width:680px!important;max-width:none!important;transform:none!important;}",
        "#sheet .sheet{margin:0!important;max-width:none!important;}",
        // Avoid moving whole sections to a new page; keep individual questions intact.
        "#sheet *{break-before:auto!important;break-after:auto!important;break-inside:auto!important;page-break-before:auto!important;page-break-after:auto!important;page-break-inside:auto!important;}",
        "#sheet .hw-pdf-answer{display:block!important;height:auto!important;max-height:none!important;min-height:38px!important;overflow:visible!important;white-space:pre-wrap!important;overflow-wrap:anywhere!important;word-break:break-word!important;text-wrap:wrap!important;padding:8px 10px!important;box-shadow:none!important;}",
        "#sheet .hw-pdf-inline{display:inline-block!important;vertical-align:middle;min-width:80px;max-width:100%!important;}",
        "#sheet .hw-pdf-gap{min-width:0!important;min-height:0!important;padding:0 3px!important;}",
        "#sheet .hw-pdf-response{display:inline-flex!important;flex-direction:column!important;align-items:flex-start!important;vertical-align:top!important;min-width:0!important;max-width:100%!important;}",
        "#sheet .hw-pdf-response>.hw-mark{display:block!important;margin:4px 0 0!important;white-space:normal!important;width:100%!important;font-size:13px!important;}" ,
        "#sheet img,#sheet svg{max-width:100%;}",
        "#sheet .hw-pdf-drop{display:block!important;min-width:0!important;text-align:left!important;}",
        "#sheet .hw-pdf-tile{position:static!important;inset:auto!important;transform:none!important;display:inline-block!important;max-width:100%!important;min-width:0!important;white-space:normal!important;overflow-wrap:anywhere!important;word-break:normal!important;box-sizing:border-box!important;vertical-align:middle!important;}",
        "#sheet .hw-pdf-drop>.hw-pdf-tile{display:block!important;width:100%!important;margin:0!important;box-shadow:none!important;}",
        "#sheet .hw-pdf-drop>.hw-mark{display:block!important;width:auto!important;margin:4px 0 0!important;white-space:normal!important;}" ,
        "#sheet .hw-pdf-drop-inline{display:inline-block!important;max-width:100%!important;vertical-align:middle!important;}",
        "#sheet .hw-pdf-drop-inline>.hw-pdf-tile{display:inline-block!important;width:auto!important;}",
        // In Dasha's PDF the marks stay; the pupil-facing «Feedback in the lesson» note is noise there.
        "#sheet .hw-mark.hw-open{display:none!important;}",
        "#sheet .hw-mark{max-width:100%!important;overflow-wrap:anywhere!important;}"
      ].join("\n");
      doc.head.appendChild(fixes);
      var script = doc.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      script.onerror = function () { reject(new Error("PDF library failed to load")); };
      script.onload = function () {
        Promise.all(styles).then(function () { return doc.fonts ? doc.fonts.ready : null; })
          .then(function () { return Promise.all([].map.call(sheet.querySelectorAll("img"), function (img) {
            if (img.complete) return img.naturalWidth ? Promise.resolve() : Promise.reject(new Error("PDF image failed to load"));
            return new Promise(function (ok, fail) { img.onload = ok; img.onerror = function () { fail(new Error("PDF image failed to load")); }; });
          })); })
          .then(function () {
            frame.contentWindow.scrollTo(0, 0);
            // SVGs with only CSS width:100% / height:auto lose their intrinsic
            // size when html2canvas serialises them. Freeze the export dimensions
            // after the fonts and responsive layout have settled.
            sheet.querySelectorAll("svg").forEach(function (svg) {
              var bounds = svg.getBoundingClientRect();
              if (!bounds.width || !bounds.height) return;
              svg.setAttribute("width", bounds.width);
              svg.setAttribute("height", bounds.height);
              svg.style.width = bounds.width + "px";
              svg.style.height = bounds.height + "px";
            });
            var options = {
              margin: [10, 10, 10, 10], image: {type:"jpeg",quality:0.94},
              html2canvas: {scale:1.5,useCORS:true,scrollX:0,scrollY:0,windowWidth:800,windowHeight:1100},
              jsPDF: {unit:"mm",format:"a4",orientation:"portrait"},
              pagebreak: {mode:[],avoid:[".q", ".question", ".word-q", ".div-item", "tr", "header", ".model", ".task", ".instr", ".instruction", ".checks", "p", "h1", "h2", "h3", ".hw-pdf-answer", ".hw-pdf-drop", ".pick", ".job", ".comp", ".pmodel", ".msub", ".pics", ".ex-card", ".handstage", ".hw-mark-list"]}
            };
            // html2pdf uses instanceof Array, so option arrays must belong to its realm.
            options = frame.contentWindow.JSON.parse(JSON.stringify(options));
            var scale = options.html2canvas.scale;
            // html2pdf moves a block to a new page at multiples of inner.px.height (A4 floored
            // to 1046 CSS px), but cuts the canvas every floor(canvas.width * ratio) canvas px
            // (1047.33 CSS px). The 1.33 px gap added up page by page until the first line
            // of a moved block was sliced. Use ONE page height for both, a whole number of
            // canvas pixels, and draw each slice at its true height (no stretching).
            return frame.contentWindow.html2pdf().set(options).from(sheet)
              .then(function () {
                var px = this.prop.pageSize.inner.px;
                px.height = Math.floor(px.height * scale) / scale;
              })
              .toCanvas()
              .then(function () {
                var inner = this.prop.pageSize.inner, width = this.prop.canvas.width;
                var slice = Math.round(inner.px.height * scale);
                inner.height = slice * inner.width / width;
                inner.ratio = (slice + 0.5) / width;   // toPdf floors canvas.width * ratio back to slice
              })
              .outputPdf("datauristring");
          }).then(function (uri) {
            var result = uri.split(",")[1];
            if (!result) throw new Error("PDF export produced no attachment");
            resolve(result);
          }).catch(reject);
      };
      doc.head.appendChild(script);
    });
    function cleanup() { clearTimeout(timer); frame.remove(); pdfPending = null; }
    pdfPending = job.then(function (result) { cleanup(); return result; }, function (error) { cleanup(); throw error; });
    return pdfPending;
  }

  window.hwMakePDF = makePDF;
  // Use the same complete-answer export for downloads, not the browser's print
  // view, which can clip the contents of scrolling textareas again.
  document.querySelectorAll(".hw-pdf").forEach(function (button) {
    button.onclick = function () {
      var label = button.textContent;
      button.disabled = true; button.textContent = "Preparing PDF…";
      makePDF().then(function (data) {
        var bytes = Uint8Array.from(atob(data), function (c) { return c.charCodeAt(0); });
        var url = URL.createObjectURL(new Blob([bytes], {type:"application/pdf"}));
        var link = document.createElement("a");
        link.href = url;
        link.download = (META.student + " - " + META.sheet).replace(/[\\/:*?"<>|]/g, "-") + ".pdf";
        B.appendChild(link); link.click(); link.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
      }).catch(function () {
        var msg = document.getElementById("hwMsg");
        if (msg) msg.textContent = "The PDF could not be created. Your answers are still here. Please try again.";
      }).then(function () { button.disabled = false; button.textContent = label; });
    };
  });

  // ---------- instant check after sending (Dasha, 2 Oct 2026) ----------
  // Items with one clear answer get a tick, or a cross with the right answer, NEXT TO THE TASK.
  // Items the pupil writes in her own words get "Feedback in the lesson".
  // Answers come from <script id="hw-check"> (base64 JSON, written by publish_online_hw.py from the
  // sheet's key: only exact / words / set answers, never the private open-answer guidance).
  // The comparison mirrors the Homework mailer (Admin/Homework backend/Code.gs), so the page and
  // Dasha's email always agree.
  function answerOf(el) {
    if (el.classList.contains("circle-words")) return [].map.call(el.querySelectorAll(".hw-circled"), function (w) { return w.textContent; }).join(", ");
    return val(el).trim();
  }
  var CHECK = null, CHECKED = "hw-checked-" + META.sheetId;
  try {
    var ce = document.getElementById("hw-check");
    if (ce) CHECK = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(ce.textContent.trim()), function (c) { return c.charCodeAt(0); })));
  } catch (e) { CHECK = null; }
  function cNorm(s) { return String(s || "").toLowerCase().replace(/[\s,]/g, ""); }
  function cWords(s) { return String(s || "").toLowerCase().replace(/[,.]/g, " ").replace(/\s+/g, " ").trim(); }
  function cSet(s) { return String(s || "").toLowerCase().split(/[\s,]+/).filter(String).sort().join(","); }
  function seen(el) { return !!(el && el.getClientRects().length) && !el.closest("[hidden]"); }
  function writable(el) { return /^(TEXTAREA|INPUT)$/.test(el.tagName) || el.isContentEditable || el.classList.contains("circle-words"); }
  var checking = false;
  function showChecks() {
    if (!CHECK) return "";
    checking = true;
    document.querySelectorAll(".hw-mark, .hw-mark-list").forEach(function (m) { m.remove(); });
    var right = 0, marked = 0, open = 0, lists = [];
    document.querySelectorAll("#sheet [data-k]").forEach(function (el) {
      var k = el.dataset.k, key = CHECK[k];
      var vis = document.querySelector('[data-field="' + k + '"]');
      var anchor = seen(vis) ? vis : (seen(el) ? el : null);
      var node;
      if (key && key.t && key.t !== "open") {
        var mine = answerOf(el), f = key.t === "exact" ? cNorm : key.t === "words" ? cWords : cSet;
        var ok = !!mine && f(mine) === f(key.a);
        marked++; if (ok) right++;
        node = document.createElement("span");
        node.className = "hw-mark " + (ok ? "hw-ok" : "hw-no");
        if (ok) node.textContent = "✓";
        else { node.textContent = "✗ "; var r = document.createElement("span"); r.className = "hw-right"; r.textContent = key.a; node.appendChild(r); }
      } else {
        if (!anchor || anchor !== el || !writable(el)) return;   // hidden helpers and print-only boxes get nothing
        open++;
        node = document.createElement("span");
        node.className = "hw-mark hw-open";
        node.textContent = "Feedback in the lesson";
      }
      if (!anchor) {   // a hidden data store with no visible twin: list it under the task it belongs to
        var host = el.parentElement; while (host && !seen(host)) host = host.parentElement;
        if (!host) return;
        var list = host.querySelector(":scope > .hw-mark-list");
        if (!list) { list = document.createElement("div"); list.className = "hw-mark-list"; host.appendChild(list); }
        var row = document.createElement("div");
        row.textContent = (el.dataset.label || k).replace(/:.*$/, "") + ": ";
        row.appendChild(node); list.appendChild(row);
        return;
      }
      if (anchor.tagName === "BUTTON") { node.classList.add("hw-mark-in"); anchor.appendChild(node); return; }
      if (node.textContent.length < 28) node.classList.add("hw-short");
      if (anchor === el && el.classList.contains("hw-gap")) {   // letters typed inside a word: mark after the WHOLE word
        var at = el, nx = el.nextSibling;
        while (nx) {
          if (nx.nodeType === 3) {
            var cut = nx.textContent.search(/\s/);
            if (cut === -1) { at = nx; nx = nx.nextSibling; continue; }
            if (cut > 0) { nx.splitText(cut); at = nx; }
            break;
          }
          if (nx.nodeType === 1 && !nx.matches("[data-k]") && !/^\s/.test(nx.textContent) && getComputedStyle(nx).display.indexOf("inline") === 0) {
            at = nx; if (/\s/.test(nx.textContent)) break; nx = nx.nextSibling; continue;
          }
          break;
        }
        at.parentNode.insertBefore(node, at.nextSibling); return;
      }
      if (anchor === el && (/^(INPUT|SELECT)$/.test(el.tagName) || getComputedStyle(el).display.indexOf("inline") === 0)) {
        anchor.parentNode.insertBefore(node, anchor.nextSibling); return;   // inline: right after the box or menu
      }
      node.classList.add("hw-mark-blk");
      if (anchor !== el) { anchor.appendChild(node); return; }   // inside the visible card, tile bank or reply group
      var below = el;   // under a writing box, but never squeezed into a side-by-side row with it
      while (below.parentElement && below.parentElement.id !== "sheet") {
        var cs = getComputedStyle(below.parentElement);
        if (cs.display.indexOf("grid") >= 0 || (cs.display.indexOf("flex") >= 0 && cs.flexDirection.indexOf("row") === 0)) below = below.parentElement; else break;
      }
      below.parentNode.insertBefore(node, below.nextSibling);
    });
    checking = false;
    if (!marked) return open ? "Dasha will read it. Your own writing: feedback in the lesson." : "";
    return right + " of " + marked + " right. ✗ shows the right answer." + (open ? " Your own writing: feedback in the lesson." : "");
  }
  window.hwShowChecks = showChecks;
  function recheck() {
    var t = null;
    document.addEventListener("input", function () { if (checking) return; clearTimeout(t); t = setTimeout(showChecks, 150); }, true);
    document.addEventListener("change", function () { if (checking) return; clearTimeout(t); t = setTimeout(showChecks, 150); }, true);
  }
  if (CHECK) {
    var wasChecked = false; try { wasChecked = localStorage.getItem(CHECKED) === "1"; } catch (e) {}
    if (wasChecked) {
      var later = function () { setTimeout(function () { var sc = showChecks(); if (!recheck.on) { recheck.on = true; recheck(); } var msg = document.getElementById("hwMsg"); if (msg && sc) msg.textContent = "Sent! " + sc; }, 600); };
      if (document.readyState === "complete") later(); else window.addEventListener("load", later);
    }
  }
  window.hwSend = function () {
    var btn = document.getElementById("hwSend"), msg = document.getElementById("hwMsg"), answers = [];
    document.querySelectorAll("[data-k]").forEach(function (el) {
      answers.push({ k: el.dataset.k, q: el.dataset.label || el.dataset.k, a: answerOf(el) });
    });
    var empty = answers.filter(function (x) { return !x.a && !/working/i.test(x.q); }).length;
    if (empty && !confirm(empty + " answer(s) are still empty. Send anyway?")) return;
    btn.disabled = true; msg.textContent = "Sending… (this takes a few seconds)";
    // Mark FIRST, so the PDF Dasha receives shows the ticks, crosses and right answers too
    // (Dasha, 7 Oct 2026: «чтобы в пдф которая мне приходит тоже были видны правильные ответы»).
    var score = showChecks();
    try { if (typeof window.hwShowExtra === "function") window.hwShowExtra(); } catch (e) {}
    makePDF()
      .then(function (pdf) {
        return fetch(SEND_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ key: SEND_KEY, student: META.student, sheet: META.sheet, sheetId: META.sheetId, answers: answers, pdf: pdf }) });
      })
      .then(function () {
        if (!recheck.on) { recheck.on = true; recheck(); }
        try { localStorage.setItem(CHECKED, "1"); } catch (e) {}
        msg.textContent = "Sent! " + (score || "Dasha will check it. ✓");
        btn.textContent = "Sent ✓";
      })
      .catch(function () {
        document.querySelectorAll(".hw-mark, .hw-mark-list").forEach(function (m) { m.remove(); });
        btn.disabled = false; msg.textContent = "It did not send. Check the internet and try again, or save a copy as a PDF.";
      });
  };
})();

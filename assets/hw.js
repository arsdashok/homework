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
  document.querySelectorAll(".hw-w").forEach(function (w) {
    if (state[w.dataset.w]) w.classList.add("hw-circled");
    w.addEventListener("click", function () { w.classList.toggle("hw-circled"); state[w.dataset.w] = w.classList.contains("hw-circled"); save(); });
  });
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
        var answer = doc.createElement("span");
        answer.className = copy.className + " hw-pdf-answer";
        answer.dataset.k = original.dataset.k;
        if (original.tagName === "INPUT" || original.tagName === "SELECT") answer.classList.add("hw-pdf-inline");
        if (original.classList.contains("hw-gap")) answer.classList.add("hw-pdf-gap");
        answer.textContent = val(original) || "\u00a0";
        copy.replaceWith(answer);
      });
      doc.body.className = "hw-pdf-mode";
      doc.body.appendChild(sheet);
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
        "#sheet img,#sheet svg{max-width:100%;}"
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
            var options = {
              margin: [10, 10, 10, 10], image: {type:"jpeg",quality:0.94},
              html2canvas: {scale:1.5,useCORS:true,scrollX:0,scrollY:0,windowWidth:800,windowHeight:1100},
              jsPDF: {unit:"mm",format:"a4",orientation:"portrait"},
              pagebreak: {mode:[],avoid:[".q", ".question", ".word-q", ".div-item", "tr", "header", ".model", ".task", ".instr", ".instruction", ".checks", "p", "h1", "h2", "h3", ".hw-pdf-answer"]}
            };
            // html2pdf uses instanceof Array, so option arrays must belong to its realm.
            options = frame.contentWindow.JSON.parse(JSON.stringify(options));
            return frame.contentWindow.html2pdf().set(options).from(sheet).outputPdf("datauristring");
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
  window.hwSend = function () {
    var btn = document.getElementById("hwSend"), msg = document.getElementById("hwMsg"), answers = [];
    document.querySelectorAll("[data-k]").forEach(function (el) {
      var a;
      if (el.classList.contains("circle-words")) a = [].map.call(el.querySelectorAll(".hw-circled"), function (w) { return w.textContent; }).join(", ");
      else a = val(el).trim();
      answers.push({ k: el.dataset.k, q: el.dataset.label || el.dataset.k, a: a });
    });
    var empty = answers.filter(function (x) { return !x.a && !/working/i.test(x.q); }).length;
    if (empty && !confirm(empty + " answer(s) are still empty. Send anyway?")) return;
    btn.disabled = true; msg.textContent = "Sending… (this takes a few seconds)";
    makePDF()
      .then(function (pdf) {
        return fetch(SEND_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ key: SEND_KEY, student: META.student, sheet: META.sheet, sheetId: META.sheetId, answers: answers, pdf: pdf }) });
      })
      .then(function () { msg.textContent = "Sent! Dasha will check it. ✓"; btn.textContent = "Sent ✓"; })
      .catch(function () { btn.disabled = false; msg.textContent = "It did not send. Check the internet and try again, or save a copy as a PDF."; });
  };
})();

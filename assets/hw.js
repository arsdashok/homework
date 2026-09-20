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

  function makePDF() {
    if (!window.html2pdf) return Promise.resolve("");
    var el = document.getElementById("sheet");
    B.classList.add("hw-pdf-mode");
    // Size the PDF page to the sheet, not the sheet to A4: a wide row is never clipped, and page
    // breaks are computed on the real layout. Same proportions as A4, so it prints to A4 unchanged.
    var W = Math.max(el.scrollWidth, el.getBoundingClientRect().width, 700);
    el.style.width = W + "px";
    var innerMm = (W + 40) * 25.4 / 96, pageW = innerMm + 20, pageH = pageW * 297 / 210;   // +40px: html2pdf rounds its container down
    var opt = { margin: [10, 10, 10, 10], image: { type: "jpeg", quality: 0.85 },
      html2canvas: { scale: 1.6, useCORS: true, scrollX: 0, scrollY: 0 },
      jsPDF: { unit: "mm", format: [pageW, pageH], orientation: "portrait" }, pagebreak: { mode: ["css", "legacy"] } };
    function done() { B.classList.remove("hw-pdf-mode"); el.style.width = ""; }
    return html2pdf().set(opt).from(el).outputPdf("datauristring")
      .then(function (u) { done(); return u.split(",")[1] || ""; }).catch(function () { done(); return ""; });
  }

  window.hwMakePDF = makePDF;
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
    Promise.race([makePDF(), new Promise(function (r) { setTimeout(function () { r(""); }, 20000); })])
      .then(function (pdf) {
        return fetch(SEND_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ key: SEND_KEY, student: META.student, sheet: META.sheet, sheetId: META.sheetId, answers: answers, pdf: pdf }) });
      })
      .then(function () { msg.textContent = "Sent! Dasha will check it. ✓"; btn.textContent = "Sent ✓"; })
      .catch(function () { btn.disabled = false; msg.textContent = "It did not send. Check the internet and try again, or save a copy as a PDF."; });
  };
})();

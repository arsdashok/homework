(function () {
  'use strict';
  // Retain answers from both original sheets; never replace an existing answer.
  try {
    var currentKey = 'hw-maksim-2026-09-20-english';
    var current = JSON.parse(localStorage.getItem(currentKey) || '{}');
    var previous = JSON.parse(localStorage.getItem('hw-maksim-2026-09-19-english') || '{}');
    ['d1', 'd2', 'd3'].forEach(function (key) {
      if (!current[key] && previous[key]) current[key] = previous[key];
    });
    localStorage.setItem(currentKey, JSON.stringify(current));
  } catch (_) { /* Practice still works when browser storage is unavailable. */ }

  var keys = {
    d1: { answers: ['prescription'], display: 'prescription' },
    d2: { answers: ['receipt'], display: 'receipt' },
    d3: { answers: ['take'], display: 'take' },
    r1: { answers: ['I sent a few songs to my teacher.', 'I sent my teacher a few songs.'], display: 'I sent a few songs to my teacher. / I sent my teacher a few songs.', compare: true },
    w1: { answers: ['want'], display: 'want' },
    w3: { answers: ["won't"], display: 'won’t' },
    w4: { answers: ["won't"], display: 'won’t' },
    s1: { answers: ["I'm afraid you won't get the job.", "I'm afraid you will not get the job.", "I am afraid you won't get the job.", "I am afraid you will not get the job.", "You might not get the job.", "I think you might not get the job.", "I think you won't get the job."], display: 'I’m afraid you won’t get the job. / You might not get the job.', compare: true }
  };
  function normalize(text) {
    return text.toLowerCase().replace(/[’‘]/g, "'").replace(/[.,!?]/g, '').replace(/\s+/g, ' ').trim();
  }
  function checkField(field) {
    var feedback = document.getElementById('feedback-' + field.dataset.k);
    var key = keys[field.dataset.k], answer = normalize(field.value);
    feedback.hidden = false;
    if (!key) {
      feedback.dataset.result = 'manual';
      feedback.textContent = 'We’ll check this together in our next lesson.';
    } else if (key.answers.some(function (accepted) { return normalize(accepted) === answer; })) {
      feedback.dataset.result = 'correct';
      feedback.textContent = '✓ Correct. ' + (key.compare ? 'Possible answers: ' : 'Answer: ') + key.display;
    } else {
      feedback.dataset.result = key.compare ? 'compare' : 'retry';
      feedback.textContent = (key.compare ? 'Compare your sentence. Possible answer: ' : 'Correct answer: ') + key.display;
    }
    field.setAttribute('aria-describedby', feedback.id);
  }
  function check(container) {
    container.querySelectorAll('[data-k]').forEach(checkField);
    document.getElementById('checkStatus').textContent = 'Answers are shown below each question. Open answers will be checked with your teacher.';
  }
  document.querySelectorAll('[data-check]').forEach(function (button) {
    button.addEventListener('click', function () { check(button.closest('.exercise')); });
  });
  document.getElementById('checkAll').addEventListener('click', function () { check(document.getElementById('sheet')); });
  document.querySelectorAll('[data-k]').forEach(function (field) {
    field.addEventListener('input', function () {
      var feedback = document.getElementById('feedback-' + field.dataset.k);
      feedback.hidden = true;
      field.removeAttribute('aria-describedby');
    });
  });
  document.getElementById('hwSend').addEventListener('click', function () { check(document.getElementById('sheet')); window.hwSend(); });
  document.getElementById('printCopy').addEventListener('click', function () { window.print(); });
  var audioButtons = Array.from(document.querySelectorAll('[data-say]'));
  if (!audioButtons.length) return;
  var audioStatus = document.getElementById('audioStatus');
  var speech = window.speechSynthesis;
  var approvedVoice = null;
  function loadVoice() {
    approvedVoice = speech && window.SpeechSynthesisUtterance
      ? speech.getVoices().find(function (voice) { return voice.name === 'Google UK English Female'; }) || null
      : null;
    audioButtons.forEach(function (button) { button.disabled = !approvedVoice; });
    audioStatus.hidden = !!approvedVoice;
    audioStatus.textContent = approvedVoice ? '' : 'The selected voice is unavailable in this browser.';
  }
  audioButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      loadVoice();
      if (!approvedVoice) return; // Never let the browser choose a fallback voice.
      speech.cancel();
      var utterance = new window.SpeechSynthesisUtterance(button.dataset.say);
      utterance.voice = approvedVoice;
      utterance.lang = approvedVoice.lang;
      utterance.rate = 0.9;
      utterance.onerror = function (event) {
        if (event.error === 'canceled' || event.error === 'interrupted') return;
        audioStatus.hidden = false;
        audioStatus.textContent = 'Audio could not play. Please try again.';
      };
      speech.speak(utterance);
    });
  });
  if (speech) speech.addEventListener('voiceschanged', loadVoice);
  loadVoice();
})();

// scripts/script.js
(() => {
  const envelopeBtn = document.getElementById("envelopeBtn");
  const envelope = document.getElementById("envelope");
  const hint = document.getElementById("hint");
  const closeHint = document.getElementById("closeHint");
  const bgDim = document.getElementById("bgDim");
  const typedEl = document.getElementById("typedText");
  const messageBox = document.querySelector(".message");
  const stage = document.querySelector(".stage");

  // Background music
  const bgMusic = document.getElementById("bgMusic");
  let musicStarted = false;

  const setMusicVolume = () => {
    if (!bgMusic) return;
    bgMusic.volume = 0.25;
  };

  const tryStartMusic = async () => {
    if (!bgMusic || musicStarted) return;
    setMusicVolume();
    try {
      await bgMusic.play();
      musicStarted = true;
    } catch {
      // Autoplay blocked
    }
  };

  window.addEventListener("load", () => {
    tryStartMusic();
  });

  const startOnFirstGesture = async () => {
    await tryStartMusic();
    if (musicStarted) {
      document.removeEventListener("pointerdown", startOnFirstGesture);
      document.removeEventListener("keydown", startOnFirstGesture);
      document.removeEventListener("touchstart", startOnFirstGesture);
    }
  };
  document.addEventListener("pointerdown", startOnFirstGesture, { passive: true });
  document.addEventListener("touchstart", startOnFirstGesture, { passive: true });
  document.addEventListener("keydown", startOnFirstGesture);

  // =========================
  // WebAudio (rustle + typing)
  // =========================
  let audioCtx = null;

  const ensureAudio = () => {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
  };

  const playRustle = (direction /* "open" | "close" */) => {
    try {
      ensureAudio();
      const ctx = audioCtx;
      const duration = direction === "open" ? 0.24 : 0.18;

      const sr = ctx.sampleRate;
      const buf = ctx.createBuffer(1, Math.floor(sr * duration), sr);
      const data = buf.getChannelData(0);

      for (let i = 0; i < data.length; i++) {
        const t = i / data.length;
        const burst = Math.sin(t * Math.PI) ** 2;
        const grit = Math.random() * 2 - 1;
        const crackle = Math.random() < 0.012 ? (Math.random() * 2 - 1) * 0.8 : 0;
        data[i] = (grit * 0.55 + crackle) * burst;
      }

      const src = ctx.createBufferSource();
      src.buffer = buf;

      const band = ctx.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = direction === "open" ? 1900 : 1400;
      band.Q.value = 0.85;

      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 240;

      const gain = ctx.createGain();
      gain.gain.value = direction === "open" ? 0.44 : 0.34;

      src.playbackRate.value = direction === "open" ? 1.0 : 0.92;

      src.connect(band);
      band.connect(hp);
      hp.connect(gain);
      gain.connect(ctx.destination);
      src.start();
    } catch {
      // ignore
    }
  };

  // =========================
  // Typing sound (no files)
  // =========================
  let typeLastAt = 0;

  const makeNoiseBuffer = (ctx, durationSec) => {
    const sr = ctx.sampleRate;
    const len = Math.max(1, Math.floor(sr * durationSec));
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  };

  let noiseBuf = null;

  const playTypeSound = (ch) => {
    try {
      if (!audioCtx) return;

      if (ch === " " || ch === "\t") {
        if (Math.random() < 0.85) return;
      }
      if (ch === "\n") {
        if (Math.random() < 0.6) return;
      }

      const now = performance.now();
      if (now - typeLastAt < 22) return;
      typeLastAt = now;

      const ctx = audioCtx;
      const t0 = ctx.currentTime;

      const dur = 0.012 + Math.random() * 0.010;

      if (!noiseBuf) noiseBuf = makeNoiseBuffer(ctx, 0.03);

      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;

      const band = ctx.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = 1500 + Math.random() * 1200;
      band.Q.value = 0.9 + Math.random() * 0.7;

      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 380;

      const gain = ctx.createGain();
      const base = ch === "\n" ? 0.05 : 0.035;
      const vol = base + Math.random() * 0.02;

      gain.gain.setValueAtTime(0.0, t0);
      gain.gain.linearRampToValueAtTime(vol, t0 + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

      src.connect(band);
      band.connect(hp);
      hp.connect(gain);
      gain.connect(ctx.destination);

      src.start(t0);
      src.stop(t0 + dur + 0.01);
    } catch {
      // ignore
    }
  };

  // =========================
  // Typing effect
  // =========================
  const TEXT_RU = [
    "Надеюсь это письмо застанет тебя в отличном настроении и в хорошем здравии в любое время суток этого прекрасного дня!",
    "Это письмо как и любое другое несет в себе задачу донести словами то, что не представляется возможным сказать прямо сейчас глядя друг другу в глаза.",
    "За то время что ты была тут, я понял, что ты мне нравишься и я могу быть самим собой когда ты рядом. И то что хотел бы, разделять радости и преграды жизни вместе. ",
    "Может сейчас нас и разделяют тысячи километров, но в век новый, век цифровой, это становится лишь цифрой.",
    "Я предлагаю узнать друг друга по лучше, а при первой возможности личной встречи приглашаю тебя на свидание!",
    "Если ты не можешь ответить мне взаимностью - это нормально! Давай оставим всё как есть!",
    "Если же ты чувствуешь то же что и я, напиши мне! И вместе мы уже придумаем что делать дальше.",
    "Искренне жду твоего ответа,",
    "С уважением Эдуард."
  ].join("\n\n");

  let typingTimer = null;
  let typingAbort = { aborted: false };
  let scrollRaf = 0;

  const stopTyping = () => {
    typingAbort.aborted = true;
    if (typingTimer) {
      clearTimeout(typingTimer);
      typingTimer = null;
    }
    if (scrollRaf) {
      cancelAnimationFrame(scrollRaf);
      scrollRaf = 0;
    }
    typeLastAt = 0;
    if (typedEl) typedEl.textContent = "";
    if (messageBox) messageBox.scrollTop = 0;
  };

  const scheduleScrollToBottom = () => {
    if (!messageBox) return;
    if (scrollRaf) return;

    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = 0;
      messageBox.scrollTop = messageBox.scrollHeight;
    });
  };

  const startTyping = () => {
    if (!typedEl) return;

    stopTyping();
    typingAbort = { aborted: false };
    typedEl.textContent = "";

    const text = TEXT_RU;
    let i = 0;

    if (messageBox) messageBox.scrollTop = 0;

    const step = () => {
      if (typingAbort.aborted) return;

      i++;
      const ch = text[i - 1];
      typedEl.textContent = text.slice(0, i);

      if (audioCtx && audioCtx.state !== "suspended") {
        playTypeSound(ch);
      }

      scheduleScrollToBottom();
      if (i >= text.length) return;

      let delay = 14 + Math.random() * 16;
      if (ch === "\n") delay += 120;
      if (/[.,!?—:;]/.test(ch)) delay += 110;

      typingTimer = setTimeout(step, delay);
    };

    step();
  };

  // =========================
  // Open/close logic
  // =========================
  const setOpen = (open) => {
    envelope.classList.toggle("is-open", open);
    envelopeBtn.setAttribute("aria-expanded", String(open));
    bgDim.classList.toggle("is-on", open);
    stage.classList.toggle("is-open", open);

    hint.style.display = open ? "none" : "";
    closeHint.setAttribute("aria-hidden", String(!open));

    if (open) {
      playRustle("open");
      startTyping();
      document.body.style.overflow = "hidden";
      tryStartMusic();
    } else {
      playRustle("close");
      stopTyping();
      document.body.style.overflow = "";
    }
  };

  const toggle = () => {
    const isOpen = envelope.classList.contains("is-open");
    setOpen(!isOpen);
  };

  envelopeBtn.addEventListener("click", () => {
    ensureAudio();
    toggle();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
    if (e.key === "Enter" && document.activeElement === envelopeBtn) toggle();
    if (e.key === " " && document.activeElement === envelopeBtn) {
      e.preventDefault();
      toggle();
    }
  });

  bgDim.addEventListener("pointerdown", () => setOpen(false), { passive: true });
})();

const ALPHABET = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
const COLS = 9;
const ROWS = 3;
const WORDS_PER_ROUND = 10;
const IMG_BASE = "../../assets/img/";

const itemImage = document.getElementById("item-image");
const wordBoxesEl = document.getElementById("word-boxes");
const alphabetEl = document.getElementById("alphabet");
const shelfEl = document.getElementById("shelf");
const scoreEl = document.getElementById("score");
const totalEl = document.getElementById("total");
const victoryEl = document.getElementById("victory");
const btnAgain = document.getElementById("btn-again");
const connectorLine = document.getElementById("connector-line");
const btnSpeak = document.getElementById("btn-speak");
const btnSpeakSyl = document.getElementById("btn-speak-syl");
const btnVoice = document.getElementById("btn-voice");
const btnNext = document.getElementById("btn-next");
const sparklesEl = document.getElementById("sparkles");
const dragonEl = document.getElementById("dragon");
const victoryTextEl = document.getElementById("victory-text");

function spawnSparkles() {
  const rect = wordBoxesEl.getBoundingClientRect();
  const icons = ["✨", "⭐", "🌟"];
  for (let i = 0; i < 6; i++) {
    const s = document.createElement("span");
    s.className = "sparkle";
    s.textContent = icons[Math.floor(Math.random() * icons.length)];
    s.style.left = rect.left + Math.random() * rect.width + "px";
    s.style.top = rect.top + rect.height / 2 + "px";
    sparklesEl.appendChild(s);
    setTimeout(() => s.remove(), 750);
  }
}

function flyDragon() {
  dragonEl.classList.remove("fly");
  // reiniciar la animación forzando un reflow
  void dragonEl.offsetWidth;
  dragonEl.classList.add("fly");
}

totalEl.textContent = WORDS_PER_ROUND;

let esVoices = [];
let voiceIndex = parseInt(localStorage.getItem("elcompletado_voice") || "0", 10) || 0;

function loadVoices() {
  if (!("speechSynthesis" in window)) return;
  esVoices = speechSynthesis.getVoices().filter((v) => v.lang && v.lang.startsWith("es"));
}

if ("speechSynthesis" in window) {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}

function makeUtterance(text, rate) {
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = rate;
  if (esVoices.length) {
    const v = esVoices[voiceIndex % esVoices.length];
    utter.voice = v;
    utter.lang = v.lang;
  } else {
    utter.lang = "es-ES";
  }
  return utter;
}

function cycleVoice() {
  if (!esVoices.length) return;
  voiceIndex = (voiceIndex + 1) % esVoices.length;
  localStorage.setItem("elcompletado_voice", String(voiceIndex));
  const name = esVoices[voiceIndex].name;
  speak(sessionWords[currentIndex] ? sessionWords[currentIndex].word : name);
}

function speak(text) {
  if (!("speechSynthesis" in window) || !text) return;
  speechSynthesis.cancel();
  // Chrome se traba si se llama speak() justo después de cancel() en el mismo tick.
  setTimeout(() => {
    speechSynthesis.speak(makeUtterance(text, 0.55));
  }, 50);
}

function speakSyllables(syllables) {
  if (!("speechSynthesis" in window) || !syllables || !syllables.length) return;
  speechSynthesis.cancel();
  setTimeout(() => {
    let i = 0;
    function playNext() {
      if (i >= syllables.length) return;
      const utter = makeUtterance(syllables[i], 0.95);
      utter.onend = () => {
        i++;
        setTimeout(playNext, 120);
      };
      speechSynthesis.speak(utter);
    }
    playNext();
  }, 50);
}

let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playTone(freq, duration, startTime, gainPeak) {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(ctx.destination);
  const now = ctx.currentTime + startTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(gainPeak, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function playCorrectSound() {
  playTone(880, 0.12, 0, 0.25);
  playTone(1318.5, 0.16, 0.09, 0.25);
}

function playWrongSound() {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;

  // Golpe corto al inicio (el "b").
  const bufferSize = Math.floor(ctx.sampleRate * 0.08);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "lowpass";
  noiseFilter.frequency.value = 300;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.5, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(now);

  // Cola larga y grave con vibrato, para el "oooon" que resuena.
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(110, now);
  osc.frequency.exponentialRampToValueAtTime(38, now + 1.4);

  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = "sine";
  lfo.frequency.value = 6;
  lfoGain.gain.value = 0.08;
  lfo.connect(lfoGain);
  lfoGain.connect(oscGain.gain);

  oscGain.gain.setValueAtTime(0.45, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 2);

  osc.connect(oscGain);
  oscGain.connect(ctx.destination);
  osc.start(now);
  lfo.start(now);
  osc.stop(now + 2.05);
  lfo.stop(now + 2.05);
}

let sessionWords = [];
let currentIndex = 0;
let revealed = [];
let currentBlank = -1; // next blank index (left to right) that must be filled
let score = 0;
let cursor = { row: 0, col: 0 };
let locked = false; // true while a word is finishing up / transitioning

function maxColForRow(row) {
  return Math.min(COLS - 1, ALPHABET.length - 1 - row * COLS);
}

function clampCursor() {
  cursor.row = Math.max(0, Math.min(ROWS - 1, cursor.row));
  const maxCol = maxColForRow(cursor.row);
  cursor.col = Math.max(0, Math.min(maxCol, cursor.col));
}

function buildAlphabetGrid() {
  alphabetEl.innerHTML = "";
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const idx = r * COLS + c;
      const div = document.createElement("div");
      div.className = "key";
      if (idx >= ALPHABET.length) {
        div.classList.add("empty");
      } else {
        div.textContent = ALPHABET[idx];
        div.dataset.row = r;
        div.dataset.col = c;
      }
      alphabetEl.appendChild(div);
    }
  }
  renderCursor();
}

function renderCursor() {
  alphabetEl.querySelectorAll(".key").forEach((el) => el.classList.remove("cursor"));
  const idx = cursor.row * COLS + cursor.col;
  const cell = alphabetEl.children[idx];
  if (cell) cell.classList.add("cursor");
  updateConnectorLine();
}

function flashWrong() {
  const idx = cursor.row * COLS + cursor.col;
  const cell = alphabetEl.children[idx];
  if (!cell) return;
  cell.classList.add("wrong");
  setTimeout(() => cell.classList.remove("wrong"), 300);
}

function pickSessionWords() {
  const shuffled = [...WORDS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, WORDS_PER_ROUND);
}

const VISIBLE_LETTERS = { 3: 1, 4: 2, 5: 2, 6: 3, 7: 4, 8: 4, 9: 5 };

function loadWord(entry) {
  const word = entry.word;
  // Se revelan las primeras letras como pista; el resto se completa de izquierda a derecha.
  const visibleCount = VISIBLE_LETTERS[word.length] || Math.ceil(word.length / 2);
  revealed = word.split("").map((_, i) => i < visibleCount);
  currentBlank = visibleCount;

  itemImage.src = IMG_BASE + entry.img;
  itemImage.alt = word;
  itemImage.onerror = () => {
    itemImage.style.visibility = "hidden";
  };
  itemImage.onload = () => {
    itemImage.style.visibility = "visible";
  };

  renderWordBoxes();
}

function renderWordBoxes() {
  const word = sessionWords[currentIndex].word;
  wordBoxesEl.innerHTML = "";
  for (let i = 0; i < word.length; i++) {
    const box = document.createElement("div");
    let cls = "letter-box";
    if (revealed[i]) cls += " revealed";
    else if (i === currentBlank) cls += " active";
    else cls += " blank";
    box.className = cls;
    box.textContent = revealed[i] ? word[i] : "";
    wordBoxesEl.appendChild(box);
  }
  updateConnectorLine();
  updateKeyHints();
}

function updateKeyHints() {
  const word = sessionWords[currentIndex].word;
  const wordLetters = new Set(word.split(""));
  for (let i = 0; i < ALPHABET.length; i++) {
    const key = alphabetEl.children[i];
    if (!key) continue;
    key.classList.toggle("dim", !wordLetters.has(ALPHABET[i]));
  }
}

function shakeWordBox() {
  const box = wordBoxesEl.children[currentBlank];
  if (!box) return;
  box.classList.add("shake");
  setTimeout(() => box.classList.remove("shake"), 300);
}

function addToShelf(entry) {
  const item = document.createElement("div");
  item.className = "shelf-item";

  const img = document.createElement("img");
  img.src = IMG_BASE + entry.img;
  img.alt = entry.word;
  img.onerror = () => (img.style.visibility = "hidden");

  const label = document.createElement("span");
  label.textContent = entry.word;

  item.appendChild(img);
  item.appendChild(label);
  shelfEl.appendChild(item);
}

function rectEdgePoint(cx, cy, halfW, halfH, dirX, dirY) {
  if (dirX === 0 && dirY === 0) return { x: cx, y: cy };
  const scaleX = dirX !== 0 ? halfW / Math.abs(dirX) : Infinity;
  const scaleY = dirY !== 0 ? halfH / Math.abs(dirY) : Infinity;
  const scale = Math.min(scaleX, scaleY);
  return { x: cx + dirX * scale, y: cy + dirY * scale };
}

function updateConnectorLine() {
  const box = wordBoxesEl.children[currentBlank];
  const idx = cursor.row * COLS + cursor.col;
  const key = alphabetEl.children[idx];
  if (!box || !key || locked) {
    connectorLine.style.opacity = "0";
    return;
  }
  const r1 = box.getBoundingClientRect();
  const r2 = key.getBoundingClientRect();
  const c1x = r1.left + r1.width / 2;
  const c1y = r1.top + r1.height / 2;
  const c2x = r2.left + r2.width / 2;
  const c2y = r2.top + r2.height / 2;

  const rawDx = c2x - c1x;
  const rawDy = c2y - c1y;
  const rawLen = Math.sqrt(rawDx * rawDx + rawDy * rawDy) || 1;
  const dirX = rawDx / rawLen;
  const dirY = rawDy / rawLen;

  const start = rectEdgePoint(c1x, c1y, r1.width / 2, r1.height / 2, dirX, dirY);
  const end = rectEdgePoint(c2x, c2y, r2.width / 2, r2.height / 2, -dirX, -dirY);

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

  connectorLine.style.opacity = "1";
  connectorLine.style.width = length + "px";
  connectorLine.style.left = start.x + "px";
  connectorLine.style.top = start.y + "px";
  connectorLine.style.transform = `rotate(${angle}deg)`;
}

function selectLetter() {
  if (locked) return;
  const idx = cursor.row * COLS + cursor.col;
  if (idx >= ALPHABET.length) return;
  const letter = ALPHABET[idx];
  const word = sessionWords[currentIndex].word;

  if (letter === word[currentBlank]) {
    playCorrectSound();
    revealed[currentBlank] = true;
    currentBlank++;
    if (currentBlank >= word.length) {
      renderWordBoxes();
      locked = true;
      btnNext.classList.add("show");
      connectorLine.style.opacity = "0";
      spawnSparkles();
      flyDragon();
    } else {
      renderWordBoxes();
    }
  } else {
    playWrongSound();
    flashWrong();
    shakeWordBox();
  }
}

function goToNextWord() {
  btnNext.classList.remove("show");
  addToShelf(sessionWords[currentIndex]);
  score++;
  scoreEl.textContent = score;
  currentIndex++;
  locked = false;

  if (currentIndex >= sessionWords.length) {
    victoryTextEl.textContent = `¡Completaste las ${sessionWords.length} palabras!`;
    victoryEl.classList.add("show");
    connectorLine.style.opacity = "0";
    flyDragon();
    return;
  }
  loadWord(sessionWords[currentIndex]);
}

function startRound() {
  sessionWords = pickSessionWords();
  currentIndex = 0;
  score = 0;
  scoreEl.textContent = score;
  shelfEl.innerHTML = "";
  victoryEl.classList.remove("show");
  locked = false;
  loadWord(sessionWords[currentIndex]);
}

window.addEventListener("keydown", (e) => {
  if (victoryEl.classList.contains("show")) return;

  // Si el foco quedó en un <button> (por un click previo), lo soltamos
  // para que el teclado siga controlando el juego de forma consistente.
  if (document.activeElement && document.activeElement.tagName === "BUTTON") {
    document.activeElement.blur();
  }

  if (e.repeat) return; // ignorar auto-repetición al mantener una tecla apretada

  if (locked) {
    if (e.key === "ArrowRight" || e.key === "Enter") {
      e.preventDefault();
      goToNextWord();
    }
    return;
  }

  switch (e.key) {
    case "ArrowUp":
      cursor.row--;
      clampCursor();
      renderCursor();
      break;
    case "ArrowDown":
      cursor.row++;
      clampCursor();
      renderCursor();
      break;
    case "ArrowLeft":
      cursor.col--;
      clampCursor();
      renderCursor();
      break;
    case "ArrowRight":
      cursor.col++;
      clampCursor();
      renderCursor();
      break;
    case "Enter":
      e.preventDefault();
      selectLetter();
      break;
    case "1":
      e.preventDefault();
      btnSpeak.click();
      break;
    case "2":
      e.preventDefault();
      btnSpeakSyl.click();
      break;
    default: {
      const letter = e.key.toUpperCase();
      const idx = ALPHABET.indexOf(letter);
      if (letter.length === 1 && idx !== -1) {
        cursor.row = Math.floor(idx / COLS);
        cursor.col = idx % COLS;
        renderCursor();
        selectLetter();
      }
    }
  }
});

window.addEventListener("resize", updateConnectorLine);

btnAgain.addEventListener("click", startRound);

btnNext.addEventListener("click", goToNextWord);

btnSpeak.addEventListener("click", () => {
  speak(sessionWords[currentIndex].word);
});

btnSpeakSyl.addEventListener("click", () => {
  speakSyllables(sessionWords[currentIndex].syl);
});

btnVoice.addEventListener("click", cycleVoice);

buildAlphabetGrid();
startRound();

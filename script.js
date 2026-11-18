const currentOperand = document.querySelector("#current-operand");
const previousOperand = document.querySelector("#previous-operand");
const keys = document.querySelector(".keys");
const display = document.querySelector(".display");
const surprise = document.querySelector("#surprise");
const surpriseCard = document.querySelector(".surprise-card");
const soundToggle = document.querySelector("#sound-toggle");
const successMessage = document.querySelector("#success-message");
const particleContainer = document.querySelector("#calculation-particles");
const historyList = document.querySelector("#history-list");
const clearHistoryButton = document.querySelector("#clear-history");

let expression = "";
let justCalculated = false;
let lastResultExpression = null;
let previousFocus = null;
let audioContext = null;
let soundEnabled = false;
let celebrationTimer = null;
let animationFrame = 0;
let lastSoundAt = 0;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function render() { currentOperand.textContent = expression || "0"; }

function playTone(kind) {
  if (!soundEnabled || reducedMotion.matches) return;
  const now = performance.now();
  if (now - lastSoundAt < 32) return;
  lastSoundAt = now;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    audioContext ||= new Audio();
    if (audioContext.state === "suspended") audioContext.resume();
    const presets = {
      number: [660, 0.045, "sine"], add: [490, 0.09, "triangle"], subtract: [370, 0.09, "triangle"],
      multiply: [570, 0.11, "sawtooth"], divide: [430, 0.11, "square"], equals: [880, 0.22, "sine"],
      clear: [250, 0.12, "triangle"], delete: [310, 0.07, "sine"], percent: [740, 0.08, "sine"]
    };
    const [frequency, duration, wave] = presets[kind] || presets.number;
    const start = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (kind === "equals") oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.34, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(kind === "equals" ? 0.09 : 0.045, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.015);
  } catch { /* Audio is an optional enhancement; calculator input always remains available. */ }
}

soundToggle.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundToggle.setAttribute("aria-pressed", String(soundEnabled));
  soundToggle.setAttribute("aria-label", soundEnabled ? "Turn sounds off" : "Turn sounds on");
  soundToggle.title = soundEnabled ? "Sound on" : "Sound off";
  soundToggle.querySelector(".sound-label").textContent = soundEnabled ? "Sound on" : "Sound off";
  if (soundEnabled) playTone("number");
});

function addValue(value) {
  if (justCalculated && /[0-9.]%?/.test(value)) {
    expression = "";
    lastResultExpression = null;
  } else if (justCalculated && /[+*/%-]/.test(value)) {
    // Continue an answer as the left operand, e.g. 30 + 2.
  }
  justCalculated = false;

  if (/[+*/-]/.test(value)) {
    if (!expression && value !== "-") return;
    if (/[+*/-]$/.test(expression)) expression = expression.slice(0, -1) + value;
    else expression += value;
  } else if (value === "%") {
    if (!expression || /[+*/-]$/.test(expression) || /%$/.test(expression)) return;
    expression += "%";
  } else if (value === ".") {
    const currentNumber = expression.split(/[+*/-]/).pop().replace(/%$/, "");
    if (currentNumber.includes(".")) return;
    if (/%$/.test(expression)) return;
    expression += currentNumber ? "." : "0.";
  } else {
    if (/%$/.test(expression)) return;
    expression += value;
  }
  render();
}

function tokenize(input) {
  const tokens = input.match(/(?:\d+\.?\d*|\.\d+)|[+*/%\-]/g) || [];
  if (tokens.join("") !== input) throw new Error("Invalid expression");
  return tokens;
}

function calculate(input) {
  const tokens = tokenize(input);
  let position = 0;
  function factor() {
    const token = tokens[position++];
    if (token === "+") return factor();
    if (token === "-") return -factor();
    const number = Number(token);
    if (!Number.isFinite(number)) throw new Error("Invalid expression");
    let value = number;
    while (tokens[position] === "%") { position += 1; value /= 100; }
    return value;
  }
  function term() {
    let value = factor();
    while (tokens[position] === "*" || tokens[position] === "/") {
      const op = tokens[position++];
      const next = factor();
      if (op === "/" && next === 0) throw new Error("Cannot divide by zero");
      value = op === "*" ? value * next : value / next;
    }
    return value;
  }
  function sum() {
    let value = term();
    while (tokens[position] === "+" || tokens[position] === "-") {
      const op = tokens[position++];
      const next = term();
      value = op === "+" ? value + next : value - next;
    }
    return value;
  }
  const result = sum();
  if (!tokens.length || position !== tokens.length || !Number.isFinite(result)) throw new Error("Invalid expression");
  return Number(result.toPrecision(12)).toString();
}

function displayExpression(value) { return value.replaceAll("*", "×").replaceAll("/", "÷"); }
function numericDisplay(text) { const number = Number(String(text).replaceAll(",", "")); return Number.isFinite(number) ? number : 0; }

function countToResult(from, to) {
  cancelAnimationFrame(animationFrame);
  if (reducedMotion.matches || !Number.isFinite(from) || Math.abs(to - from) > 1e7) {
    currentOperand.textContent = to.toString();
    return;
  }
  const start = performance.now();
  const duration = 620;
  function frame(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = from + (to - from) * eased;
    currentOperand.textContent = Number.isInteger(to) ? Math.round(current).toString() : Number(current.toFixed(5)).toString();
    if (progress < 1) animationFrame = requestAnimationFrame(frame);
    else currentOperand.textContent = to.toString();
  }
  animationFrame = requestAnimationFrame(frame);
}

function sparkleCalculation() {
  if (reducedMotion.matches) return;
  particleContainer.replaceChildren();
  for (let i = 0; i < 20; i += 1) {
    const particle = document.createElement("span");
    particle.className = "calc-spark";
    particle.textContent = ["✦", "·", "✧", "♡"][i % 4];
    particle.style.setProperty("--x", `${Math.random() * 100}%`);
    particle.style.setProperty("--delay", `${Math.random() * .28}s`);
    particle.style.setProperty("--drift", `${-35 + Math.random() * 70}px`);
    particleContainer.append(particle);
  }
  window.setTimeout(() => particleContainer.replaceChildren(), 1500);
}

function showSuccess() {
  display.classList.remove("success");
  void display.offsetWidth;
  display.classList.add("success");
  sparkleCalculation();
  window.setTimeout(() => display.classList.remove("success"), 1600);
}

function addHistory(source, result) {
  const empty = historyList.querySelector(".history-empty");
  if (empty) empty.remove();
  const row = document.createElement("li");
  row.className = "history-item";
  const equation = document.createElement("span");
  equation.className = "history-expression";
  equation.textContent = `${displayExpression(source)} =`;
  const answer = document.createElement("span");
  answer.className = "history-result";
  answer.textContent = result;
  row.append(equation, answer);
  historyList.prepend(row);
  while (historyList.children.length > 8) historyList.lastElementChild.remove();
}

function showResult() {
  if (!expression || /[+*/-]$/.test(expression) || /%$/.test(expression)) return;
  if (justCalculated && lastResultExpression === expression) return;
  const completedExpression = expression;
  const oldNumber = numericDisplay(currentOperand.textContent);
  playTone("equals");
  try {
    const result = calculate(completedExpression);
    previousOperand.textContent = `${displayExpression(completedExpression)} =`;
    expression = result;
    justCalculated = true;
    lastResultExpression = completedExpression;
    currentOperand.textContent = oldNumber.toString();
    countToResult(oldNumber, Number(result));
    showSuccess();
    addHistory(completedExpression, result);
    if (Number(result) === 143) showSurprise();
  } catch (error) {
    previousOperand.textContent = error.message === "Cannot divide by zero" ? "Cannot divide by zero" : "Invalid expression";
    expression = "";
    justCalculated = false;
    lastResultExpression = null;
    render();
  }
}

function createFloatingCelebration() {
  const layer = document.createElement("div");
  layer.className = "floating-celebration";
  layer.setAttribute("aria-hidden", "true");
  if (!reducedMotion.matches) {
    const symbols = ["♡", "♥", "✿", "✧", "❀", "✦"];
    const colors = ["#ff9fc9", "#e4a4ff", "#ffd58d", "#ff78ae", "#b8a5ff", "#a9eaff"];
    for (let i = 0; i < 38; i += 1) {
      const item = document.createElement("span");
      const petal = i % 3 === 0;
      item.className = `floating-item${petal ? " petal" : i % 4 === 0 ? " spark" : ""}`;
      if (!petal) item.textContent = symbols[i % symbols.length];
      item.style.setProperty("--left", `${Math.random() * 100}%`);
      item.style.setProperty("--tint", colors[i % colors.length]);
      item.style.setProperty("--size", `${12 + Math.random() * 20}px`);
      item.style.setProperty("--duration", `${4.4 + Math.random() * 4.5}s`);
      item.style.setProperty("--delay", `${Math.random() * 1.8}s`);
      item.style.setProperty("--drift", `${-90 + Math.random() * 180}px`);
      item.style.setProperty("--spin", `${-220 + Math.random() * 440}deg`);
      layer.append(item);
    }
  }
  document.body.append(layer);
  window.setTimeout(() => layer.remove(), reducedMotion.matches ? 100 : 10500);
}

function showSurprise() {
  if (!surprise.hidden) return;
  previousFocus = document.activeElement;
  surprise.hidden = false;
  document.body.classList.add("is-celebrating");
  createFloatingCelebration();
  surpriseCard.focus({ preventScroll: true });
  window.clearTimeout(celebrationTimer);
  celebrationTimer = window.setTimeout(closeSurprise, 12000);
}
function closeSurprise() {
  if (surprise.hidden) return;
  surprise.hidden = true;
  document.body.classList.remove("is-celebrating");
  window.clearTimeout(celebrationTimer);
  if (previousFocus?.focus) previousFocus.focus({ preventScroll: true });
}

function actionSound(action) { playTone(action === "clear" ? "clear" : "delete"); }
function clearCalculator() { expression = ""; previousOperand.textContent = ""; justCalculated = false; lastResultExpression = null; render(); }
function deleteLast() { if (justCalculated) lastResultExpression = null; expression = expression.slice(0, -1); justCalculated = false; render(); }

keys.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const rect = button.getBoundingClientRect();
  const ripple = document.createElement("span");
  ripple.className = "ripple";
  ripple.style.left = `${event.clientX ? event.clientX - rect.left : rect.width / 2}px`;
  ripple.style.top = `${event.clientY ? event.clientY - rect.top : rect.height / 2}px`;
  button.append(ripple);
  window.setTimeout(() => ripple.remove(), 600);

  if (button.dataset.value !== undefined) {
    const value = button.dataset.value;
    const sounds = { "+": "add", "-": "subtract", "*": "multiply", "/": "divide", "%": "percent" };
    playTone(sounds[value] || "number");
    addValue(value);
  } else if (button.dataset.action === "equals") showResult();
  else {
    actionSound(button.dataset.action);
    if (button.dataset.action === "clear") clearCalculator();
    else if (button.dataset.action === "delete") deleteLast();
  }
});

clearHistoryButton.addEventListener("click", () => {
  historyList.replaceChildren();
  const empty = document.createElement("li");
  empty.className = "history-empty";
  empty.textContent = "Your calculations will appear here";
  historyList.append(empty);
});

surprise.addEventListener("click", (event) => { if (event.target.closest("[data-dismiss-surprise]")) closeSurprise(); });
document.addEventListener("keydown", (event) => {
  if (!surprise.hidden) {
    if (event.key === "Escape") { event.preventDefault(); closeSurprise(); }
    return;
  }
  if (/^[0-9.]$/.test(event.key)) { playTone("number"); addValue(event.key); }
  else if (["+", "-", "*", "/"].includes(event.key)) { playTone(({ "+": "add", "-": "subtract", "*": "multiply", "/": "divide" })[event.key]); addValue(event.key); }
  else if (event.key === "%") { playTone("percent"); addValue("%"); }
  else if (event.key === "Enter" || event.key === "=") { event.preventDefault(); showResult(); }
  else if (event.key === "Backspace") { actionSound("delete"); deleteLast(); }
  else if (event.key === "Escape") { actionSound("clear"); clearCalculator(); }
});

render();
// Regression checks for the requested 143 cases, decimals, percent and division by zero.
console.assert(calculate("100+43") === "143", "addition 143");
console.assert(calculate("200-57") === "143", "subtraction 143");
console.assert(calculate("11*13") === "143", "multiplication 143");
console.assert(calculate("286/2") === "143", "division 143");
console.assert(calculate("10+20") === "30", "ordinary addition");
console.assert(calculate("12.5+0.5") === "13", "decimal calculation");
console.assert(calculate("50%") === "0.5", "percentage calculation");
try { calculate("1/0"); console.assert(false, "division by zero should fail"); } catch (error) { console.assert(error.message === "Cannot divide by zero", "division by zero handled"); }

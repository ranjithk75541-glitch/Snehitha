const currentOperand = document.querySelector("#current-operand");
const previousOperand = document.querySelector("#previous-operand");
const keys = document.querySelector(".keys");
const surprise = document.querySelector("#surprise");
const surpriseCard = document.querySelector(".surprise-card");

let expression = "";
let justCalculated = false;
let lastResultExpression = null;
let previousFocus = null;
let celebrationTimer = null;

function render() {
  currentOperand.textContent = expression || "0";
}

function addValue(value) {
  // Starting a new expression allows the same 143 result to celebrate again.
  if (justCalculated && /[0-9.]/.test(value)) {
    expression = "";
    lastResultExpression = null;
  }
  justCalculated = false;

  if (/[+*/-]/.test(value)) {
    if (!expression && value !== "-") return;
    if (/[+*/-]$/.test(expression)) {
      expression = expression.slice(0, -1) + value;
    } else {
      expression += value;
    }
  } else if (value === ".") {
    const currentNumber = expression.split(/[+*/-]/).pop();
    if (currentNumber.includes(".")) return;
    expression += currentNumber ? "." : "0.";
  } else {
    expression += value;
  }
  render();
}

function tokenize(input) {
  const tokens = input.match(/(?:\d+\.?\d*|\.\d+)|[+*/-]/g) || [];
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
    return number;
  }

  function term() {
    let value = factor();
    while (tokens[position] === "*" || tokens[position] === "/") {
      const operator = tokens[position++];
      const next = factor();
      value = operator === "*" ? value * next : value / next;
    }
    return value;
  }

  function sum() {
    let value = term();
    while (tokens[position] === "+" || tokens[position] === "-") {
      const operator = tokens[position++];
      const next = term();
      value = operator === "+" ? value + next : value - next;
    }
    return value;
  }

  const result = sum();
  if (position !== tokens.length || !Number.isFinite(result)) {
    throw new Error("Invalid expression");
  }
  return Number(result.toPrecision(12)).toString();
}

function showResult() {
  if (!expression || /[+*/-]$/.test(expression)) return;

  // Do not re-trigger on repeated equals for the same completed expression.
  if (justCalculated && lastResultExpression === expression) return;

  const completedExpression = expression;
  try {
    const result = calculate(completedExpression);
    previousOperand.textContent = `${completedExpression.replaceAll("*", "×").replaceAll("/", "÷")} =`;
    expression = result;
    justCalculated = true;
    lastResultExpression = completedExpression;
    render();

    // Compare the numeric result (not the input formatting) so each operation works.
    if (Number(result) === 143) showSurprise();
  } catch {
    previousOperand.textContent = "Invalid expression";
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
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const symbols = ["♡", "♥", "✿", "✧", "❀", "✦"];
  const colors = ["#ff9fc9", "#e4a4ff", "#ffd58d", "#ff78ae", "#b8a5ff", "#a9eaff"];

  if (!reducedMotion) {
    for (let index = 0; index < 38; index += 1) {
      const item = document.createElement("span");
      const isPetal = index % 3 === 0;
      item.className = `floating-item${isPetal ? " petal" : index % 4 === 0 ? " spark" : ""}`;
      if (!isPetal) item.textContent = symbols[index % symbols.length];
      item.style.setProperty("--left", `${Math.random() * 100}%`);
      item.style.setProperty("--tint", colors[index % colors.length]);
      item.style.setProperty("--size", `${12 + Math.random() * 20}px`);
      item.style.setProperty("--duration", `${4.4 + Math.random() * 4.5}s`);
      item.style.setProperty("--delay", `${Math.random() * 1.8}s`);
      item.style.setProperty("--drift", `${-90 + Math.random() * 180}px`);
      item.style.setProperty("--spin", `${-220 + Math.random() * 440}deg`);
      layer.append(item);
    }
  }

  document.body.append(layer);
  window.setTimeout(() => layer.remove(), reducedMotion ? 100 : 10500);
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
  if (previousFocus && typeof previousFocus.focus === "function") {
    previousFocus.focus({ preventScroll: true });
  }
}

function handleAction(action) {
  if (action === "clear") {
    expression = "";
    previousOperand.textContent = "";
    justCalculated = false;
    lastResultExpression = null;
  } else if (action === "delete") {
    if (justCalculated) lastResultExpression = null;
    expression = expression.slice(0, -1);
    justCalculated = false;
  } else if (action === "equals") {
    showResult();
    return;
  }
  render();
}

keys.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.value !== undefined) addValue(button.dataset.value);
  else handleAction(button.dataset.action);
});

surprise.addEventListener("click", (event) => {
  if (event.target.closest("[data-dismiss-surprise]")) closeSurprise();
});

document.addEventListener("keydown", (event) => {
  if (!surprise.hidden) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeSurprise();
    }
    return;
  }

  if (/^[0-9.]$/.test(event.key)) addValue(event.key);
  else if (["+", "-", "*", "/"].includes(event.key)) addValue(event.key);
  else if (event.key === "Enter" || event.key === "=") {
    event.preventDefault();
    showResult();
  } else if (event.key === "Backspace") handleAction("delete");
  else if (event.key === "Escape") handleAction("clear");
});

render();

// Quick arithmetic checks for the four supported operation paths.
console.assert(calculate("100+43") === "143", "Addition should produce 143");
console.assert(calculate("200-57") === "143", "Subtraction should produce 143");
console.assert(calculate("11*13") === "143", "Multiplication should produce 143");
console.assert(calculate("286/2") === "143", "Division should produce 143");

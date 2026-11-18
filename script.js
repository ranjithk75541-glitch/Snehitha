const currentOperand = document.querySelector("#current-operand");
const previousOperand = document.querySelector("#previous-operand");
const keys = document.querySelector(".keys");

let expression = "";
let justCalculated = false;

function render() {
  currentOperand.textContent = expression || "0";
}

function addValue(value) {
  if (justCalculated && /[0-9.]/.test(value)) {
    expression = "";
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
  try {
    const result = calculate(expression);
    previousOperand.textContent = `${expression.replaceAll("*", "×").replaceAll("/", "÷")} =`;
    expression = result;
    justCalculated = true;
  } catch {
    previousOperand.textContent = "Invalid expression";
    expression = "";
  }
  render();
}

function handleAction(action) {
  if (action === "clear") {
    expression = "";
    previousOperand.textContent = "";
    justCalculated = false;
  } else if (action === "delete") {
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

document.addEventListener("keydown", (event) => {
  if (/^[0-9.]$/.test(event.key)) addValue(event.key);
  else if (["+", "-", "*", "/"].includes(event.key)) addValue(event.key);
  else if (event.key === "Enter" || event.key === "=") {
    event.preventDefault();
    showResult();
  } else if (event.key === "Backspace") handleAction("delete");
  else if (event.key === "Escape") handleAction("clear");
});

render();

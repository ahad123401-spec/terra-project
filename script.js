"use strict";

/* ==========================================
   COOLCALCULATOR
   Main JavaScript
   ========================================== */


/* ---------- 1. SELECT HTML ELEMENTS ---------- */

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const expressionElement = $("#expression");
const messageElement = $("#display-message");
const themeToggle = $("#theme-toggle");

const historyList = $("#history-list");
const fullHistoryList = $("#full-history-list");
const emptyHistory = $("#empty-history");
const calculationCount = $("#calculation-count");

const clearHistoryButton = $("#clear-history");
const copyResultButton = $("#copy-result");
const exportHistoryButton = $("#export-history");

const keypad = $(".keypad");
const scientificGrid = $(".scientific-grid");
const modeBar = $(".mode-bar");


/* ---------- 2. APPLICATION STATE ---------- */

const STORAGE_KEYS = {
    history: "coolcalculator-history",
    theme: "coolcalculator-theme",
    angleMode: "coolcalculator-angle-mode",
    precision: "coolcalculator-precision"
};

let expression = "";
let lastResult = null;
let justCalculated = false;
let scientificMode = false;

let calculationHistory = loadHistory();

let angleMode = loadSetting(
    STORAGE_KEYS.angleMode,
    "DEG"
);

let decimalPlaces = Number(
    loadSetting(STORAGE_KEYS.precision, "8")
);

let currentPage = "calculator";


/* ---------- 3. SAFE STORAGE HELPERS ---------- */

function loadSetting(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : value;
    } catch {
        return fallback;
    }
}

function saveSetting(key, value) {
    try {
        localStorage.setItem(key, String(value));
    } catch {
        showMessage("Could not save this setting.");
    }
}

function loadHistory() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.history);

        if (!saved) {
            return [];
        }

        const parsed = JSON.parse(saved);

        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function saveHistory() {
    saveSetting(
        STORAGE_KEYS.history,
        JSON.stringify(calculationHistory)
    );
}


/* ---------- 4. MESSAGE DISPLAY ---------- */

function showMessage(message) {
    if (!messageElement) {
        return;
    }

    messageElement.textContent = message;
}

function clearMessage() {
    showMessage("");
}


/* ---------- 5. NUMBER FORMATTING ---------- */

function formatNumber(number) {
    if (!Number.isFinite(number)) {
        return "Error";
    }

    if (Object.is(number, -0)) {
        return "0";
    }

    const rounded = Number(number.toPrecision(12));

    return rounded.toLocaleString("en-US", {
        useGrouping: false,
        maximumFractionDigits: decimalPlaces
    });
}

function updateExpressionDisplay() {
    if (expressionElement) {
        expressionElement.textContent = expression || "0";
    }

    updateMainDisplay();
}

function updateMainDisplay() {
    const display = $(
        "#display, #result, #current-value, .display-value"
    );

    if (!display) {
        return;
    }

    display.textContent = expression || "0";
}


/* ---------- 6. EXPRESSION DISPLAY HELPERS ---------- */

function appendToExpression(value) {
    clearMessage();

    if (justCalculated) {
        if (isOperator(value)) {
            expression = lastResult === null
                ? ""
                : String(lastResult);
        } else {
            expression = "";
        }

        justCalculated = false;
    }

    if (expression.length >= 250) {
        showMessage("Expression is too long.");
        return;
    }

    expression += value;

    updateExpressionDisplay();
}

function clearCalculator() {
    expression = "";
    lastResult = null;
    justCalculated = false;

    clearMessage();
    updateExpressionDisplay();
}

function deleteLastCharacter() {
    if (justCalculated) {
        justCalculated = false;
    }

    expression = expression.slice(0, -1);

    clearMessage();
    updateExpressionDisplay();
}

function isOperator(character) {
    return ["+", "-", "*", "/", "^", "%"].includes(character);
}


/* ---------- 7. MATHEMATICAL FUNCTIONS ---------- */

function factorial(number) {
    if (!Number.isInteger(number) || number < 0) {
        throw new Error(
            "Factorial requires a non-negative integer."
        );
    }

    if (number > 170) {
        throw new Error("Number is too large.");
    }

    let result = 1;

    for (let i = 2; i <= number; i++) {
        result *= i;
    }

    return result;
}

function toRadians(number) {
    return angleMode === "DEG"
        ? number * Math.PI / 180
        : number;
}

function toDegrees(number) {
    return number * 180 / Math.PI;
}

const FUNCTIONS = {
    sin: (x) => Math.sin(toRadians(x)),
    cos: (x) => Math.cos(toRadians(x)),
    tan: (x) => {
        const angle = toRadians(x);

        if (Math.abs(Math.cos(angle)) < 1e-12) {
            throw new Error("Tangent is undefined here.");
        }

        return Math.tan(angle);
    },

    asin: (x) => {
        if (x < -1 || x > 1) {
            throw new Error("Input must be between -1 and 1.");
        }

        const result = Math.asin(x);

        return angleMode === "DEG"
            ? toDegrees(result)
            : result;
    },

    acos: (x) => {
        if (x < -1 || x > 1) {
            throw new Error("Input must be between -1 and 1.");
        }

        const result = Math.acos(x);

        return angleMode === "DEG"
            ? toDegrees(result)
            : result;
    },

    atan: (x) => {
        const result = Math.atan(x);

        return angleMode === "DEG"
            ? toDegrees(result)
            : result;
    },

    sqrt: (x) => {
        if (x < 0) {
            throw new Error("Cannot square-root a negative number.");
        }

        return Math.sqrt(x);
    },

    cbrt: (x) => Math.cbrt(x),

    log: (x) => {
        if (x <= 0) {
            throw new Error("Logarithm requires a positive number.");
        }

        return Math.log10(x);
    },

    ln: (x) => {
        if (x <= 0) {
            throw new Error("Logarithm requires a positive number.");
        }

        return Math.log(x);
    },

    abs: (x) => Math.abs(x),

    exp: (x) => Math.exp(x),

    floor: (x) => Math.floor(x),

    ceil: (x) => Math.ceil(x),

    round: (x) => Math.round(x),

    fact: (x) => factorial(x),

    reciprocal: (x) => {
        if (x === 0) {
            throw new Error("Cannot divide by zero.");
        }

        return 1 / x
    }
};


/* ---------- 8. TOKENIZE THE EXPRESSION ---------- */

function tokenize(input) {
    const tokens = [];

    const pattern =
        /\d+(?:\.\d*)?(?:e[+-]?\d+)?|\.\d+(?:e[+-]?\d+)?|[A-Za-z]+|[()+\-*/^%!]/gy;

    let position = 0;

    while (position < input.length) {
        if (/\s/.test(input[position])) {
            position++;
            continue;
        }

        pattern.lastIndex = position;

        const match = pattern.exec(input);

        if (!match) {
            throw new Error(
                "Invalid character: " + input[position]
            );
        }

        tokens.push(match[0]);
        position = pattern.lastIndex;
    }

    return tokens;
}


/* ---------- 9. INSERT IMPLICIT MULTIPLICATION ---------- */

function isNumberToken(token) {
    return /^(\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(token);
}

function isConstant(token) {
    return ["pi", "e", "ans"].includes(token.toLowerCase());
}

function isFunction(token) {
    return Object.prototype.hasOwnProperty.call(
        FUNCTIONS,
        token.toLowerCase()
    );
}

function prepareTokens(tokens) {
    const result = [];

    for (const token of tokens) {
        const previous = result[result.length - 1];

        if (previous !== undefined) {
            const previousEndsValue =
                isNumberToken(previous) ||
                isConstant(previous) ||
                previous === ")" ||
                previous === "!";

            const currentStartsValue =
                isNumberToken(token) ||
                isConstant(token) ||
                token === "(" ||
                isFunction(token);

            if (previousEndsValue && currentStartsValue) {
                result.push("*");
            }
        }

        result.push(token);
    }

    return result;
}


/* ---------- 10. CONVERT TO REVERSE POLISH NOTATION ---------- */

function precedence(operator) {
    const priorities = {
        "+": 1,
        "-": 1,
        "*": 2,
        "/": 2,
        "%": 2,
        "u+": 3,
        "u-": 3,
        "^": 4,
        "!": 5
    };

    return priorities[operator] ?? 0;
}

function isRightAssociative(operator) {
    return ["^", "u+", "u-"].includes(operator);
}

function toRPN(tokens) {
    const output = [];
    const operators = [];

    let previousType = "start";

    for (const originalToken of tokens) {
        const token = originalToken.toLowerCase();

        if (isNumberToken(token)) {
            output.push(Number(token));
            previousType = "value";
            continue;
        }

        if (isConstant(token)) {
            if (token === "pi") {
                output.push(Math.PI);
            } else if (token === "e") {
                output.push(Math.E);
            } else if (token === "ans") {
                if (lastResult === null) {
                    throw new Error("No previous answer.");
                }

                output.push(lastResult);
            }

            previousType = "value";
            continue;
        }

        if (isFunction(token)) {
            operators.push(token);
            previousType = "function";
            continue;
        }

        if (token === "(") {
            operators.push(token);
            previousType = "leftParen";
            continue;
        }

        if (token === ")") {
            while (
                operators.length &&
                operators[operators.length - 1] !== "("
            ) {
                output.push(operators.pop());
            }

            if (!operators.length) {
                throw new Error("Mismatched parentheses.");
            }

            operators.pop();

            if (
                operators.length &&
                isFunction(operators[operators.length - 1])
            ) {
                output.push(operators.pop());
            }

            previousType = "value";
            continue;
        }

        let operator = token;

        if (
            (operator === "+" || operator === "-") &&
            ["start", "operator", "leftParen", "function"].includes(
                previousType
            )
        ) {
            operator = operator === "+" ? "u+" : "u-";
        }

        if (operator === "!") {
            output.push(operator);
            previousType = "value";
            continue;
        }

        while (operators.length) {
            const top = operators[operators.length - 1];

            if (top === "(") {
                break;
            }

            const topPriority = precedence(top);
            const currentPriority = precedence(operator);

            const shouldPop = isRightAssociative(operator)
                ? currentPriority < topPriority
                : currentPriority <= topPriority;

            if (!shouldPop) {
                break;
            }

            output.push(operators.pop());
        }

        operators.push(operator);
        previousType = "operator";
    }

    while (operators.length) {
        const operator = operators.pop();

        if (operator === "(" || operator === ")") {
            throw new Error("Mismatched parentheses.");
        }

        output.push(operator);
    }

    return output;
}


/* ---------- 11. EVALUATE THE EXPRESSION ---------- */

function evaluateRPN(tokens) {
    const stack = [];

    for (const token of tokens) {
        if (typeof token === "number") {
            stack.push(token);
            continue;
        }

        if (token === "u+" || token === "u-") {
            if (stack.length < 1) {
                throw new Error("Invalid expression.");
            }

            const value = stack.pop();

            stack.push(token === "u-" ? -value : value);
            continue;
        }

        if (token === "!") {
            if (stack.length < 1) {
                throw new Error("Invalid expression.");
            }

            stack.push(factorial(stack.pop()));
            continue;
        }

        if (isFunction(token)) {
            if (stack.length < 1) {
                throw new Error("Invalid function.");
            }

            stack.push(FUNCTIONS[token](stack.pop()));
            continue;
        }

        if (stack.length < 2) {
            throw new Error("Invalid expression.");
        }

        const b = stack.pop();
        const a = stack.pop();

        let result;

        switch (token) {
            case "+":
                result = a + b;
                break;

            case "-":
                result = a - b;
                break;

            case "*":
                result = a * b;
                break;

            case "/":
                if (b === 0) {
                    throw new Error("Cannot divide by zero.");
                }

                result = a / b;
                break;

            case "%":
                if (b === 0) {
                    throw new Error("Cannot divide by zero.");
                }

                result = a % b;
                break;

            case "^":
                result = Math.pow(a, b);
                break;

            default:
                throw new Error("Unknown operator.");
        }

        if (!Number.isFinite(result)) {
            throw new Error("Result is outside the supported range.");
        }

        stack.push(result);
    }

    if (stack.length !== 1) {
        throw new Error("Invalid expression.");
    }

    return stack[0];
}

function calculate(input) {
    const tokens = prepareTokens(tokenize(input));

    if (!tokens.length) {
        throw new Error("Enter a calculation first.");
    }

    return evaluateRPN(toRPN(tokens));
}


/* ---------- 12. RUN A CALCULATION ---------- */

function calculateResult() {
    if (!expression.trim()) {
        showMessage("Enter a calculation first.");
        return;
    }

    const originalExpression = expression;

    try {
        const result = calculate(originalExpression);

        lastResult = result;
        expression = formatNumber(result);
        justCalculated = true;

        addHistory(originalExpression, result);

        updateExpressionDisplay();
        showMessage("Calculated successfully.");
    } catch (error) {
        showMessage(error.message || "Invalid calculation.");
    }
}


/* ---------- 13. CALCULATION HISTORY ---------- */

function addHistory(originalExpression, result) {
    const item = {
        id: Date.now() + Math.random(),
        expression: originalExpression,
        result: result,
        timestamp: new Date().toISOString()
    };

    calculationHistory.unshift(item);

    // Keep the latest 100 calculations.
    calculationHistory = calculationHistory.slice(0, 100);

    saveHistory();
    renderHistory();
}

function renderHistory() {
    renderHistoryList(historyList);
    renderHistoryList(fullHistoryList);

    if (emptyHistory) {
        emptyHistory.hidden = calculationHistory.length > 0;
    }

    if (calculationCount) {
        calculationCount.textContent =
            calculationHistory.length + " calculations";
    }
}

function renderHistoryList(container) {
    if (!container) {
        return;
    }

    container.replaceChildren();

    calculationHistory.forEach((item) => {
        const entry = document.createElement("div");
        entry.className = "history-item";

        const calculation = document.createElement("p");
        calculation.textContent = item.expression;

        const result = document.createElement("strong");
        result.textContent = "= " + formatNumber(item.result);

        const date = document.createElement("p");
        date.textContent = new Date(item.timestamp).toLocaleString();

        const reuseButton = document.createElement("button");
        reuseButton.type = "button";
        reuseButton.textContent = "Use result";

        reuseButton.addEventListener("click", () => {
            expression = String(item.result);
            lastResult = item.result;
            justCalculated = true;

            showPage("calculator");
            updateExpressionDisplay();
            clearMessage();
        });

        entry.append(calculation, result, date, reuseButton);
        container.appendChild(entry);
    });
}

function clearHistory() {
    const confirmed = window.confirm(
        "Delete all calculation history?"
    );

    if (!confirmed) {
        return;
    }

    calculationHistory = [];

    saveHistory();
    renderHistory();

    showMessage("History cleared.");
}


/* ---------- 14. COPY RESULT ---------- */

async function copyResult() {
    const value = justCalculated
        ? String(lastResult)
        : expression;

    if (!value) {
        showMessage("Nothing to copy.");
        return;
    }

    try {
        await navigator.clipboard.writeText(value);
        showMessage("Copied to clipboard.");
    } catch {
        const temporaryInput = document.createElement("textarea");

        temporaryInput.value = value;
        document.body.appendChild(temporaryInput);

        temporaryInput.select();

        const successful = document.execCommand("copy");

        temporaryInput.remove();

        showMessage(
            successful
                ? "Copied to clipboard."
                : "Copy failed. Please copy manually."
        );
    }
}


/* ---------- 15. EXPORT HISTORY ---------- */

function exportHistory() {
    if (!calculationHistory.length) {
        showMessage("There is no history to export.");
        return;
    }

    const rows = [
        ["Expression", "Result", "Date"]
    ];

    calculationHistory.forEach((item) => {
        rows.push([
            item.expression,
            item.result,
            item.timestamp
        ]);
    });

    const csv = rows.map((row) =>
        row.map((value) => {
            const safeValue = String(value).replace(/"/g, '""');
            return '"' + safeValue + '"';
        }).join(",")
    ).join("\r\n");

    const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "coolcalculator-history.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    showMessage("History exported.");
}


/* ---------- 16. THEME TOGGLE ---------- */

function applyTheme(theme) {
    const selectedTheme = theme === "light" ? "light" : "dark";

    document.body.dataset.theme = selectedTheme;
    document.documentElement.dataset.theme = selectedTheme;

    if (themeToggle) {
        themeToggle.setAttribute(
            "aria-label",
            selectedTheme === "dark"
                ? "Switch to light theme"
                : "Switch to dark theme"
        );

        themeToggle.textContent =
            selectedTheme === "dark" ? "☀️" : "🌙";
    }

    saveSetting(STORAGE_KEYS.theme, selectedTheme);
}

function initializeTheme() {
    const savedTheme = loadSetting(STORAGE_KEYS.theme, null);

    if (savedTheme === "light" || savedTheme === "dark") {
        applyTheme(savedTheme);
        return;
    }

    const systemPrefersLight = window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: light)").matches;

    applyTheme(systemPrefersLight ? "light" : "dark");
}

if (themeToggle) {
    themeToggle.addEventListener("click", () => {
        const currentTheme =
            document.documentElement.dataset.theme || "dark";

        applyTheme(currentTheme === "dark" ? "light" : "dark");
    });
}


/* ---------- 17. BASIC AND SCIENTIFIC MODE ---------- */

function setScientificMode(enabled) {
    scientificMode = enabled;

    if (scientificGrid) {
        scientificGrid.hidden = !enabled;
    }

    if (modeBar) {
        modeBar.querySelectorAll("button").forEach((button) => {
            const label = button.textContent.toLowerCase();

            const isScientific = label.includes("scientific");

            button.classList.toggle(
                "active",
                isScientific === enabled
            );
        });
    }
}

if (modeBar) {
    modeBar.addEventListener("click", (event) => {
        const button = event.target.closest("button");

        if (!button) {
            return;
        }

        const label = button.textContent.toLowerCase();

        if (label.includes("scientific")) {
            setScientificMode(true);
        } else if (label.includes("basic")) {
            setScientificMode(false);
        }
    });
}


/* ---------- 18. BUTTON INPUT ---------- */

function handleCalculatorButton(button) {
    const action = button.dataset.action;
    const value = button.dataset.value;
    const label = button.textContent.trim();

    if (action === "clear" || label === "AC" || label === "C") {
        clearCalculator();
        return;
    }

    if (action === "delete" || label === "DEL" || label === "⌫") {
        deleteLastCharacter();
        return;
    }

    if (
        action === "calculate" ||
        label === "=" ||
        label.toLowerCase() === "enter"
    ) {
        calculateResult();
        return;
    }

    if (action === "copy") {
        copyResult();
        return;
    }

    if (action === "toggle-sign") {
        if (expression) {
            expression = "-(" + expression + ")";
            updateExpressionDisplay();
        }

        return;
    }

    if (action === "square") {
        appendToExpression("^2");
        return;
    }

    if (action === "square-root") {
        appendToExpression("sqrt(");
        return;
    }

    if (action === "pi") {
        appendToExpression("pi");
        return;
    }

    if (action === "ans") {
        appendToExpression("ans");
        return;
    }

    if (action === "factorial") {
        appendToExpression("!");
        return;
    }

    if (action === "decimal") {
        appendToExpression(".");
        return;
    }

    if (action === "operator") {
        appendToExpression(value || label);
        return;
    }

    if (action === "number") {
        appendToExpression(value || label);
        return;
    }

    // Recognize common calculator button labels.
    const normalized = label.toLowerCase();

    const functionAliases = {
        "sin": "sin(",
        "cos": "cos(",
        "tan": "tan(",
        "asin": "asin(",
        "acos": "acos(",
        "atan": "atan(",
        "√": "sqrt(",
        "sqrt": "sqrt(",
        "∛": "cbrt(",
        "log": "log(",
        "ln": "ln(",
        "abs": "abs(",
        "exp": "exp(",
        "π": "pi",
        "e": "e",
        "x²": "^2",
        "xʸ": "^",
        "n!": "!",
        "÷": "/",
        "×": "*",
        "−": "-",
        "−/+": "-"
    };

    if (functionAliases[normalized] !== undefined) {
        appendToExpression(functionAliases[normalized]);
        return;
    }

    if (/^\d+$/.test(label) || label === ".") {
        appendToExpression(label);
        return;
    }

    if (isOperator(label)) {
        appendToExpression(label);
        return;
    }

    if (["(", ")", "%", "^", "*", "/", "+", "-"].includes(label)) {
        appendToExpression(label);
    }
}

function attachKeypadEvents(container) {
    if (!container) {
        return;
    }

    container.addEventListener("click", (event) => {
        const button = event.target.closest("button");

        if (!button || !container.contains(button)) {
            return;
        }

        if (button.disabled) {
            return;
        }

        handleCalculatorButton(button);
    });
}

attachKeypadEvents(keypad);
attachKeypadEvents(scientificGrid);


/* ---------- 19. KEYBOARD SUPPORT ---------- */

document.addEventListener("keydown", (event) => {
    const target = event.target;

    if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
    ) {
        return;
    }

    if (/^\d$/.test(event.key)) {
        appendToExpression(event.key);
        return;
    }

    if (["+", "-", "*", "/", "^", "%", "(", ")"].includes(event.key)) {
        appendToExpression(event.key);
        return;
    }

    if (event.key === ".") {
        appendToExpression(".");
        return;
    }

    if (event.key === "Enter" || event.key === "=") {
        event.preventDefault();
        calculateResult();
        return;
    }

    if (event.key === "Backspace") {
        deleteLastCharacter();
        return;
    }

    if (event.key === "Escape") {
        clearCalculator();
        return;
    }
});


/* ---------- 20. PAGE NAVIGATION ---------- */

function showPage(pageName) {
    currentPage = pageName;

    const pages = {
        calculator: $("#calculator-page"),
        history: $("#history-page"),
        settings: $("#settings-page")
    };

    Object.entries(pages).forEach(([name, element]) => {
        if (element) {
            element.hidden = name !== pageName;
        }
    });

    $$(".nav-links button").forEach((button) => {
        const label = button.textContent.toLowerCase();

        const active =
            label.includes(pageName) ||
            (pageName === "calculator" && label.includes("home"));

        button.classList.toggle("active", active);
        button.setAttribute("aria-current", active ? "page" : "false");
    });

    if (pageName === "history") {
        renderHistory();
    }

    clearMessage();
}

$$("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
        showPage(button.dataset.page);
    });
});

$$(".nav-links button").forEach((button) => {
    button.addEventListener("click", () => {
        const label = button.textContent.toLowerCase();

        if (label.includes("history")) {
            showPage("history");
        } else if (label.includes("setting")) {
            showPage("settings");
        } else if (
            label.includes("calculator") ||
            label.includes("home")
        ) {
            showPage("calculator");
        }
    });
});


/* ---------- 21. SETTINGS ---------- */

const angleSelect = $("#angle-mode");
const precisionSelect = $("#decimal-precision");

function initializeSettings() {
    if (angleSelect) {
        angleSelect.value = angleMode;

        angleSelect.addEventListener("change", () => {
            angleMode = angleSelect.value === "RAD" ? "RAD" : "DEG";

            saveSetting(STORAGE_KEYS.angleMode, angleMode);

            showMessage("Angle mode: " + angleMode);
        });
    }

    if (precisionSelect) {
        precisionSelect.value = String(decimalPlaces);

        precisionSelect.addEventListener("change", () => {
            const selected = Number(precisionSelect.value);

            if (
                Number.isInteger(selected) &&
                selected >= 0 &&
                selected <= 12
            ) {
                decimalPlaces = selected;

                saveSetting(
                    STORAGE_KEYS.precision,
                    decimalPlaces
                );

                updateExpressionDisplay();
                showMessage("Decimal precision updated.");
            }
        });
    }
}


/* ---------- 22. CONNECT HISTORY BUTTONS ---------- */

if (clearHistoryButton) {
    clearHistoryButton.addEventListener("click", clearHistory);
}

if (copyResultButton) {
    copyResultButton.addEventListener("click", copyResult);
}

if (exportHistoryButton) {
    exportHistoryButton.addEventListener("click", exportHistory);
}


/* ---------- 23. INITIALIZE APPLICATION ---------- */

function initializeCalculator() {
    initializeTheme();
    initializeSettings();

    if (scientificGrid) {
        scientificGrid.hidden = true;
    }

    updateExpressionDisplay();
    renderHistory();
    showPage("calculator");

    console.log("CoolCalculator initialized successfully.");
}

initializeCalculator();





    


















// --- DOM elements ---
const commentInput = document.getElementById("commentInput");
const predictButton = document.getElementById("predictButton");
const resultDiv = document.getElementById("result");

const scoreBar = document.getElementById("scoreBar");
const debugFeaturesList = document.getElementById("debugFeatures");
const explanationList = document.getElementById("explanationList");
const historyBody = document.querySelector("#historyTable tbody");

// --- Extract "features" from text ---
function extractFeatures(text) {
  const length = text.length;

  // Split in words
  const words = text.trim().split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;

  // Positive / negative words
  const positiveWords =
    /love|great|amazing|awesome|nice|cool|happy|wow|excited|fantastic|excellent/i;
  const negativeWords =
    /hate|terrible|awful|bad|boring|angry|sad|disappointed|horrible|annoying/i;

  const hasPositive = positiveWords.test(text);
  const hasNegative = negativeWords.test(text);

  // Exclamation marks
  const exclamations = (text.match(/!/g) || []).length;

  // Question marks
  const questions = (text.match(/\?/g) || []).length;

  // Emojis (very rough range but ok for demo)
  const emojiPattern = /[\u{1F300}-\u{1FAFF}]/gu;
  const emojis = (text.match(emojiPattern) || []).length;

  // "Shouting" (words in full caps, length > 3)
  const upperWords = words.filter(
    (w) => w.length > 3 && w === w.toUpperCase()
  ).length;

  return {
    length,
    wordCount,
    hasPositive,
    hasNegative,
    exclamations,
    questions,
    emojis,
    upperWords,
  };
}

// --- Rule-based "model" ---
function predictEngagement(features) {
  const {
    length,
    wordCount,
    hasPositive,
    hasNegative,
    exclamations,
    questions,
    emojis,
    upperWords,
  } = features;

  let score = 0;

  // Positive / negative signals
  if (hasPositive) score += 1;
  if (hasNegative) score -= 1;

  // Exclamation marks: emocionan, pero sin exagerar
  if (exclamations >= 1) score += 0.3;
  if (exclamations >= 3) score += 0.2;

  // Questions: indican interacción / interés
  if (questions >= 1) score += 0.5;

  // Emojis: comunican emoción visual
  if (emojis >= 1) score += 0.4;
  if (emojis >= 3) score += 0.2;

  // Uppercase "SHOUTING": puede percibirse agresivo
  if (upperWords >= 2) score -= 0.5;

  // Length in words
  if (wordCount < 3) score -= 1; // casi nada escrito
  else if (wordCount <= 20) score += 0.5; // corto y directo
  else if (wordCount > 40) score -= 0.5; // demasiado largo quizá

  // Length in characters (suaviza un poco)
  if (length > 260) score -= 0.3;
  if (length > 400) score -= 0.4;

  // Convert score -> label
  let label;
  if (score >= 2) label = "High";
  else if (score >= 0.5) label = "Medium";
  else label = "Low";

  return { label, score };
}

// --- Helpers UI ---

function updateScoreBar(score) {
  // Estimación de rango posible del score para normalizar
  const minScore = -2;
  const maxScore = 4;
  let normalized = (score - minScore) / (maxScore - minScore);
  normalized = Math.max(0, Math.min(normalized, 1));

  scoreBar.style.width = normalized * 100 + "%";
}

function renderDebugFeatures(features, score, label) {
  debugFeaturesList.innerHTML = `
    <li>Characters length: <strong>${features.length}</strong></li>
    <li>Word count: <strong>${features.wordCount}</strong></li>
    <li>Has positive words: <strong>${features.hasPositive}</strong></li>
    <li>Has negative words: <strong>${features.hasNegative}</strong></li>
    <li>Exclamation marks: <strong>${features.exclamations}</strong></li>
    <li>Question marks: <strong>${features.questions}</strong></li>
    <li>Emojis: <strong>${features.emojis}</strong></li>
    <li>Uppercase words: <strong>${features.upperWords}</strong></li>
    <li>Score (internal): <strong>${score.toFixed(2)}</strong></li>
    <li>Label: <strong>${label}</strong></li>
  `;
}

function renderExplanation(features, score) {
  const explanation = [];

  if (features.hasPositive)
    explanation.push("Contains positive words 🙂 (love, great, amazing, etc.)");

  if (features.hasNegative)
    explanation.push(
      "Contains negative words 😕 (hate, terrible, boring, etc.)"
    );

  if (features.exclamations >= 1)
    explanation.push(
      `Has ${features.exclamations} exclamation mark(s) ❗ (adds excitement)`
    );

  if (features.questions >= 1)
    explanation.push(
      `Has ${features.questions} question mark(s) ❓ (can invite interaction)`
    );

  if (features.emojis >= 1)
    explanation.push(
      `Includes ${features.emojis} emoji(s) ✨ (expressive and visual)`
    );

  if (features.upperWords >= 2)
    explanation.push(
      `Uses ${features.upperWords} UPPERCASE word(s) 😬 (might feel like shouting)`
    );

  if (features.wordCount < 3)
    explanation.push("Very short comment (hard to engage with).");

  if (features.wordCount >= 3 && features.wordCount <= 20)
    explanation.push("Short and direct length (often engaging).");

  if (features.wordCount > 40)
    explanation.push("Quite long comment (some people may skip it).");

  if (explanation.length === 0) {
    explanation.push(
      "No strong signals detected. Try adding emotion, emojis, or questions."
    );
  }

  explanation.push(`Final score: ${score.toFixed(2)} (higher = more engaging)`);

  explanationList.innerHTML = explanation
    .map((line) => `<li>${line}</li>`)
    .join("");
}

function addToHistory(text, label) {
  const row = document.createElement("tr");
  const short =
    text.length > 80 ? text.slice(0, 77).replace(/\s+$/, "") + "..." : text;

  row.innerHTML = `
    <td>${short}</td>
    <td>${label}</td>
  `;
  // Más reciente arriba
  historyBody.prepend(row);
}

// --- Button action ---
predictButton.addEventListener("click", () => {
  const text = commentInput.value.trim();

  if (text === "") {
    resultDiv.textContent = "Please write something first 🙂";
    resultDiv.className = "result neutral";
    scoreBar.style.width = "0%";
    debugFeaturesList.innerHTML = "";
    explanationList.innerHTML = "";
    return;
  }

  const features = extractFeatures(text);
  const { label, score } = predictEngagement(features);

  // Resultado principal
  resultDiv.textContent = `Predicted engagement: ${label}`;
  resultDiv.className = "result " + label.toLowerCase();

  // Actualizar barra, debug, explicación, historial
  updateScoreBar(score);
  renderDebugFeatures(features, score, label);
  renderExplanation(features, score);
  addToHistory(text, label);
});
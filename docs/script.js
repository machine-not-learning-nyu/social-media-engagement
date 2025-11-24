// --- DOM elements ---
const commentInput = document.getElementById("commentInput");
const predictButton = document.getElementById("predictButton");
const resultDiv = document.getElementById("result");

// --- Extract simple "features" from text ---
function extractFeatures(text) {
  const length = text.length;

  const positiveWords = /love|great|amazing|awesome|nice|cool|happy|wow|excited/i;
  const negativeWords = /hate|terrible|awful|bad|boring|angry|sad|disappointed/i;

  const hasPositive = positiveWords.test(text);
  const hasNegative = negativeWords.test(text);

  const exclamations = (text.match(/!/g) || []).length;

  return {
    length,
    hasPositive,
    hasNegative,
    exclamations,
  };
}

// --- Mini "model" (rule-based prediction) ---
function predictEngagement({ length, hasPositive, hasNegative, exclamations }) {
  let score = 0;

  // Positive/negative signals
  if (hasPositive) score += 1;
  if (hasNegative) score -= 1;

  // Exclamation marks
  if (exclamations >= 2) score += 0.5;

  // Length effects
  if (length > 260) score -= 0.5;
  if (length > 400) score -= 1;
  if (length < 20) score -= 0.5;

  // Final label
  if (score >= 1) return "High";
  if (score >= 0) return "Medium";
  return "Low";
}

// --- Button action ---
predictButton.addEventListener("click", () => {
  const text = commentInput.value.trim();

  if (text === "") {
    resultDiv.textContent = "Please write something first 🙂";
    resultDiv.className = "result neutral";
    return;
  }

  const features = extractFeatures(text);
  const prediction = predictEngagement(features);

  resultDiv.textContent = `Predicted engagement: ${prediction}`;
  resultDiv.className = "result " + prediction.toLowerCase();
});
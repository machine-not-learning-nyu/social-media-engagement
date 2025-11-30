// --- DOM elements ---
const commentInput = document.getElementById("commentInput");
const predictButton = document.getElementById("predictButton");
const resultDiv = document.getElementById("result");

const scoreBarNA = document.getElementById("scoreBarNA");
const scoreBarEU = document.getElementById("scoreBarEU");

const debugFeaturesList = document.getElementById("debugFeatures");
const explanationList = document.getElementById("explanationList");
const historyBody = document.querySelector("#historyTable tbody");

// --- Extract "features" from text ---
function extractFeatures(text) {
  const length = text.length;

  // Split in words
  const words = text.trim().split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;

  // Positive / negative words (NORTH AMERICA model only)
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

  // Hashtags (simple regex)
  const hashtagMatches = text.match(/#\w+/g) || [];
  const hashtagCount = hashtagMatches.length;

  // Better hashtags for Europe: #love, #travel, #music
  let goodHashtags = 0;
  hashtagMatches.forEach((tag) => {
    if (/#(love|travel|music)\b/i.test(tag)) {
      goodHashtags++;
    }
  });

  return {
    length,
    wordCount,
    hasPositive,
    hasNegative,
    exclamations,
    questions,
    emojis,
    upperWords,
    hashtagCount,
    goodHashtags,
  };
}

// --- Rule-based "model" for NORTH AMERICA (igual que antes) ---
function predictEngagementNorthAmerica(features) {
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

// --- Rule-based "model" for EUROPE ---
function predictEngagementEurope(features) {
  const {
    length,
    wordCount,
    emojis,
    hashtagCount,
    goodHashtags,
    upperWords,
  } = features;

  let score = 0;

  // 1) TEXT RICHNESS (word count bins)
  // (0,10] ~59   (10,20] ~66.5   (20,30] ~73.7
  if (wordCount === 0) {
    score -= 1.0; // no text at all
  } else if (wordCount <= 10) {
    score -= 0.3; // muy corto
  } else if (wordCount <= 20) {
    score += 0.5; // buen rango
  } else if (wordCount <= 30) {
    score += 1.0; // mejor rango
  } else if (wordCount <= 50) {
    score += 0.4; // sigue ok
  } else {
    score += 0.2; // muy largo, pero hay riqueza
  }

  // 2) Text length in characters 30–59: pequeño bonus extra
  if (length >= 30 && length <= 59) {
    score += 0.3;
  }

  // 3) Emojis (4–5 es lo mejor)
  if (emojis === 0) {
    // sin bonus
  } else if (emojis >= 1 && emojis <= 3) {
    score += 0.3;
  } else if (emojis === 4) {
    score += 0.7;
  } else if (emojis >= 5) {
    score += 1.0; // mejor caso (90.3)
  }

  // 4) Hashtag count (2 es el mejor caso)
  if (hashtagCount === 2) {
    score += 0.6;
  } else if (hashtagCount === 1 || hashtagCount === 3) {
    score += 0.3;
  } else if (hashtagCount >= 4) {
    // un poco saturado de hashtags
    score -= 0.2;
  }

  // 5) Better hashtags: #love, #travel, #music
  if (goodHashtags > 0) {
    const capped = Math.min(goodHashtags, 2);
    score += capped * 0.2;
  }

  // 6) Uppercase "SHOUTING": se mantiene como algo negativo
  if (upperWords >= 2) {
    score -= 0.4;
  }

  // 7) Texto extremadamente largo
  if (length > 600) {
    score -= 0.3;
  }

  // Convert score -> label (mismos umbrales que NA)
  let label;
  if (score >= 2) label = "High";
  else if (score >= 0.5) label = "Medium";
  else label = "Low";

  return { label, score };
}

// --- Helpers UI ---

function updateScoreBar(element, score, minScore, maxScore) {
  let normalized = (score - minScore) / (maxScore - minScore);
  normalized = Math.max(0, Math.min(normalized, 1));
  element.style.width = normalized * 100 + "%";
}

function updateScoreBars(naScore, euScore) {
  const minScore = -2;
  const maxScore = 4;
  updateScoreBar(scoreBarNA, naScore, minScore, maxScore);
  updateScoreBar(scoreBarEU, euScore, minScore, maxScore);
}

function clearScoreBars() {
  scoreBarNA.style.width = "0%";
  scoreBarEU.style.width = "0%";
}

function renderDebugFeatures(features, naResult, euResult) {
  debugFeaturesList.innerHTML = `
    <li>Characters length: <strong>${features.length}</strong></li>
    <li>Word count: <strong>${features.wordCount}</strong></li>
    <li>Has positive words: <strong>${features.hasPositive}</strong> (NA only)</li>
    <li>Has negative words: <strong>${features.hasNegative}</strong> (NA only)</li>
    <li>Exclamation marks: <strong>${features.exclamations}</strong></li>
    <li>Question marks: <strong>${features.questions}</strong></li>
    <li>Emojis: <strong>${features.emojis}</strong></li>
    <li>Hashtags: <strong>${features.hashtagCount}</strong></li>
    <li>“Better” hashtags (#love, #travel, #music) — <em>Europe only</em>: <strong>${features.goodHashtags}</strong></li>
    <li>Uppercase words: <strong>${features.upperWords}</strong></li>
    <li>North America score: <strong>${naResult.score.toFixed(2)} (${naResult.label})</strong></li>
    <li>Europe score: <strong>${euResult.score.toFixed(2)} (${euResult.label})</strong></li>
  `;
}

function renderExplanation(features, naResult, euResult) {
  const naExp = [];
  const euExp = [];

  // --- NORTH AMERICA explanation (igual que antes) ---
  if (features.hasPositive)
    naExp.push("Contains positive words 🙂 (love, great, amazing, etc.).");

  if (features.hasNegative)
    naExp.push("Contains negative words 😕 (hate, terrible, boring, etc.).");

  if (features.exclamations >= 1)
    naExp.push(
      `Has ${features.exclamations} exclamation mark(s) ❗ (adds excitement).`
    );

  if (features.questions >= 1)
    naExp.push(
      `Has ${features.questions} question mark(s) ❓ (can invite interaction).`
    );

  if (features.emojis >= 1)
    naExp.push(
      `Includes ${features.emojis} emoji(s) ✨ (expressive and visual).`
    );

  if (features.upperWords >= 2)
    naExp.push(
      `Uses ${features.upperWords} UPPERCASE word(s) 😬 (might feel like shouting).`
    );

  if (features.wordCount < 3)
    naExp.push("Very short comment (hard to engage with).");

  if (features.wordCount >= 3 && features.wordCount <= 20)
    naExp.push("Short and direct length (often engaging).");

  if (features.wordCount > 40)
    naExp.push("Quite long comment (some people may skip it).");

  if (naExp.length === 0) {
    naExp.push(
      "No strong signals detected. Try adding emotion, emojis, or questions."
    );
  }

  naExp.push(
    `Final North America score: ${naResult.score.toFixed(
      2
    )} (higher = more engaging).`
  );
  naExp.push(`North America label: ${naResult.label}.`);

  // --- EUROPE explanation (text richness, emojis, hashtags) ---
  // Word count
  if (features.wordCount <= 10)
    euExp.push(
      "For Europe, this post is quite short. Posts with around 20–30 words tend to perform better."
    );
  else if (features.wordCount <= 20)
    euExp.push(
      "Word count is in a good range for Europe (10–20 words, decent richness)."
    );
  else if (features.wordCount <= 30)
    euExp.push(
      "Great text richness for Europe (20–30 words, best-performing range)."
    );
  else
    euExp.push(
      "The post is quite detailed. Europe model values richness, even if it goes beyond 30 words."
    );

  // Characters length 30–59
  if (features.length >= 30 && features.length <= 59) {
    euExp.push(
      "Character length is between 30 and 59, which often balances brevity and richness."
    );
  }

  // Emojis
  if (features.emojis === 0)
    euExp.push("No emojis used. A few emojis can help draw attention in Europe.");
  else if (features.emojis >= 1 && features.emojis <= 3)
    euExp.push(
      `${features.emojis} emoji(s) used: this adds some visual appeal for European audiences.`
    );
  else if (features.emojis === 4)
    euExp.push(
      "Uses 4 emojis: this is a very strong range for engagement in Europe."
    );
  else if (features.emojis >= 5)
    euExp.push(
      `Uses ${features.emojis} emojis: high emoji usage, which correlates with very strong engagement in Europe.`
    );

  // Hashtags
  if (features.hashtagCount === 0)
    euExp.push("No hashtags. In Europe, 1–2 relevant hashtags can help.");
  else if (features.hashtagCount === 1)
    euExp.push("Uses 1 hashtag: decent, but 2 hashtags tends to perform best.");
  else if (features.hashtagCount === 2)
    euExp.push("Uses 2 hashtags: best-performing hashtag count in your data.");
  else if (features.hashtagCount === 3)
    euExp.push(
      "Uses 3 hashtags: still okay, but slightly above the sweet spot of 2."
    );
  else if (features.hashtagCount >= 4)
    euExp.push(
      `Uses ${features.hashtagCount} hashtags: this may look a bit spammy for some users.`
    );

  // Better hashtags
  if (features.goodHashtags > 0)
    euExp.push(
      `Includes top-performing hashtags like #love, #travel or #music (${features.goodHashtags} found).`
    );

  // Uppercase
  if (features.upperWords >= 2)
    euExp.push(
      `Contains ${features.upperWords} UPPERCASE words, which can feel a bit aggressive.`
    );

  // Sentiment note
  euExp.push(
    "Europe model ignores positive/negative words and focuses on text richness, emojis and hashtags."
  );

  euExp.push(
    `Final Europe score: ${euResult.score.toFixed(
      2
    )} (higher = more engaging).`
  );
  euExp.push(`Europe label: ${euResult.label}.`);

  // --- Render combined explanation ---
  let html = "";

  html += "<li><strong>North America model</strong></li>";
  naExp.forEach((line) => {
    html += `<li>${line}</li>`;
  });

  html += "<li><strong>Europe model</strong></li>";
  euExp.forEach((line) => {
    html += `<li>${line}</li>`;
  });

  explanationList.innerHTML = html;
}

function addToHistory(text, naLabel, euLabel) {
  const row = document.createElement("tr");
  const short =
    text.length > 80 ? text.slice(0, 77).replace(/\s+$/, "") + "..." : text;

  row.innerHTML = `
    <td>${short}</td>
    <td>${naLabel}</td>
    <td>${euLabel}</td>
  `;
  historyBody.prepend(row);
}

// --- Button action ---
predictButton.addEventListener("click", () => {
  const text = commentInput.value.trim();

  if (text === "") {
    resultDiv.textContent = "Please write something first 🙂";
    resultDiv.className = "result neutral";
    clearScoreBars();
    debugFeaturesList.innerHTML = "";
    explanationList.innerHTML = "";
    return;
  }

  const features = extractFeatures(text);

  const naResult = predictEngagementNorthAmerica(features);
  const euResult = predictEngagementEurope(features);

  // Resultado principal (mostrar ambos)
  resultDiv.textContent = `Predicted engagement — North America: ${naResult.label} | Europe: ${euResult.label}`;
  resultDiv.className = "result " + naResult.label.toLowerCase();

  // Actualizar barras
  updateScoreBars(naResult.score, euResult.score);

  // Debug, explicación, historial
  renderDebugFeatures(features, naResult, euResult);
  renderExplanation(features, naResult, euResult);
  addToHistory(text, naResult.label, euResult.label);
});

const MODEL_URL =
  "https://teachablemachine.withgoogle.com/models/Ex2aL2FUE/";

let model = null;

// Load the Teachable Machine model
export async function loadAIModel() {
  if (model) return model;

  if (!window.tmImage) {
    throw new Error(
      "AI library not loaded. Check user.html script imports."
    );
  }

  model = await window.tmImage.load(
    MODEL_URL + "model.json",
    MODEL_URL + "metadata.json"
  );

  console.log("ReWear AI model loaded successfully!");

  return model;
}

// Analyze uploaded cloth image
export async function analyzeCloth(imageElement) {
  const loadedModel = await loadAIModel();

  const predictions = await loadedModel.predict(imageElement);

  if (!predictions || predictions.length === 0) {
    throw new Error("AI could not analyze this image.");
  }

  // Get prediction with highest probability
  const bestPrediction = predictions.reduce((best, current) =>
    current.probability > best.probability ? current : best
  );

  const prediction = bestPrediction.className
    .trim()
    .toUpperCase();

  const validClasses = ["GOOD", "AVERAGE", "DAMAGED"];

  if (!validClasses.includes(prediction)) {
    throw new Error(
      "Unexpected AI class: " + prediction +
      ". Check your Teachable Machine class names."
    );
  }

  return {
    prediction,
    confidence: bestPrediction.probability
  };
}

// Recommendation based on confirmed condition
export function getRecommendation(condition) {
  const value = condition.toUpperCase();

  if (value === "GOOD") {
    return ["DONATION", "HANDCRAFT"];
  }

  if (value === "AVERAGE") {
    return ["HANDCRAFT", "DONATION"];
  }

  if (value === "DAMAGED") {
    return ["RECYCLE", "SELL TO COMPANY"];
  }

  return [];
}

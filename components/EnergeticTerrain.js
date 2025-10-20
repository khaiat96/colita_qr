import React from "react";
import "./EnergeticTerrain.css";

export default function EnergeticTerrain({ patternScores, primaryPattern }) {
  // Normalize values 0–10
  const normalize = (val) => Math.min(10, Math.max(0, val || 0));
  const temp = normalize(patternScores.calor - patternScores.frio + 5);
  const moist = normalize(patternScores.humedad - patternScores.sequedad + 5);
  const tone = normalize(patternScores.tension - patternScores.relajacion + 5);

  // Position the dot (simple 2D projection for now)
  const left = `${50 + (temp - 5) * 5}%`;     // X = temperature
  const top = `${50 - (moist - 5) * 5}%`;     // Y = moisture
  const dotColor = "#f08080"; // can vary by pattern

  return (
    <div className="terrain-container">
      <div className="axis-label temp">🔥 Calor ↔ ❄️ Frío</div>
      <div className="axis-label moist">💧 Humedad ↔ 🌵 Sequedad</div>
      <div className="axis-label tone">🌪️ Tensión ↔ 🌾 Relajación</div>

      <div className="terrain-grid">
        <div className="terrain-dot" style={{ left, top, background: dotColor }} />
      </div>
    </div>
  );
}

// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";

import LandingPage from "./LandingPage";
import Projects from "./Projects";
import DinoModesPage from "./dino-game/DinoModesPage";
// import AIRacerPage from "./ai-racer/AIRacerPage"; // Coming soon
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/dino-game" element={<DinoModesPage />} />
        {/* <Route path="/ai-racer" element={<AIRacerPage />} /> */}
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
);

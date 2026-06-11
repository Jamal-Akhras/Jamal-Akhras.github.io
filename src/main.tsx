// src/main.tsx
import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";

import LandingPage from "./LandingPage";
import "./index.css";

// Heavy routes (pixi / matter / neataptic, framer-motion) are code-split so the
// landing page doesn't download them up front.
const Projects = lazy(() => import("./Projects"));
const DinoModesPage = lazy(() => import("./dino-game/DinoModesPage"));
const AIRacerPage = lazy(() => import("./ai-racer/AIRacerPage"));

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center text-text-secondary">
    Loading…
  </div>
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/dino-game" element={<DinoModesPage />} />
          <Route path="/ai-racer" element={<AIRacerPage />} />
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </Suspense>
    </HashRouter>
  </React.StrictMode>
);

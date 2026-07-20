// src/main.tsx
import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";

import LandingPage from "./LandingPage";
import NotFound from "./NotFound";
import RouteFallback from "./components/RouteFallback";
import "./index.css";

// Heavy routes (pixi / matter / neataptic, framer-motion) are code-split so the
// landing page doesn't download them up front.
const Projects = lazy(() => import("./Projects"));
const CVPage = lazy(() => import("./CVPage"));
const DinoModesPage = lazy(() => import("./dino-game/DinoModesPage"));
const AIRacerPage = lazy(() => import("./ai-racer/AIRacerPage"));
const SearchStrategyVisualizer = lazy(() => import("./search-visualizer/SearchStrategyVisualizer"));

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/experience" element={<CVPage />} />
          <Route path="/cv" element={<CVPage />} />
          <Route path="/dino-game" element={<DinoModesPage />} />
          <Route path="/ai-racer" element={<AIRacerPage />} />
          <Route path="/search-visualizer" element={<SearchStrategyVisualizer />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </HashRouter>
  </React.StrictMode>
);

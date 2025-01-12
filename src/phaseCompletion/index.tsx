import React from "react";
import { createRoot } from "react-dom/client";
import PhaseCompletion from "./phaseCompletion";
import "../assets/tailwind.css";

const root = createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    <PhaseCompletion />
  </React.StrictMode>
); 
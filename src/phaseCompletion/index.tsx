import React from "react";
import { createRoot } from "react-dom/client";
import { PomodoroProvider } from "../context/PomodoroContext";
import PhaseCompletion from "./phaseCompletion";
import "../assets/tailwind.css";

const root = createRoot(document.getElementById("root")!);

root.render(
  <PomodoroProvider>
    <PhaseCompletion />
  </PomodoroProvider>
); 
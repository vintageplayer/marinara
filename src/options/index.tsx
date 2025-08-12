import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router";
import Options from "./options";
import "../styles/tailwind.css";

const root = createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    <HashRouter>
      <Options />
    </HashRouter>
  </React.StrictMode>
);
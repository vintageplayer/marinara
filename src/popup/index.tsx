import React from "react";
import { createRoot } from "react-dom/client";
import Popup from "./popup";

const root = createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);

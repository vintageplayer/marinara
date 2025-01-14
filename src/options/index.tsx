import React from "react";
import ReactDOM from "react-dom";
import { HashRouter } from "react-router";
import Options from "./options";
import "../assets/tailwind.css";

ReactDOM.render(
  <React.StrictMode>
    <HashRouter>
      <Options />
    </HashRouter>
  </React.StrictMode>,
  document.getElementById("root")!
);
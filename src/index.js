/**
 * index.js — point d'entrée du site, équivalent de `main.py` côté bureau.
 */

import React from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

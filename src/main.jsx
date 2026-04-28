
import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

function App() {
  return (
    <div className="p-6 text-center">
      <h1 className="text-3xl font-bold text-emerald-400">
        App Amigos FC 🚀
      </h1>
      <p className="mt-4 text-zinc-300">
        Estrutura funcionando com Tailwind e Vite.
      </p>
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

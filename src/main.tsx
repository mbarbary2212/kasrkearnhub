import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ChunkLoadErrorBoundary, setupChunkErrorHandler } from "./components/ChunkLoadErrorBoundary";

// Setup global chunk error handler for unhandled promise rejections
setupChunkErrorHandler();

createRoot(document.getElementById("root")!).render(
  <ChunkLoadErrorBoundary>
    <App />
  </ChunkLoadErrorBoundary>
);

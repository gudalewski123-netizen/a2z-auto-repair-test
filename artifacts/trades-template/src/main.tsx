import { createRoot } from "react-dom/client";
import "./i18n"; // Initializes i18next + language detection. Must come before App.
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

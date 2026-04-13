import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "./index.css";
import App from "./App.jsx";

// Suppress TradingView telemetry and schema warnings
if (process.env.NODE_ENV === 'development') {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.error = (...args) => {
    const msg = args[0]?.toString() || '';
    // Filter out TradingView warnings
    if (
      msg.includes('telemetry.tradingview.com') ||
      msg.includes('Property:The state with a data type') ||
      msg.includes('does not match a schema') ||
      msg.includes('Cannot listen to the event from the provided iframe') ||
      msg.includes('contentWindow is not available')
    ) {
      return; // Suppress these warnings
    }
    originalError.apply(console, args);
  };
  
  console.warn = (...args) => {
    const msg = args[0]?.toString() || '';
    // Filter out TradingView warnings
    if (
      msg.includes('telemetry.tradingview.com') ||
      msg.includes('Property:The state with a data type')
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "927324128058-9g8abr0ds9j56rocutqv8tkrsup7cb03.apps.googleusercontent.com";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>
);

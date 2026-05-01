import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.log("main.tsx is executing!");

try {
  const rootElement = document.getElementById('root');
  console.log("Root element found:", rootElement);
  if (rootElement) {
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  }
} catch (err) {
  console.error("Failed to mount React app:", err);
}

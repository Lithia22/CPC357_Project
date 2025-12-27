// frontend/src/mqtt-config.js
// Import this file BEFORE any MQTT imports in your index.js

// Polyfill Buffer for MQTT
import { Buffer } from "buffer";
window.Buffer = Buffer;

// Minimal process polyfill
if (typeof window.process === "undefined") {
  window.process = {
    env: process.env || {},
    browser: true,
    nextTick: (fn) => setTimeout(fn, 0),
  };
}

// Global object for Node.js compatibility
if (typeof global === "undefined") {
  window.global = window;
}

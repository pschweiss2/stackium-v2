/**
 * main.jsx - Application Entry Point
 *
 * This file is the "bootstrap" for the React application.
 * It does two main things:
 * 1. Imports the root React component (App with tab switching)
 * 2. Tells React to render that component into the HTML page
 *
 * This is a standard pattern for React apps - you'll see this structure
 * in almost every React project.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import CSVEditor from './CSVEditor.jsx';
import './index.css';  // Import global styles

/**
 * Simple client-side routing based on URL path
 * - / or /index.html -> Main ecosystem diagram
 * - /edit or /edit.html -> CSV Editor (DEV ONLY - not included in production build)
 */
const path = window.location.pathname;
const isDev = import.meta.env.DEV; // Vite provides this - true in dev, false in production
const isEditor = path === '/edit' || path === '/edit.html';

// Only allow editor in development mode
const showEditor = isEditor && isDev;

// If someone tries to access /edit in production, show helpful message
if (isEditor && !isDev) {
  document.getElementById('root').innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: system-ui; background: #f3f4f6;">
      <div style="text-align: center; max-width: 500px; padding: 2rem;">
        <h1 style="font-size: 2rem; color: #1f2937; margin-bottom: 1rem;">🔒 Editor Not Available</h1>
        <p style="color: #6b7280; margin-bottom: 1.5rem;">
          The CSV editor is only available in development mode for security reasons.
        </p>
        <p style="color: #6b7280; margin-bottom: 1.5rem;">
          To edit application data:
        </p>
        <ol style="text-align: left; color: #6b7280; margin-bottom: 1.5rem;">
          <li>Clone the repository</li>
          <li>Run <code style="background: #e5e7eb; padding: 0.25rem 0.5rem; border-radius: 0.25rem;">npm install</code></li>
          <li>Run <code style="background: #e5e7eb; padding: 0.25rem 0.5rem; border-radius: 0.25rem;">npm run edit</code></li>
        </ol>
        <a href="/" style="display: inline-block; padding: 0.75rem 1.5rem; background: #3b82f6; color: white; text-decoration: none; border-radius: 0.5rem; font-weight: 500;">
          ← Back to Ecosystem Diagram
        </a>
      </div>
    </div>
  `;
}

/**
 * React 18+ uses createRoot() instead of the old render() method.
 * This creates a "root" that React will manage.
 *
 * document.getElementById('root') finds the <div id="root"> in index.html
 */
const root = ReactDOM.createRoot(document.getElementById('root'));

/**
 * root.render() tells React to render the appropriate component
 * based on the current URL path.
 *
 * <React.StrictMode> is a development-only wrapper that helps catch
 * potential problems in your code. It doesn't affect production builds.
 *
 * The App component manages tab switching between Applications and Security.
 * The CSVEditor component provides data editing capabilities (dev only).
 */
root.render(
  <React.StrictMode>
    {showEditor ? <CSVEditor /> : <App />}
  </React.StrictMode>
);

/**
 * LEARNING NOTE: What happens when this runs?
 *
 * 1. Vite bundles this file with all imports (React, D3, your component)
 * 2. Browser loads the bundle and executes this code
 * 3. ReactDOM.createRoot() creates a React "root" at the #root div
 * 4. root.render() tells React to mount the EcosystemDiagram component
 * 5. React calls the EcosystemDiagram function, gets JSX back
 * 6. React converts that JSX into real DOM elements
 * 7. Those DOM elements are inserted into the #root div
 * 8. Browser displays the result!
 */

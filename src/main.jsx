import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/index.css'
import ErrorBoundary from './components/ErrorBoundary'
import { LanguageProvider } from './context/LanguageContext'

try {
  console.log("🚀 Starting React app...");

  const root = ReactDOM.createRoot(document.getElementById('root'));
  console.log("✅ Root created");

  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  );

  console.log("✅ Render called");
} catch (fatalError) {
  console.error("❌ Fatal Application Error:", fatalError);
  document.getElementById('root').innerHTML = `
    <div style="padding: 20px; color: red; background: #1a1a1a; height: 100vh;">
      <h1>Critical Error</h1>
      <p>애플리케이션을 시작할 수 없습니다.</p>
      <pre>${fatalError.toString()}</pre>
    </div>
  `;
}

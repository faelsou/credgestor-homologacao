import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/pages/App';
import { setupOpenTelemetry } from '@/utils/otel';

// Configurar OpenTelemetry antes de renderizar a aplicação
setupOpenTelemetry();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
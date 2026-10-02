import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initDNSDataEntryFoundation } from './services/capabilityRuntime';
import './styles/index.css';

initDNSDataEntryFoundation();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

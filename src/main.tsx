import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initDNSFoundation } from '@dolomitinordicski/dns-shared-data';
import './styles/index.css';

initDNSFoundation({ shellProfile: 'operational' });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

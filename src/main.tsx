import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './contexts/AuthContext';
import App from './App';
import { loadState } from './utils/storage';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Elemento #root não encontrado.');

// Aplica o tema salvo antes do primeiro render (inclui tela de login).
const savedState = loadState();
const root = document.documentElement;
if (savedState.isDarkMode) {
  root.classList.add('dark');
  root.classList.remove('light');
} else {
  root.classList.remove('dark');
  root.classList.add('light');
}

createRoot(rootEl).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ToastProvider, useToast } from './hooks/useToast';
import ToastContainer from './components/ToastContainer';

function ToastWrapper() {
  const { toasts, removeToast } = useToast();
  return <ToastContainer toasts={toasts} onRemove={removeToast} />;
}

function AppWithToast() {
  return (
    <ToastProvider>
      <App />
      <ToastWrapper />
    </ToastProvider>
  );
}

// ❌ Убрали лишний <BrowserRouter> — он уже есть внутри <App />
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppWithToast />
  </React.StrictMode>
);
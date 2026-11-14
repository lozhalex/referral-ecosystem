import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppWithToast />
    </BrowserRouter>
  </React.StrictMode>
);
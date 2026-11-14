import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Toast } from '../components/Toast';

interface ToastContextType {
  toasts: Toast[];
  addToast: (type: Toast['type'], message: string, duration?: number) => string;
  removeToast: (id: string) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: Toast['type'], message: string, duration?: number) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, type, message, duration };
    setToasts(prev => [...prev, newToast]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const success = useCallback((message: string, duration?: number) => 
    addToast('success', message, duration), [addToast]);

  const error = useCallback((message: string, duration?: number) => 
    addToast('error', message, duration), [addToast]);

  const warning = useCallback((message: string, duration?: number) => 
    addToast('warning', message, duration), [addToast]);

  const info = useCallback((message: string, duration?: number) => 
    addToast('info', message, duration), [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
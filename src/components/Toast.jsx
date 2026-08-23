import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, message, duration = 4500) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const success = (msg, d) => addToast('success', msg, d);
  const error = (msg, d) => addToast('error', msg, d);
  const info = (msg, d) => addToast('info', msg, d);

  return (
    <ToastContext.Provider value={{ success, error, info }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="toast"
            style={{
              borderColor:
                toast.type === 'success'
                  ? 'var(--success-border)'
                  : toast.type === 'error'
                  ? 'var(--danger-border)'
                  : 'var(--border-strong)',
            }}
          >
            {toast.type === 'success' && <CheckCircle2 size={16} color="var(--success)" />}
            {toast.type === 'error' && <AlertCircle size={16} color="var(--danger)" />}
            {toast.type === 'info' && <Info size={16} color="var(--accent-blue)" />}
            <span style={{ flex: 1, fontSize: '13px' }}>{toast.message}</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => removeToast(toast.id)}
              style={{ padding: '2px', marginLeft: '6px' }}
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

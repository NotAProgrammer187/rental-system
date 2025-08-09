import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext({ showToast: () => {} });

let idCounter = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((toast) => {
    const id = ++idCounter;
    const payload = { id, type: toast.type || 'success', message: toast.message || '', duration: toast.duration || 3000 };
    setToasts((prev) => [...prev, payload]);
    if (payload.duration > 0) {
      setTimeout(() => remove(id), payload.duration);
    }
  }, [remove]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast Container */}
      <div className="fixed z-[1000] top-4 right-4 space-y-2" role="region" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`min-w-[240px] max-w-sm px-4 py-3 rounded-xl shadow-large text-sm text-white flex items-start gap-3 animate-slide-in-right ${
              t.type === 'error' ? 'bg-red-600' : t.type === 'warning' ? 'bg-yellow-600' : 'bg-primary-600'
            }`}
            role="status"
          >
            <span className="sr-only">{t.type}</span>
            <div className="flex-1">{t.message}</div>
            <button aria-label="Dismiss" className="opacity-80 hover:opacity-100" onClick={() => remove(t.id)}>✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);



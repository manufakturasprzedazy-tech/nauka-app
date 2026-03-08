import { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ToastMessage {
  id: number;
  text: string;
  icon?: string;
  type: 'success' | 'info' | 'warning';
}

interface ToastContextType {
  showToast: (text: string, icon?: string, type?: ToastMessage['type']) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

const typeColors = {
  success: 'bg-emerald-900/90 border-emerald-700/50',
  info: 'bg-blue-900/90 border-blue-700/50',
  warning: 'bg-amber-900/90 border-amber-700/50',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string, icon?: string, type: ToastMessage['type'] = 'success') => {
    const id = nextId++;
    setToasts(prev => [...prev, { id, text, icon, type }]);
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts(prev => prev.slice(1));
    }, 2000);
    return () => clearTimeout(timer);
  }, [toasts]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className={`px-4 py-2 rounded-xl border backdrop-blur-sm shadow-lg flex items-center gap-2 ${typeColors[toast.type]}`}
            >
              {toast.icon && <span className="text-base">{toast.icon}</span>}
              <span className="text-sm text-white font-medium">{toast.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

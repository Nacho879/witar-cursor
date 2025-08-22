import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Info, 
  X 
} from 'lucide-react';

const toastVariants = {
  initial: { 
    opacity: 0, 
    y: 50, 
    scale: 0.3 
  },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  },
  exit: { 
    opacity: 0, 
    x: 300,
    transition: {
      duration: 0.2,
      ease: "easeIn"
    }
  }
};

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info
};

const colors = {
  success: 'bg-success/10 text-success border-success/20',
  error: 'bg-destructive/10 text-destructive border-destructive/20',
  warning: 'bg-toast text-toast-foreground border-toast-border',
  info: 'bg-primary/10 text-primary border-primary/20'
};

export default function Toast({ 
  type = 'info', 
  title, 
  message, 
  onClose, 
  duration = 5000,
  className = '' 
}) {
  const Icon = icons[type];
  const colorClass = colors[type];

  React.useEffect(() => {
    if (duration && onClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  return (
    <motion.div
      variants={toastVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`
        relative flex items-start gap-3 p-4 rounded-xl border shadow-lg
        ${colorClass} ${className}
        hover:shadow-xl transition-shadow duration-200
      `}
    >
      <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
      
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className="font-semibold text-sm mb-1">
            {title}
          </h4>
        )}
        {message && (
          <p className="text-sm opacity-90">
            {message}
          </p>
        )}
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-black/10 transition-colors duration-200 flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}

// Hook para manejar múltiples toasts
export function useToasts() {
  const [toasts, setToasts] = React.useState([]);

  const addToast = React.useCallback((toast) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };
    setToasts(prev => [...prev, newToast]);
    return id;
  }, []);

  const removeToast = React.useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showToast = React.useCallback((type, title, message, duration) => {
    return addToast({ type, title, message, duration });
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    showToast
  };
}

// Componente contenedor para múltiples toasts
export function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            onClose={() => onRemove(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
} 
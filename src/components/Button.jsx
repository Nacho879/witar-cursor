import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const buttonVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 }
};

const variants = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  outline: 'border border-border bg-transparent hover:bg-secondary',
  ghost: 'bg-transparent hover:bg-secondary',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  success: 'bg-success text-success-foreground hover:bg-success/90',
  cta: 'bg-cta text-cta-foreground hover:bg-cta/90 shadow-md hover:shadow-lg'
};

const sizes = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
  xl: 'h-14 px-8 text-lg'
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  onClick,
  type = 'button',
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      variants={buttonVariants}
      initial="initial"
      whileHover={!isDisabled ? "hover" : "initial"}
      whileTap={!isDisabled ? "tap" : "initial"}
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={`
        inline-flex items-center justify-center gap-2 rounded-xl font-semibold
        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {loading && (
        <Loader2 className="w-4 h-4 animate-spin" />
      )}
      
      {!loading && Icon && iconPosition === 'left' && (
        <Icon className="w-4 h-4" />
      )}
      
      {children}
      
      {!loading && Icon && iconPosition === 'right' && (
        <Icon className="w-4 h-4" />
      )}
    </motion.button>
  );
}

// Botón de acción flotante
export function FloatingActionButton({ 
  icon: Icon, 
  onClick, 
  variant = 'primary',
  size = 'lg',
  className = '' 
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={`
        fixed bottom-6 right-6 z-40 rounded-full shadow-lg hover:shadow-xl
        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
        ${variants[variant]}
        ${size === 'sm' ? 'w-12 h-12' : size === 'md' ? 'w-14 h-14' : 'w-16 h-16'}
        ${className}
      `}
    >
      <Icon className={`${size === 'sm' ? 'w-5 h-5' : size === 'md' ? 'w-6 h-6' : 'w-7 h-7'}`} />
    </motion.button>
  );
}

// Botón de icono
export function IconButton({ 
  icon: Icon, 
  onClick, 
  variant = 'ghost',
  size = 'md',
  className = '',
  ...props 
}) {
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        inline-flex items-center justify-center rounded-lg
        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
        ${variants[variant]}
        ${size === 'sm' ? 'w-8 h-8' : size === 'md' ? 'w-10 h-10' : 'w-12 h-12'}
        ${className}
      `}
      {...props}
    >
      <Icon className={iconSizes[size]} />
    </motion.button>
  );
} 
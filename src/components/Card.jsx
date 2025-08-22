import React from 'react';
import { motion } from 'framer-motion';

const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  },
  hover: {
    y: -4,
    transition: {
      duration: 0.2,
      ease: "easeOut"
    }
  }
};

export default function Card({
  children,
  className = '',
  hover = true,
  padding = 'default',
  variant = 'default',
  onClick,
  ...props
}) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    default: 'p-6',
    lg: 'p-8',
    xl: 'p-10'
  };

  const variants = {
    default: 'bg-card border border-border',
    elevated: 'bg-card border border-border shadow-lg',
    glass: 'bg-card/80 backdrop-blur-md border border-border/50',
    gradient: 'bg-gradient-to-br from-primary/5 to-cta/5 border border-border'
  };

  const Component = onClick ? motion.button : motion.div;

  return (
    <Component
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover={hover ? "hover" : "animate"}
      className={`
        rounded-2xl transition-all duration-300
        ${variants[variant]}
        ${paddingClasses[padding]}
        ${onClick ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2' : ''}
        ${className}
      `}
      onClick={onClick}
      {...props}
    >
      {children}
    </Component>
  );
}

// Card con header
export function CardWithHeader({ 
  title, 
  subtitle, 
  action, 
  children, 
  className = '',
  ...props 
}) {
  return (
    <Card className={className} {...props}>
      <div className="flex items-center justify-between mb-4">
        <div>
          {title && (
            <h3 className="text-lg font-semibold text-foreground">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">
              {subtitle}
            </p>
          )}
        </div>
        {action && (
          <div className="flex-shrink-0">
            {action}
          </div>
        )}
      </div>
      {children}
    </Card>
  );
}

// Card de estadísticas
export function StatCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  trend = 'neutral',
  className = '' 
}) {
  const trendColors = {
    positive: 'text-success',
    negative: 'text-destructive',
    neutral: 'text-muted-foreground'
  };

  const trendIcons = {
    positive: '↗',
    negative: '↘',
    neutral: '→'
  };

  return (
    <Card className={`${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">
            {title}
          </p>
          <p className="text-2xl font-bold text-foreground">
            {value}
          </p>
          {change && (
            <p className={`text-sm font-medium ${trendColors[trend]} mt-1`}>
              {trendIcons[trend]} {change}
            </p>
          )}
        </div>
        {Icon && (
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary" />
          </div>
        )}
      </div>
    </Card>
  );
}

// Card de acción
export function ActionCard({ 
  title, 
  description, 
  action, 
  icon: Icon,
  variant = 'default',
  className = '' 
}) {
  const variants = {
    default: 'hover:shadow-lg',
    primary: 'bg-primary/5 border-primary/20 hover:bg-primary/10',
    success: 'bg-success/5 border-success/20 hover:bg-success/10',
    warning: 'bg-toast border-toast-border hover:bg-toast/80'
  };

  return (
    <Card 
      className={`${variants[variant]} ${className}`}
      hover={true}
    >
      <div className="flex items-start gap-4">
        {Icon && (
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground mb-1">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-muted-foreground mb-3">
              {description}
            </p>
          )}
          {action && (
            <div className="flex-shrink-0">
              {action}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
} 
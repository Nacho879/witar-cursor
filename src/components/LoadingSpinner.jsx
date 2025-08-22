import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ 
  size = 'md', 
  text = 'Cargando...', 
  variant = 'default',
  className = '' 
}) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const variants = {
    default: 'text-primary',
    white: 'text-white',
    muted: 'text-muted-foreground'
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <Loader2 
        className={`${sizeClasses[size]} ${variants[variant]} animate-spin`} 
      />
      {text && (
        <p className="text-sm text-muted-foreground animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
}

// Componente de skeleton para contenido
export function Skeleton({ className = '', ...props }) {
  return (
    <div 
      className={`animate-pulse-slow bg-muted rounded-lg ${className}`}
      {...props}
    />
  );
}

// Componente de skeleton para cards
export function CardSkeleton() {
  return (
    <div className="card p-6 space-y-4">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

// Componente de skeleton para tablas
export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
} 
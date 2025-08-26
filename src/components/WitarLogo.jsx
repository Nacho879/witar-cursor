import React from 'react';
import { Clock } from 'lucide-react';

export default function WitarLogo({ size = 'default', showText = true, className = '' }) {
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return {
          container: 'w-8 h-8',
          icon: 'w-4 h-4',
          text: 'text-lg'
        };
      case 'large':
        return {
          container: 'w-12 h-12',
          icon: 'w-7 h-7',
          text: 'text-3xl'
        };
      default:
        return {
          container: 'w-10 h-10',
          icon: 'w-6 h-6',
          text: 'text-2xl'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`${sizeClasses.container} bg-primary rounded-xl flex items-center justify-center`}>
        <Clock className={`${sizeClasses.icon} text-primary-foreground`} />
      </div>
      {showText && (
        <span className={`${sizeClasses.text} font-bold text-primary`}>
          Witar
        </span>
      )}
    </div>
  );
} 
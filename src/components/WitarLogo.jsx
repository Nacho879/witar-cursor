import React from 'react';
// Icono sustituido por imagen PNG provista en public/

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
      <div className={`${sizeClasses.container} rounded-xl overflow-hidden flex items-center justify-center`}>
        <img src="/logo.png" alt="Witar" className="w-full h-full object-contain" />
      </div>
      {showText && (
        <span className={`${sizeClasses.text} font-bold text-primary`}>
          Witar
        </span>
      )}
    </div>
  );
} 

import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  variant?: 'light' | 'dark' | 'amber';
}

export const Logo: React.FC<LogoProps> = ({ className = "", size = 40, variant = 'amber' }) => {
  const primaryColor = variant === 'light' ? '#ffffff' : (variant === 'dark' ? '#064e3b' : '#fbbf24');
  
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Cercle de protection extérieur */}
      <circle cx="50" cy="50" r="46" stroke={primaryColor} strokeWidth="2" strokeDasharray="4 2" className="opacity-40" />
      
      {/* Sceau central */}
      <path 
        d="M50 10C27.9 10 10 27.9 10 50C10 72.1 27.9 90 50 90C72.1 90 90 72.1 90 50C90 27.9 72.1 10 50 10ZM50 84C31.2 84 16 68.8 16 50C16 31.2 31.2 16 50 16C68.8 16 84 31.2 84 50C84 68.8 68.8 84 50 84Z" 
        fill={primaryColor} 
      />
      
      {/* Baobab Numérique (Tronc Empreinte) */}
      <path 
        d="M44 65C44 65 40 68 40 72C40 76 43 78 43 78" 
        stroke={primaryColor} 
        strokeWidth="3" 
        strokeLinecap="round" 
      />
      <path 
        d="M56 65C56 65 60 68 60 72C60 76 57 78 57 78" 
        stroke={primaryColor} 
        strokeWidth="3" 
        strokeLinecap="round" 
      />
      
      {/* Couronne du Baobab (Arcs d'identité) */}
      <path 
        d="M30 45C30 35 38.9 27 50 27C61.1 27 70 35 70 45" 
        stroke={primaryColor} 
        strokeWidth="3" 
        strokeLinecap="round" 
      />
      <path 
        d="M35 52C35 44 41.7 37 50 37C58.3 37 65 44 65 52" 
        stroke={primaryColor} 
        strokeWidth="3" 
        strokeLinecap="round" 
      />
      <path 
        d="M42 58C42 53.6 45.6 50 50 50C54.4 50 58 53.6 58 58" 
        stroke={primaryColor} 
        strokeWidth="3" 
        strokeLinecap="round" 
      />
      
      {/* Étoile du Sénégal au sommet */}
      <path 
        d="M50 18L52.5 24H47.5L50 18Z" 
        fill={primaryColor} 
      />
    </svg>
  );
};

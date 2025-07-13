'use client';

import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-10 w-10',
  md: 'h-12',
  lg: 'h-20 w-20',
  xl: 'h-24 w-24'
};

export default function Logo({ 
  size = 'md', 
  className = ''
}: LogoProps) {
  return (
    <div className={`flex items-center ${className}`}>
      {/* Company Logo */}
      <img 
        src="/company_logo.jpg" 
        alt="AI Call Analyser Logo" 
        className={`${sizeClasses[size]} object-contain`}
      />
    </div>
  );
}

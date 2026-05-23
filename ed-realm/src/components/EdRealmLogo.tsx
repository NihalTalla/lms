import React from 'react';

export function EdRealmLogo({ className = '', size = 'normal' }: { className?: string, size?: 'small' | 'normal' | 'large' }) {
  const sizeStyles = {
    small: {
      ed: 'w-10 h-10 rounded-lg text-base',
      realm: 'text-xl',
      gap: 'gap-2',
    },
    normal: {
      ed: 'w-12 h-12 rounded-xl text-xl',
      realm: 'text-2xl',
      gap: 'gap-2.5',
    },
    large: {
      ed: 'w-20 h-20 rounded-2xl text-4xl',
      realm: 'text-5xl',
      gap: 'gap-3',
    },
  } as const;

  const current = sizeStyles[size];

  return (
    <div className={`flex items-center whitespace-nowrap shrink-0 ${current.gap} ${className}`}>
      <div
        className={`flex items-center justify-center font-black leading-none shrink-0 ${current.ed}`}
        style={{ fontFamily: 'Arial, sans-serif', letterSpacing: '0.05em', backgroundColor: '#000', color: '#fff' }}
      >
        ED
      </div>
      <div
        className={`font-black leading-none shrink-0 ${current.realm}`}
        style={{ fontFamily: 'Arial, sans-serif', letterSpacing: '0.1em', color: '#000' }}
      >
        REALM
      </div>
    </div>
  );
}

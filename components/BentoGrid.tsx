import React, { ReactNode } from 'react';

interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

export const BentoGrid: React.FC<BentoGridProps> = ({ children, className = "" }) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 max-w-7xl mx-auto p-4 ${className}`}>
      {children}
    </div>
  );
};

interface BentoCardProps {
  children: ReactNode;
  className?: string;
  colSpan?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2;
  title?: string;
  icon?: ReactNode;
}

export const BentoCard: React.FC<BentoCardProps> = ({ 
  children, 
  className = "", 
  colSpan = 1, 
  rowSpan = 1,
  title,
  icon
}) => {
  const colSpanClass = {
    1: 'md:col-span-1',
    2: 'md:col-span-2',
    3: 'md:col-span-3',
    4: 'md:col-span-4',
  }[colSpan];

  const rowSpanClass = {
    1: 'row-span-1',
    2: 'row-span-2',
  }[rowSpan];

  return (
    <div className={`${colSpanClass} ${rowSpanClass} bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 flex flex-col relative overflow-hidden group hover:border-slate-600 transition-colors duration-300 ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      
      {(title || icon) && (
        <div className="flex items-center gap-2 mb-4 text-slate-400 font-medium text-sm uppercase tracking-wider">
          {icon && <span className="text-indigo-400">{icon}</span>}
          {title}
        </div>
      )}
      <div className="flex-1 relative z-10">
        {children}
      </div>
    </div>
  );
};

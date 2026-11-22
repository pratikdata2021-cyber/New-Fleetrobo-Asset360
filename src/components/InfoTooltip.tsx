import React, { useState } from 'react';

interface TooltipProps {
  content: string;
  children?: React.ReactNode;
}

export const InfoTooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        aria-label={`About field: ${content}`}
        className="w-3.5 h-3.5 rounded-full border border-slate-300 hover:border-[#FA8A63] text-slate-500 hover:text-[#FA8A63] flex items-center justify-center text-[9px] font-serif transition-colors ml-1 shrink-0 cursor-help focus:outline-none focus:ring-1 focus:ring-[#FA8A63]"
      >
        i
      </button>

      {isVisible && (
        <div 
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 w-64 max-w-[280px] p-2 bg-slate-900 text-white text-[11px] leading-relaxed rounded-md shadow-xl border border-slate-800 pointer-events-none animate-in fade-in zoom-in-95 duration-100"
        >
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" />
        </div>
      )}
      {children}
    </div>
  );
};

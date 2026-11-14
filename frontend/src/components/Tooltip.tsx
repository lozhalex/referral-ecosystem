import { useState, useRef, ReactNode } from 'react';

interface TooltipProps {
  text: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export default function Tooltip({ text, children, position = 'top', className = '' }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => setVisible(true);
  const hide = () => setVisible(false);

  // Десктоп: наведение
  const handleMouseEnter = () => show();
  const handleMouseLeave = () => hide();

  // Мобильный: долгое нажатие
  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => show(), 500);
  };
  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    // Скрываем через 3 секунды после отпускания
    setTimeout(() => hide(), 3000);
  };

  const positionClasses: Record<string, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={hide}
    >
      {children}
      {visible && (
        <div
          className={`absolute z-50 px-3 py-2 text-xs text-white bg-slate-900/95 border border-white/10 rounded-lg shadow-xl backdrop-blur-sm whitespace-normal max-w-xs ${positionClasses[position]}`}
          style={{ pointerEvents: 'none' }}
        >
          {text}
          {/* Стрелочка */}
          <div
            className={`absolute w-2 h-2 bg-slate-900/95 border-white/10 rotate-45 ${
              position === 'top'
                ? 'top-full left-1/2 -translate-x-1/2 -mt-1 border-r border-b'
                : position === 'bottom'
                ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1 border-l border-t'
                : position === 'left'
                ? 'left-full top-1/2 -translate-y-1/2 -ml-1 border-r border-b'
                : 'right-full top-1/2 -translate-y-1/2 -mr-1 border-l border-t'
            }`}
          />
        </div>
      )}
    </div>
  );
}
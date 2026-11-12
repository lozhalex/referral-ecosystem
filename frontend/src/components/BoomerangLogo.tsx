import React from 'react';

interface BoomerangLogoProps {
  size?: number;
  className?: string;
}

export const BoomerangLogo: React.FC<BoomerangLogoProps> = ({ size = 32, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M8 16 L24 32 L8 48"
        stroke="#A3E635"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 28 L36 44 L20 60"
        stroke="#047857"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default BoomerangLogo;
import React from 'react';

const DoksifyLogo = ({ className = '', size = 52 }) => (
  <div className={`doksify-logo ${className}`.trim()}>
    <svg
      aria-hidden="true"
      className="doksify-logo-mark"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="doksifyLogoGradient" x1="12" y1="8" x2="52" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4F46E5" />
          <stop offset="1" stopColor="#0EA5E9" />
        </linearGradient>
        <linearGradient id="doksifyBoltGradient" x1="24" y1="18" x2="42" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EEF6FF" />
          <stop offset="1" stopColor="#FFFFFF" />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="48" height="48" rx="16" fill="url(#doksifyLogoGradient)" />
      <path
        d="M23 18C23 16.8954 23.8954 16 25 16H37.5858C38.1162 16 38.6249 16.2107 39 16.5858L44.4142 22C44.7893 22.3751 45 22.8838 45 23.4142V41C45 42.1046 44.1046 43 43 43H25C23.8954 43 23 42.1046 23 41V18Z"
        fill="rgba(255,255,255,0.18)"
      />
      <path
        d="M39 16V22C39 23.1046 39.8954 24 41 24H47"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M33.8542 22L27.5 33.3398H33.0408L30.1458 42L36.5 30.6602H30.9592L33.8542 22Z"
        fill="url(#doksifyBoltGradient)"
      />
      <circle cx="20" cy="46" r="3" fill="rgba(255,255,255,0.75)" />
      <circle cx="32" cy="49" r="2.5" fill="rgba(255,255,255,0.55)" />
      <circle cx="44" cy="46" r="3" fill="rgba(255,255,255,0.75)" />
      <path d="M23 46H41" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  </div>
);

export default DoksifyLogo;

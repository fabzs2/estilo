import React, { useId } from 'react';

export function KromaLogo({ size = 30 }) {
  const uid = useId().replace(/:/g, '');
  const bgId = `kr_bg_${uid}`;
  const blueId = `kr_blue_${uid}`;
  const violetId = `kr_violet_${uid}`;
  const emeraldId = `kr_emerald_${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, display: 'block' }}
      aria-label="KromaOPS Logo"
    >
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#18181b" />
          <stop offset="100%" stopColor="#09090b" />
        </linearGradient>
        <linearGradient id={blueId} x1="128" y1="112" x2="216" y2="400" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id={violetId} x1="384" y1="112" x2="220" y2="268" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id={emeraldId} x1="236" y1="244" x2="392" y2="400" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>

      {/* Base Carbon Squircle */}
      <rect x="16" y="16" width="480" height="480" rx="108" fill={`url(#${bgId})`} stroke="#2e2e34" strokeWidth="14" />

      {/* Marcas Técnicas de Registro (Estamparia / Plotter) */}
      <path d="M74 106V74H106" stroke="#52525b" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M438 106V74H406" stroke="#52525b" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M74 406V438H106" stroke="#52525b" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M438 406V438H406" stroke="#52525b" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />

      {/* 1. Haste Vertical (Criação - Azul) */}
      <path
        d="M136 124C136 115.163 143.163 108 152 108H196C204.837 108 212 115.163 212 124V388C212 396.837 204.837 404 196 404H152C143.163 404 136 396.837 136 388V124Z"
        fill={`url(#${blueId})`}
      />

      {/* 2. Lâmina Superior (Exportação / Fechamento - Violeta) */}
      <path
        d="M316 108H376C389.8 108 397.2 124.2 388.2 134.6L268 272H212V220L303.8 113.6C306.9 110 311.3 108 316 108Z"
        fill={`url(#${violetId})`}
      />

      {/* 3. Lâmina Inferior (Impressão / Plotter - Esmeralda) */}
      <path
        d="M264 236L390.4 377.4C399.6 387.7 392.3 404 378.5 404H314.6C309.9 404 305.4 401.9 302.3 398.4L212 296L264 236Z"
        fill={`url(#${emeraldId})`}
      />

      {/* Ponto Central de Precisão */}
      <circle cx="212" cy="256" r="28" fill="#111113" />
      <circle cx="212" cy="256" r="16" fill="#fafafa" />
    </svg>
  );
}

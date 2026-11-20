import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'ScoReviewHR | a Senrab ConsulTech Multi-Framework Intelligent Appraisal Solution for Enterprise HRMS',
  description: 'Multi-Framework Intelligent Appraisal Solution for Enterprise HRMS',
  icons: {
    icon: [
      { url: '/dede/dede-avatar-light-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/dede/dede-avatar-light-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    shortcut: '/dede/dede-avatar-light-32.png',
    apple: '/dede/dede-avatar-light-128.webp',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/dede/dede-avatar-light-32.png" />
        <link rel="icon" type="image/png" sizes="48x48" href="/dede/dede-avatar-light-48.png" />
        <link rel="shortcut icon" href="/dede/dede-avatar-light-32.png" />
        <link rel="apple-touch-icon" sizes="128x128" href="/dede/dede-avatar-light-128.webp" />
        <style>{`
          /* Design System Addendum v1.1 — Semantic & Core CSS Custom Properties (§2, §3, §4, §7, §9) */
          :root {
            --font-inter: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            --font-mono: 'JetBrains Mono', 'SF Mono', Consolas, monospace;

            /* §3.1 Semantic Palette */
            --color-bg: #F9FAFB;
            --color-surface: #FFFFFF;
            --color-border: #E5E7EB;
            --color-text-primary: #111827;
            --color-text-secondary: #6B7280;
            --color-text-inverse: #FFFFFF;
            --color-primary: #2563EB;
            --color-primary-hover: #1D4ED8;
            --color-success: #059669;
            --color-warning: #D97706;
            --color-danger: #DC2626;
            --color-info: #0891B2;

            /* §3.2 Framework Accent Tokens */
            --color-framework-bsc: #2563EB;
            --color-framework-okr: #059669;
            --color-framework-mbo: #D97706;

            /* §3.3 RAG Confidence Colors */
            --color-rag-green: #059669;
            --color-rag-amber: #D97706;
            --color-rag-red: #DC2626;

            /* §2.2 Modular Type Scale (1.25 ratio) */
            --text-display: 32px;
            --text-h1: 24px;
            --text-h2: 20px;
            --text-h3: 16px;
            --text-body: 14px;
            --text-body-strong: 14px;
            --text-small: 12px;
            --text-micro: 11px;
            --text-mono: 12px;

            /* §4.1 4px-Base Spacing Scale */
            --space-1: 4px;
            --space-2: 8px;
            --space-3: 12px;
            --space-4: 16px;
            --space-5: 24px;
            --space-6: 32px;
            --space-7: 48px;
            --space-8: 64px;

            /* §4.3 Card & Radii */
            --radius-sm: 4px;
            --radius-md: 8px;
            --radius-lg: 12px;
            --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
            --shadow-md: 0 2px 6px rgba(0, 0, 0, 0.06);

            /* §7 Motion */
            --motion-fast: 150ms ease-out;
            --motion-base: 200ms ease-out;
            --motion-slow: 300ms ease-in-out;
          }

          html, body { overflow-x: clip; }
          body {
            font-family: var(--font-inter);
            font-size: var(--text-body);
            line-height: 1.5;
            font-weight: 400;
            font-feature-settings: 'tnum' 1;
            font-variant-numeric: tabular-nums;
          }
          h1 { font-size: var(--text-h1); font-weight: 600; line-height: 1.3; letter-spacing: 0; }
          h2 { font-size: var(--text-h2); font-weight: 600; line-height: 1.35; letter-spacing: 0; }
          h3 { font-size: var(--text-h3); font-weight: 600; line-height: 1.4; letter-spacing: 0; }
          table, td, th, input[type="number"], .tnum {
            font-variant-numeric: tabular-nums;
            font-feature-settings: 'tnum' 1;
          }
          code, pre, .mono {
            font-family: var(--font-mono);
            font-size: var(--text-mono);
            line-height: 1.5;
          }
          .caption, small { font-size: var(--text-small); font-weight: 400; line-height: 1.45; color: #6B7280; }
          :focus { outline: none; }
          :focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; transition: none !important; }
          @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
              animation-duration: 1ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 1ms !important;
              scroll-behavior: auto !important;
            }
          }
        `}</style>
      </head>
      <body
        style={{
          margin: 0,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          backgroundColor: '#f7f6f3',
          color: '#1c1b19',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          textRendering: 'optimizeLegibility',
        }}
      >
        {children}
      </body>
    </html>
  );
}

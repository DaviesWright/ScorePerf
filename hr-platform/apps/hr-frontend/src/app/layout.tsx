import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'ScoReviewHR | Senrab ConsulTech Workforce Management',
  description: 'Enterprise HRMS, Workforce Intelligence, and Multi-Framework Appraisal Oversight',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <style>{`
          html, body { overflow-x: clip; }
          /* Type scale: two families (Inter for text, Geist Mono for figures and codes).
             H1 22px, H2 17px, H3 15px, body 14px, caption 12px. Inline styles still win where a screen sets its own size. */
          body { font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; line-height: 1.5; font-weight: 400; }
          h1 { font-size: 22px; font-weight: 600; line-height: 1.25; letter-spacing: 0; }
          h2 { font-size: 17px; font-weight: 600; line-height: 1.3; letter-spacing: 0; }
          h3 { font-size: 15px; font-weight: 600; line-height: 1.35; letter-spacing: 0; }
          .caption, small { font-size: 12px; font-weight: 400; line-height: 1.4; color: #79756c; }
          :focus { outline: none; }
          :focus-visible { outline: 2px solid #4338ca; outline-offset: 2px; }
          @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after { animation-duration: 1ms !important; animation-iteration-count: 1 !important; transition-duration: 1ms !important; scroll-behavior: auto !important; }
          }
        `}</style>
      </head>
      <body
        style={{
          margin: 0,
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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

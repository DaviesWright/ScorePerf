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
          href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        style={{
          margin: 0,
          fontFamily: 'Inter, Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
          backgroundColor: '#f8fafc',
          color: '#0f172a',
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

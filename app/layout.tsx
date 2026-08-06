import React from 'react';
import './globals.css';

export const metadata = {
  title: 'AGLH Recruit',
  description: 'Plataforma Interna de Reclutamiento',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

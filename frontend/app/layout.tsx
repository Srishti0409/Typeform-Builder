import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Typeform Builder',
  description: 'Build beautiful, conversational forms that feel like a natural conversation.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

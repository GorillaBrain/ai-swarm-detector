import type { Metadata } from 'next';
import { Geist, Geist_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const spaceGrotesk = Space_Grotesk({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'AI Swarm Detector — Global AI Agent Threat Intelligence',
  description:
    'Cinematic OSINT threat intelligence and incident monitoring platform tracking coordinated AI agents, autonomous cyber operations, and multi-agent systems.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} dark h-full antialiased`}
    >
      <body className="h-full overflow-hidden bg-[#080a0f] text-[#f3f5f8] selection:bg-[#f5b82e]/25 selection:text-[#f5b82e]">
        {children}
      </body>
    </html>
  );
}

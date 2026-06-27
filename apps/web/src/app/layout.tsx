import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: 'QuizLive — Real-Time Quiz Platform',
  description:
    'Host and play live interactive quizzes. Create engaging multiplayer quiz sessions with real-time scoring and leaderboards.',
  keywords: ['quiz', 'live quiz', 'multiplayer quiz', 'kahoot alternative', 'real-time quiz'],
  authors: [{ name: 'QuizLive Team' }],
  openGraph: {
    title: 'QuizLive',
    description: 'Real-time multiplayer quiz platform',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${outfit.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

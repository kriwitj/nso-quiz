'use client';
import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <SessionProvider basePath={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/auth`}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} forcedTheme="light">
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#ffffff',
                color: '#191c1e',
                border: '1px solid #c3c6d6',
                boxShadow: '0 10px 25px -5px rgba(0, 70, 173, 0.1)',
                fontFamily: '"Be Vietnam Pro", sans-serif',
                fontSize: '14px',
              },
              success: {
                iconTheme: { primary: '#00574e', secondary: '#ffffff' },
              },
              error: {
                iconTheme: { primary: '#ba1a1a', secondary: '#ffffff' },
              },
            }}
          />
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}

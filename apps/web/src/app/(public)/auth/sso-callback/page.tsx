'use client';
import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

function SsoCallbackInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = searchParams.get('token');
    const refresh = searchParams.get('refresh') ?? '';

    if (!token) {
      router.replace('/login?error=nso_sso_failed');
      return;
    }

    signIn('nso-token', { token, refresh, redirect: false }).then((res) => {
      if (res?.error || !res?.ok) {
        router.replace('/login?error=nso_sso_failed');
      } else {
        router.replace('/dashboard');
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

const Spinner = (
  <div className="min-h-screen flex flex-col items-center justify-center bg-nso-surface gap-4">
    <div className="w-12 h-12 border-4 border-nso-primary border-t-transparent rounded-full animate-spin" />
    <p className="text-muted-foreground text-sm font-medium">กำลังเข้าสู่ระบบด้วย NSO Account…</p>
  </div>
);

export default function SsoCallbackPage() {
  return (
    <Suspense fallback={Spinner}>
      <SsoCallbackInner />
    </Suspense>
  );
}

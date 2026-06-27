import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DashboardClient } from './dashboard-client';

export const metadata = { title: 'Dashboard - QuizLive' };

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  return <DashboardClient userName={session!.user.name} />;
}

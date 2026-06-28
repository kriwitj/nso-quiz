'use client';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi, quizApi } from '@/lib/api';
import { BookOpen, Play, Users, Zap, Plus, ArrowRight, History, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { timeAgo } from '@/lib/utils';
import { useSmartHost, SmartHostDialog } from '@/hooks/use-smart-host';

interface DashboardClientProps {
  userName: string;
}

interface QuizItem {
  id: string;
  title: string;
  updatedAt: string;
  _count?: { questions?: number; sessions?: number };
}

interface QuizzesData {
  items: QuizItem[];
  total: number;
}

interface OverviewData {
  totalQuizzes: number;
  totalSessions: number;
  totalPlayers: number;
}

export function DashboardClient({ userName }: DashboardClientProps) {
  const { handleHost, handleResume, handleCancelAndCreate, handleAbortAndCreate, isChecking, isDialogPending, dialog, setDialog } = useSmartHost();

  const { data: overview } = useQuery<OverviewData>({
    queryKey: ['analytics', 'overview'],
    queryFn: () => analyticsApi.overview().then((r) => r.data),
  });

  const { data: quizzes } = useQuery<QuizzesData>({
    queryKey: ['quizzes'],
    queryFn: () => quizApi.list().then((r) => r.data),
  });

  const firstName = userName?.split(' ')[0] ?? 'ผู้ใช้';

  const stats = [
    {
      label: 'ควิซทั้งหมด',
      value: overview?.totalQuizzes ?? 0,
      icon: BookOpen,
      bg: 'bg-nso-primary-fixed/30',
      iconColor: 'text-nso-primary',
      badge: '+12%',
      badgeColor: 'text-nso-tertiary bg-nso-tertiary/10',
    },
    {
      label: 'เซสชันที่รันอยู่',
      value: overview?.totalSessions ?? 0,
      icon: Play,
      bg: 'bg-purple-100',
      iconColor: 'text-nso-secondary',
      badge: '+5%',
      badgeColor: 'text-nso-secondary bg-nso-secondary/10',
    },
    {
      label: 'ผู้เล่นทั้งหมด',
      value: overview?.totalPlayers ?? 0,
      icon: Users,
      bg: 'bg-teal-50',
      iconColor: 'text-nso-tertiary',
      badge: 'สะสม',
      badgeColor: 'text-nso-primary bg-nso-primary/10',
    },
    {
      label: 'กำลังออนไลน์',
      value: 0,
      icon: Zap,
      bg: 'bg-nso-primary',
      iconColor: 'text-white',
      dark: true,
      badge: 'Live',
      badgeColor: 'text-green-400',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl animate-slide-up">
      {/* Greeting */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">
          ยินดีต้อนรับกลับ, <span className="text-nso-primary">{firstName}</span>
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          นี่คือภาพรวมของระบบควิซ NSO สำหรับวันนี้
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`rounded-xl p-4 md:p-6 border transition-all hover:-translate-y-0.5 ${
              s.dark
                ? 'bg-nso-primary border-nso-primary-container shadow-primary relative overflow-hidden'
                : 'bg-white border-nso-outline-variant/30 shadow-card'
            }`}
          >
            <div className="flex justify-between items-start mb-3 md:mb-4">
              <div className={`p-2 md:p-3 rounded-lg ${s.bg}`}>
                <s.icon className={`w-4 h-4 md:w-5 md:h-5 ${s.iconColor}`} />
              </div>
              {s.dark ? (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-xs text-white/80 hidden sm:inline">Live</span>
                </span>
              ) : (
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded hidden sm:inline ${s.badgeColor}`}>
                  {s.badge}
                </span>
              )}
            </div>
            <p className={`text-xs font-medium mb-1 ${s.dark ? 'text-white/70' : 'text-muted-foreground'}`}>
              {s.label}
            </p>
            <p className={`text-xl md:text-2xl font-bold ${s.dark ? 'text-white' : 'text-foreground'}`}>
              {s.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <Link
          href="/quizzes/new"
          className="bg-nso-primary-container text-white rounded-2xl p-5 md:p-7 flex items-center gap-4 md:gap-5 hover:opacity-95 transition-all group relative overflow-hidden shadow-primary"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-nso-primary to-nso-primary-container opacity-90" />
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform relative z-10 flex-shrink-0">
            <Plus className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <div className="flex-1 relative z-10 min-w-0">
            <p className="font-bold text-sm md:text-base">สร้างควิซใหม่</p>
            <p className="text-white/80 text-xs md:text-sm mt-0.5">สร้างแบบทดสอบจากข้อมูลสถิติของคุณ</p>
          </div>
          <ArrowRight className="w-5 h-5 text-white/80 group-hover:translate-x-1 transition-transform relative z-10 flex-shrink-0" />
        </Link>

        <Link
          href="/sessions"
          className="bg-white border border-nso-outline-variant/40 rounded-2xl p-5 md:p-7 flex items-center gap-4 md:gap-5 hover:shadow-card-hover transition-all group shadow-card"
        >
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-nso-secondary/10 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
            <History className="w-5 h-5 md:w-6 md:h-6 text-nso-secondary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm md:text-base text-foreground">ประวัติเซสชัน</p>
            <p className="text-muted-foreground text-xs md:text-sm mt-0.5">ดูผลคะแนนและสถิติย้อนหลัง</p>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-nso-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
        </Link>
      </div>

      {/* Recent Quizzes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">ควิซล่าสุด</h2>
          <Link
            href="/quizzes"
            className="text-sm text-nso-primary hover:underline flex items-center gap-1 font-medium transition-colors"
          >
            ดูทั้งหมด <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-nso-outline-variant/30 shadow-card overflow-hidden">
          {quizzes?.items?.slice(0, 5).map((quiz, i) => (
            <div
              key={quiz.id}
              className={`flex items-center gap-3 md:gap-4 px-4 md:px-5 py-3 md:py-4 hover:bg-nso-surface-low transition-colors ${
                i !== 0 ? 'border-t border-nso-outline-variant/20' : ''
              }`}
            >
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-nso-primary-fixed/30 border border-nso-primary-fixed flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-nso-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">{quiz.title}</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {quiz._count?.questions ?? 0} คำถาม · {timeAgo(quiz.updatedAt)}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Link
                  href={`/quizzes/${quiz.id}/edit`}
                  className="hidden sm:flex px-3 py-1.5 rounded-lg border border-nso-primary text-nso-primary text-xs font-semibold hover:bg-nso-primary-fixed/20 transition-colors"
                >
                  แก้ไข
                </Link>
                <button
                  onClick={() => handleHost(quiz.id)}
                  disabled={isChecking(quiz.id)}
                  className="px-2.5 md:px-3 py-1.5 rounded-lg bg-nso-primary text-white text-xs font-semibold hover:bg-nso-primary-container disabled:opacity-50 transition-colors flex items-center gap-1"
                >
                  {isChecking(quiz.id) ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Play className="w-3 h-3" />
                  )}
                  <span className="hidden sm:inline">Host</span>
                </button>
              </div>
            </div>
          ))}

          {!quizzes?.items?.length && (
            <div className="p-10 text-center">
              <div className="w-12 h-12 rounded-xl bg-nso-primary-fixed/30 flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-6 h-6 text-nso-primary" />
              </div>
              <p className="font-semibold text-foreground">ยังไม่มีควิซ</p>
              <p className="text-muted-foreground text-sm mb-4">สร้างควิซแรกของคุณเพื่อเริ่มต้น</p>
              <Link
                href="/quizzes/new"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-nso-primary text-white text-sm font-semibold hover:bg-nso-primary-container transition-colors"
              >
                <Plus className="w-4 h-4" /> สร้างควิซ
              </Link>
            </div>
          )}
        </div>
      </div>
      <SmartHostDialog
        dialog={dialog}
        setDialog={setDialog}
        onResume={handleResume}
        onCancelAndCreate={handleCancelAndCreate}
        onAbortAndCreate={handleAbortAndCreate}
        isPending={isDialogPending}
      />
    </div>
  );
}

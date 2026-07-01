'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { ChevronLeft, ChevronRight, ShieldAlert, ToggleLeft, UserPlus, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogItem {
  id: string;
  action: string;
  targetUserId?: string;
  targetUserName?: string;
  targetUserEmail?: string;
  adminId?: string;
  adminName?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

interface LogsResponse {
  items: LogItem[];
  total: number;
  page: number;
  totalPages: number;
}

const ACTION_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  ROLE_CHANGED: { label: 'เปลี่ยน Role', icon: ShieldAlert, color: 'bg-amber-50 text-amber-700' },
  STATUS_TOGGLED: { label: 'เปลี่ยนสถานะ', icon: ToggleLeft, color: 'bg-blue-50 text-blue-700' },
  USER_CREATED: { label: 'สร้างผู้ใช้', icon: UserPlus, color: 'bg-emerald-50 text-emerald-700' },
};

const ROLE_LABEL: Record<string, string> = { ADMIN: 'แอดมิน', HOST: 'โฮสต์', PLAYER: 'ผู้เล่น' };

function formatDetails(action: string, details?: Record<string, unknown>) {
  if (!details) return null;
  if (action === 'ROLE_CHANGED') {
    return `${ROLE_LABEL[String(details.from)] ?? details.from} → ${ROLE_LABEL[String(details.to)] ?? details.to}`;
  }
  if (action === 'STATUS_TOGGLED') {
    return details.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน';
  }
  return JSON.stringify(details);
}

export default function AdminLogsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<LogsResponse>({
    queryKey: ['admin', 'logs', page],
    queryFn: () => adminApi.logs(page).then((r) => r.data),
    refetchInterval: 60_000,
  });

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-nso-outline-variant/30 shadow-card overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-nso-outline-variant/20 flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">บันทึกการดำเนินการของแอดมิน</p>
          <span className="text-xs text-muted-foreground">
            {data ? `${data.total.toLocaleString()} รายการ` : ''}
          </span>
        </div>

        {/* Logs list */}
        <div className="divide-y divide-nso-outline-variant/10">
          {isLoading
            ? [...Array(10)].map((_, i) => (
                <div key={i} className="px-5 py-4 flex gap-4">
                  <div className="w-8 h-8 rounded-lg bg-muted/40 animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-muted/40 rounded animate-pulse w-48" />
                    <div className="h-3 bg-muted/30 rounded animate-pulse w-32" />
                  </div>
                  <div className="h-3 bg-muted/30 rounded animate-pulse w-24 flex-shrink-0" />
                </div>
              ))
            : data?.items.length === 0
            ? (
              <div className="px-5 py-12 text-center">
                <Info className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">ยังไม่มีบันทึกกิจกรรม</p>
                <p className="text-xs text-muted-foreground/60 mt-1">กิจกรรมจะปรากฏเมื่อแอดมินดำเนินการใดๆ</p>
              </div>
            )
            : data?.items.map((log) => {
                const meta = ACTION_META[log.action] ?? { label: log.action, icon: Info, color: 'bg-muted text-muted-foreground' };
                const Icon = meta.icon;
                const detail = formatDetails(log.action, log.details);
                return (
                  <div key={log.id} className="px-5 py-3.5 flex items-start gap-4 hover:bg-nso-surface/20 transition-colors">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', meta.color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="text-sm font-medium text-foreground">{meta.label}</span>
                        {log.targetUserName && (
                          <span className="text-sm text-muted-foreground truncate">
                            ผู้ใช้ <span className="font-medium text-foreground">{log.targetUserName}</span>
                          </span>
                        )}
                        {detail && (
                          <span className="text-xs text-muted-foreground">({detail})</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {log.adminName ? `โดย ${log.adminName}` : 'ระบบ'}
                        {log.targetUserEmail && ` · ${log.targetUserEmail}`}
                      </p>
                    </div>
                    <time className="text-xs text-muted-foreground flex-shrink-0 pt-0.5">
                      {new Date(log.createdAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                    </time>
                  </div>
                );
              })}
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-nso-outline-variant/20">
            <p className="text-xs text-muted-foreground">หน้า {page} / {data.totalPages}</p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-nso-surface disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="p-1.5 rounded-lg hover:bg-nso-surface disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

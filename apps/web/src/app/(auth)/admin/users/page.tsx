'use client';
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Search, ChevronLeft, ChevronRight, UserCheck, UserX, ShieldCheck, User, Gamepad2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface UserItem {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'ADMIN' | 'HOST' | 'PLAYER';
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  nsoUsername?: string;
  nsoBranch?: string;
  nsoDepartment?: string;
  nsoProvinceCode?: string;
  _count: { quizzes: number; sessions: number };
}

interface UsersResponse {
  items: UserItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const ROLES = [
  { value: 'ADMIN', label: 'แอดมิน', icon: ShieldCheck, color: 'text-destructive bg-destructive/10' },
  { value: 'HOST', label: 'โฮสต์', icon: UserCheck, color: 'text-nso-primary bg-nso-primary/10' },
  { value: 'PLAYER', label: 'ผู้เล่น', icon: Gamepad2, color: 'text-muted-foreground bg-muted' },
];

function RoleBadge({ role }: { role: string }) {
  const r = ROLES.find((x) => x.value === role);
  if (!r) return null;
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium', r.color)}>
      <r.icon className="w-3 h-3" />
      {r.label}
    </span>
  );
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const qc = useQueryClient();

  const onSearchChange = useCallback((v: string) => {
    setSearch(v);
    setPage(1);
    clearTimeout((window as any).__adminSearchTimer);
    (window as any).__adminSearchTimer = setTimeout(() => setDebouncedSearch(v), 400);
  }, []);

  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: ['admin', 'users', page, debouncedSearch],
    queryFn: () => adminApi.users(page, debouncedSearch || undefined).then((r) => r.data),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => adminApi.updateRole(id, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('เปลี่ยน Role สำเร็จ');
      setEditingRole(null);
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  });

  const statusMutation = useMutation({
    mutationFn: (id: string) => adminApi.toggleStatus(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('เปลี่ยนสถานะสำเร็จ');
    },
    onError: () => toast.error('เกิดข้อผิดพลาด'),
  });

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="bg-white rounded-2xl border border-nso-outline-variant/30 shadow-card p-4 flex items-center gap-3">
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="ค้นหาชื่อ, อีเมล หรือ username NSO..."
          className="flex-1 text-sm outline-none placeholder:text-muted-foreground/60 bg-transparent"
        />
        {search && (
          <button onClick={() => onSearchChange('')} className="text-xs text-muted-foreground hover:text-foreground">
            ล้าง
          </button>
        )}
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {data ? `${data.total.toLocaleString()} คน` : ''}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-nso-outline-variant/30 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-nso-outline-variant/20 bg-nso-surface/50">
                <th className="text-left px-5 py-3 font-semibold text-muted-foreground">ผู้ใช้</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">หน่วยงาน</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden lg:table-cell">สถิติ</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden xl:table-cell">เข้าสู่ระบบล่าสุด</th>
                <th className="text-right px-5 py-3 font-semibold text-muted-foreground">การกระทำ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-nso-outline-variant/10">
              {isLoading
                ? [...Array(8)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(5)].map((_, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-4 bg-muted/40 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                : data?.items.map((u) => (
                    <tr key={u.id} className={cn('hover:bg-nso-surface/30 transition-colors', !u.isActive && 'opacity-60')}>
                      {/* User */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-nso-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-nso-primary">
                            {u.name?.[0]?.toUpperCase() ?? '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate max-w-[160px]">{u.name}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[160px]">
                              {u.nsoUsername ? `@${u.nsoUsername}` : u.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <p className="text-xs text-foreground truncate max-w-[150px]">
                          {u.nsoBranch ?? u.nsoDepartment ?? '—'}
                        </p>
                        {u.nsoProvinceCode && (
                          <p className="text-xs text-muted-foreground">จังหวัด {u.nsoProvinceCode}</p>
                        )}
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3.5">
                        {editingRole === u.id ? (
                          <div className="flex flex-col gap-1">
                            {ROLES.map((r) => (
                              <button
                                key={r.value}
                                onClick={() => roleMutation.mutate({ id: u.id, role: r.value })}
                                disabled={roleMutation.isPending}
                                className={cn(
                                  'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-medium transition-colors',
                                  r.color,
                                  u.role === r.value && 'ring-2 ring-current',
                                )}
                              >
                                <r.icon className="w-3 h-3" />
                                {r.label}
                              </button>
                            ))}
                            <button
                              onClick={() => setEditingRole(null)}
                              className="text-xs text-muted-foreground hover:text-foreground mt-1"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setEditingRole(u.id)} className="hover:opacity-80 transition-opacity">
                            <RoleBadge role={u.role} />
                          </button>
                        )}
                      </td>

                      {/* Stats */}
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <p className="text-xs text-foreground">{u._count.quizzes} ควิซ</p>
                        <p className="text-xs text-muted-foreground">{u._count.sessions} เซสชัน</p>
                      </td>

                      {/* Last login */}
                      <td className="px-4 py-3.5 hidden xl:table-cell">
                        <p className="text-xs text-muted-foreground">
                          {u.lastLoginAt
                            ? new Date(u.lastLoginAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })
                            : '—'}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => statusMutation.mutate(u.id)}
                          disabled={statusMutation.isPending}
                          title={u.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                          className={cn(
                            'inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors',
                            u.isActive
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
                          )}
                        >
                          {u.isActive ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                          {u.isActive ? 'ปิด' : 'เปิด'}
                        </button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-nso-outline-variant/20">
            <p className="text-xs text-muted-foreground">
              หน้า {page} / {data.totalPages}
            </p>
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

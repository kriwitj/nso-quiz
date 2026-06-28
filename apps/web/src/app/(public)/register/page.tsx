'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { BarChart3, User, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error('รหัสผ่านไม่ตรงกัน');
      return;
    }
    setLoading(true);
    try {
      await authApi.register({ email: form.email, name: form.name, password: form.password });
      toast.success('สร้างบัญชีสำเร็จ! กำลังเข้าสู่ระบบ...');
      await signIn('credentials', {
        email: form.email,
        password: form.password,
        callbackUrl: '/dashboard',
      });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full py-3 rounded-xl bg-white border border-nso-outline-variant/50 focus:border-nso-primary focus:ring-2 focus:ring-nso-primary/20 outline-none transition-all text-foreground placeholder:text-muted-foreground/60';

  return (
    <div className="min-h-screen bg-nso-surface flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-nso-primary flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-bold text-nso-primary text-lg leading-tight block">NSO Quiz</span>
            <span className="text-muted-foreground text-[10px] uppercase tracking-wider">Data Insights</span>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">สมัครสมาชิก</h1>
          <p className="text-muted-foreground mt-1 text-sm">สร้างบัญชีเพื่อเริ่มสร้างแบบทดสอบ</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-nso-outline-variant/30 shadow-card p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">ชื่อ-นามสกุล</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className={`${inputClass} pl-10 pr-4`}
                  placeholder="ชื่อ นามสกุล"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">อีเมล</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className={`${inputClass} pl-10 pr-4`}
                  placeholder="you@nso.go.th"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">รหัสผ่าน</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className={`${inputClass} pl-10 pr-12`}
                  placeholder="อย่างน้อย 8 ตัวอักษร"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">ยืนยันรหัสผ่าน</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  value={form.confirm}
                  onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                  className={`${inputClass} pl-10 pr-4`}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-nso-primary text-white font-semibold hover:bg-nso-primary-container disabled:opacity-60 transition-all shadow-primary flex items-center justify-center gap-2 group mt-2"
            >
              {loading ? (
                <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  สร้างบัญชี
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            มีบัญชีอยู่แล้ว?{' '}
            <Link href="/login" className="text-nso-primary font-semibold hover:underline">
              เข้าสู่ระบบ
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          สำนักงานสถิติแห่งชาติ · กระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม
        </p>
      </div>
    </div>
  );
}

'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BarChart3, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signIn('credentials', {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      if (res?.error) {
        toast.error('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      } else {
        router.push('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-nso-surface flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-nso-primary p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-nso-primary via-nso-primary-container to-nso-secondary opacity-90" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-white/5 rounded-full" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-bold text-white text-lg leading-tight block">NSO Quiz</span>
            <span className="text-white/60 text-xs uppercase tracking-wider">Data Insights</span>
          </div>
        </div>

        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            ระบบแบบทดสอบ<br />ออนไลน์สถิติแห่งชาติ
          </h2>
          <p className="text-white/70 text-base leading-relaxed max-w-sm">
            สร้าง จัดการ และวิเคราะห์แบบทดสอบความรู้ด้านสถิติ สำหรับบุคลากรสำนักงานสถิติแห่งชาติ
          </p>

          <div className="mt-10 grid grid-cols-3 gap-6">
            {[
              { value: '5+', label: 'รูปแบบคำถาม' },
              { value: '1,000', label: 'ผู้เล่นต่อห้อง' },
              { value: 'Real-time', label: 'อัปเดตคะแนน' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-white/60 text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-white/40 text-xs">
          © 2026 สำนักงานสถิติแห่งชาติ
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-nso-primary flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-bold text-nso-primary text-lg leading-tight block">NSO Quiz</span>
              <span className="text-muted-foreground text-xs uppercase tracking-wider">Data Insights</span>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">ยินดีต้อนรับกลับ</h1>
            <p className="text-muted-foreground mt-1">เข้าสู่ระบบเพื่อจัดการแบบทดสอบของคุณ</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                อีเมล
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-nso-outline-variant/50 focus:border-nso-primary focus:ring-2 focus:ring-nso-primary/20 outline-none transition-all text-foreground placeholder:text-muted-foreground/60"
                  placeholder="you@nso.go.th"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-foreground">
                  รหัสผ่าน
                </label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full pl-10 pr-12 py-3 rounded-xl bg-white border border-nso-outline-variant/50 focus:border-nso-primary focus:ring-2 focus:ring-nso-primary/20 outline-none transition-all text-foreground placeholder:text-muted-foreground/60"
                  placeholder="••••••••"
                  required
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-nso-primary text-white font-semibold hover:bg-nso-primary-container disabled:opacity-60 transition-all shadow-primary flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  เข้าสู่ระบบ
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            ยังไม่มีบัญชี?{' '}
            <Link href="/register" className="text-nso-primary font-semibold hover:underline">
              สมัครสมาชิก
            </Link>
          </p>

          <div className="mt-8 pt-6 border-t border-nso-outline-variant/30">
            <p className="text-center text-xs text-muted-foreground">
              สำนักงานสถิติแห่งชาติ · กระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

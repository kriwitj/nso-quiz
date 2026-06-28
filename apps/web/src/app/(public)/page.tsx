import Link from 'next/link';
import { ArrowRight, BarChart3, Users, Trophy, Zap, Play, ChevronRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-nso-surface">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-nso-outline-variant/30 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-nso-primary flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-nso-primary text-base leading-tight block">NSO Quiz</span>
              <span className="text-muted-foreground text-[10px] uppercase tracking-wider">Data Insights</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
            >
              เข้าสู่ระบบ
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-lg bg-nso-primary text-white text-sm font-semibold hover:bg-nso-primary-container transition-colors shadow-primary"
            >
              เริ่มต้นใช้งาน
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-nso-primary-fixed/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-nso-primary-fixed/50 border border-nso-primary/20 text-nso-primary text-sm font-medium mb-8">
            <Zap className="w-4 h-4" />
            <span>ระบบแบบทดสอบออนไลน์ Real-time</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-foreground leading-tight mb-6 max-w-3xl">
            ทดสอบความรู้สถิติ
            <br />
            <span className="text-nso-primary">อย่างมีชีวิตชีวา</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl leading-relaxed">
            สร้างแบบทดสอบออนไลน์สำหรับบุคลากร NSO จัดเซสชันกลุ่ม
            ดูคะแนนอัปเดต Real-time และวิเคราะห์ผลลัพธ์เชิงลึก
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-nso-primary text-white font-semibold text-base hover:bg-nso-primary-container transition-all shadow-primary group"
            >
              เริ่มต้นใช้งานฟรี
              <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/join"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white border border-nso-outline-variant/50 text-foreground font-semibold text-base hover:bg-nso-surface-low transition-all"
            >
              <Play className="w-5 h-5 text-nso-secondary" />
              เข้าร่วมเกม
            </Link>
          </div>

          {/* Stats row */}
          <div className="mt-16 flex flex-wrap gap-8">
            {[
              { value: '5+', label: 'รูปแบบคำถาม' },
              { value: '1,000+', label: 'ผู้เล่นต่อห้อง' },
              { value: '<100ms', label: 'ความหน่วงของระบบ' },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <p className="text-2xl font-bold text-nso-primary">{s.value}</p>
                <p className="text-muted-foreground text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block px-3 py-1 rounded-full bg-nso-primary-fixed/40 text-nso-primary text-xs font-semibold uppercase tracking-wider mb-3">
              ฟีเจอร์หลัก
            </span>
            <h2 className="text-3xl font-bold text-foreground">
              ครบครันทุกความต้องการสำหรับการทดสอบ
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Zap,
                title: 'Real-Time Gameplay',
                desc: 'คำถามถูกส่งพร้อมกัน คะแนนอัปเดต Live ทุกการตอบ',
                iconBg: 'bg-nso-primary-fixed/30',
                iconColor: 'text-nso-primary',
              },
              {
                icon: Users,
                title: 'รองรับผู้เล่นจำนวนมาก',
                desc: 'รองรับผู้เล่นได้สูงสุด 1,000 คนต่อห้อง ไม่มีปัญหาด้านประสิทธิภาพ',
                iconBg: 'bg-purple-100',
                iconColor: 'text-nso-secondary',
              },
              {
                icon: Trophy,
                title: 'Leaderboard แบบ Live',
                desc: 'ดูการจัดอันดับเปลี่ยนแปลง Real-time พร้อม animation',
                iconBg: 'bg-amber-50',
                iconColor: 'text-amber-600',
              },
              {
                icon: BarChart3,
                title: 'วิเคราะห์เชิงลึก',
                desc: 'สถิติรายคำถาม การกระจายคำตอบ และอัตราความสำเร็จ',
                iconBg: 'bg-teal-50',
                iconColor: 'text-nso-tertiary',
              },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-nso-surface rounded-2xl p-6 border border-nso-outline-variant/30 hover:-translate-y-1 transition-all duration-300 group"
              >
                <div className={`w-12 h-12 rounded-xl ${f.iconBg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <f.icon className={`w-6 h-6 ${f.iconColor}`} />
                </div>
                <h3 className="font-bold text-base text-foreground mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block px-3 py-1 rounded-full bg-nso-primary-fixed/40 text-nso-primary text-xs font-semibold uppercase tracking-wider mb-3">
              วิธีใช้งาน
            </span>
            <h2 className="text-3xl font-bold text-foreground">เริ่มต้นได้ใน 3 ขั้นตอน</h2>
          </div>

          <div className="space-y-6">
            {[
              {
                step: '01',
                title: 'สร้างแบบทดสอบ',
                desc: 'เพิ่มคำถามได้หลากหลายรูปแบบ ทั้งปรนัย, เติมคำ, และอื่นๆ',
                href: '/register',
                cta: 'เริ่มสร้าง',
              },
              {
                step: '02',
                title: 'เปิดเซสชัน',
                desc: 'กด Host เพื่อเริ่มห้องและแชร์รหัสให้ผู้เล่นเข้าร่วม',
                href: '/login',
                cta: 'ดูตัวอย่าง',
              },
              {
                step: '03',
                title: 'ดูผลลัพธ์',
                desc: 'วิเคราะห์คะแนน ดูสถิติรายบุคคลและรายคำถามแบบละเอียด',
                href: '/register',
                cta: 'สมัครฟรี',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="bg-white rounded-2xl border border-nso-outline-variant/30 shadow-card p-6 flex items-start gap-6"
              >
                <div className="w-14 h-14 rounded-2xl bg-nso-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">{item.step}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base text-foreground mb-1">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">{item.desc}</p>
                </div>
                <Link
                  href={item.href}
                  className="flex-shrink-0 flex items-center gap-1 text-nso-primary text-sm font-semibold hover:underline"
                >
                  {item.cta} <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="bg-nso-primary rounded-3xl p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-nso-primary via-nso-primary-container to-nso-secondary opacity-90" />
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-3xl font-bold text-white mb-4">
                พร้อมเริ่มต้นแล้วหรือยัง?
              </h2>
              <p className="text-white/70 mb-8 max-w-lg mx-auto">
                สร้างแบบทดสอบแรกของคุณภายในไม่กี่นาที ไม่ต้องมีบัตรเครดิต
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-nso-primary font-semibold text-base hover:bg-nso-surface transition-all group"
              >
                สมัครสมาชิกฟรี
                <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-nso-outline-variant/30 px-6 py-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-nso-primary flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-nso-primary text-sm">NSO Quiz</span>
          </div>
          <p className="text-muted-foreground text-sm text-center">
            © 2026 สำนักงานสถิติแห่งชาติ กระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม
          </p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/login" className="hover:text-foreground transition-colors">เข้าสู่ระบบ</Link>
            <Link href="/register" className="hover:text-foreground transition-colors">สมัครสมาชิก</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

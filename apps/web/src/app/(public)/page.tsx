import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Globe,
  Play,
  Shield,
  Star,
  Trophy,
  Users,
  Zap,
  Facebook,
  Youtube,
  Mail,
  Phone,
  MessageCircle,
} from 'lucide-react';

const NAV_LINKS = [
  { label: 'หน้าหลัก', href: '#' },
  { label: 'คุณสมบัติ', href: '#features' },
  { label: 'วิธีใช้งาน', href: '#how-it-works' },
  { label: 'ราคา', href: '#pricing' },
  { label: 'ช่วยเหลือ', href: '#help' },
];

const STATS = [
  { icon: Users, value: '1,000+', label: 'ผู้เล่นต่อห้อง', color: 'text-nso-primary' },
  { icon: BookOpen, value: '5+', label: 'ประเภทคำถาม', color: 'text-nso-secondary' },
  { icon: Zap, value: 'เรียลไทม์', label: 'อัปเดตคะแนนทันที', color: 'text-amber-500' },
  { icon: Shield, value: 'ปลอดภัย', label: 'เชื่อถือได้ มั่นใจในข้อมูล', color: 'text-nso-tertiary' },
];

const FEATURES = [
  {
    icon: Zap,
    title: 'สร้างง่าย รวดเร็ว',
    desc: 'สร้างแบบทดสอบได้ทันทีด้วยอินเทอร์เฟซที่เรียบง่าย เพิ่มคำถามหลายรูปแบบได้ในไม่กี่นาที',
    iconBg: 'bg-blue-100',
    iconColor: 'text-nso-primary',
    badgeColor: 'bg-blue-50 text-nso-primary',
  },
  {
    icon: Globe,
    title: 'เล่นได้ทุกที่ ทุกเวลา',
    desc: 'รองรับทุกอุปกรณ์ ทั้งมือถือ แท็บเล็ต และคอมพิวเตอร์ ไม่ต้องติดตั้งแอปพลิเคชัน',
    iconBg: 'bg-purple-100',
    iconColor: 'text-nso-secondary',
    badgeColor: 'bg-purple-50 text-nso-secondary',
  },
  {
    icon: Trophy,
    title: 'ผลคะแนนแบบเรียลไทม์',
    desc: 'ดูคะแนนและอันดับอัปเดตสด ๆ ระหว่างเกม พร้อมแอนิเมชันที่สร้างความตื่นเต้น',
    iconBg: 'bg-teal-100',
    iconColor: 'text-nso-tertiary',
    badgeColor: 'bg-teal-50 text-nso-tertiary',
  },
  {
    icon: BarChart3,
    title: 'รายงานและวิเคราะห์',
    desc: 'รายงานเชิงลึกรายคำถามและรายบุคคล พร้อมกราฟสถิติที่เข้าใจง่าย',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    badgeColor: 'bg-amber-50 text-amber-600',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-['Be_Vietnam_Pro',sans-serif]">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-nso-outline-variant/20">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-3.5 flex items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-nso-primary flex items-center justify-center shadow-primary">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-nso-primary text-base leading-none block">NSO Quiz</span>
              <span className="text-muted-foreground text-[10px] leading-none">สำนักงานสถิติแห่งชาติ</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-nso-surface-low transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/login"
              className="hidden sm:inline-flex text-sm font-semibold text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-nso-surface-low transition-colors"
            >
              เข้าสู่ระบบ
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-nso-primary text-white text-sm font-semibold hover:bg-nso-primary-container transition-all shadow-primary"
            >
              <span className="hidden sm:inline">เริ่มต้นใช้งานฟรี</span>
              <span className="sm:hidden">สมัคร</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-nso-primary-fixed/10 to-white pt-14 pb-10 md:pt-20 md:pb-16">
        <div className="pointer-events-none absolute top-0 right-0 w-[700px] h-[700px] bg-nso-primary-fixed/20 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3" />
        <div className="pointer-events-none absolute bottom-0 left-0 w-[400px] h-[400px] bg-nso-secondary/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

        <div className="relative z-10 max-w-7xl mx-auto px-5 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left: Text */}
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-nso-primary-fixed/50 border border-nso-primary/20 text-nso-primary text-xs font-semibold mb-6">
              <Zap className="w-3.5 h-3.5" />
              <span>แพลตฟอร์มสร้างแบบทดสอบออนไลน์แบบเรียลไทม์</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold text-foreground leading-tight mb-5">
              สร้างแบบทดสอบ{' '}
              <span className="bg-gradient-to-r from-nso-primary to-nso-secondary bg-clip-text text-transparent">
                สนุก ได้ความรู้
              </span>{' '}
              แบบเรียลไทม์
            </h1>

            <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">
              สร้างห้องทดสอบ แชร์รหัสให้ผู้เล่นเข้าร่วมทันที ดูคะแนนสด
              จัดอันดับ และวิเคราะห์ผลได้ในระบบเดียว
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-nso-primary text-white font-bold text-sm hover:bg-nso-primary-container transition-all shadow-primary group"
              >
                <Zap className="w-4 h-4" />
                สร้างแบบทดสอบฟรี
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/join"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white border border-nso-outline-variant/50 text-foreground font-bold text-sm hover:bg-nso-surface-low transition-all"
              >
                <Users className="w-4 h-4 text-nso-secondary" />
                เข้าร่วมเกม
              </Link>
            </div>

            <div className="mt-8 flex items-center gap-4">
              <div className="flex -space-x-2">
                {['🧑', '👩', '👨', '🧒'].map((e, i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-nso-primary-fixed/40 border-2 border-white flex items-center justify-center text-sm">
                    {e}
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="font-bold text-foreground">10,000+</span> ผู้ใช้งานทั่วประเทศ
              </p>
              <div className="hidden sm:flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
            </div>
          </div>

          {/* Right: Hero image + floating elements */}
          <div className="relative flex items-center justify-center lg:justify-end mt-6 lg:mt-0">
            <div className="relative w-full max-w-[480px]">
              {/* Hero image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/images/hero-image.png`}
                alt="NSO Quiz hero"
                className="w-full h-auto object-contain drop-shadow-2xl"
              />

              {/* Floating leaderboard */}
              <div className="absolute bottom-8 -left-4 lg:-left-10 bg-white rounded-2xl shadow-[0_12px_30px_-6px_rgba(0,70,173,0.18)] border border-nso-outline-variant/30 p-3.5 w-44">
                <p className="text-xs font-bold text-foreground mb-2.5 flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  อันดับสด
                </p>
                {[
                  { rank: '🥇', name: 'สมชาย', score: '980' },
                  { rank: '🥈', name: 'สมหญิง', score: '870' },
                  { rank: '🥉', name: 'สมศรี', score: '760' },
                ].map((p) => (
                  <div key={p.rank} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{p.rank}</span>
                      <span className="text-xs font-medium text-foreground">{p.name}</span>
                    </div>
                    <span className="text-xs font-bold text-nso-primary">{p.score}</span>
                  </div>
                ))}
              </div>

              {/* Floating room code badge */}
              <div className="absolute top-4 -right-2 lg:-right-6 bg-nso-primary rounded-xl shadow-primary px-3.5 py-2 text-white">
                <p className="text-[10px] font-medium opacity-80 leading-none mb-0.5">รหัสห้อง</p>
                <p className="text-lg font-extrabold tracking-widest leading-none">A8K3Z1</p>
              </div>

              {/* Floating player count */}
              <div className="absolute top-1/2 -left-4 lg:-left-8 -translate-y-1/2 bg-white rounded-xl border border-nso-outline-variant/30 shadow-card px-3 py-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse flex-shrink-0" />
                <span className="text-xs font-semibold text-foreground whitespace-nowrap">248 คน Online</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="px-5 md:px-8 py-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl border border-nso-outline-variant/30 shadow-card px-6 py-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-5 gap-x-4 lg:divide-x lg:divide-nso-outline-variant/20">
              {STATS.map((stat, i) => (
                <div key={stat.label} className={`flex items-center gap-3 ${i > 0 ? 'lg:pl-6' : ''}`}>
                  <div className="w-10 h-10 rounded-xl bg-nso-surface flex items-center justify-center flex-shrink-0">
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="font-extrabold text-base text-foreground leading-none">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-5 md:px-8 py-16 md:py-24 bg-nso-surface">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block px-3.5 py-1.5 rounded-full bg-nso-primary-fixed/40 text-nso-primary text-xs font-bold uppercase tracking-wider mb-4">
              ฟีเจอร์หลัก
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">
              ครบทุกฟีเจอร์ เพื่อการเรียนรู้ที่สนุก
              <br className="hidden sm:block" />
              <span className="text-nso-primary"> และมีประสิทธิภาพ</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm md:text-base">
              ระบบครบครันที่ออกแบบมาเพื่อองค์กรและนักการศึกษา พร้อมใช้งานได้ทันที
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl p-6 border border-nso-outline-variant/20 shadow-card hover:shadow-card-hover hover:-translate-y-1.5 transition-all duration-300 group"
              >
                <div className={`w-12 h-12 rounded-2xl ${f.iconBg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <f.icon className={`w-6 h-6 ${f.iconColor}`} />
                </div>
                <h3 className="font-bold text-base text-foreground mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                <div className={`mt-4 inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${f.badgeColor}`}>
                  <CheckCircle2 className="w-3 h-3" /> พร้อมใช้งาน
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-5 md:px-8 py-16 md:py-24 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block px-3.5 py-1.5 rounded-full bg-nso-primary-fixed/40 text-nso-primary text-xs font-bold uppercase tracking-wider mb-4">
              วิธีใช้งาน
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">
              เริ่มต้นได้ภายใน <span className="text-nso-primary">3 ขั้นตอน</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                icon: BookOpen,
                title: 'สร้างแบบทดสอบ',
                desc: 'เพิ่มคำถามได้หลากหลายรูปแบบ ทั้งปรนัย เติมคำ และอีกมากมาย ในอินเทอร์เฟซที่ใช้งานง่าย',
                color: 'bg-nso-primary',
              },
              {
                step: '02',
                icon: Users,
                title: 'เปิดห้องและเชิญผู้เล่น',
                desc: 'กดเปิดห้องรับรหัส 6 หลัก แล้วแชร์ให้ผู้เล่นสแกน QR หรือพิมพ์รหัสเพื่อเข้าร่วมได้ทันที',
                color: 'bg-nso-secondary',
              },
              {
                step: '03',
                icon: BarChart3,
                title: 'ดูผลและวิเคราะห์',
                desc: 'ตรวจสอบคะแนนสด รายงานรายบุคคล สถิติรายคำถาม และดาวน์โหลดผลลัพธ์ได้ทันที',
                color: 'bg-nso-tertiary',
              },
            ].map((item, i) => (
              <div key={item.step} className="relative">
                {i < 2 && (
                  <div className="hidden md:flex absolute top-10 left-[calc(100%_-_12px)] w-6 z-10 items-center justify-center">
                    <ArrowRight className="w-5 h-5 text-nso-outline-variant" />
                  </div>
                )}
                <div className="bg-nso-surface rounded-2xl p-6 border border-nso-outline-variant/20 h-full hover:shadow-card transition-shadow">
                  <div className={`w-14 h-14 rounded-2xl ${item.color} flex items-center justify-center mb-5`}>
                    <item.icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-xs font-black text-nso-outline mb-1 tracking-widest">{item.step}</div>
                  <h3 className="font-bold text-lg text-foreground mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="px-5 md:px-8 py-16 md:py-20 bg-nso-surface">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-3xl bg-gradient-to-br from-nso-primary via-[#1e5ed3] to-nso-secondary relative overflow-hidden">
            <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 bg-white/5 rounded-full" />
            <div className="pointer-events-none absolute -bottom-16 left-1/3 w-56 h-56 bg-white/5 rounded-full" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center p-8 md:p-12 lg:p-16">
              {/* Left: text */}
              <div>
                <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight mb-5">
                  พร้อมเริ่มสร้าง<br />
                  ประสบการณ์การเรียนรู้<br />
                  <span className="text-blue-200">ที่สนุกและได้ความรู้</span>
                </h2>
                <p className="text-white/75 text-sm md:text-base leading-relaxed mb-8 max-w-md">
                  ไม่ต้องมีบัตรเครดิต สมัครฟรีและเริ่มสร้างแบบทดสอบแรกของคุณได้ภายในไม่กี่นาที
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white text-nso-primary font-bold text-sm hover:bg-nso-surface transition-all group"
                  >
                    <Zap className="w-4 h-4" />
                    เริ่มต้นใช้งานฟรี
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                  <Link
                    href="/join"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 text-white border border-white/20 font-bold text-sm hover:bg-white/20 transition-all"
                  >
                    <Play className="w-4 h-4" />
                    เข้าร่วมเกม
                  </Link>
                </div>
              </div>

              {/* Right: analytics mockup */}
              <div className="flex justify-center lg:justify-end">
                <div className="bg-white/10 backdrop-blur rounded-2xl border border-white/20 p-5 w-full max-w-sm">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-white font-bold text-sm">รายงานผลการทดสอบ</p>
                    <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full">Live</span>
                  </div>

                  {/* Bar chart mockup */}
                  <div className="flex items-end gap-1.5 h-20 mb-4">
                    {[65, 80, 45, 90, 70, 55, 85, 60].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t"
                        style={{
                          height: `${h}%`,
                          background: i % 2 === 0 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)',
                        }}
                      />
                    ))}
                  </div>

                  {/* Stat row */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'คะแนนเฉลี่ย', value: '82%' },
                      { label: 'ผู้เข้าร่วม', value: '248' },
                      { label: 'ถูกต้อง', value: '74%' },
                    ].map((s) => (
                      <div key={s.label} className="bg-white/10 rounded-xl p-2.5 text-center">
                        <p className="text-white font-extrabold text-base">{s.value}</p>
                        <p className="text-white/60 text-[10px]">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Question breakdown */}
                  <div className="mt-3 space-y-2">
                    {['ข้อ 1 — ประชากร', 'ข้อ 2 — GDP', 'ข้อ 3 — เกษตรกรรม'].map((q, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-white/60 text-[10px] w-24 truncate">{q}</span>
                        <div className="h-1.5 flex-1 rounded-full bg-white/20 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-white/80"
                            style={{ width: `${[88, 72, 65][i]}%` }}
                          />
                        </div>
                        <span className="text-white/70 text-[10px] w-7 text-right">{[88, 72, 65][i]}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-nso-outline-variant/30">
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-12 md:py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Brand */}
            <div>
              <Link href="/" className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-nso-primary flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="font-bold text-nso-primary text-base block leading-none">NSO Quiz</span>
                  <span className="text-muted-foreground text-[10px]">สำนักงานสถิติแห่งชาติ</span>
                </div>
              </Link>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                แพลตฟอร์มสร้างแบบทดสอบออนไลน์แบบเรียลไทม์ สำหรับองค์กรและนักการศึกษาทั่วประเทศไทย
              </p>
              <p className="text-xs text-muted-foreground">กระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม</p>
            </div>

            {/* เมนูหลัก */}
            <div>
              <h4 className="font-bold text-foreground mb-4">เมนูหลัก</h4>
              <ul className="space-y-2.5">
                {['หน้าหลัก', 'คุณสมบัติ', 'วิธีใช้งาน', 'ราคา', 'ช่วยเหลือ'].map((l) => (
                  <li key={l}>
                    <Link href="#" className="text-sm text-muted-foreground hover:text-nso-primary transition-colors">
                      {l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* เกี่ยวกับเรา */}
            <div>
              <h4 className="font-bold text-foreground mb-4">เกี่ยวกับเรา</h4>
              <ul className="space-y-2.5">
                {['เกี่ยวกับ NSO', 'นโยบายความเป็นส่วนตัว', 'เงื่อนไขการใช้งาน', 'ติดต่อเรา', 'เข้าสู่ระบบ', 'สมัครสมาชิก'].map((l) => (
                  <li key={l}>
                    <Link href="#" className="text-sm text-muted-foreground hover:text-nso-primary transition-colors">
                      {l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* ติดตามเรา */}
            <div>
              <h4 className="font-bold text-foreground mb-4">ติดตามเรา</h4>
              <div className="flex gap-2.5 mb-5">
                {[
                  { icon: Facebook, label: 'Facebook', color: 'hover:bg-blue-600' },
                  { icon: MessageCircle, label: 'Line', color: 'hover:bg-emerald-500' },
                  { icon: Youtube, label: 'YouTube', color: 'hover:bg-red-600' },
                  { icon: Mail, label: 'Email', color: 'hover:bg-nso-primary' },
                ].map((s) => (
                  <Link
                    key={s.label}
                    href="#"
                    className={`w-9 h-9 rounded-lg bg-nso-surface border border-nso-outline-variant/30 flex items-center justify-center text-muted-foreground hover:text-white transition-all ${s.color}`}
                    aria-label={s.label}
                  >
                    <s.icon className="w-4 h-4" />
                  </Link>
                ))}
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">02-141-7500</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">services@nso.go.th</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright bar */}
        <div className="border-t border-nso-outline-variant/20 px-5 md:px-8 py-4">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground text-center sm:text-left">
              © 2568–2569 สำนักงานสถิติแห่งชาติ กระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม สงวนลิขสิทธิ์
            </p>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <Link href="#" className="hover:text-foreground transition-colors">นโยบายความเป็นส่วนตัว</Link>
              <Link href="#" className="hover:text-foreground transition-colors">เงื่อนไขการใช้งาน</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

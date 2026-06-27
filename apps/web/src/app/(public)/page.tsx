import Link from 'next/link';
import { ArrowRight, Zap, Users, Trophy, BarChart3, Play, Star } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="glass sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl gradient-text">QuizLive</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-32 text-center relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-violet-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-1/4 w-72 h-72 bg-pink-600/10 rounded-full blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm text-violet-400 mb-8">
            <Star className="w-4 h-4" />
            <span>Real-time multiplayer quiz platform</span>
          </div>
          <h1 className="font-display text-6xl md:text-7xl font-bold mb-6">
            Quiz like never
            <br />
            <span className="gradient-text">before</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Create engaging live quiz sessions. Players join instantly with a room code.
            Watch scores update in real-time. Make learning unforgettable.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold text-lg hover:opacity-90 transition-all hover:scale-105"
            >
              Start for Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/join"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl glass text-foreground font-semibold text-lg hover:bg-white/10 transition-all"
            >
              <Play className="w-5 h-5" />
              Join a Game
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-24">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-display text-4xl font-bold text-center mb-16">
            Everything you need for
            <span className="gradient-text"> epic quizzes</span>
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Zap,
                title: 'Real-Time Gameplay',
                desc: 'Questions broadcast instantly. Scores update live for everyone.',
                gradient: 'from-violet-500 to-purple-600',
              },
              {
                icon: Users,
                title: 'Up to 1000 Players',
                desc: 'Scale from classroom to company-wide with no performance issues.',
                gradient: 'from-pink-500 to-rose-600',
              },
              {
                icon: Trophy,
                title: 'Live Leaderboards',
                desc: 'Watch rankings shift in real-time with animated position changes.',
                gradient: 'from-amber-500 to-orange-600',
              },
              {
                icon: BarChart3,
                title: 'Rich Analytics',
                desc: 'Per-question stats, response distributions, and completion rates.',
                gradient: 'from-cyan-500 to-blue-600',
              },
            ].map((f) => (
              <div
                key={f.title}
                className="glass-card p-6 rounded-2xl hover:scale-105 transition-all duration-300 group"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                >
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto glass-card rounded-3xl p-12">
          <div className="grid grid-cols-3 gap-8 text-center">
            {[
              { value: '5', label: 'Question Types', suffix: '+' },
              { value: '1000', label: 'Players per Room', suffix: '+' },
              { value: '< 100', label: 'ms Latency', suffix: '' },
            ].map((s) => (
              <div key={s.label}>
                <div className="font-display text-5xl font-bold gradient-text mb-2">
                  {s.value}
                  {s.suffix}
                </div>
                <div className="text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display text-4xl font-bold mb-6">
            Ready to make learning
            <span className="gradient-text"> addictive?</span>
          </h2>
          <p className="text-muted-foreground mb-8">
            Create your first quiz in minutes. No credit card required.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-10 py-5 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 text-white font-semibold text-lg hover:opacity-90 transition-all hover:scale-105 shadow-lg shadow-violet-500/25"
          >
            Create Your First Quiz
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="glass px-6 py-8 text-center text-muted-foreground text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-semibold text-foreground">QuizLive</span>
        </div>
        <p>&copy; 2026 QuizLive. Built for interactive learning.</p>
      </footer>
    </div>
  );
}

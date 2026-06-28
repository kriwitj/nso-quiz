'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, Hash, User, Smile, Upload, Camera } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const AVATARS = ['cat', 'dog', 'fox', 'panda', 'lion', 'bear', 'rabbit', 'tiger'];
const AVATAR_EMOJIS: Record<string, string> = { cat: '🐱', dog: '🐶', fox: '🦊', panda: '🐼', lion: '🦁', bear: '🐻', rabbit: '🐰', tiger: '🐯' };

export default function JoinPage() {
  const router = useRouter();
  const [step, setStep] = useState<'code' | 'nickname'>('code');
  const [roomCode, setRoomCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('cat');
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code && code.trim().length === 6) {
      setRoomCode(code.toUpperCase());
      setStep('nickname');
    }
  }, []);

  useEffect(() => {
    const video = document.getElementById('camera-preview') as HTMLVideoElement | null;
    if (video && stream) { video.srcObject = stream; video.play().catch(() => null); }
  }, [stream]);

  useEffect(() => {
    return () => { if (stream) stream.getTracks().forEach((t) => t.stop()); };
  }, [stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 240, height: 240 }, audio: false });
      setStream(mediaStream);
      setCameraActive(true);
    } catch { alert('ไม่สามารถเข้าถึงกล้องได้ กรุณาอัปโหลดรูปแทน'); }
  };

  const stopCamera = () => {
    if (stream) { stream.getTracks().forEach((t) => t.stop()); setStream(null); }
    setCameraActive(false);
  };

  const processImage = (fileOrUrl: File | string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const s = 80; canvas.width = s; canvas.height = s;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (img.width > img.height) { sw = img.height; sx = (img.width - img.height) / 2; }
      else { sh = img.width; sy = (img.height - img.width) / 2; }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, s, s);
      setAvatar(canvas.toDataURL('image/jpeg', 0.7));
      if (typeof fileOrUrl === 'string' && fileOrUrl.startsWith('blob:')) URL.revokeObjectURL(fileOrUrl);
    };
    img.src = fileOrUrl instanceof File ? URL.createObjectURL(fileOrUrl) : fileOrUrl;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
  };

  const captureSnapshot = () => {
    const video = document.getElementById('camera-preview') as HTMLVideoElement | null;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) { ctx.drawImage(video, 0, 0, canvas.width, canvas.height); processImage(canvas.toDataURL('image/jpeg')); }
    stopCamera();
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.trim().length === 6) setStep('nickname');
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    sessionStorage.setItem('quiz_nickname', nickname.trim());
    sessionStorage.setItem('quiz_avatar', avatar);
    router.push(`/game/${roomCode.toUpperCase()}/waiting`);
  };

  const inputClass = 'w-full py-3 rounded-xl bg-white border border-nso-outline-variant/50 focus:border-nso-primary focus:ring-2 focus:ring-nso-primary/20 outline-none transition-all text-foreground placeholder:text-muted-foreground/60';

  return (
    <div className="min-h-screen bg-nso-surface flex items-center justify-center p-5">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-nso-primary flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <span className="font-bold text-nso-primary text-lg leading-tight block">NSO Quiz</span>
              <span className="text-muted-foreground text-[10px] uppercase tracking-wider">เข้าร่วมเกม</span>
            </div>
          </Link>
        </div>

        {step === 'code' ? (
          <div className="bg-white rounded-2xl border border-nso-outline-variant/30 shadow-card p-8">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-nso-primary-fixed/30 flex items-center justify-center mx-auto mb-3">
                <Hash className="w-7 h-7 text-nso-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">กรอกรหัสห้อง</h1>
              <p className="text-muted-foreground mt-1.5 text-sm">ขอรหัส 6 หลักจาก Host ของคุณ</p>
            </div>
            <form onSubmit={handleCodeSubmit}>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                className="w-full text-center text-4xl font-bold tracking-widest py-4 px-4 rounded-xl bg-nso-surface border border-nso-outline-variant/50 focus:border-nso-primary focus:ring-2 focus:ring-nso-primary/20 outline-none transition-all uppercase text-foreground"
                placeholder="ABC123"
                maxLength={6}
                autoFocus
              />
              <p className="text-center text-sm text-muted-foreground mt-2">{roomCode.length}/6 ตัวอักษร</p>
              <button
                type="submit"
                disabled={roomCode.length !== 6}
                className="w-full mt-5 py-3.5 rounded-xl bg-nso-primary text-white font-bold text-base hover:bg-nso-primary-container transition-colors disabled:opacity-40 shadow-primary"
              >
                ยืนยันรหัส
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-nso-outline-variant/30 shadow-card p-6 md:p-8">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-3">
                {avatar.startsWith('data:image/') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} className="w-16 h-16 rounded-full object-cover border-2 border-nso-primary shadow" alt="Avatar" />
                ) : (
                  <div className="text-5xl">{AVATAR_EMOJIS[avatar] || '🐱'}</div>
                )}
              </div>
              <h1 className="text-xl font-bold text-foreground">เลือกตัวละครของคุณ</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                ห้อง: <span className="font-mono font-bold text-nso-primary">{roomCode}</span>
              </p>
            </div>

            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">ชื่อเล่น</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value.slice(0, 20))}
                    className={cn(inputClass, 'pl-10 pr-4')}
                    placeholder="ชื่อเล่นของคุณ"
                    maxLength={20}
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-2">
                  <Smile className="w-4 h-4 text-muted-foreground" /> เลือกอวตาร
                </label>

                {cameraActive && (
                  <div className="mb-4 space-y-3 bg-nso-surface border border-nso-outline-variant/30 rounded-2xl p-3 flex flex-col items-center">
                    <video id="camera-preview" className="w-36 h-36 object-cover rounded-xl bg-black border border-nso-outline-variant/30" playsInline muted />
                    <div className="flex gap-2 w-full">
                      <button type="button" onClick={captureSnapshot} className="flex-1 py-2 rounded-xl bg-nso-primary text-white font-bold text-sm hover:bg-nso-primary-container transition-colors">
                        ถ่ายรูป
                      </button>
                      <button type="button" onClick={stopCamera} className="flex-1 py-2 rounded-xl border border-nso-outline-variant/50 font-bold text-sm hover:bg-nso-surface-low transition-colors text-foreground">
                        ยกเลิก
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-4 gap-2 mb-3">
                  {AVATARS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => { stopCamera(); setAvatar(a); }}
                      className={cn(
                        'aspect-square rounded-xl text-3xl flex items-center justify-center transition-all',
                        avatar === a
                          ? 'bg-nso-primary-fixed/40 border-2 border-nso-primary scale-110 shadow-primary'
                          : 'bg-nso-surface border border-nso-outline-variant/30 hover:bg-nso-surface-low'
                      )}
                    >
                      {AVATAR_EMOJIS[a]}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input type="file" id="avatar-upload" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  <button
                    type="button"
                    onClick={() => { stopCamera(); document.getElementById('avatar-upload')?.click(); }}
                    className="flex-1 py-2.5 rounded-xl border border-nso-outline-variant/50 bg-nso-surface flex items-center justify-center gap-2 text-sm font-semibold hover:bg-nso-surface-low transition-colors text-foreground"
                  >
                    <Upload className="w-4 h-4 text-nso-primary" /> อัปโหลดรูป
                  </button>
                  <button
                    type="button"
                    onClick={cameraActive ? stopCamera : startCamera}
                    className="flex-1 py-2.5 rounded-xl border border-nso-outline-variant/50 bg-nso-surface flex items-center justify-center gap-2 text-sm font-semibold hover:bg-nso-surface-low transition-colors text-foreground"
                  >
                    <Camera className="w-4 h-4 text-nso-primary" /> ถ่ายรูป
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={!nickname.trim()}
                className="w-full py-3.5 rounded-xl bg-nso-primary text-white font-bold text-base hover:bg-nso-primary-container disabled:opacity-40 transition-colors shadow-primary"
              >
                เข้าร่วมเกม! 🎮
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

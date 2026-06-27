'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Hash, User, Smile, Upload, Camera } from 'lucide-react';
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
    if (video && stream) {
      video.srcObject = stream;
      video.play().catch(() => null);
    }
  }, [stream]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 240, height: 240 },
        audio: false,
      });
      setStream(mediaStream);
      setCameraActive(true);
    } catch (err) {
      alert('Could not access camera. Please upload a photo instead.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  const processImage = (fileOrUrl: File | string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const targetSize = 80;
      canvas.width = targetSize;
      canvas.height = targetSize;
      
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (img.width > img.height) {
        sw = img.height;
        sx = (img.width - img.height) / 2;
      } else {
        sh = img.width;
        sy = (img.height - img.width) / 2;
      }
      
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetSize, targetSize);
      
      const base64 = canvas.toDataURL('image/jpeg', 0.7);
      setAvatar(base64);
      if (typeof fileOrUrl === 'string' && fileOrUrl.startsWith('blob:')) {
        URL.revokeObjectURL(fileOrUrl);
      }
    };
    
    if (fileOrUrl instanceof File) {
      img.src = URL.createObjectURL(fileOrUrl);
    } else {
      img.src = fileOrUrl;
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  const captureSnapshot = () => {
    const video = document.getElementById('camera-preview') as HTMLVideoElement | null;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      processImage(dataUrl);
    }
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

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="font-display font-bold text-2xl gradient-text">QuizLive</span>
          </Link>
        </div>

        {step === 'code' ? (
          <div className="glass-card rounded-2xl p-8">
            <div className="text-center mb-6">
              <Hash className="w-12 h-12 text-violet-400 mx-auto mb-3" />
              <h1 className="font-display text-2xl font-bold">Enter Room Code</h1>
              <p className="text-muted-foreground mt-2">Ask your host for the 6-character code</p>
            </div>
            <form onSubmit={handleCodeSubmit}>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                className="w-full text-center text-4xl font-display font-bold tracking-widest py-4 px-4 rounded-xl bg-white/5 border border-white/10 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 outline-none transition-all uppercase"
                placeholder="ABC123"
                maxLength={6}
                autoFocus
              />
              <p className="text-center text-sm text-muted-foreground mt-3">{roomCode.length}/6 characters</p>
              <button type="submit" disabled={roomCode.length !== 6} className="w-full mt-6 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-40">
                Join Game
              </button>
            </form>
          </div>
        ) : (
          <div className="glass-card rounded-2xl p-8">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-3">
                {avatar.startsWith('data:image/') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} className="w-16 h-16 rounded-full object-cover border-2 border-violet-500 shadow-lg" alt="Avatar" />
                ) : (
                  <div className="text-5xl">{AVATAR_EMOJIS[avatar] || '🐱'}</div>
                )}
              </div>
              <h1 className="font-display text-2xl font-bold">Pick Your Identity</h1>
              <p className="text-muted-foreground mt-2">Room: <span className="font-mono font-bold text-violet-400">{roomCode}</span></p>
            </div>
            <form onSubmit={handleJoin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2">Nickname</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value.slice(0, 20))} className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none" placeholder="Your nickname" maxLength={20} autoFocus required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-3"><Smile className="inline w-4 h-4 mr-1" /> Choose Avatar</label>
                
                {cameraActive && (
                  <div className="mb-4 space-y-3 bg-black/20 border border-white/10 rounded-2xl p-3 flex flex-col items-center">
                    <video id="camera-preview" className="w-40 h-40 object-cover rounded-xl bg-black border border-white/10" playsInline muted />
                    <div className="flex gap-2 w-full">
                      <button type="button" onClick={captureSnapshot} className="flex-1 py-2 rounded-xl bg-violet-600 font-bold text-sm hover:opacity-90">
                        Capture
                      </button>
                      <button type="button" onClick={stopCamera} className="flex-1 py-2 rounded-xl bg-white/10 font-bold text-sm hover:bg-white/20">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-4 gap-2 mb-4">
                  {AVATARS.map((a) => (
                    <button key={a} type="button" onClick={() => { stopCamera(); setAvatar(a); }} className={cn('aspect-square rounded-xl text-3xl flex items-center justify-center transition-all', avatar === a ? 'bg-violet-600/30 border-2 border-violet-500 scale-110' : 'bg-white/5 border border-white/10 hover:bg-white/10')}>
                      {AVATAR_EMOJIS[a]}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input type="file" id="avatar-upload" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  <button
                    type="button"
                    onClick={() => { stopCamera(); document.getElementById('avatar-upload')?.click(); }}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 text-sm font-semibold hover:bg-white/10 transition-colors"
                  >
                    <Upload className="w-4 h-4 text-violet-400" /> Upload Photo
                  </button>
                  <button
                    type="button"
                    onClick={cameraActive ? stopCamera : startCamera}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 text-sm font-semibold hover:bg-white/10 transition-colors"
                  >
                    <Camera className="w-4 h-4 text-violet-400" /> Take Photo
                  </button>
                </div>
              </div>
              <button type="submit" disabled={!nickname.trim()} className="w-full py-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold text-lg hover:opacity-90 disabled:opacity-40">
                Let&apos;s Play!
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

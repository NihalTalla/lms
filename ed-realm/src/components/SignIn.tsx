import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../lib/auth-context';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from './ui/use-mobile';

const animationStyles = `
@keyframes float1 {
  0%, 100% { transform: translateY(0px) scaleY(1) scaleX(1); }
  30% { transform: translateY(-20px) scaleY(1.04) scaleX(0.97); }
  50% { transform: translateY(-25px) scaleY(1.06) scaleX(0.95); }
  70% { transform: translateY(-15px) scaleY(1.02) scaleX(0.98); }
}
@keyframes float2 {
  0%, 100% { transform: translateY(0px) scaleY(1) scaleX(1); }
  25% { transform: translateY(-18px) scaleY(1.05) scaleX(0.96); }
  50% { transform: translateY(-28px) scaleY(1.07) scaleX(0.94); }
  75% { transform: translateY(-10px) scaleY(0.97) scaleX(1.03); }
}
@keyframes squish {
  0%, 100% { transform: scaleX(1) scaleY(1); }
  25% { transform: scaleX(1.06) scaleY(0.94); }
  50% { transform: scaleX(0.96) scaleY(1.04); }
  75% { transform: scaleX(1.03) scaleY(0.97); }
}
@keyframes dance {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  15% { transform: translateY(-12px) rotate(-4deg); }
  30% { transform: translateY(-3px) rotate(3deg); }
  45% { transform: translateY(-18px) rotate(-2deg); }
  60% { transform: translateY(-6px) rotate(4deg); }
  75% { transform: translateY(-14px) rotate(-3deg); }
  90% { transform: translateY(-2px) rotate(1deg); }
}
@keyframes wiggleBeak {
  0%, 100% { transform: rotate(0deg); }
  20% { transform: rotate(10deg); }
  40% { transform: rotate(-8deg); }
  60% { transform: rotate(6deg); }
  80% { transform: rotate(-4deg); }
}
@keyframes talkBubble {
  0%, 45%, 55%, 100% { opacity: 0; transform: scale(0.6) translateY(8px); }
  50% { opacity: 1; transform: scale(1) translateY(0px); }
}
@keyframes talkBubble2 {
  0%, 70%, 80%, 100% { opacity: 0; transform: scale(0.6) translateY(8px); }
  75% { opacity: 1; transform: scale(1) translateY(0px); }
}
@keyframes heartFloat {
  0% { opacity: 0; transform: translateY(0) scale(0.5); }
  30% { opacity: 1; transform: translateY(-12px) scale(1); }
  100% { opacity: 0; transform: translateY(-40px) scale(0.3); }
}
@keyframes blushPulse {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 0.45; }
}
@keyframes sparkle {
  0%, 100% { opacity: 0; transform: scale(0); }
  50% { opacity: 1; transform: scale(1); }
}
@keyframes softGlow {
  0%, 100% { opacity: 0.08; }
  50% { opacity: 0.18; }
}
@keyframes wave {
  0%, 30%, 100% { transform: rotate(0deg); }
  5% { transform: rotate(18deg); }
  10% { transform: rotate(-12deg); }
  15% { transform: rotate(14deg); }
  20% { transform: rotate(-8deg); }
  25% { transform: rotate(10deg); }
}
@keyframes mouthTalk {
  0%, 40%, 60%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(1.6); }
}
@keyframes shySquish {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(0.94); }
}
@keyframes nod {
  0%, 70%, 100% { transform: translateY(0); }
  75% { transform: translateY(4px); }
  80% { transform: translateY(-2px); }
  85% { transform: translateY(3px); }
}
`;

export function SignIn() {
  const { login } = useAuth();
  const isMobile = useIsMobile();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const success = await login(email, password);
    setLoading(false);
    if (success) {
      toast.success('Successfully logged in!');
    } else {
      toast.error('Invalid credentials. Please try again.');
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    setMouse({
      x: (e.clientX / window.innerWidth - 0.5) * 2,
      y: (e.clientY / window.innerHeight - 0.5) * 2,
    });
  }, []);

  useEffect(() => {
    if (isMobile) {
      return;
    }
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove, isMobile]);

  const pupil = (max = 10) => ({
    transform: isPasswordFocused ? 'translate(0px, 0px)' : `translate(${mouse.x * max}px, ${mouse.y * max}px)`,
    transition: 'transform 0.18s cubic-bezier(0.25, 1, 0.5, 1)',
  });

  const shy = isPasswordFocused;

  return (
    <>
      <style>{animationStyles}</style>
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', minHeight: '100dvh', width: '100%' }}>

        {/* ====== LEFT — 2/3 ANIMATED CHARACTERS ====== */}
        <div style={{
          width: '66.666%', minHeight: '100vh', background: '#EEEEF0',
          display: isMobile ? 'none' : 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden',
        }}>
          {/* ED REALM Logo */}
          <div style={{ padding: '32px 36px', display: 'flex', alignItems: 'center', gap: 12, zIndex: 20 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 19, letterSpacing: 1, fontFamily: 'Arial, sans-serif' }}>ED</span>
            </div>
            <span style={{ fontWeight: 800, fontSize: 26, color: '#1a1a1a', letterSpacing: 4, fontFamily: 'Arial, sans-serif' }}>REALM</span>
          </div>

          {/* Characters area */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Glow blobs */}
            <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,92,252,0.12), transparent 70%)', top: '5%', left: '10%', animation: 'softGlow 6s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(240,96,48,0.1), transparent 70%)', bottom: '5%', right: '15%', animation: 'softGlow 5s ease-in-out infinite 1.5s' }} />

            {/* Sparkles */}
            {[
              { t: '15%', l: '18%', d: '0s', s: 6 }, { t: '25%', l: '72%', d: '1.2s', s: 5 },
              { t: '60%', l: '12%', d: '2.5s', s: 4 }, { t: '70%', l: '60%', d: '3.8s', s: 7 },
              { t: '40%', l: '80%', d: '1.8s', s: 5 }, { t: '85%', l: '40%', d: '4.2s', s: 4 },
            ].map((sp, i) => (
              <div key={i} style={{ position: 'absolute', top: sp.t, left: sp.l, width: sp.s, height: sp.s, borderRadius: '50%', background: '#B8A0FF', animation: `sparkle 3.5s ease-in-out infinite ${sp.d}` }} />
            ))}

            {/* ── CHARACTER GROUP — all snug together ── */}
            <div style={{ position: 'relative', width: 440, height: 400, animation: shy ? 'shySquish 1.5s ease-in-out infinite' : 'none' }}>

              {/* === SPEECH BUBBLES (characters talking to each other) === */}
              {!shy && (
                <>
                  {/* Purple says hi */}
                  <div style={{
                    position: 'absolute', top: -10, left: 70, zIndex: 20,
                    background: '#fff', borderRadius: '14px 14px 14px 4px',
                    padding: '6px 12px', fontSize: 13, color: '#5B3FD4',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                    animation: 'talkBubble 8s ease-in-out infinite',
                    fontWeight: 600,
                  }}>Hey! 👋</div>
                  {/* Dark one replies */}
                  <div style={{
                    position: 'absolute', top: 40, left: 270, zIndex: 20,
                    background: '#fff', borderRadius: '14px 14px 4px 14px',
                    padding: '6px 12px', fontSize: 12, color: '#333',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                    animation: 'talkBubble2 8s ease-in-out infinite',
                    fontWeight: 500,
                  }}>Hi! 😊</div>
                </>
              )}

              {/* Floating hearts */}
              {!shy && (
                <>
                  <div style={{ position: 'absolute', top: 20, left: 200, zIndex: 20, fontSize: 14, animation: 'heartFloat 4s ease-in-out infinite 1s' }}>💜</div>
                  <div style={{ position: 'absolute', top: 50, right: 60, zIndex: 20, fontSize: 12, animation: 'heartFloat 5s ease-in-out infinite 2.5s' }}>💛</div>
                  <div style={{ position: 'absolute', top: 80, left: 100, zIndex: 20, fontSize: 10, animation: 'heartFloat 4.5s ease-in-out infinite 3.5s' }}>🧡</div>
                </>
              )}

              {/* ── 1. PURPLE tall character ── */}
              <div style={{
                position: 'absolute', bottom: 0, left: 50,
                width: 145, height: 300,
                background: 'linear-gradient(180deg, #7C5CFC 0%, #5B3FD4 100%)',
                borderRadius: '30px 30px 6px 6px',
                animation: shy ? 'none' : 'float1 5s cubic-bezier(0.4, 0, 0.2, 1) infinite',
                boxShadow: '0 20px 60px rgba(91,63,212,0.3)',
              }}>
                {/* Eyes */}
                <div style={{ position: 'absolute', top: 50, left: 32, display: 'flex', gap: 24 }}>
                  {[0, 1].map(i => (
                    <div key={i} style={{ width: 30, height: 30, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#1a1a1a', ...pupil(11), opacity: shy ? 0 : 1, transition: 'opacity 0.3s' }} />
                      {shy && <div style={{ width: 18, height: 2, borderRadius: 2, background: '#1a1a1a', position: 'absolute' }} />}
                    </div>
                  ))}
                </div>
                {/* Hands covering eyes when shy */}
                <div style={{
                  position: 'absolute', top: 44, left: 22, display: 'flex', gap: 8,
                  opacity: shy ? 1 : 0,
                  transform: shy ? 'translateY(0)' : 'translateY(18px)',
                  transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  zIndex: 5,
                }}>
                  <div style={{ width: 44, height: 28, borderRadius: '16px', background: '#6A4AE8', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }} />
                  <div style={{ width: 44, height: 28, borderRadius: '16px', background: '#6A4AE8', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }} />
                </div>
                {/* Blush */}
                <div style={{ position: 'absolute', top: 95, left: 25, width: 20, height: 10, borderRadius: '50%', background: 'rgba(255,150,200,0.3)', animation: shy ? 'blushPulse 1.5s ease-in-out infinite' : 'blushPulse 3s ease-in-out infinite' }} />
                <div style={{ position: 'absolute', top: 95, right: 25, width: 20, height: 10, borderRadius: '50%', background: 'rgba(255,150,200,0.3)', animation: shy ? 'blushPulse 1.5s ease-in-out infinite' : 'blushPulse 3s ease-in-out infinite 0.5s' }} />
                {/* Mouth - talking when normal, embarrassed when shy */}
                <div style={{
                  position: 'absolute', top: 105, left: 56,
                  width: shy ? 18 : 12, height: shy ? 3 : 8,
                  borderRadius: shy ? '4px' : '50%',
                  background: shy ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.25)',
                  animation: shy ? 'none' : 'mouthTalk 3s ease-in-out infinite',
                  transition: 'all 0.3s ease',
                }} />
                {/* Waving hand (left side, only when NOT shy) */}
                {!shy && (
                  <div style={{
                    position: 'absolute', top: 150, left: -18,
                    width: 28, height: 18, borderRadius: '50%',
                    background: '#6A4AE8', boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                    animation: 'wave 6s ease-in-out infinite',
                    transformOrigin: 'right center',
                  }} />
                )}
              </div>

              {/* ── 2. DARK charcoal character ── */}
              <div style={{
                position: 'absolute', bottom: 0, left: 178,
                width: 95, height: 200,
                background: 'linear-gradient(180deg, #3D3D3D 0%, #1A1A1A 100%)',
                borderRadius: '22px 22px 6px 6px',
                animation: shy ? 'none' : 'dance 7s cubic-bezier(0.4, 0, 0.2, 1) infinite 0.5s',
                boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              }}>
                {/* Eyes */}
                <div style={{ position: 'absolute', top: 38, left: 16, display: 'flex', gap: 18 }}>
                  {[0, 1].map(i => (
                    <div key={i} style={{ width: 26, height: 26, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#1a1a1a', ...pupil(10), opacity: shy ? 0 : 1, transition: 'opacity 0.3s' }} />
                      {shy && <div style={{ width: 15, height: 2, borderRadius: 2, background: '#fff', position: 'absolute' }} />}
                    </div>
                  ))}
                </div>
                {/* Hands covering */}
                <div style={{
                  position: 'absolute', top: 32, left: 10, display: 'flex', gap: 6,
                  opacity: shy ? 1 : 0, transform: shy ? 'translateY(0)' : 'translateY(15px)',
                  transition: 'all 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s', zIndex: 5,
                }}>
                  <div style={{ width: 36, height: 22, borderRadius: '14px', background: '#2E2E2E', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }} />
                  <div style={{ width: 36, height: 22, borderRadius: '14px', background: '#2E2E2E', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }} />
                </div>
                {/* Mouth */}
                <div style={{
                  position: 'absolute', top: 78, left: 34,
                  width: shy ? 14 : 20, height: shy ? 3 : 10,
                  borderRadius: shy ? '4px' : '0 0 50% 50%',
                  background: shy ? 'rgba(255,255,255,0.2)' : 'transparent',
                  border: shy ? 'none' : '2px solid rgba(255,255,255,0.15)',
                  borderTop: shy ? undefined : 'none',
                  transition: 'all 0.3s ease',
                  animation: shy ? 'none' : 'nod 6s ease-in-out infinite 2s',
                }} />
              </div>

              {/* ── 3. ORANGE wide blob (foreground, overlapping) ── */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, zIndex: 10,
                width: 260, height: 145,
                background: 'linear-gradient(180deg, #FF8A52 0%, #F06030 100%)',
                borderRadius: '50% 50% 6px 6px',
                animation: shy ? 'none' : 'squish 4.5s cubic-bezier(0.4, 0, 0.2, 1) infinite 0.3s',
                boxShadow: '0 20px 60px rgba(240,96,48,0.3)',
              }}>
                {/* Eyes */}
                <div style={{ position: 'absolute', top: 40, left: 145, display: 'flex', gap: 20 }}>
                  {[0, 1].map(i => (
                    <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                      <div style={{ width: 13, height: 13, borderRadius: '50%', background: '#1a1a1a', ...pupil(9), opacity: shy ? 0 : 1, transition: 'opacity 0.3s' }} />
                      {shy && <div style={{ width: 16, height: 2, borderRadius: 2, background: '#1a1a1a', position: 'absolute' }} />}
                    </div>
                  ))}
                </div>
                {/* Hands */}
                <div style={{
                  position: 'absolute', top: 35, left: 138, display: 'flex', gap: 4,
                  opacity: shy ? 1 : 0, transform: shy ? 'translateY(0)' : 'translateY(12px)',
                  transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s', zIndex: 5,
                }}>
                  <div style={{ width: 38, height: 24, borderRadius: '14px', background: '#E85828', boxShadow: '0 2px 6px rgba(0,0,0,0.12)' }} />
                  <div style={{ width: 38, height: 24, borderRadius: '14px', background: '#E85828', boxShadow: '0 2px 6px rgba(0,0,0,0.12)' }} />
                </div>
                {/* Mouth */}
                <div style={{
                  position: 'absolute', top: 80, left: 170,
                  width: shy ? 12 : 8, height: shy ? 6 : 8,
                  borderRadius: '50%', background: 'rgba(0,0,0,0.2)',
                  animation: shy ? 'none' : 'mouthTalk 4s ease-in-out infinite 1s',
                  transition: 'all 0.3s ease',
                }} />
                {/* Blush */}
                <div style={{ position: 'absolute', top: 72, left: 133, width: 18, height: 8, borderRadius: '50%', background: 'rgba(200,50,50,0.15)', animation: 'blushPulse 3s ease-in-out infinite' }} />
                <div style={{ position: 'absolute', top: 72, left: 205, width: 18, height: 8, borderRadius: '50%', background: 'rgba(200,50,50,0.15)', animation: 'blushPulse 3s ease-in-out infinite 1s' }} />
              </div>

              {/* ── 4. YELLOW bird (RIGHT NEXT to the group!) ── */}
              <div style={{
                position: 'absolute', bottom: 0, left: 275, zIndex: 10,
                width: 120, height: 165,
                background: 'linear-gradient(180deg, #FFD84D 0%, #F5C000 100%)',
                borderRadius: '45px 45px 16px 6px',
                animation: shy ? 'none' : 'float2 5s cubic-bezier(0.4, 0, 0.2, 1) infinite 1s',
                boxShadow: '0 20px 60px rgba(245,192,0,0.3)',
              }}>
                {/* Eyes */}
                <div style={{ position: 'absolute', top: 42, left: 20, display: 'flex', gap: 20 }}>
                  {[0, 1].map(i => (
                    <div key={i} style={{ width: 26, height: 26, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#1a1a1a', ...pupil(10), opacity: shy ? 0 : 1, transition: 'opacity 0.3s' }} />
                      {shy && <div style={{ width: 15, height: 2, borderRadius: 2, background: '#1a1a1a', position: 'absolute' }} />}
                    </div>
                  ))}
                </div>
                {/* Wing-hands covering */}
                <div style={{
                  position: 'absolute', top: 37, left: 14, display: 'flex', gap: 4,
                  opacity: shy ? 1 : 0, transform: shy ? 'translateY(0)' : 'translateY(12px)',
                  transition: 'all 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s', zIndex: 5,
                }}>
                  <div style={{ width: 36, height: 22, borderRadius: '14px', background: '#E8B000', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }} />
                  <div style={{ width: 36, height: 22, borderRadius: '14px', background: '#E8B000', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }} />
                </div>
                {/* Beak */}
                <div style={{
                  position: 'absolute', top: 62, right: -20,
                  width: 38, height: 6, borderRadius: 4, background: '#1a1a1a',
                  animation: shy ? 'none' : 'wiggleBeak 3.5s ease-in-out infinite',
                  transform: shy ? 'rotate(-8deg)' : undefined,
                  transition: 'transform 0.3s ease', transformOrigin: 'left center',
                }} />
                {/* Blush */}
                <div style={{ position: 'absolute', top: 76, left: 14, width: 18, height: 8, borderRadius: '50%', background: 'rgba(200,120,0,0.2)', animation: 'blushPulse 2.5s ease-in-out infinite' }} />
                <div style={{ position: 'absolute', top: 76, right: 20, width: 18, height: 8, borderRadius: '50%', background: 'rgba(200,120,0,0.2)', animation: 'blushPulse 2.5s ease-in-out infinite 0.8s' }} />
                {/* Happy mouth */}
                <div style={{
                  position: 'absolute', top: 82, left: 42,
                  width: shy ? 14 : 18, height: shy ? 3 : 8,
                  borderRadius: shy ? '4px' : '0 0 50% 50%',
                  background: shy ? 'rgba(0,0,0,0.15)' : 'transparent',
                  border: shy ? 'none' : '2px solid rgba(0,0,0,0.15)',
                  borderTop: shy ? undefined : 'none',
                  transition: 'all 0.3s ease',
                }} />
              </div>

            </div>
          </div>
        </div>

        {/* ====== RIGHT — 1/3 LOGIN FORM ====== */}
        <div style={{
          width: isMobile ? '100%' : '33.333%', minHeight: isMobile ? '100dvh' : '100vh', background: '#FFFFFF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: isMobile ? '24px 20px 28px' : '28px 24px', borderLeft: isMobile ? 'none' : '1px solid #f0f0f0',
          overflowY: 'auto',
        }}>
          <div style={{ width: '100%', maxWidth: isMobile ? 420 : 320 }}>
            {isMobile && (
              <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                }}>
                  <span style={{ color: '#fff', fontWeight: 900, fontSize: 15, letterSpacing: 1, fontFamily: 'Arial, sans-serif' }}>ED</span>
                </div>
                <span style={{ fontWeight: 800, fontSize: 22, color: '#1a1a1a', letterSpacing: 3, fontFamily: 'Arial, sans-serif' }}>REALM</span>
              </div>
            )}

            <h2 style={{ fontSize: isMobile ? 32 : 21, fontWeight: 700, color: '#111', marginBottom: 6, lineHeight: 1.15 }}>Welcome Back</h2>
            <p style={{ fontSize: isMobile ? 17 : 13, color: '#666', marginBottom: isMobile ? 22 : 20, lineHeight: 1.45 }}>Sign in to continue your learning journey</p>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: isMobile ? 14 : 12 }}>
                <Label htmlFor="email" style={{ fontSize: isMobile ? 14 : 12, color: '#555', marginBottom: 3, display: 'block' }}>Email Address</Label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
                  <Input id="email" type="email" placeholder="admin01@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username"
                    style={{ paddingLeft: 34, height: isMobile ? 44 : 40, borderRadius: 8, border: '2px solid #e5e5e5', fontSize: isMobile ? 14 : 12, width: '100%' }} />
                </div>
              </div>

              <div style={{ marginBottom: isMobile ? 14 : 12 }}>
                <Label htmlFor="password" style={{ fontSize: isMobile ? 14 : 12, color: '#555', marginBottom: 3, display: 'block' }}>Password</Label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
                  <Input id="password" type="password" placeholder="••••••••" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    required
                    autoComplete="current-password"
                    style={{ paddingLeft: 34, height: isMobile ? 44 : 40, borderRadius: 8, border: '2px solid #e5e5e5', fontSize: isMobile ? 14 : 12, width: '100%' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, fontSize: isMobile ? 13 : 11, gap: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                  <input type="checkbox" style={{ borderRadius: 3 }} />
                  <span style={{ color: '#666' }}>Remember me</span>
                </label>
                <a href="#" style={{ color: '#EA580C', textDecoration: 'none', fontWeight: 500 }}>Forgot password?</a>
              </div>

              <Button type="submit" disabled={loading}
                style={{
                  width: '100%', height: isMobile ? 46 : 40, borderRadius: 10,
                  background: '#111', color: '#fff', fontSize: isMobile ? 18 : 13, fontWeight: 700,
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                }}>
                {loading ? 'Signing in...' : 'Sign in'}
                {!loading && <ArrowRight size={15} />}
              </Button>
            </form>

            <p style={{ textAlign: 'center', fontSize: isMobile ? 13 : 11, color: '#999', marginTop: 14 }}>
              Don't have an account?{' '}
              <a href="#" style={{ color: '#EA580C', textDecoration: 'none', fontWeight: 500 }}>Request access</a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}


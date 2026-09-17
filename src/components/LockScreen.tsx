import React, { useState, useEffect, useRef } from 'react';
import { lockService } from '../services/lockService';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Fingerprint, Delete, Lock } from 'lucide-react';

const tap = () => { Haptics.impact({ style: ImpactStyle.Light }).catch(() => {}); };
const success = () => { Haptics.notification({ type: NotificationType.Success }).catch(() => {}); };
const fail = () => { Haptics.notification({ type: NotificationType.Error }).catch(() => {}); };

const LockScreen: React.FC<{ onUnlock: () => void }> = ({ onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [status, setStatus] = useState('Đang kiểm tra vân tay...');
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const avail = await lockService.isBiometricAvailable();
    setBioAvailable(avail);
    if (avail) {
      attemptBiometric();
    } else {
      setStatus('Nhập mã PIN 6 số để mở');
    }
  };

  const attemptBiometric = async () => {
    setStatus('Chạm cảm biến vân tay...');
    const ok = await lockService.tryBiometric();
    if (ok) {
      success();
      onUnlock();
    } else {
      setStatus('Vân tay không nhận — nhập mã PIN 6 số');
    }
  };

  const pressKey = (key: string) => {
    setPressedKey(key);
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => setPressedKey(null), 120);
  };

  const handleDigit = async (d: string) => {
    if (pin.length >= 6) return;
    tap();
    pressKey(d);
    const next = pin + d;
    setPin(next);
    setError(false);
    if (next.length === 6) {
      const ok = await lockService.verifyPin(next);
      if (ok) {
        success();
        onUnlock();
      } else {
        fail();
        setError(true);
        setShake(true);
        setStatus('Sai mã PIN, thử lại');
        setTimeout(() => { setPin(''); setShake(false); }, 400);
      }
    }
  };

  const handleDelete = () => {
    if (!pin.length) return;
    tap();
    pressKey('del');
    setPin(p => p.slice(0, -1));
  };

  const keyStyle = (key: string): React.CSSProperties => ({
    padding: '18px 0', fontSize: '22px', fontWeight: 700, borderRadius: '50%',
    background: 'rgba(255,255,255,0.06)', color: 'var(--text-main)',
    transform: pressedKey === key ? 'scale(0.88)' : 'scale(1)',
    transition: 'transform 100ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-gradient), var(--bg-main)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <style>{`@keyframes lockShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-10px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(4px)} }
      @keyframes dotPop { 0%{transform:scale(1)} 40%{transform:scale(1.35)} 100%{transform:scale(1)} }`}</style>
      <div
        onClick={bioAvailable ? attemptBiometric : undefined}
        style={{ width: '84px', height: '84px', borderRadius: '50%', background: 'var(--glass-bg-strong)', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', cursor: bioAvailable ? 'pointer' : 'default' }}
      >
        {bioAvailable
          ? <Fingerprint size={40} color="var(--primary)" />
          : <Lock size={36} color="var(--primary)" />}
      </div>
      <h2 style={{ margin: '0 0 6px 0' }}>Sổ tay của tớ</h2>
      <p style={{ margin: '0 0 28px 0', color: error ? 'var(--danger)' : 'var(--text-muted)', fontSize: '14px', textAlign: 'center' }}>
        {status}
      </p>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', animation: shake ? 'lockShake 400ms ease' : 'none' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: '14px', height: '14px', borderRadius: '50%',
              background: i < pin.length ? (error ? 'var(--danger)' : 'var(--primary)') : 'rgba(255,255,255,0.15)',
              transition: 'background 150ms',
              animation: i === pin.length - 1 && !error ? 'dotPop 220ms cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
            }}
          />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px', width: '100%', maxWidth: '280px' }}>
        {['1','2','3','4','5','6','7','8','9'].map(d => (
          <button key={d} onClick={() => handleDigit(d)} style={keyStyle(d)}>{d}</button>
        ))}
        {bioAvailable ? (
          <button onClick={attemptBiometric} style={{ padding: '18px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}><Fingerprint size={22} /></button>
        ) : <span />}
        <button onClick={() => handleDigit('0')} style={keyStyle('0')}>0</button>
        <button onClick={handleDelete} style={{ ...keyStyle('del'), background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><Delete size={20} /></button>
      </div>
    </div>
  );
};

export default LockScreen;

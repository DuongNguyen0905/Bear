import React, { useState, useEffect } from 'react';
import { lockService } from '../services/lockService';
import { Fingerprint, Delete, Lock } from 'lucide-react';

const LockScreen: React.FC<{ onUnlock: () => void }> = ({ onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [status, setStatus] = useState('Đang kiểm tra vân tay...');

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
      onUnlock();
    } else {
      setStatus('Vân tay không nhận — nhập mã PIN 6 số');
    }
  };

  const handleDigit = async (d: string) => {
    if (pin.length >= 6) return;
    const next = pin + d;
    setPin(next);
    setError(false);
    if (next.length === 6) {
      const ok = await lockService.verifyPin(next);
      if (ok) {
        onUnlock();
      } else {
        setError(true);
        setStatus('Sai mã PIN, thử lại');
        setTimeout(() => setPin(''), 400);
      }
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-gradient), var(--bg-main)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
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

      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ width: '14px', height: '14px', borderRadius: '50%', background: i < pin.length ? (error ? 'var(--danger)' : 'var(--primary)') : 'rgba(255,255,255,0.15)', transition: 'background 150ms' }} />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px', width: '100%', maxWidth: '280px' }}>
        {['1','2','3','4','5','6','7','8','9'].map(d => (
          <button key={d} onClick={() => handleDigit(d)} style={{ padding: '18px 0', fontSize: '22px', fontWeight: 700, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', color: 'var(--text-main)' }}>{d}</button>
        ))}
        {bioAvailable ? (
          <button onClick={attemptBiometric} style={{ padding: '18px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}><Fingerprint size={22} /></button>
        ) : <span />}
        <button onClick={() => handleDigit('0')} style={{ padding: '18px 0', fontSize: '22px', fontWeight: 700, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', color: 'var(--text-main)' }}>0</button>
        <button onClick={() => setPin(p => p.slice(0, -1))} style={{ padding: '18px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><Delete size={20} /></button>
      </div>
    </div>
  );
};

export default LockScreen;

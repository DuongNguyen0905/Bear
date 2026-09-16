import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { financeService } from '../services/financeService';
import { lockService } from '../services/lockService';
import { notificationService } from '../services/notificationService';
import { ChevronLeft, Sun, Moon, Fingerprint, Bell, Type } from 'lucide-react';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [fontScale, setFontScale] = useState(100);
  const [lockEnabled, setLockEnabled] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [reminderTime, setReminderTime] = useState('21:00');
  const [streakWarnTime, setStreakWarnTime] = useState('20:00');

  useEffect(() => { load(); }, []);

  const load = async () => {
    const t = await financeService.getSetting<'dark' | 'light'>('theme', 'dark');
    setTheme(t);
    const fs = await financeService.getSetting<number>('fontScale', 100);
    setFontScale(fs);
    setLockEnabled(await lockService.isEnabled());
    const rt = await financeService.getSetting<string>('diaryReminderTime', '21:00');
    setReminderTime(rt);
    const sw = await financeService.getSetting<string>('streakWarnTime', '20:00');
    setStreakWarnTime(sw);
  };

  const applyTheme = async (t: 'dark' | 'light') => {
    setTheme(t);
    document.documentElement.setAttribute('data-theme', t);
    await financeService.setSetting('theme', t);
  };

  const applyFontScale = async (v: number) => {
    setFontScale(v);
    (document.documentElement.style as any).zoom = `${v}%`;
    await financeService.setSetting('fontScale', v);
  };

  const toggleLock = async () => {
    if (lockEnabled) {
      await lockService.setEnabled(false);
      setLockEnabled(false);
    } else {
      setShowPinSetup(true);
    }
  };

  const confirmPin = async () => {
    if (pinInput.length !== 6) return;
    await lockService.setPin(pinInput);
    await lockService.setEnabled(true);
    setLockEnabled(true);
    setShowPinSetup(false);
    setPinInput('');
  };

  const saveReminderTime = async (v: string) => {
    setReminderTime(v);
    await financeService.setSetting('diaryReminderTime', v);
    await notificationService.scheduleDiaryReminder(v);
  };

  const saveStreakWarnTime = async (v: string) => {
    setStreakWarnTime(v);
    await financeService.setSetting('streakWarnTime', v);
    await notificationService.scheduleStreakWarning(v);
  };

  return (
    <div className="page-container" style={{ paddingBottom: '100px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', marginTop: '10px' }}>
        <button onClick={() => navigate(-1)} style={{ color: 'var(--text-main)' }}><ChevronLeft size={24} /></button>
        <h2 style={{ margin: 0 }}>Cài đặt</h2>
      </div>

      <div className="card glass-panel" style={{ padding: '20px', borderRadius: '20px', marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}><Sun size={18} color="var(--primary)" /> Giao diện</h4>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => applyTheme('dark')} style={{ flex: 1, padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 700, background: theme === 'dark' ? 'var(--gemini-grad)' : 'rgba(255,255,255,0.06)', color: theme === 'dark' ? 'white' : 'var(--text-muted)' }}>
            <Moon size={16} /> Tối
          </button>
          <button onClick={() => applyTheme('light')} style={{ flex: 1, padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 700, background: theme === 'light' ? 'var(--gemini-grad)' : 'rgba(255,255,255,0.06)', color: theme === 'light' ? 'white' : 'var(--text-muted)' }}>
            <Sun size={16} /> Sáng
          </button>
        </div>
      </div>

      <div className="card glass-panel" style={{ padding: '20px', borderRadius: '20px', marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}><Type size={18} color="var(--primary)" /> Cỡ chữ — {fontScale}%</h4>
        <input type="range" min={80} max={200} step={5} value={fontScale} onChange={(e) => applyFontScale(Number(e.target.value))} style={{ width: '100%' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
          <span>80%</span><span>140%</span><span>200%</span>
        </div>
      </div>

      <div className="card glass-panel" style={{ padding: '20px', borderRadius: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}><Fingerprint size={18} color="var(--primary)" /> Khoá bằng vân tay / PIN</h4>
          <button onClick={toggleLock} style={{ width: '46px', height: '26px', borderRadius: '13px', background: lockEnabled ? 'var(--primary)' : 'rgba(255,255,255,0.15)', position: 'relative', transition: 'background 150ms' }}>
            <span style={{ position: 'absolute', top: '3px', left: lockEnabled ? '23px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: 'white', transition: 'left 150ms' }} />
          </button>
        </div>
        <p style={{ margin: '10px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>Máy có cảm biến vân tay sẽ thử mở bằng vân tay trước, không được thì nhập PIN 6 số.</p>
      </div>

      <div className="card glass-panel" style={{ padding: '20px', borderRadius: '20px', marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}><Bell size={18} color="var(--primary)" /> Nhắc viết nhật ký</h4>
        <input type="time" value={reminderTime} onChange={(e) => saveReminderTime(e.target.value)} style={{ width: 'auto' }} />
        <p style={{ margin: '10px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>Thông báo lặp lại mỗi ngày đúng giờ này.</p>
      </div>

      <div className="card glass-panel" style={{ padding: '20px', borderRadius: '20px' }}>
        <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}><Bell size={18} color="var(--danger)" /> Cảnh báo mất chuỗi</h4>
        <input type="time" value={streakWarnTime} onChange={(e) => saveStreakWarnTime(e.target.value)} style={{ width: 'auto' }} />
        <p style={{ margin: '10px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>Nếu đến giờ này mà hôm nay chưa ghi gì, app sẽ nhắc để bạn không mất chuỗi ngày liên tiếp.</p>
      </div>

      {showPinSetup && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card glass-panel" style={{ width: '100%', padding: '24px', background: '#14141e' }}>
            <h3 style={{ margin: '0 0 6px 0' }}>Đặt mã PIN</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: 'var(--text-muted)' }}>Nhập đúng 6 số, dùng để mở khi vân tay không hoạt động.</p>
            <input
              type="password" inputMode="numeric" maxLength={6} value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
              style={{ marginBottom: '20px', textAlign: 'center', fontSize: '22px', letterSpacing: '8px' }}
              placeholder="••••••"
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowPinSetup(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-main)' }}>Huỷ</button>
              <button onClick={confirmPin} disabled={pinInput.length !== 6} className="btn-primary" style={{ flex: 1 }}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;

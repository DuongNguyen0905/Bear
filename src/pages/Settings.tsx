import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { financeService } from '../services/financeService';
import { lockService } from '../services/lockService';
import { notificationService } from '../services/notificationService';
import { ChevronLeft, Sun, Moon, Fingerprint, Bell, Type, FolderSync } from 'lucide-react';
import { writeAutoBackup, readAutoBackup, importDexieBackupFromString, exportDexieBackup, importDexieBackup } from '../utils/backup';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [fontScale, setFontScale] = useState(100);
  const [lockEnabled, setLockEnabled] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [reminderTime, setReminderTime] = useState('21:00');
  const [streakWarnTime, setStreakWarnTime] = useState('20:00');
  const [autoBackupOn, setAutoBackupOn] = useState(false);
  const [backupStatus, setBackupStatus] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
    setAutoBackupOn(await financeService.getSetting<boolean>('autoBackupEnabled', false));
  };

  const toggleAutoBackup = async () => {
    const next = !autoBackupOn;
    setAutoBackupOn(next);
    await financeService.setSetting('autoBackupEnabled', next);
    if (next) {
      setBackupStatus('Đang sao lưu...');
      const ts = await writeAutoBackup();
      if (ts) {
        await financeService.setSetting('lastSeenBackupTimestamp', ts);
        setBackupStatus('Đã sao lưu lúc ' + new Date(ts).toLocaleTimeString('vi-VN'));
      } else {
        setBackupStatus('Không sao lưu được — chỉ hoạt động trên app đã cài, không phải bản xem thử trên web.');
      }
    }
  };

  const backupNow = async () => {
    setBackupStatus('Đang sao lưu...');
    const ts = await writeAutoBackup();
    if (ts) {
      await financeService.setSetting('lastSeenBackupTimestamp', ts);
      setBackupStatus('Đã sao lưu lúc ' + new Date(ts).toLocaleTimeString('vi-VN'));
    } else {
      setBackupStatus('Không sao lưu được — chỉ hoạt động trên app đã cài, không phải bản xem thử trên web.');
    }
  };

  const exportNow = async () => {
    setBackupStatus('Đang xuất file...');
    try {
      await exportDexieBackup();
      setBackupStatus('Đã xuất file — chọn nơi lưu/chia sẻ vừa hiện ra.');
    } catch {
      setBackupStatus('Xuất file thất bại.');
    }
  };

  const pickFileToImport = () => fileInputRef.current?.click();

  const onFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true);
    setBackupStatus('Đang nhập dữ liệu...');
    try {
      await importDexieBackup(file);
      alert('Đã nhập dữ liệu từ "' + file.name + '". App sẽ tải lại — vào Nhật ký, lướt lịch về đúng ngày trong file để xem (dữ liệu không tự nhảy vào ngày hôm nay).');
      window.location.reload();
    } catch (err: any) {
      setImporting(false);
      setBackupStatus('Nhập thất bại: ' + (err?.message || 'file không đúng định dạng.'));
    }
  };

  const checkAndRestore = async () => {
    setBackupStatus('Đang kiểm tra...');
    const remote = await readAutoBackup();
    if (!remote) {
      setBackupStatus('Chưa tìm thấy file sao lưu nào trong thư mục Documents/SoTayBackup.');
      return;
    }
    const lastSeen = await financeService.getSetting<number>('lastSeenBackupTimestamp', 0);
    if (remote.timestamp <= lastSeen) {
      setBackupStatus('Không có bản mới hơn.');
      return;
    }
    await importDexieBackupFromString(remote.json);
    await financeService.setSetting('lastSeenBackupTimestamp', remote.timestamp);
    setBackupStatus('Đã khôi phục bản lúc ' + new Date(remote.timestamp).toLocaleString('vi-VN') + '.');
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

      <div className="card glass-panel" style={{ padding: '20px', borderRadius: '20px', marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}><Bell size={18} color="var(--danger)" /> Cảnh báo mất chuỗi</h4>
        <input type="time" value={streakWarnTime} onChange={(e) => saveStreakWarnTime(e.target.value)} style={{ width: 'auto' }} />
        <p style={{ margin: '10px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>Nếu đến giờ này mà hôm nay chưa ghi gì, app sẽ nhắc để bạn không mất chuỗi ngày liên tiếp.</p>
      </div>

      <div className="card glass-panel" style={{ padding: '20px', borderRadius: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <h4 style={{ margin: 0, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}><FolderSync size={18} color="var(--primary)" /> Sao lưu & Khôi phục</h4>
          <button onClick={toggleAutoBackup} style={{ width: '46px', height: '26px', borderRadius: '13px', background: autoBackupOn ? 'var(--primary)' : 'rgba(255,255,255,0.15)', position: 'relative', transition: 'background 150ms', flexShrink: 0 }}>
            <span style={{ position: 'absolute', top: '3px', left: autoBackupOn ? '23px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: 'white', transition: 'left 150ms' }} />
          </button>
        </div>
        <p style={{ margin: '6px 0 14px 0', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Bật để tự ghi file vào <strong>Documents/SoTayBackup</strong> mỗi khi rời app. Đồng bộ 2 máy: cài app đồng bộ thư mục (VD "Autosync for Google Drive") trên <strong>cả 2 máy</strong>, trỏ vào đúng thư mục này, cùng 1 tài khoản Drive — mở app sẽ tự hỏi khôi phục khi có bản mới. Nếu đã có sẵn file .json (nhận qua Zalo/email), dùng nút <strong>Nhập file</strong> bên dưới.
        </p>
        <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={onFileChosen} style={{ display: 'none' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button onClick={backupNow} style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-main)', fontWeight: 600, fontSize: '13px' }}>Sao lưu ngay</button>
          <button onClick={checkAndRestore} style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-main)', fontWeight: 600, fontSize: '13px' }}>Kiểm tra bản mới</button>
          <button onClick={exportNow} style={{ padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-main)', fontWeight: 600, fontSize: '13px' }}>Xuất file</button>
          <button onClick={pickFileToImport} disabled={importing} className="btn-primary" style={{ fontSize: '13px' }}>{importing ? 'Đang nhập...' : 'Nhập file'}</button>
        </div>
        {backupStatus && <p style={{ margin: '10px 0 0 0', fontSize: '12px', color: 'var(--primary)' }}>{backupStatus}</p>}
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

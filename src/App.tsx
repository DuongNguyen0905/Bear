import React, { useEffect, useState, Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Keyboard } from '@capacitor/keyboard';
import { App as CapApp } from '@capacitor/app';
import BottomNav from './components/BottomNav';
import LockScreen from './components/LockScreen';
import Home from './pages/Home';
import { DateProvider } from './contexts/DateContext';
import { migrateDataToDexie } from './utils/migrate';
import { lockService } from './services/lockService';
import { notificationService } from './services/notificationService';
import { financeService } from './services/financeService';
import BackButtonHandler from './components/BackButtonHandler';
import { writeAutoBackup, readAutoBackup, importDexieBackupFromString } from './utils/backup';

const Diary = lazy(() => import('./pages/Diary'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Memory = lazy(() => import('./pages/Memory'));
const Goals = lazy(() => import('./pages/Goals'));
const Settings = lazy(() => import('./pages/Settings'));

const App: React.FC = () => {
  const [checkingLock, setCheckingLock] = useState(true);
  const [locked, setLocked] = useState(false);
  const [restorePrompt, setRestorePrompt] = useState<{ json: string; timestamp: number } | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    migrateDataToDexie();
    (async () => {
      const enabled = await lockService.isEnabled();
      setLocked(enabled);
      setCheckingLock(false);
      const t = await financeService.getSetting<'dark' | 'light'>('theme', 'dark');
      document.documentElement.setAttribute('data-theme', t);
      const fs = await financeService.getSetting<number>('fontScale', 100);
      (document.documentElement.style as any).zoom = `${fs}%`;
      const diaryTime = await financeService.getSetting<string>('diaryReminderTime', '21:00');
      const streakTime = await financeService.getSetting<string>('streakWarnTime', '20:00');
      notificationService.rescheduleFromSettings(diaryTime, streakTime);

      // Phát hiện bản sao lưu MỚI HƠN trong thư mục đồng bộ (đến từ máy kia
      // qua Drive) — chỉ hỏi khi tính năng tự sao lưu đang bật và mốc thời
      // gian mới hơn lần khôi phục/ghi gần nhất đã biết trên máy này.
      const autoBackupOn = await financeService.getSetting<boolean>('autoBackupEnabled', false);
      if (autoBackupOn) {
        const remote = await readAutoBackup();
        const lastSeen = await financeService.getSetting<number>('lastSeenBackupTimestamp', 0);
        if (remote && remote.timestamp > lastSeen) {
          setRestorePrompt(remote);
        }
      }
    })();
  }, []);

  // Khoá lại khi app bị đưa xuống nền rồi mở lại (bấm Home, chuyển app...).
  useEffect(() => {
    const handle = CapApp.addListener('appStateChange', async ({ isActive }) => {
      if (!isActive) {
        if (await lockService.isEnabled()) setLocked(true);
        // Ghi bản sao lưu ngay khi rời app — để app đồng bộ ngoài kịp thấy
        // file đổi và đẩy lên Drive trước khi máy có thể tắt hẳn.
        const autoBackupOn = await financeService.getSetting<boolean>('autoBackupEnabled', false);
        if (autoBackupOn) {
          const ts = await writeAutoBackup();
          if (ts) await financeService.setSetting('lastSeenBackupTimestamp', ts);
        }
      }
    });
    return () => { handle.then((h) => h.remove()); };
  }, []);

  const applyRestore = async () => {
    if (!restorePrompt) return;
    setRestoring(true);
    try {
      await importDexieBackupFromString(restorePrompt.json);
      await financeService.setSetting('lastSeenBackupTimestamp', restorePrompt.timestamp);
    } finally {
      setRestoring(false);
      setRestorePrompt(null);
      window.location.reload();
    }
  };

  useEffect(() => {
    const showHandle = Keyboard.addListener('keyboardWillShow', () => {
      document.body.classList.add('keyboard-open');
    });
    const hideHandle = Keyboard.addListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-open');
    });
    return () => {
      showHandle.then((h) => h.remove());
      hideHandle.then((h) => h.remove());
    };
  }, []);

  if (checkingLock) return null;
  if (locked) return <LockScreen onUnlock={() => setLocked(false)} />;

  return (
    <>
    {restorePrompt && (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div className="card glass-panel" style={{ width: '100%', maxWidth: '360px', padding: '24px' }}>
          <h3 style={{ margin: '0 0 8px 0' }}>Có bản sao lưu mới hơn</h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Phát hiện dữ liệu mới từ máy khác trong thư mục đồng bộ ({new Date(restorePrompt.timestamp).toLocaleString('vi-VN')}). Khôi phục sẽ gộp vào dữ liệu hiện có trên máy này, không mất gì cả.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setRestorePrompt(null)} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-main)' }}>Để sau</button>
            <button onClick={applyRestore} disabled={restoring} className="btn-primary" style={{ flex: 1 }}>{restoring ? 'Đang gộp...' : 'Khôi phục'}</button>
          </div>
        </div>
      </div>
    )}
    <DateProvider>
      <Router>
        <BackButtonHandler />
        <div className="app-container">
          <div className="content-area no-scrollbar">
            <Suspense fallback={null}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/diary" element={<Diary />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/memory" element={<Memory />} />
                <Route path="/goals" element={<Goals />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Suspense>
          </div>
          <BottomNav />
        </div>
      </Router>
    </DateProvider>
    </>
  );
};

export default App;

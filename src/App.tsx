import React, { useEffect, useState, Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Keyboard } from '@capacitor/keyboard';
import BottomNav from './components/BottomNav';
import LockScreen from './components/LockScreen';
import Home from './pages/Home';
import { DateProvider } from './contexts/DateContext';
import { migrateDataToDexie } from './utils/migrate';
import { lockService } from './services/lockService';
import BackButtonHandler from './components/BackButtonHandler';

const Diary = lazy(() => import('./pages/Diary'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Memory = lazy(() => import('./pages/Memory'));
const Goals = lazy(() => import('./pages/Goals'));

const App: React.FC = () => {
  const [checkingLock, setCheckingLock] = useState(true);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    migrateDataToDexie();
    (async () => {
      const enabled = await lockService.isEnabled();
      setLocked(enabled);
      setCheckingLock(false);
    })();
  }, []);

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
              </Routes>
            </Suspense>
          </div>
          <BottomNav />
        </div>
      </Router>
    </DateProvider>
  );
};

export default App;

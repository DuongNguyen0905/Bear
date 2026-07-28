import React, { useEffect, Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Keyboard } from '@capacitor/keyboard';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import { DateProvider } from './contexts/DateContext';
import { migrateDataToDexie } from './utils/migrate';
import BackButtonHandler from './components/BackButtonHandler';

// Home mở ngay khi vào app nên tải kèm luôn; 3 trang còn lại chỉ tải khi
// người dùng thực sự bấm vào, giúp bundle chính nhỏ hơn và mở app nhanh hơn.
const Diary = lazy(() => import('./pages/Diary'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Memory = lazy(() => import('./pages/Memory'));

const App: React.FC = () => {
  useEffect(() => {
    migrateDataToDexie();
  }, []);

  useEffect(() => {
    // Ẩn hẳn thanh menu dưới khi bàn phím ảo hiện lên, dựa vào sự kiện bàn
    // phím thật của Android (qua @capacitor/keyboard) — không đoán qua chiều
    // cao màn hình nữa, vì layout giờ cố ý không co lại khi gõ chữ.
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

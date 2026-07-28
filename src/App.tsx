import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Keyboard } from '@capacitor/keyboard';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import Diary from './pages/Diary';
import Expenses from './pages/Expenses';
import Memory from './pages/Memory';
import { DateProvider } from './contexts/DateContext';
import { migrateDataToDexie } from './utils/migrate';
import BackButtonHandler from './components/BackButtonHandler';

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
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/diary" element={<Diary />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/memory" element={<Memory />} />
            </Routes>
          </div>
          <BottomNav />
        </div>
      </Router>
    </DateProvider>
  );
};

export default App;

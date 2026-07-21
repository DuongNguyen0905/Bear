import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import Diary from './pages/Diary';
import Expenses from './pages/Expenses';
import Memory from './pages/Memory';
import { DateProvider } from './contexts/DateContext';
import { migrateDataToDexie } from './utils/migrate';

const App: React.FC = () => {
  useEffect(() => {
    migrateDataToDexie();
  }, []);

  return (
    <DateProvider>
      <Router>
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

import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, PiggyBank, PenLine, Receipt } from 'lucide-react';
import './BottomNav.css';

const BottomNav: React.FC = () => {
  return (
    <div className="bottom-nav">
      <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Home">
        <div className="icon-container"><Home size={24} strokeWidth={2.5} /></div>
      </NavLink>

      <NavLink to="/diary" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Nhật ký">
        <div className="icon-container"><PenLine size={24} strokeWidth={2.5} /></div>
      </NavLink>

      <NavLink to="/goals" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Hũ tiết kiệm">
        <div className="icon-container"><PiggyBank size={24} strokeWidth={2.5} /></div>
      </NavLink>

      <NavLink to="/expenses" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Tài chính">
        <div className="icon-container"><Receipt size={24} strokeWidth={2.5} /></div>
      </NavLink>
    </div>
  );
};

export default BottomNav;

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useDate } from '../contexts/DateContext';
import { isToday } from 'date-fns';
import CustomCalendar from './CustomCalendar';

const DateNavigator: React.FC = () => {
  const { selectedDate, dateLabel, nextDay, prevDay, setToday, setSelectedDate } = useDate();
  const today = isToday(selectedDate);
  const [showCalendar, setShowCalendar] = useState(false);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', marginBottom: '24px', marginTop: '10px' }}>
      <button 
        onClick={prevDay} 
        style={{ padding: '10px', backgroundColor: 'white', borderRadius: '50%', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s' }}
      >
        <ChevronLeft size={22} color="var(--primary-dark)" />
      </button>
      
      <div 
        style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', cursor: 'pointer', padding: '12px 24px', margin: '0 15px', borderRadius: '30px', background: today ? 'linear-gradient(135deg, #8ECAE6 0%, #BDE0FE 100%)' : 'white', boxShadow: today ? '0 6px 16px rgba(142, 202, 230, 0.3)' : '0 4px 12px rgba(0,0,0,0.05)', border: today ? 'none' : '1px solid #f0f0f0' }} 
        onClick={() => setShowCalendar(true)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '22px' }}>{today ? '✨' : '📅'}</span>
          <p style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: today ? 'white' : 'var(--text-main)', textTransform: 'capitalize' }}>
            {today ? 'Hôm nay' : dateLabel.split(',')[0]}
          </p>
        </div>
        {!today && <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, fontWeight: 600 }}>{dateLabel.split(',').slice(1).join(',')}</p>}
        {!today && (
          <div onClick={(e) => { e.stopPropagation(); setToday(); }} style={{ marginTop: '8px', fontSize: '12px', color: 'var(--primary)', fontWeight: 700, background: 'rgba(142, 202, 230, 0.15)', padding: '4px 14px', borderRadius: 'var(--radius-full)' }}>
            Quay về hôm nay ↩
          </div>
        )}
      </div>

      <button 
        onClick={nextDay} 
        disabled={today}
        style={{ padding: '10px', backgroundColor: today ? 'transparent' : 'white', borderRadius: '50%', border: 'none', boxShadow: today ? 'none' : '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s', opacity: today ? 0.3 : 1 }}
      >
        <ChevronRight size={22} color="var(--primary-dark)" />
      </button>

      {/* Custom Calendar Modal */}
      {showCalendar && (
        <CustomCalendar 
          selectedDate={selectedDate} 
          onDateSelect={(date: Date) => { setSelectedDate(date); setShowCalendar(false); }}
          onClose={() => setShowCalendar(false)}
        />
      )}
    </div>
  );
};

export default DateNavigator;

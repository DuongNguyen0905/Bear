import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays,
  isAfter, startOfDay
} from 'date-fns';
import { vi } from 'date-fns/locale';
import { useAndroidBack } from '../hooks/useAndroidBack';

interface CustomCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onClose: () => void;
  allowFuture?: boolean;
}

const CustomCalendar: React.FC<CustomCalendarProps> = ({ selectedDate, onDateSelect, onClose, allowFuture = false }) => {
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'year'>('calendar');
  const today = startOfDay(new Date());

  useAndroidBack(true, onClose);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const renderHeader = () => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '2px dashed #eaf4f4', backgroundColor: '#f4f9f9' }}>
      <button onClick={prevMonth} style={{ background: 'var(--surface)', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', color: 'var(--primary)' }}>
        <ChevronLeft size={20} />
      </button>
      <button 
        onClick={() => setViewMode(viewMode === 'calendar' ? 'year' : 'calendar')}
        style={{ background: 'none', border: 'none', margin: 0, fontSize: '18px', textTransform: 'capitalize', fontWeight: 'bold', color: 'var(--primary-dark)', cursor: 'pointer', padding: '8px 16px', borderRadius: '20px', backgroundColor: viewMode === 'year' ? '#eaf4f4' : 'transparent', transition: 'all 0.2s' }}
      >
        {format(currentMonth, 'MMMM yyyy', { locale: vi })} ▾
      </button>
      <button
        onClick={nextMonth}
        disabled={!allowFuture && (isSameMonth(currentMonth, today) || isAfter(currentMonth, today))}
        style={{ background: 'var(--surface)', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', color: 'var(--primary)' }}
      >
        <ChevronRight size={20} opacity={!allowFuture && (isSameMonth(currentMonth, today) || isAfter(currentMonth, today)) ? 0.3 : 1} />
      </button>
    </div>
  );

  const renderYearSelector = () => {
    const currentY = currentMonth.getFullYear();
    const years: number[] = [];
    for (let y = 1950; y <= 2100; y++) years.push(y);
    
    return (
      <div style={{ padding: '24px', display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', maxHeight: '300px', overflowY: 'auto' }}>
        {years.reverse().map(y => (
          <button 
            key={y}
            onClick={() => {
              const newDate = new Date(currentMonth);
              newDate.setFullYear(y);
              setCurrentMonth(newDate);
              setViewMode('calendar');
            }}
            style={{ padding: '12px 24px', borderRadius: '20px', border: 'none', backgroundColor: y === currentY ? 'var(--primary)' : '#eaf4f4', color: y === currentY ? 'white' : 'var(--primary-dark)', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', boxShadow: y === currentY ? '0 4px 15px rgba(142, 202, 230, 0.4)' : 'none', transition: 'all 0.2s' }}
          >
            Năm {y}
          </button>
        ))}
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    const startDate = startOfWeek(currentMonth, { weekStartsOn: 1 });
    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={i} style={{ width: '14.28%', textAlign: 'center', fontSize: '13px', fontWeight: 'bold', color: '#8ecae6', padding: '12px 0' }}>
          {format(addDays(startDate, i), 'EEEEEE', { locale: vi })}
        </div>
      );
    }
    return <div style={{ display: 'flex', width: '100%', padding: '0 10px', backgroundColor: '#f4f9f9' }}>{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const formattedDate = format(day, 'd');
        const cloneDay = day;
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isSelected = isSameDay(day, selectedDate);
        const isTodayDate = isSameDay(day, today);
        const isFuture = !allowFuture && isAfter(day, today);
        const dayKey = format(day, 'yyyy-MM-dd');

        days.push(
          <div 
            key={dayKey} 
            onClick={() => { if (!isFuture && isCurrentMonth) onDateSelect(cloneDay); }}
            style={{ width: '14.28%', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '6px 0', opacity: isCurrentMonth ? 1 : 0.3, cursor: (!isFuture && isCurrentMonth) ? 'pointer' : 'default' }}
          >
            <div style={{
              width: '38px', height: '38px', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '50%',
              backgroundColor: isSelected ? 'var(--primary)' : (isTodayDate ? '#eaf4f4' : 'transparent'),
              // Thẻ lịch này luôn nền trắng, nên chữ phải dùng màu tối cố định
              // thay vì var(--text-main) (màu sáng dành cho nền tối) kẻo mất chữ.
              color: isSelected ? 'white' : (isFuture ? '#b4b4c2' : (isTodayDate ? 'var(--primary-dark)' : '#33334d')),
              fontWeight: (isSelected || isTodayDate) ? 'bold' : 'normal',
              boxShadow: isSelected ? '0 4px 12px rgba(142, 202, 230, 0.4)' : 'none',
              transition: 'all 0.2s', border: isTodayDate && !isSelected ? '2px solid #eaf4f4' : 'none'
            }}>
              {formattedDate}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      const rowKey = format(day, 'yyyy-MM-dd-w');
      rows.push(<div key={rowKey} style={{ display: 'flex', width: '100%', padding: '0 10px' }}>{days}</div>);
      days = [];
    }
    return <div style={{ paddingBottom: '20px', paddingTop: '10px' }}>{rows}</div>;
  };

  return (
    <div
      onClick={onClose}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(5px)' }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#ffffff', borderRadius: '30px', width: '100%', maxWidth: '360px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.2)', animation: 'slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 20px 0', backgroundColor: '#f4f9f9' }}>
           <button onClick={onClose} style={{ background: '#eaf4f4', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <X color="var(--primary-dark)" size={20} />
           </button>
        </div>
        {renderHeader()}
        {viewMode === 'calendar' ? <>{renderDays()}{renderCells()}</> : renderYearSelector()}
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
};

export default CustomCalendar;

import React, { createContext, useState, useContext, ReactNode } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { vi } from 'date-fns/locale';

interface DateContextType {
  selectedDate: Date;
  dateKey: string;
  dateLabel: string;
  nextDay: () => void;
  prevDay: () => void;
  setToday: () => void;
  setSelectedDate: (date: Date) => void;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

export const DateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const nextDay = () => setSelectedDate(prev => addDays(prev, 1));
  const prevDay = () => setSelectedDate(prev => subDays(prev, 1));
  const setToday = () => setSelectedDate(new Date());

  // Returns YYYY-MM-DD for storage keys
  const dateKey = format(selectedDate, 'yyyy-MM-dd');
  
  // Returns readable string like "Thứ 5, 12 tháng 5"
  const dateLabel = format(selectedDate, 'EEEE, d MMMM, yyyy', { locale: vi });

  return (
    <DateContext.Provider value={{ selectedDate, dateKey, dateLabel, nextDay, prevDay, setToday, setSelectedDate }}>
      {children}
    </DateContext.Provider>
  );
};

export const useDate = () => {
  const context = useContext(DateContext);
  if (context === undefined) {
    throw new Error('useDate must be used within a DateProvider');
  }
  return context;
};

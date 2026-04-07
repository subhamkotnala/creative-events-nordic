import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface CalendarPickerProps {
  selectedDate: string;
  onSelect: (date: string) => void;
  onClose: () => void;
  minDate?: Date;
}

const CalendarPicker: React.FC<CalendarPickerProps> = ({ selectedDate, onSelect, onClose, minDate }) => {
  const { language } = useLanguage();
  const [viewDate, setViewDate] = useState(selectedDate ? new Date(selectedDate) : new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthName = useMemo(() => {
    return new Intl.DateTimeFormat(language === 'sv' ? 'sv-SE' : 'en-US', { month: 'long' }).format(viewDate);
  }, [viewDate, language]);

  const weekDays = useMemo(() => {
    const baseDate = new Date(2024, 0, 1); // Monday
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + i);
      return new Intl.DateTimeFormat(language === 'sv' ? 'sv-SE' : 'en-US', { weekday: 'short' }).format(date);
    });
  }, [language]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  
  const days = useMemo(() => {
    const result = [];
    // Leading empty slots
    for (let i = 0; i < firstDayOfMonth; i++) {
      result.push(null);
    }
    // Days of month
    for (let i = 1; i <= daysInMonth; i++) {
      result.push(new Date(year, month, i));
    }
    return result;
  }, [year, month, daysInMonth, firstDayOfMonth]);

  const isSelected = (date: Date) => {
    if (!selectedDate) return false;
    const s = new Date(selectedDate);
    return date.getDate() === s.getDate() && 
           date.getMonth() === s.getMonth() && 
           date.getFullYear() === s.getFullYear();
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  const isDisabled = (date: Date) => {
    if (!minDate) return false;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const min = new Date(minDate);
    min.setHours(0, 0, 0, 0);
    return d < min;
  };

  const changeMonth = (offset: number) => {
    setViewDate(new Date(year, month + offset, 1));
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 w-[320px] animate-in fade-in zoom-in-95 duration-200">
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-sm font-bold uppercase tracking-widest text-slate-900 flex gap-2 items-center">
          <span className="serif italic text-lg lowercase">{monthName}</span>
          <span className="text-slate-300 font-light">{year}</span>
        </h4>
        <div className="flex gap-1">
          <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors">
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors">
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(d => (
          <div key={d} className="text-[10px] font-bold text-slate-400 uppercase text-center py-2">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((date, i) => (
          <div key={i} className="aspect-square">
            {date ? (
              <button
                disabled={isDisabled(date)}
                onClick={() => {
                  if (isDisabled(date)) return;
                  const offsetDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
                  onSelect(offsetDate.toISOString().split('T')[0]);
                }}
                className={`w-full h-full flex items-center justify-center rounded-xl text-xs font-medium transition-all ${
                  isDisabled(date)
                    ? 'text-slate-200 cursor-not-allowed'
                    : isSelected(date) 
                      ? 'bg-sky-600 text-white shadow-lg shadow-sky-200 scale-105' 
                      : isToday(date)
                        ? 'bg-slate-100 text-sky-600 border border-sky-100'
                        : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {date.getDate()}
              </button>
            ) : (
              <div className="w-full h-full" />
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-6 pt-4 border-t border-slate-50 flex justify-end">
        <button 
          onClick={onClose}
          className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors"
        >
          {language === 'sv' ? 'Stäng' : 'Close'}
        </button>
      </div>
    </div>
  );
};

export default CalendarPicker;
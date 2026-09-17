import React, { useState, useEffect } from 'react';
import { useDate } from '../contexts/DateContext';
import { memoryService } from '../services/memoryService';
import { goalService } from '../services/goalService';
import { financeService } from '../services/financeService';
import DateNavigator from '../components/DateNavigator';
import ConfirmDialog from '../components/ConfirmDialog';
import CustomCalendar from '../components/CustomCalendar';
import { Plus, Trash2, ClipboardList, Flame, Wallet, PiggyBank, CalendarClock, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const Home: React.FC = () => {
  const { dateKey } = useDate();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<any[]>([]);
  const [newTask, setNewTask] = useState('');
  const [scheduleDate, setScheduleDate] = useState<Date | null>(null);
  const [showScheduleCalendar, setShowScheduleCalendar] = useState(false);
  const [confirmDeleteTask, setConfirmDeleteTask] = useState<string | null>(null);

  const [streak, setStreak] = useState(0);
  const [completedGoalsCount, setCompletedGoalsCount] = useState(0);
  const [safeDailyLimit, setSafeDailyLimit] = useState(0);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    loadData();
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Chào buổi sáng ☀️');
    else if (hour < 18) setGreeting('Chào buổi chiều 🌤️');
    else setGreeting('Chào buổi tối 🌙');
  }, [dateKey]);

  const loadData = async () => {
    const entry = await memoryService.getByDate(dateKey);
    setTasks(entry.tasks || []);

    const goals = await goalService.getAllGoals();
    setCompletedGoalsCount(goals.filter(g => g.completed).length);

    const year = dateKey.substring(0, 4);
    const month = dateKey.substring(5, 7);
    const bStatus = await financeService.getBudgetStatus(year, month);
    setSafeDailyLimit(bStatus.safeDailyLimit);

    const { db } = await import('../utils/db');
    const mems = await db.memories.toArray();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const hasActivity = (e: any) => e && ((e.diary && e.diary.trim() !== '') || (e.photos && e.photos.length > 0));
    const todayEntry = mems.find((m: any) => m.dateKey === todayStr);
    const yesterdayEntry = mems.find((m: any) => m.dateKey === yesterdayStr);

    let startDate: Date | null = null;
    if (hasActivity(todayEntry)) startDate = today;
    else if (hasActivity(yesterdayEntry)) startDate = yesterday;

    let currentStreak = 0;
    if (startDate) {
      const d = new Date(startDate);
      while (true) {
        const dStr = d.toISOString().split('T')[0];
        const e = mems.find((m: any) => m.dateKey === dStr);
        if (!hasActivity(e)) break;
        currentStreak++;
        d.setDate(d.getDate() - 1);
      }
    }
    setStreak(currentStreak);
  };

  const handleSaveTasks = async (updatedTasks: any[]) => {
    setTasks(updatedTasks);
    await memoryService.updatePartial(dateKey, { tasks: updatedTasks });
  };

  const handleAddTask = async () => {
    if (!newTask.trim()) return;
    const newTaskObj = { id: Date.now().toString(), text: newTask.trim(), status: 'empty' };
    const targetDateKey = scheduleDate ? format(scheduleDate, 'yyyy-MM-dd') : dateKey;

    if (targetDateKey === dateKey) {
      handleSaveTasks([...tasks, newTaskObj]);
    } else {
      const entry = await memoryService.getByDate(targetDateKey);
      await memoryService.updatePartial(targetDateKey, { tasks: [...entry.tasks, newTaskObj] });
      alert(`Đã đặt việc cho ngày ${format(scheduleDate as Date, 'dd/MM/yyyy')}. Đến ngày đó việc sẽ tự hiện ra ở đây.`);
    }
    setNewTask('');
    setScheduleDate(null);
  };

  const handleDeleteTask = (id: string) => {
    handleSaveTasks(tasks.filter(t => t.id !== id));
    setConfirmDeleteTask(null);
  };

  const cycleStatus = (id: string) => {
    const updated = tasks.map(t => {
      if (t.id === id) {
        let nextStatus = 'empty';
        if (t.status === 'empty') nextStatus = 'todo';
        else if (t.status === 'todo') nextStatus = 'half';
        else if (t.status === 'half') nextStatus = 'done';
        return { ...t, status: nextStatus };
      }
      return t;
    });
    handleSaveTasks(updated);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'done': return { symbol: '✓', bg: '#e8f5e9', color: '#2e7d32', border: 'none', textDecoration: 'line-through', textColor: 'var(--text-muted)' };
      case 'half': return { symbol: '~', bg: '#fff3cd', color: '#ffc107', border: 'none', textDecoration: 'none', textColor: 'var(--text-main)' };
      case 'todo': return { symbol: '✗', bg: '#ffe3e3', color: '#ff6b6b', border: 'none', textDecoration: 'none', textColor: 'var(--text-main)' };
      default: return { symbol: '', bg: 'rgba(255,255,255,0.1)', color: 'transparent', border: '1px solid var(--border-glass)', textDecoration: 'none', textColor: 'var(--text-main)' };
    }
  };

  const doneCount = tasks.filter(t => t.status === 'done').length;

  return (
    <div className="page-container" style={{ paddingBottom: '120px' }}>
      <div style={{ marginBottom: '24px', marginTop: '10px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', background: 'linear-gradient(to right, #fff, #a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {greeting}
        </h1>
        <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '15px' }}>Sẵn sàng cho một ngày mới?</p>
      </div>

      <DateNavigator />

      {/* Hạn mức chi tiêu hôm nay — thẻ chính, bấm để mở Ví */}
      <div className="card glass-panel" onClick={() => navigate('/expenses')} style={{ padding: '20px', marginBottom: '16px', background: 'linear-gradient(135deg, rgba(88, 166, 255, 0.1) 0%, rgba(31, 111, 235, 0.2) 100%)', cursor: 'pointer', border: '1px solid rgba(88, 166, 255, 0.2)' }}>
        <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}><Wallet size={16} /> Còn tiêu được hôm nay</p>
        <h1 style={{ margin: 0, fontSize: '32px' }}>{safeDailyLimit.toLocaleString('vi-VN')} đ</h1>
      </div>

      {/* Streak + Hũ hoàn thành — chip nhỏ, không còn danh sách mục tiêu ở Home */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div className="card glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
          <Flame size={26} color={streak > 0 ? '#ff9f43' : 'var(--text-muted)'} style={{ filter: streak > 0 ? 'drop-shadow(0 0 10px rgba(255, 159, 67, 0.6))' : 'none' }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '20px' }}>{streak}</h3>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>ngày liền</p>
          </div>
        </div>
        <div className="card glass-panel" onClick={() => navigate('/goals')} style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', margin: 0, cursor: 'pointer' }}>
          <PiggyBank size={26} color="var(--primary)" />
          <div>
            <h3 style={{ margin: 0, fontSize: '20px' }}>{completedGoalsCount}</h3>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>hũ đã đạt</p>
          </div>
        </div>
      </div>

      {/* Task Widget */}
      <div className="card glass-panel" style={{ padding: '20px', borderRadius: '24px' }}>
        <h4 style={{ margin: '0 0 16px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ClipboardList size={20} color="var(--primary)" /> Việc hôm nay {tasks.length > 0 && `(${doneCount}/${tasks.length})`}
        </h4>
        <div style={{ display: 'flex', gap: '10px', marginBottom: scheduleDate ? '8px' : '10px' }}>
          <div className="gemini-input-wrapper" style={{ flex: 1 }}>
            <input
              type="text" placeholder="Thêm việc..." value={newTask}
              onChange={(e) => setNewTask(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
              style={{ padding: '12px 16px' }}
            />
          </div>
          <button
            onClick={() => setShowScheduleCalendar(true)}
            title="Đặt việc cho một ngày khác"
            style={{ width: '45px', height: '45px', padding: 0, borderRadius: '12px', background: scheduleDate ? 'var(--gemini-grad)' : 'rgba(255,255,255,0.06)', border: scheduleDate ? 'none' : '1px solid var(--border-glass)', color: scheduleDate ? 'white' : 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <CalendarClock size={20} />
          </button>
          <button onClick={handleAddTask} className="btn-primary" style={{ width: '45px', height: '45px', padding: 0, borderRadius: '12px' }}>
            <Plus size={22} />
          </button>
        </div>
        {scheduleDate && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '12px', color: 'var(--primary)' }}>
            <CalendarClock size={14} />
            <span>Việc mới sẽ đặt cho ngày {format(scheduleDate, 'dd/MM/yyyy')}</span>
            <button onClick={() => setScheduleDate(null)} style={{ color: 'var(--text-muted)', display: 'flex' }}><X size={14} /></button>
          </div>
        )}
        <div>
          {tasks.length === 0 ? (
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center' }}>Quảnh gánh lo đi và vui sống 🍃</p>
          ) : (
            tasks.map((task) => {
              const style = getStatusStyle(task.status);
              return (
                <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '16px', marginBottom: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)' }}>
                  <button onClick={() => cycleStatus(task.id)} style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: style.bg, border: style.border, fontWeight: 'bold', color: style.color }}>
                    {style.symbol}
                  </button>
                  <span style={{ flex: 1, textDecoration: style.textDecoration, color: style.textColor, fontSize: '15px' }}>{task.text}</span>
                  <button onClick={() => setConfirmDeleteTask(task.id)} style={{ color: '#ff7b72', opacity: 0.7 }}><Trash2 size={16} /></button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {confirmDeleteTask && (
        <ConfirmDialog
          title="Xoá việc này?"
          message="Việc cần làm này sẽ bị xoá khỏi danh sách của ngày đang xem."
          onConfirm={() => handleDeleteTask(confirmDeleteTask)}
          onCancel={() => setConfirmDeleteTask(null)}
        />
      )}

      {showScheduleCalendar && (
        <CustomCalendar
          selectedDate={scheduleDate || new Date()}
          allowFuture
          onDateSelect={(date) => { setScheduleDate(date); setShowScheduleCalendar(false); }}
          onClose={() => setShowScheduleCalendar(false)}
        />
      )}
    </div>
  );
};

export default Home;

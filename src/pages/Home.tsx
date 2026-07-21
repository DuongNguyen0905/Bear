import React, { useState, useEffect } from 'react';
import { useDate } from '../contexts/DateContext';
import { memoryService } from '../services/memoryService';
import { goalService } from '../services/goalService';
import { financeService } from '../services/financeService';
import DateNavigator from '../components/DateNavigator';
import { Plus, Trash2, ClipboardList, Target, Award, ChevronLeft, X, TrendingUp, TrendingDown, Image as ImageIcon, BookOpen, Flame, Wallet, Trophy } from 'lucide-react';
import { db } from '../utils/db';
import type { Goal, Task } from '../utils/db';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const Home: React.FC = () => {
  const { dateKey } = useDate();
  const navigate = useNavigate();
  
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTask, setNewTask] = useState('');
  const [taskDate, setTaskDate] = useState(dateKey);

  const [goals, setGoals] = useState<Goal[]>([]);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [showFundModal, setShowFundModal] = useState<string | null>(null);
  const [fundAmount, setFundAmount] = useState('');
  const [showAchievements, setShowAchievements] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);

  const [showReview, setShowReview] = useState(false);
  const [reviewData, setReviewData] = useState<any>(null);
  const [reviewMonth, setReviewMonth] = useState<string>('');
  
  const [streak, setStreak] = useState(0);
  const [safeDailyLimit, setSafeDailyLimit] = useState(0);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    loadData();
    setTaskDate(dateKey);
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Chào buổi sáng ☀️');
    else if (hour < 18) setGreeting('Chào buổi chiều 🌤️');
    else setGreeting('Chào buổi tối 🌙');
  }, [dateKey]);

  const loadData = async () => {
    const entry = await memoryService.getByDate(dateKey);
    setTasks(entry.tasks || []);

    const allGoals = await goalService.getAllGoals();
    setGoals(allGoals);

    const year = dateKey.substring(0, 4);
    const month = dateKey.substring(5, 7);
    const bStatus = await financeService.getBudgetStatus(year, month);
    setSafeDailyLimit(bStatus.safeDailyLimit);
    
    // Streak logic
    const mems = await db.memories.toArray();
    mems.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
    let currentStreak = 0;
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const hasActivity = (e: any) => e && ((e.diary && e.diary.trim() !== '') || (e.photos && e.photos.length > 0));
    let checkDate = new Date();
    const todayEntry = mems.find(m => m.dateKey === todayStr);
    
    if (!hasActivity(todayEntry)) {
      const yesterdayEntry = mems.find(m => m.dateKey === yesterdayStr);
      if (!hasActivity(yesterdayEntry)) setStreak(0);
      else checkDate = yesterday;
    }
    
    if (streak === 0 && checkDate === today && !hasActivity(todayEntry)) {
      // no activity
    } else {
        let counting = true;
        let d = new Date(checkDate);
        while (counting) {
          const dStr = d.toISOString().split('T')[0];
          const e = mems.find(m => m.dateKey === dStr);
          if (hasActivity(e)) {
            currentStreak++;
            d.setDate(d.getDate() - 1);
          } else {
            counting = false;
          }
        }
        setStreak(currentStreak);
    }
  };

  const handleSaveTasks = async (updatedTasks: any[]) => {
    setTasks(updatedTasks);
    await memoryService.updatePartial(dateKey, { tasks: updatedTasks });
  };

  const handleAddTask = async () => {
    if (!newTask.trim()) return;
    const newTaskObj: Task = { id: Date.now().toString(), text: newTask.trim(), status: 'empty' };

    if (taskDate === dateKey) {
      handleSaveTasks([...tasks, newTaskObj]);
    } else {
      // Thêm việc cho một ngày khác ngày đang xem: lưu thẳng vào ngày đó, không đổi danh sách đang hiển thị.
      const targetEntry = await memoryService.getByDate(taskDate);
      await memoryService.updatePartial(taskDate, { tasks: [...(targetEntry.tasks || []), newTaskObj] });
    }
    setNewTask('');
  };

  const handleDeleteTask = (id: string) => {
    handleSaveTasks(tasks.filter(t => t.id !== id));
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

  const handleCreateGoal = async () => {
    if (!newGoalTitle || !newGoalTarget) return;
    await goalService.addGoal(newGoalTitle, parseInt(newGoalTarget));
    setNewGoalTitle('');
    setNewGoalTarget('');
    setShowGoalModal(false);
    loadData();
  };

  const handleFundGoal = async () => {
    if (!showFundModal || !fundAmount) return;
    await goalService.updateGoalProgress(showFundModal, parseInt(fundAmount));
    setFundAmount('');
    setShowFundModal(null);
    loadData();
  };

  const handleOpenReview = async () => {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const defaultMonth = `${year}-${month}`;
    setReviewMonth(defaultMonth);
    await generateMonthlyReview(defaultMonth);
    setShowReview(true);
  };

  const generateMonthlyReview = async (monthStrInput: string) => {
    const year = monthStrInput.substring(0, 4);
    const month = monthStrInput.substring(5, 7);

    const stats = await financeService.getDashboardStats(year, month);
    const trans = await financeService.getTransactionsByMonth(year, month);
    
    const catTotals: Record<string, number> = {};
    trans.filter(t => t.type === 'expense').forEach(t => {
      catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
    });
    const topCat = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a])[0];

    const allMemories = await memoryService.getAllLegacy();
    const lastMonthMemories = Object.values(allMemories).filter(m => m.dateKey.startsWith(`${year}-${month}`));
    const totalPhotos = lastMonthMemories.reduce((acc, m) => acc + (m.photos?.length || 0), 0);
    const totalDiaries = lastMonthMemories.filter(m => m.diary && m.diary.trim() !== '').length;

    setReviewData({
      monthStr: `${month}/${year}`,
      stats, topCat, topCatAmount: catTotals[topCat] || 0, totalPhotos, totalDiaries
    });
  };

  const activeGoals = goals.filter(g => !g.completed);
  const completedGoals = goals.filter(g => g.completed);

  return (
    <div className="page-container" style={{ paddingBottom: '120px' }}>
      {/* Premium Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', marginTop: '10px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', background: 'linear-gradient(to right, #fff, #a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {greeting}
          </h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '15px' }}>Sẵn sàng cho một ngày mới?</p>
        </div>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowHeaderMenu(v => !v)}
            style={{ position: 'relative', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '1px solid var(--border-glass)', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffd700', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}
            title="Thành tích & Tổng kết"
          >
            <Trophy size={20} />
            {completedGoals.length > 0 && (
              <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: 'var(--danger)', color: 'white', fontSize: '10px', fontWeight: 'bold', borderRadius: '10px', minWidth: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                {completedGoals.length}
              </span>
            )}
          </button>

          {showHeaderMenu && (
            <>
              <div onClick={() => setShowHeaderMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 999 }} />
              <div className="glass-panel" style={{ position: 'absolute', top: '52px', right: 0, zIndex: 1000, padding: '8px', minWidth: '210px', borderRadius: '20px', animation: 'fadeIn 150ms ease-out' }}>
                <button
                  onClick={() => { setShowHeaderMenu(false); setShowAchievements(true); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '14px', color: 'var(--text-main)', fontSize: '14px', fontWeight: 600, textAlign: 'left' }}
                >
                  <Trophy size={18} color="#ffd700" /> Thành tích mục tiêu
                </button>
                <button
                  onClick={() => { setShowHeaderMenu(false); handleOpenReview(); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '14px', color: 'var(--text-main)', fontSize: '14px', fontWeight: 600, textAlign: 'left' }}
                >
                  <Award size={18} color="var(--primary)" /> Tổng kết tháng
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <DateNavigator />

      {/* Grid Dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        
        {/* Streak Widget */}
        <div className="card glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', margin: 0 }}>
          <Flame size={32} color={streak > 0 ? '#ff9f43' : 'var(--text-muted)'} style={{ marginBottom: '8px', filter: streak > 0 ? 'drop-shadow(0 0 10px rgba(255, 159, 67, 0.6))' : 'none' }} />
          <h3 style={{ margin: 0, fontSize: '24px', color: streak > 0 ? '#fff' : 'var(--text-muted)' }}>{streak}</h3>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Ngày liên tiếp</p>
        </div>

        {/* Budget Widget */}
        <div className="card glass-panel" onClick={() => navigate('/expenses')} style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', margin: 0, background: 'linear-gradient(135deg, rgba(88, 166, 255, 0.1) 0%, rgba(31, 111, 235, 0.2) 100%)', cursor: 'pointer', border: '1px solid rgba(88, 166, 255, 0.2)' }}>
          <Wallet size={28} color="var(--primary)" style={{ marginBottom: '8px' }} />
          <h3 style={{ margin: 0, fontSize: '20px', color: '#fff' }}>{safeDailyLimit > 0 ? `${(safeDailyLimit / 1000).toFixed(0)}k` : '0đ'}</h3>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Hạn mức hằng ngày</p>
        </div>

      </div>

      {/* Goals Widget - Horizontal Scroll */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={20} color="var(--primary)" /> Mục tiêu
          </h3>
          <button onClick={() => setShowGoalModal(true)} style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '14px' }}>+ Thêm</button>
        </div>
        
        {activeGoals.length === 0 ? (
          <div className="card glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
              {completedGoals.length > 0 ? 'Tất cả mục tiêu đã hoàn thành! Xem lại ở góc Thành tích nhé 🏆' : 'Bạn chưa có mục tiêu nào. Thêm một cái để có động lực phấn đấu nhé!'}
            </p>
          </div>
        ) : (
          <div className="no-scrollbar" style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '10px' }}>
            {activeGoals.map(goal => {
              const percent = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
              const isCompleted = percent >= 100;
              return (
                <div key={goal.id} className="card glass-panel" style={{ minWidth: '220px', margin: 0, padding: '16px', border: isCompleted ? '1px solid var(--success)' : '1px solid var(--border-glass)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '15px' }}>{goal.title}</span>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: isCompleted ? 'var(--success)' : 'var(--primary)' }}>{percent.toFixed(0)}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden', marginBottom: '12px' }}>
                    <div style={{ width: `${percent}%`, height: '100%', backgroundColor: isCompleted ? 'var(--success)' : 'var(--primary)', transition: 'width 0.5s', boxShadow: '0 0 10px var(--primary)' }}></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{(goal.currentAmount/1000).toFixed(0)}k / {(goal.targetAmount/1000).toFixed(0)}k</span>
                    <button onClick={() => setShowFundModal(goal.id)} disabled={isCompleted} style={{ background: isCompleted ? 'rgba(255,255,255,0.1)' : 'var(--primary)', borderRadius: '8px', padding: '6px 12px', color: 'white', fontSize: '12px', fontWeight: 'bold' }}>Nạp</button>
                  </div>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>Tạo lúc {format(new Date(goal.createdAt), 'HH:mm dd/MM/yyyy')}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Task Widget */}
      <div className="card glass-panel" style={{ padding: '20px', borderRadius: '24px' }}>
        <h4 style={{ margin: '0 0 16px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ClipboardList size={20} color="var(--primary)" /> Việc cần làm
        </h4>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <div className="gemini-input-wrapper" style={{ flex: 1 }}>
            <input
              type="text" placeholder="Thêm việc..." value={newTask}
              onChange={(e) => setNewTask(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
              style={{ padding: '12px 16px' }}
            />
          </div>
          <button onClick={handleAddTask} className="btn-primary" style={{ width: '45px', height: '45px', padding: 0, borderRadius: '12px' }}>
            <Plus size={22} />
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Ghi việc cho ngày:</span>
          <input
            type="date" value={taskDate}
            onChange={(e) => setTaskDate(e.target.value)}
            style={{ padding: '8px 14px', fontSize: '13px' }}
          />
          {taskDate !== dateKey && (
            <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 'bold' }}>Khác ngày đang xem</span>
          )}
        </div>

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
                  <button onClick={() => handleDeleteTask(task.id)} style={{ color: '#ff7b72', opacity: 0.7 }}><Trash2 size={16} /></button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modals */}
      {showGoalModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card glass-panel" style={{ width: '100%', padding: '24px', background: '#14141e' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Mục tiêu mới</h3>
              <button onClick={() => setShowGoalModal(false)}><X size={20} color="white" /></button>
            </div>
            <input type="text" placeholder="Ví dụ: Mua iPhone 16" value={newGoalTitle} onChange={e => setNewGoalTitle(e.target.value)} style={{ marginBottom: '15px' }} />
            <input type="number" placeholder="Số tiền (VNĐ)" value={newGoalTarget} onChange={e => setNewGoalTarget(e.target.value)} style={{ marginBottom: '24px' }} />
            <button onClick={handleCreateGoal} className="btn-primary">Bắt đầu tích lũy</button>
          </div>
        </div>
      )}

      {showFundModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card glass-panel" style={{ width: '100%', padding: '24px', background: '#14141e' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Bỏ ống heo</h3>
              <button onClick={() => setShowFundModal(null)}><X size={20} color="white" /></button>
            </div>
            <input type="number" placeholder="Số tiền nạp (VNĐ)" value={fundAmount} onChange={e => setFundAmount(e.target.value)} style={{ marginBottom: '24px' }} />
            <button onClick={handleFundGoal} className="btn-primary">Nạp tiền</button>
          </div>
        </div>
      )}

      {showAchievements && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--bg-main)', zIndex: 5000, display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.3s ease-out', overflowY: 'auto' }}>
          <div style={{ padding: '20px', backgroundColor: 'rgba(15, 15, 20, 0.8)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
            <button onClick={() => setShowAchievements(false)} style={{ marginRight: '15px', color: 'white', background: 'none', border: 'none' }}><ChevronLeft size={24} /></button>
            <h3 style={{ margin: 0, flex: 1, textAlign: 'center', color: 'white' }}>Thành tích mục tiêu</h3>
            <div style={{ width: '24px' }}></div>
          </div>

          <div style={{ padding: '20px', paddingBottom: '100px' }}>
            <div className="card" style={{ background: 'var(--gemini-grad)', backgroundSize: '300% 300%', animation: 'geminiGradient 8s ease infinite', color: 'white', padding: '40px 20px', borderRadius: '30px', textAlign: 'center', marginBottom: '24px', border: 'none' }}>
              <Trophy size={56} style={{ marginBottom: '16px', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.3))' }} />
              <h2 style={{ margin: '0 0 10px 0', fontSize: '28px', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>Rất xuất sắc!</h2>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '16px' }}>
                Bạn đã hoàn thành <strong>{completedGoals.length}</strong> mục tiêu
              </p>
            </div>

            {completedGoals.length === 0 ? (
              <div className="card glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Chưa có mục tiêu nào hoàn thành. Cố lên nhé!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {completedGoals.map(goal => (
                  <div key={goal.id} className="card glass-panel" style={{ padding: '18px', borderRadius: '18px', border: '1px solid var(--success)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{goal.title}</span>
                      <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>✓ Hoàn thành</span>
                    </div>
                    <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                      Đạt {(goal.targetAmount / 1000).toFixed(0)}k
                    </p>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
                      Tạo lúc {format(new Date(goal.createdAt), 'HH:mm dd/MM/yyyy')}
                      {goal.completedAt && ` • Hoàn thành lúc ${format(new Date(goal.completedAt), 'HH:mm dd/MM/yyyy')}`}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => setShowAchievements(false)} className="btn-primary" style={{ width: '100%', padding: '18px', marginTop: '24px' }}>Trở về Home</button>
          </div>
        </div>
      )}

      {showReview && reviewData && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--bg-main)', zIndex: 5000, display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.3s ease-out', overflowY: 'auto' }}>
          <div style={{ padding: '20px', backgroundColor: 'rgba(15, 15, 20, 0.8)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
            <button onClick={() => setShowReview(false)} style={{ marginRight: '15px', color: 'white', background: 'none', border: 'none' }}><ChevronLeft size={24} /></button>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <input 
                type="month" 
                value={reviewMonth}
                onChange={(e) => {
                   setReviewMonth(e.target.value);
                   generateMonthlyReview(e.target.value);
                }}
                style={{ color: 'white', fontSize: '16px', fontWeight: 'bold', textAlign: 'center' }}
              />
            </div>
            <div style={{ width: '24px' }}></div>
          </div>
          
          <div style={{ padding: '20px', paddingBottom: '100px' }}>
            <div className="card" style={{ background: 'var(--gemini-grad)', backgroundSize: '300% 300%', animation: 'geminiGradient 8s ease infinite', color: 'white', padding: '40px 20px', borderRadius: '30px', textAlign: 'center', marginBottom: '24px', border: 'none' }}>
              <Award size={56} style={{ marginBottom: '16px', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.3))' }} />
              <h2 style={{ margin: '0 0 10px 0', fontSize: '28px', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>Rất xuất sắc!</h2>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '16px' }}>Tỷ lệ tiết kiệm đạt <strong>{reviewData.stats.savingsRate}%</strong></p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div className="card glass-panel" style={{ padding: '20px', textAlign: 'center', margin: 0 }}>
                <TrendingUp color="var(--success)" size={28} style={{ marginBottom: '12px' }} />
                <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-muted)' }}>Tổng Thu Nhập</p>
                <h4 style={{ margin: 0, fontSize: '18px' }}>{(reviewData.stats.totalIncome/1000).toFixed(0)}k</h4>
              </div>
              <div className="card glass-panel" style={{ padding: '20px', textAlign: 'center', margin: 0 }}>
                <TrendingDown color="var(--danger)" size={28} style={{ marginBottom: '12px' }} />
                <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-muted)' }}>Tổng Chi Tiêu</p>
                <h4 style={{ margin: 0, fontSize: '18px' }}>{(reviewData.stats.totalExpense/1000).toFixed(0)}k</h4>
              </div>
            </div>

            <div className="card glass-panel" style={{ padding: '24px', borderRadius: '24px', marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 16px 0', color: 'var(--text-muted)', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Hố đen tài chính</h4>
              {reviewData.topCat ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{reviewData.topCat}</span>
                  <span style={{ color: 'var(--danger)', fontWeight: 'bold', fontSize: '18px' }}>{(reviewData.topCatAmount/1000).toFixed(0)}k</span>
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Không có chi tiêu nào.</p>
              )}
            </div>

            <div className="card glass-panel" style={{ padding: '24px', borderRadius: '24px', marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 20px 0', color: 'var(--text-muted)', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Kỷ niệm đã lưu</h4>
              <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                <div style={{ textAlign: 'center' }}>
                  <ImageIcon size={32} color="var(--primary)" style={{ marginBottom: '12px' }} />
                  <h3 style={{ margin: 0, fontSize: '24px' }}>{reviewData.totalPhotos}</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>Bức ảnh</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <BookOpen size={32} color="var(--secondary)" style={{ marginBottom: '12px' }} />
                  <h3 style={{ margin: 0, fontSize: '24px' }}>{reviewData.totalDiaries}</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>Trang nhật ký</p>
                </div>
              </div>
            </div>
            
            <button onClick={() => setShowReview(false)} className="btn-primary" style={{ padding: '18px' }}>Trở về Home</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;

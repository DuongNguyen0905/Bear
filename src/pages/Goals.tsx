import React, { useState, useEffect } from 'react';
import { useDate } from '../contexts/DateContext';
import { goalService } from '../services/goalService';
import { financeService } from '../services/financeService';
import { Plus, Trash2, Target } from 'lucide-react';
import { format } from 'date-fns';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAndroidBack } from '../hooks/useAndroidBack';
import { useClosingTransition } from '../hooks/useClosingTransition';
import { formatThousands, stripThousands } from '../utils/formatNumber';
import type { Goal } from '../utils/db';

const Goals: React.FC = () => {
  const { dateKey } = useDate();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [showFundModal, setShowFundModal] = useState<string | null>(null);
  const [fundAmount, setFundAmount] = useState('');
  const [fundError, setFundError] = useState('');
  const [confirmDeleteGoal, setConfirmDeleteGoal] = useState<string | null>(null);
  const [budgetStatus, setBudgetStatus] = useState({ currentGlobalBalance: 0, accumulatedSavings: 0 });

  const goalModalT = useClosingTransition(showGoalModal);
  const fundModalT = useClosingTransition(!!showFundModal);
  useAndroidBack(showGoalModal, () => setShowGoalModal(false));
  useAndroidBack(!!showFundModal, () => setShowFundModal(null));

  useEffect(() => { loadData(); }, [dateKey]);

  const loadData = async () => {
    setGoals(await goalService.getAllGoals());
    const year = dateKey.substring(0, 4);
    const month = dateKey.substring(5, 7);
    setBudgetStatus(await financeService.getBudgetStatus(year, month));
  };

  const handleCreateGoal = async () => {
    const target = parseInt(newGoalTarget);
    if (!newGoalTitle.trim() || !target || target <= 0) return;
    await goalService.addGoal(newGoalTitle.trim(), target);
    setNewGoalTitle(''); setNewGoalTarget(''); setShowGoalModal(false);
    loadData();
  };

  // Nạp tiền chỉ cộng vào ĐÚNG hũ đang thao tác (theo id) — các hũ khác
  // không bị đụng tới, không có hũ nào bị xoá khi nạp tiền.
  const handleFundGoal = async () => {
    const amount = parseInt(fundAmount);
    if (!showFundModal || !amount || amount <= 0) return;
    const totalAvailable = budgetStatus.currentGlobalBalance + budgetStatus.accumulatedSavings;
    if (amount > totalAvailable) {
      setFundError(`Không đủ tiền — tổng số dư hiện có chỉ còn ${totalAvailable.toLocaleString('vi-VN')} đ.`);
      return;
    }
    setFundError('');
    await goalService.fundGoal(showFundModal, amount, dateKey);
    setFundAmount(''); setShowFundModal(null);
    loadData();
  };

  const handleDeleteGoal = async (id: string) => {
    await goalService.deleteGoal(id);
    setConfirmDeleteGoal(null);
    loadData();
  };

  const activeGoals = goals.filter(g => !g.completed);
  const completedGoals = goals.filter(g => g.completed);

  return (
    <div className="page-container" style={{ paddingBottom: '100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', marginTop: '10px' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><Target size={22} color="var(--primary)" /> Hũ Tiết Kiệm</h2>
        <button onClick={() => setShowGoalModal(true)} className="btn-primary" style={{ width: 'auto', padding: '10px 16px', borderRadius: '10px', fontSize: '14px' }}>
          <Plus size={18} /> Thêm hũ
        </button>
      </div>

      <div className="card glass-panel" style={{ padding: '20px', marginBottom: '24px', textAlign: 'center' }}>
        <p style={{ margin: '0 0 8px 0', color: 'var(--text-muted)', fontSize: '14px' }}>Số dư khả dụng để nạp hũ</p>
        <h1 style={{ margin: 0, fontSize: '28px', color: 'var(--success)' }}>
          {(budgetStatus.currentGlobalBalance + budgetStatus.accumulatedSavings).toLocaleString('vi-VN')} đ
        </h1>
      </div>

      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Đang tích lũy ({activeGoals.length})</h3>
      {activeGoals.length === 0 ? (
        <div className="card glass-panel" style={{ padding: '20px', textAlign: 'center', marginBottom: '24px' }}>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Bạn chưa có hũ nào. Thêm một cái để có động lực tiết kiệm!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
          {activeGoals.map(goal => {
            const percent = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
            return (
              <div key={goal.id} className="card glass-panel" style={{ padding: '16px', borderRadius: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '8px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '15px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goal.title}</span>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--primary)' }}>{percent.toFixed(0)}%</span>
                  <button onClick={() => setConfirmDeleteGoal(goal.id)} style={{ color: '#ff7b72', opacity: 0.7, flexShrink: 0 }}><Trash2 size={15} /></button>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden', marginBottom: '12px' }}>
                  <div style={{ width: percent + '%', height: '100%', backgroundColor: 'var(--primary)', transition: 'width 0.5s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{(goal.currentAmount/1000).toFixed(0)}k / {(goal.targetAmount/1000).toFixed(0)}k</span>
                  <button onClick={() => { setFundError(''); setFundAmount(''); setShowFundModal(goal.id); }} style={{ background: 'var(--primary-dark)', borderRadius: '8px', padding: '6px 12px', color: 'white', fontSize: '12px', fontWeight: 'bold' }}>Nạp tiền</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Đã hoàn thành ({completedGoals.length})</h3>
      {completedGoals.length === 0 ? (
        <div className="card glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Chưa có hũ nào hoàn thành.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {completedGoals.map(goal => (
            <div key={goal.id} className="card glass-panel" style={{ padding: '18px', borderRadius: '18px', border: '1px solid var(--success)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{goal.title}</span>
                <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>✓ Hoàn thành</span>
              </div>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
                Tạo lúc {format(new Date(goal.createdAt), 'HH:mm dd/MM/yyyy')}
                {goal.completedAt && ` • Hoàn thành lúc ${format(new Date(goal.completedAt), 'HH:mm dd/MM/yyyy')}`}
              </p>
            </div>
          ))}
        </div>
      )}

      {goalModalT.shouldRender && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', opacity: goalModalT.active ? 1 : 0, transition: 'opacity 200ms ease' }}>
          <div className="card glass-panel" style={{ width: '100%', padding: '24px', background: '#14141e', opacity: goalModalT.active ? 1 : 0, transform: goalModalT.active ? 'scale(1)' : 'scale(0.94)', transition: 'opacity 200ms ease, transform 200ms cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Hũ mới</h3>
              <button onClick={() => setShowGoalModal(false)}>X</button>
            </div>
            <input type="text" placeholder="Ví dụ: Mua iPhone 16" value={newGoalTitle} onChange={e => setNewGoalTitle(e.target.value)} style={{ marginBottom: '15px' }} />
            <input type="text" inputMode="numeric" placeholder="Số tiền (VNĐ)" value={formatThousands(newGoalTarget)} onChange={e => setNewGoalTarget(stripThousands(e.target.value))} style={{ marginBottom: '24px' }} />
            <button onClick={handleCreateGoal} className="btn-primary">Bắt đầu tích lũy</button>
          </div>
        </div>
      )}

      {fundModalT.shouldRender && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', opacity: fundModalT.active ? 1 : 0, transition: 'opacity 200ms ease' }}>
          <div className="card glass-panel" style={{ width: '100%', padding: '24px', background: '#14141e', opacity: fundModalT.active ? 1 : 0, transform: fundModalT.active ? 'scale(1)' : 'scale(0.94)', transition: 'opacity 200ms ease, transform 200ms cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Nạp tiền vào hũ</h3>
              <button onClick={() => setShowFundModal(null)}>X</button>
            </div>
            <input type="text" inputMode="numeric" placeholder="Số tiền nạp (VNĐ)" value={formatThousands(fundAmount)} onChange={e => { setFundAmount(stripThousands(e.target.value)); setFundError(''); }} style={{ marginBottom: fundError ? '10px' : '24px' }} />
            {fundError && <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--danger)', fontWeight: 600 }}>{fundError}</p>}
            <button onClick={handleFundGoal} className="btn-primary">Nạp tiền</button>
          </div>
        </div>
      )}

      {confirmDeleteGoal && (
        <ConfirmDialog
          title="Xoá hũ này?"
          message="Toàn bộ tiến trình đã nạp cho hũ này sẽ mất, không thể khôi phục. Các hũ khác không bị ảnh hưởng."
          onConfirm={() => handleDeleteGoal(confirmDeleteGoal)}
          onCancel={() => setConfirmDeleteGoal(null)}
        />
      )}
    </div>
  );
};

export default Goals;

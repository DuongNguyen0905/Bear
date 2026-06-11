import React, { useState, useEffect, useRef } from 'react';
import { financeService } from '../services/financeService';
import { useDate } from '../contexts/DateContext';
import { Settings, Plus, ChevronLeft, TrendingDown, TrendingUp, PieChart as PieChartIcon, AlertTriangle, CheckCircle, Activity, PiggyBank, Camera, Download, Upload, Edit2, Save } from 'lucide-react';
import { format } from 'date-fns';
import { PieChart, Pie, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import Tesseract from 'tesseract.js';
import { exportDexieBackup, importDexieBackup } from '../utils/backup';

const Expenses: React.FC = () => {
  const { dateKey, selectedDate } = useDate();
  
  const [stats, setStats] = useState<any>({ totalIncome: 0, totalExpense: 0, balance: 0, savingsRate: 0, todayExpense: 0, avgDailyExpense: 0 });
  const [budgetStatus, setBudgetStatus] = useState<any>({ daysToSalary: 0, currentGlobalBalance: 0, safeDailyLimit: 0, todayExpense: 0, message: '', status: 'normal', salaryDay: 5 });
  const [transactions, setTransactions] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('');
  
  const [expenseCategories, setExpenseCategories] = useState<string[]>(['Ăn uống', 'Giải trí', 'Di chuyển', 'Mua sắm', 'Đau ốm', 'Tiền trọ']);
  const incomeCategories = ['Lương', 'Thưởng', 'Được cho', 'Khác'];

  const [showSettings, setShowSettings] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [salaryDay, setSalaryDay] = useState<string | number>(5);
  const [initialBalance, setInitialBalance] = useState<string | number>(0);
  const [newCat, setNewCat] = useState('');
  
  const [showSavingsModal, setShowSavingsModal] = useState(false);
  const [editingMonth, setEditingMonth] = useState<string | null>(null);
  const [editInitialBalance, setEditInitialBalance] = useState<string>('');

  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const restoreFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, [dateKey]);

  useEffect(() => {
    setCategory(activeTab === 'expense' ? expenseCategories[0] : incomeCategories[0]);
  }, [activeTab, expenseCategories]);

  // ... (loadData etc)
  const loadData = async () => {
    const year = dateKey.substring(0, 4);
    const month = dateKey.substring(5, 7);
    
    const dashboardStats = await financeService.getDashboardStats(year, month);
    setStats(dashboardStats);
    
    const bStatus = await financeService.getBudgetStatus(year, month);
    setBudgetStatus(bStatus);
    
    const cats = await financeService.getSetting('expenseCategories', ['Ăn uống', 'Giải trí', 'Di chuyển', 'Mua sắm', 'Đau ốm', 'Tiền trọ']);
    setExpenseCategories(cats);
    
    const sDay = await financeService.getSetting('salaryDay', 5);
    setSalaryDay(sDay);
    const monthKey = `${year}-${month}`;
    const iBalance = await financeService.getSetting(`initialBalance_${monthKey}`, 0);
    setInitialBalance(iBalance);

    const monthlyTrans = await financeService.getTransactionsByMonth(year, month);
    setTransactions(monthlyTrans);
  };

  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const { data: { text } } = await Tesseract.recognize(file, 'vie+eng', {
        logger: m => console.log(m)
      });
      
      // Basic heuristic: look for large numbers separated by dots or commas
      const numbers = text.match(/\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?/g) || [];
      const parsedNumbers = numbers.map(n => parseInt(n.replace(/[.,]/g, ''))).filter(n => n > 1000); // Only keep realistic amounts (> 1000 VNĐ)
      
      if (parsedNumbers.length > 0) {
        const maxAmount = Math.max(...parsedNumbers); // Assume the largest number is the Total
        setAmount(maxAmount.toString());
        setDesc('Quét từ hóa đơn');
        alert(`Đã nhận diện số tiền: ${maxAmount.toLocaleString('vi-VN')} đ`);
      } else {
        alert('Không nhận diện được số tiền nào từ hóa đơn.');
      }
    } catch (err) {
      console.error('OCR Error:', err);
      alert('Lỗi khi quét hóa đơn.');
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!amount || !desc) return;
    await financeService.addTransaction({
      type: activeTab,
      amount: parseInt(amount),
      category,
      note: desc,
      dateKey
    });
    setAmount('');
    setDesc('');
    loadData();
  };

  const saveSettings = async () => {
    const year = dateKey.substring(0, 4);
    const month = dateKey.substring(5, 7);
    const monthKey = `${year}-${month}`;
    
    await financeService.setSetting('salaryDay', Number(salaryDay) || 1);
    await financeService.setSetting(`initialBalance_${monthKey}`, Number(initialBalance) || 0);
    await financeService.setSetting('expenseCategories', expenseCategories);
    setShowSettings(false);
    loadData();
  };

  const addCategory = async () => {
    if (newCat.trim() && !expenseCategories.includes(newCat.trim())) {
      const newCats = [...expenseCategories, newCat.trim()];
      setExpenseCategories(newCats);
      setCategory(newCat.trim());
      setNewCat('');
      await financeService.setSetting('expenseCategories', newCats);
    }
  };

  const handleBackup = async () => {
    const success = await exportDexieBackup();
    if (success) {
      alert('Đã tải xuống file sao lưu!');
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (window.confirm('Cảnh báo: Nhập dữ liệu mới sẽ thay thế/gộp vào dữ liệu hiện tại. Bạn có chắc chắn muốn tiếp tục?')) {
      const success = await importDexieBackup(file);
      if (success) {
        alert('Khôi phục dữ liệu thành công!');
        loadData();
      }
    }
    if (restoreFileRef.current) restoreFileRef.current.value = '';
  };

  const savePastInitialBalance = async (monthKey: string) => {
    await financeService.setSetting(`initialBalance_${monthKey}`, Number(editInitialBalance) || 0);
    setEditingMonth(null);
    loadData();
  };

  // Prepare chart data
  const categoryTotals: Record<string, number> = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  });
  
  const chartData = Object.keys(categoryTotals).map(cat => ({
    name: cat,
    amount: categoryTotals[cat]
  })).sort((a, b) => b.amount - a.amount);

  const colors = ['#ff7b72', '#ff9f43', '#feca57', '#54a0ff', '#5f27cd', '#ff9ff3'];

  return (
    <div className="page-container" style={{ paddingBottom: '100px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Tài chính cá nhân</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px', fontWeight: 'bold' }}>
            Tháng {format(selectedDate, 'MM/yyyy')}
          </p>
        </div>
        <button 
          onClick={() => setShowSettings(true)}
          style={{ 
            background: 'white', border: 'none', borderRadius: '50%', 
            width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)' 
          }}
        >
          <Settings size={22} color="var(--primary-dark)" />
        </button>
      </div>

      {/* Daily Budget Engine Alert */}
      <div 
        className="card" 
        onClick={() => setShowBudgetModal(true)}
        style={{ 
        padding: '20px', borderRadius: '24px', marginBottom: '24px', cursor: 'pointer',
        background: budgetStatus.status === 'danger' ? 'rgba(255, 99, 132, 0.1)' : 
                   budgetStatus.status === 'success' ? 'rgba(46, 204, 113, 0.1)' : 'rgba(255, 255, 255, 0.05)',
        border: `1px solid ${budgetStatus.status === 'danger' ? 'rgba(255, 99, 132, 0.3)' : budgetStatus.status === 'success' ? 'rgba(46, 204, 113, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          {budgetStatus.status === 'danger' ? <AlertTriangle color="#ff6384" /> : <CheckCircle color="#2ecc71" />}
          <h3 style={{ margin: 0, fontSize: '16px', color: budgetStatus.status === 'danger' ? '#ff6384' : '#2ecc71' }}>
            {budgetStatus.daysToSalary > 0 ? `Còn ${budgetStatus.daysToSalary} ngày tới lương` : 'Hôm nay là ngày nhận lương!'}
          </h3>
        </div>
        <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: 'var(--text-main)' }}>
          Hạn mức an toàn mỗi ngày: <strong>{budgetStatus.safeDailyLimit.toLocaleString('vi-VN')} đ</strong>
        </p>
        <p style={{ margin: 0, fontSize: '13px', fontStyle: 'italic', color: 'var(--text-muted)' }}>{budgetStatus.message} (Nhấn để cấu hình)</p>
      </div>

      {/* Savings Widget */}
      <div 
        className="card glass-panel" 
        style={{ padding: '20px', borderRadius: '24px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        onClick={() => setShowSavingsModal(true)}
      >
        <div>
          <h4 style={{ margin: '0 0 5px 0', fontSize: '15px', color: 'var(--text-muted)' }}>Quỹ Tiết Kiệm Tích Lũy</h4>
          <h2 style={{ margin: 0, color: budgetStatus.accumulatedSavings >= 0 ? 'var(--success)' : 'var(--danger)', fontSize: '24px' }}>
            {budgetStatus.accumulatedSavings > 0 ? '+' : ''}{budgetStatus.accumulatedSavings?.toLocaleString('vi-VN')} đ
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>Nhấn để xem chi tiết</p>
        </div>
        <PiggyBank size={32} color={budgetStatus.accumulatedSavings >= 0 ? 'var(--success)' : 'var(--danger)'} opacity={0.8} />
      </div>

      {/* Monthly Overview Card */}
      <div className="card" style={{ 
        background: 'linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 100%)', 
        color: 'white', padding: '24px', borderRadius: '24px', marginBottom: '24px', boxShadow: '0 10px 30px rgba(142, 202, 230, 0.4)'
      }}>
        <p style={{ fontSize: '14px', margin: '0 0 8px 0', opacity: 0.9 }}>Số dư khả dụng tháng {format(selectedDate, 'MM')}</p>
        <h1 style={{ margin: '0 0 24px 0', fontSize: '32px' }}>{budgetStatus.currentGlobalBalance?.toLocaleString('vi-VN')} đ</h1>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.1)', padding: '16px', borderRadius: '16px', backdropFilter: 'blur(10px)', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>
              <TrendingDown size={14} /> Chi tháng này
            </div>
            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{stats.totalExpense.toLocaleString('vi-VN')} đ</div>
          </div>
          <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.2)' }}></div>
          <div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>
              <TrendingUp size={14} /> Thu tháng này
            </div>
            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{stats.totalIncome.toLocaleString('vi-VN')} đ</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', opacity: 0.9 }}><Activity size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }}/> Chi trung bình: {Math.floor(stats.avgDailyExpense).toLocaleString('vi-VN')}đ/ngày</span>
          <span style={{ fontSize: '13px', opacity: 0.9 }}><PiggyBank size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }}/> Tỷ lệ tiết kiệm: {stats.savingsRate}%</span>
        </div>
      </div>

      {/* Input Form */}
      <div className="card glass-panel" style={{ marginBottom: '24px', borderRadius: '20px', padding: '20px' }}>
        <div style={{ display: 'flex', marginBottom: '20px', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#f5f5f5' }}>
          <button 
            style={{ flex: 1, padding: '12px', backgroundColor: activeTab === 'expense' ? 'white' : 'transparent', color: activeTab === 'expense' ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 'bold', border: 'none', borderRadius: '10px', margin: '4px', boxShadow: activeTab === 'expense' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}
            onClick={() => setActiveTab('expense')}
          >
            Khoản Chi
          </button>
          <button 
            style={{ flex: 1, padding: '12px', backgroundColor: activeTab === 'income' ? 'white' : 'transparent', color: activeTab === 'income' ? 'var(--success)' : 'var(--text-muted)', fontWeight: 'bold', border: 'none', borderRadius: '10px', margin: '4px', boxShadow: activeTab === 'income' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}
            onClick={() => setActiveTab('income')}
          >
            Khoản Thu
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          <div className="gemini-input-wrapper" style={{ flex: 2, display: 'flex', alignItems: 'center' }}>
            <input 
              type="number" 
              placeholder="Số tiền" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ flex: 1, padding: '16px', borderRadius: '14px', border: 'none', fontSize: '16px', fontWeight: 'bold' }} 
            />
            {activeTab === 'expense' && (
              <>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  ref={fileInputRef} 
                  onChange={handleScanReceipt} 
                  style={{ display: 'none' }} 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isScanning}
                  style={{ background: 'var(--primary-light)', border: 'none', borderRadius: '10px', width: '40px', height: '40px', marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-dark)', cursor: 'pointer' }}
                  title="Quét hóa đơn"
                >
                  {isScanning ? <span style={{ fontSize: '10px', fontWeight: 'bold' }}>...</span> : <Camera size={18} />}
                </button>
              </>
            )}
          </div>
          <div className="gemini-input-wrapper" style={{ flex: 1 }}>
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)} 
              style={{ width: '100%', padding: '16px 10px', borderRadius: '14px', border: 'none', fontSize: '14px', height: '100%' }}
            >
              {(activeTab === 'expense' ? expenseCategories : incomeCategories).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {activeTab === 'expense' && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <div className="gemini-input-wrapper" style={{ flex: 1 }}>
              <input 
                type="text" placeholder="Thêm danh mục chi tiêu mới..." value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '14px', border: 'none', fontSize: '14px', backgroundColor: 'transparent' }}
              />
            </div>
            <button onClick={addCategory} className="btn-primary" style={{ borderRadius: '14px', width: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
              <Plus color="white" />
            </button>
          </div>
        )}

        <div className="gemini-input-wrapper" style={{ marginBottom: '20px' }}>
          <input 
            type="text" 
            placeholder={activeTab === 'expense' ? "Ghi chú (VD: Ăn phở, Đổ xăng...)" : "Ghi chú nguồn thu..."} 
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            style={{ width: '100%', padding: '16px', borderRadius: '14px', border: 'none', fontSize: '15px' }} 
          />
        </div>
        
        <button 
          onClick={handleSave}
          disabled={!amount || !desc}
          style={{ 
            width: '100%', padding: '16px', borderRadius: '14px', border: 'none', fontWeight: 'bold', fontSize: '16px', color: 'white',
            backgroundColor: activeTab === 'expense' ? 'var(--danger)' : 'var(--success)',
            opacity: (!amount || !desc) ? 0.5 : 1,
            boxShadow: activeTab === 'expense' ? '0 4px 15px rgba(255, 71, 87, 0.3)' : '0 4px 15px rgba(46, 213, 115, 0.3)'
          }}
        >
          {activeTab === 'expense' ? 'Ghi nhận chi tiêu' : 'Ghi nhận thu nhập'}
        </button>
      </div>

      {/* Chart */}
      <div className="card glass-panel" style={{ padding: '20px', borderRadius: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <PieChartIcon size={20} color="var(--primary)" />
          <h3 style={{ margin: 0, fontSize: '16px' }}>Biểu đồ chi tiêu tháng {format(selectedDate, 'MM')}</h3>
        </div>
        
        {chartData.length > 0 ? (
          <div style={{ width: '100%', height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={chartData} 
                  dataKey="amount" 
                  nameKey="name" 
                  cx="50%" cy="50%" 
                  outerRadius={80} 
                  labelLine={false}
                  label={({ name, percent }) => percent > 0.05 ? `${name}` : ''}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`${value.toLocaleString('vi-VN')} đ`, 'Chi tiêu']}
                  contentStyle={{ backgroundColor: 'rgba(15, 15, 20, 0.9)', borderRadius: '8px', border: 'none', color: 'white' }}
                  itemStyle={{ color: 'white' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Chưa có dữ liệu chi tiêu trong tháng này.</p>
        )}
      </div>

      {/* Settings Modal (Immersive Full Screen) */}
      {showSettings && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'var(--bg-main)', zIndex: 3000,
          display: 'flex', flexDirection: 'column',
          animation: 'slideInRight 0.3s ease-out',
        }}>
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', padding: '20px', backgroundColor: 'rgba(15, 15, 20, 0.8)', backdropFilter: 'blur(10px)', zIndex: 10, borderBottom: '1px solid var(--border-glass)' }}>
            <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', padding: '5px', marginRight: '15px' }}>
              <ChevronLeft size={24} color="var(--text-main)" />
            </button>
            <h3 style={{ margin: 0, flex: 1, textAlign: 'center', color: 'var(--text-main)' }}>Cài đặt Ngân sách</h3>
            <div style={{ width: '34px' }}></div>
          </div>
          
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
            <div className="card glass-panel" style={{ padding: '20px', borderRadius: '16px', marginBottom: '30px' }}>
              <h4 style={{ margin: '0 0 15px 0', color: 'var(--text-main)' }}>Dữ liệu ứng dụng</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '15px' }}>Vì ứng dụng chạy offline, bạn nên thường xuyên sao lưu dữ liệu về máy để tránh mất mát khi đổi điện thoại/trình duyệt.</p>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleBackup} className="btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', color: 'var(--primary)', border: '1px solid var(--border-glass)' }}>
                  <Download size={18} /> Tải Sao Lưu
                </button>
                <input 
                  type="file" accept=".json" 
                  ref={restoreFileRef} 
                  onChange={handleRestore} 
                  style={{ display: 'none' }} 
                />
                <button onClick={() => restoreFileRef.current?.click()} className="btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '10px' }}>
                  <Upload size={18} /> Khôi Phục
                </button>
              </div>
            </div>

            <button onClick={saveSettings} className="btn-primary" style={{ width: '100%', padding: '16px', borderRadius: '14px', fontSize: '16px' }}>
              Lưu thay đổi
            </button>
          </div>
        </div>
      )}

      {/* Budget Modal */}
      {showBudgetModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', zIndex: 3000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          animation: 'fadeIn 0.2s ease-out',
        }}>
          <div className="card glass-panel" style={{ width: '100%', padding: '24px', background: '#14141e' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: 'white' }}>Cấu hình Hạn mức</h3>
              <button onClick={() => setShowBudgetModal(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer' }}>X</button>
            </div>
            
            <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-main)' }}>Số dư ban đầu tháng {format(selectedDate, 'MM/yyyy')}</h4>
            <div className="gemini-input-wrapper" style={{ marginBottom: '20px' }}>
              <input 
                type="number" value={initialBalance} placeholder="Ví dụ: 5000000"
                onChange={(e) => setInitialBalance(e.target.value)}
                style={{ width: '100%', padding: '14px', borderRadius: '10px', border: 'none', backgroundColor: 'transparent', color: 'white' }}
              />
            </div>

            <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-main)' }}>Ngày nhận lương</h4>
            <div className="gemini-input-wrapper" style={{ marginBottom: '24px' }}>
              <input 
                type="number" min="1" max="31" value={salaryDay}
                onChange={(e) => setSalaryDay(e.target.value)}
                style={{ width: '100%', padding: '14px', borderRadius: '10px', border: 'none', backgroundColor: 'transparent', color: 'white' }}
              />
            </div>

            <button onClick={() => { saveSettings(); setShowBudgetModal(false); }} className="btn-primary" style={{ width: '100%', padding: '16px', borderRadius: '14px' }}>
              Lưu & Tính toán lại
            </button>
          </div>
        </div>
      )}

      {/* Savings Details Modal */}
      {showSavingsModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'var(--bg-main)', zIndex: 3000,
          display: 'flex', flexDirection: 'column',
          animation: 'slideInRight 0.3s ease-out',
        }}>
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', padding: '20px', backgroundColor: 'rgba(15, 15, 20, 0.8)', backdropFilter: 'blur(10px)', zIndex: 10, borderBottom: '1px solid var(--border-glass)' }}>
            <button onClick={() => setShowSavingsModal(false)} style={{ background: 'none', border: 'none', padding: '5px', marginRight: '15px' }}>
              <ChevronLeft size={24} color="var(--text-main)" />
            </button>
            <h3 style={{ margin: 0, flex: 1, textAlign: 'center', color: 'var(--text-main)' }}>Chi Tiết Tiết Kiệm</h3>
            <div style={{ width: '34px' }}></div>
          </div>
          
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
            <div className="card" style={{ padding: '20px', borderRadius: '20px', marginBottom: '20px', textAlign: 'center', background: 'linear-gradient(135deg, var(--success) 0%, #2ecc71 100%)', color: 'white' }}>
              <p style={{ margin: '0 0 8px 0', opacity: 0.9 }}>Tổng Quỹ Tích Lũy</p>
              <h1 style={{ margin: 0, fontSize: '36px' }}>{budgetStatus.accumulatedSavings > 0 ? '+' : ''}{budgetStatus.accumulatedSavings?.toLocaleString('vi-VN')} đ</h1>
            </div>

            <h4 style={{ margin: '0 0 15px 0', color: 'var(--text-main)' }}>Lịch sử các tháng trước</h4>
            
            {budgetStatus.accumulatedSavingsDetails && budgetStatus.accumulatedSavingsDetails.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {budgetStatus.accumulatedSavingsDetails.map((detail: any) => (
                  <div key={detail.month} className="card glass-panel" style={{ padding: '16px', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
                      <h4 style={{ margin: 0, color: 'var(--primary)' }}>Tháng {detail.month.split('-').reverse().join('/')}</h4>
                      <span style={{ fontWeight: 'bold', fontSize: '18px', color: detail.saving >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {detail.saving > 0 ? '+' : ''}{detail.saving.toLocaleString('vi-VN')} đ
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px', marginBottom: '12px' }}>
                      <div><span style={{ color: 'var(--text-muted)' }}>Tổng Thu:</span> <br/> <strong style={{ color: 'var(--success)' }}>{detail.income.toLocaleString('vi-VN')} đ</strong></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Tổng Chi:</span> <br/> <strong style={{ color: 'var(--danger)' }}>{detail.expense.toLocaleString('vi-VN')} đ</strong></div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.1)', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Số dư ban đầu</span>
                        {editingMonth === detail.month ? (
                          <input 
                            type="number" 
                            autoFocus
                            value={editInitialBalance}
                            onChange={(e) => setEditInitialBalance(e.target.value)}
                            style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid var(--primary)', color: 'var(--text-main)', fontSize: '16px', fontWeight: 'bold', outline: 'none', padding: '4px 0' }}
                          />
                        ) : (
                          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{detail.initialBalance.toLocaleString('vi-VN')} đ</div>
                        )}
                      </div>
                      
                      {editingMonth === detail.month ? (
                        <button onClick={() => savePastInitialBalance(detail.month)} style={{ background: 'var(--success)', border: 'none', borderRadius: '8px', padding: '8px 12px', color: 'white', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Save size={16} /> Lưu
                        </button>
                      ) : (
                        <button onClick={() => { setEditingMonth(detail.month); setEditInitialBalance(detail.initialBalance.toString()); }} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '8px', color: 'var(--text-main)' }}>
                          <Edit2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', marginTop: '30px' }}>Chưa có dữ liệu tích lũy từ các tháng trước.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;

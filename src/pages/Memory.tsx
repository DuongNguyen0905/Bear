import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../utils/db';
import { Lock, BookOpen, Calendar, Filter, Receipt } from 'lucide-react';

const Memory: React.FC = () => {
  const [password, setPassword] = useState('');
  const [isAuth, setIsAuth] = useState(false);
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterShowExpense, setFilterShowExpense] = useState(false);
  const [filterShowDiary, setFilterShowDiary] = useState(false);

  const timelineData = useLiveQuery(async () => {
    let mems = await db.memories.toArray();
    let trans = await db.transactions.toArray();

    const transByDate: Record<string, any[]> = {};
    for (const t of trans) {
      if (!transByDate[t.dateKey]) transByDate[t.dateKey] = [];
      transByDate[t.dateKey].push(t);
    }

    mems.sort((a, b) => b.dateKey.localeCompare(a.dateKey));

    if (filterYear !== 'all') {
      mems = mems.filter(m => m.dateKey.startsWith(filterYear));
    }
    if (filterMonth !== 'all') {
      mems = mems.filter(m => {
        const [, mMonth] = m.dateKey.split('-');
        return mMonth === filterMonth.padStart(2, '0');
      });
    }
    if (filterShowExpense && !filterShowDiary) {
      mems = mems.filter(m => transByDate[m.dateKey] && transByDate[m.dateKey].some(t => t.type === 'expense'));
    } else if (filterShowDiary && !filterShowExpense) {
      mems = mems.filter(m => m.diary && m.diary.trim() !== '');
    } else if (filterShowExpense && filterShowDiary) {
      mems = mems.filter(m => (m.diary && m.diary.trim() !== '') && (transByDate[m.dateKey] && transByDate[m.dateKey].some(t => t.type === 'expense')));
    }

    // Lọc bỏ những ngày trống hoàn toàn (không ảnh, không nhật ký, không chi tiêu)
    mems = mems.filter(m => {
      const hasContent = (m.diary && m.diary.trim() !== '') || 
                         (transByDate[m.dateKey] && transByDate[m.dateKey].length > 0) ||
                         (m.photos && m.photos.length > 0);
      return hasContent;
    });

    return mems.map(m => ({
      ...m,
      transactions: transByDate[m.dateKey] || []
    }));
  }, [filterMonth, filterYear, filterShowExpense, filterShowDiary]);

  const handleAuth = () => {
    if (password === '300826' || password === '090525') {
      setIsAuth(true);
    } else {
      alert('Mật khẩu không đúng!');
    }
  };

  if (!isAuth) {
    return (
      <div className="page-container" style={{ paddingBottom: '100px' }}>
        <h2>Timeline Kỷ Niệm</h2>
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', marginTop: '20px', borderRadius: '24px' }}>
          <Lock size={46} color="var(--primary-dark)" style={{ marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 10px 0', color: 'var(--primary-dark)' }}>Kho lưu trữ cá nhân</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px', fontWeight: '600' }}>Vui lòng nhập mật khẩu để xem lại kỷ niệm</p>
          <input
            type="password"
            placeholder="Nhập mật khẩu..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
            style={{ marginBottom: '18px', textAlign: 'center' }}
          />
          <button className="btn-primary" onClick={handleAuth}>Mở khóa</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ paddingBottom: '100px' }}>
      <h2>Timeline Kỷ Niệm</h2>

      {/* Bộ Lọc (Filters) */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--text-main)', fontWeight: 'bold' }}>
          <Filter size={18} /> <span>Lọc dữ liệu</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ padding: '8px', fontSize: '14px' }}>
            <option value="all">Tất cả các tháng</option>
            {[...Array(12)].map((_, i) => <option key={i+1} value={String(i+1)}>Tháng {i+1}</option>)}
          </select>
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={{ padding: '8px', fontSize: '14px' }}>
            <option value="all">Tất cả các năm</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setFilterShowExpense(!filterShowExpense)}
            style={{ 
              flex: 1, padding: '10px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold', border: 'none', transition: 'all 0.2s', cursor: 'pointer',
              backgroundColor: filterShowExpense ? 'var(--danger)' : 'rgba(255,255,255,0.05)',
              color: filterShowExpense ? 'white' : 'var(--text-muted)',
              boxShadow: filterShowExpense ? '0 4px 12px rgba(255, 71, 87, 0.3)' : 'none'
            }}>
            Có chi tiêu
          </button>
          <button 
            onClick={() => setFilterShowDiary(!filterShowDiary)}
            style={{ 
              flex: 1, padding: '10px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold', border: 'none', transition: 'all 0.2s', cursor: 'pointer',
              backgroundColor: filterShowDiary ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
              color: filterShowDiary ? 'white' : 'var(--text-muted)',
              boxShadow: filterShowDiary ? '0 4px 12px rgba(88, 166, 255, 0.3)' : 'none'
            }}>
            Có nhật ký
          </button>
        </div>
      </div>

      {/* Timeline List */}
      <div className="timeline-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {!timelineData ? (
          <p style={{ textAlign: 'center' }}>Đang tải dữ liệu...</p>
        ) : timelineData.length === 0 ? (
          <div className="card text-muted" style={{ textAlign: 'center', padding: '40px' }}>
            <BookOpen size={40} style={{ marginBottom: '10px', opacity: 0.3 }} />
            <p>Không tìm thấy kỷ niệm nào phù hợp.</p>
          </div>
        ) : (
          timelineData.map(entry => (
            <div key={entry.dateKey} className="card" style={{ padding: '0', overflow: 'hidden' }}>
              {/* Header Ngày */}
              <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Calendar size={16} color="var(--primary)" />
                <span style={{ fontWeight: 'bold', fontSize: '15px' }}>{entry.dateKey}</span>
              </div>

              <div style={{ padding: '16px' }}>
                {/* Ảnh (Photos) */}
                {(!filterShowExpense && !filterShowDiary) && entry.photos && entry.photos.length > 0 && (
                  <div style={{ marginBottom: '16px', display: 'grid', gridTemplateColumns: entry.photos.length === 1 ? '1fr' : '1fr 1fr', gap: '14px' }}>
                    {entry.photos.map((photo: any, idx: number) => (
                      <div key={idx} style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.03)' }}>
                        <div style={{ position: 'relative' }}>
                          <img src={photo.url} alt="Kỷ niệm" style={{ width: '100%', height: entry.photos.length === 1 ? 'auto' : '150px', objectFit: 'cover', display: 'block' }} />
                          <div style={{ position: 'absolute', top: '8px', right: '8px', padding: '4px 8px', background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '11px', borderRadius: '12px', backdropFilter: 'blur(4px)' }}>
                            {photo.time?.split(' lúc ')[1] || ''}
                          </div>
                        </div>
                        {photo.caption && (
                          <p style={{ margin: 0, padding: '8px 10px', fontSize: '13px', color: 'var(--text-main)', lineHeight: '1.4' }}>
                            {photo.caption}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Nhật ký */}
                {(!filterShowExpense || filterShowDiary) && entry.diary && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: 'var(--text-muted)' }}>
                      <BookOpen size={14} /> <span style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Nhật ký</span>
                    </div>
                    <p style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: '15px', lineHeight: '1.6' }}>{entry.diary}</p>
                  </div>
                )}

                {/* Chi tiêu (Transactions) */}
                {(!filterShowDiary || filterShowExpense) && entry.transactions && entry.transactions.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: 'var(--text-muted)' }}>
                      <Receipt size={14} /> <span style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Chi tiêu trong ngày</span>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '10px' }}>
                      {entry.transactions.map((t: any) => (
                        <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px' }}>
                          <span>{t.category} {t.note ? `(${t.note})` : ''}</span>
                          <span style={{ color: t.type === 'expense' ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold' }}>
                            {t.type === 'expense' ? '-' : '+'}{t.amount.toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Memory;

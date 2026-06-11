import React, { useState, useEffect } from 'react';
import { memoryService } from '../services/memoryService';
import { useDate } from '../contexts/DateContext';
import DateNavigator from '../components/DateNavigator';

const Diary: React.FC = () => {
  const [content, setContent] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const { dateKey } = useDate();

  useEffect(() => {
    const loadDiary = async () => {
      const entry = await memoryService.getByDate(dateKey);
      setContent(entry?.diary || '');
    };
    loadDiary();
  }, [dateKey]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await memoryService.updatePartial(dateKey, { 
        diary: content
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Error saving diary:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-container" style={{ paddingBottom: '100px' }}>
      <h2>Nhật ký của tôi</h2>
      <DateNavigator />
      
      {saveSuccess && (
        <div style={{
          animation: 'slideInRight 250ms ease-out',
          backgroundColor: 'rgba(46, 204, 113, 0.95)',
          color: 'white',
          padding: '12px 16px',
          borderRadius: '12px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          fontWeight: '600',
          boxShadow: '0 4px 12px rgba(46, 204, 113, 0.3)'
        }}>
          ✓ Đã lưu an toàn
        </div>
      )}
      
      {/* Nhật ký */}
      <div className="card glass-panel" style={{ padding: '20px', borderRadius: '20px', marginBottom: '24px' }}>
        <div className="gemini-input-wrapper">
          <textarea 
            rows={15} 
            placeholder="Hôm nay của bạn thế nào? Viết gì đó đi..." 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{ 
              resize: 'none',
              animation: 'fadeIn 250ms ease-out',
              border: 'none',
              margin: 0,
              fontSize: '15px'
            }}
          />
        </div>
      </div>

      <button 
        className="btn-primary" 
        style={{ 
          width: '100%',
          padding: '16px',
          borderRadius: '16px',
          animation: saveSuccess ? 'pulseSave 0.6s ease-out' : 'none'
        }}
        onClick={handleSave}
        disabled={isSaving}
      >
        {isSaving ? '⏳ Đang lưu...' : saveSuccess ? '✓ Đã lưu thành công' : 'Lưu tất cả'}
      </button>
    </div>
  );
};

export default Diary;

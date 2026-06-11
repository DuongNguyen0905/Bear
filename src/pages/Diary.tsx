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
      if (entry && entry.diary) {
        setContent(entry.diary);
      } else {
        setContent('');
      }
    };
    loadDiary();
  }, [dateKey]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await memoryService.updatePartial(dateKey, { diary: content });
      setSaveSuccess(true);
      setContent(''); // Xóa trắng nội dung để bảo mật
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Error saving diary:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-container">
      <h2>Nhật ký của tớ</h2>
      <DateNavigator />
      
      {saveSuccess && (
        <div style={{
          animation: 'slideInRight 250ms ease-out',
          backgroundColor: 'rgba(129, 178, 154, 0.95)',
          color: 'white',
          padding: '12px 16px',
          borderRadius: '12px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          fontWeight: '600',
          boxShadow: '0 4px 12px rgba(129, 178, 154, 0.3)'
        }}>
          ✓ Nhật ký đã lưu an toàn
        </div>
      )}
      
      <div className="card glass-panel" style={{ marginTop: '10px' }}>
        <div className="gemini-input-wrapper">
          <textarea 
            rows={15} 
            placeholder="Hôm nay của bạn thế nào?" 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{ 
              resize: 'none',
              animation: 'fadeIn 250ms ease-out',
              border: 'none',
              margin: 0
            }}
          />
        </div>
        <button 
          className="btn-primary" 
          style={{ 
            marginTop: '16px',
            animation: saveSuccess ? 'pulseSave 0.6s ease-out' : 'none'
          }}
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? '⏳ Đang khóa kỹ...' : saveSuccess ? '✓ Đã khóa' : 'Lưu nhật ký'}
        </button>
      </div>
    </div>
  );
};

export default Diary;

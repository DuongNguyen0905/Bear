import React, { useState, useEffect, useRef } from 'react';
import { memoryService } from '../services/memoryService';
import { useDate } from '../contexts/DateContext';
import DateNavigator from '../components/DateNavigator';
import { Pencil, Camera, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const VIVID_FILTER = 'saturate(2) contrast(1.2)';

const Diary: React.FC = () => {
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [photos, setPhotos] = useState<any[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { dateKey } = useDate();
  const navigate = useNavigate();

  useEffect(() => {
    loadEntry();
  }, [dateKey]);

  const loadEntry = async () => {
    const entry = await memoryService.getByDate(dateKey);
    const diary = entry?.diary || '';
    setContent(diary);
    setPhotos(entry?.photos || []);
    setIsEditing(diary.trim() === '');
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await memoryService.updatePartial(dateKey, { diary: content });
      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Error saving diary:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddPhotoClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.filter = VIVID_FILTER;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const finalImageUrl = canvas.toDataURL('image/jpeg', 0.9);
          const now = new Date();
          const fullDate = `Ngày ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} lúc ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          const newPhoto = { url: finalImageUrl, time: fullDate, caption: '' };
          const entry = await memoryService.getByDate(dateKey);
          const updatedPhotos = [newPhoto, ...(entry.photos || [])];
          await memoryService.updatePartial(dateKey, { photos: updatedPhotos });
          setPhotos(updatedPhotos);
        }
        setIsUploadingPhoto(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="page-container" style={{ paddingBottom: '100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Nhật ký của tôi</h2>
        <button onClick={() => navigate('/memory')} style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '13px', color: 'var(--primary)', fontWeight: 700 }}>
          Kỷ niệm <ChevronRight size={14} />
        </button>
      </div>
      <DateNavigator />

      {saveSuccess && (
        <div style={{ animation: 'slideInRight 250ms ease-out', backgroundColor: 'rgba(46, 204, 113, 0.95)', color: 'white', padding: '12px 16px', borderRadius: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', boxShadow: '0 4px 12px rgba(46, 204, 113, 0.3)' }}>
          ✓ Đã lưu an toàn
        </div>
      )}

      {isEditing ? (
        <>
          <div className="card glass-panel" style={{ padding: '20px', borderRadius: '20px', marginBottom: '20px' }}>
            <div className="gemini-input-wrapper">
              <textarea
                rows={15}
                placeholder="Hôm nay của bạn thế nào? Viết gì đó đi..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                style={{ resize: 'none', animation: 'fadeIn 250ms ease-out', border: 'none', margin: 0, fontSize: '15px' }}
              />
            </div>
          </div>
          <button className="btn-primary" style={{ width: '100%', padding: '16px', borderRadius: '16px', marginBottom: '24px' }} onClick={handleSave} disabled={isSaving}>
            {isSaving ? '⏳ Đang lưu...' : 'Lưu tất cả'}
          </button>
        </>
      ) : (
        <div className="card glass-panel" style={{ padding: '32px 20px', borderRadius: '20px', textAlign: 'center', animation: 'fadeIn 250ms ease-out', marginBottom: '24px' }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>✓</div>
          <h3 style={{ margin: '0 0 6px 0', color: 'var(--text-main)' }}>Đã lưu nhật ký hôm nay</h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--text-muted)' }}>Nội dung đã được cất gọn. Bấm chỉnh sửa nếu bạn muốn viết thêm.</p>
          <button onClick={() => setIsEditing(true)} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '14px' }}>
            <Pencil size={16} /> Chỉnh sửa
          </button>
        </div>
      )}

      <div className="card glass-panel" style={{ padding: '20px', borderRadius: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h4 style={{ margin: 0, fontSize: '16px' }}>Khoảnh khắc hôm nay</h4>
          <button onClick={handleAddPhotoClick} disabled={isUploadingPhoto} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--primary-dark)', color: 'white', padding: '8px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 700 }}>
            <Camera size={16} /> {isUploadingPhoto ? 'Đang lưu...' : 'Thêm ảnh'}
          </button>
          <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
        </div>
        {photos.length === 0 ? (
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>Chưa có ảnh nào cho hôm nay.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: photos.length === 1 ? '1fr' : '1fr 1fr', gap: '10px' }}>
            {photos.map((p, idx) => (
              <div key={idx} style={{ borderRadius: '12px', overflow: 'hidden', background: 'rgba(255,255,255,0.03)' }}>
                <img src={p.url} alt="Khoảnh khắc" style={{ width: '100%', height: photos.length === 1 ? 'auto' : '130px', objectFit: 'cover', display: 'block' }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Diary;

import React, { useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Camera, BookHeart, PenLine, Receipt, X } from 'lucide-react';
import './BottomNav.css';
import { useDate } from '../contexts/DateContext';
import { memoryService } from '../services/memoryService';
import { useAndroidBack } from '../hooks/useAndroidBack';

// Mặc định luôn dùng bộ lọc "Đậm đà" cho ảnh chụp, không cần người dùng chọn lại.
const VIVID_FILTER = 'saturate(2) contrast(1.2)';

const BottomNav: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const captionInputRef = useRef<HTMLInputElement>(null);
  const { dateKey } = useDate();

  const [editingPhoto, setEditingPhoto] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);

  useAndroidBack(!!editingPhoto, () => closeEditor());

  const handleCameraClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setEditingPhoto(event.target?.result as string);
      setCaption('');
      // Đưa con trỏ vào ô chú thích luôn để chỉ cần gõ chữ rồi Enter là lưu.
      setTimeout(() => captionInputRef.current?.focus(), 350);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const closeEditor = () => {
    setEditingPhoto(null);
    setCaption('');
  };

  const saveFilteredPhoto = () => {
    if (!editingPhoto) return;

    setIsSavingPhoto(true);
    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        // Chỉ áp dụng bộ lọc màu lên ảnh, KHÔNG vẽ chữ chú thích lên canvas
        // để caption luôn là dữ liệu văn bản riêng, hiển thị bên dưới ảnh.
        ctx.filter = VIVID_FILTER;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const finalImageUrl = canvas.toDataURL('image/jpeg', 0.9);

        try {
          const entry = await memoryService.getByDate(dateKey);
          const currentPhotos = entry.photos || [];

          const now = new Date();
          const fullDate = `Ngày ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} lúc ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

          const newPhotoData = {
            url: finalImageUrl,
            time: fullDate,
            caption: caption.trim()
          };

          await memoryService.updatePartial(dateKey, { photos: [newPhotoData, ...currentPhotos] });
        } catch (err) {
          console.error('Error saving photo:', err);
          alert('Lỗi khi lưu ảnh!');
        }
      }
      setIsSavingPhoto(false);
      closeEditor();
    };
    img.src = editingPhoto;
  };

  return (
    <>
      {editingPhoto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', zIndex: 9999, display: 'flex', flexDirection: 'column', animation: 'fadeIn 200ms ease-out' }}>
          <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.5)', zIndex: 10, flexShrink: 0 }}>
            <button onClick={closeEditor} style={{ color: 'white', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
            <h3 style={{ margin: 0, color: 'white' }}>Khoảnh khắc này</h3>
            <div style={{ width: '36px' }} />
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '20px 20px 0' }}>
            <img src={editingPhoto} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', filter: VIVID_FILTER, borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }} />
          </div>

          <div style={{ flexShrink: 0, padding: '16px 20px', background: 'rgba(0,0,0,0.5)' }}>
            <div className="gemini-input-wrapper" style={{ marginBottom: '14px' }}>
              <input
                ref={captionInputRef}
                type="text"
                placeholder="Viết vài dòng rồi Enter để lưu..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !isSavingPhoto) saveFilteredPhoto(); }}
                style={{ width: '100%', padding: '14px 18px', borderRadius: '18px', border: 'none', backgroundColor: 'rgba(255,255,255,0.08)', color: 'white' }}
              />
            </div>

            <button onClick={saveFilteredPhoto} disabled={isSavingPhoto} className="btn-primary" style={{ width: '100%', padding: '14px', borderRadius: '18px' }}>
              {isSavingPhoto ? '⏳ Đang lưu...' : 'Lưu vào Kỷ niệm'}
            </button>
          </div>
        </div>
      )}

      <div className="bottom-nav">
        <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />

        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Home">
          <div className="icon-container"><Home size={24} strokeWidth={2.5} /></div>
        </NavLink>

        <NavLink to="/memory" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Kỷ niệm">
          <div className="icon-container"><BookHeart size={24} strokeWidth={2.5} /></div>
        </NavLink>

        <button onClick={handleCameraClick} className="nav-item-center" title="Chụp ảnh">
          <Camera size={26} strokeWidth={2.5} />
        </button>

        <NavLink to="/diary" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Nhật ký">
          <div className="icon-container"><PenLine size={24} strokeWidth={2.5} /></div>
        </NavLink>

        <NavLink to="/expenses" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Tài chính">
          <div className="icon-container"><Receipt size={24} strokeWidth={2.5} /></div>
        </NavLink>
      </div>
    </>
  );
};

export default BottomNav;

import React, { useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Camera, BookHeart, PenLine, Receipt, X, Check } from 'lucide-react';
import './BottomNav.css';
import { useDate } from '../contexts/DateContext';
import { memoryService } from '../services/memoryService';

const FILTERS = [
  { id: 'none', name: 'Gốc', style: 'none' },
  { id: 'dreamy', name: 'Thơ mộng', style: 'sepia(0.3) saturate(1.4) contrast(1.1)' },
  { id: 'vivid', name: 'Đậm đà', style: 'saturate(2) contrast(1.2)' },
  { id: 'cool', name: 'Sương sớm', style: 'hue-rotate(-15deg) saturate(1.1) brightness(1.05)' },
  { id: 'cinematic', name: 'Điện ảnh', style: 'contrast(1.25) saturate(0.85) sepia(0.15) brightness(0.95)' },
  { id: 'bright', name: 'Tươi sáng', style: 'brightness(1.15) saturate(1.2)' }
];

const BottomNav: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { dateKey } = useDate();
  
  const [editingPhoto, setEditingPhoto] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState(FILTERS[0]);

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
      setSelectedFilter(FILTERS[2]); // Default to 'vivid' (Đậm đà)
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const saveFilteredPhoto = () => {
    if (!editingPhoto) return;

    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        if (selectedFilter.style !== 'none') {
          ctx.filter = selectedFilter.style;
        }
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
            caption: ''
          };

          await memoryService.updatePartial(dateKey, { photos: [newPhotoData, ...currentPhotos] });
          alert('✨ Đã lưu ảnh thành công vào Kỷ niệm!');
        } catch (err) {
          console.error('Error saving photo:', err);
          alert('Lỗi khi lưu ảnh!');
        }
      }
      setEditingPhoto(null);
    };
    img.src = editingPhoto;
  };

  return (
    <>
      {editingPhoto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.5)', zIndex: 10 }}>
            <button onClick={() => setEditingPhoto(null)} style={{ color: 'white', background: 'none', border: 'none' }}><X size={28} /></button>
            <h3 style={{ margin: 0, color: 'white' }}>Chọn bộ lọc</h3>
            <button onClick={saveFilteredPhoto} style={{ color: '#58a6ff', background: 'none', border: 'none' }}><Check size={28} /></button>
          </div>
          
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '20px' }}>
            <img src={editingPhoto} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', filter: selectedFilter.style, transition: 'filter 0.3s ease', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }} />
          </div>

          <div className="no-scrollbar" style={{ height: '120px', padding: '15px 10px', display: 'flex', gap: '15px', overflowX: 'auto', background: 'rgba(20,20,25,0.9)', backdropFilter: 'blur(10px)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            {FILTERS.map(f => (
              <div key={f.id} onClick={() => setSelectedFilter(f)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', minWidth: '70px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', overflow: 'hidden', border: selectedFilter.id === f.id ? '3px solid #58a6ff' : '2px solid transparent', transition: 'all 0.2s', padding: selectedFilter.id === f.id ? '2px' : '0' }}>
                  <img src={editingPhoto} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: f.style, borderRadius: '50%' }} />
                </div>
                <span style={{ color: selectedFilter.id === f.id ? '#58a6ff' : 'white', fontSize: '12px', fontWeight: selectedFilter.id === f.id ? 'bold' : 'normal' }}>{f.name}</span>
              </div>
            ))}
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

import React from 'react';
import { useAndroidBack } from '../hooks/useAndroidBack';

interface Option {
  value: string;
  label: string;
}

interface RoundedPickerProps {
  title: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}

// Bảng chọn dạng lưới nút bo tròn — thay cho <select> gốc, vì phần dropdown
// xổ ra của trình duyệt/hệ điều hành không thể bo góc theo ý muốn.
const RoundedPicker: React.FC<RoundedPickerProps> = ({ title, options, value, onChange, onClose }) => {
  useAndroidBack(true, onClose);

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', zIndex: 4500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    >
      <div
        className="glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '480px', borderRadius: '28px 28px 0 0', padding: '20px', maxHeight: '60vh', overflowY: 'auto', animation: 'slideUp 250ms cubic-bezier(0.175, 0.885, 0.32, 1.275)', marginBottom: 0 }}
      >
        <h4 style={{ margin: '0 0 16px 0', textAlign: 'center' }}>{title}</h4>
        <div className="no-scrollbar" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); onClose(); }}
              style={{
                padding: '10px 18px', borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: '13px',
                background: value === opt.value ? 'var(--gemini-grad)' : 'rgba(255,255,255,0.06)',
                border: value === opt.value ? 'none' : '1px solid var(--border-glass)',
                color: value === opt.value ? 'white' : 'var(--text-main)'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RoundedPicker;

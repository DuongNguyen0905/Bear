import React, { useEffect, useState } from 'react';
import { useAndroidBack } from '../hooks/useAndroidBack';

const TRANSITION_MS = 160;

interface Option {
  value: string;
  label: string;
}

interface InlineDropdownProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}

// Dropdown thật (xổ ngay dưới ô, không che toàn màn hình, không làm tối nền
// phía sau) — khác với RoundedPicker (bảng chọn dạng lưới, hiện từ dưới màn
// hình lên). Dùng khi muốn giữ đúng cảm giác "dropdown" quen thuộc nhưng vẫn
// bo góc mềm mại và cùng màu kính với phần còn lại của app, vì dropdown gốc
// của hệ điều hành không thể chỉnh được phần bảng xổ xuống bằng CSS.
// Đặt bên trong một phần tử cha có position: relative, ngay cạnh nút mở.
const InlineDropdown: React.FC<InlineDropdownProps> = ({ options, value, onChange, onClose }) => {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const requestClose = (after: () => void) => {
    setClosing(true);
    setTimeout(after, TRANSITION_MS);
  };

  useAndroidBack(true, () => requestClose(onClose));

  const active = visible && !closing;

  return (
    <>
      {/* Bắt click ra ngoài để đóng — trong suốt, không làm tối nền phía sau. */}
      <div
        onClick={() => requestClose(onClose)}
        style={{ position: 'fixed', inset: 0, zIndex: 3500, background: 'transparent' }}
      />
      <div
        className="card glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 3501,
          padding: '8px', margin: 0, maxHeight: '260px', overflowY: 'auto',
          transformOrigin: 'top center',
          opacity: active ? 1 : 0,
          transform: active ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(-4px)',
          transition: `opacity ${TRANSITION_MS}ms ease, transform ${TRANSITION_MS}ms ease`,
        }}
      >
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => requestClose(() => onChange(opt.value))}
            style={{
              width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: '12px',
              fontSize: '14px', fontWeight: 600, marginBottom: '2px',
              background: value === opt.value ? 'var(--gemini-grad)' : 'transparent',
              color: value === opt.value ? 'white' : 'var(--text-main)',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </>
  );
};

export default InlineDropdown;

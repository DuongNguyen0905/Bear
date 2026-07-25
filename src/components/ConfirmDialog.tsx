import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAndroidBack } from '../hooks/useAndroidBack';

// Mật khẩu xác nhận bắt buộc cho MỌI thao tác xoá trong app.
const DELETE_PASSWORD = '300826';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// Hộp thoại xác nhận dùng chung cho mọi thao tác xoá — bo tròn, đồng bộ
// phong cách với phần còn lại của app, thay cho window.confirm() mặc định.
// Bắt buộc nhập đúng mật khẩu mới thực sự xoá được, để tránh bấm nhầm.
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ title, message, confirmLabel = 'Xoá', cancelLabel = 'Huỷ', onConfirm, onCancel }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useAndroidBack(true, onCancel);

  const handleConfirm = () => {
    if (password !== DELETE_PASSWORD) {
      setError('Sai mật khẩu!');
      return;
    }
    onConfirm();
  };

  return (
    <div
      onClick={onCancel}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
    >
      <div
        className="glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '340px', padding: '24px', borderRadius: '24px', textAlign: 'center', animation: 'fadeIn 150ms ease-out' }}
      >
        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(255, 123, 114, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <AlertTriangle size={26} color="var(--danger)" />
        </div>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '17px' }}>{title}</h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{message}</p>

        <div className="gemini-input-wrapper" style={{ marginBottom: error ? '8px' : '20px' }}>
          <input
            type="password"
            autoFocus
            placeholder="Nhập mật khẩu để xoá"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
            style={{ width: '100%', padding: '12px 16px', textAlign: 'center', fontSize: '15px' }}
          />
        </div>
        {error && <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: 'var(--danger)', fontWeight: 700 }}>{error}</p>}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onCancel}
            style={{ flex: 1, padding: '14px', borderRadius: '14px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', fontWeight: 700, fontSize: '14px' }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!password}
            style={{ flex: 1, padding: '14px', borderRadius: '14px', background: 'var(--danger)', border: 'none', color: 'white', fontWeight: 700, fontSize: '14px', opacity: !password ? 0.5 : 1 }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;

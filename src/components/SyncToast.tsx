import React, { useEffect, useState } from 'react';
import { isCloudConfigured, onSyncStatusChange } from '../services/syncService';
import { useClosingTransition } from '../hooks/useClosingTransition';

const TOAST_DURATION_MS = 3000;

// Đồng bộ đám mây tự động chạy ngầm sau mỗi lần sửa dữ liệu (không phải lúc
// bấm "Đồng Bộ Ngay" — nút đó đã tự báo kết quả riêng). Không thể dùng alert()
// cho mỗi lần chạy ngầm vì sẽ làm gián đoạn liên tục khi đang gõ chữ, nên hiện
// một toast nhỏ, tự biến mất, để người dùng luôn biết đồng bộ thành công hay lỗi.
const SyncToast: React.FC = () => {
  const [toast, setToast] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);
  const { shouldRender, active } = useClosingTransition(!!toast, 200);

  useEffect(() => {
    if (!isCloudConfigured) return;
    return onSyncStatusChange((status) => {
      if (status === 'synced') setToast({ text: 'Đã tự động đồng bộ lên đám mây', kind: 'success' });
      else if (status === 'error') setToast({ text: 'Đồng bộ đám mây thất bại — kiểm tra kết nối mạng', kind: 'error' });
    });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!shouldRender || !toast) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '110px',
        left: '50%',
        transform: active ? 'translate(-50%, 0)' : 'translate(-50%, 10px)',
        opacity: active ? 1 : 0,
        transition: 'opacity 200ms ease, transform 200ms ease',
        background: toast.kind === 'success' ? 'var(--success)' : 'var(--danger)',
        color: 'white',
        padding: '10px 18px',
        borderRadius: 'var(--radius-full)',
        fontSize: '13px',
        fontWeight: 600,
        boxShadow: '0 10px 25px rgba(0,0,0,0.35)',
        zIndex: 5000,
        maxWidth: '90vw',
        textAlign: 'center',
        pointerEvents: 'none',
      }}
    >
      {toast.text}
    </div>
  );
};

export default SyncToast;

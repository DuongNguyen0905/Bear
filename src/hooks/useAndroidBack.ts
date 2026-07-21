import { useEffect } from 'react';
import { pushBackHandler, popBackHandler } from '../utils/backHandlerStack';

// Đăng ký onClose làm trình xử lý nút/vuốt back trong lúc isOpen = true.
export function useAndroidBack(isOpen: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!isOpen) return;
    pushBackHandler(onClose);
    return () => popBackHandler(onClose);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
}

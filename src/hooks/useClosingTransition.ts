import { useEffect, useState } from 'react';

// Giữ một modal/overlay còn gắn trong DOM thêm `durationMs` sau khi isOpen
// chuyển về false, để nó có thời gian chạy animation đóng mượt thay vì biến
// mất đột ngột. Chỗ gọi chỉ cần đổi điều kiện render từ `isOpen` sang
// `shouldRender`, và dùng `active` để bật/tắt style transition — mọi
// onClick={() => setIsOpen(false)} hiện có không cần sửa gì thêm.
export function useClosingTransition(isOpen: boolean, durationMs: number = 200) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [active, setActive] = useState(isOpen);

  useEffect(() => {
    let showTimer: ReturnType<typeof setTimeout>;
    let hideTimer: ReturnType<typeof setTimeout>;

    if (isOpen) {
      setShouldRender(true);
      // setTimeout thay vì requestAnimationFrame: rAF không chạy khi trang
      // không compositing (tab/webview tạm ẩn), setTimeout vẫn đáng tin cậy hơn.
      showTimer = setTimeout(() => setActive(true), 10);
    } else {
      setActive(false);
      hideTimer = setTimeout(() => setShouldRender(false), durationMs);
    }

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [isOpen, durationMs]);

  return { shouldRender, active };
}

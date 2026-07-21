import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { handleBackPress } from '../utils/backHandlerStack';

// Chặn nút back / vuốt cạnh màn hình của Android: đóng modal/lịch đang mở
// trước, rồi mới lùi trang, và chỉ thoát app khi đã ở màn hình gốc.
const BackButtonHandler: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let handle: { remove: () => void } | undefined;

    CapacitorApp.addListener('backButton', () => {
      if (handleBackPress()) return;

      if (location.pathname !== '/') {
        navigate(-1);
      } else {
        CapacitorApp.exitApp();
      }
    }).then((h) => { handle = h; });

    return () => { handle?.remove(); };
  }, [location, navigate]);

  return null;
};

export default BackButtonHandler;

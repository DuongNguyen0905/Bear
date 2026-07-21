import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.duongnguyen0905.sotay',
  appName: ' SoTay',
  webDir: 'dist',
  plugins: {
    // Giữ nguyên layout khi bàn phím ảo hiện lên — WebView không tự co lại
    // nên thanh menu dưới và các ô nhập không còn bị đẩy nhảy lên nữa.
    Keyboard: {
      resize: 'none',
      resizeOnFullScreen: true
    }
  }
};

export default config;

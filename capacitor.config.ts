import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.duongnguyen0905.sotay',
  appName: ' SoTay',
  webDir: 'dist',
  plugins: {
    // resizeOnFullScreen=true khiến plugin TỰ TAY co chiều cao WebView mỗi khi
    // bàn phím hiện lên (đọc thấy trong Keyboard.java), đè lên mọi thứ đã khoá
    // ở AndroidManifest (adjustNothing) lẫn CSS/viewport — đây mới là nguyên
    // nhân thật khiến thanh menu vẫn nhảy theo bàn phím. Phải để false.
    Keyboard: {
      resizeOnFullScreen: false
    }
  }
};

export default config;

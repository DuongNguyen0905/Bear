import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.duongnguyen0905.sotay',
  appName: ' SoTay',
  webDir: 'dist',
  plugins: {
    // Lưu ý: "resize" ở đây chỉ có tác dụng trên iOS. Trên Android, việc
    // khoá layout không bị bàn phím đẩy lên nằm ở
    // android:windowSoftInputMode="adjustNothing" trong AndroidManifest.xml.
    Keyboard: {
      resizeOnFullScreen: true
    }
  }
};

export default config;

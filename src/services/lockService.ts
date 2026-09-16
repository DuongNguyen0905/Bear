import { db } from '../utils/db';
import { Capacitor } from '@capacitor/core';
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';

export const lockService = {
  async isEnabled(): Promise<boolean> {
    const s = await db.settings.get('appLockEnabled');
    return !!s?.value;
  },
  async setEnabled(enabled: boolean): Promise<void> {
    await db.settings.put({ key: 'appLockEnabled', value: enabled });
  },
  async getPin(): Promise<string | null> {
    const s = await db.settings.get('appLockPin');
    return s?.value || null;
  },
  async setPin(pin: string): Promise<void> {
    await db.settings.put({ key: 'appLockPin', value: pin });
  },
  async verifyPin(pin: string): Promise<boolean> {
    const stored = await this.getPin();
    return stored !== null && stored === pin;
  },

  // Máy có vân tay/khuôn mặt đã đăng ký hay không. Trên bản web (không phải
  // app Android) luôn false để màn khoá chỉ hiện PIN.
  async isBiometricAvailable(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      const info = await BiometricAuth.checkBiometry();
      return !!info.isAvailable;
    } catch {
      return false;
    }
  },

  // Mở bằng BiometricPrompt gốc của Android. WebAuthn không chạy được trong
  // WebView của Capacitor nên bắt buộc dùng plugin native ở đây.
  async tryBiometric(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      const info = await BiometricAuth.checkBiometry();
      if (!info.isAvailable) return false;
      await BiometricAuth.authenticate({
        reason: 'Mở sổ tay của bạn',
        androidTitle: 'Xác thực',
        androidSubtitle: 'Dùng vân tay hoặc khuôn mặt đã lưu trên máy',
        cancelTitle: 'Dùng mã PIN',
        allowDeviceCredential: false,
      });
      return true;
    } catch {
      return false;
    }
  }
};

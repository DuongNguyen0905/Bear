import { db } from '../utils/db';
import { Capacitor } from '@capacitor/core';
import { NativeBiometric } from 'capacitor-native-biometric';

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

  // Máy có hỗ trợ vân tay/khuôn mặt hay không. Trên web (không phải app
  // Android) luôn trả false để màn khoá chỉ hiện PIN, không hiện nút vân tay
  // vô dụng.
  async isBiometricAvailable(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      const res = await NativeBiometric.isAvailable({ useFallback: true });
      return !!res.isAvailable;
    } catch {
      return false;
    }
  },

  // Mở bằng vân tay qua plugin native (BiometricPrompt của Android). WebAuthn
  // không dùng được trong WebView của Capacitor nên phải đi đường này.
  async tryBiometric(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      const avail = await NativeBiometric.isAvailable({ useFallback: true });
      if (!avail.isAvailable) return false;
      await NativeBiometric.verifyIdentity({
        reason: 'Mở sổ tay của bạn',
        title: 'Xác thực',
        subtitle: 'Dùng vân tay hoặc khuôn mặt đã lưu trên máy',
        description: '',
        useFallback: true,
        maxAttempts: 3,
      });
      return true;
    } catch {
      return false;
    }
  }
};

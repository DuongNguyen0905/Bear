import { db } from '../utils/db';

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
  // Thử mở bằng vân tay/khuôn mặt qua WebAuthn (platform authenticator) —
  // hoạt động trên máy có cảm biến và hệ điều hành hỗ trợ; nếu không hỗ trợ
  // hoặc người dùng huỷ, trả về false để màn hình khoá tự chuyển sang PIN,
  // không có lỗi hiển thị ra ngoài.
  async tryBiometric(): Promise<boolean> {
    try {
      if (!window.PublicKeyCredential) return false;
      const available = await (window.PublicKeyCredential as any).isUserVerifyingPlatformAuthenticatorAvailable?.();
      if (!available) return false;
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const cred = await navigator.credentials.get({
        publicKey: {
          challenge,
          userVerification: 'required',
          timeout: 30000,
        } as any
      });
      return !!cred;
    } catch {
      return false;
    }
  }
};

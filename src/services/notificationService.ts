import { LocalNotifications } from '@capacitor/local-notifications';

// Id cố định cho mỗi loại nhắc — đặt lại cùng id sẽ tự thay thế lịch cũ,
// không tạo thông báo trùng khi người dùng đổi giờ nhiều lần.
const DIARY_REMINDER_ID = 1001;
const STREAK_WARNING_ID = 1002;

export const notificationService = {
  async requestPermission(): Promise<boolean> {
    try {
      const res = await LocalNotifications.requestPermissions();
      return res.display === 'granted';
    } catch {
      return false;
    }
  },

  async scheduleDaily(id: number, title: string, body: string, time: string): Promise<void> {
    const [hour, minute] = time.split(':').map(Number);
    await LocalNotifications.cancel({ notifications: [{ id }] });
    await LocalNotifications.schedule({
      notifications: [{
        id,
        title,
        body,
        schedule: { on: { hour, minute }, allowWhileIdle: true },
      }]
    });
  },

  async scheduleDiaryReminder(time: string): Promise<void> {
    const granted = await this.requestPermission();
    if (!granted) return;
    await this.scheduleDaily(DIARY_REMINDER_ID, 'Viết nhật ký hôm nay chưa? 📝', 'Vài dòng thôi cũng được, đừng để hôm nay trôi qua không dấu vết.', time);
  },

  async scheduleStreakWarning(time: string): Promise<void> {
    const granted = await this.requestPermission();
    if (!granted) return;
    await this.scheduleDaily(STREAK_WARNING_ID, 'Sắp mất chuỗi rồi! 🔥', 'Hôm nay chưa ghi gì — viết nhật ký hoặc thêm ảnh để giữ chuỗi ngày liên tiếp.', time);
  },

  async cancelAll(): Promise<void> {
    await LocalNotifications.cancel({ notifications: [{ id: DIARY_REMINDER_ID }, { id: STREAK_WARNING_ID }] });
  }
};

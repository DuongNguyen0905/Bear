import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

// Id cố định cho mỗi loại nhắc — đặt lại cùng id sẽ tự thay thế lịch cũ,
// không tạo thông báo trùng khi người dùng đổi giờ nhiều lần.
const DIARY_REMINDER_ID = 1001;
const STREAK_WARNING_ID = 1002;

export const notificationService = {
  available(): boolean {
    return Capacitor.isNativePlatform();
  },

  async requestPermission(): Promise<boolean> {
    if (!this.available()) return false;
    try {
      const cur = await LocalNotifications.checkPermissions();
      if (cur.display === 'granted') return true;
      const res = await LocalNotifications.requestPermissions();
      return res.display === 'granted';
    } catch {
      return false;
    }
  },

  async scheduleDaily(id: number, title: string, body: string, time: string): Promise<boolean> {
    if (!this.available()) return false;
    const [hour, minute] = time.split(':').map(Number);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return false;
    try {
      await LocalNotifications.cancel({ notifications: [{ id }] });
    } catch {
      // Chưa có lịch nào để huỷ — bỏ qua.
    }
    const base = { id, title, body };
    try {
      await LocalNotifications.schedule({
        notifications: [{ ...base, schedule: { on: { hour, minute }, allowWhileIdle: true } }]
      });
      return true;
    } catch {
      // Android 14 có thể chặn báo thức chính xác. Đặt lại kiểu thường —
      // nhắc có thể lệch vài phút nhưng vẫn hoạt động.
      try {
        await LocalNotifications.schedule({
          notifications: [{ ...base, schedule: { on: { hour, minute } } }]
        });
        return true;
      } catch {
        return false;
      }
    }
  },

  async scheduleDiaryReminder(time: string): Promise<boolean> {
    if (!(await this.requestPermission())) return false;
    return this.scheduleDaily(DIARY_REMINDER_ID, 'Viết nhật ký hôm nay chưa? 📝', 'Vài dòng thôi cũng được, đừng để hôm nay trôi qua không dấu vết.', time);
  },

  async scheduleStreakWarning(time: string): Promise<boolean> {
    if (!(await this.requestPermission())) return false;
    return this.scheduleDaily(STREAK_WARNING_ID, 'Sắp mất chuỗi rồi! 🔥', 'Hôm nay chưa ghi gì — viết nhật ký hoặc thêm ảnh để giữ chuỗi ngày liên tiếp.', time);
  },

  // Đặt lại cả hai lịch theo giờ đã lưu. Gọi lúc mở app vì lịch nằm ở hệ điều
  // hành, không nằm trong dữ liệu app: cài lại app hoặc xoá dữ liệu hệ thống
  // là lịch mất, trong khi giờ người dùng chọn vẫn còn.
  async rescheduleFromSettings(diaryTime: string, streakTime: string): Promise<void> {
    if (!this.available()) return;
    try {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') return; // chưa cho quyền thì không tự xin lúc mở app
      await this.scheduleDaily(DIARY_REMINDER_ID, 'Viết nhật ký hôm nay chưa? 📝', 'Vài dòng thôi cũng được, đừng để hôm nay trôi qua không dấu vết.', diaryTime);
      await this.scheduleDaily(STREAK_WARNING_ID, 'Sắp mất chuỗi rồi! 🔥', 'Hôm nay chưa ghi gì — viết nhật ký hoặc thêm ảnh để giữ chuỗi ngày liên tiếp.', streakTime);
    } catch {
      // Không chặn app chạy nếu đặt lịch thất bại.
    }
  },

  async cancelAll(): Promise<void> {
    if (!this.available()) return;
    try {
      await LocalNotifications.cancel({ notifications: [{ id: DIARY_REMINDER_ID }, { id: STREAK_WARNING_ID }] });
    } catch {
      // Không có gì để huỷ.
    }
  }
};

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// 1. Cấu hình hiển thị thông báo
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// 2. Cấu hình Kênh và các Nút tương tác
export const setupNotificationCategories = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('water-reminders', {
      name: 'Nhắc uống nước',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  await Notifications.setNotificationCategoryAsync('WATER_CATEGORY', [
    {
      identifier: 'LOG_WATER_250',
      buttonTitle: '💧 Uống 250ml ngay',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'SNOOZE',
      buttonTitle: '⏰ Trì hoãn 15 phút',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'CANCEL',
      buttonTitle: '❌ Bỏ qua',
      options: { isDestructive: true, opensAppToForeground: false },
    },
  ]);
};

// 3. Tự động lên lịch nhắc nhở hàng ngày theo khung giờ chuẩn
export const scheduleDailyWaterReminders = async () => {
  // Hủy các lịch cũ bị trùng lặp trước khi đặt lịch mới
  await Notifications.cancelAllScheduledNotificationsAsync();

  const scheduleTimes = [
    { h: 7, m: 0 },   // 07:00 sáng
    { h: 9, m: 30 },  // 09:30 sáng
    { h: 12, m: 0 },  // 12:00 trưa
    { h: 14, m: 30 }, // 02:30 chiều
    { h: 17, m: 0 },  // 05:00 chiều
    { h: 19, m: 30 }  // 07:30 tối
  ];

  for (const time of scheduleTimes) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Tới giờ uống nước rồi Phong ơi! 🚰", 
        body: "Cơ thể đang cần nước, chốt ngay 250ml nào!",
        categoryIdentifier: 'WATER_CATEGORY',
        sound: true,
      },
      trigger: {
        hour: time.h,
        minute: time.m,
        repeats: true, // Lặp lại hàng ngày
      },
    });
  }
};

// 4. Hẹn giờ nhắc lại sau 15 phút khi bấm Snooze
export const scheduleSnooze = async () => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Đừng quên uống nước nhé! 💧",
      body: "15 phút trước bạn đã hẹn uống nước đó, uống ngay đi nào.",
      categoryIdentifier: 'WATER_CATEGORY',
      sound: true,
    },
    trigger: {
      seconds: 15 * 60, 
    },
  });
};
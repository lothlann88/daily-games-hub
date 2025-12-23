import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === "granted";
  } catch (error) {
    console.error("Error requesting notification permissions:", error);
    return false;
  }
}

export async function scheduleDailyReminder(hour: number, minute: number): Promise<void> {
  try {
    // Cancel any existing reminders
    await cancelAllReminders();

    // Schedule new daily reminder
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Time to play! 🎮",
        body: "Don't forget to play your daily games today!",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        repeats: true,
      } as Notifications.DailyTriggerInput,
    });

    console.log(`Daily reminder scheduled for ${hour}:${minute}`);
  } catch (error) {
    console.error("Error scheduling daily reminder:", error);
    throw error;
  }
}

export async function cancelAllReminders(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log("All reminders cancelled");
  } catch (error) {
    console.error("Error cancelling reminders:", error);
  }
}

export async function getScheduledNotifications() {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    return notifications;
  } catch (error) {
    console.error("Error getting scheduled notifications:", error);
    return [];
  }
}

export function parseTimeString(timeString: string): { hour: number; minute: number } {
  const [hourStr, minuteStr] = timeString.split(":");
  return {
    hour: parseInt(hourStr, 10),
    minute: parseInt(minuteStr, 10),
  };
}

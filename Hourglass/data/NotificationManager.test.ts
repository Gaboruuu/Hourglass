import { NotificationService } from "./NotificationManager";
import { FilterManager } from "./FilterManager";
import * as Notifications from "expo-notifications";

jest.mock("expo-notifications", () => ({
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  AndroidImportance: { MAX: 4 },
  AndroidNotificationPriority: { MAX: "max" },
  SchedulableTriggerInputTypes: { DATE: "date" }
}));

jest.mock("expo-device", () => ({
  isDevice: true,
}));

jest.mock("react-native", () => ({
  Platform: { OS: "android" },
}));

jest.mock("./FilterManager", () => ({
  FilterManager: {
    shouldScheduleNotification: jest.fn().mockResolvedValue(true),
    getNotificationTimesForEvent: jest.fn().mockResolvedValue(["3days", "1day", "2hours"])
  },
}));

describe("NotificationManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should group events that expire at the same time and belong to the same game", async () => {
    const mockEvents = [
      {
        event_id: "e1",
        event_name: "Genshin Event 1",
        game_id: "gi",
        game_name: "Genshin Impact",
        event_type: "main",
        expiry_date: "2026-07-20T04:00:00Z",
      },
      {
        event_id: "e2",
        event_name: "Genshin Event 2",
        game_id: "gi",
        game_name: "Genshin Impact",
        event_type: "side",
        expiry_date: "2026-07-20T04:00:00Z",
      },
      {
        event_id: "e3",
        event_name: "Honkai Event",
        game_id: "hsr",
        game_name: "Honkai: Star Rail",
        event_type: "main",
        expiry_date: "2026-07-20T04:00:00Z",
      },
    ];

    await NotificationService.scheduleNotificationsForEvents(mockEvents as any[]);

    // 3 time intervals (3days, 1day, 2hours). 
    // Genshin has 2 events -> grouped into 1 notification per interval = 3 notifications
    // Honkai has 1 event -> 1 notification per interval = 3 notifications
    // Total = 6 notifications scheduled
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(6);

    const calls = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls;
    
    // Check one of the grouped notifications
    const genshinGroups = calls.filter(call => call[0].content.data.gameId === "gi");
    expect(genshinGroups.length).toBe(3);

    // Assert that the title shows it's a grouped notification
    expect(genshinGroups[0][0].content.title).toBe("2 events expiring soon in Genshin Impact");
    expect(genshinGroups[0][0].content.data.isGroup).toBe(true);
    expect(genshinGroups[0][0].content.data.groupedEventNames).toEqual(["Genshin Event 1", "Genshin Event 2"]);

    // Check one of the single notifications
    const honkaiSingles = calls.filter(call => call[0].content.data.gameId === "hsr");
    expect(honkaiSingles.length).toBe(3);

    // Assert it shows standard text
    expect(honkaiSingles[0][0].content.title).toBe("Honkai Event expiring soon");
    expect(honkaiSingles[0][0].content.data.isGroup).toBe(false);
  });
});

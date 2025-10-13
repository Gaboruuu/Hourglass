export type EventType = "side" | "main" | "permanent";
export type NotificationTime = "3days" | "1day" | "2hours";

export interface BaseEvent {
  event_id: string;
  event_name?: string;
  game_id: string;
  game_name?: string;
  start_date?: string; // ISO 8601 date string
  expiry_date?: string; // ISO 8601 date string
  daily_login?: boolean;
  event_type: EventType;
  remaining?: string; // in days
}

export interface ApiEvent extends BaseEvent {
  event_id: string;
  event_name: string;
  game_id: string;
  game_name: string;
  start_date: string;
  expiry_date: string;
  event_type: EventType;
  daily_login: boolean;
  remaining: string;
}

export interface PermanentEvent extends BaseEvent {
  event_id: string;
  event_name: string;
  game_name: string;
  event_type: "permanent";
  daily_login: boolean;
  description?: string;
  background?: string;
  reset_type: "daily" | "weekly" | "monthly" | "complex" | "fixed";
  status?: "ongoing" | "upcoming";
  start_time?: string;
  end_time?: string;
  start_days?: number[];
  end_days?: number[];
  duration_days?: number;
  reset_day?: number;
}

export interface ProcessedEvent extends PermanentEvent {
  expiry_date: string;
}

export type AnyEvent = ApiEvent | PermanentEvent | ProcessedEvent;

export interface GameEventNotificationPrefs {
  [eventType: string]: NotificationTime[];
}

export interface NotificationPreferences {
  enabled: boolean;
  gamePreferences: {
    [gameName: string]: GameEventNotificationPrefs;
  };
}

export interface UiEventFilters {
  games: string[];
  eventTypes: EventType[];
  showExpired: boolean;
  showActive: boolean;
  sortBy: "expiry" | "name" | "game" | "type";
  sortOrder: "asc" | "desc";
  searchText: string;
}

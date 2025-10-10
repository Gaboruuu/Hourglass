import { weeklyEvents } from "./weeklyEvents";
import { monthlyEvents } from "./monthlyEvents";
import { fixedDurationEvents } from "./fixedDurationEvents";
import { complexEvents } from "./complexEvents";

// Define our own RegionType to match what's in RegionContext
type RegionType = "europe" | "northAmerica" | "asia";
type ResetType = "weekly" | "monthly" | "fixed_duration" | "complex";

interface PermanentEvent {
  id: string;
  event_name: string;
  game_name: string;
  background: string;
  daily_login: boolean;
  reset_type: ResetType;
  reset_day?: number; // For weekly (0-6) and monthly (1-31) events
  start_date?: string; // For fixed duration events
  duration_days?: number; // For fixed duration events
  description?: string;
  expire_date?: string; // Will be calculated based on region settings
  start_time?: string; // for complex events
  end_time?: string; // for complex events
  start_days?: number[]; // for complex events
  end_days?: number[]; // for complex events
  status?: "upcoming" | "ongoing"; // for complex events
}

// Events ready to be displayed in PermanentEventCard
export interface ProcessedEvent {
  id: string;
  event_name: string;
  game_name: string;
  background: string;
  daily_login: boolean;
  reset_type: ResetType;
  reset_day?: number;
  duration_days?: number;
  description?: string;
  expire_date: string; // ISO date string for when the event expires/resets
  start_date?: string;
  start_time?: string; // for complex events
  end_time?: string; // for complex events
  status?: "upcoming" | "ongoing" | "expired"; // for complex events
}

export class PermanentEventsManager {
  private allEvents: PermanentEvent[] = [];
  private processedEvents: ProcessedEvent[] = [];
  private region: RegionType = "europe";
  private utcOffset: number = 1;
  private resetHour: number = 4; // Default reset hour (4 AM CET)

  constructor() {
    this.loadEvents();
    this.updateExpirationDates();
  }

  /**
   * Sync with RegionContext settings
   * Call this method when the app initializes or when region changes
   */
  public syncWithRegionContext(regionContext: any): void {
    const region = regionContext.region as RegionType;
    const utcOffset = regionContext.regionConfig.utcOffset;
    const resetHour = regionContext.regionConfig.resetHour;

    if (
      this.region !== region ||
      this.utcOffset !== utcOffset ||
      this.resetHour !== resetHour
    ) {
      this.setRegion(region, utcOffset, resetHour);
    }
  }

  /**
   * Load all events from data sources
   */
  private loadEvents(): void {
    // Combine all event types with proper type casting to ensure ResetType is correct
    this.allEvents = [
      ...(weeklyEvents as PermanentEvent[]),
      ...(monthlyEvents as PermanentEvent[]),
      ...(fixedDurationEvents as PermanentEvent[]),
      ...(complexEvents as PermanentEvent[]), // Complex events handling can be added later
    ];
  }

  /**
   * Update region settings and recalculate expiration dates
   */
  public setRegion(
    region: RegionType,
    utcOffset: number,
    resetHour: number
  ): void {
    this.region = region;
    this.utcOffset = utcOffset;
    this.resetHour = resetHour;

    console.log(
      `Region changed to ${region}. UTC Offset: ${utcOffset}, Reset Hour: ${resetHour}`
    );
    // Recalculate all expiration dates with the new region settings
    this.updateExpirationDates();
  }

  /**
   * Calculate expiration dates for all events based on current region settings
   */
  private updateExpirationDates(): void {
    const now = new Date();

    this.processedEvents = this.allEvents.map((event) => {
      let expireDate: Date;

      if (event.reset_type === "weekly") {
        expireDate = this.calculateWeeklyReset(event.reset_day || 1);
      } else if (event.reset_type === "monthly") {
        expireDate = this.calculateMonthlyReset(event.reset_day || 1);
      } else if (event.reset_type === "fixed_duration") {
        expireDate = this.calculateFixedDurationCycle(
          event.start_date || "",
          event.duration_days || 0
        );
      } else if (event.reset_type === "complex") {
        expireDate = this.calculateComplexEventExpiry(event, now);
        // Don't modify the expireDate hours for complex events
        // as they already have the correct times from calculateComplexEventExpiry

        return {
          ...event,
          expire_date: expireDate.toISOString(),
        } as ProcessedEvent;
      } else {
        // Default fallback to 7 days from now if something goes wrong
        expireDate = new Date();
        expireDate.setDate(now.getDate() + 7);
      }

      // Apply region-specific time (resetHour in the region's timezone)
      // Only for non-complex events
      expireDate.setUTCHours(this.resetHour - this.utcOffset, 0, 0, 0);

      return {
        ...event,
        expire_date: expireDate.toISOString(),
      } as ProcessedEvent;
    });
  }

  /**
   * Get the actual user's UTC offset based on their region
   * This handles cases where the "Europe" region is generic but user is in a different timezone
   */
  private getActualUserUtcOffset(): number {
    // For now, we'll use the region's UTC offset
    // In the future, this could be made more sophisticated to detect actual user timezone
    // or allow manual timezone override

    // Check if we're in Romania specifically (UTC+2/UTC+3)
    // You can extend this to detect browser timezone or add user preference
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (
      userTimezone === "Europe/Bucharest" ||
      userTimezone === "Europe/Athens"
    ) {
      // Romania and Greece are UTC+2 (EET) in winter, UTC+3 (EEST) in summer
      const now = new Date();

      // More accurate DST detection for European Daylight Saving Time
      // DST in Europe typically runs from last Sunday in March to last Sunday in October
      const year = now.getFullYear();
      const march = new Date(year, 2, 31); // March 31st
      const october = new Date(year, 9, 31); // October 31st

      // Find last Sunday of March
      const lastSundayMarch = new Date(march);
      lastSundayMarch.setDate(march.getDate() - march.getDay());

      // Find last Sunday of October
      const lastSundayOctober = new Date(october);
      lastSundayOctober.setDate(october.getDate() - october.getDay());

      const isDST = now >= lastSundayMarch && now < lastSundayOctober;
      return isDST ? 3 : 2; // UTC+3 in summer (EEST), UTC+2 in winter (EET)
    }

    // Fallback to region's UTC offset
    return this.utcOffset;
  }
  private calculateComplexEventExpiry(
    event: PermanentEvent,
    referenceDate: Date
  ): Date {
    // Create a date object with the current time
    const now = new Date(referenceDate);

    // Get the current day
    const currentDay = now.getDay();

    // Calculate current time in minutes since midnight
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    // Parse event times from the data
    // These times are typically in the game server timezone (often UTC+1 for European servers)
    const [startHourServer, startMinuteServer] = event.start_time
      ? event.start_time.split(":").map((part) => parseInt(part, 10))
      : [0, 0];
    const [endHourServer, endMinuteServer] = event.end_time
      ? event.end_time.split(":").map((part) => parseInt(part, 10))
      : [23, 59];

    // Convert from server time to user's local timezone
    const serverUtcOffset = this.utcOffset;
    const timezoneAdjustment = this.getActualUserUtcOffset() - serverUtcOffset;

    const startHour = (startHourServer + timezoneAdjustment + 24) % 24;
    const startMinute = startMinuteServer;
    const endHour = (endHourServer + timezoneAdjustment + 24) % 24;
    const endMinute = endMinuteServer;

    const eventStartTime = startHour * 60 + startMinute;
    const eventEndTime = endHour * 60 + endMinute;

    // Check for day boundary crossing (if end time crosses to next day after timezone adjustment)
    const crossesDay = endHourServer + timezoneAdjustment >= 24;

    console.log(
      `Event ${event.event_name}: Server times ${startHourServer}:${startMinuteServer}-${endHourServer}:${endMinuteServer}`
    );
    console.log(
      `Converted to local with timezone adjustment ${timezoneAdjustment}: ${startHour}:${startMinute}-${endHour}:${endMinute}`
    );
    console.log(`Crosses day boundary: ${crossesDay}`);

    const startDays = event.start_days || [];
    const endDays = event.end_days || [];

    // Adjust end days if the event crosses midnight
    const adjustedEndDays = crossesDay
      ? endDays.map((day) => (day + 1) % 7)
      : endDays;

    // Check if today is a start day
    if (startDays.includes(currentDay)) {
      // If current time is before the event starts today
      if (currentTime < eventStartTime) {
        const nextStart = new Date(now);
        nextStart.setHours(startHour, startMinute, 0, 0);
        event.status = "upcoming";
        return nextStart;
      }

      // If event has started but not ended yet today
      if (currentTime >= eventStartTime && currentTime < eventEndTime) {
        const nextEnd = new Date(now);
        nextEnd.setHours(endHour, endMinute, 0, 0);
        event.status = "ongoing";
        return nextEnd;
      }

      // If event has ended today, find next start day
      if (currentTime >= eventEndTime) {
        const nextStartDayIndex = findNextStartDay(startDays, currentDay);
        const daysUntilNextStart =
          (startDays[nextStartDayIndex] - currentDay + 7) % 7 || 7;

        const nextStart = new Date(now);
        nextStart.setDate(now.getDate() + daysUntilNextStart);
        nextStart.setHours(startHour, startMinute, 0, 0);
        event.status = "upcoming";
        return nextStart;
      }
    }

    // Check if today is an end day (considering day boundary crossing)
    if (
      !startDays.includes(currentDay) &&
      adjustedEndDays.includes(currentDay)
    ) {
      // If current time is before the event ends today
      if (currentTime < eventEndTime) {
        const nextEnd = new Date(now);
        nextEnd.setHours(endHour, endMinute, 0, 0);
        event.status = "ongoing";
        return nextEnd;
      }

      // If event has ended today, find next start day
      if (currentTime >= eventEndTime) {
        const nextStartDayIndex = findNextStartDay(startDays, currentDay);
        const daysUntilNextStart =
          (startDays[nextStartDayIndex] - currentDay + 7) % 7 || 7;

        const nextStart = new Date(now);
        nextStart.setDate(now.getDate() + daysUntilNextStart);
        nextStart.setHours(startHour, startMinute, 0, 0);
        event.status = "upcoming";
        return nextStart;
      }
    }

    // If today is neither a start nor adjusted end day, find the next start day
    if (
      !startDays.includes(currentDay) &&
      !adjustedEndDays.includes(currentDay)
    ) {
      const nextStartDayIndex = findNextStartDay(startDays, currentDay);
      const daysUntilNextStart =
        (startDays[nextStartDayIndex] - currentDay + 7) % 7;

      const nextStart = new Date(now);
      nextStart.setDate(now.getDate() + daysUntilNextStart);
      nextStart.setHours(startHour, startMinute, 0, 0);
      event.status = "upcoming";
      return nextStart;
    }

    // Fallback case
    const fallback = new Date(now);
    fallback.setDate(now.getDate() + 1);
    fallback.setHours(startHour, startMinute, 0, 0);
    event.status = "upcoming";
    return fallback;

    // Helper function to find next start day
    function findNextStartDay(days: number[], currentDay: number): number {
      for (let i = 0; i < days.length; i++) {
        if (days[i] > currentDay) {
          return i;
        }
      }
      return 0;
    }
  }

  /**
   * Calculate the next weekly reset date
   * @param resetDay Day of week (0 = Sunday, 1 = Monday, etc.)
   */
  private calculateWeeklyReset(resetDay: number): Date {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Calculate days until next reset
    let daysUntilReset = (resetDay - currentDay + 7) % 7;

    // If today is the reset day but we've already passed reset time,
    // set the expiration to next week
    if (daysUntilReset === 0 && now.getHours() >= this.resetHour) {
      daysUntilReset = 7;
    }

    const nextReset = new Date();
    nextReset.setDate(now.getDate() + daysUntilReset);

    return nextReset;
  }

  /**
   * Calculate the next monthly reset date
   * @param resetDay Day of month (1-31)
   */
  private calculateMonthlyReset(resetDay: number): Date {
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let nextReset = new Date(currentYear, currentMonth, resetDay);

    // If we've already passed the reset day this month, move to next month
    if (
      currentDay > resetDay ||
      (currentDay === resetDay && now.getHours() >= this.resetHour)
    ) {
      nextReset.setMonth(currentMonth + 1);
    }

    // Handle month boundary cases (e.g., April 31 doesn't exist)
    const maxDaysInMonth = new Date(
      nextReset.getFullYear(),
      nextReset.getMonth() + 1,
      0
    ).getDate();
    if (resetDay > maxDaysInMonth) {
      nextReset.setDate(maxDaysInMonth);
    }

    return nextReset;
  }

  /**
   * Calculate expiration date for fixed duration events
   * @param startDateString ISO date string for start date
   * @param durationDays Number of days the event lasts
   */
  private calculateFixedDurationExpiry(
    startDateString: string,
    durationDays: number
  ): Date {
    // If start date is invalid, use today
    const startDate = startDateString ? new Date(startDateString) : new Date();
    if (isNaN(startDate.getTime())) {
      const fallback = new Date();
      fallback.setDate(fallback.getDate() + durationDays);
      return fallback;
    }

    const expiryDate = new Date(startDate);
    expiryDate.setDate(startDate.getDate() + durationDays);

    return expiryDate;
  }

  /**
   * Calculate the current cycle for fixed duration events based on their original start date
   * This ensures events maintain their specific start date pattern through cycles
   * @param startDateString ISO date string for original start date
   * @param durationDays Number of days the event lasts
   */
  private calculateFixedDurationCycle(
    startDateString: string,
    durationDays: number
  ): Date {
    const now = new Date();

    // If start date is invalid, fallback to standard behavior
    const originalStart = startDateString
      ? new Date(startDateString)
      : new Date();
    if (isNaN(originalStart.getTime())) {
      return this.calculateFixedDurationExpiry("", durationDays);
    }

    // If the original start date is in the future, use it as is
    if (originalStart > now) {
      const expiryDate = new Date(originalStart);
      expiryDate.setDate(originalStart.getDate() + durationDays);
      return expiryDate;
    }

    // Calculate how many cycles have passed since the original start date
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysSinceStart = Math.floor(
      (now.getTime() - originalStart.getTime()) / msPerDay
    );
    const cyclesPassed = Math.floor(daysSinceStart / durationDays);

    // Calculate the start of the current cycle
    const currentCycleStart = new Date(originalStart);
    currentCycleStart.setDate(
      originalStart.getDate() + cyclesPassed * durationDays
    );

    // Calculate the end of the current cycle
    const currentCycleEnd = new Date(currentCycleStart);
    currentCycleEnd.setDate(currentCycleStart.getDate() + durationDays);

    // If we're already in the current cycle but it's ending soon, return the end of the next cycle
    if (currentCycleEnd <= now) {
      const nextCycleEnd = new Date(currentCycleEnd);
      nextCycleEnd.setDate(currentCycleEnd.getDate() + durationDays);
      return nextCycleEnd;
    }

    return currentCycleEnd;
  }

  /**
   * Get all processed permanent events with calculated expiration dates
   */
  public getAllEvents(): ProcessedEvent[] {
    return this.processedEvents;
  }

  /**
   * Get events for a specific game
   */
  public getEventsByGame(gameName: string): ProcessedEvent[] {
    return this.processedEvents.filter(
      (event) => event.game_name.toLowerCase() === gameName.toLowerCase()
    );
  }

  /**
   * Get events of a specific reset type
   */
  public getEventsByType(resetType: ResetType): ProcessedEvent[] {
    return this.processedEvents.filter(
      (event) => event.reset_type === resetType
    );
  }

  /**
   * Get an event by ID
   */
  public getEventById(id: string): ProcessedEvent | undefined {
    return this.processedEvents.find((event) => event.id === id);
  }

  /**
   * Get events sorted by expiration date (soonest first)
   */
  public getSortedByExpiration(): ProcessedEvent[] {
    return [...this.processedEvents].sort((a, b) => {
      // If either event is "upcoming", treat its expire_date as infinitely far in the future
      const isUpcomingA = a.status === "upcoming";
      const isUpcomingB = b.status === "upcoming";
      if (isUpcomingA && !isUpcomingB) return 1;
      if (!isUpcomingA && isUpcomingB) return -1;
      if (isUpcomingA && isUpcomingB) return 0;
      // Otherwise, sort by expire_date
      const dateA = new Date(a.expire_date).getTime();
      const dateB = new Date(b.expire_date).getTime();
      return dateA - dateB;
    });
  }

  /**
   * Check for and refresh any expired events
   * Call this periodically (e.g., on app launch and when returning to foreground)
   */
  public refreshExpiredEvents(): boolean {
    const now = new Date();
    let hasExpired = false;

    // First check if any events have expired
    for (const processedEvent of this.processedEvents) {
      const expirationDate = new Date(processedEvent.expire_date);
      if (expirationDate <= now) {
        hasExpired = true;

        // No need to update start dates for fixed_duration events anymore
        // The calculateFixedDurationCycle will handle cycling through their durations
      }
    }

    if (hasExpired) {
      // Do a full recalculation of expiration dates
      this.updateExpirationDates();
      return true;
    }

    return false;
  }
}

// Create a singleton instance to be used throughout the app
const permanentEventsManager = new PermanentEventsManager();
export default permanentEventsManager;

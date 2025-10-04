import { weeklyEvents } from "./weeklyEvents";
import { monthlyEvents } from "./monthlyEvents";
import { fixedDurationEvents } from "./fixedDurationEvents";

// Define our own RegionType to match what's in RegionContext
type RegionType = "europe" | "northAmerica" | "asia";
type ResetType = "weekly" | "monthly" | "fixed_duration";

interface PermanentEvent {
  id: string;
  event_name: string;
  game_name: string;
  background: string;
  importance?: "main" | "sub";
  daily_login: boolean;
  reset_type: ResetType;
  reset_day?: number; // For weekly (0-6) and monthly (1-31) events
  start_date?: string; // For fixed duration events
  duration_days?: number; // For fixed duration events
  description?: string;
  expire_date?: string; // Will be calculated based on region settings
}

// Events ready to be displayed in PermanentEventCard
export interface ProcessedEvent {
  id: string;
  event_name: string;
  game_name: string;
  background: string;
  importance?: "main" | "sub";
  daily_login: boolean;
  reset_type: ResetType;
  reset_day?: number;
  duration_days?: number;
  description?: string;
  expire_date: string; // ISO date string for when the event expires/resets
  start_date?: string;
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
        // For fixed duration events, use the original start date to calculate cycles
        expireDate = this.calculateFixedDurationCycle(
          event.start_date || "",
          event.duration_days || 0
        );
      } else {
        // Default fallback to 7 days from now if something goes wrong
        expireDate = new Date();
        expireDate.setDate(now.getDate() + 7);
      }

      // Apply region-specific time (resetHour in the region's timezone)
      expireDate.setUTCHours(this.resetHour - this.utcOffset, 0, 0, 0);

      return {
        ...event,
        expire_date: expireDate.toISOString(),
      } as ProcessedEvent;
    });
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

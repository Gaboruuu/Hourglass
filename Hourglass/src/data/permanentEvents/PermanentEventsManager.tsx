import { weeklyEvents } from './weeklyEvents';
import { monthlyEvents } from './monthlyEvents';
import { fixedDurationEvents } from './fixedDurationEvents';

export class PermanentEventsManager {
  constructor() {
    this.events = [];
    this.region = 'europe'; // Default to Europe
    this.initializeEvents();
  }

  // Set the region for reset times
  setRegion(region) {
    this.region = region;
  }

  // Convert 4 AM CET to local timezone
  convertCETToLocal(targetDate) {
    // 4 AM CET is the standard reset time for all events
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const day = targetDate.getDate();
    
    // Create a date representing 4 AM CET
    // CET is UTC+1, so 4 AM CET = 3 AM UTC
    const cetResetTime = new Date();
    cetResetTime.setUTCFullYear(year, month, day);
    cetResetTime.setUTCHours(3, 0, 0, 0); // 3 AM UTC = 4 AM CET
    
    return cetResetTime; // JavaScript automatically converts to local timezone when displayed
  }

  initializeEvents() {
    // Combine all permanent event types
    this.events = [
      ...weeklyEvents,
      ...monthlyEvents,
      ...fixedDurationEvents,
    ];
  }

  // Calculate the next reset date for an event
  calculateNextResetDate(event) {
    if (event.reset_type === 'fixed_duration') {
      return this.calculateFixedDurationExpiry(event);
    }

    if (event.reset_type === 'weekly') {
      return this.calculateWeeklyReset(event.reset_day);
    } else if (event.reset_type === 'monthly') {
      return this.calculateMonthlyReset(event.reset_day);
    }

    return new Date();
  }

  calculateWeeklyReset(resetDay) {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Calculate days until next reset day
    let daysUntilReset = resetDay - currentDay;
    if (daysUntilReset <= 0) {
      daysUntilReset += 7; // Next week
    }

    // Create the target date for reset
    const resetDate = new Date(now);
    resetDate.setDate(now.getDate() + daysUntilReset);
    
    // Convert 4 AM CET to local time
    const localResetDate = this.convertCETToLocal(resetDate);

    // If it's today and the reset time hasn't passed yet, use today
    if (daysUntilReset === 0) {
      const todayResetDate = new Date(now);
      const todayLocalReset = this.convertCETToLocal(todayResetDate);
      
      if (now < todayLocalReset) {
        return todayLocalReset;
      }
      // If reset time has passed today, move to next week
      const nextWeekDate = new Date(resetDate);
      nextWeekDate.setDate(nextWeekDate.getDate() + 7);
      return this.convertCETToLocal(nextWeekDate);
    }

    return localResetDate;
  }

  calculateMonthlyReset(resetDay) {
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth(), resetDay);
    
    // Convert 4 AM CET to local time
    const localResetDate = this.convertCETToLocal(targetDate);

    // If reset date has passed this month, move to next month
    if (localResetDate <= now) {
      const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, resetDay);
      return this.convertCETToLocal(nextMonthDate);
    }

    return localResetDate;
  }

  calculateFixedDurationExpiry(event) {
    if (event.start_date) {
      // Event has a specific start date
      const startDate = new Date(event.start_date);
      const expireDate = new Date(startDate);
      expireDate.setDate(startDate.getDate() + event.duration_days);
      return expireDate;
    } else {
      // Event starts from now and runs for duration_days
      const now = new Date();
      const expireDate = new Date(now);
      expireDate.setDate(now.getDate() + event.duration_days);
      return expireDate;
    }
  }

  // Convert permanent events to the same format as database events
  getPermanentEventsAsEvents() {
    return this.events.map(event => {
      const expireDate = this.calculateNextResetDate(event);
      let startDate;

      if (event.reset_type === 'fixed_duration') {
        if (event.start_date) {
          startDate = new Date(event.start_date);
        } else {
          startDate = new Date();
        }
      } else {
        startDate = new Date(expireDate);
        const durationDays = event.reset_type === 'weekly' ? 7 : 
                           event.reset_type === 'monthly' ? this.getDaysInCurrentMonth() : 7;
        startDate.setDate(expireDate.getDate() - durationDays);
      }

      return {
        id: event.id,
        event_name: event.event_name,
        game_name: event.game_name,
        background: event.background,
        importance: event.importance,
        daily_login: event.daily_login,
        start_date: this.formatDate(startDate),
        expire_date: this.formatDate(expireDate),
        description: event.description,
        rewards: event.rewards,
        max_completions: event.max_completions,
        isPermanent: true, // Flag to distinguish from database events
        reset_type: event.reset_type,
        duration_days: event.duration_days,
        reset_info: {
          type: event.reset_type,
          day: event.reset_day,
          time: event.reset_time
        }
      };
    });
  }

  // Format date to include time for proper countdown calculation
  formatDate(date) {
    return date.toISOString(); // Full ISO string with time
  }

  // Helper method to get days in current month
  getDaysInCurrentMonth() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  }

  // Get time remaining until next reset (updates every minute)
  getTimeRemaining(expireDate) {
    const now = new Date();
    const target = new Date(expireDate);
    const diff = target - now;

    if (diff <= 0) {
      return "Expired";
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }
}

// Export a singleton instance
export const permanentEventsManager = new PermanentEventsManager();

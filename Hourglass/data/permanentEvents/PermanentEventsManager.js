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

  // Convert reset time to local timezone
  convertCETToLocal(targetDate, gameName = null) {
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const day = targetDate.getDate();
    
    // Create a date representing the reset time
    // CET is UTC+1
    const cetResetTime = new Date();
    cetResetTime.setUTCFullYear(year, month, day);
    
    // For Wuthering Waves, use 12 AM CET (11 PM UTC previous day)
    if (gameName === 'Wuthering Waves') {
      // 12 AM CET = 11 PM UTC (previous day)
      const previousDay = day - 1;
      cetResetTime.setUTCDate(previousDay);
      cetResetTime.setUTCHours(20, 0, 0, 0); // 8 PM UTC = 12 AM CET
    } else {
      // Standard 4 AM CET for other games (3 AM UTC)
      cetResetTime.setUTCHours(3, 0, 0, 0); // 3 AM UTC = 4 AM CET
    }
    
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
    const gameName = event.game_name;
    
    if (event.reset_type === 'fixed_duration') {
      return this.calculateFixedDurationExpiry(event);
    }

    if (event.reset_type === 'weekly') {
      return this.calculateWeeklyReset(event.reset_day, gameName);
    } else if (event.reset_type === 'monthly') {
      return this.calculateMonthlyReset(event.reset_day, gameName);
    }

    return new Date();
  }

  calculateWeeklyReset(resetDay, gameName) {
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
    
    // Convert reset time to local time
    const localResetDate = this.convertCETToLocal(resetDate, gameName);

    // If it's today and the reset time hasn't passed yet, use today
    if (daysUntilReset === 0) {
      const todayResetDate = new Date(now);
      const todayLocalReset = this.convertCETToLocal(todayResetDate, gameName);
      
      if (now < todayLocalReset) {
        return todayLocalReset;
      }
      // If reset time has passed today, move to next week
      const nextWeekDate = new Date(resetDate);
      nextWeekDate.setDate(nextWeekDate.getDate() + 7);
      return this.convertCETToLocal(nextWeekDate, gameName);
    }

    return localResetDate;
  }

  calculateMonthlyReset(resetDay, gameName) {
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth(), resetDay);
    
    // Convert reset time to local time
    const localResetDate = this.convertCETToLocal(targetDate, gameName);

    // If reset date has passed this month, move to next month
    if (localResetDate <= now) {
      const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, resetDay);
      return this.convertCETToLocal(nextMonthDate, gameName);
    }

    return localResetDate;
  }

  calculateFixedDurationExpiry(event) {
    const now = new Date();
    const gameName = event.game_name;
    
    if (event.start_date) {
      // Event has a specific start date
      let startDate = new Date(event.start_date);
      
      // Adjust the start date to use the correct reset time
      startDate = this.convertCETToLocal(startDate, gameName);
      
      let expireDate = new Date(startDate);
      expireDate.setDate(startDate.getDate() + event.duration_days);
      
      // If the current expiry date has passed, calculate the next cycle
      while (expireDate < now) {
        // Move to the next cycle
        startDate = new Date(expireDate);
        expireDate = new Date(startDate);
        expireDate.setDate(startDate.getDate() + event.duration_days);
      }
      
      return expireDate;
    } else {
      // Event starts from now and runs for duration_days
      const expireDate = new Date(now);
      expireDate.setDate(now.getDate() + event.duration_days);
      
      // Adjust the expiry date to use the correct reset time
      return this.convertCETToLocal(expireDate, gameName);
    }
  }

  // Convert permanent events to the same format as database events
  getPermanentEventsAsEvents() {
    return this.events.map(event => {
      const expireDate = this.calculateNextResetDate(event);
      let startDate;

      if (event.reset_type === 'fixed_duration') {
        if (event.start_date) {
          // Calculate the current cycle's start date
          const now = new Date();
          const gameName = event.game_name;
          
          // Start with the original start date but adjust for the game's reset time
          let cycleStartDate = new Date(event.start_date);
          cycleStartDate = this.convertCETToLocal(cycleStartDate, gameName);
          
          let cycleEndDate = new Date(cycleStartDate);
          cycleEndDate.setDate(cycleStartDate.getDate() + event.duration_days);
          
          // Find the current cycle
          while (cycleEndDate < now) {
            cycleStartDate = new Date(cycleEndDate);
            cycleEndDate = new Date(cycleStartDate);
            cycleEndDate.setDate(cycleStartDate.getDate() + event.duration_days);
          }
          
          startDate = cycleStartDate;
        } else {
          // For events starting now, use the game-specific reset time
          startDate = this.convertCETToLocal(new Date(), event.game_name);
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

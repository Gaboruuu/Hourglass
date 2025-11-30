/**
 * Unified logging utility for consistent console output
 * Format: [Location] Action: Details
 */

type LogLevel = "info" | "success" | "warning" | "error";

const LOG_ENABLED = __DEV__; // Only log in development

class Logger {
  private formatMessage(
    location: string,
    action: string,
    details?: any
  ): string {
    let message = `[${location}] ${action}`;
    if (details !== undefined) {
      if (typeof details === "object") {
        message += `: ${JSON.stringify(details)}`;
      } else {
        message += `: ${details}`;
      }
    }
    return message;
  }

  info(location: string, action: string, details?: any) {
    if (LOG_ENABLED) {
      console.log(this.formatMessage(location, action, details));
    }
  }

  success(location: string, action: string, details?: any) {
    if (LOG_ENABLED) {
      console.log(`✅ ${this.formatMessage(location, action, details)}`);
    }
  }

  warning(location: string, action: string, details?: any) {
    if (LOG_ENABLED) {
      console.warn(`⚠️ ${this.formatMessage(location, action, details)}`);
    }
  }

  error(location: string, action: string, error: any) {
    if (LOG_ENABLED) {
      console.error(
        `❌ ${this.formatMessage(location, action, error?.message || error)}`
      );
      if (error?.stack) {
        console.error(error.stack);
      }
    }
  }

  // For debug screen - always log regardless of environment
  debug(location: string, action: string, details?: any) {
    console.log(`🔍 ${this.formatMessage(location, action, details)}`);
  }
}

export const logger = new Logger();

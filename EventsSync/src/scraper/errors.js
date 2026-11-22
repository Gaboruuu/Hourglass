/**
 * Errors raised while scraping. Each one carries where it happened, so the report can say exactly
 * which page / section / row broke and which file is most likely the one to edit.
 *
 * context: { game, page, url, section, rowHtml }   (all optional)
 */

const ROW_HTML_LIMIT = 500;

class SourceError extends Error {
  constructor(message, context = {}) {
    super(message);
    this.name = this.constructor.name;
    this.context = { ...context };
    if (typeof this.context.rowHtml === "string" && this.context.rowHtml.length > ROW_HTML_LIMIT) {
      this.context.rowHtml = `${this.context.rowHtml.slice(0, ROW_HTML_LIMIT)}…`;
    }
  }

  /** Which file to look at first when this error shows up in a report */
  get fileHint() {
    return null;
  }
}

/** The source refused the request (bot protection, 403, 429, a challenge page) */
class SourceBlockedError extends SourceError {
  get fileHint() {
    return "src/scraper/source.js (User-Agent, delay) or wait for the next run";
  }
}

/** The page loaded but doesn't look as expected (heading renamed, table missing, row without a name) */
class SourceLayoutError extends SourceError {
  get fileHint() {
    const game = this.context.game;
    return game
      ? `src/scraper/games/${game}.js (heading/URL) or src/scraper/extract.js (row layout)`
      : "src/scraper/extract.js";
  }
}

/** A date text no rule understands. `text` is the exact input */
class SourceDateError extends SourceError {
  constructor(message, text, context = {}) {
    super(`${message}: "${text}"`, context);
    this.text = text;
  }

  get fileHint() {
    return "src/scraper/dates.js";
  }
}

module.exports = { SourceError, SourceBlockedError, SourceLayoutError, SourceDateError };

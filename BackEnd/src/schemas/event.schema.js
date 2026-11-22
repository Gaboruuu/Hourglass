const { z } = require("zod");

// "banner": gacha banners from EventsSync (shown on their own app screen, not the Events tab).
// events.event_type is varchar(10): a new type must stay ≤ 10 characters.
const EVENT_TYPES = ["main", "side", "banner"];

/** YYYY-MM-DD that is also a real calendar date (rejects 2026-02-30) */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a date as YYYY-MM-DD")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
  }, "Not a valid date");

const eventFields = {
  game_id: z.number().int().positive(),
  event_name: z.string().trim().min(1).max(255),
  start_date: isoDate,
  expiry_date: isoDate,
  event_type: z.enum(EVENT_TYPES),
  // The app sends a boolean, EventsSync sends 0/1: both are stored as 0/1
  daily_login: z
    .union([z.boolean(), z.literal(0), z.literal(1)])
    .transform((value) => (value ? 1 : 0)),
  background_url: z
    .string()
    .trim()
    .max(2048)
    .url()
    .refine((url) => url.startsWith("https://"), "Image URL must use https")
    .nullable(),
};

const startNotAfterExpiry = (event) =>
  !event.start_date || !event.expiry_date || event.start_date <= event.expiry_date;
const dateOrderIssue = { message: "start_date must be on or before expiry_date", path: ["expiry_date"] };

const createEventSchema = z
  .object({
    ...eventFields,
    daily_login: eventFields.daily_login.default(0),
    background_url: eventFields.background_url.optional().default(null),
  })
  .strict()
  .refine(startNotAfterExpiry, dateOrderIssue);

const updateEventSchema = z
  .object(eventFields)
  .partial()
  .strict()
  .refine((event) => Object.keys(event).length > 0, "Nothing to update")
  .refine(startNotAfterExpiry, dateOrderIssue);

// EventsSync sends its whole list; the cap keeps the generated SQL query bounded.
// The name is trimmed like on create, otherwise a name with surrounding spaces is stored trimmed
// but compared untrimmed, and would be reported as "new" (and inserted again) on every sync.
// The dedup key is game_id + event_name + start_date: two games can have an event with the same
// name and start date.
const batchCheckSchema = z
  .array(
    z
      .object({
        game_id: eventFields.game_id,
        event_name: z.string().trim().min(1).max(255),
        start_date: isoDate,
      })
      .passthrough(),
  )
  .max(1000);

/** The batch-check dedup key, shared by the route and its tests */
const eventKey = (event) => `${event.game_id}|${event.event_name}|${event.start_date}`;

module.exports = {
  EVENT_TYPES,
  createEventSchema,
  updateEventSchema,
  batchCheckSchema,
  eventKey,
  startNotAfterExpiry,
};

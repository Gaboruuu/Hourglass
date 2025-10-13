// Weekly recurring events that reset every Monday at 04:00 AM CET
export const weeklyEvents = [
  {
    event_id: "elysia_realm",
    event_name: "Elysia Realm",
    game_name: "Honkai Impact 3rd",
    event_type: "permanent",
    daily_login: false,
    description: "Permanent end game content that resets every week",
    background: "elysia_realm.png",
    reset_type: "weekly",
    reset_day: 1, // Monday = 1, Sunday = 0
  },
];

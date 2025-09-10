// Weekly recurring events that reset every Monday at 04:00 AM CET
export const weeklyEvents = [
  {
    id: 'elysia_realm',
    event_name: 'Elysia Realm',
    game_name: 'Honkai Impact 3rd',
    background: 'elysia_realm.png',
    importance: 'main',
    daily_login: false,
    reset_type: 'weekly',
    reset_day: 1, // Monday = 1, Sunday = 0
    description: 'Permanent end game content that resets every week'
  },
];

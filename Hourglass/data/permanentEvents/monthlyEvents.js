// Monthly recurring events that reset on specific days of the month at 04:00 AM CET
export const monthlyEvents = [
  {
    id: 'spiral_abyss',
    event_name: 'Spiral Abyss',
    game_name: 'Genshin Impact',
    background: 'spiral_abyss.png',
    importance: 'main',
    daily_login: false,
    reset_type: 'monthly',
    reset_day: 16, // 16th of each month
    description: 'Permanent end game content that resets every month'
  },
  {
    id: 'imaginarium_theater',
    event_name: 'Imaginarium Theater',
    game_name: 'Genshin Impact',
    background: 'imaginarium_theater.png',
    importance: 'main',
    daily_login: false,
    reset_type: 'monthly',
    reset_day: 1, // 1st of each month
    description: 'Permanent end game content that resets every month'
  }
  
];

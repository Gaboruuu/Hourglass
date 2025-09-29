// Fixed duration events that have a set number of days and don't follow weekly/monthly resets
export const fixedDurationEvents = [
  {
    id: "tower_of_adversity_hazard_zone",
    event_name: "Tower of Adversity",
    game_name: "Wuthering Waves",
    background: "tower_of_adversity.png",
    importance: "main",
    daily_login: false,
    reset_type: "fixed_duration",
    start_date: "2025-08-18",
    duration_days: 28,
    description: "Tower of Adversity Hazard Zone running for 28 days",
  },

  {
    id: "whispering_wastes",
    event_name: "Whispering Wastes",
    game_name: "Wuthering Waves",
    background: "whispering_wastes.png",
    importance: "main",
    daily_login: false,
    reset_type: "fixed_duration",
    start_date: "2025-09-01",
    duration_days: 28,
    description: "Whispering Wastes running for 28 days",
  },

  {
    id: "shiyu_defense",
    event_name: "Shiyu Defense",
    game_name: "Zenless Zone Zero",
    background: "shiyu_defense.png",
    importance: "main",
    daily_login: false,
    reset_type: "fixed_duration",
    start_date: "2025-09-18",
    duration_days: 14,
    description: "Shiyu Defense running for 14 days",
  },
];

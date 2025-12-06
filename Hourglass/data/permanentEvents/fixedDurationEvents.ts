// Fixed duration events that have a set number of days and don't follow weekly/monthly resets
export const fixedDurationEvents = [
  {
    event_id: "toa_wuwa",
    game_id: "tower_of_adversity_hazard_zone",
    event_name: "Tower of Adversity",
    game_name: "Wuthering Waves",
    background: "tower_of_adversity.png",
    daily_login: false,
    reset_type: "fixed",
    start_date: "2025-08-18",
    duration_days: 28,
    description: "Tower of Adversity Hazard Zone running for 28 days",
  },

  {
    event_id: "ww_wuwa",
    game_id: "whimpering_wastes",
    event_name: "Whimpering Wastes",
    game_name: "Wuthering Waves",
    background: "whimpering_wastes.png",
    daily_login: false,
    reset_type: "fixed",
    start_date: "2025-09-01",
    duration_days: 28,
    description: "Whimpering Wastes running for 28 days",
  },

  {
    event_id: "sd_zzz",
    game_id: "shiyu_defense",
    event_name: "Shiyu Defense",
    game_name: "Zenless Zone Zero",
    background: "shiyu_defense.png",
    daily_login: false,
    reset_type: "fixed",
    start_date: "2025-09-12",
    duration_days: 14,
    description: "Shiyu Defense running for 14 days",
  },
];

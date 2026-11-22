/**
 * Version release dates for all supported games
 * Used to convert version-based event dates to actual dates
 */
const versionDates = [
  { gameId: "1", versions: { "1.5": "2024-21-2", "1.6": "2021-07-01" } },
  {
    gameId: "2",
    versions: {
      "1.0": "2024-07-04", // Welcome to New Eridu (Launch)
      "1.1": "2024-08-14", // Undercover R&B
      "1.2": "2024-09-25", // Tour de Inferno
      "1.3": "2024-11-06", // Virtual Revenge
      "1.4": "2024-12-18", // A Storm of Falling Stars
      "1.5": "2025-01-22", // Astra-nomical Moment
      "1.6": "2025-03-12", // Among the Forgotten Ruins
      "1.7": "2025-04-23", // Bury Your Tears With the Past
      "2.0": "2025-06-06", // Where Clouds Embrace the Dawn
      "2.1": "2025-07-16", // The Impending Crash of Waves
      "2.2": "2025-09-03", // Do Not Go Gentle Into That Good Night
      "2.3": "2025-10-15", // Memories of Dreams Bygone
      "2.4": "2025-11-26", // On the Precipice of the Abyss
      "2.5": "2025-12-30", // To Be Fuel for the Night
      "2.6": "2026-02-06", // Encore for an Old Dream
      "2.7": "2026-03-24", // The Stars Lean Down to Play
    },
  },
  {
    gameId: "3",
    versions: {
      "1.0": "2023-04-26", // The Rail Unto the Stars (Launch)
      "1.1": "2023-06-07", // Galactic Roaming
      "1.2": "2023-07-19", // Even Immortality Ends
      "1.3": "2023-08-30", // Celestial Eyes Above Mortal Ruins
      "1.4": "2023-10-11", // Jolted Awake From a Winter Dream
      "1.5": "2023-11-15", // The Crepuscule Zone
      "1.6": "2023-12-27", // Crown of the Mundane and Divine
      "2.0": "2024-02-06", // If One Dreams At Midnight
      "2.1": "2024-03-27", // Into the Yawning Chasm
      "2.2": "2024-05-08", // Then Wake to Weep
      "2.3": "2024-06-19", // Farewell, Penacony
      "2.4": "2024-07-31", // Finest Duel Under the Pristine Blue
      "2.5": "2024-09-10", // Flying Aureus Shot to Lurid Skies
      "2.6": "2024-10-23", // Annals of Pinecany's Mappo Age
      "2.7": "2024-12-04", // Check the Sails, the Stars Guide Home
      "3.0": "2025-01-15", // The Eternal Holy City
      "3.1": "2025-02-26", // Echoes of the Abyss
      "3.2": "2025-04-09", // Shards of a Frozen Memory
      "3.3": "2025-05-21", // Whispers of the Ancient Aegis
      "3.4": "2025-07-02", // For the Sun is Set to Die (Fate/Stay Night Collab)
      "3.5": "2025-08-13", // Shadows Over the Parthenon
      "3.6": "2025-09-24", // The Last Oracle's Decree
      "3.7": "2025-11-05", // Requiem for the Fallen Gods
      "3.8": "2025-12-17", // Memories are the Prelude to Dreams
      "4.0": "2026-02-12", // The Celestial Citadel
    },
  },
];

module.exports = { versionDates };

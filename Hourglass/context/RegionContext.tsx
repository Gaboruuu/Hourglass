import React from "react";
import { createContext, useContext, useEffect, useState } from "react";

type RegionType = "europe" | "northAmerica" | "asia";

interface RegionConfig {
  utcOffset: number;
  resetHour: number;
}

interface RegionContextType {
  region: RegionType;
  setRegion: (region: RegionType) => void;
  getResetTimeForDate: (TargetDate: Date, gameSpecificOffset?: number) => Date;
  getUtcOffset: () => number;
  getRegionHour: () => number;
  regionConfig: RegionConfig;
  availableRegions: RegionType[];
}

const REGION_CONFIGS: Record<RegionType, RegionConfig> = {
  europe: { utcOffset: 1, resetHour: 4 },
  northAmerica: { utcOffset: -5, resetHour: 4 },
  asia: { utcOffset: 8, resetHour: 4 },
};

const RegionContext = createContext<RegionContextType | undefined>(undefined);

interface RegionProviderProps {
  children: React.ReactNode;
}

export const RegionProvider: React.FC<RegionProviderProps> = ({ children }) => {
  const [region, setRegion] = useState<RegionType>("europe");

  const getResetTimeForDate = (
    TargetDate: Date,
    gameSpecificOffset: number = 0
  ): Date => {
    const year = TargetDate.getFullYear();
    const month = TargetDate.getMonth();
    const day = TargetDate.getDate();

    const regionConfig = REGION_CONFIGS[region];

    // Create a reset time that considers the UTC offset of the region
    // For example:
    // - Europe (UTC+1): 4 AM local time = 3 AM UTC
    // - North America (UTC-5): 4 AM local time = 9 AM UTC
    // - Asia (UTC+8): 4 AM local time = 20 PM UTC (previous day)

    const resetTime = new Date(Date.UTC(year, month, day));

    // Calculate the reset hour in UTC time
    // By subtracting the region's UTC offset, we get the correct UTC time
    // for the reset in that region
    const resetHourUTC =
      regionConfig.resetHour - regionConfig.utcOffset + gameSpecificOffset;

    // Need to handle day changes if resetHourUTC goes negative or over 24
    if (resetHourUTC < 0) {
      // If UTC hour becomes negative, it's the previous day in UTC
      resetTime.setUTCDate(resetTime.getUTCDate() - 1);
      resetTime.setUTCHours(24 + resetHourUTC, 0, 0, 0);
    } else if (resetHourUTC >= 24) {
      // If UTC hour exceeds 24, it's the next day in UTC
      resetTime.setUTCDate(resetTime.getUTCDate() + 1);
      resetTime.setUTCHours(resetHourUTC - 24, 0, 0, 0);
    } else {
      resetTime.setUTCHours(resetHourUTC, 0, 0, 0);
    }

    return resetTime;
  };

  const getUtcOffset = (): number => {
    return REGION_CONFIGS[region].utcOffset;
  };

  const getRegionHour = (): number => {
    return REGION_CONFIGS[region].resetHour;
  };

  return (
    <RegionContext.Provider
      value={{
        region,
        setRegion,
        getResetTimeForDate,
        getUtcOffset,
        getRegionHour,
        regionConfig: REGION_CONFIGS[region],
        availableRegions: Object.keys(REGION_CONFIGS) as RegionType[],
      }}
    >
      {children}
    </RegionContext.Provider>
  );
};

export const useRegionContext = (): RegionContextType => {
  const context = useContext(RegionContext);
  if (context === undefined) {
    throw new Error("useRegionContext must be used within a RegionProvider");
  }
  return context;
};

export default RegionContext;

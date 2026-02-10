import { ApiEvent, ProcessedEvent, AnyEvent } from "@/data/EventInteface";
import React, { createContext, ReactNode, useEffect, useState } from "react";
import { useRegionContext } from "./RegionContext";
import EventsDataManager from "@/data/EventsDataManager";
import { logger } from "@/utils/logger";
import { is } from "cheerio/dist/commonjs/api/traversing";
import { FilterManager } from "@/data/FilterManager";

interface EventsContextType {
  apiEvents: ApiEvent[];
  permanentEvents: ProcessedEvent[];
  allEvents: AnyEvent[];
  games: string[];
  isLoading: boolean;
  refreshApiEvents: () => Promise<void>;
  forceRefresh: () => Promise<void>;
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

interface EventsProviderProps {
  children: ReactNode;
}

export const EventsProvider: React.FC<EventsProviderProps> = ({ children }) => {
  const [apiEvents, setApiEvents] = useState<ApiEvent[]>([]);
  const [permanentEvents, setPermanentEvents] = useState<ProcessedEvent[]>([]);
  const [games, setGames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const regionContext = useRegionContext();

  const updateStates = async () => {
    const allApiEvents = EventsDataManager.getApiEvents();
    const allPermanentEvents = EventsDataManager.getPermanentEvents();

    // Filter events based on user's selected games
    const filteredApiEvents = (await FilterManager.filterEventsByUserGames(
      allApiEvents,
    )) as ApiEvent[];
    const filteredPermanentEvents =
      (await FilterManager.filterEventsByUserGames(
        allPermanentEvents,
      )) as ProcessedEvent[];

    let games = await FilterManager.getUserSelectedGames();
    if (games.length === 0) {
      // If no games are selected, show all games from the events
      games = EventsDataManager.getGamesList();
    }

    setApiEvents(filteredApiEvents);
    setPermanentEvents(filteredPermanentEvents);
    setGames(games);
  };

  useEffect(() => {
    const initializeData = async () => {
      logger.info("EventsContext", "Initializing EventsDataManager...");
      setIsLoading(true);

      try {
        await EventsDataManager.initialize();
        await updateStates();
      } catch (error) {
        logger.error(
          "EventsContext",
          "Failed to initialize EventsDataManager",
          error,
        );
      } finally {
        setIsLoading(false);
        logger.info(
          "EventsContext",
          "EventsDataManager initialization complete",
        );
      }
    };

    initializeData();

    const unsubscribe = EventsDataManager.subscribe(() => {
      logger.info(
        "EventsContext",
        "EventsDataManager updated, refreshing states",
      );
      updateStates();
    });

    return () => {
      unsubscribe();
      EventsDataManager.stopRefreshInterval();
    };
  }, []);

  useEffect(() => {
    if (!isLoading && EventsDataManager.isReady()) {
      logger.info(
        "EventsContext",
        `Region changed to ${regionContext.region}, syncing EventsDataManager with new region`,
      );
      // Sync permanent events with new region
      EventsDataManager.syncWithRegion(regionContext);
      EventsDataManager.refreshApiEvents();
    }
  }, [regionContext.region, isLoading]);

  const refreshApiEvents = async () => {
    logger.info("EventsContext", "Manual refresh of API events triggered");
    await EventsDataManager.refreshApiEvents();
  };

  const forceRefresh = async () => {
    logger.info("EventsContext", "Force refresh of all events triggered");
    setIsLoading(true);
    await EventsDataManager.forceRefresh();
    updateStates();
    setIsLoading(false);
  };

  const value: EventsContextType = {
    apiEvents,
    permanentEvents,
    allEvents: EventsDataManager.getAllEvents(),
    games,
    isLoading,
    refreshApiEvents,
    forceRefresh,
  };

  return (
    <EventsContext.Provider value={value}>{children}</EventsContext.Provider>
  );
};

export const useEvents = () => {
  const context = React.useContext(EventsContext);
  if (!context) {
    throw new Error("useEvents must be used within an EventsProvider");
  }

  return context;
};

import React from "react";

interface Filter {
    serchQuery: string;
    filterBy: string;
    game: string;
    startDate: string;  
    endDate: string;    
    category: string;
    login: string;
    timeRemaining: string;
}

interface FilterContextType {
    filter: Filter;
    setFilter: React.Dispatch<React.SetStateAction<Filter>>;
    resetFilter: () => void;
}

const FilterContext = React.createContext<FilterContextType | undefined>(undefined);

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [filter, setFilter] = React.useState<Filter>({
        serchQuery: "",
        filterBy: "all",
        game: "all",
        startDate: "",
        endDate: "",
        category: "all",
        login: "",
        timeRemaining: "all"
    });

    const resetFilter = () => {
        setFilter({
            serchQuery: "",
            filterBy: "all",
            game: "all",
            startDate: "",
            endDate: "",
            category: "all",
            login: "",
            timeRemaining: "all"
        });
    };

    return (
        <FilterContext.Provider value={{ filter, setFilter, resetFilter }}>
            {children}
        </FilterContext.Provider>
    );
};

export const useFilterContext = () => {
    const context = React.useContext(FilterContext);
    if (context === undefined) {
        throw new Error("useFilterContext must be used within a FilterProvider");
    }
    return context;
};

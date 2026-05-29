import React, { createContext, useContext, useState, useCallback } from 'react';

// Create context
const DataRefreshContext = createContext(undefined);

function DataRefreshProvider({ children }) {
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const refreshData = useCallback(() => {
        setRefreshTrigger(prev => prev + 1);
    }, []);

    const value = {
        refreshTrigger,
        refreshData
    };

    return (
        <DataRefreshContext.Provider value={value}>
            {children}
        </DataRefreshContext.Provider>
    );
}

// Export robust hook
const useDataRefresh = () => {
    const context = useContext(DataRefreshContext);
    if (context === undefined) {
        throw new Error('useDataRefresh must be used within a DataRefreshProvider');
    }
    return context;
};

export { DataRefreshProvider, useDataRefresh, DataRefreshContext };
export default DataRefreshProvider;

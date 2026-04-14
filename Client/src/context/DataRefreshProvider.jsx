import React, { useState, useCallback } from 'react';
import { DataRefreshContext } from './DataRefreshContext';

export const DataRefreshProvider = ({ children }) => {
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const refreshData = useCallback(() => {
        setRefreshTrigger(prev => prev + 1);
    }, []);

    return (
        <DataRefreshContext.Provider value={{ refreshTrigger, refreshData }}>
            {children}
        </DataRefreshContext.Provider>
    );
};
import React from 'react';

const LoadingSpinner = ({ size = 'md', fullScreen = false }) => {
    const sizes = {
        sm: 'h-6 w-6',
        md: 'h-12 w-12',
        lg: 'h-16 w-16',
    };

    const spinner = (
        <div className="flex flex-col items-center justify-center space-y-4">
            <div className={`${sizes[size]} animate-spin rounded-full border-b-2 border-primary-400`}></div>
            <p className="text-white/60 text-sm animate-pulse">Loading...</p>
        </div>
    );

    if (fullScreen) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                {spinner}
            </div>
        );
    }

    return spinner;
};

export default LoadingSpinner;
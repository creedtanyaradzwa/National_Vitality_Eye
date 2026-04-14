import React from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

const PageHeader = ({ title, description, icon: Icon, onRefresh, refreshLabel }) => {
    return (
        <div className="mb-8 animate-slide-in">
            <div className="flex justify-between items-center">
                <div>
                    <div className="flex items-center space-x-3">
                        {Icon && (
                            <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center">
                                <Icon className="h-6 w-6 text-white" />
                            </div>
                        )}
                        <div>
                            <h1 className="text-3xl font-bold gradient-text-glow">
                                {title}
                            </h1>
                            {description && (
                                <p className="text-white/60 mt-1">{description}</p>
                            )}
                        </div>
                    </div>
                </div>
                {onRefresh && (
                    <button
                        onClick={onRefresh}
                        className="flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl hover:bg-white/20 transition-all duration-300"
                    >
                        <ArrowPathIcon className="h-4 w-4 text-white/70" />
                        <span className="text-sm text-white/70">{refreshLabel || 'Refresh'}</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default PageHeader;
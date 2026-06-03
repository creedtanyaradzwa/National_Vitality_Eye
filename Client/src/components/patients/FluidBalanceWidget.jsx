import React, { useState, useEffect } from 'react';
import { 
    BeakerIcon, 
    ArrowDownIcon, 
    ArrowUpIcon, 
    ClockIcon, 
    PlusIcon, 
    BoltIcon,
    ExclamationTriangleIcon,
    FireIcon
} from '@heroicons/react/24/outline';

const FluidBalanceWidget = ({ patientId, activeRecord, onUpdate }) => {
    const [intake, setIntake] = useState(0);
    const [output, setOutput] = useState(0);
    const [ivBag, setIvBag] = useState(activeRecord?.ivBag || {
        totalVolume: 1000,
        currentVolume: 1000,
        status: 'Completed',
        dripRate: 200 // ml/hr
    });
    
    // Calculate totals from existing observations
    useEffect(() => {
        if (activeRecord?.observations) {
            let totalIn = 0;
            let totalOut = 0;
            activeRecord.observations.forEach(obs => {
                if (obs.fluidBalance) {
                    totalIn += (obs.fluidBalance.intake || 0);
                    totalOut += (obs.fluidBalance.output || 0);
                }
            });
            setIntake(totalIn);
            setOutput(totalOut);
        }

        if (activeRecord?.ivBag) {
            setIvBag(activeRecord.ivBag);
        }
    }, [activeRecord]);

    // Live Simulation Logic (The Neural Fluid Engine)
    const [displayVolume, setLiveVolume] = useState(ivBag.currentVolume);
    const [timeLeft, setTimeLeft] = useState(null);

    useEffect(() => {
        let interval;
        
        const updateSimulation = () => {
            if (ivBag.status === 'Running' && ivBag.currentVolume > 0 && ivBag.dripRate > 0) {
                const startTime = new Date(ivBag.startTime || new Date());
                const now = new Date();
                const elapsedHours = (now - startTime) / (1000 * 60 * 60);
                const volumeConsumed = elapsedHours * ivBag.dripRate;
                
                const currentLiveVol = Math.max(0, Math.floor(ivBag.currentVolume - volumeConsumed));
                setLiveVolume(currentLiveVol);

                // Update Time Left
                if (currentLiveVol > 0) {
                    const minutesLeft = Math.floor((currentLiveVol / ivBag.dripRate) * 60);
                    setTimeLeft(minutesLeft);
                } else {
                    setTimeLeft(0);
                }
            } else {
                setLiveVolume(ivBag.currentVolume);
                setTimeLeft(null);
            }
        };

        // Initial run
        updateSimulation();
        
        // Run every 5 seconds for smooth UI but low overhead
        interval = setInterval(updateSimulation, 5000);
        
        return () => clearInterval(interval);
    }, [ivBag]);

    const formatTime = (minutes) => {
        if (minutes === null) return "--:--";
        if (minutes <= 0) return "EMPTY";
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hrs}h ${mins}m`;
    };

    const handleQuickAdd = async (type, amount) => {
        const newObs = {
            timestamp: new Date().toISOString(),
            fluidBalance: {
                intake: type === 'in' ? amount : 0,
                output: type === 'out' ? amount : 0,
                type: type === 'in' ? 'IV/Oral' : 'Loss'
            },
            notes: `Logged ${amount}ml ${type === 'in' ? 'intake' : 'output'}`
        };
        
        if (onUpdate) onUpdate(newObs);
    };

    const toggleIVStatus = async () => {
        console.log('[FluidBalanceWidget] toggleIVStatus called. Current status:', ivBag.status, 'Volume:', ivBag.currentVolume);
        
        let updatedBag;
        // If starting an empty or completed bag, refill it automatically
        if (ivBag.currentVolume <= 0 || ivBag.status === 'Completed' || ivBag.status === 'Empty') {
            console.log('[FluidBalanceWidget] Refilling empty/completed bag to 1000ml');
            updatedBag = { 
                ...ivBag, 
                status: 'Running', 
                currentVolume: 1000, 
                totalVolume: 1000,
                startTime: new Date().toISOString()
            };
        } else {
            const newStatus = ivBag.status === 'Running' ? 'Paused' : 'Running';
            updatedBag = { ...ivBag, status: newStatus };
        }
        
        console.log('[FluidBalanceWidget] Requesting update to status:', updatedBag.status);
        setIvBag(updatedBag); // Optimistic UI update
        
        if (onUpdate) {
            onUpdate({ 
                ivBag: updatedBag,
                notes: `IV status changed to ${updatedBag.status}${updatedBag.currentVolume === 1000 ? ' (New Bag Started)' : ''}`
            });
        } else {
            console.warn('[FluidBalanceWidget] onUpdate prop is missing!');
        }
    };

    const netBalance = intake - output;
    const isCrashing = output > (intake * 1.5); // Dangerous loss-to-intake ratio

    return (
        <div className="relative group">
            {/* Background Glow for Critical State */}
            {isCrashing && (
                <div className="absolute -inset-1 bg-red-500 rounded-[2.5rem] blur opacity-20 animate-pulse"></div>
            )}
            
            <div className="relative bg-brand-dark-950 border border-white/10 rounded-[2.5rem] p-8 overflow-hidden">
                <div className="flex flex-col lg:flex-row justify-between gap-8">
                    
                    {/* Left: Net Balance Display */}
                    <div className="flex-1 space-y-6">
                        <div className="flex items-center space-x-3">
                            <div className={`p-3 rounded-2xl ${isCrashing ? 'bg-red-500 text-white animate-bounce' : 'bg-cyber-blue/10 text-cyber-blue'}`}>
                                <BeakerIcon className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Fluid Balance Engine</h3>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em]">Real-Time Intake/Output Synthesis</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-brand-dark-900 border border-white/5 rounded-2xl p-4">
                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 flex items-center">
                                    <ArrowUpIcon className="h-3 w-3 mr-1 text-green-500" />
                                    Total Intake
                                </p>
                                <p className="text-2xl font-black text-white">{intake} <span className="text-[10px] text-gray-600 font-mono">ML</span></p>
                            </div>
                            <div className="bg-brand-dark-900 border border-white/5 rounded-2xl p-4">
                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 flex items-center">
                                    <ArrowDownIcon className="h-3 w-3 mr-1 text-red-500" />
                                    Total Output
                                </p>
                                <p className="text-2xl font-black text-white">{output} <span className="text-[10px] text-gray-600 font-mono">ML</span></p>
                            </div>
                        </div>

                        <div className={`p-6 rounded-2xl border-2 flex items-center justify-between transition-all duration-500 ${
                            netBalance < 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-cyber-blue/5 border-cyber-blue/20'
                        }`}>
                            <div>
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Net Hydration Status</p>
                                <p className={`text-3xl font-black tracking-tighter ${netBalance < 0 ? 'text-red-500' : 'text-cyber-blue'}`}>
                                    {netBalance > 0 ? '+' : ''}{netBalance} <span className="text-xs font-mono opacity-50">ML</span>
                                </p>
                            </div>
                            {isCrashing && (
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-red-500 uppercase animate-pulse">Critical Deficit</p>
                                    <p className="text-[8px] text-gray-400 uppercase mt-1">Loss rate outpaces recovery</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Middle: Quick Action Pad */}
                    <div className="flex-1 space-y-6">
                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Rapid-Fire Logging</h4>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <p className="text-[8px] font-black text-green-500/50 uppercase tracking-widest text-center">ORS / IV Intake</p>
                                <div className="flex flex-col gap-2">
                                    {[250, 500, 1000].map(vol => (
                                        <button 
                                            key={vol}
                                            onClick={() => handleQuickAdd('in', vol)}
                                            className="py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-black uppercase hover:bg-green-500 hover:text-white transition-all"
                                        >
                                            +{vol}ml
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[8px] font-black text-red-500/50 uppercase tracking-widest text-center">Loss (Diarrhea/Vomiting)</p>
                                <div className="flex flex-col gap-2">
                                    {[100, 250, 500].map(vol => (
                                        <button 
                                            key={vol}
                                            onClick={() => handleQuickAdd('out', vol)}
                                            className="py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all"
                                        >
                                            -{vol}ml
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: IV Countdown (The Life-Saver) */}
                    <div className="lg:w-80 bg-brand-dark-900/50 border border-white/5 rounded-3xl p-6 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center space-x-2">
                                    <BoltIcon className="h-4 w-4 text-cyber-purple" />
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Active IV Bag</span>
                                </div>
                                <button 
                                    onClick={toggleIVStatus}
                                    className={`px-2 py-0.5 rounded text-[8px] font-black uppercase transition-all ${
                                        ivBag.status === 'Running' 
                                            ? 'bg-cyber-blue/20 text-cyber-blue border border-cyber-blue/30' 
                                            : 'bg-gray-800 text-gray-500 border border-white/5 hover:text-white hover:bg-gray-700'
                                    }`}
                                >
                                    {ivBag.status === 'Running' ? 'PAUSE' : 'START'}
                                </button>
                            </div>

                            <div className="relative h-4 w-full bg-white/5 rounded-full overflow-hidden mb-4">
                                <div 
                                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyber-blue to-cyber-purple transition-all duration-1000"
                                    style={{ width: `${(displayVolume / ivBag.totalVolume) * 100}%` }}
                                />
                            </div>

                            <div className="flex justify-between items-end mb-8">
                                <div>
                                    <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Remaining</p>
                                    <p className="text-xl font-black text-white">{displayVolume} <span className="text-[10px] opacity-40">ml</span></p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Prescribed Rate</p>
                                    <p className="text-xs font-black text-cyber-blue">{ivBag.dripRate} ml/hr</p>
                                </div>
                            </div>
                        </div>

                        <div className={`p-4 rounded-2xl text-center space-y-1 ${timeLeft < 30 ? 'bg-red-500/20 animate-pulse border border-red-500/30' : 'bg-white/5'}`}>
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Exhaustion Projection</p>
                            <div className="flex items-center justify-center space-x-2">
                                <ClockIcon className={`h-5 w-5 ${timeLeft < 30 ? 'text-red-500' : 'text-cyber-purple'}`} />
                                <p className={`text-2xl font-black tracking-tighter ${timeLeft < 30 ? 'text-red-500' : 'text-white'}`}>
                                    {formatTime(timeLeft)}
                                </p>
                            </div>
                            <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">Until Bag Replacement</p>
                        </div>
                    </div>

                </div>

                {/* Footer Warnings */}
                {isCrashing && (
                    <div className="mt-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center space-x-4">
                        <ExclamationTriangleIcon className="h-6 w-6 text-red-500 animate-pulse" />
                        <div>
                            <p className="text-xs font-black text-white uppercase">Critical Dehydration Warning</p>
                            <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest">Patient output exceeds intake by &gt;150%. Notify physician immediately.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FluidBalanceWidget;

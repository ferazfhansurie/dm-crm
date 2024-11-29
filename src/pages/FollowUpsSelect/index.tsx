import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/Base/Button';

const SelectFollowUpMode: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
            <div className="flex-grow flex items-center justify-center">
                <div className="max-w-4xl w-full mx-auto p-8">
                    <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">
                        Select Follow-Up System
                    </h1>
                    
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Template Mode Card */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                            <div className="p-6">
                                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                                    Tag Mode
                                </h2>
                                <p className="text-gray-600 dark:text-gray-300 mb-6">
                                    Create and manage follow-up templates with multiple messages, 
                                    specific timing, and advanced features for automated customer engagement.
                                </p>
                                <Button 
                                    onClick={() => navigate('/users-layout-2/follow-ups')}
                                    className="w-full bg-primary hover:bg-primary-dark"
                                >
                                    Use Tag Mode
                                </Button>
                            </div>
                        </div>

                        {/* Legacy Mode Card */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                            <div className="p-6">
                                <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                                    Timing Mode
                                </h2>
                                <p className="text-gray-600 dark:text-gray-300 mb-6">
                                    Use the classic follow-up system with simple, sequential messages 
                                    and basic timing controls.
                                </p>
                                <Button 
                                    onClick={() => navigate('/users-layout-2/follow-ups-old')}
                                    className="w-full bg-gray-500 hover:bg-gray-600"
                                >
                                    Use Timing Mode
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SelectFollowUpMode;
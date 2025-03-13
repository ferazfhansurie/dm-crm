import React from 'react';
import { FormLabel, FormInput } from "@/components/Base/Form";
import Lucide from "@/components/Base/Lucide";
import KeywordSourceSelector from './KeywordSourceSelector';

interface VoiceResponseFormProps {
    selectedAudioUrls: string[];
    onAudioSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onAudioRemove: (index: number) => void;
    keywordSource: 'user' | 'bot' | 'own';
    onKeywordSourceChange: (source: 'user' | 'bot' | 'own') => void;
}

const VoiceResponseForm: React.FC<VoiceResponseFormProps> = ({
    selectedAudioUrls,
    onAudioSelect,
    onAudioRemove,
    keywordSource,
    onKeywordSourceChange
}) => {
    return (
        <div className="mb-4">
            <KeywordSourceSelector 
                keywordSource={keywordSource}
                onKeywordSourceChange={onKeywordSourceChange}
            />

            <FormLabel className="dark:text-slate-200">Audio Files</FormLabel>
            <div className="border-2 border-dashed dark:border-darkmode-400 rounded-md pt-4">
                <div className="px-4 pb-4">
                    {selectedAudioUrls.map((url, index) => (
                        <div key={index} className="mb-3 flex items-center justify-between">
                            <audio 
                                controls
                                className="w-full"
                                preload="auto"
                            >
                                <source src={url} type="audio/mpeg" />
                                Your browser does not support the audio element.
                            </audio>
                            <button
                                className="ml-2 bg-danger text-white rounded-full p-1"
                                onClick={() => onAudioRemove(index)}
                            >
                                <Lucide icon="X" className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
                <div className="px-4 pb-4 flex items-center cursor-pointer relative">
                    <Lucide icon="Music" className="w-4 h-4 mr-2 dark:text-slate-200" />
                    <span className="text-primary mr-1 dark:text-slate-200">Upload audios</span>
                    <FormInput
                        type="file"
                        accept="audio/*"
                        multiple
                        className="w-full h-full top-0 left-0 absolute opacity-0"
                        onChange={onAudioSelect}
                    />
                </div>
            </div>
        </div>
    );
};

export default VoiceResponseForm; 
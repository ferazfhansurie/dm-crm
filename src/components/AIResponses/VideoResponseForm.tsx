import React from 'react';
import { FormLabel, FormInput } from "@/components/Base/Form";
import Lucide from "@/components/Base/Lucide";
import KeywordSourceSelector from './KeywordSourceSelector';

interface VideoResponseFormProps {
    selectedVideoUrls: string[];
    onVideoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onVideoRemove: (index: number) => void;
    keywordSource: 'user' | 'bot' | 'own';
    onKeywordSourceChange: (source: 'user' | 'bot' | 'own') => void;
}

const VideoResponseForm: React.FC<VideoResponseFormProps> = ({
    selectedVideoUrls,
    onVideoSelect,
    onVideoRemove,
    keywordSource,
    onKeywordSourceChange
}) => {
    return (
        <div className="mb-4">
            <KeywordSourceSelector 
                keywordSource={keywordSource}
                onKeywordSourceChange={onKeywordSourceChange}
            />

            <FormLabel className="dark:text-slate-200">Video Files</FormLabel>
            <div className="border-2 border-dashed dark:border-darkmode-400 rounded-md pt-4">
                <div className="px-4 pb-4">
                    {selectedVideoUrls.map((url, index) => (
                        <div key={index} className="mb-3 flex items-center justify-between">
                            <video 
                                controls
                                className="w-full max-h-[200px]"
                                preload="metadata"
                            >
                                <source src={url} type="video/mp4" />
                                Your browser does not support the video element.
                            </video>
                            <button
                                className="ml-2 bg-danger text-white rounded-full p-1"
                                onClick={() => onVideoRemove(index)}
                            >
                                <Lucide icon="X" className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
                <div className="px-4 pb-4 flex items-center cursor-pointer relative">
                    <Lucide icon="Video" className="w-4 h-4 mr-2 dark:text-slate-200" />
                    <span className="text-primary mr-1 dark:text-slate-200">Upload videos</span>
                    <FormInput
                        type="file"
                        accept="video/*"
                        multiple
                        className="w-full h-full top-0 left-0 absolute opacity-0"
                        onChange={onVideoSelect}
                    />
                </div>
            </div>
            <div className="mt-2 text-slate-500 text-sm">
                {selectedVideoUrls.length} videos selected
            </div>
        </div>
    );
};

export default VideoResponseForm; 
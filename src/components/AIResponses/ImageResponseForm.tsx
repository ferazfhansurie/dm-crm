import React from 'react';
import { FormLabel, FormInput } from "@/components/Base/Form";
import Lucide from "@/components/Base/Lucide";
import KeywordSourceSelector from './KeywordSourceSelector';

interface ImageResponseFormProps {
    selectedImageUrls: string[];
    onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onImageRemove: (index: number) => void;
    keywordSource: 'user' | 'bot' | 'own';
    onKeywordSourceChange: (source: 'user' | 'bot' | 'own') => void;
}

const ImageResponseForm: React.FC<ImageResponseFormProps> = ({ 
    selectedImageUrls, 
    onImageSelect, 
    onImageRemove,
    keywordSource,
    onKeywordSourceChange
}) => {
    return (
        <div className="mb-4">
            <KeywordSourceSelector 
                keywordSource={keywordSource}
                onKeywordSourceChange={onKeywordSourceChange}
            />
            <FormLabel className="dark:text-slate-200">Images</FormLabel>
            <div className="border-2 border-dashed dark:border-darkmode-400 rounded-md pt-4">
                <div className="flex flex-wrap px-4">
                    {selectedImageUrls.map((url, index) => (
                        <div key={index} className="w-24 h-24 relative image-fit mb-5 mr-5">
                            <img className="rounded-md" src={url} alt={`Preview ${index + 1}`} />
                            <button
                                className="absolute top-0 right-0 bg-danger text-white rounded-full p-1"
                                onClick={() => onImageRemove(index)}
                            >
                                <Lucide icon="X" className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
                <div className="px-4 pb-4 flex items-center cursor-pointer relative">
                    <Lucide icon="Image" className="w-4 h-4 mr-2 dark:text-slate-200" />
                    <span className="text-primary mr-1 dark:text-slate-200">Upload images</span>
                    <FormInput
                        type="file"
                        accept="image/*"
                        multiple
                        className="w-full h-full top-0 left-0 absolute opacity-0"
                        onChange={onImageSelect}
                    />
                </div>
            </div>
        </div>
    );
};

export default ImageResponseForm; 
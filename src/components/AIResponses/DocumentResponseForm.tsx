import React from 'react';
import { FormLabel, FormInput } from "@/components/Base/Form";
import Lucide from "@/components/Base/Lucide";
import KeywordSourceSelector from './KeywordSourceSelector';

interface DocumentResponseFormProps {
    selectedDocUrls: string[];
    onDocumentSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDocumentRemove: (index: number) => void;
    keywordSource: 'user' | 'bot' | 'own';
    onKeywordSourceChange: (source: 'user' | 'bot' | 'own') => void;
}

const DocumentResponseForm: React.FC<DocumentResponseFormProps> = ({
    selectedDocUrls,
    onDocumentSelect,
    onDocumentRemove,
    keywordSource,
    onKeywordSourceChange
}) => {
    return (
        <div className="mb-4">
            <KeywordSourceSelector 
                keywordSource={keywordSource}
                onKeywordSourceChange={onKeywordSourceChange}
            />

            <FormLabel className="dark:text-slate-200">Documents</FormLabel>
            <div className="border-2 border-dashed dark:border-darkmode-400 rounded-md pt-4">
                <div className="px-4 pb-4">
                    {selectedDocUrls.map((url, index) => (
                        <div key={index} className="mb-3 flex items-center justify-between">
                            <div className="flex items-center">
                                <Lucide icon="FileText" className="w-4 h-4 mr-2" />
                                <span className="truncate max-w-xs">Document {index + 1}</span>
                            </div>
                            <button
                                className="ml-2 bg-danger text-white rounded-full p-1"
                                onClick={() => onDocumentRemove(index)}
                            >
                                <Lucide icon="X" className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
                <div className="px-4 pb-4 flex items-center cursor-pointer relative">
                    <Lucide icon="File" className="w-4 h-4 mr-2 dark:text-slate-200" />
                    <span className="text-primary mr-1 dark:text-slate-200">Upload documents</span>
                    <FormInput
                        type="file"
                        accept=".pdf,.doc,.docx"
                        multiple
                        className="w-full h-full top-0 left-0 absolute opacity-0"
                        onChange={onDocumentSelect}
                    />
                </div>
            </div>
        </div>
    );
};

export default DocumentResponseForm; 
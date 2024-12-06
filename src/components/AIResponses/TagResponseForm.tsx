import React from 'react';
import { FormLabel } from "@/components/Base/Form";
import clsx from "clsx";

interface TagResponseFormProps {
    availableTags: Array<{ id: string; name: string; }>;
    selectedTags: string[];
    onTagSelection: (tagId: string) => void;
}

const TagResponseForm: React.FC<TagResponseFormProps> = ({ availableTags, selectedTags, onTagSelection }) => {
    return (
        <div className="mb-4">
            <FormLabel className="dark:text-slate-200">Select Tags</FormLabel>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto p-4 border rounded-lg dark:border-darkmode-400">
                {availableTags.map((tag) => (
                    <div 
                        key={tag.id}
                        className={clsx(
                            "flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors",
                            "hover:bg-slate-100 dark:hover:bg-darkmode-400",
                            selectedTags.includes(tag.id) && "bg-slate-100 dark:bg-darkmode-400"
                        )}
                        onClick={() => onTagSelection(tag.id)}
                    >
                        <input
                            type="checkbox"
                            checked={selectedTags.includes(tag.id)}
                            onChange={() => onTagSelection(tag.id)}
                            className="form-checkbox h-5 w-5 text-primary border-slate-300 rounded 
                                     dark:border-darkmode-400 dark:bg-darkmode-800"
                        />
                        <span className="dark:text-slate-200">{tag.name}</span>
                    </div>
                ))}
            </div>
            <div className="mt-2 text-slate-500 text-sm">
                {selectedTags.length} tags selected
            </div>
        </div>
    );
};

export default TagResponseForm; 
import React from 'react';
import { FormLabel } from "@/components/Base/Form";
import clsx from "clsx";
import KeywordSourceSelector from './KeywordSourceSelector';

interface Employee {
    id: string;
    name: string;
    email: string;
    role?: string;
}

interface AssignResponseFormProps {
    employees: Employee[];
    selectedEmployees: string[];
    onEmployeeSelection: (employeeId: string) => void;
    keywordSource: 'user' | 'bot' | 'own';
    onKeywordSourceChange: (source: 'user' | 'bot' | 'own') => void;
}

const AssignResponseForm: React.FC<AssignResponseFormProps> = ({ 
    employees, 
    selectedEmployees, 
    onEmployeeSelection, 
    keywordSource, 
    onKeywordSourceChange 
}) => {
    return (
        <div className="mb-4">
            <KeywordSourceSelector 
                keywordSource={keywordSource}
                onKeywordSourceChange={onKeywordSourceChange}
            />

            <FormLabel className="dark:text-slate-200">Select Employees to Assign</FormLabel>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto p-4 border rounded-lg dark:border-darkmode-400">
                {employees.map((employee) => (
                    <div 
                        key={employee.id}
                        className={clsx(
                            "flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors",
                            "hover:bg-slate-100 dark:hover:bg-darkmode-400",
                            selectedEmployees.includes(employee.id) && "bg-slate-100 dark:bg-darkmode-400"
                        )}
                        onClick={() => onEmployeeSelection(employee.id)}
                    >
                        <input
                            type="checkbox"
                            checked={selectedEmployees.includes(employee.id)}
                            onChange={() => onEmployeeSelection(employee.id)}
                            className="form-checkbox h-5 w-5 text-primary border-slate-300 rounded 
                                     dark:border-darkmode-400 dark:bg-darkmode-800"
                        />
                        <div className="flex flex-col">
                            <span className="dark:text-slate-200">{employee.name}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">{employee.email}</span>
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-2 text-slate-500 text-sm">
                {selectedEmployees.length} employees selected
            </div>
        </div>
    );
};

export default AssignResponseForm; 
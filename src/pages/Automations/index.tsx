import React, { useState } from 'react';
import Lucide from "@/components/Base/Lucide";

interface Folder {
  id: string;
  name: string;
  workflows: Workflow[];
}

interface Workflow {
  id: string;
  name: string;
}

const Automations: React.FC = () => {
  // Hardcoded folders
  const hardcodedFolders: Folder[] = [
    { id: '1', name: 'Follow Ups', workflows: [{ id: '101', name: 'Workflow 1.1' }] },
    { id: '2', name: 'Tags', workflows: [{ id: '201', name: 'Workflow 2.1' }] },
    { id: '3', name: 'Folder 3', workflows: [] },
  ];

  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);



  const addWorkflow = (folderId: string) => {
    const workflowName = prompt('Enter workflow name:');
    if (workflowName) {
      const updatedFolders = hardcodedFolders.map(folder => {
        if (folder.id === folderId) {
          return {
            ...folder,
            workflows: [...folder.workflows, { id: Date.now().toString(), name: workflowName }],
          };
        }
        return folder;
      });
      // Note: This won't actually update the hardcoded folders
      console.log('New workflow added:', updatedFolders);
    }
  };

  return (
    <div className="p-5">
      <h2 className="text-2xl font-bold mb-5">Automations</h2>
      <div className="flex">
        <div className="w-1/3 pr-4">

        
          <ul>
            {hardcodedFolders.map(folder => (
              <li
                key={folder.id}
                className={`cursor-pointer p-2 rounded ${
                  selectedFolder?.id === folder.id ? 'bg-gray-200' : ''
                }`}
                onClick={() => setSelectedFolder(folder)}
              >
                {folder.name}
              </li>
            ))}
          </ul>
        </div>
        <div className="w-2/3 pl-4 border-l">
          <h3 className="text-xl font-semibold mb-3">Workflows</h3>
          {selectedFolder && (
            <>
              <button
                onClick={() => addWorkflow(selectedFolder.id)}
                className="mb-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Add Workflow
              </button>
              <ul>
                {selectedFolder.workflows.map(workflow => (
                  <li key={workflow.id} className="flex items-center mb-2">
                    <Lucide icon="FileText" className="mr-2" />
                    {workflow.name}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Automations;

import React, { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, doc, getDoc, getDocs, query, where, orderBy } from "firebase/firestore";
import Button from "@/components/Base/Button";
import { FormInput, FormSelect } from "@/components/Base/Form";
import Lucide from "@/components/Base/Lucide";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import LoadingIcon from "@/components/Base/LoadingIcon";
import Table from "@/components/Base/Table";
import { Menu, Dialog } from "@/components/Base/Headless";

interface CollectionData {
  [key: string]: any;
}

function Main() {
  const [collections] = useState<string[]>([
    'companies',
    'message',
    'setting',
    'user'
  ]);
  const [selectedCollection, setSelectedCollection] = useState<string>("");
  const [documents, setDocuments] = useState<CollectionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [columns, setColumns] = useState<string[]>([]);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    const defaultColumns = new Set(['id', 'email', 'role', 'verified',]);
    if (selectedCollection === 'companies') {
      defaultColumns.add('name');
    }
    return defaultColumns;
  });
  const [showExtendedAttributes, setShowExtendedAttributes] = useState(false);
  const [currentPath, setCurrentPath] = useState<string[]>([]);

  const [availableSubCollections] = useState<string[]>([
    'aiImageResponses',
    'assignedContacts',
    'assignmentNotifications',
    'contacts',
    'customers',
    'employee',
    'followUpMessages',
    'followUpTemplates',
    'followUps',
    'messages',
    'notifications',
    'packages',
    'quickReplies',
    'scheduledMessages',
    'tags',
    'usage'
  ]);

  const [isSubCollectionsOpen, setIsSubCollectionsOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const firestore = getFirestore();

  const fetchDocuments = async (collectionName: string) => {
    setLoading(true);
    try {
      let collectionRef;
      
      if (currentPath.length >= 2) {
        // We're in a subcollection
        const [parentCollection, docId] = currentPath;
        collectionRef = collection(firestore, parentCollection, docId, collectionName);
      } else {
        // We're in a root collection
        collectionRef = collection(firestore, collectionName);
      }

      console.log('Fetching from path:', collectionRef.path);

      const snapshot = await getDocs(collectionRef);
      const docs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          updatedAt: data.updatedAt?.toDate?.() ? data.updatedAt.toDate().toLocaleString() : data.updatedAt || '',
          lastLoginAt: data.lastLoginAt?.toDate?.() ? data.lastLoginAt.toDate().toLocaleString() : data.lastLoginAt || '',
          createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toLocaleString() : data.createdAt || '',
        };
      });

      console.log('Fetched documents:', docs);

      const allColumns = new Set<string>();
      allColumns.add('id');
      docs.forEach(doc => {
        Object.keys(doc).forEach(key => allColumns.add(key));
      });
      setColumns(Array.from(allColumns));
      setDocuments(docs);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to fetch documents");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedCollection && currentPath) {
      console.log('Path or collection changed:', {
        currentPath,
        selectedCollection
      });
      fetchDocuments(selectedCollection);
    }
  }, [selectedCollection, currentPath.join('/')]);

  const handleNavigateToSubCollection = async (docId: string, subCollectionName: string) => {
    console.log('Navigating to subcollection:', {
      docId,
      subCollectionName,
      currentCollection: selectedCollection
    });

    try {
      // First, verify the subcollection exists
      const docRef = doc(firestore, selectedCollection, docId);
      const subCollectionRef = collection(docRef, subCollectionName);
      const subCollectionSnapshot = await getDocs(subCollectionRef);

      if (!subCollectionSnapshot.empty) {
        // Update the path and collection
        setCurrentPath([selectedCollection, docId]);
        setSelectedCollection(subCollectionName);
        setIsSubCollectionsOpen(false); // Close the modal
        
        console.log('Navigation successful, new path:', {
          path: [selectedCollection, docId],
          newCollection: subCollectionName
        });
      } else {
        toast.info(`No documents found in ${subCollectionName}`);
      }
    } catch (error) {
      console.error('Error navigating to subcollection:', error);
      toast.error('Failed to access subcollection');
    }
  };

  const handleBack = () => {
    const newPath = currentPath.slice(0, -2); // Remove last two segments (docId and subcollection)
    setCurrentPath(newPath);
    if (newPath.length === 0) {
      setSelectedCollection(collections[0]);
    } else {
      setSelectedCollection(newPath[newPath.length - 1]);
    }
  };

  const filteredDocuments = documents.filter(doc => 
    JSON.stringify(doc).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDocuments = filteredDocuments.slice(startIndex, endIndex);

  const renderActionButtons = (doc: CollectionData) => (
    <div className="flex items-center justify-end space-x-2">
      <Button 
        variant="primary" 
        size="sm"
        className="px-2 py-1"
        onClick={() => {
          setSelectedDocId(doc.id);
          setIsSubCollectionsOpen(true);
        }}
      >
        <Lucide icon="Folder" className="w-4 h-4" />
      </Button>

      <Button 
        variant="primary" 
        size="sm"
        className="px-2 py-1"
      >
        <Lucide icon="Pencil" className="w-4 h-4" />
      </Button>
      <Button 
        variant="danger" 
        size="sm"
        className="px-2 py-1"
      >
        <Lucide icon="Trash" className="w-4 h-4" />
      </Button>

      {/* SubCollections Modal */}
      <Dialog
        open={isSubCollectionsOpen}
        onClose={() => {
          setIsSubCollectionsOpen(false);
          setSelectedDocId(null);
        }}
      >
        <Dialog.Panel>
          <Dialog.Title className="mb-5">
            <h2 className="text-lg font-medium mr-auto">
              Subcollections for Document {selectedDocId}
            </h2>
          </Dialog.Title>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {availableSubCollections.map((subCol) => (
              <Button
                key={subCol}
                variant="outline-secondary"
                className="w-full p-3 flex items-center justify-start space-x-2"
                onClick={() => {
                  if (selectedDocId) {
                    handleNavigateToSubCollection(selectedDocId, subCol);
                    setIsSubCollectionsOpen(false);
                  }
                }}
              >
                <Lucide icon="Folder" className="w-5 h-5" />
                <span className="text-left">{subCol}</span>
              </Button>
            ))}
          </div>
          <div className="text-right mt-5">
            <Button
              variant="outline-secondary"
              type="button"
              onClick={() => setIsSubCollectionsOpen(false)}
              className="w-24"
            >
              Close
            </Button>
          </div>
        </Dialog.Panel>
      </Dialog>
    </div>
  );

  return (
    <>
      <div className="flex flex-col h-screen">
        <div className="flex-grow p-5">
          {currentPath.length > 0 && (
            <div className="mb-4 flex items-center text-sm">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={handleBack}
              >
                <Lucide icon="ChevronLeft" className="w-4 h-4 mr-2" />
                Back
              </Button>
              <span className="ml-2 text-gray-600">
                {`${currentPath.join(' / ')}${selectedCollection ? ` / ${selectedCollection}` : ''}`}
              </span>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <FormSelect
              className="w-full md:w-56"
              value={selectedCollection}
              onChange={(e) => setSelectedCollection(e.target.value)}
            >
              <option value="">Select Collection</option>
              {collections.map(collection => (
                <option key={collection} value={collection}>{collection}</option>
              ))}
            </FormSelect>

            <div className="relative">
              <Button
                variant="outline-secondary"
                onClick={() => setShowExtendedAttributes(!showExtendedAttributes)}
              >
                <Lucide icon="Settings" className="w-4 h-4 mr-2" />
                Extended Attributes
              </Button>

              {showExtendedAttributes && (
                <div className="absolute z-50 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                  <div className="p-4">
                    <div className="font-medium mb-2">Select Columns</div>
                    <div className="max-h-[300px] overflow-y-auto">
                      {columns.map((column) => (
                        <label key={column} className="flex items-center mb-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="form-checkbox"
                            checked={visibleColumns.has(column)}
                            onChange={() => {
                              const newVisibleColumns = new Set(visibleColumns);
                              if (newVisibleColumns.has(column)) {
                                newVisibleColumns.delete(column);
                              } else {
                                newVisibleColumns.add(column);
                              }
                              setVisibleColumns(newVisibleColumns);
                            }}
                          />
                          <span className="ml-2">{column}</span>
                        </label>
                      ))}
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => setShowExtendedAttributes(false)}
                    >
                      Update
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="relative flex-grow">
              <FormInput
                type="text"
                className="w-full"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <Lucide icon="Search" className="w-5 h-5 text-gray-500" />
              </div>
            </div>
          </div>

          <div className="box">
            <div className="overflow-x-auto">
              <div className="min-w-full inline-block align-middle">
                <div style={{ height: 'calc(100vh - 300px)' }} className="overflow-y-auto">
                  {loading ? (
                    <div className="flex justify-center items-center h-64">
                      <LoadingIcon icon="puff" className="w-14 h-14" />
                    </div>
                  ) : (
                    <Table>
                      <Table.Thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10">
                        <Table.Tr>
                          <Table.Th className="whitespace-nowrap w-5 sticky left-0 bg-slate-100 dark:bg-slate-800 z-20">
                            <input
                              type="checkbox"
                              className="form-checkbox"
                              onChange={() => {/* Handle select all */}}
                            />
                          </Table.Th>
                          {columns.filter(column => visibleColumns.has(column)).map((column) => (
                            <Table.Th key={column} className="whitespace-nowrap">
                              {column.charAt(0).toUpperCase() + column.slice(1)}
                            </Table.Th>
                          ))}
                          <Table.Th className="whitespace-nowrap sticky right-0 bg-slate-100 dark:bg-slate-800 z-20 text-right pr-4">
                            Actions
                          </Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {currentDocuments.map((doc) => (
                          <Table.Tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                            <Table.Td className="sticky left-0 bg-white dark:bg-gray-800 z-20">
                              <input
                                type="checkbox"
                                className="form-checkbox"
                                onChange={() => {/* Handle select */}}
                              />
                            </Table.Td>
                            {columns.filter(column => visibleColumns.has(column)).map((column) => (
                              <Table.Td key={column} className="whitespace-nowrap">
                                <div className="max-w-xs overflow-hidden text-ellipsis">
                                  {doc[column]?.toString() || '-'}
                                </div>
                              </Table.Td>
                            ))}
                            <Table.Td className="sticky right-0 bg-white dark:bg-gray-800 z-20 text-right pr-4">
                              {renderActionButtons(doc)}
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 bg-white dark:bg-gray-800 p-4 border-t border-gray-200 dark:border-gray-700 mt-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="text-gray-600">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredDocuments.length)} of {filteredDocuments.length} entries
              </div>
              <div className="flex items-center">
                <FormSelect
                  className="w-20 mr-2"
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </FormSelect>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <Lucide icon="ChevronLeft" className="w-4 h-4" />
                </Button>
                <div className="mx-2">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <Lucide icon="ChevronRight" className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer />
    </>
  );
}

export default Main;
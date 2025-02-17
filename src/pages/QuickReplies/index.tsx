import React, { useState, useEffect, useCallback, useRef } from "react";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Lucide from "@/components/Base/Lucide";
import Button from "@/components/Base/Button";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from "react-router-dom";
import { initializeApp } from "firebase/app";

interface QuickReply {
    id: string;
    keyword: string;
    text: string;
    type: string;
    category?: string;
    documents?: {
        name: string;
        type: string;
        size: number;
        url: string;
        lastModified: number;
    }[] | null;
    images?: string[] | null;
    showImage?: boolean;
    showDocument?: boolean;
    createdAt?: any;
    createdBy?: string;
}

const QuickRepliesPage: React.FC = () => {
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'self'>('all');
  const [editingReply, setEditingReply] = useState<QuickReply | null>(null);
  const [editingDocuments, setEditingDocuments] = useState<File[]>([]);
  const [editingImages, setEditingImages] = useState<File[]>([]);
  const [newQuickReply, setNewQuickReply] = useState('');
  const [newQuickReplyKeyword, setNewQuickReplyKeyword] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState<File[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<{ [key: string]: { image: boolean, document: boolean } }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<{ [key: string]: string }>({});
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    type: 'image' | 'document';
    url: string;
    title: string;
  }>({
    isOpen: false,
    type: 'image',
    url: '',
    title: ''
  });

  // Add new state for preview
  const [selectedPreview, setSelectedPreview] = useState<{
    type: 'image' | 'document' | null;
    url: string;
    title: string;
  } | null>(null);

  const [newCategory, setNewCategory] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const firebaseConfig = {
    apiKey: "AIzaSyCc0oSHlqlX7fLeqqonODsOIC3XA8NI7hc",
    authDomain: "onboarding-a5fcb.firebaseapp.com",
    databaseURL: "https://onboarding-a5fcb-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "onboarding-a5fcb",
    storageBucket: "onboarding-a5fcb.appspot.com",
    messagingSenderId: "334607574757",
    appId: "1:334607574757:web:2603a69bf85f4a1e87960c",
    measurementId: "G-2C9J1RY67L"
  };

  
  const app = initializeApp(firebaseConfig);
  const firestore = getFirestore(app);
  const auth = getAuth(app);

  useEffect(() => {
    fetchQuickReplies();
  }, []);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchQuickReplies = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error('No authenticated user');
        return;
      }

      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;

      // Fetch company quick replies
      const companyQuickReplyRef = collection(firestore, `companies/${companyId}/quickReplies`);
      const companyQuery = query(companyQuickReplyRef, orderBy('createdAt', 'desc'));
      const companySnapshot = await getDocs(companyQuery);

      // Fetch user's personal quick replies
      const userQuickReplyRef = collection(firestore, `user/${user.email}/quickReplies`);
      const userQuery = query(userQuickReplyRef, orderBy('createdAt', 'desc'));
      const userSnapshot = await getDocs(userQuery);

      const fetchedQuickReplies: QuickReply[] = [
        ...companySnapshot.docs.map(doc => ({
          id: doc.id,
          keyword: doc.data().keyword || '',
          text: doc.data().text || '',
          type: 'all',
          documents: doc.data().documents || null,
          images: doc.data().images || null,
          category: doc.data().category || '',
        })),
        ...userSnapshot.docs.map(doc => ({
          id: doc.id,
          keyword: doc.data().keyword || '',
          text: doc.data().text || '',
          type: 'self',
          documents: doc.data().documents || null,
          images: doc.data().images || null,
          category: doc.data().category || '',
        }))
      ];

      setQuickReplies(fetchedQuickReplies);
    } catch (error) {
      console.error('Error fetching quick replies:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) return;
      
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;

      // Fetch categories from a separate collection
      const categoriesRef = collection(firestore, `companies/${companyId}/categories`);
      const categoriesSnapshot = await getDocs(categoriesRef);
      const fetchedCategories = categoriesSnapshot.docs.map(doc => doc.data().name);
      setCategories(['all', ...fetchedCategories]);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const uploadDocument = async (file: File): Promise<{ name: string; type: string; size: number; url: string; lastModified: number }> => {
    const storage = getStorage();
    const storageRef = ref(storage, `quickReplies/${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return {
        name: file.name,
        type: file.type,
        size: file.size,
        url: url,
        lastModified: file.lastModified
    };
  };

  const uploadImage = async (file: File): Promise<string> => {
    const storage = getStorage(); // Initialize storage
    const storageRef = ref(storage, `images/${file.name}`); // Set the storage path
    await uploadBytes(storageRef, file); // Upload the file
    return await getDownloadURL(storageRef); // Return the download URL
  };

  const handlePreviewClick = (type: 'image' | 'document', url: string, title: string) => {
    setPreviewModal({
      isOpen: true,
      type,
      url,
      title
    });
  };

  const getFileType = (fileName: string): 'image' | 'document' => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    return imageExtensions.includes(extension) ? 'image' : 'document';
  };

  const generatePreviewUrl = (file: File): string => {
    if (getFileType(file.name) === 'image') {
      return URL.createObjectURL(file);
    }
    // For PDFs and other documents that can be previewed
    if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return '';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'document' | 'image') => {
    const files = Array.from(e.target.files || []);
    if (type === 'document') {
      setSelectedDocuments(prev => [...prev, ...files]);
      files.forEach(file => {
        const url = generatePreviewUrl(file);
        setPreviewUrls(prev => ({ ...prev, [file.name]: url }));
      });
    } else {
      setSelectedImages(prev => [...prev, ...files]);
      files.forEach(file => {
        const url = generatePreviewUrl(file);
        setPreviewUrls(prev => ({ ...prev, [file.name]: url }));
      });
    }
  };

  const removeFile = (fileName: string, type: 'document' | 'image') => {
    if (type === 'document') {
      setSelectedDocuments(prev => prev.filter(file => file.name !== fileName));
    } else {
      setSelectedImages(prev => prev.filter(file => file.name !== fileName));
    }
    URL.revokeObjectURL(previewUrls[fileName]);
    setPreviewUrls(prev => {
      const newUrls = { ...prev };
      delete newUrls[fileName];
      return newUrls;
    });
  };

  const handleEditingFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'document' | 'image') => {
    const files = Array.from(e.target.files || []);
    if (type === 'document') {
      setEditingDocuments(prev => [...prev, ...files]);
      files.forEach(file => {
        const url = URL.createObjectURL(file);
        setPreviewUrls(prev => ({ ...prev, [file.name]: url }));
      });
    } else {
      setEditingImages(prev => [...prev, ...files]);
      files.forEach(file => {
        const url = URL.createObjectURL(file);
        setPreviewUrls(prev => ({ ...prev, [file.name]: url }));
      });
    }
  };

  const removeEditingFile = (fileName: string, type: 'document' | 'image') => {
    if (type === 'document') {
      setEditingDocuments(prev => prev.filter(file => file.name !== fileName));
    } else {
      setEditingImages(prev => prev.filter(file => file.name !== fileName));
    }
    URL.revokeObjectURL(previewUrls[fileName]);
    setPreviewUrls(prev => {
      const newUrls = { ...prev };
      delete newUrls[fileName];
      return newUrls;
    });
  };

  useEffect(() => {
    return () => {
      // Cleanup preview URLs when component unmounts
      Object.values(previewUrls).forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const addQuickReply = async () => {
    if (newQuickReplyKeyword.trim() === '') {
      toast.error('Keyword is required');
      return;
    }

    setIsLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error('No authenticated user');
        return;
      }

      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;

      const newQuickReplyData = {
        text: newQuickReply,
        keyword: newQuickReplyKeyword,
        type: activeTab,
        category: newCategory,
        createdAt: serverTimestamp(),
        createdBy: user.email,
        documents: [],
        images: [],
      };

      let docRef;
      if (activeTab === 'self') {
        docRef = collection(firestore, `user/${user.email}/quickReplies`);
      } else {
        docRef = collection(firestore, `companies/${companyId}/quickReplies`);
      }

      // First, add the quick reply with text only
      const quickReplyRef = await addDoc(docRef, newQuickReplyData);

      // Then, if there are attachments, update the document
      if (selectedDocuments.length > 0 || selectedImages.length > 0) {
        const updates: Partial<QuickReply> = {
          documents: [],
          images: [],
        };
        
        if (selectedDocuments.length > 0) {
          const documentData = await Promise.all(selectedDocuments.map(file => uploadDocument(file)));
          updates.documents = documentData;
        }
        
        if (selectedImages.length > 0) {
          const imageUrls = await Promise.all(selectedImages.map(file => uploadImage(file)));
          updates.images = imageUrls;
        }

        await updateDoc(quickReplyRef, updates);
      }

      setNewQuickReply('');
      setNewQuickReplyKeyword('');
      setSelectedDocuments([]);
      setSelectedImages([]);
      setPreviewUrls({});
      toast.success('Quick reply added successfully');
      fetchQuickReplies();
    } catch (error) {
      console.error('Error adding quick reply:', error);
      toast.error('Failed to add quick reply');
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuickReply = async (
    id: string,
    keyword: string,
    text: string,
    type: 'all' | 'self',
    category: string
  ) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;

      let quickReplyDoc;
      if (type === 'self') {
        quickReplyDoc = doc(firestore, `user/${user.email}/quickReplies`, id);
      } else {
        quickReplyDoc = doc(firestore, `companies/${companyId}/quickReplies`, id);
      }

      const updatedData: Partial<QuickReply> = {
        text,
        keyword,
        category: editingReply?.category || "",
      };

      if (editingDocuments.length > 0) {
        const documentData = await Promise.all(editingDocuments.map(file => uploadDocument(file)));
        updatedData.documents = documentData;
      }

      if (editingImages.length > 0) {
        const imageUrls = await Promise.all(editingImages.map(file => uploadImage(file)));
        updatedData.images = imageUrls;
      }

      await updateDoc(quickReplyDoc, updatedData);
      setEditingReply(null);
      setEditingDocuments([]);
      setEditingImages([]);
      setPreviewUrls({});
      toast.success('Quick reply updated successfully');
      fetchQuickReplies();
    } catch (error) {
      console.error('Error updating quick reply:', error);
      toast.error('Failed to update quick reply');
    }
  };

  const deleteQuickReply = async (id: string, type: 'all' | 'self') => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;

      let quickReplyDoc;
      if (type === 'self') {
        quickReplyDoc = doc(firestore, `user/${user.email}/quickReplies`, id);
      } else {
        quickReplyDoc = doc(firestore, `companies/${companyId}/quickReplies`, id);
      }

      await deleteDoc(quickReplyDoc);
      fetchQuickReplies();
    } catch (error) {
      console.error('Error deleting quick reply:', error);
    }
  };

  const toggleItem = (id: string, type: 'image' | 'document') => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [type]: !prev[id]?.[type]
      }
    }));
  };

  const filteredQuickReplies = quickReplies
    .filter(reply => activeTab === 'all' || reply.type === activeTab)
    .filter(reply => {
      if (selectedCategory === 'all') return true;
      return reply.category === selectedCategory;
    })
    .filter(reply => 
      reply.keyword.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reply.text.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => a.keyword.localeCompare(b.keyword));

  const handleTextFormat = (format: 'bold' | 'strikethrough') => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = newQuickReply.substring(start, end);
    
    if (selectedText) {
      const symbol = format === 'bold' ? '*' : '~';
      const formattedText = `${symbol}${selectedText}${symbol}`;
      const newText = newQuickReply.substring(0, start) + formattedText + newQuickReply.substring(end);
      setNewQuickReply(newText);
      
      // Restore cursor position after formatting
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 1, end + 1);
      }, 0);
    }
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) return;

      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) return;
      
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;

      const categoriesRef = collection(firestore, `companies/${companyId}/categories`);
      await addDoc(categoriesRef, {
        name: newCategoryName,
        createdAt: serverTimestamp(),
        createdBy: user.email
      });

      setNewCategoryName('');
      fetchCategories();
      toast.success('Category added successfully');
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Failed to add category');
    }
  };

  const deleteCategory = async (categoryName: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) return;
      
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;

      const categoriesRef = collection(firestore, `companies/${companyId}/categories`);
      const q = query(categoriesRef, where('name', '==', categoryName));
      const querySnapshot = await getDocs(q);
      
      querySnapshot.forEach(async (doc) => {
        await deleteDoc(doc.ref);
      });

      fetchCategories();
      toast.success('Category deleted successfully');
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="flex-grow overflow-y-auto">
        <div className="p-5 min-h-full">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-2xl font-bold">Quick Replies</h2>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline-primary"
                onClick={() => setShowCategoryModal(true)}
              >
                <Lucide icon="Tags" className="w-4 h-4 mr-2" />
                Manage Categories
              </Button>
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                    activeTab === 'all'
                      ? 'bg-primary text-white shadow-md'
                      : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => setActiveTab('all')}
                >
                  All
                </button>
                <button
                  className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                    activeTab === 'self'
                      ? 'bg-primary text-white shadow-md'
                      : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => setActiveTab('self')}
                >
                  Personal
                </button>
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </option>
                ))}
              </select>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search quick replies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <Lucide
                  icon="Search"
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Add Quick Reply Form */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Add New Quick Reply</h3>
              <div className="space-y-4">
                <div className="flex space-x-4">
                  <input
                    className="flex-1 px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Keyword (required)"
                    value={newQuickReplyKeyword}
                    onChange={(e) => setNewQuickReplyKeyword(e.target.value)}
                  />

<div className="relative flex-1">
  <select
    className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
    value={newCategory}
    onChange={(e) => setNewCategory(e.target.value)}
  >
    <option value="">Select Category</option>
    {categories
      .filter(cat => cat !== 'all')
      .map(category => (
        <option key={category} value={category}>
          {category}
        </option>
    ))}
  </select>
</div>
                </div>
                <div className="relative">
                  <div className="absolute right-2 top-2 flex space-x-2 z-10">
                    <button
                      className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => handleTextFormat('bold')}
                      title="Bold"
                    >
                      <Lucide icon="Bold" className="w-4 h-4" />
                    </button>
                    <button
                      className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => handleTextFormat('strikethrough')}
                      title="Strikethrough"
                    >
                      <Lucide icon="Strikethrough" className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Message text (optional)"
                    value={newQuickReply}
                    onChange={(e) => setNewQuickReply(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex-1 flex space-x-4">
                    <div>
                      <input
                        type="file"
                        id="quickReplyFile"
                        className="hidden"
                        multiple
                        onChange={(e) => handleFileSelect(e, 'document')}
                      />
                      <label
                        htmlFor="quickReplyFile"
                        className="flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        <Lucide icon="File" className="w-5 h-5 mr-2" />
                        Documents
                      </label>
                    </div>
                    <div>
                      <input
                        type="file"
                        id="quickReplyImage"
                        accept="image/*"
                        className="hidden"
                        multiple
                        onChange={(e) => handleFileSelect(e, 'image')}
                      />
                      <label
                        htmlFor="quickReplyImage"
                        className="flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        <Lucide icon="Image" className="w-5 h-5 mr-2" />
                        Images
                      </label>
                    </div>
                  </div>
                  <button
                    className={`px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center ${
                      isLoading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    onClick={addQuickReply}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Lucide icon="Loader" className="w-5 h-5 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Lucide icon="Plus" className="w-5 h-5 mr-2" />
                        Add
                      </>
                    )}
                  </button>
                </div>

                {/* Preview Section */}
                {(selectedDocuments.length > 0 || selectedImages.length > 0) && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Attachments</h4>
                    <div className="flex flex-wrap gap-2">
                      {[...selectedImages, ...selectedDocuments].map((file) => (
                        <div key={file.name} className="relative group">
                          <div 
                            className="flex items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            onClick={() => handlePreviewClick(getFileType(file.name), previewUrls[file.name], file.name)}
                          >
                            <Lucide 
                              icon={getFileType(file.name) === 'image' ? 'Image' : 'File'} 
                              className="w-5 h-5 mr-2 text-gray-500"
                            />
                            <span className="text-sm truncate max-w-[150px]">{file.name}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFile(file.name, getFileType(file.name));
                              }}
                              className="ml-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-full"
                            >
                              <Lucide icon="X" className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Replies List */}
            <div className="space-y-4">
              {filteredQuickReplies.map(reply => (
                <div key={reply.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                  {editingReply?.id === reply.id ? (
                    <div className="space-y-4">
                      <div className="flex space-x-4">
                        <input
                          className="flex-1 px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                          value={editingReply.keyword}
                          onChange={(e) => setEditingReply({ ...editingReply, keyword: e.target.value })}
                          placeholder="Keyword (required)"
                        />
                        <div className="relative flex-1">
                          <select
                            className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                            value={editingReply.category || ""}
                            onChange={(e) => setEditingReply({ ...editingReply, category: e.target.value })}
                          >
                            <option value="">Select Category</option>
                            {categories
                              .filter(cat => cat !== 'all')
                              .map(category => (
                                <option key={category} value={category}>
                                  {category}
                                </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <textarea
                        className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                        value={editingReply.text}
                        onChange={(e) => setEditingReply({ ...editingReply, text: e.target.value })}
                        placeholder="Message text (optional)"
                        rows={3}
                      />
                      <div className="flex items-center space-x-4">
                        <div className="flex-1 flex space-x-4">
                          <div>
                            <input
                              type="file"
                              id={`editFile-${reply.id}`}
                              className="hidden"
                              multiple
                              onChange={(e) => handleEditingFileSelect(e, 'document')}
                            />
                            <label
                              htmlFor={`editFile-${reply.id}`}
                              className="flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                              <Lucide icon="File" className="w-5 h-5 mr-2" />
                              Documents
                            </label>
                          </div>
                          <div>
                            <input
                              type="file"
                              id={`editImage-${reply.id}`}
                              accept="image/*"
                              className="hidden"
                              multiple
                              onChange={(e) => handleEditingFileSelect(e, 'image')}
                            />
                            <label
                              htmlFor={`editImage-${reply.id}`}
                              className="flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                              <Lucide icon="Image" className="w-5 h-5 mr-2" />
                              Images
                            </label>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                            onClick={() => updateQuickReply(reply.id, editingReply.keyword, editingReply.text, editingReply.type as "all" | "self", editingReply.category || "")}
                          >
                            Save
                          </button>
                          <button
                            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                            onClick={() => {
                              setEditingReply(null);
                              setEditingDocuments([]);
                              setEditingImages([]);
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>

                      {/* Preview Section for Editing */}
                      {(editingDocuments.length > 0 || editingImages.length > 0) && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-500 mb-2">New Attachments</h4>
                          <div className="flex flex-wrap gap-2">
                            {[...editingImages, ...editingDocuments].map((file) => (
                              <div key={file.name} className="relative group">
                                <div 
                                  className="flex items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                  onClick={() => handlePreviewClick(getFileType(file.name), previewUrls[file.name], file.name)}
                                >
                                  <Lucide 
                                    icon={getFileType(file.name) === 'image' ? 'Image' : 'File'} 
                                    className="w-5 h-5 mr-2 text-gray-500"
                                  />
                                  <span className="text-sm truncate max-w-[150px]">{file.name}</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeEditingFile(file.name, getFileType(file.name));
                                    }}
                                    className="ml-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-full"
                                  >
                                    <Lucide icon="X" className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-grow">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                              {reply.keyword}
                            </span>
                            {reply.category && (
                              <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-sm">
                                {reply.category}
                              </span>
                            )}
                            <span className="text-gray-500 dark:text-gray-400 text-sm">
                              {reply.createdBy && `Added by ${reply.createdBy}`}
                            </span>
                          </div>
                          {reply.text && (
                            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                              {reply.text}
                            </p>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            onClick={() => setEditingReply(reply)}
                          >
                            <Lucide icon="PencilLine" className="w-5 h-5" />
                          </button>
                          <button
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            onClick={() => deleteQuickReply(reply.id, reply.type as "all" | "self")}
                          >
                            <Lucide icon="Trash" className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      {/* Attachments Section */}
                      {((reply.images && reply.images.length > 0) || (reply.documents && reply.documents.length > 0)) && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {reply.images?.map((image, index) => (
                            <div
                              key={`image-${index}`}
                              className="relative group cursor-pointer"
                              onClick={() => handlePreviewClick('image', image, `Image ${index + 1}`)}
                            >
                              <img
                                src={image}
                                alt={`Quick Reply Image ${index + 1}`}
                                className="w-20 h-20 object-cover rounded-lg hover:opacity-90 transition-opacity"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                <Lucide icon="ZoomIn" className="w-6 h-6 text-white" />
                              </div>
                            </div>
                          ))}
                          {reply.documents?.map((document, index) => (
                            <div
                              key={`document-${index}`}
                              className="flex items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                              onClick={() => handlePreviewClick('document', document.url, document.name)}
                            >
                              <Lucide icon="File" className="w-5 h-5 mr-2 text-gray-500" />
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">{document.name}</span>
                                <span className="text-xs text-gray-500">
                                    {(document.size / 1024 / 1024).toFixed(2)} MB • {document.type}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 max-w-4xl w-full max-h-[90vh] overflow-hidden relative">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{previewModal.title}</h3>
              <button
                onClick={() => setPreviewModal(prev => ({ ...prev, isOpen: false }))}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <Lucide icon="X" className="w-6 h-6" />
              </button>
            </div>
            <div className="overflow-auto" style={{ maxHeight: 'calc(90vh - 100px)' }}>
              {previewModal.type === 'image' ? (
                <img
                  src={previewModal.url}
                  alt={previewModal.title}
                  className="w-full h-auto"
                />
              ) : (
                <iframe
                  src={previewModal.url}
                  title={previewModal.title}
                  className="w-full h-[80vh]"
                  frameBorder="0"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Category Management Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Manage Categories</h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <Lucide icon="X" className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Add new category */}
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="New category name"
                  className="flex-1 px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <Button
                  variant="primary"
                  onClick={addCategory}
                >
                  <Lucide icon="Plus" className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>

              {/* Category list */}
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Existing Categories</h4>
                <div className="space-y-2">
                  {categories
                    .filter(category => category !== 'all')
                    .map(category => (
                      <div
                        key={category}
                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <span>{category}</span>
                        <button
                          onClick={() => deleteCategory(category)}
                          className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                        >
                          <Lucide icon="Trash2" className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="bottom-right" />
    </div>
  );
};

export default QuickRepliesPage;

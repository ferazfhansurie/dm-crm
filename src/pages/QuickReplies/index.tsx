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
    videos?: {
        name: string;
        type: string;
        size: number;
        url: string;
        lastModified: number;
        thumbnail?: string;
    }[] | null;
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
    type: 'image' | 'document' | 'video';
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
    type: 'image' | 'document' | 'video' | null;
    url: string;
    title: string;
  } | null>(null);

  const [newCategory, setNewCategory] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [selectedVideos, setSelectedVideos] = useState<File[]>([]);
  const [editingVideos, setEditingVideos] = useState<File[]>([]);

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

  // Add keyboard event listener for modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && previewModal.isOpen) {
        setPreviewModal(prev => ({ ...prev, isOpen: false }));
      }
    };

    if (previewModal.isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [previewModal.isOpen]);

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
          videos: doc.data().videos || null,
        })),
        ...userSnapshot.docs.map(doc => ({
          id: doc.id,
          keyword: doc.data().keyword || '',
          text: doc.data().text || '',
          type: 'self',
          documents: doc.data().documents || null,
          images: doc.data().images || null,
          category: doc.data().category || '',
          videos: doc.data().videos || null,
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

  const uploadVideo = async (file: File): Promise<{ name: string; type: string; size: number; url: string; lastModified: number; thumbnail?: string }> => {
    const storage = getStorage();
    const storageRef = ref(storage, `quickReplies/videos/${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    // Generate thumbnail using canvas
    let thumbnail;
    try {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      await new Promise((resolve) => {
        video.onloadeddata = resolve;
        video.load();
      });
      video.currentTime = 1; // Get frame at 1 second
      await new Promise((resolve) => {
        video.onseeked = resolve;
      });
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      thumbnail = canvas.toDataURL('image/jpeg');
    } catch (error) {
      console.error('Error generating thumbnail:', error);
    }

    return {
      name: file.name,
      type: file.type,
      size: file.size,
      url: url,
      lastModified: file.lastModified,
      thumbnail
    };
  };

  const handlePreviewClick = (type: 'image' | 'document' | 'video', url: string, title: string) => {
    setPreviewModal({
      isOpen: true,
      type,
      url,
      title
    });
  };

  const getFileType = (fileName: string): 'image' | 'document' | 'video' => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const videoExtensions = ['mp4', 'webm', 'ogg', 'mov'];
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    if (imageExtensions.includes(extension)) return 'image';
    if (videoExtensions.includes(extension)) return 'video';
    return 'document';
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

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>, isEditing: boolean = false) => {
    const files = Array.from(e.target.files || []);
    if (isEditing) {
      setEditingVideos(prev => [...prev, ...files]);
    } else {
      setSelectedVideos(prev => [...prev, ...files]);
    }
    files.forEach(file => {
      const url = URL.createObjectURL(file);
      setPreviewUrls(prev => ({ ...prev, [file.name]: url }));
    });
  };

  const removeVideo = (fileName: string, isEditing: boolean = false) => {
    if (isEditing) {
      setEditingVideos(prev => prev.filter(file => file.name !== fileName));
    } else {
      setSelectedVideos(prev => prev.filter(file => file.name !== fileName));
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
        videos: [],
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
      if (selectedDocuments.length > 0 || selectedImages.length > 0 || selectedVideos.length > 0) {
        const updates: Partial<QuickReply> = {
          documents: [],
          images: [],
          videos: [],
        };
        
        if (selectedDocuments.length > 0) {
          const documentData = await Promise.all(selectedDocuments.map(file => uploadDocument(file)));
          updates.documents = documentData;
        }
        
        if (selectedImages.length > 0) {
          const imageUrls = await Promise.all(selectedImages.map(file => uploadImage(file)));
          updates.images = imageUrls;
        }

        if (selectedVideos.length > 0) {
          const videoData = await Promise.all(selectedVideos.map(file => uploadVideo(file)));
          updates.videos = videoData;
        }

        await updateDoc(quickReplyRef, updates);
      }

      setNewQuickReply('');
      setNewQuickReplyKeyword('');
      setSelectedDocuments([]);
      setSelectedImages([]);
      setSelectedVideos([]);
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

      if (editingVideos.length > 0) {
        const videoData = await Promise.all(editingVideos.map(file => uploadVideo(file)));
        updatedData.videos = videoData;
      }

      await updateDoc(quickReplyDoc, updatedData);
      setEditingReply(null);
      setEditingDocuments([]);
      setEditingImages([]);
      setEditingVideos([]);
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
                <div className="flex items-center gap-4">
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
                  <input
                    type="file"
                    id="quickReplyVideo"
                    accept="video/*"
                    className="hidden"
                    multiple
                    onChange={(e) => handleVideoSelect(e, false)}
                  />
                  <label
                    htmlFor="quickReplyVideo"
                    className="flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Lucide icon="Video" className="w-5 h-5 mr-2" />
                    Videos
                  </label>
                  <div className="ml-auto">
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
                </div>

                {/* Preview Section */}
                {(selectedDocuments.length > 0 || selectedImages.length > 0 || selectedVideos.length > 0) && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center mb-3">
                      <Lucide icon="Paperclip" className="w-4 h-4 text-gray-500 mr-2" />
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Attachments ({selectedImages.length + selectedDocuments.length + selectedVideos.length})
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {[...selectedImages, ...selectedDocuments, ...selectedVideos].map((file) => (
                        <div key={file.name} className="relative group">
                          {getFileType(file.name) === 'image' ? (
                            <div className="relative bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-600">
                              <div className="aspect-square">
                                <img
                                  src={previewUrls[file.name]}
                                  alt={file.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                                <Lucide icon="Image" className="w-3 h-3" />
                              </div>
                              <button
                                onClick={() => removeFile(file.name, 'image')}
                                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                              >
                                <Lucide icon="X" className="w-3 h-3" />
                              </button>
                            </div>
                          ) : getFileType(file.name) === 'video' ? (
                            <div className="relative bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-600">
                              <div className="aspect-square relative bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                <Lucide icon="Video" className="w-8 h-8 text-gray-400" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="bg-black/60 rounded-full p-2">
                                    <Lucide icon="Play" className="w-4 h-4 text-white" />
                                  </div>
                                </div>
                              </div>
                              <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                                <Lucide icon="Video" className="w-3 h-3" />
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                <p className="text-white text-xs truncate font-medium">{file.name}</p>
                                <p className="text-white/80 text-xs">
                                  {(file.size / 1024 / 1024).toFixed(1)} MB
                                </p>
                              </div>
                              <button
                                onClick={() => removeVideo(file.name, false)}
                                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                              >
                                <Lucide icon="X" className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-600 flex flex-col relative">
                              <div className="flex items-center justify-center h-16 mb-2">
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                  <Lucide icon="FileText" className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                </div>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate mb-1">
                                  {file.name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {(file.size / 1024 / 1024).toFixed(1)} MB
                                </p>
                              </div>
                              <button
                                onClick={() => removeFile(file.name, 'document')}
                                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                              >
                                <Lucide icon="X" className="w-3 h-3" />
                              </button>
                            </div>
                          )}
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
                    <div className="space-y-6 border-2 border-primary/20 rounded-lg p-6 bg-gradient-to-br from-primary/5 to-transparent">
                      {/* Header with editing indicator */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Lucide icon="PencilLine" className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Editing Quick Reply</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Make your changes below</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-sm font-medium flex items-center">
                            <Lucide icon="Clock" className="w-3 h-3 mr-1" />
                            Editing
                          </span>
                        </div>
                      </div>

                      {/* Form fields */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Keyword</label>
                          <input
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 shadow-sm"
                            value={editingReply.keyword}
                            onChange={(e) => setEditingReply({ ...editingReply, keyword: e.target.value })}
                            placeholder="Enter keyword (required)"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                          <select
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 shadow-sm"
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

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Message Text</label>
                        <div className="relative">
                          <div className="absolute right-3 top-3 flex space-x-1 z-10">
                            <button
                              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              onClick={() => {
                                const textarea = document.querySelector(`#edit-textarea-${reply.id}`) as HTMLTextAreaElement;
                                const start = textarea.selectionStart;
                                const end = textarea.selectionEnd;
                                const selectedText = editingReply.text.substring(start, end);
                                if (selectedText) {
                                  const formattedText = `*${selectedText}*`;
                                  const newText = editingReply.text.substring(0, start) + formattedText + editingReply.text.substring(end);
                                  setEditingReply({ ...editingReply, text: newText });
                                }
                              }}
                              title="Bold"
                            >
                              <Lucide icon="Bold" className="w-4 h-4 text-gray-500" />
                            </button>
                            <button
                              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              onClick={() => {
                                const textarea = document.querySelector(`#edit-textarea-${reply.id}`) as HTMLTextAreaElement;
                                const start = textarea.selectionStart;
                                const end = textarea.selectionEnd;
                                const selectedText = editingReply.text.substring(start, end);
                                if (selectedText) {
                                  const formattedText = `~${selectedText}~`;
                                  const newText = editingReply.text.substring(0, start) + formattedText + editingReply.text.substring(end);
                                  setEditingReply({ ...editingReply, text: newText });
                                }
                              }}
                              title="Strikethrough"
                            >
                              <Lucide icon="Strikethrough" className="w-4 h-4 text-gray-500" />
                            </button>
                          </div>
                          <textarea
                            id={`edit-textarea-${reply.id}`}
                            className="w-full px-4 py-3 pr-20 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 shadow-sm resize-none"
                            value={editingReply.text}
                            onChange={(e) => setEditingReply({ ...editingReply, text: e.target.value })}
                            placeholder="Enter message text (optional)"
                            rows={4}
                          />
                        </div>
                      </div>

                      {/* Existing attachments preview */}
                      {((reply.images && reply.images.length > 0) || (reply.documents && reply.documents.length > 0) || (reply.videos && reply.videos.length > 0)) && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                              <Lucide icon="Paperclip" className="w-4 h-4 mr-2" />
                              Current Attachments
                            </label>
                            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                              {(reply.images?.length || 0) + (reply.documents?.length || 0) + (reply.videos?.length || 0)} files
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-600">
                            {reply.images?.map((image, index) => (
                              <div
                                key={`existing-image-${index}`}
                                className="relative group cursor-pointer bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-600"
                                onClick={() => handlePreviewClick('image', image, `Image ${index + 1}`)}
                              >
                                <div className="aspect-square">
                                  <img
                                    src={image}
                                    alt={`Image ${index + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 dark:bg-gray-800/90 rounded-full p-2">
                                    <Lucide icon="ZoomIn" className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                                  </div>
                                </div>
                                <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded flex items-center">
                                  <Lucide icon="Image" className="w-3 h-3 mr-1" />
                                  IMG
                                </div>
                              </div>
                            ))}
                            {reply.videos?.map((video, index) => (
                              <div
                                key={`existing-video-${index}`}
                                className="relative group cursor-pointer bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-600"
                                onClick={() => handlePreviewClick('video', video.url, video.name)}
                              >
                                <div className="aspect-square relative">
                                  {video.thumbnail ? (
                                    <img
                                      src={video.thumbnail}
                                      alt={`Video ${index + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 flex items-center justify-center">
                                      <Lucide icon="Video" className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                                    </div>
                                  )}
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="bg-black/60 rounded-full p-2 group-hover:bg-black/80 transition-colors">
                                      <Lucide icon="Play" className="w-5 h-5 text-white" />
                                    </div>
                                  </div>
                                </div>
                                <div className="absolute top-2 left-2 bg-purple-500 text-white text-xs px-2 py-1 rounded flex items-center">
                                  <Lucide icon="Video" className="w-3 h-3 mr-1" />
                                  VID
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                  <p className="text-white text-xs truncate font-medium">{video.name}</p>
                                </div>
                              </div>
                            ))}
                            {reply.documents?.map((document, index) => (
                              <div
                                key={`existing-document-${index}`}
                                className="group cursor-pointer bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-600 flex flex-col"
                                onClick={() => handlePreviewClick('document', document.url, document.name)}
                              >
                                <div className="flex items-center justify-center h-12 mb-2">
                                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                                    <Lucide icon="FileText" className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                  </div>
                                </div>
                                <div className="flex-1 text-center">
                                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate mb-1">
                                    {document.name}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {(document.size / 1024 / 1024).toFixed(1)} MB
                                  </p>
                                </div>
                                <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded flex items-center">
                                  <Lucide icon="File" className="w-3 h-3 mr-1" />
                                  DOC
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* File upload section */}
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                          <Lucide icon="Plus" className="w-4 h-4 mr-2" />
                          Add New Attachments
                        </label>
                        <div className="flex flex-wrap gap-3">
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
                              className="flex items-center px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors border border-blue-200 dark:border-blue-800"
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
                              className="flex items-center px-4 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors border border-green-200 dark:border-green-800"
                            >
                              <Lucide icon="Image" className="w-5 h-5 mr-2" />
                              Images
                            </label>
                          </div>
                          <div>
                            <input
                              type="file"
                              id={`editVideo-${reply.id}`}
                              accept="video/*"
                              className="hidden"
                              multiple
                              onChange={(e) => handleVideoSelect(e, true)}
                            />
                            <label
                              htmlFor={`editVideo-${reply.id}`}
                              className="flex items-center px-4 py-3 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors border border-purple-200 dark:border-purple-800"
                            >
                              <Lucide icon="Video" className="w-5 h-5 mr-2" />
                              Videos
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* New attachments preview */}
                      {(editingDocuments.length > 0 || editingImages.length > 0 || editingVideos.length > 0) && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                              <Lucide icon="Upload" className="w-4 h-4 mr-2" />
                              New Attachments
                            </label>
                            <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-full">
                              {editingImages.length + editingDocuments.length + editingVideos.length} new files
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800">
                            {editingImages.map((file) => (
                              <div key={`new-image-${file.name}`} className="relative group">
                                <div 
                                  className="relative bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 border-2 border-green-200 dark:border-green-700 cursor-pointer"
                                  onClick={() => handlePreviewClick('image', previewUrls[file.name], file.name)}
                                >
                                  <div className="aspect-square">
                                    <img
                                      src={previewUrls[file.name]}
                                      alt={file.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 dark:bg-gray-800/90 rounded-full p-2">
                                      <Lucide icon="ZoomIn" className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                                    </div>
                                  </div>
                                  <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded flex items-center">
                                    <Lucide icon="Plus" className="w-3 h-3 mr-1" />
                                    NEW
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeEditingFile(file.name, 'image');
                                    }}
                                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                                  >
                                    <Lucide icon="X" className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                            {editingVideos.map((file) => (
                              <div key={`new-video-${file.name}`} className="relative group">
                                <div 
                                  className="relative bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 border-2 border-purple-200 dark:border-purple-700 cursor-pointer"
                                  onClick={() => handlePreviewClick('video', previewUrls[file.name], file.name)}
                                >
                                  <div className="aspect-square relative bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 flex items-center justify-center">
                                    <Lucide icon="Video" className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="bg-black/60 rounded-full p-2">
                                        <Lucide icon="Play" className="w-4 h-4 text-white" />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="absolute top-2 left-2 bg-purple-500 text-white text-xs px-2 py-1 rounded flex items-center">
                                    <Lucide icon="Plus" className="w-3 h-3 mr-1" />
                                    NEW
                                  </div>
                                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                    <p className="text-white text-xs truncate font-medium">{file.name}</p>
                                    <p className="text-white/80 text-xs">
                                      {(file.size / 1024 / 1024).toFixed(1)} MB
                                    </p>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeVideo(file.name, true);
                                    }}
                                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                                  >
                                    <Lucide icon="X" className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                            {editingDocuments.map((file) => (
                              <div key={`new-document-${file.name}`} className="relative group">
                                <div 
                                  className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-200 border-2 border-blue-200 dark:border-blue-700 flex flex-col cursor-pointer"
                                  onClick={() => handlePreviewClick('document', previewUrls[file.name] || '', file.name)}
                                >
                                  <div className="flex items-center justify-center h-12 mb-2">
                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                      <Lucide icon="FileText" className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                  </div>
                                  <div className="flex-1 text-center">
                                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate mb-1">
                                      {file.name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {(file.size / 1024 / 1024).toFixed(1)} MB
                                    </p>
                                  </div>
                                  <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded flex items-center">
                                    <Lucide icon="Plus" className="w-3 h-3 mr-1" />
                                    NEW
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeEditingFile(file.name, 'document');
                                    }}
                                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                                  >
                                    <Lucide icon="X" className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                        <button
                          className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center font-medium"
                          onClick={() => {
                            setEditingReply(null);
                            setEditingDocuments([]);
                            setEditingImages([]);
                            setEditingVideos([]);
                            setPreviewUrls({});
                          }}
                        >
                          <Lucide icon="X" className="w-4 h-4 mr-2" />
                          Cancel
                        </button>
                        <button
                          className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center font-medium shadow-lg hover:shadow-xl"
                          onClick={() => updateQuickReply(reply.id, editingReply.keyword, editingReply.text, editingReply.type as "all" | "self", editingReply.category || "")}
                        >
                          <Lucide icon="Save" className="w-4 h-4 mr-2" />
                          Save Changes
                        </button>
                      </div>
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
                      {((reply.images && reply.images.length > 0) || (reply.documents && reply.documents.length > 0) || (reply.videos && reply.videos.length > 0)) && (
                        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                          <div className="flex items-center mb-3">
                            <Lucide icon="Paperclip" className="w-4 h-4 text-gray-500 mr-2" />
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                              Attachments ({(reply.images?.length || 0) + (reply.documents?.length || 0) + (reply.videos?.length || 0)})
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {reply.images?.map((image, index) => (
                              <div
                                key={`image-${index}`}
                                className="relative group cursor-pointer bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-600"
                                onClick={() => handlePreviewClick('image', image, `Image ${index + 1}`)}
                              >
                                <div className="aspect-square">
                                  <img
                                    src={image}
                                    alt={`Quick Reply Image ${index + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 dark:bg-gray-800/90 rounded-full p-2">
                                    <Lucide icon="ZoomIn" className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                                  </div>
                                </div>
                                <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                                  <Lucide icon="Image" className="w-3 h-3" />
                                </div>
                              </div>
                            ))}
                            {reply.videos?.map((video, index) => (
                              <div
                                key={`video-${index}`}
                                className="relative group cursor-pointer bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-600"
                                onClick={() => handlePreviewClick('video', video.url, video.name)}
                              >
                                <div className="aspect-square relative">
                                  {video.thumbnail ? (
                                    <img
                                      src={video.thumbnail}
                                      alt={`Video thumbnail ${index + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                      <Lucide icon="Video" className="w-8 h-8 text-gray-400" />
                                    </div>
                                  )}
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="bg-black/60 rounded-full p-3 group-hover:bg-black/80 transition-colors">
                                      <Lucide icon="Play" className="w-6 h-6 text-white" />
                                    </div>
                                  </div>
                                </div>
                                <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                                  <Lucide icon="Video" className="w-3 h-3" />
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                  <p className="text-white text-xs truncate font-medium">{video.name}</p>
                                  <p className="text-white/80 text-xs">
                                    {(video.size / 1024 / 1024).toFixed(1)} MB
                                  </p>
                                </div>
                              </div>
                            ))}
                            {reply.documents?.map((document, index) => (
                              <div
                                key={`document-${index}`}
                                className="group cursor-pointer bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-600 flex flex-col"
                                onClick={() => handlePreviewClick('document', document.url, document.name)}
                              >
                                <div className="flex items-center justify-center h-12 mb-2">
                                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                                    <Lucide icon="FileText" className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate mb-1">
                                    {document.name}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {(document.size / 1024 / 1024).toFixed(1)} MB
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
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
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setPreviewModal(prev => ({ ...prev, isOpen: false }))}
        >
          <div 
            className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-6xl w-full mx-4 max-h-[95vh] overflow-hidden relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Lucide 
                    icon={previewModal.type === 'image' ? 'Image' : previewModal.type === 'video' ? 'Video' : 'File'} 
                    className="w-5 h-5 text-primary" 
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate max-w-md">
                    {previewModal.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                    {previewModal.type} Preview
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {previewModal.type !== 'video' && (
                  <button
                    onClick={() => window.open(previewModal.url, '_blank')}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Open in new tab"
                  >
                    <Lucide icon="ExternalLink" className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={() => setPreviewModal(prev => ({ ...prev, isOpen: false }))}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Close (ESC)"
                >
                  <Lucide icon="X" className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-auto bg-gray-50 dark:bg-gray-900" style={{ maxHeight: 'calc(95vh - 120px)' }}>
              {previewModal.type === 'image' ? (
                <div className="flex justify-center items-center min-h-[400px]">
                  <img
                    src={previewModal.url}
                    alt={previewModal.title}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                    style={{ maxHeight: '75vh' }}
                  />
                </div>
              ) : previewModal.type === 'video' ? (
                <div className="flex justify-center items-center min-h-[400px] bg-black rounded-lg">
                  <video
                    src={previewModal.url}
                    controls
                    className="max-w-full max-h-full object-contain rounded-lg"
                    style={{ maxHeight: '75vh' }}
                    controlsList="nodownload"
                    playsInline
                    autoPlay={false}
                  />
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-inner">
                  <iframe
                    src={previewModal.url}
                    title={previewModal.title}
                    className="w-full rounded-lg"
                    style={{ height: '75vh', minHeight: '500px' }}
                    frameBorder="0"
                  />
                </div>
              )}
            </div>

            {/* Footer for additional actions */}
            <div className="flex justify-between items-center p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Press <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">ESC</kbd> to close
              </div>
              <div className="flex items-center space-x-2">
                <a
                  href={previewModal.url}
                  download={previewModal.title}
                  className="flex items-center px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                  <Lucide icon="Download" className="w-4 h-4 mr-2" />
                  Download
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Management Modal */}
      {showCategoryModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowCategoryModal(false)}
        >
          <div 
            className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-lg w-full mx-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Lucide icon="Tags" className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Manage Categories</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Organize your quick replies</p>
                </div>
              </div>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Close"
              >
                <Lucide icon="X" className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Add new category */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Add New Category</label>
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Enter category name"
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                    onKeyPress={(e) => e.key === 'Enter' && addCategory()}
                  />
                  <Button
                    variant="primary"
                    onClick={addCategory}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center"
                  >
                    <Lucide icon="Plus" className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>

              {/* Category list */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Existing Categories</label>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {categories.filter(cat => cat !== 'all').length} categories
                  </span>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {categories
                    .filter(category => category !== 'all')
                    .map(category => (
                      <div
                        key={category}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{category}</span>
                        </div>
                        <button
                          onClick={() => deleteCategory(category)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete category"
                        >
                          <Lucide icon="Trash2" className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  {categories.filter(cat => cat !== 'all').length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Lucide icon="Tags" className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No categories yet</p>
                      <p className="text-xs">Add your first category above</p>
                    </div>
                  )}
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

import React, { useState, useEffect, useCallback } from "react";
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
    type:string;
    document?: string | null;
    image?: string | null;
    showImage?: boolean;
    showDocument?: boolean;
}

const QuickRepliesPage: React.FC = () => {
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'self'>('all');
  const [editingReply, setEditingReply] = useState<QuickReply | null>(null);
  const [editingDocument, setEditingDocument] = useState<File | null>(null); // New
  const [editingImage, setEditingImage] = useState<File | null>(null); // New
  const [newQuickReply, setNewQuickReply] = useState('');
  const [newQuickReplyKeyword, setNewQuickReplyKeyword] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<File | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<{ [key: string]: { image: boolean, document: boolean } }>({});

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
          document: doc.data().document || null,
          image: doc.data().image || null,
        })),
        ...userSnapshot.docs.map(doc => ({
          id: doc.id,
          keyword: doc.data().keyword || '',
          text: doc.data().text || '',
          type: 'self',
          document: doc.data().document || null,
          image: doc.data().image || null,
        }))
      ];

      setQuickReplies(fetchedQuickReplies);
    } catch (error) {
      console.error('Error fetching quick replies:', error);
    }
  };

  const uploadDocument = async (file: File): Promise<string> => {
    const storage = getStorage(); // Correctly initialize storage
    const storageRef = ref(storage, `quickReplies/${file.name}`); // Use the initialized storage
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const uploadImage = async (file: File): Promise<string> => {
    const storage = getStorage(); // Initialize storage
    const storageRef = ref(storage, `images/${file.name}`); // Set the storage path
    await uploadBytes(storageRef, file); // Upload the file
    return await getDownloadURL(storageRef); // Return the download URL
  };

  const addQuickReply = async () => {
    if (newQuickReply.trim() === '') return;

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
        createdAt: serverTimestamp(),
        createdBy: user.email,
        document: selectedDocument ? await uploadDocument(selectedDocument) : null,
        image: selectedImage ? await uploadImage(selectedImage) : null,
      };

      if (activeTab === 'self') {
        const userQuickReplyRef = collection(firestore, `user/${user.email}/quickReplies`);
        await addDoc(userQuickReplyRef, newQuickReplyData);
      } else {
        const companyQuickReplyRef = collection(firestore, `companies/${companyId}/quickReplies`);
        await addDoc(companyQuickReplyRef, newQuickReplyData);
      }

      setNewQuickReply('');
      setNewQuickReplyKeyword('');
      setSelectedDocument(null);
      setSelectedImage(null);
      fetchQuickReplies();
    } catch (error) {
      console.error('Error adding quick reply:', error);
    }
  };

  const updateQuickReply = async (
    id: string,
    keyword: string,
    text: string,
    type: 'all' | 'self'
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
      };

      // Handle document upload if a new document is selected
      if (editingDocument) {
        updatedData.document = await uploadDocument(editingDocument);
      }

      // Handle image upload if a new image is selected
      if (editingImage) {
        updatedData.image = await uploadImage(editingImage);
      }

      await updateDoc(quickReplyDoc, updatedData);
      setEditingReply(null);
      setEditingDocument(null);
      setEditingImage(null);
      fetchQuickReplies();
    } catch (error) {
      console.error('Error updating quick reply:', error);
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
    .filter(reply => 
      reply.keyword.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reply.text.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => a.keyword.localeCompare(b.keyword));

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="flex-grow overflow-y-auto">
        <div className="p-5 min-h-full">
          <h2 className="text-2xl font-bold mb-5">Quick Replies</h2>
          <div className="mb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <button
                className={`px-4 py-2 rounded-lg mr-2 ${
                  activeTab === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}
                onClick={() => setActiveTab('all')}
              >
                All
              </button>
              <button
                className={`px-4 py-2 rounded-lg ${
                  activeTab === 'self'
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}
                onClick={() => setActiveTab('self')}
              >
                Personal
              </button>
            </div>
            <input
              type="text"
              placeholder="Search quick replies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div className="mb-5">
            <input
              className="w-full px-4 py-2 mb-2 border rounded-lg  bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="New keyword"
              value={newQuickReplyKeyword}
              onChange={(e) => setNewQuickReplyKeyword(e.target.value)}
            />
            <textarea
              className="w-full px-4 py-2 mb-2 border rounded-lg  bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="New quick reply text"
              value={newQuickReply}
              onChange={(e) => setNewQuickReply(e.target.value)}
              rows={3}
            />
            <div className="flex items-center mb-2">
              <input
                type="file"
                id="quickReplyFile"
                className="hidden"
                onChange={(e) => setSelectedDocument(e.target.files ? e.target.files[0] : null)}
              />
              <label htmlFor="quickReplyFile" className="mr-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer">
                Attach Document
              </label>
              <input
                type="file"
                id="quickReplyImage"
                accept="image/*"
                className="hidden"
                onChange={(e) => setSelectedImage(e.target.files ? e.target.files[0] : null)}
              />
              <label htmlFor="quickReplyImage" className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer">
                Attach Image
              </label>
            </div>
            <button
              className="px-4 py-2 bg-primary text-white rounded-lg"
              onClick={addQuickReply}
            >
              Add Quick Reply
            </button>
          </div>
          <div className="space-y-4">
            {filteredQuickReplies.map(reply => (
              <div key={reply.id} className="p-4 border rounded-lg">
                {editingReply?.id === reply.id ? (
                  <>
                    <input
                      className="w-full px-4 py-2 mb-2 border rounded-lg  bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      value={editingReply.keyword}
                      onChange={(e) => setEditingReply({ ...editingReply, keyword: e.target.value })}
                    />
                    <textarea
                      className="w-full px-4 py-2 mb-2 border rounded-lg  bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      value={editingReply.text}
                      onChange={(e) => setEditingReply({ ...editingReply, text: e.target.value })}
                      rows={3}
                    />
                    
                    {/* New File Inputs for Editing */}
                    <div className="flex items-center mb-2">
                      <div className="flex-1">
                        <input
                          type="file"
                          id="editQuickReplyFile"
                          className="hidden"
                          onChange={(e) => setEditingDocument(e.target.files ? e.target.files[0] : null)}
                        />
                        <label htmlFor="editQuickReplyFile" className="mr-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer">
                          {editingReply.document ? 'Replace Document' : 'Attach Document'}
                        </label>
                        <input
                          type="file"
                          id="editQuickReplyImage"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => setEditingImage(e.target.files ? e.target.files[0] : null)}
                        />
                        <label htmlFor="editQuickReplyImage" className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer">
                          {editingReply.image ? 'Replace Image' : 'Attach Image'}
                        </label>
                      </div>
                      <div className="flex-shrink-0 ml-4">
                        <button
                          className="ml-2 px-4 py-2 bg-green-500 text-white rounded-lg"
                          onClick={() => updateQuickReply(reply.id, editingReply.keyword, editingReply.text, editingReply.type as "all" | "self")}
                        >
                          Save
                        </button>
                        <button
                          className="ml-2 px-4 py-2 bg-gray-500 text-white rounded-lg"
                          onClick={() => {
                            setEditingReply(null);
                            setEditingDocument(null);
                            setEditingImage(null);
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-grow">
                        <h3 className="text-xl font-bold">{reply.keyword}</h3>
                        <p className="text-base text-gray-600 dark:text-gray-300 mt-1">{reply.text}</p>
                      </div>
                      <div className="flex-shrink-0 ml-4">
                        <button
                          className="ml-2 px-4 py-2 bg-blue-500 text-white rounded-lg mr-2 text-sm"
                          onClick={() => setEditingReply(reply)}
                        >
                          Edit
                        </button>
                        <button
                          className="ml-2 px-4 py-2 bg-red-500 text-white rounded-lg text-sm"
                          onClick={() => deleteQuickReply(reply.id, reply.type as "all" | "self")}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {reply.image && (
              <div className="mt-2">
                <button
                  onClick={() => toggleItem(reply.id, 'image')}
                  className="text-blue-500 underline mb-2"
                >
                  {expandedItems[reply.id]?.image ? 'Hide Image' : 'Show Image'}
                </button>
                {expandedItems[reply.id]?.image && (
                  <img
                    src={reply.image}
                    alt="Quick Reply Image"
                    className="rounded-lg cursor-pointer w-full h-full object-contain"
                    onClick={() => window.open(reply.image ?? '', '_blank')}
                  />
                )}
              </div>
            )}
            {reply.document && (
              <div className="mt-2">
                <button
                  onClick={() => toggleItem(reply.id, 'document')}
                  className="text-blue-500 underline mb-2"
                >
                  {expandedItems[reply.id]?.document ? 'Hide Document' : 'Show Document'}
                </button>
                {expandedItems[reply.id]?.document && (
                  <iframe
                    src={reply.document}
                    title="Document"
                    className="border rounded cursor-pointer w-full"
                    style={{ height: '100vh' }}
                    onClick={() => window.open(reply.document ?? '', '_blank')}
                  />
                )}
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
  );
};

export default QuickRepliesPage;

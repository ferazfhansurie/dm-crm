import React, { useRef, useState, useEffect } from "react";
import axios from "axios";
import Button from "@/components/Base/Button";
import { getAuth } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { DocumentReference, updateDoc, getDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { getFirestore, collection, doc, setDoc, DocumentSnapshot } from 'firebase/firestore';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import LoadingIcon from "@/components/Base/LoadingIcon";
import { Tab } from '@headlessui/react'
import { getStorage, ref, uploadBytes, getDownloadURL, listAll } from 'firebase/storage';
import { Link } from "react-router-dom";
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'


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

let companyId = "001"; // Adjust the companyId as needed

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

interface ChatMessage {
  from_me: boolean;
  type: string;
  text: string;
  createdAt: string;
}

interface AssistantInfo {
  name: string;
  description: string;
  instructions: string;
  metadata: {
    files: Array<{
      id: string;
      name: string;
      url: string;
      vectorStoreId?: string;
      openAIFileId?: string;
    }>;
  };
}

interface MessageListProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  assistantName: string;
  deleteThread: () => void;
  threadId: string; // Add this line
}
interface AssistantConfig {
  id: string;
  name: string;
}

interface InstructionTemplate {
  id: string;
  name: string;
  instructions: string;
}

const MessageList: React.FC<MessageListProps> = ({ messages, onSendMessage, assistantName, deleteThread, threadId }) => {
  const [newMessage, setNewMessage] = useState('');

  const myMessageClass = "flex flex-col w-full max-w-[320px] leading-1.5 p-1 bg-[#dcf8c6] dark:bg-green-700 text-black dark:text-white rounded-tr-xl rounded-tl-xl rounded-br-sm rounded-bl-xl self-end ml-auto mr-2 text-left";
  const otherMessageClass = "bg-gray-700 text-white dark:bg-gray-600 rounded-tr-xl rounded-tl-xl rounded-br-xl rounded-bl-sm p-1 self-start text-left";

  const handleSendMessage = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (newMessage.trim()) {
        onSendMessage(newMessage);
        setNewMessage('');
      }
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-white dark:bg-gray-900 relative">
      <div className="flex items-center justify-between p-2 border-b border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-900">
        <div className="flex items-center">
          <div className="w-8 h-8 overflow-hidden rounded-full shadow-lg bg-gray-700 dark:bg-gray-600 flex items-center justify-center text-white mr-3">
            <span className="text-lg capitalize">{assistantName.charAt(0)}</span>
          </div>
          <div>
            <div className="font-semibold text-gray-800 dark:text-gray-200 capitalize">{assistantName}</div>
          </div>
        </div>
        <div>
          <button 
            onClick={deleteThread} 
            className={`px-4 py-2 text-white rounded flex items-center ${!threadId ? 'bg-gray-500 dark:bg-gray-600 cursor-not-allowed' : 'bg-red-500 dark:bg-red-600'} active:scale-95`}
            disabled={!threadId}
          >
            Delete Thread
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 dark:bg-gray-900">
        {messages.slice().reverse().map((message, index) => (
          <div key={index}>
            {message.text.split('||').map((splitText, splitIndex) => (
              <div
                key={`${index}-${splitIndex}`}
                className={`p-2 mb-2 rounded ${message.from_me ? myMessageClass : otherMessageClass}`}
                style={{
                  maxWidth: '70%',
                  width: `${message.type === 'image' || message.type === 'document' ? '350' : Math.min((splitText.trim().length || 0) * 10, 350)}px`,
                  minWidth: '75px'
                }}
              >
                {message.type === 'text' && (
                  <div className="whitespace-pre-wrap break-words">
                    {splitText.trim()}
                  </div>
                )}
                {splitIndex === message.text.split('||').length - 1 && (
                  <div className="message-timestamp text-xs text-gray-500 dark:text-gray-300 mt-1">
                    {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-300 dark:border-gray-700">
        <div className="flex items-center">
          <textarea
            className="w-full h-10 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 resize-none"
            placeholder="Type a message"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleSendMessage}
          />
          <button
            onClick={() => onSendMessage(newMessage)}
            className="px-4 py-2 ml-2 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

const Main: React.FC = () => {
  const [assistantInfo, setAssistantInfo] = useState<AssistantInfo>({
    name: '',
    description: '',
    instructions: '',
    metadata: {
      files: [],
    },
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [assistantId, setAssistantId] = useState<string>('');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string>('');
  const [isScrolledToBottom, setIsScrolledToBottom] = useState<boolean>(false);
  const updateButtonRef = useRef<HTMLButtonElement>(null);
  const [isFloating, setIsFloating] = useState(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [isMobile, setIsMobile] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [isWideScreen, setIsWideScreen] = useState(false);
  const [files, setFiles] = useState<Array<{
    id: string;
    name: string;
    url: string;
    vectorStoreId?: string;
  }>>([]);
  const [uploading, setUploading] = useState(false);
  const [assistants, setAssistants] = useState<AssistantConfig[]>([]);
  const [selectedAssistant, setSelectedAssistant] = useState<string>('');
  const [templates, setTemplates] = useState<InstructionTemplate[]>([]);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isFullscreenModalOpen, setIsFullscreenModalOpen] = useState(false);
  const [isToolsCollapsed, setIsToolsCollapsed] = useState(false);
  const [aiAutoResponse, setAiAutoResponse] = useState<boolean>(false);
  const [aiDelay, setAiDelay] = useState<number>(0);

  useEffect(() => {
    fetchCompanyId();
  }, []);

  useEffect(() => {
    if (companyId) {
      fetchFirebaseConfig(companyId);
      fetchFiles();
    }
  }, [companyId]);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768); // Adjust this breakpoint as needed
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);

    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  useEffect(() => {
    const checkScreenWidth = () => {
      setIsWideScreen(window.innerWidth >= 1024); // Adjust this breakpoint as needed
    };

    checkScreenWidth();
    window.addEventListener('resize', checkScreenWidth);

    return () => window.removeEventListener('resize', checkScreenWidth);
  }, []);

  useEffect(() => {
    if (companyId) {
      fetchTemplates();
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      fetchAiSettings();
    }
  }, [companyId]);

  const fetchCompanyId = async () => {
    const user = getAuth().currentUser;
    if (!user) {
      console.error("No user is logged in");
      setError("No user is logged in");
      return;
    }
  
    try {
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error("User document does not exist");
        setError("User document does not exist");
        return;
      }
  
      const dataUser = docUserSnapshot.data();
      setCompanyId(dataUser.companyId);
      setThreadId(dataUser.threadid); // Set threadId here
      setUserRole(dataUser.role); // Set the user's role
    } catch (error) {
      console.error("Error fetching company ID:", error);
      setError("Failed to fetch company ID");
    }
  };

  const fetchFirebaseConfig = async (companyId: string) => {
    try {
      const companyDoc = await getDoc(doc(firestore, "companies", companyId));
      const tokenDoc = await getDoc(doc(firestore, "setting", "token"));
      
      if (companyDoc.exists() && tokenDoc.exists()) {
        const companyData = companyDoc.data();
        const tokenData = tokenDoc.data();
        
        // Initialize assistants array with the primary assistant
        const assistantConfigs: AssistantConfig[] = [
          { id: companyData.assistantId, name: companyData.phone1 || 'Assistant 1' }
        ];

        // Check phoneCount and add additional assistants if they exist
        const phoneCount = parseInt(companyData.phoneCount || '1');
        if (phoneCount >= 2 && companyData.assistantId2) {
          assistantConfigs.push({ 
            id: companyData.assistantId2, 
            name: companyData.phone2 || 'Assistant 2' 
          });
        }
        if (phoneCount >= 3 && companyData.assistantId3) {
          assistantConfigs.push({ 
            id: companyData.assistantId3, 
            name: companyData.phone3 || 'Assistant 3' 
          });
        }

        setAssistants(assistantConfigs);
        setApiKey(tokenData.openai);
        
        // Set default selected assistant
        setSelectedAssistant(companyData.assistantId);
        setAssistantId(companyData.assistantId);
      }
    } catch (error) {
      console.error("Error fetching Firebase config:", error);
      setError("Failed to fetch Firebase config");
    }
  };

  const fetchAssistantInfo = async (assistantId: string, apiKey: string) => {
    
    setLoading(true);
    try {
      const response = await axios.get(`https://api.openai.com/v1/assistants/${assistantId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });
      const { name, description = "", instructions = "" } = response.data;
      setAssistantInfo({ name, description, instructions, metadata: { files: [] } });
    } catch (error) {
      console.error("Error fetching assistant information:", error);
      setError("Failed to fetch assistant information");
    } finally {
      setLoading(false);
    }
  };

  const updateAssistantInfo = async () => {
    if (userRole === "3") {
      setError("You do not have permission to edit the assistant.");
      return;
    }

    if (!assistantInfo || !assistantId || !apiKey) {
      console.error("Assistant info, assistant ID, or API key is missing.");
      setError("Assistant info, assistant ID, or API key is missing.");
      return;
    }

    

    // Get all unique vector store IDs from files
    const vectorStoreIds = [...new Set(files.map(file => file.vectorStoreId).filter(Boolean))];

    const payload = {
      name: assistantInfo.name || '',
      description: assistantInfo.description || '',
      instructions: assistantInfo.instructions,
      tools: [{ type: "file_search" }],
      tool_resources: {
        file_search: {
          vector_store_ids: vectorStoreIds
        }
      }
    };

    try {
      const response = await axios.post(`https://api.openai.com/v1/assistants/${assistantId}`, payload, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      
      toast.success('Assistant updated successfully');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error updating assistant information:', error.response?.data);
        setError(`Failed to update assistant information: ${error.response?.data.error.message}`);
      } else {
        console.error('Error updating assistant information:', error);
        setError('Failed to update assistant information');
      }
    }
  };

  const sendMessageToAssistant = async (messageText: string) => {
    const newMessage: ChatMessage = {
      from_me: true,
      type: 'text',
      text: messageText,
      createdAt: new Date().toISOString(),
    };
  
    // Clear dummy messages if they are present
    setMessages(prevMessages => {
      if (prevMessages.some(message => message.createdAt === '2024-05-29T10:00:00Z' || message.createdAt === '2024-05-29T10:01:00Z')) {
        return [newMessage];
      } else {
        return [newMessage, ...prevMessages];
      }
    });
  
     // Log assistantId
  
    try {
      const user = getAuth().currentUser;
      if (!user) {
        console.error("User not authenticated");
        setError("User not authenticated");
        return;
      }
   
      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        
        return;
      }
      const dataUser = docUserSnapshot.data();
      const companyId = dataUser.companyId;
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        
        return;
      }
      const data2 = docSnapshot.data();
      const baseUrl = data2.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';
      const res = await axios.get(`${baseUrl}/api/assistant-test/`, {
        params: {
          message: messageText,
          email: user.email!,
          assistantid: assistantId
        },
      });
      const data = res.data;
      
  
      const assistantResponse: ChatMessage = {
        from_me: false,
        type: 'text',
        text: data.answer,
        createdAt: new Date().toISOString(),
      };
  
      setMessages(prevMessages => [assistantResponse, ...prevMessages]);
      setThreadId(user.email!); // Update the threadId to user email as a placeholder
  
    } catch (error) {
      console.error('Error:', error);
      setError("Failed to send message");
    }
  };

  useEffect(() => {
    if (assistantId && apiKey) {
      fetchAssistantInfo(assistantId, apiKey);
    }
  }, [assistantId, apiKey]);

  const deleteThread = async () => {
    const user = getAuth().currentUser;
    if (!user) {
      console.error("No user is logged in");
      setError("No user is logged in");
      return;
    }
  
    try {
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error("User document does not exist");
        setError("User document does not exist");
        return;
      }
  
      await updateDoc(docUserRef, { threadid: '' });
      setThreadId(''); // Clear threadId in state
      
      // Clear the messages state
      setMessages([]);
    } catch (error) {
      console.error("Error updating thread ID:", error);
      setError("Failed to update thread ID");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setError(null);
    const { name, value } = e.target;
    setAssistantInfo({ ...assistantInfo, [name]: value });
  };
  
  const handleFocus = () => {
    setError(null);
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrolledToBottom = (window.innerHeight + window.scrollY) >= document.body.offsetHeight;
      setIsFloating(!scrolledToBottom);
    };
  
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initialize on mount
  
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const fetchFiles = async () => {
    if (!companyId) return;

    const filesCollectionRef = collection(firestore, 'companies', companyId, 'assistantFiles');
    
    try {
      const querySnapshot = await getDocs(filesCollectionRef);
      const fileList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Array<{id: string, name: string, url: string}>;
      setFiles(fileList);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to fetch files');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !companyId) return;

    setUploading(true);
    const storage = getStorage(app);
    const storageRef = ref(storage, `files/${companyId}/${file.name}`);

    try {
      // Upload to Firebase Storage
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      // First, upload file to OpenAI
      const formData = new FormData();
      formData.append('file', file);
      formData.append('purpose', 'assistants');
      
      const openAIFileResponse = await axios.post('https://api.openai.com/v1/files', formData, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      // Create or get existing vector store
      let vectorStoreId;
      try {
        // Try to get existing vector store
        const vectorStoreResponse = await axios.get(`https://api.openai.com/v1/vector_stores/${companyId}-knowledge-base`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        });
        vectorStoreId = vectorStoreResponse.data.id;
      } catch (error) {
        // If not found, create new vector store
        const createVectorStoreResponse = await axios.post('https://api.openai.com/v1/vector_stores', {
          name: `${companyId}-knowledge-base`,
        }, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        });
        vectorStoreId = createVectorStoreResponse.data.id;
      }

      // Add file to vector store
      await axios.post(`https://api.openai.com/v1/vector_stores/${vectorStoreId}/files`, {
        file_id: openAIFileResponse.data.id
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });
      
      // Add file info to Firestore
      const fileDocRef = doc(collection(firestore, 'companies', companyId, 'assistantFiles'));
      await setDoc(fileDocRef, {
        name: file.name,
        url: downloadURL,
        vectorStoreId: vectorStoreId,
        openAIFileId: openAIFileResponse.data.id
      });

      const newFile = { 
        id: fileDocRef.id, 
        name: file.name, 
        url: downloadURL,
        vectorStoreId: vectorStoreId
      };
      setFiles(prevFiles => [...prevFiles, newFile]);

      // Update the assistant with the new vector store
      await updateAssistantInfo();
      
      toast.success('File uploaded successfully');

    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const updateAssistantWithFile = async (file: {id: string, name: string, url: string}) => {
    try {
      const updatedFiles = [...(assistantInfo.metadata?.files || []), file];
      await updateAssistantMetadata(updatedFiles);
      
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error updating assistant with file:', error.response?.data);
        toast.error(`Failed to update assistant with file: ${error.response?.data?.error?.message || 'Unknown error'}`);
      } else {
        console.error('Error updating assistant with file:', error);
        toast.error('Failed to update assistant with file: Unknown error');
      }
    }
  };

  const deleteFile = async (fileId: string) => {
    if (!companyId) return;
  
    try {
      await deleteDoc(doc(firestore, 'companies', companyId, 'assistantFiles', fileId));
      
      // Remove file from local state
      setFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));
  
      // Update assistant metadata to remove the file
      const updatedFiles = assistantInfo.metadata?.files.filter(file => file.id !== fileId) || [];
      await updateAssistantMetadata(updatedFiles);
  
      toast.success('File deleted successfully');
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  const updateAssistantMetadata = async (updatedFiles: Array<{id: string, name: string, url: string}>) => {
    try {
      const response = await axios.post(`https://api.openai.com/v1/assistants/${assistantId}`, {
        metadata: {
          ...assistantInfo.metadata,
          files: JSON.stringify(updatedFiles)
        }
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        }
      });
      
      
      
      // Update local state
      setAssistantInfo(prevInfo => ({
        ...prevInfo,
        metadata: {
          ...prevInfo.metadata,
          files: updatedFiles
        }
      }));

      toast.success('Assistant metadata updated successfully');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error updating assistant metadata:', error.response?.data);
        toast.error(`Failed to update assistant metadata: ${error.response?.data?.error?.message || 'Unknown error'}`);
      } else {
        console.error('Error updating assistant metadata:', error);
        toast.error('Failed to update assistant metadata: Unknown error');
      }
    }
  };
  const handleAssistantChange = (assistantId: string) => {
    setSelectedAssistant(assistantId);
    setAssistantId(assistantId);
    setMessages([]); // Clear messages when switching assistants
    fetchAssistantInfo(assistantId, apiKey);
  };
  
  // Only show the assistant selector if there are multiple assistants
  const renderAssistantSelector = () => {
    if (assistants.length <= 1) return null;

    return (
      <div className="w-full mb-4">
        <select
          value={selectedAssistant}
          onChange={(e) => handleAssistantChange(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
        >
          {assistants.map((assistant) => (
            <option key={assistant.id} value={assistant.id}>
              {assistant.name}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const fetchTemplates = async () => {
    if (!companyId) return;
    
    try {
      const templatesCollectionRef = collection(firestore, 'companies', companyId, 'instructionTemplates');
      const querySnapshot = await getDocs(templatesCollectionRef);
      const templatesList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InstructionTemplate[];
      setTemplates(templatesList);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to fetch templates');
    }
  };

  const saveTemplate = async () => {
    if (!companyId || !assistantInfo.instructions.trim()) {
      toast.error('Please provide instructions to save');
      return;
    }

    try {
      const timestamp = new Date().toLocaleString(); // Format: M/D/YYYY, H:MM:SS AM/PM
      const templatesCollectionRef = collection(firestore, 'companies', companyId, 'instructionTemplates');
      await setDoc(doc(templatesCollectionRef), {
        name: timestamp,
        instructions: assistantInfo.instructions
      });

      toast.success('Template saved successfully');
      fetchTemplates(); // Refresh templates list
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    }
  };

  const loadTemplate = (template: InstructionTemplate) => {
    setAssistantInfo(prev => ({
      ...prev,
      instructions: template.instructions
    }));
    toast.success('Template loaded');
  };

  const deleteTemplate = async (templateId: string) => {
    if (!companyId) return;

    try {
      await deleteDoc(doc(firestore, 'companies', companyId, 'instructionTemplates', templateId));
      toast.success('Template deleted successfully');
      fetchTemplates(); // Refresh templates list
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const renderTemplateSection = () => (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <div className="flex gap-2">
          <button
            onClick={saveTemplate}
            className="px-4 py-2 bg-white dark:bg-gray-700 text-green-600 dark:text-green-300 border border-green-200 dark:border-green-700 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/50 shadow-sm active:scale-95 transition-all duration-200 flex items-center gap-2"
            disabled={userRole === "3"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h-2v5.586l-1.293-1.293z" />
            </svg>
            Save Current
          </button>
          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="px-4 py-2 bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/50 shadow-sm active:scale-95 transition-all duration-200 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            View Templates
          </button>
        </div>
      </div>

      <Transition appear show={isTemplateModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsTemplateModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 mb-4"
                  >
                    Saved Templates
                  </Dialog.Title>
                  <div className="max-h-[60vh] overflow-y-auto">
                    {templates.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                        No templates saved yet
                      </p>
                    ) : (
                      templates.map((template) => (
                        <div 
                          key={template.id} 
                          className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                              {template.name}
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  loadTemplate(template);
                                  setIsTemplateModalOpen(false);
                                }}
                                className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 text-sm flex items-center gap-1"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h-2v5.586l-1.293-1.293z" />
                                </svg>
                                Load
                              </button>
                              <button
                                onClick={() => deleteTemplate(template.id)}
                                className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 text-sm flex items-center gap-1"
                                disabled={userRole === "3"}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                Delete
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                            {template.instructions}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="mt-4">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 dark:bg-gray-600 px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      onClick={() => setIsTemplateModalOpen(false)}
                    >
                      Close
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );

  const fetchAiSettings = async () => {
    if (!companyId) return;

    try {
      const settingsRef = doc(firestore, 'companies', companyId, 'settings', 'ai');
      const settingsSnapshot = await getDoc(settingsRef);
      
      if (settingsSnapshot.exists()) {
        const data = settingsSnapshot.data();
        setAiAutoResponse(data.autoResponse || false);
        setAiDelay(data.responseDelay || 0);
      }
    } catch (error) {
      console.error('Error fetching AI settings:', error);
      toast.error('Failed to fetch AI settings');
    }
  };

  const handleSaveAiSettings = async () => {
    if (!companyId) return;

    try {
      const settingsRef = doc(firestore, 'companies', companyId, 'settings', 'ai');
      await setDoc(settingsRef, {
        autoResponse: aiAutoResponse,
        responseDelay: aiDelay
      }, { merge: true });
      
      toast.success('AI settings saved successfully');
    } catch (error) {
      console.error('Error saving AI settings:', error);
      toast.error('Failed to save AI settings');
    }
  };

  return (
    <div className="flex justify-center h-screen bg-gray-100 dark:bg-gray-900">
      <div className={`w-full ${isWideScreen ? 'max-w-6xl flex' : 'max-w-lg'}`}>
        {isWideScreen ? (
          <>
            <div className="w-1/2 pl-2 pr-2 ml-2 mr-2 mt-4 overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center w-3/4 max-w-lg text-center p-4">
               
                    <div className="mt-2 text-xs p-2 dark:text-gray-200">Fetching Assistant...</div>
                    <LoadingIcon icon="three-dots" className="w-20 h-20 p-4" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    {assistants.length > 1 ? (
                      <select
                        value={selectedAssistant}
                        onChange={(e) => handleAssistantChange(e.target.value)}
                        className="w-full p-2 text-2xl font-bold border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {assistants.map((assistant) => (
                          <option key={assistant.id} value={assistant.id}>
                            {assistant.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <h1 className="text-2xl font-bold dark:text-gray-200">
                        {assistantInfo.name || "Assistant Name"}
                      </h1>
                    )}
                  </div>
                  <div className="mb-4">
                    <label className="mb-2 text-lg font-medium capitalize dark:text-gray-200" htmlFor="name">
                      Name
                    </label>
                    <div className="relative">
                      <input
                        id="name"
                        name="name"
                        type="text"
                        className="w-full p-3 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                        placeholder="Name your assistant"
                        value={assistantInfo.name}
                        onChange={handleInputChange}
                        onFocus={handleFocus}
                        disabled={userRole === "3"}
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="mb-2 text-lg font-medium dark:text-gray-200" htmlFor="instructions">
                      Instructions
                    </label>
                    {renderTemplateSection()}
                    <div className="relative">
                      <textarea
                        id="instructions"
                        name="instructions"
                        className="w-full p-3 border border-gray-300 rounded-lg h-[600px] text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Tell your assistant what to do"
                        value={assistantInfo.instructions}
                        onChange={handleInputChange}
                        onFocus={handleFocus}
                        rows={35}
                        disabled={userRole === "3"}
                      />
                      <button
                        onClick={() => {
                          console.log('Opening fullscreen modal');
                          setIsFullscreenModalOpen(true);
                        }}
                        className="absolute top-2 right-2 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        title="Edit in fullscreen"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label className="mb-2 text-lg font-medium dark:text-gray-200" htmlFor="file-upload">
                      Knowledge Base
                    </label>
                    <input
                      id="file-upload"
                      type="file"
                      onChange={handleFileUpload}
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                      disabled={uploading || userRole === "3"}
                    />
                    {uploading && <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Uploading...</p>}
                  </div>
                  <div className="mb-4">
                    <ul className="list-disc list-inside">
                      {files.map((file) => (
                        <li key={file.id} className="text-sm text-blue-500 flex items-center justify-between">
                          <a href={file.url} target="_blank" rel="noopener noreferrer">{file.name}</a>
                          <button 
                            onClick={() => deleteFile(file.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            Delete
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="mt-2 mb-4">
                    <div className="flex flex-wrap items-center gap-4">
                      <button 
                        ref={updateButtonRef}
                        onClick={updateAssistantInfo} 
                        className={`px-5 py-2.5 bg-primary text-white rounded-lg transition-transform ${isFloating ? 'fixed bottom-4 left-20' : 'relative'} hover:bg-primary/90 active:scale-95 font-medium ${userRole === "3" ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onFocus={handleFocus}
                        disabled={userRole === "3"}
                      >
                        <span className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                          </svg>
                          Update Assistant
                        </span>
                      </button>
                      <Link to="/users-layout-2/builder">
                        <Button variant="outline-primary" className="shadow-sm px-4 py-2.5 font-medium dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:bg-gray-700">
                          <span className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                              <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                            </svg>
                            Prompt Builder
                          </span>
                        </Button>
                      </Link>
                      <a 
                        href={`https://web.jutasoftware.co/guest-chat/${companyId}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline-primary" className="shadow-sm px-4 py-2.5 font-medium dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:bg-gray-700">
                          <span className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                            </svg>
                            Guest Chat
                          </span>
                        </Button>
                      </a>
                    </div>
                  </div>
                  
                  <div className="mb-5 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-100 dark:border-blue-800 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-md font-medium text-blue-700 dark:text-blue-300">AI & Follow-up Tools</h3>
                      <button 
                        onClick={() => setIsToolsCollapsed(!isToolsCollapsed)}
                        className="text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100 focus:outline-none"
                        aria-label={isToolsCollapsed ? "Expand tools" : "Collapse tools"}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transform transition-transform duration-200 ${isToolsCollapsed ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                    {!isToolsCollapsed && (
                      <>
                        <div className="flex flex-wrap gap-3 mt-3 transition-all duration-300">
                          <Link to="/a-i-responses">
                            <Button variant="secondary" className="shadow-sm bg-white dark:bg-gray-700 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/50 px-4 py-2">
                              <span className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                AI Responses
                              </span>
                            </Button>
                          </Link>
                          <Link to="/a-i-generative-responses">
                            <Button variant="secondary" className="shadow-sm bg-white dark:bg-gray-700 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/50 px-4 py-2">
                              <span className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                  <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                                </svg>
                                AI Generative Responses
                              </span>
                            </Button>
                          </Link>
                          <Link to="/follow-ups">
                            <Button variant="secondary" className="shadow-sm bg-white dark:bg-gray-700 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/50 px-4 py-2">
                              <span className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                                </svg>
                                Follow Ups
                              </span>
                            </Button>
                          </Link>
                          {companyId === "0123" && (
                            <Link to="/storage-pricing">
                              <Button variant="secondary" className="shadow-sm bg-white dark:bg-gray-700 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/50 px-4 py-2">
                                <span className="flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                                    <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                                  </svg>
                                  Storage Pricing
                                </span>
                              </Button>
                            </Link>
                          )}
                        </div>
                        
                        {/* AI Settings */}
                        <div className="mt-4 space-y-4">
                          <h3 className="text-md font-medium text-gray-700 dark:text-gray-300">AI Response Settings</h3>
                          
                          <div>
                            <label className="flex items-center space-x-2 mb-2 text-gray-700 dark:text-gray-300">
                              <input
                                type="checkbox"
                                checked={aiAutoResponse}
                                onChange={(e) => setAiAutoResponse(e.target.checked)}
                                className="form-checkbox h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                disabled={userRole === "3"}
                              />
                              <span>Disable AI Auto-Response for New Contacts</span>
                            </label>
                          </div>

                          <div>
                            <label className="block mb-2 text-gray-700 dark:text-gray-300">Response Delay (seconds)</label>
                            <input
                              type="number"
                              min="0"
                              max="300"
                              value={aiDelay}
                              onChange={(e) => setAiDelay(Number(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              disabled={userRole === "3"}
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Set how long the AI should wait before responding (0-300 seconds)
                            </p>
                          </div>

                          <div>
                            <button
                              onClick={handleSaveAiSettings}
                              className="px-4 py-2 bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/50 shadow-sm active:scale-95 transition-all duration-200 flex items-center gap-2"
                              disabled={userRole === "3"}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Save AI Settings
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {error && <div className="mt-4 text-red-500">{error}</div>}
                </>
              )}
            </div>
            <div className="w-1/2 pr-2">
              <MessageList 
                messages={messages} 
                onSendMessage={sendMessageToAssistant} 
                assistantName={assistantInfo?.name} 
                deleteThread={deleteThread} 
                threadId={threadId}
              />
            </div>
          </>
        ) : (
          <Tab.Group as="div" className="flex flex-col w-full h-full">
            <Tab.List className="flex bg-gray-100 dark:bg-gray-900 p-2 sticky top-0 z-10">
              <Tab
                className={({ selected }) =>
                  `w-1/2 py-2 text-sm font-medium text-center rounded-lg ${
                    selected
                      ? 'bg-white text-blue-600 dark:bg-gray-800 dark:text-blue-400'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  } transition-colors duration-200`
                }
              >
                Assistant Config
              </Tab>
              <Tab
                className={({ selected }) =>
                  `w-1/2 py-2 text-sm font-medium text-center rounded-lg ${
                    selected
                      ? 'bg-white text-blue-600 dark:bg-gray-800 dark:text-blue-400'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  } transition-colors duration-200`
                }
              >
                Chat
              </Tab>
            </Tab.List>
            <Tab.Panels className="flex-1 overflow-hidden">
              <Tab.Panel className="h-full overflow-auto p-4 dark:bg-gray-900">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="flex flex-col items-center w-3/4 max-w-lg text-center p-15">
                    
                      <div className="mt-2 text-xs p-15 dark:text-gray-200">Fetching Assistant...</div>
                      <LoadingIcon icon="three-dots" className="w-20 h-20 p-4" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <label className="mb-2 text-lg font-medium capitalize dark:text-gray-200" htmlFor="name">
                        Name
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        className="w-full p-3 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                        placeholder="Name your assistant"
                        value={assistantInfo.name}
                        onChange={handleInputChange}
                        onFocus={handleFocus}
                        disabled={userRole === "3"}
                      />
                    </div>
                    <div className="mb-4">
                      <label className="mb-2 text-lg font-medium dark:text-gray-200" htmlFor="description">
                        Description
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        className="w-full p-3 border border-gray-300 rounded-lg h-24 text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Add a short description of what this assistant does"
                        value={assistantInfo.description}
                        onChange={handleInputChange}
                        onFocus={handleFocus}
                        disabled={userRole === "3"}
                      />
                    </div>
                    <div className="mb-4">
                      <label className="mb-2 text-lg font-medium dark:text-gray-200" htmlFor="instructions">
                        Instructions
                      </label>
                      {renderTemplateSection()}
                      <div className="relative">
                        <textarea
                          id="instructions"
                          name="instructions"
                          className="w-full p-3 border border-gray-300 rounded-lg h-[600px] text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Tell your assistant what to do"
                          value={assistantInfo.instructions}
                          onChange={handleInputChange}
                          onFocus={handleFocus}
                          rows={35}
                          disabled={userRole === "3"}
                        />
                        <button
                          onClick={() => {
                            console.log('Opening fullscreen modal');
                            setIsFullscreenModalOpen(true);
                          }}
                          className="absolute top-2 right-2 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          title="Edit in fullscreen"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="mb-2 text-lg font-medium dark:text-gray-200" htmlFor="file-upload">
                        Knowledge Base
                      </label>
                      <input
                        id="file-upload"
                        type="file"
                        onChange={handleFileUpload}
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                        disabled={uploading}
                      />
                      {uploading && <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Uploading...</p>}
                    </div>
                    <div className="mb-4">
                      <ul className="list-disc list-inside">
                        {files.map((file) => (
                          <li key={file.id} className="text-sm text-blue-500 flex items-center justify-between">
                            <a href={file.url} target="_blank" rel="noopener noreferrer">{file.name}</a>
                            <button 
                              onClick={() => deleteFile(file.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              Delete
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="mt-8 mb-4">
                      <h3 className="text-md font-medium mb-3 text-gray-700 dark:text-gray-300">Assistant Configuration</h3>
                      <div className="flex flex-wrap items-center gap-4">
                        <button 
                          ref={updateButtonRef}
                          onClick={updateAssistantInfo} 
                          className={`px-5 py-2.5 bg-primary text-white rounded-lg transition-transform ${isFloating ? 'fixed bottom-4 left-20' : 'relative'} hover:bg-primary/90 active:scale-95 font-medium ${userRole === "3" ? 'opacity-50 cursor-not-allowed' : ''}`}
                          onFocus={handleFocus}
                          disabled={userRole === "3"}
                        >
                          <span className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                            </svg>
                            Update Assistant
                          </span>
                        </button>
                        <Link to="builder">
                          <Button variant="outline-primary" className="shadow-sm px-4 py-2.5 font-medium">
                            <span className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                              </svg>
                              Prompt Builder
                            </span>
                          </Button>
                        </Link>
                      </div>
                    </div>
                    
                    {/* Featured navigation buttons for mobile view */}
                    <div className="mb-5 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-100 dark:border-blue-800 shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-md font-medium text-blue-700 dark:text-blue-300">AI & Follow-up Tools</h3>
                        <button 
                          onClick={() => setIsToolsCollapsed(!isToolsCollapsed)}
                          className="text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100 focus:outline-none"
                          aria-label={isToolsCollapsed ? "Expand tools" : "Collapse tools"}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transform transition-transform duration-200 ${isToolsCollapsed ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                      {!isToolsCollapsed && (
                        <div className="flex flex-wrap gap-3 mt-3 transition-all duration-300">
                          <Link to="/a-i-responses">
                            <Button variant="secondary" className="shadow-sm bg-white dark:bg-gray-700 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/50 px-4 py-2">
                              <span className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                AI Responses
                              </span>
                            </Button>
                          </Link>
                          <Link to="/a-i-generative-responses">
                            <Button variant="secondary" className="shadow-sm bg-white dark:bg-gray-700 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/50 px-4 py-2">
                              <span className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                  <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                                </svg>
                                AI Generative Responses
                              </span>
                            </Button>
                          </Link>
                          <Link to="/follow-ups-select">
                            <Button variant="secondary" className="shadow-sm bg-white dark:bg-gray-700 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/50 px-4 py-2">
                              <span className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                                </svg>
                                Follow Ups
                              </span>
                            </Button>
                          </Link>
                          {companyId === "0123" && (
                            <Link to="/storage-pricing">
                              <Button variant="secondary" className="shadow-sm bg-white dark:bg-gray-700 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/50 px-4 py-2">
                                <span className="flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                                    <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                                  </svg>
                                  Storage Pricing
                                </span>
                              </Button>
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* AI Settings Section for mobile */}
                    <div className="mt-8 mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                      <h3 className="text-md font-medium mb-3 text-gray-700 dark:text-gray-300">AI Response Settings</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="flex items-center space-x-2 mb-2 text-gray-700 dark:text-gray-300">
                            <input
                              type="checkbox"
                              checked={aiAutoResponse}
                              onChange={(e) => setAiAutoResponse(e.target.checked)}
                              className="form-checkbox h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                              disabled={userRole === "3"}
                            />
                            <span>Disable AI Auto-Response for New Contacts</span>
                          </label>
                        </div>

                        <div>
                          <label className="block mb-2 text-gray-700 dark:text-gray-300">Response Delay (seconds)</label>
                          <input
                            type="number"
                            min="0"
                            max="300"
                            value={aiDelay}
                            onChange={(e) => setAiDelay(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={userRole === "3"}
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Set how long the AI should wait before responding (0-300 seconds)
                          </p>
                        </div>

                        <div>
                          <button
                            onClick={handleSaveAiSettings}
                            className="px-4 py-2 bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/50 shadow-sm active:scale-95 transition-all duration-200 flex items-center gap-2"
                            disabled={userRole === "3"}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Save AI Settings
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {error && <div className="mt-4 text-red-500">{error}</div>}
                  </>
                )}
              </Tab.Panel>
              <Tab.Panel className="h-full flex flex-col">
                <MessageList 
                  messages={messages} 
                  onSendMessage={sendMessageToAssistant} 
                  assistantName={assistantInfo?.name || 'Assistant'} 
                  deleteThread={deleteThread} 
                  threadId={threadId}
                />
              </Tab.Panel>
            </Tab.Panels>
          </Tab.Group>
        )}
        <ToastContainer />
      </div>

      {/* Fullscreen Modal */}
      <Transition appear show={isFullscreenModalOpen} as={Fragment}>
        <Dialog 
          as="div" 
          className="relative z-50" 
          onClose={() => setIsFullscreenModalOpen(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-screen h-screen transform overflow-hidden bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                  <div className="flex justify-between items-center mb-4">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100"
                    >
                      Edit Instructions
                    </Dialog.Title>
                    <button
                      onClick={() => setIsFullscreenModalOpen(false)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <textarea
                    className="w-full h-[calc(100vh-120px)] p-4 text-base bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={assistantInfo.instructions}
                    onChange={handleInputChange}
                    name="instructions"
                    placeholder="Tell your assistant what to do"
                    disabled={userRole === "3"}
                  />
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}

export default Main;
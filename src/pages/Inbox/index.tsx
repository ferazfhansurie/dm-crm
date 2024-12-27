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
    files: Array<{id: string, name: string, url: string}>;
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
          <div
            className={`p-2 mb-2 rounded ${message.from_me ? myMessageClass : otherMessageClass}`}
            key={index}
            style={{
              maxWidth: '70%',
              width: `${message.type === 'image' || message.type === 'document' ? '350' : Math.min((message.text?.length || 0) * 10, 350)}px`,
              minWidth: '75px'
            }}
          >
            {message.type === 'text' && (
              <div className="whitespace-pre-wrap break-words">
                {message.text}
              </div>
            )}
            <div className="message-timestamp text-xs text-gray-500 dark:text-gray-300 mt-1">
              {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
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
  const [files, setFiles] = useState<Array<{id: string, name: string, url: string}>>([]);
  const [uploading, setUploading] = useState(false);
  const [assistants, setAssistants] = useState<AssistantConfig[]>([]);
  const [selectedAssistant, setSelectedAssistant] = useState<string>('');

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
    console.log("Fetching assistant info with ID:", assistantId);
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

    console.log("Updating assistant info with ID:", assistantId);

    const payload = {
      name: assistantInfo.name || '',
      description: assistantInfo.description || '',
      instructions: assistantInfo.instructions
    };

    console.log("Payload being sent:", payload);

    try {
      const response = await axios.post(`https://api.openai.com/v1/assistants/${assistantId}`, payload, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      console.log('Assistant info updated successfully:', response.data);
      toast.success('Assistant updated successfully');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Error is an AxiosError
        console.error('Error updating assistant information:', error.response?.data);
        setError(`Failed to update assistant information: ${error.response?.data.error.message}`);
      } else {
        // Generic error handling
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
  
    console.log("Sending message with Assistant ID:", assistantId); // Log assistantId
  
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
        console.log('No such document!');
        return;
      }
      const dataUser = docUserSnapshot.data();
      const companyId = dataUser.companyId;
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.log('No such document!');
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
      console.log(data);
  
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
      console.log(`Thread ID set to empty string successfully.`);
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
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      // Add file info to Firestore
      const fileDocRef = doc(collection(firestore, 'companies', companyId, 'assistantFiles'));
      await setDoc(fileDocRef, {
        name: file.name,
        url: downloadURL
      });

      const newFile = { id: fileDocRef.id, name: file.name, url: downloadURL };
      setFiles(prevFiles => [...prevFiles, newFile]);
      toast.success('File uploaded successfully');

      // Update the assistant with the new file information
      await updateAssistantWithFile(newFile);
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
      console.log('Assistant updated with new file');
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
          files: JSON.stringify(updatedFiles) // Stringify the files array
        }
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v1'
        }
      });
      console.log('Assistant metadata updated:', response.data);
      
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
                    <label className="mb-2 text-lg font-medium dark:text-gray-200" htmlFor="description">
                      Description
                    </label>
                    <div className="relative">
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
                  </div>
                  <div className="mb-4">
                    <label className="mb-2 text-lg font-medium dark:text-gray-200" htmlFor="instructions">
                      Instructions
                    </label>
                    <div className="relative">
                      <textarea
                        id="instructions"
                        name="instructions"
                        className="w-full p-3 border border-gray-300 rounded-lg h-32 text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Tell your assistant what to do"
                        value={assistantInfo.instructions}
                        onChange={handleInputChange}
                        onFocus={handleFocus}
                        rows={10}
                        disabled={userRole === "3"}
                      />
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
                  <div>
                  <div className="flex items-center gap-4">
                      <button 
                        ref={updateButtonRef}
                        onClick={updateAssistantInfo} 
                        className={`px-4 py-2 bg-primary text-white rounded-lg transition-transform ${isFloating ? 'fixed bottom-4 left-20' : 'relative'} hover:bg-primary active:scale-95 ${userRole === "3" ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onFocus={handleFocus}
                        disabled={userRole === "3"}
                      >
                        Update Assistant
                      </button>
                      <Link to="/users-layout-2/builder">
                        <Button variant="primary" className="shadow-md">
                          Prompt Builder
                        </Button>
                      </Link>
                    </div>
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
                   
                      <textarea
                        id="instructions"
                        name="instructions"
                        className="w-full p-3 border border-gray-300 rounded-lg h-32 text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Instructions for the assistant"
                        value={assistantInfo.instructions}
                        onChange={handleInputChange}
                        onFocus={handleFocus}
                        disabled={userRole === "3"}
                        rows={5}
                      />
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
                    <div>
                      <button 
                        ref={updateButtonRef}
                        onClick={updateAssistantInfo} 
                        className={`px-4 py-2 m-2 bg-primary text-white rounded-lg transition-transform ${isFloating ? 'fixed bottom-4 left-20' : 'relative'} hover:bg-primary active:scale-95 ${userRole === "3" ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onFocus={handleFocus}
                        disabled={userRole === "3"}
                      >
                        Update Assistant
                      </button>
                      <Link to="builder">
              <Button variant="primary" className="mr-2 shadow-md">
                Prompt Builder
              </Button>
            </Link>
                    </div>
                    {error && <div className="mt-4 text-red-500">{error}</div>}
                  </>
                )}
              </Tab.Panel>
              <Tab.Panel className="h-full flex flex-col">
                <MessageList 
                  messages={messages} 
                  onSendMessage={sendMessageToAssistant} 
                  assistantName={assistantInfo?.name || 'Juta Assistant'} 
                  deleteThread={deleteThread} 
                  threadId={threadId}
                />
              </Tab.Panel>
            </Tab.Panels>
          </Tab.Group>
        )}
        <ToastContainer />
      </div>
    </div>
  );
}

export default Main;
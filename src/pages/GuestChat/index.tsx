import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import logoUrl from "@/assets/images/logo.png";
import LoadingIcon from "@/components/Base/LoadingIcon";
import { getAuth } from "firebase/auth";

// Firebase configuration
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

interface ChatMessage {
  from_me: boolean;
  type: string;
  text: string;
  createdAt: string;
}

interface MessageListProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  assistantName: string;
  onDeleteThread?: () => void;
  isLoading?: boolean;
}

const MessageList: React.FC<MessageListProps> = ({ messages, onSendMessage, assistantName, onDeleteThread, isLoading }) => {
  const [newMessage, setNewMessage] = useState('');

  const myMessageClass = "bg-[#4285f4] text-white rounded-2xl p-3 self-end text-left relative";
  const otherMessageClass = "bg-[#f1f1f1] text-gray-800 rounded-2xl p-3 self-start text-left relative";

  const LoadingDots = () => (
    <div className="flex space-x-1.5 items-center p-3">
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
    </div>
  );
  //hi hi hi hi
  const handleSendMessage = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (newMessage.trim()) {
        onSendMessage(newMessage);
        setNewMessage('');
      }
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white">
            <span className="text-lg font-semibold">{assistantName.charAt(0)}</span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Chat with {assistantName}</h2>
            <p className="text-sm text-gray-500">{assistantName} Specialized Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {onDeleteThread && (
            <button
              onClick={onDeleteThread}
              className="px-4 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600"
            >
              Clear Chat
            </button>
          )}
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.slice().reverse().map((message, index) => (
            <div key={index}>
              {message.text.split('||').map((splitText, splitIndex) => (
                <div
                  key={`${index}-${splitIndex}`}
                  className={`flex ${message.from_me ? 'justify-end' : 'justify-start'} mb-2`}
                >
                  <div
                    className={`${message.from_me ? myMessageClass : otherMessageClass} max-w-[70%]`}
                  >
                    <div className="whitespace-pre-wrap">{splitText.trim()}</div>
                    {splitIndex === message.text.split('||').length - 1 && (
                      <div className={`text-xs mt-1 ${message.from_me ? 'text-white/80' : 'text-gray-500'}`}>
                        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className={otherMessageClass}>
                <LoadingDots />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t p-4 bg-white">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleSendMessage}
            placeholder="Type your message here..."
            className="w-full px-4 py-2 border rounded-full focus:outline-none focus:border-blue-400"
          />
          <button
            onClick={() => {
              if (newMessage.trim()) {
                onSendMessage(newMessage);
                setNewMessage('');
              }
            }}
            className="p-2 rounded-full bg-[#4285f4] text-white hover:bg-blue-600"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

const GuestChat: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [assistantId, setAssistantId] = useState<string>('');
  const [assistantName, setAssistantName] = useState<string>('Assistant');
  const [loading, setLoading] = useState<boolean>(true);
  const [messageLoading, setMessageLoading] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string>('');

  // Add function to save messages to Firestore
  const saveMessagesToFirestore = async (messages: ChatMessage[]) => {
    if (!companyId || !sessionId) return;
    
    try {
      // Changed path to include company ID in the structure
      const chatRef = doc(firestore, "companies", companyId, "guestChats", sessionId);
      await updateDoc(chatRef, {
        messages,
        lastUpdated: new Date().toISOString()
      }).catch(() => {
        // If document doesn't exist, create it
        return setDoc(doc(firestore, "companies", companyId, "guestChats", sessionId), {
          messages,
          lastUpdated: new Date().toISOString()
        });
      });
    } catch (error) {
      console.error("Error saving messages:", error);
    }
  };

  // Add function to load messages from Firestore
  const loadMessagesFromFirestore = async (sessionId: string) => {
    try {
      // Changed path to include company ID in the structure
      if (!companyId) return;
      const chatRef = doc(firestore, "companies", companyId, "guestChats", sessionId);
      const chatDoc = await getDoc(chatRef);
      
      if (chatDoc.exists()) {
        const data = chatDoc.data();
        if (data.messages && Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  // Modify useEffect to load messages when session is retrieved
  useEffect(() => {
    const initializeChat = async () => {
      if (companyId) {
        const existingSessionId = localStorage.getItem(`guest-session-${companyId}`);
        
        if (existingSessionId) {
          setSessionId(existingSessionId);
          // First load existing messages
          await loadMessagesFromFirestore(existingSessionId);
          // Then fetch company config (which will only add welcome message if no messages exist)
          await fetchCompanyConfig(companyId);
          console.log(`Existing guest session resumed: ${existingSessionId}`);
        } else {
          const newSessionId = `guest-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          setSessionId(newSessionId);
          localStorage.setItem(`guest-session-${companyId}`, newSessionId);
          // For new sessions, fetch config first (which will add welcome message)
          await fetchCompanyConfig(companyId);
          console.log(`New guest session started: ${newSessionId}`);
        }
      } else {
        setError("Company ID not provided in URL");
        setLoading(false);
      }
    };

    initializeChat();
  }, [companyId]);

  // Add useEffect to save messages when they change
  useEffect(() => {
    if (messages.length > 0) {
      saveMessagesToFirestore(messages);
    }
  }, [messages]);

  // Modify deleteThread to also delete messages from Firestore
  const deleteThread = async () => {
    try {
      if (!companyId || !sessionId) {
        throw new Error("Missing company ID or session ID");
      }

      // Delete the chat document from Firestore
      const chatRef = doc(firestore, "companies", companyId, "guestChats", sessionId);
      await deleteDoc(chatRef);

      // Clear messages from state
      setMessages([]);

      // Generate new session ID
      const newSessionId = `guest-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      setSessionId(newSessionId);

      toast.success('Chat cleared successfully');
    } catch (error) {
      console.error("Error clearing chat:", error);
      toast.error("Failed to clear chat");
    }
  };

  const fetchCompanyConfig = async (companyId: string) => {
    try {
      const companyDoc = await getDoc(doc(firestore, "companies", companyId));
      const tokenDoc = await getDoc(doc(firestore, "setting", "token"));
      
      if (companyDoc.exists() && tokenDoc.exists()) {
        const companyData = companyDoc.data();
        const tokenData = tokenDoc.data();
        
        setApiKey(tokenData.openai);
        setAssistantId(companyData.assistantId);
        setAssistantName(companyData.name || 'Assistant');
        
        // Check if there are existing messages in Firestore
        if (sessionId) {
          const chatRef = doc(firestore, "companies", companyId, "guestChats", sessionId);
          const chatDoc = await getDoc(chatRef);
          
        }
      } else {
        setError("Company not found");
      }
    } catch (error) {
      console.error("Error fetching company config:", error);
      setError("Failed to fetch company configuration");
    } finally {
      setLoading(false);
    }
  };
  const sendMessageToAssistant = async (messageText: string) => {
    const newMessage: ChatMessage = {
      from_me: true,
      type: 'text',
      text: messageText,
      createdAt: new Date().toISOString(),
    };
  
    setMessages(prevMessages => [newMessage, ...prevMessages]);
    setMessageLoading(true);
  
    try {
      if (!companyId || !assistantId) {
        throw new Error("Missing company ID or assistant ID");
      }
      
      const companyDoc = await getDoc(doc(firestore, "companies", companyId));
      if (!companyDoc.exists()) {
        throw new Error("Company not found");
      }
      
      const data = companyDoc.data();
      const baseUrl = 'https://mighty-dane-newly.ngrok-free.app';
      //const baseUrl = data.apiUrl || 'https://juta.ngrok.app';
      
      const res = await axios.get(`${baseUrl}/api/assistant-test-guest/`, {
        params: {
          message: messageText,
          sessionId: sessionId,
          assistantid: assistantId,
          idSubstring: companyId
        },
      });
      
      const responseData = res.data;
      
      const assistantResponse: ChatMessage = {
        from_me: false,
        type: 'text',
        text: responseData.answer,
        createdAt: new Date().toISOString(),
      };
  
      setMessages(prevMessages => [assistantResponse, ...prevMessages]);
  
    } catch (error) {
      console.error('Error sending message:', error);
      setError("Failed to send message");
      
      const errorMessage: ChatMessage = {
        from_me: false,
        type: 'text',
        text: "Please hold on ya.",
        createdAt: new Date().toISOString(),
      };
      
      setMessages(prevMessages => [errorMessage, ...prevMessages]);
    } finally {
      setMessageLoading(false);
    }
  };

  return (
    <div
      className="h-screen w-screen bg-white"
    >
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center text-center">
            <img alt="Logo" className="w-24 h-24 mb-4" src={logoUrl} />
            <div className="mt-2 text-xs p-2">Loading chat...</div>
            <LoadingIcon icon="three-dots" className="w-20 h-20 p-4" />
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center p-4 bg-red-100 rounded-lg">
            <h2 className="text-xl font-bold text-red-700 mb-2">Error</h2>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      ) : (
        <MessageList 
          messages={messages} 
          onSendMessage={sendMessageToAssistant} 
          assistantName={assistantName}
          onDeleteThread={deleteThread}
          isLoading={messageLoading}
        />
      )}
      <ToastContainer />
    </div>
  );
};

export default GuestChat;

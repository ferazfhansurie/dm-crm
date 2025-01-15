import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getAuth, User, onAuthStateChanged, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import LZString from 'lz-string';

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

setPersistence(auth, browserLocalPersistence);

interface MessagesContextProps {
  messages: any[];
  isLoading: boolean;
}

const MessagesContext = createContext<MessagesContextProps | undefined>(undefined);

export const MessagesProvider = ({ children }: { children: ReactNode }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Clear the session flag when the page reloads
    window.addEventListener('beforeunload', () => {
      sessionStorage.removeItem('messagesFetched');
    });

    const shouldFetchMessages = !sessionStorage.getItem('messagesFetched');

    if (shouldFetchMessages) {
      fetchMessagesOnAuthChange();
    } else {
      const storedMessages = localStorage.getItem('messages');
      if (storedMessages) {
        setMessages(JSON.parse(LZString.decompress(storedMessages)!));
      }
      setIsLoading(false);
    }
  }, [navigate]);

  const fetchMessagesOnAuthChange = () => {
    async function fetchMessages(selectedChatId: string, whapiToken: string) {
      const auth = getAuth(app);
      const user = auth.currentUser;
      try {
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
        if (selectedChatId.includes('@')) {
          const response = await axios.get(`${baseUrl}/api/messages/${selectedChatId}/${data2.whapiToken}`);
          const data = response.data;
       
          setMessages(
            data.messages.map((message: { id: any; text: { body: any; }; from_me: any; timestamp: any; type: any; image: any; document:any}) => ({
              id: message.id,
              text: { body: message.text ? message.text.body : '' },
              from_me: message.from_me,
              createdAt: message.timestamp,
              type: message.type,
              image: message.image ? message.image : undefined,
              document:message.document?message.document:undefined,
            }))
          );
          
        } else {
          setMessages([
          
          ]);}
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      } finally {
      }
    }
  };

  return (
    <MessagesContext.Provider value={{ messages, isLoading }}>
      {children}
    </MessagesContext.Provider>
  );
};

export const useMessages = () => {
  const context = useContext(MessagesContext);
  if (context === undefined) {
    throw new Error('useMessages must be used within a MessagesProvider');
  }
  return context;
};

export { MessagesContext };

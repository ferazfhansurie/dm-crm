import React, { useState, useEffect, useRef } from "react";
import logoUrl from "@/assets/images/logo_black.png";
import { useNavigate, useLocation } from "react-router-dom";
import LoadingIcon from "@/components/Base/LoadingIcon";
import { useConfig } from '../../config';
import { getAuth } from "firebase/auth";
import { CollectionReference, DocumentData, Query, QueryDocumentSnapshot, collection, doc, getDoc, getDocs, limit, query, setDoc, startAfter } from "firebase/firestore";
import axios from "axios";
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { signOut } from "firebase/auth";
import Progress from '@/components/Base/Progress'; // Assuming you have a Progress component
import LZString from 'lz-string';

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
interface Contact {
  chat_id: string;
  chat_pic?: string | null;
  chat_pic_full?: string | null;
  contactName: string;
  conversation_id: string;
  id: string;
  last_message?: {
    chat_id: string;
    from: string;
    from_me: boolean;
    id: string;
    source: string;
    text: {
      body: string;
    };
    timestamp: number;
    createdAt?: string;
    type: string;
  };
  phone: string;
  pinned?: boolean;
  tags: string[];
  unreadCount: number;
}
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

interface QRCodeData {
  phoneIndex: number;
  status: string;
  qrCode: string | null;
}

function LoadingPage2() {
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [botStatus, setBotStatus] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const navigate = useNavigate();
  const { config: initialContacts } = useConfig();
  const [v2, setV2] = useState<boolean | undefined>(undefined);
  const [fetchedChats, setFetchedChats] = useState(0);
  const [totalChats, setTotalChats] = useState(0);
  const [isProcessingChats, setIsProcessingChats] = useState(false);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsFetched, setContactsFetched] = useState(false);
  const auth = getAuth(app);
  const [shouldFetchContacts, setShouldFetchContacts] = useState(false);
  const location = useLocation();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isFetchingChats, setIsFetchingChats] = useState(false);
  const [qrCodes, setQrCodes] = useState<QRCodeData[]>([]);
  const [currentQrIndex, setCurrentQrIndex] = useState<number | null>(null);
  
  const fetchQRCode = async () => {
    const auth = getAuth(app);
    const user = auth.currentUser;
    let v2;
    setIsLoading(true);
    setError(null);
    try {
      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        throw new Error("User document does not exist");
      }

      const dataUser = docUserSnapshot.data();
      const companyId = dataUser.companyId;
      setCompanyId(companyId); // Store companyId in state
      console.log(companyId);
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        throw new Error("Company document does not exist");
      }

      const companyData = docSnapshot.data();
      v2 = companyData.v2;
      setV2(v2);

      // Only proceed with QR code and bot status if v2 exists
      const botStatusResponse = await axios.get(`https://mighty-dane-newly.ngrok-free.app/api/bot-status/${companyId}`);

      console.log(botStatusResponse.data);
      if (botStatusResponse.status !== 200) {
        throw new Error(`Unexpected response status: ${botStatusResponse.status}`);
      }

      const qrCodesData: QRCodeData[] = botStatusResponse.data;
      setQrCodes(qrCodesData);

      const qrIndex = qrCodesData.findIndex(qr => qr.status === 'qr');
      if (qrIndex !== -1) {
        setCurrentQrIndex(qrIndex);
        setQrCodeImage(qrCodesData[qrIndex].qrCode);
        setBotStatus('qr');
      } else {
        setCurrentQrIndex(null);
        setQrCodeImage(null);
        setBotStatus(qrCodesData.every(qr => qr.status === 'ready') ? 'ready' : 'initializing');
      }

      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      if (axios.isAxiosError(error)) {
        if (error.code === 'ERR_NETWORK') {
          setError('Network error. Please check your internet connection and try again.');
        } else {
          setError(error.response?.data || 'Failed to fetch QR code. Please try again.');
        }
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unknown error occurred. Please try again.');
      }
      console.error("Error fetching QR code:", error);
    }
  };

  const handleRefresh = () => {
    fetchQRCode();
  };

  useEffect(() => {
    fetchQRCode();
  }, []);

  useEffect(() => {
    const initWebSocket = async () => {
      if (!wsConnected) {
        const auth = getAuth(app);
        const user = auth.currentUser;
        const docUserRef = doc(firestore, 'user', user?.email!);
        const docUserSnapshot = await getDoc(docUserRef);
        if (!docUserSnapshot.exists()) {
          throw new Error("User document does not exist");
        }

        const dataUser = docUserSnapshot.data();
        const companyId = dataUser.companyId;
        ws.current = new WebSocket(`wss://mighty-dane-newly.ngrok-free.app/ws/${user?.email}/${companyId}`);
        ws.current.onopen = () => {
          console.log('WebSocket connected');
          setWsConnected(true);
        };
        
        ws.current.onmessage = async (event) => {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);

          if (data.type === 'auth_status') {
            console.log(`Bot status: ${data.status}`);
            setBotStatus(data.status);
            if (data.status === 'qr') {
              setQrCodeImage(data.qrCode);
      
            } else if (data.status === 'authenticated' || data.status === 'ready') {
              setIsProcessingChats(true);
            }
          } else if (data.type === 'progress') {
            setCurrentAction(data.action);
            setFetchedChats(data.fetchedChats);
            setTotalChats(data.totalChats);

            if (data.action === 'done_process') {
              setProcessingComplete(true);
            }
          }
        };
        
        ws.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          setError('WebSocket connection error. Please try again.');
        };
        
        ws.current.onclose = () => {
          console.log('WebSocket disconnected');
          setWsConnected(false);
        };
      }
    };

    initWebSocket();
  }, []);

  // New useEffect for WebSocket cleanup
  useEffect(() => {
    return () => {
      if (ws.current && processingComplete && !isLoading && contacts.length > 0) {
        console.log('Closing WebSocket connection');
        ws.current.close();
      }
    };
  }, [processingComplete, isLoading, contacts]);

  useEffect(() => {
    console.log("useEffect triggered. shouldFetchContacts:", shouldFetchContacts, "isLoading:", isLoading);
    if (shouldFetchContacts && !isLoading) {
      console.log("Conditions met, calling fetchContacts");
      fetchContacts();
    }
  }, [shouldFetchContacts, isLoading]);

  useEffect(() => {
    console.log("Contact state changed. contactsFetched:", contactsFetched, "fetchedChats:", fetchedChats, "totalChats:", totalChats, "contacts length:", contacts.length);
 
  }, [contactsFetched, fetchedChats, totalChats, contacts, navigate]);

  const fetchContacts = async () => {
    console.log("fetchContacts function called");
    try {
      setIsLoading(true);
      const user = auth.currentUser;
      if (!user) {
        throw new Error("No authenticated user found");
      }

      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        setIsLoading(false);
        return;
      }
    
      const dataUser = docUserSnapshot.data();
      const companyId = dataUser?.companyId;
      if (!companyId) {
        setIsLoading(false);
        return;
      }
    
      // Pagination settings
      const batchSize = 4000;
      let lastVisible: QueryDocumentSnapshot<DocumentData> | undefined = undefined;
      const phoneSet = new Set<string>();
      let allContacts: Contact[] = [];
    
      // Fetch contacts in batches
      while (true) {
        let queryRef: Query<DocumentData>;
        const contactsCollectionRef = collection(firestore, `companies/${companyId}/contacts`) as CollectionReference<DocumentData>;
          
        if (lastVisible) {
          queryRef = query(contactsCollectionRef, startAfter(lastVisible), limit(batchSize));
        } else {
          queryRef = query(contactsCollectionRef, limit(batchSize));
        }
    
        const contactsSnapshot = await getDocs(queryRef);
        const contactsBatch: Contact[] = contactsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Contact));
    
        if (contactsBatch.length === 0) break; // Exit if no more documents
    
        contactsBatch.forEach(contact => {
          if (contact.phone && !phoneSet.has(contact.phone)) {
            phoneSet.add(contact.phone);
            allContacts.push(contact);
          }
        });
    
        lastVisible = contactsSnapshot.docs[contactsSnapshot.docs.length - 1];
      }
    
      // Fetch pinned chats
      const pinnedChatsRef = collection(firestore, `user/${user.email!}/pinned`);
      const pinnedChatsSnapshot = await getDocs(pinnedChatsRef);
      const pinnedChats = pinnedChatsSnapshot.docs.map(doc => doc.data() as Contact);
    
      // Add pinned status to contactsData and update in Firebase
      const updatePromises = allContacts.map(async contact => {
        const isPinned = pinnedChats.some(pinned => pinned.chat_id === contact.chat_id);
        if (isPinned) {
          contact.pinned = true;
          const contactDocRef = doc(firestore, `companies/${companyId}/contacts`, contact.id);
          await setDoc(contactDocRef, contact, { merge: true });
        }
      });
    
      await Promise.all(updatePromises);
    
      // Sort contactsData by pinned status and last_message timestamp
      allContacts.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        const dateA = a.last_message?.createdAt
          ? new Date(a.last_message.createdAt)
          : a.last_message?.timestamp
            ? new Date(a.last_message.timestamp * 1000)
            : new Date(0);
        const dateB = b.last_message?.createdAt
          ? new Date(b.last_message.createdAt)
          : b.last_message?.timestamp
            ? new Date(b.last_message.timestamp * 1000)
            : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
    
      console.log("Contacts fetched:", allContacts.length);
      setContacts(allContacts);

      localStorage.setItem('contacts', LZString.compress(JSON.stringify(allContacts)));
      sessionStorage.setItem('contactsFetched', 'true'); // Mark that contacts have been fetched in this session
      setContactsFetched(true);

      // After fetching contacts, fetch chats
      await fetchChatsData();

    } catch (error) {
      console.error('Error fetching contacts:', error);
      setError('Failed to fetch contacts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChatsData = async () => {
    setIsFetchingChats(true);
    try {
      // Assuming the existing WebSocket connection handles chat fetching
      // You might need to send a message to the WebSocket to start fetching chats
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ action: 'fetch_chats' }));
      } else {
        throw new Error('WebSocket is not connected');
      }
    } catch (error) {
      console.error('Error initiating chat fetch:', error);
      setError('Failed to fetch chats. Please try again.');
    } finally {
      setIsFetchingChats(false);
    }
  };

  useEffect(() => {
    console.log('Current bot status:', botStatus);
    console.log('Is processing chats:', isProcessingChats);
    console.log('Processing progress:', fetchedChats, totalChats);
  }, [botStatus, isProcessingChats, fetchedChats, totalChats]);

  useEffect(() => {
    let progressInterval: string | number | NodeJS.Timeout | undefined;
    if (!isLoading && botStatus === 'qr') {
      progressInterval = setInterval(() => {
        setProgress((prev) => (prev < 100 ? prev + 1 : prev));
      }, 500);
    }

    return () => clearInterval(progressInterval);
  }, [isLoading, botStatus]);

  const handleLogout = async () => {
    const auth = getAuth(app);
  
  };

  return (
    <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
      <div className="flex flex-col items-center w-3/4 max-w-lg text-center p-15">
        <img alt="Logo" className="w-40 h-40 p-25" src={logoUrl} />
        {v2 ? (
          <>
            {botStatus === 'qr' && currentQrIndex !== null ? (
              <>
                <div className="mt-2 text-md p-25 text-gray-800 dark:text-gray-200">
                  Please use your WhatsApp QR scanner to scan the code and proceed.
                </div>
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Scanning QR for Phone : {qrCodes[currentQrIndex].phoneIndex+1}
                </div>
                <hr className="w-full my-4 border-t border-gray-300 dark:border-gray-700" />
                {error && <div className="text-red-500 dark:text-red-400 mt-2">{error}</div>}
                {qrCodeImage && (
                  <div className="bg-white p-4 rounded-lg mt-4">
                    <img src={qrCodeImage} alt="QR Code" className="max-w-full h-auto" />
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="mt-2 text-xs p-15 text-gray-800 dark:text-gray-200">
                  {botStatus === 'ready' 
                    ? 'All phones are authenticated. Loading contacts...' 
                    : botStatus === 'initializing'
                      ? 'Initializing WhatsApp connections...'
                      : 'Fetching Data...'}
                </div>
                {isProcessingChats && (
                  <div className="space-y-2 mt-4">
                    <Progress className="w-full">
                      <Progress.Bar 
                        className="transition-all duration-300 ease-in-out"
                        style={{ width: `${(fetchedChats / totalChats) * 100}%` }}
                      >
                        {Math.round((fetchedChats / totalChats) * 100)}%
                      </Progress.Bar>
                    </Progress>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {processingComplete 
                        ? contactsFetched
                          ? "Chats loaded. Preparing to navigate..."
                          : "Processing complete. Loading contacts..."
                        : `Processing ${fetchedChats} of ${totalChats} chats`
                      }
                    </div>
                  </div>
                )}
                {(isLoading || !processingComplete || isFetchingChats) && (
                  <div className="mt-4">
                    <LoadingIcon icon="three-dots" className="w-20 h-20 p-4 text-gray-800 dark:text-gray-200" />
                  </div>
                )}
              </>
            )}
            
            <hr className="w-full my-4 border-t border-gray-300 dark:border-gray-700 p-15" />
            
            <button
              onClick={handleRefresh}
              className="mt-4 px-6 py-3 bg-primary text-white text-lg font-semibold rounded hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 w-full"
            >
              Refresh
            </button>
            
            
            {error && <div className="mt-2 text-red-500 dark:text-red-400">{error}</div>}
          </>
        ) : (
          <div className="mt-4">
            <LoadingIcon icon="three-dots" className="w-20 h-20 p-4 text-gray-800 dark:text-gray-200" />
          </div>
        )}
      </div>
    </div>
  );
}

export default LoadingPage2;
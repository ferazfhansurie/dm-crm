import React, { useState, useEffect, useRef } from "react";
import logoUrl from "@/assets/images/logo.png";
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
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [isPairingCodeLoading, setIsPairingCodeLoading] = useState(false);
  const [selectedPhoneIndex, setSelectedPhoneIndex] = useState<number | null>(null);

  const [loadingPhase, setLoadingPhase] = useState<string>('initializing');
  const [loadingProgress, setLoadingProgress] = useState(0);
  
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
      const baseUrl = companyData.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';
      // Only proceed with QR code and bot status if v2 exists
      console.log(`${baseUrl}/api/bot-status/${companyId}`,);
      const botStatusResponse = await axios.get(`${baseUrl}/api/bot-status/${companyId}`, {
        headers: companyId === '0123' 
        ? {
            'ngrok-skip-browser-warning': 'true',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        : {
          
          }
      });

      console.log(botStatusResponse.data);
      if (botStatusResponse.status !== 200) {
        throw new Error(`Unexpected response status: ${botStatusResponse.status}`);
      }

      const qrCodesData = Array.isArray(botStatusResponse.data) 
        ? botStatusResponse.data 
        : [];
      setQrCodes(qrCodesData);

      // Find first phone that needs scanning
      const qrIndex = qrCodesData.findIndex(qr => qr.status === 'qr');
      if (qrIndex !== -1) {
        setCurrentQrIndex(qrIndex);
        setSelectedPhoneIndex(qrIndex); // Auto-select first phone
        setQrCodeImage(qrCodesData[qrIndex].qrCode);
        setBotStatus('qr');
      } else {
        setCurrentQrIndex(null);
        setSelectedPhoneIndex(null);
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
  const getPhoneName = (phoneIndex: number) => {
    if (companyId === '0123') {
      return phoneIndex === 0 ? 'Revotrend' : phoneIndex === 1 ? 'Storeguru':'ShipGuru';
    }
    return `Phone ${phoneIndex + 1}`;
  };
  const handleRefresh = async () => {
    // Reset states
    setQrCodeImage(null);
    setCurrentQrIndex(null);
    setBotStatus(null);
    setError(null);
    
    
    // Fetch new QR code
    await fetchQRCode();
  };

  useEffect(() => {
    fetchQRCode();
  }, []);
//dd
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
        
        // Get company data to fetch baseUrl
        const docRef = doc(firestore, 'companies', companyId);
        const docSnapshot = await getDoc(docRef);
        if (!docSnapshot.exists()) {
          throw new Error("Company document does not exist");
        }

        const companyData = docSnapshot.data();
        const baseUrl = companyData.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';
        // Remove 'https://' from baseUrl when creating WebSocket connection
        const wsBaseUrl = baseUrl.replace('https://', '');
        console.log(wsBaseUrl);
        ws.current = new WebSocket(`wss://${wsBaseUrl}/ws/${user?.email}/${companyId}`);
        
        ws.current.onopen = () => {
          console.log('WebSocket connected');
          setWsConnected(true);
        };
        
        ws.current.onmessage = async (event) => {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);

          if (data.type === 'auth_status') {
            console.log(`Bot status: ${data.status} for bot: ${data.botName}`);
            setBotStatus(data.status);
            
            if (data.status === 'qr') {
              // Set QR code image
              setQrCodeImage(data.qrCode);
              setCurrentQrIndex(data.phoneIndex);
              setSelectedPhoneIndex(data.phoneIndex);

              // Update QR codes array with new data
              setQrCodes(prevCodes => {
                const newCodes = [...(prevCodes || [])];
                newCodes[data.phoneIndex] = {
                  phoneIndex: data.phoneIndex,
                  status: data.status,
                  qrCode: data.qrCode
                };
                return newCodes;
              });

              setError(null);
              setIsLoading(false);
              setLoadingPhase('qr_ready');
              
            } else if (data.status === 'authenticated' || data.status === 'ready') {
              // Update QR codes array to reflect authenticated status
              setQrCodes(prevCodes => {
                const newCodes = [...(prevCodes || [])];
                if (data.phoneIndex !== undefined) {
                  newCodes[data.phoneIndex] = {
                    ...newCodes[data.phoneIndex],
                    status: data.status,
                    qrCode: null // Clear QR code for authenticated phone
                  };
                }
                return newCodes;
              });

              // Only clear current QR if the authenticated phone is the one being displayed
              if (data.phoneIndex === currentQrIndex) {
                setQrCodeImage(null);
                setCurrentQrIndex(null);
              }

              setIsProcessingChats(true);
              setLoadingPhase('authenticated');
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
    try {
      setLoadingPhase('fetching_contacts');
      const user = auth.currentUser;
      if (!user) throw new Error("No authenticated user found");

      // Get company ID
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        throw new Error("User document not found");
      }

      const dataUser = docUserSnapshot.data();
      const companyId = dataUser?.companyId;
      if (!companyId) throw new Error("Company ID not found");

      // Fetch contacts with progress tracking
      const contactsCollectionRef = collection(firestore, `companies/${companyId}/contacts`);
      const contactsSnapshot = await getDocs(contactsCollectionRef);
      let allContacts: Contact[] = [];
      
      const totalDocs = contactsSnapshot.docs.length;
      let processedDocs = 0;

      for (const doc of contactsSnapshot.docs) {
        allContacts.push({ ...doc.data(), id: doc.id } as Contact);
        processedDocs++;
        setLoadingProgress((processedDocs / totalDocs) * 100);
      }

      // Fetch and process pinned chats
      setLoadingPhase('processing_pinned');
      const pinnedChatsRef = collection(firestore, `user/${user.email!}/pinned`);
      const pinnedChatsSnapshot = await getDocs(pinnedChatsRef);
      const pinnedChats = pinnedChatsSnapshot.docs.map(doc => doc.data() as Contact);

      // Update contacts with pinned status
      setLoadingPhase('updating_pins');
      const updatePromises = allContacts.map(async (contact, index) => {
        const isPinned = pinnedChats.some(pinned => pinned.chat_id === contact.chat_id);
        if (isPinned) {
          contact.pinned = true;
          const contactDocRef = doc(firestore, `companies/${companyId}/contacts`, contact.id);
          await setDoc(contactDocRef, contact, { merge: true });
        }
        setLoadingProgress((index / allContacts.length) * 100);
      });

      await Promise.all(updatePromises);

      // Sort contacts
      setLoadingPhase('sorting_contacts');
      allContacts.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        const dateA = a.last_message?.timestamp ? new Date(a.last_message.timestamp * 1000) : new Date(0);
        const dateB = b.last_message?.timestamp ? new Date(b.last_message.timestamp * 1000) : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      // Cache the contacts
      setLoadingPhase('caching');
      localStorage.setItem('contacts', LZString.compress(JSON.stringify(allContacts)));
      sessionStorage.setItem('contactsFetched', 'true');
      sessionStorage.setItem('contactsCacheTimestamp', Date.now().toString());

      setContacts(allContacts);
      setContactsFetched(true);
      setLoadingPhase('complete');

      // Navigate only when everything is ready
      if (processingComplete && !isLoading) {
        navigate('/chat');
      }

    } catch (error) {
      console.error('Error fetching contacts:', error);
      setError('Failed to fetch contacts. Please try again.');
      setLoadingPhase('error');
    }
  };

  // Modify the useEffect that handles navigation
  useEffect(() => {
    if (processingComplete && contactsFetched && !isLoading) {
      const timer = setTimeout(() => {
        navigate('/chat');
      }, 1000); // Add a small delay to ensure smooth transition
      return () => clearTimeout(timer);
    }
  }, [processingComplete, contactsFetched, isLoading, navigate]);

  // Update the loading status display in your JSX
  const getLoadingMessage = () => {
    switch (loadingPhase) {
      case 'initializing': return 'Initializing...';
      case 'fetching_contacts': return 'Fetching contacts...';
      case 'processing_pinned': return 'Processing pinned chats...';
      case 'updating_pins': return 'Updating pin status...';
      case 'sorting_contacts': return 'Organizing contacts...';
      case 'caching': return 'Caching data...';
      case 'complete': return 'Loading complete!';
      case 'error': return 'Error loading contacts';
      default: return 'Loading...';
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

  const requestPairingCode = async () => {
    setIsPairingCodeLoading(true);
    setError(null);
    const auth = getAuth(app);
    const user = auth.currentUser;
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
      const baseUrl = companyData.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';
      const headers = companyId === '0123' 
        ? {
            'ngrok-skip-browser-warning': 'true',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        : {
            'ngrok-skip-browser-warning': 'true'
          };

      const response = await axios.post(`${baseUrl}/api/request-pairing-code/${companyId}`, {
        phoneNumber,
        phoneIndex: selectedPhoneIndex
      }, { headers });
      setPairingCode(response.data.pairingCode);
    } catch (error) {
      console.error('Error requesting pairing code:', error);
      setError('Failed to request pairing code. Please try again.');
    } finally {
      setIsPairingCodeLoading(false);
    }
  };

  const unscannedPhones = Array.isArray(qrCodes) 
    ? qrCodes.filter(qr => qr.status !== 'ready')
    : [];

  return (
    <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900 p-4">
      <div className="flex flex-col items-center w-full max-w-md text-center">
        <img alt="Logo" className="w-24 h-24 mb-4" src={logoUrl} />
        {v2 ? (
          <div className="w-full overflow-y-auto max-h-[calc(100vh-8rem)]">
            {botStatus === 'qr' && currentQrIndex !== null ? (
              <>
                <div className="text-sm mb-2 text-gray-800 dark:text-gray-200">
                  Please use your WhatsApp QR scanner to scan the code or enter your phone number for a pairing code.
                </div>
            
                <hr className="w-full my-2 border-t border-gray-300 dark:border-gray-700" />
                {error && <div className="text-red-500 dark:text-red-400 mb-2">{error}</div>}
                {qrCodeImage && selectedPhoneIndex === currentQrIndex && (
                  <div className="bg-white ml-20 rounded-lg mb-2">
                    <img src={qrCodeImage} alt="QR Code" className="max-w-full h-auto" />
                  </div>
                )}
                
                <div className="mb-2">
                <select
  value={selectedPhoneIndex !== null ? selectedPhoneIndex : ''}
  onChange={(e) => {
    const newIndex = Number(e.target.value);
    setSelectedPhoneIndex(newIndex);
    setPairingCode(null); // Reset pairing code when phone changes
    
    // Update QR code based on selected phone
    if (qrCodes[newIndex]) {
      setQrCodeImage(qrCodes[newIndex].qrCode);
      setCurrentQrIndex(newIndex);
      setBotStatus(qrCodes[newIndex].status);
    }
  }}
  className="w-full px-3 py-2 text-sm border rounded-md text-gray-700 focus:outline-none focus:border-blue-500 mb-2"
>
  <option value="">Select Phone</option>
  {unscannedPhones.map((phone, index) => (
    <option key={index} value={phone.phoneIndex}>
      {getPhoneName(phone.phoneIndex)}
    </option>
  ))}
</select>

                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter phone number with country code eg: 60123456789"
                    className="w-full px-3 py-2 text-sm border rounded-md text-gray-700 focus:outline-none focus:border-blue-500 mb-2"
                  />
                  <button
                    onClick={requestPairingCode}
                    disabled={isPairingCodeLoading || !phoneNumber || selectedPhoneIndex === null}
                    className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 w-full disabled:bg-gray-400"
                  >
                    {isPairingCodeLoading ? 'Requesting...' : 'Get Pairing Code'}
                  </button>
                </div>
                
                {pairingCode && (
                  <div className="mb-2 p-2 bg-green-100 border border-green-400 text-green-700 rounded text-sm">
                    Your pairing code: <strong>{pairingCode}</strong>
                    <p className="text-xs mt-1">Enter this code in your WhatsApp app to authenticate.</p>
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
                        style={{ width: `${loadingProgress}%` }}
                      >
                        {Math.round(loadingProgress)}%
                      </Progress.Bar>
                    </Progress>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {getLoadingMessage()}
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
            
            <hr className="w-full my-2 border-t border-gray-300 dark:border-gray-700" />
            
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="mt-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 w-full disabled:opacity-50"
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
            
            {error && <div className="mt-2 text-red-500 dark:text-red-400 text-sm">{error}</div>}
          </div>
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
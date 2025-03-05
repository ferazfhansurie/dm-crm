import React, { useState, useEffect, useRef } from "react";
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
import logoUrl from '@/assets/images/logo.png';

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

interface MessageCache {
  [chatId: string]: any[]; // or specify more detailed message type if available
}

function LoadingPage() {
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
  const [processingComplete, setProcessingComplete] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsFetched, setContactsFetched] = useState(false);
  const auth = getAuth(app);
  const [shouldFetchContacts, setShouldFetchContacts] = useState(false);
  const location = useLocation();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isFetchingChats, setIsFetchingChats] = useState(false);
  const [isQRLoading, setIsQRLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [isPairingCodeLoading, setIsPairingCodeLoading] = useState(false);

  const [loadingPhase, setLoadingPhase] = useState<string>('initializing');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [trialExpired, setTrialExpired] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  const fetchQRCode = async () => {
    if (!isAuthReady) {
      return;
    }

    const user = auth.currentUser;
    let v2;
    setIsLoading(true);
    setIsQRLoading(true);
    setError(null);
    try {
      if (!user?.email) {
        navigate('/login');
        return;
      }

      const docUserRef = doc(firestore, 'user', user.email);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        throw new Error("User document does not exist");
      }

      const dataUser = docUserSnapshot.data();
      const companyId = dataUser.companyId;
      setCompanyId(companyId);

      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        throw new Error("Company document does not exist");
      }

      const companyData = docSnapshot.data();
      const baseUrl = companyData.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';
      
      if (companyData.trialEndDate) {
        const trialEnd = companyData.trialEndDate.toDate();
        const now = new Date();
        if (now > trialEnd) {
          setTrialExpired(true);
        
          return;
        }
      }

      v2 = companyData.v2;
      setV2(v2);
      if (!v2) {
        // If "v2" is not present or is false, navigate to the next page
        if (location.pathname === '/loading') {
          if (initialContacts.name === "Infinity Pilates & Physiotherapy") {
            navigate('/calendar');
          } else {
            navigate('/chat');
          }
        }
        return;
      }

      // Only proceed with QR code and bot status if v2 exists
      const headers = companyData.apiUrl 
        ?  {
          'Authorization': `Bearer ${await user?.getIdToken()}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',  // Add this for ngrok
        }
        : {
            'Authorization': `Bearer ${await user?.getIdToken()}`,
            'Content-Type': 'application/json'
          };

      const botStatusResponse = await axios.get(
        `${baseUrl}/api/bot-status/${companyId}`,
        {
          headers,
          withCredentials:false
        }
      );

      
      if (botStatusResponse.status !== 200) {
        throw new Error(`Unexpected response status: ${botStatusResponse.status}`);
      }
      let phoneCount = companyData.phoneCount ?? null;
      
      
      if (phoneCount === null || phoneCount === 1) {
        const { status, qrCode } = botStatusResponse.data;
        
        setBotStatus(status);
        if (status === 'qr') {
          setQrCodeImage(qrCode);
        } else if (status === 'authenticated' || status === 'ready') {
          
          setShouldFetchContacts(true);
          navigate('/chat');
          return;
        }
      } else {
        
        // Check if response is an array
        const statusArray = Array.isArray(botStatusResponse.data) 
          ? botStatusResponse.data 
          : [botStatusResponse.data];
    // Check if any phone is authenticated/ready
    const anyPhoneReady = statusArray.some(phone => 
      phone.status === 'authenticated' || phone.status === 'ready'
    );
    if (anyPhoneReady) {
      
      setShouldFetchContacts(true);
      navigate('/chat');
      return;
    }
        // Only check the first phone's status
        const firstPhone = statusArray[0];
        
        
        if (firstPhone.status === 'authenticated' || firstPhone.status === 'ready') {
          
          setShouldFetchContacts(true);
          navigate('/chat');
          return;
        } else if (firstPhone.status === 'qr' && firstPhone.qrCode) {
          
          setBotStatus('qr');
          setQrCodeImage(firstPhone.qrCode);
        } else {
          
          setBotStatus(firstPhone.status);
        }
      }
   
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      if (axios.isAxiosError(error)) {
        if (error.code === 'ERR_NETWORK') {
          setError('Network error. Please check your internet connection and try again.');
        } else {
          setError(error.response?.data?.message || 'Failed to fetch QR code. Please try again.');
        }
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unknown error occurred. Please try again.');
      }
      console.error("Error fetching QR code:", error);
    } finally {
      setIsQRLoading(false);
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchQRCode();
  };

  useEffect(() => {
    if (isAuthReady) {
      fetchQRCode();
    }
  }, [isAuthReady]);

  useEffect(() => {
    const initWebSocket = async (retries = 3) => {
      if (!isAuthReady) {
        return; // Don't proceed if auth isn't ready
      }

      if (!wsConnected) {
        try {
          const user = auth.currentUser;
          
          if (!user?.email) {
            navigate('/login');
            return;
          }

          const docUserRef = doc(firestore, 'user', user.email);
          const docUserSnapshot = await getDoc(docUserRef);
          
          if (!docUserSnapshot.exists()) {
            if (retries > 0) {
            
              setTimeout(() => initWebSocket(retries - 1), 2000); // Retry after 2 seconds
              return;
            } else {
              throw new Error("User document does not exist after retries");
            }
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
          const wsUrl = baseUrl.replace('https://', 'wss://').replace('http://', 'ws://');
          
          ws.current = new WebSocket(`${wsUrl}/ws/${user?.email}/${companyId}`);
          ws.current.onopen = () => {
            
            setWsConnected(true);
            setError('')
          };
          
          ws.current.onmessage = async (event) => {
            const data = JSON.parse(event.data);
            
      
            if (data.type === 'auth_status') {
              
              setBotStatus(data.status);
              
              if (data.status === 'qr') {
                setQrCodeImage(data.qrCode);
              } else if (data.status === 'authenticated' || data.status === 'ready') {
                
                setShouldFetchContacts(true);
                navigate('/chat');
                return;
              }
            } else if (data.type === 'progress') {
              setBotStatus(data.status);
              setCurrentAction(data.action);
              setFetchedChats(data.fetchedChats);
              setTotalChats(data.totalChats);

              if (data.action === 'done_process') {
                setBotStatus(data.status);
                setProcessingComplete(true);
                navigate('/chat');
                return;
              }
            }
          };
          
          ws.current.onerror = (error) => {
            console.error('WebSocket error:', error);
            setError('WebSocket connection error. Please try again.');
          };
          
          ws.current.onclose = () => {
            
            setWsConnected(false);
          };
        } catch (error) {
          console.error('Error initializing WebSocket:', error);
          if (error instanceof Error) {
            setError(error.message);
          } else {
            setError('Failed to initialize WebSocket. Please try again.');
          }
          
          if (retries > 0) {
            setTimeout(() => initWebSocket(retries - 1), 2000);
          }
        }
      }
    };

    if (isAuthReady) {
      initWebSocket();
    }
  }, [isAuthReady]);

  // New useEffect for WebSocket cleanup
  useEffect(() => {
    return () => {
      if (ws.current && processingComplete && !isLoading && contacts.length > 0) {
        
        ws.current.close();
      }
    };
  }, [processingComplete, isLoading, contacts]);

  useEffect(() => {

    if (shouldFetchContacts && !isLoading) {
      
      navigate('/chat');
    }
  }, [shouldFetchContacts, isLoading, navigate]);

  useEffect(() => {
    
    if (contactsFetched && fetchedChats === totalChats && contacts.length > 0) {
      
      navigate('/chat');
    }
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
      setLoadingPhase('fetching_contacts');
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
    // Cache the contacts
    setLoadingPhase('caching');
    localStorage.setItem('contacts', LZString.compress(JSON.stringify(allContacts)));
    sessionStorage.setItem('contactsFetched', 'true');
    sessionStorage.setItem('contactsCacheTimestamp', Date.now().toString());

    setContacts(allContacts);
    setContactsFetched(true);

    // Cache messages for first 100 contacts
    await fetchAndCacheMessages(allContacts, companyId, user);
    
    setLoadingPhase('complete');

    // After contacts are loaded, fetch chats
    await fetchChatsData();

  } catch (error) {
    console.error('Error fetching contacts:', error);
    setError('Failed to fetch contacts. Please try again.');
    setLoadingPhase('error');
  }
};

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
    case 'caching_messages': return 'Caching recent messages...';
    default: return 'Loading...';
  }
};

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
    {loadingPhase === 'complete' && (
      <div className="text-green-500">
        All data loaded successfully!
      </div>
    )}
  </div>
)}

useEffect(() => {
  
  if (processingComplete && contactsFetched && !isLoading) {
    const timer = setTimeout(() => {
      navigate('/chat');
    }, 1000); // Add a small delay to ensure smooth transition
    return () => clearTimeout(timer);
  }
}, [processingComplete, contactsFetched, isLoading, navigate]);


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
    try {
      // Close WebSocket connection if it exists
      if (ws.current) {
        
        ws.current.close();
        setWsConnected(false);
      }

      await signOut(auth);
      navigate('/login'); // Adjust this to your login route
    }    catch (error) {
      console.error("Error signing out: ", error);
      setError('Failed to log out. Please try again.');
    }
  };

  const requestPairingCode = async () => {
    setIsPairingCodeLoading(true);
    setError(null);
    try {
      const user = getAuth().currentUser;
      if (!user) {
        throw new Error("User not authenticated");
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
      const headers = data2.apiUrl 
        ? {
            'Authorization': `Bearer ${await user.getIdToken()}`
          }
        : {
            'Authorization': `Bearer ${await user.getIdToken()}`,
            'Content-Type': 'application/json'
          };

      const response = await axios.post(
        `${baseUrl}/api/request-pairing-code/${companyId}`,
        { phoneNumber },
        { 
          headers,
          withCredentials: false
        }
      );
      setPairingCode(response.data.pairingCode);
    } catch (error) {
      console.error('Error requesting pairing code:', error);
      setError('Failed to request pairing code. Please try again.');
    } finally {
      setIsPairingCodeLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsAuthReady(true);
      if (!user) {
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [auth, navigate]);

  useEffect(() => {
    if (botStatus === 'ready' || botStatus === 'authenticated') {
      setShouldFetchContacts(true);
      navigate('/chat');
    }
  }, [botStatus, navigate]);

  const fetchAndCacheMessages = async (contacts: Contact[], companyId: string, user: any) => {
    setLoadingPhase('caching_messages');
    console.log('fetchAndCacheMessages');
    // Reduce number of cached contacts
    const mostRecentContacts = contacts
      .sort((a, b) => {
        const getTimestamp = (contact: Contact) => {
          if (!contact.last_message) return 0;
          return contact.last_message.createdAt
            ? new Date(contact.last_message.createdAt).getTime()
            : contact.last_message.timestamp
              ? contact.last_message.timestamp * 1000
              : 0;
        };
        return getTimestamp(b) - getTimestamp(a);
      })
      .slice(0, 10); // Reduce from 100 to 20 most recent contacts

    // Only cache last 50 messages per contact
    const messagePromises = mostRecentContacts.map(async (contact) => {
      try {
        // Get company data to access baseUrl
        const docRef = doc(firestore, 'companies', companyId);
        const docSnapshot = await getDoc(docRef);
        const companyData = docSnapshot.data();
        if (!docSnapshot.exists() || !companyData) {
          console.error('Company data not found');
          return null;
        }

        const baseUrl = companyData.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';
        const response = await axios.get(
          `${baseUrl}/api/messages/${contact.chat_id}/${companyData.whapiToken}?limit=20`,
          {
            headers: {
              'Authorization': `Bearer ${await user.getIdToken()}`
            }
          }
        );

        return {
          chatId: contact.chat_id,
          messages: response.data.messages
        };
      } catch (error) {
        console.error(`Error fetching messages for chat ${contact.chat_id}:`, error);
        return null;
      }
    });

    // Wait for all message fetching promises to complete
    const results = await Promise.all(messagePromises);

    // Create messages cache object from results
    const messagesCache = results.reduce<MessageCache>((acc, result) => {
      if (result) {
        acc[result.chatId] = result.messages;
      }
      return acc;
    }, {});

    const cacheData = {
      messages: messagesCache,
      timestamp: Date.now(),
      expiry: Date.now() + (30 * 60 * 1000)
    };

    const compressedData = LZString.compress(JSON.stringify(cacheData));
    localStorage.setItem('messagesCache', compressedData);
  };

  // Add storage cleanup on page load/refresh
  useEffect(() => {
    const cleanupStorage = () => {
      // Clear old message caches
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('messages_') || key?.startsWith('messagesCache')) {
          localStorage.removeItem(key);
        }
      }
    };

    cleanupStorage();
    
    // Also clean up on page unload
    window.addEventListener('beforeunload', cleanupStorage);
    return () => window.removeEventListener('beforeunload', cleanupStorage);
  }, []);

// ... existing code ...

const handlePayment = async () => {
  try {
    const user = auth.currentUser;
    if (!user?.email) {
      throw new Error("User not authenticated");
    }

    const docUserRef = doc(firestore, 'user', user.email);
    const docUserSnapshot = await getDoc(docUserRef);
    if (!docUserSnapshot.exists()) {
      throw new Error("User document does not exist");
    }

    const dataUser = docUserSnapshot.data();
    const companyId = dataUser.companyId;

    const docRef = doc(firestore, 'companies', companyId);
    const docSnapshot = await getDoc(docRef);
    if (!docSnapshot.exists()) {
      throw new Error("Company document does not exist");
    }

    const companyData = docSnapshot.data();
    let amount: number;

    // Set amount based on plan
    switch (companyData.plan) {
      case 'blaster':
        amount = 6800; // RM 68.00
        break;
      case 'enterprise':
        amount = 31800; // RM 318.00
        break;
      case 'unlimited':
        amount = 71800; // RM 718.00
        break;
      default:
        amount = 6800; // Default to blaster plan if no plan is specified
    }

    const idToken = await user.getIdToken();

    const response = await axios.post(
      'https://mighty-dane-newly.ngrok-free.app/api/payments/create',
      {
        email: user.email,
        name: user.displayName || user.email,
        amount,
        description: `WhatsApp Business API Subscription - ${companyData.plan.toUpperCase()} Plan`
      },
      {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data?.paymentUrl) {
      window.location.href = response.data.paymentUrl;
    } else {
      throw new Error("Payment URL not received");
    }
  } catch (error: unknown) {
    console.error("Payment error:", error);
    if (error instanceof Error) {
      setError(error.message);
    } else if (axios.isAxiosError(error) && error.response?.data?.message) {
      setError(error.response.data.message);
    } else {
      setError("Failed to initialize payment. Please try again.");
    }
  }
};

// ... existing code ...

  return (
    <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900 py-8">
      {!isAuthReady ? (
        <div className="text-center">
          <LoadingIcon className="w-8 h-8 mx-auto" />
          <p className="mt-2">Initializing...</p>
        </div>
      ) : trialExpired ? (
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Trial Period Expired</h2>
          <p className="text-gray-600 mb-4">Your trial period has ended. Please subscribe to continue using the service.</p>
          <button
            onClick={handlePayment}
            className="mt-4 px-6 py-3 bg-green-500 text-white text-lg font-semibold rounded hover:bg-green-600 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 w-full"
          >
            Pay Now 
          </button>
          <button
            onClick={handleLogout}
            className="mt-6 px-6 py-3 bg-primary text-white text-lg font-semibold rounded hover:bg-blue-600 transition-colors"
          >
            Back to Login
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center w-full max-w-lg text-center px-4">
          {(
            <>
              {botStatus === 'qr' ? (
                <>
                  <div className="mt-2 text-md text-gray-800 dark:text-gray-200">
                    Please use your WhatsApp QR scanner to scan the code or enter your phone number for a pairing code.
                  </div>
                  <hr className="w-full my-4 border-t border-gray-300 dark:border-gray-700" />
                  {error && <div className="text-red-500 dark:text-red-400 mt-2">{error}</div>}
                  {isQRLoading ? (
                    <div className="mt-4">
                      <img alt="Logo" className="w-32 h-32 animate-spin mx-auto" src={logoUrl} style={{ animation: 'spin 10s linear infinite' }} />
                      <p className="mt-2 text-gray-600 dark:text-gray-400">Loading QR Code...</p>
                    </div>
                  ) : qrCodeImage ? (
                    <div className="bg-white p-4 rounded-lg mt-4">
                      <img src={qrCodeImage} alt="QR Code" className="max-w-full h-auto" />
                    </div>
                  ) : (
                    <div className="mt-4 text-gray-600 dark:text-gray-400">
                      No QR Code available. Please try refreshing or use the pairing code option below.
                    </div>
                  )}
                  
                  <div className="mt-4 w-full">
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="Enter phone number with country code eg: 60123456789"
                      className="w-full px-4 py-2 border rounded-md text-gray-700 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={requestPairingCode}
                      disabled={isPairingCodeLoading || !phoneNumber}
                      className="mt-2 px-6 py-3 bg-primary text-white text-lg font-semibold rounded hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 w-full disabled:bg-gray-400"
                    >
                      {isPairingCodeLoading ? (
                        <span className="flex items-center justify-center">
                          <LoadingIcon className="w-5 h-5 mr-2" />
                          Generating...
                        </span>
                      ) : 'Get Pairing Code'}
                    </button>
                  </div>
                  
                  {isPairingCodeLoading && (
                    <div className="mt-4 text-gray-600 dark:text-gray-400">
                      Generating pairing code...
                    </div>
                  )}
                  
                  {pairingCode && (
                    <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
                      Your pairing code: <strong>{pairingCode}</strong>
                      <p className="text-sm mt-2">Enter this code in your WhatsApp app to authenticate.</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="mt-2 text-xs text-gray-800 dark:text-gray-200">
                    {botStatus === 'authenticated' || botStatus === 'ready' 
                      ? 'Authentication successful. Loading contacts...' 
                      : botStatus === 'initializing'
                        ? 'Initializing WhatsApp connection...'
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
                  <div className="mt-4 flex flex-col items-center">
                    <img alt="Logo" className="w-32 h-32 animate-spin mx-auto" src={logoUrl} style={{ animation: 'spin 3s linear infinite' }} />
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                      {isQRLoading ? "Please wait while QR code is loading..." : "Please wait while QR Code is loading..."}
                    </p>
                  </div>
                  )}
                </>
              )}
              
              <hr className="w-full my-4 border-t border-gray-300 dark:border-gray-700" />
              
              <button
                onClick={handleRefresh}
                className="mt-4 px-6 py-3 bg-primary text-white text-lg font-semibold rounded hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 w-full"
              >
                Refresh
              </button>
              <a
                href="https://wa.link/4uie1v"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 px-6 py-3 bg-green-500 text-white text-lg font-semibold rounded hover:bg-green-600 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 w-full inline-block text-center"
              >
                Need Help?
              </a>
              <button
                onClick={handleLogout}
                className="mt-4 px-6 py-3 bg-red-500 text-white text-lg font-semibold rounded hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 w-full"
              >
                Logout
              </button>
      
              {error && <div className="mt-2 text-red-500 dark:text-red-400">{error}</div>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default LoadingPage;
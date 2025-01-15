import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { getAuth, User, onAuthStateChanged, setPersistence, browserLocalPersistence } from "firebase/auth";
import {orderBy, getFirestore, doc, getDoc, collection, getDocs,setDoc,query, startAfter, limit, QueryDocumentSnapshot, DocumentData ,Query,CollectionReference} from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { useNavigate, useLocation } from "react-router-dom";
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
  additionalEmails?: string[];
  address1?: string | null;
  assignedTo?: string | null;
  businessId?: string | null;
  chat?: {
    contact_id: string;
    id: string;
  };
  name?: string;
  not_spam?: boolean;
  timestamp?: number;
  type?: string;
  city?: string | null;
  companyName?: string | null;
  threadid?: string;
  phoneIndex?: number;
  firstName?: string | null;
}

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence);

interface ContactsContextProps {
  contacts: Contact[];
  filteredContacts: Contact[];  // Add this
  isLoading: boolean;
  refetchContacts: () => Promise<void>;
  dataUser: any | null;
  companyData: any | null;
  setSearchQuery: (query: string) => void;  // Add this
  setActiveTags: (tags: string[]) => void;  // Add this
}

const ContactsContext = createContext<ContactsContextProps | undefined>(undefined);

export const ContactsProvider = ({ children }: { children: ReactNode }) => {
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [v2, setV2] = useState<boolean | undefined>(undefined);
  const [dataUser, setDataUser] = useState<any | null>(null);  // Add this line
  const [companyData, setCompanyData] = useState<any | null>(null);  // Add this line
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [employeeList, setEmployeeList] = useState<Array<{name: string}>>([]);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchContacts = async (user: User) => {
    try {
      setIsLoading(true);
      
      const storedContacts = localStorage.getItem('contacts');
      if (storedContacts) {
        const parsedContacts = JSON.parse(LZString.decompress(storedContacts)!);
        setContacts(parsedContacts);
        setIsLoading(false);
        return;
      }
  
      // If no stored contacts, fetch from Firestore (existing code)
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        setIsLoading(false);
        return;
      }
    
      const dataUser = docUserSnapshot.data();
      setDataUser(dataUser);
      const companyId = dataUser?.companyId;
      if (!companyId) {
        setIsLoading(false);
        return;
      }
  
      // Check for v2
      const companyDocRef = doc(firestore, 'companies', companyId);
      const companyDocSnapshot = await getDoc(companyDocRef);
      if (companyDocSnapshot.exists()) {
        const companyData = companyDocSnapshot.data();
        setCompanyData(companyData);
        setEmployeeList(companyData.employees || []);
        setV2(companyData.v2 || false);
        if (companyData.v2) {
          if (!location.pathname.includes('/chat')) {
            navigate('/loading');
            return;
          }
        }
      }
  
      // Fetch all contacts without pagination
      const contactsCollectionRef = collection(firestore, `companies/${companyId}/contacts`) as CollectionReference<DocumentData>;
      const contactsSnapshot = await getDocs(contactsCollectionRef);
      
      let allContacts: Contact[] = contactsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Contact));
  
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
      setContacts(allContacts);
      localStorage.setItem('contacts', LZString.compress(JSON.stringify(allContacts)));
  
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refetchContacts = async () => {
    const user = auth.currentUser;
    if (user) {
      await fetchContacts(user);
    }
  };

  useEffect(() => {
    // Clear the session flag when the page reloads
    window.addEventListener('beforeunload', () => {
      sessionStorage.removeItem('contactsFetched');
      sessionStorage.removeItem('contacts');
      localStorage.removeItem('contacts');
       Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('messages_')) {
        sessionStorage.removeItem(key);
      }
    });
    });

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = 'Are you sure you want to leave? Changes you made may not be saved.';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    const shouldFetchContacts = !sessionStorage.getItem('contactsFetched');

    if (shouldFetchContacts) {
      fetchContactsOnAuthChange();
    } else {
      const storedContacts = localStorage.getItem('contacts');
      if (storedContacts) {
        setContacts(JSON.parse(LZString.decompress(storedContacts)!));
      }
      setIsLoading(false);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [navigate]);

  useEffect(() => {
    if (!isLoading && v2 === false && location.pathname === '/loading') {
      navigate('/chat');
    }
  }, [isLoading, v2, location.pathname, navigate]);

  const fetchContactsOnAuthChange = () => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchContacts(user);
      } else {
        setIsLoading(false);
        setV2(undefined);
      }
    });

    return () => unsubscribe();
  };

  // Consolidated sorting function
  const sortContacts = (contacts: Contact[]) => {
    return contacts.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      
      const timestampA = a.last_message?.timestamp 
        ? new Date(a.last_message.timestamp).getTime() 
        : 0;
      const timestampB = b.last_message?.timestamp 
        ? new Date(b.last_message.timestamp).getTime() 
        : 0;
      
      return timestampB - timestampA;
    });
  };

  // Consolidated filtering function
  const filterContacts = useCallback((contactsToFilter: Contact[]) => {
    let filtered = contactsToFilter;
    const activeTag = activeTags[0]?.toLowerCase();

    // Filter by user role
    if (dataUser?.role === "3") {
      filtered = filtered.filter(contact => 
        contact.assignedTo?.toLowerCase() === dataUser?.name?.toLowerCase() ||
        contact.tags?.some(tag => tag.toLowerCase() === dataUser?.name?.toLowerCase())
      );
    }

    // Filter by phone index if user has assigned phone
    if (dataUser?.phone !== undefined && dataUser.phone !== -1) {
      const userPhoneIndex = parseInt(dataUser.phone, 10);
      filtered = filtered.filter(contact => contact.phoneIndex === userPhoneIndex);
    }

    // Apply tag filters
    if (activeTags.length > 0) {
      filtered = filtered.filter((contact) => {
        switch (activeTag) {
          case 'all':
            return !contact.tags?.includes('snooze');
          case 'unread':
            return contact.unreadCount > 0 && !contact.tags?.includes('snooze');
          case 'mine':
            return contact.tags?.some(t => t.toLowerCase() === dataUser?.name?.toLowerCase()) 
              && !contact.tags?.includes('snooze');
          case 'unassigned':
            return !contact.assignedTo && !contact.tags?.some(tag => 
              employeeList?.some(employee => 
                employee.name.toLowerCase() === tag.toLowerCase()
              )
            );
          case 'snooze':
            return contact.tags?.includes('snooze');
          case 'group':
            return contact.chat_id?.endsWith('@g.us');
          default:
            // Check if tag matches phone names or custom tags
            return contact.tags?.includes(activeTag);
        }
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((contact) =>
        contact.contactName?.toLowerCase().includes(query) ||
        contact.firstName?.toLowerCase().includes(query) ||
        contact.phone?.toLowerCase().includes(query) ||
        contact.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return sortContacts(filtered);
  }, [activeTags, searchQuery, dataUser, employeeList]);

  // Apply filtering when contacts or filter criteria change
  useEffect(() => {
    if (contacts.length > 0) {
      const filtered = filterContacts(contacts);
      setFilteredContacts(filtered);
    }
  }, [contacts, filterContacts]);

  return (
    <ContactsContext.Provider value={{ 
      contacts, 
      filteredContacts,
      isLoading, 
      refetchContacts, 
      dataUser, 
      companyData,
      setSearchQuery,
      setActiveTags
    }}>
      {children}
    </ContactsContext.Provider>
  );
};

export const useContacts = () => {
  const context = useContext(ContactsContext);
  if (context === undefined) {
    throw new Error('useContacts must be used within a ContactsProvider');
  }
  return context;
};

export { ContactsContext };

// Updated fetchMessagesFromFirebase function
async function fetchMessagesFromFirebase(companyId: string, chatId: string): Promise<any[]> {
  const number = '+' + chatId.split('@')[0];

  const messagesRef = collection(firestore, `companies/${companyId}/contacts/${number}/messages`);
  const messagesQuery = query(messagesRef, orderBy('timestamp', 'desc'), limit(10));
  const messagesSnapshot = await getDocs(messagesQuery);
  
  const messages = messagesSnapshot.docs.map(doc => doc.data());

  // Messages are already sorted by timestamp in descending order due to the query
  return messages;
}

// New function to format messages
function formatMessages(messages: any[]): any[] {
  const formattedMessages: any[] = [];
  const reactionsMap: Record<string, any[]> = {};

  messages.forEach((message: any) => {
    if (message.type === 'action' && message.action.type === 'reaction') {
      const targetMessageId = message.action.target;
      if (!reactionsMap[targetMessageId]) {
        reactionsMap[targetMessageId] = [];
      }
      reactionsMap[targetMessageId].push({
        emoji: message.action.emoji,
        from_name: message.from_name
      });
    } else {
      const formattedMessage: any = {
        id: message.id,
        from_me: message.from_me,
        from_name: message.from_name,
        from: message.from,
        chat_id: message.chat_id,
        type: message.type,
        author: message.author,
        name: message.name,
        phoneIndex: message.phoneIndex,
        userName: message.userName,
        edited: message.edited
      };

      // Handle timestamp based on message type
      if (message.type === 'privateNote') {
        if (message.timestamp && message.timestamp.seconds) {
          // Firestore Timestamp
          formattedMessage.createdAt = new Date(message.timestamp.seconds * 1000).toISOString();
      } else if (typeof message.timestamp === 'string') {
          // String timestamp
          const parsedDate = new Date(message.timestamp);
          if (!isNaN(parsedDate.getTime())) {
              formattedMessage.createdAt = parsedDate.toISOString();
          } else {
              console.warn('Invalid date string for private note:', message.timestamp);
              formattedMessage.createdAt = message.timestamp; // Keep the original string
          }
      } else if (message.timestamp instanceof Date) {
          // Date object
          formattedMessage.createdAt = message.timestamp.toISOString();
      } else if (typeof message.timestamp === 'number') {
          // Unix timestamp (milliseconds)
          formattedMessage.createdAt = new Date(message.timestamp).toISOString();
      } else {
          console.warn('Unexpected timestamp format for private note:', message.timestamp);
          formattedMessage.createdAt = message.timestamp; // Keep the original value
      }
      } else {
        formattedMessage.createdAt = new Date(message.timestamp * 1000).toISOString();
      }

      // Include message-specific content
       // Include message-specific content
       switch (message.type) {
        case 'text':
          formattedMessage.text = {
              body: message.text ? message.text.body : '', // Include the message body
              context: message.text && message.text.context ? {
                  quoted_author: message.text.context.quoted_author,
                  quoted_content: {
                      body: message.text.context.quoted_content?.body || ''
                  }
              } : null
            };                
            break;
        case 'image':
            formattedMessage.image = message.image ? message.image : undefined;
            break;
        case 'video':
            formattedMessage.video = message.video ? message.video : undefined;
            break;
        case 'gif':
            formattedMessage.gif = message.gif ? message.gif : undefined;
            break;
        case 'audio':
            formattedMessage.audio = message.audio ? message.audio : undefined;
            break;
        case 'voice':
            formattedMessage.voice = message.voice ? message.voice : undefined;
            break;
        case 'document':
            formattedMessage.document = message.document ? message.document : undefined;
            break;
        case 'link_preview':
            formattedMessage.link_preview = message.link_preview ? message.link_preview : undefined;
            break;
        case 'sticker':
            formattedMessage.sticker = message.sticker ? message.sticker : undefined;
            break;
        case 'location':
            formattedMessage.location = message.location ? message.location : undefined;
            break;
        case 'live_location':
            formattedMessage.live_location = message.live_location ? message.live_location : undefined;
            break;
        case 'contact':
            formattedMessage.contact = message.contact ? message.contact : undefined;
            break;
        case 'contact_list':
            formattedMessage.contact_list = message.contact_list ? message.contact_list : undefined;
            break;
        case 'interactive':
            formattedMessage.interactive = message.interactive ? message.interactive : undefined;
            break;
        case 'ptt':
            formattedMessage.ptt = message.ptt ? message.ptt : undefined;
            break;
        case 'poll':
            formattedMessage.poll = message.poll ? message.poll : undefined;
            break;
        case 'hsm':
            formattedMessage.hsm = message.hsm ? message.hsm : undefined;
            break;
        case 'system':
            formattedMessage.system = message.system ? message.system : undefined;
            break;
        case 'order':
            formattedMessage.order = message.order ? message.order : undefined;
            break;
        case 'group_invite':
            formattedMessage.group_invite = message.group_invite ? message.group_invite : undefined;
            break;
        case 'admin_invite':
            formattedMessage.admin_invite = message.admin_invite ? message.admin_invite : undefined;
            break;
        case 'product':
            formattedMessage.product = message.product ? message.product : undefined;
            break;
        case 'catalog':
            formattedMessage.catalog = message.catalog ? message.catalog : undefined;
            break;
        case 'product_items':
            formattedMessage.product_items = message.product_items ? message.product_items : undefined;
            break;
        case 'action':
            formattedMessage.action = message.action ? message.action : undefined;
            break;
        case 'context':
            formattedMessage.context = message.context ? message.context : undefined;
            break;
        case 'reactions':
            formattedMessage.reactions = message.reactions ? message.reactions : undefined;
            break;
            case 'privateNote':

formattedMessage.text = typeof message.text === 'string' ? message.text : message.text?.body || '';

formattedMessage.from_me = true;
formattedMessage.from_name = message.from;
break;
        default:
            console.warn(`Unknown message type: ${message.type}`);
    }

      formattedMessages.push(formattedMessage);
    }
  });

  // Add reactions to the respective messages
  formattedMessages.forEach(message => {
    if (reactionsMap[message.id]) {
      message.reactions = reactionsMap[message.id];
    }
  });

  return formattedMessages;
}

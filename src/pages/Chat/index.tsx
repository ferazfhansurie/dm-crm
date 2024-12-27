import React, { useState, useEffect, useRef, useCallback, useMemo, Fragment } from "react";
import { getAuth, signOut } from "firebase/auth";
import { initializeApp } from "firebase/app";
import logoImage from '@/assets/images/placeholder.svg';
import { getFirestore,Timestamp,  collection, doc, getDoc, onSnapshot, setDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, arrayRemove,arrayUnion, writeBatch, serverTimestamp, runTransaction, increment, getCountFromServer } from "firebase/firestore";
import {QueryDocumentSnapshot, DocumentData ,Query,CollectionReference, startAfter,limit,deleteField} from 'firebase/firestore'
import axios, { AxiosError } from "axios";
import Lucide from "@/components/Base/Lucide";
import Button from "@/components/Base/Button";
import { Dialog, Menu } from "@/components/Base/Headless";
import { format } from 'date-fns';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getStorage, ref, uploadBytes, StorageReference, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { rateLimiter } from '../../utils/rate';
import LoadingIcon from "@/components/Base/LoadingIcon";
import { useLocation } from "react-router-dom";
import { useContacts } from '../../contact';
import LZString from 'lz-string';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import Tippy from "@/components/Base/Tippy";
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { ReactMic } from 'react-mic';
import {  useNavigate } from "react-router-dom";
import noti from "../../assets/audio/noti.mp3";
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { Lock, MessageCircle } from "lucide-react";
import { Menu as ContextMenu, Item, Separator, useContextMenu } from 'react-contexify';
import 'react-contexify/dist/ReactContexify.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import ReactPaginate from 'react-paginate';
import { getFileTypeFromMimeType } from '../../utils/fileUtils';
import { Transition } from "@headlessui/react";

interface Label {
  id: string;
  name: string;
  color: string;
  count: number;
}

interface Contact {
  conversation_id?: string | null;
  additionalEmails?: string[] | null;
  address1?: string | null;
  assignedTo?: string | null;
  businessId?: string | null;
  city?: string | null;
  companyName?: string | null;
  contactName?: string | null;
  country?: string | null;
  customFields?: any[] | null;
  dateAdded?: string | null;
  dateOfBirth?: string | null;
  dateUpdated?: string | null;
  dnd?: boolean | null;
  dndSettings?: any | null;
  email?: string | null;
  firstName?: string | null;
  followers?: string[] | null;
  id?: string | null;
  lastName?: string | null;
  locationId?: string | null;
  phone?: string | null;
  postalCode?: string | null;
  source?: string | null;
  state?: string | null;
  tags?: string[] | null;
  type?: string | null;
  website?: string | null;
  chat?: Chat[] | null;
  last_message?: Message | null;
  chat_id?: string | null;
  unreadCount?: number | null;
  pinned?: boolean | null;
  profilePicUrl?:string;
  phoneIndex?:number |null;
  points?:number |null;
  phoneIndexes?:number[] |null;
}
interface GhlConfig {
  ghl_id: string;
  ghl_secret: string;
  refresh_token: string;
  ghl_accessToken: string;
  ghl_location: string;
  whapiToken: string;
  v2?: boolean;
}
interface Chat {
  id?: string;
  name?: string;
  last_message?: Message | null;
  labels?: Label[];
  contact_id?: string;
  tags?: string[];
}

interface Message {
  chat_id: string;
  dateAdded?: number | 0;
  timestamp: number | 0;
  id: string;
  text?: { body: string | "" ,  context?: any;};
  from_me?: boolean;
  from_name?: string | "";
  createdAt?: number;
  type?: string;
  from?:string|"";
  author?:string;
  phoneIndex:number;
  image?: { link?: string; caption?: string;url?:string ;data?:string;mimetype?:string};
  video?: { link?: string; caption?: string; };
  gif?: { link?: string; caption?: string };
  audio?: { link?: string; caption?: string;data?:string;mimetype?:string };
  ptt?: { link?: string; caption?: string;data?:string;mimetype?:string };
  voice?: { link?: string; caption?: string };
  document?: {
    file_name: string;
    file_size: number;
    filename: string;
    id: string;
    link?: string;
    mime_type: string;
    page_count: number;
    preview: string;
    sha256: string;
    data?:string;
    caption?:string;
  mimetype?: string;
  fileSize?: number;
  };
  link_preview?: { link: string; title: string; description: string ,body:string,preview:string};
  sticker?: { link: string; emoji: string;mimetype:string;data:string };
  location?: { latitude: number; longitude: number; name: string };
  live_location?: { latitude: number; longitude: number; name: string };
  contact?: { name: string; phone: string };
  contact_list?: { contacts: { name: string; phone: string }[] };
  interactive?: any;
  poll?: any;
  userName?: string;
  hsm?: any;
  edited?: boolean;
  system?: any;
  order?: any;
  group_invite?: any;
  admin_invite?: any;
  product?: any;
  catalog?: any;
  product_items?: any;
  action?: any;
  context?: any;
  reactions?: { emoji: string; from_name: string }[];
  name?:string;
  isPrivateNote?: boolean;
}
interface Employee {
  id: string;
  name: string;
  employeeId: string;
  role: string;
  phoneNumber?: string;
  phone?: string;
  quotaLeads?: number;
  assignedContacts?: number;
  group?: string;
  // Add other properties as needed
}
interface Tag {
  id: string;
  name: string;
}
interface UserData {
  companyId: string;
  name: string;
  role: string;
  [key: string]: any; // Add other properties as needed
}
// Define the QuickReply interface
interface QuickReply {
  id: string;
  keyword: string;
  text: string;
  type:string;
  document?: string | null;
  image?: string | null;
}
interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
}
interface Template {
  id: string;
  triggerTags?: string[];
  name?: string;
  messages?: {
    text: string;
    delay: number;
    delayUnit: string;
  }[];
  createdAt?: any;
  updatedAt?: any;
}
interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: File | null;
  onSend: (document: File | null, caption: string) => void;
  type: string;
  initialCaption?: string; // Add this prop
}
interface PDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
}
type Notification = {
  from: string;
  text: {
    body:string
  }
  from_name: string;
  timestamp: number;
  chat_id: string;
  type: string;
};


interface EditMessagePopupProps {
  editedMessageText: string;
  setEditedMessageText: (value: string) => void;
  handleEditMessage: () => void;
  cancelEditMessage: () => void;
}

const DatePickerComponent = DatePicker as any;

const ReactMicComponent = ReactMic as any;

const DocumentModal: React.FC<DocumentModalProps> = ({ isOpen, onClose, document, onSend, type, initialCaption }) => {
  const [caption, setCaption] = useState(initialCaption); // Initialize with initialCaption

  useEffect(() => {
    // Update caption when initialCaption changes
    setCaption(initialCaption);
  }, [initialCaption]);

  const handleSendClick = () => {
    if (document) {
      onSend(document, caption || '');
      onClose();
    }
    setCaption('');
  };

  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div
        className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full md:w-[800px] h-auto md:h-[600px] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Document Preview</h2>
          <button
            className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            onClick={onClose}
          >
            <Lucide icon="X" className="w-6 h-6" />
          </button>
        </div>
        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg mb-4 flex justify-center items-center" style={{ height: '90%' }}>
          {document.type === 'application/pdf' ? (
            <iframe
              src={URL.createObjectURL(document)}
              width="100%"
              height="100%"
              title="PDF Document"
              className="border rounded"
            />
          ) : (
            <div className="text-center">
              <Lucide icon="File" className="w-20 h-20 mb-2 mx-auto text-gray-600 dark:text-gray-400" />
              <p className="text-gray-800 dark:text-gray-200 font-semibold">{document.name}</p>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {(document.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center bg-gray-200 dark:bg-gray-700 rounded-lg p-2">
          <input
            type="text"
            placeholder="Add a caption"
            className="flex-grow bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-200 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          <button
            className="ml-2 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition duration-200"
            onClick={handleSendClick}
          >
            <Lucide icon="Send" className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
const ImageModal: React.FC<ImageModalProps> = ({ isOpen, onClose, imageUrl }) => {
  const [zoomLevel, setZoomLevel] = useState(1);

  if (!isOpen) return null;

  const handleImageClick = () => {
    setZoomLevel(prevZoomLevel => (prevZoomLevel === 1 ? 2 : 1));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75" onClick={onClose}>
      <div
        className="relative mt-10 p-2 bg-white rounded-lg shadow-lg max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt="Modal Content"
          className="rounded-md cursor-pointer"
          style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.3s', maxWidth: '100%', maxHeight: '100%' }}
          onClick={handleImageClick}
        />
        <a
          href={imageUrl}
          download
          className="mt-2 block text-center text-blue-500 hover:underline"
        >
          Save Image
        </a>
        <button
          className="absolute top-4 right-4 text-gray-600 hover:text-gray-900"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
};

const PDFModal = ({ isOpen, onClose, pdfUrl }: PDFModalProps) => {
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
    >
      <Dialog.Panel className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed flex inset-0 bg-black/70 transition-opacity" onClick={onClose} />
        
        <div className="relative mt-10 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-5xl h-4/5">
          <button
            className="absolute top-4 right-4 text-white bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-full p-2 transition-colors"
            onClick={onClose}
          >
            <Lucide icon="X" className="w-6 h-6" />
          </button>

          <iframe
            src={pdfUrl}
            width="100%"
            height="100%"
            title="PDF Document"
            className="border rounded"
          />
        </div>
      </Dialog.Panel>
    </Dialog>
  );
};



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

function Main() {
   // Initial state setup with localStorage
  const { contacts: contextContacts, isLoading: contextLoading } = useContacts();
  const [contacts, setContacts] = useState<Contact[]>(() => {
    const storedContacts = localStorage.getItem('contacts');
    if (storedContacts) {
      try {
        return JSON.parse(LZString.decompress(storedContacts)!);
      } catch (error) {
        console.error('Error parsing stored contacts:', error);
        return [];
      }
    }
    return [];
  });

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [whapiToken, setToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isLoading2, setLoading] = useState<boolean>(false);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [isImageModalOpen, setImageModalOpen] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState('');
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [employeeList, setEmployeeList] = useState<Employee[]>([]);
  const [isTabOpen, setIsTabOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchQuery2, setSearchQuery2] = useState('');
  const [forwardDialogTags, setForwardDialogTags] = useState<string[]>([]);
  const [filteredForwardingContacts, setFilteredForwardingContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const baseMessageClass = "flex flex-col max-w-[auto] min-w-[auto] p-1 text-white";
  const myMessageClass = `${baseMessageClass} bg-primary self-end ml-auto text-left mb-1 mr-6 group`;
  const otherMessageClass = `${baseMessageClass} bg-gray-700 self-start text-left mt-1 ml-2 group`;
  const myFirstMessageClass = `${myMessageClass} rounded-tr-xl rounded-tl-xl rounded-br-xl rounded-bl-xl mt-4`;
  const myMiddleMessageClass = `${myMessageClass} rounded-tr-xl rounded-tl-xl rounded-br-xl rounded-bl-xl`;
  const myLastMessageClass = `${myMessageClass} rounded-tr-xl rounded-tl-xl rounded-br-xl rounded-bl-xl mb-4`;
  const otherFirstMessageClass = `${otherMessageClass} rounded-tr-xl rounded-tl-xl rounded-br-xl rounded-bl-xl mt-4`;
  const otherMiddleMessageClass = `${otherMessageClass} rounded-tr-xl rounded-tl-xl rounded-br-xl rounded-bl-xl`;
  const otherLastMessageClass = `${otherMessageClass} rounded-tr-xl rounded-tl-xl rounded-br-xl rounded-bl-xl mb-4`;
  const [messageMode, setMessageMode] = useState('reply');
  const myMessageTextClass = "text-white"
  const otherMessageTextClass = "text-white"
  const [activeTags, setActiveTags] = useState<string[]>(['all']);
  const [tagList, setTagList] = useState<Tag[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isForwardDialogOpen, setIsForwardDialogOpen] = useState(false);
  const [selectedContactsForForwarding, setSelectedContactsForForwarding] = useState<Contact[]>([]);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [isQuickRepliesOpen, setIsQuickRepliesOpen] = useState<boolean>(false);
  const [editingReply, setEditingReply] = useState<QuickReply | null>(null);
  const [newQuickReply, setNewQuickReply] = useState<string>('');
  const [newQuickReplyKeyword, setNewQuickReplyKeyword] = useState('');
  const [filteredContactsForForwarding, setFilteredContactsForForwarding] = useState<Contact[]>(contacts);
  const [selectedMessages, setSelectedMessages] = useState<Message[]>([]);
  const messageListRef = useRef<HTMLDivElement>(null);
  const prevNotificationsRef = useRef<number | null>(null);
  const [phoneCount, setPhoneCount] = useState<number>(1);
  const isInitialMount = useRef(true);
  const [isDeletePopupOpen, setIsDeletePopupOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editedMessageText, setEditedMessageText] = useState<string>("");
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [isPDFModalOpen, setPDFModalOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [isEmojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [isImageModalOpen2, setImageModalOpen2] = useState(false);
  const [pastedImageUrl, setPastedImageUrl] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [contactsPerPage] = useState(50);
  const contactListRef =useRef<HTMLDivElement>(null);
  const [response, setResponse] = useState<string>('');
  const [qrCodeImage, setQrCodeImage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showQrCode, setShowQrCode] = useState<boolean>(false);
  const [isAllBotsEnabled, setIsAllBotsEnabled] = useState(true);
  const [pinnedTags, setPinnedTags] = useState<string[]>([]);
  const [employeeTags, setEmployeeTags] = useState<string[]>([]);
  const [otherTags, setOtherTags] = useState<string[]>([]);
  const [tagsError, setTagsError] = useState<boolean>(false);
  const [tags, setTags] = useState<string[]>([]);
  const [isV2User, setIsV2User] = useState(false);
  const [isTagsExpanded, setIsTagsExpanded] = useState(false);
  const [visibleTags, setVisibleTags] = useState<typeof tagList>([]);
  const [companySubstring, setCompanyId] = useState<string | null>(null);
  const [isPrivateNote, setIsPrivateNote] = useState(false);
  const [privateNotes, setPrivateNotes] = useState<Record<string, Array<{ id: string; text: string; timestamp: number }>>>({});
  const [isPrivateNotesExpanded, setIsPrivateNotesExpanded] = useState(false);
  const privateNoteRef = useRef<HTMLDivElement>(null);
  const [newPrivateNote, setNewPrivateNote] = useState('');
  const [isPrivateNotesMentionOpen, setIsPrivateNotesMentionOpen] = useState(false);
  const [showAllContacts, setShowAllContacts] = useState(true);
  const [showUnreadContacts, setShowUnreadContacts] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [isChatActive, setIsChatActive] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [editedName, setEditedName] = useState('');
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newContactNumber, setNewContactNumber] = useState('');
  const [showMineContacts, setShowMineContacts] = useState(false);
  const [showGroupContacts, setShowGroupContacts] = useState(false);
  const [showUnassignedContacts, setShowUnassignedContacts] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [reminderDate, setReminderDate] = useState<Date | null>(null);
  const [reminderText, setReminderText] = useState('');
  const currentUserName = userData?.name || '';
  const [isMessageSearchOpen, setIsMessageSearchOpen] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [messageSearchResults, setMessageSearchResults] = useState<any[]>([]);
  const messageSearchInputRef = useRef<HTMLInputElement>(null);
  const [showSnoozedContacts, setShowSnoozedContacts] = useState(false);
  const [blastMessageModal, setBlastMessageModal] = useState(false);
  const [blastMessage, setBlastMessage] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [blastStartTime, setBlastStartTime] = useState<Date | null>(null);
  const [blastStartDate, setBlastStartDate] = useState<Date>(new Date());
  const [batchQuantity, setBatchQuantity] = useState<number>(10);
  const [repeatInterval, setRepeatInterval] = useState<number>(0);
  const [repeatUnit, setRepeatUnit] = useState<'minutes' | 'hours' | 'days'>('days');
  const [isScheduling, setIsScheduling] = useState(false);
  const [activeQuickReplyTab, setActiveQuickReplyTab] = useState<'all' | 'self'>('all');
  const [newQuickReplyType, setNewQuickReplyType] = useState<'all' | 'self'>('all');
  const quickRepliesRef = useRef<HTMLDivElement>(null);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<File | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [quickReplyFilter, setQuickReplyFilter] = useState('');
  const [phoneNames, setPhoneNames] = useState<Record<number, string>>({});
  const [userPhone, setUserPhone] = useState<number | null>(null);
  const [activeNotifications, setActiveNotifications] = useState<(string | number)[]>([]);
  const [isAssistantAvailable, setIsAssistantAvailable] = useState(false);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [showPlaceholders, setShowPlaceholders] = useState(false);
  const [caption, setCaption] = useState(''); // Add this line to define setCaption
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isRecordingPopupOpen, setIsRecordingPopupOpen] = useState(false);
  const [selectedDocumentURL, setSelectedDocumentURL] = useState<string | null>(null);
  const [documentCaption, setDocumentCaption] = useState('');
  const [isPhoneDropdownOpen, setIsPhoneDropdownOpen] = useState(false);

  const [showAllForwardTags, setShowAllForwardTags] = useState(false);
  const [visibleForwardTags, setVisibleForwardTags] = useState<typeof tagList>([]);

  const [totalContacts, setTotalContacts] = useState<number>(0);

  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [reactionMessage, setReactionMessage] = useState<any>(null);

  const [isGlobalSearchActive, setIsGlobalSearchActive] = useState(false);
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false);
  const [globalSearchPage, setGlobalSearchPage] = useState(1);
  const [totalGlobalSearchPages, setTotalGlobalSearchPages] = useState(1);
  const [messageUsage, setMessageUsage] = useState<number>(0);
  const [companyPlan, setCompanyPlan] = useState<string>('');
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [videoCaption, setVideoCaption] = useState('');
  const [trialExpired, setTrialExpired] = useState(false);
  const [minDelay, setMinDelay] = useState(1);
const [maxDelay, setMaxDelay] = useState(2);
const [activateSleep, setActivateSleep] = useState(false);
const [sleepAfterMessages, setSleepAfterMessages] = useState(20);
const [sleepDuration, setSleepDuration] = useState(5);
  useEffect(() => {
    const checkTrialStatus = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (!user?.email) {
          return;
        }
  
        const docUserRef = doc(firestore, 'user', user.email);
        const docUserSnapshot = await getDoc(docUserRef);
        
        if (!docUserSnapshot.exists()) {
          throw new Error("User document not found");
        }
  
        const userData = docUserSnapshot.data();
        const companyId = userData.companyId;
  
        const companyRef = doc(firestore, 'companies', companyId);
        const companySnapshot = await getDoc(companyRef);
  
        if (!companySnapshot.exists()) {
          throw new Error("Company document not found");
        }
  
        const companyData = companySnapshot.data();
        
        if (companyData.trialEndDate) {
          const trialEnd = companyData.trialEndDate.toDate();
          const now = new Date();
          
          if (now > trialEnd) {
            setTrialExpired(true);
            toast.error("Your trial period has expired. Please contact support to continue using the service.");
            await signOut(auth);
            navigate('/login');
          }
        }
      } catch (error) {
        console.error("Error checking trial status:", error);
        toast.error("Error checking subscription status");
      }
    };
  
    checkTrialStatus();
  }, []); // Run once when component mounts
  useEffect(() => {
    if (contextContacts.length > 0) {
      setContacts(contextContacts as Contact[]);
    }
  }, [contextContacts]);


  useEffect(() => {
    let filteredResults = contacts;
  
    // Only keep filtering logic
    if (searchQuery) {
      filteredResults = filteredResults.filter((contact) => {
        const searchLower = searchQuery.toLowerCase();
        return (
          contact.contactName?.toLowerCase().includes(searchLower) ||
          contact.phone?.toLowerCase().includes(searchLower) ||
          contact.tags?.some((tag: string) => tag.toLowerCase().includes(searchLower))
        );
      });
    }
  
    if (activeTags.length > 0) {
      filteredResults = filteredResults.filter((contact) => {
        return activeTags.every((tag) => {
          const tagLower = tag.toLowerCase();
          const isGroup = contact.chat_id?.endsWith('@g.us');
          const phoneIndex = Object.entries(phoneNames).findIndex(([_, name]) => name.toLowerCase() === tagLower);
          
          return (
            tagLower === 'all' ? !isGroup :
            tagLower === 'unread' ? contact.unreadCount && contact.unreadCount > 0 :
            tagLower === 'mine' ? contact.tags?.includes(currentUserName) :
            tagLower === 'unassigned' ? !contact.tags?.some(t => employeeList.some(e => e.name.toLowerCase() === t.toLowerCase())) :
            tagLower === 'snooze' ? contact.tags?.includes('snooze') :
            tagLower === 'resolved' ? contact.tags?.includes('resolved') :
            tagLower === 'group' ? isGroup :
            tagLower === 'stop bot' ? contact.tags?.includes('stop bot') :
            phoneIndex !== -1 ? contact.phoneIndex === phoneIndex :
            contact.tags?.map(t => t.toLowerCase()).includes(tagLower)
          );
        });
      });
    }

    setFilteredContacts(filteredResults);
  }, [contacts, searchQuery, activeTags, currentUserName, employeeList, phoneNames]);

  // Initial chat selection from URL


  // Update this useEffect
  useEffect(() => {
    setVisibleForwardTags(showAllForwardTags ? tagList : tagList.slice(0, 5));
  }, [tagList, showAllForwardTags]);

  // Update this function name
  const toggleForwardTagsVisibility = () => {
    setShowAllForwardTags(!showAllForwardTags);
  };

  const filteredContactsSearch = useMemo(() => {
    return contacts.filter((contact) => {
      const searchTerms = searchQuery.toLowerCase().split(' ');
      const contactName = (contact.contactName || '').toLowerCase();
      const firstName = (contact.firstName || '').toLowerCase();
      const phone = (contact.phone || '').toLowerCase();
      const tags = (contact.tags || []).map(tag => tag.toLowerCase());
  
      const matchesSearch = searchTerms.every(term => 
        contactName.includes(term) || 
        firstName.includes(term) || 
        phone.includes(term) || 
        tags.some(tag => tag.includes(term))
      );
  
      const matchesTagFilters = activeTags.length === 0 || 
                                activeTags.includes('all') || 
                                activeTags.some(tag => tags.includes(tag.toLowerCase()));
  
      return matchesSearch && matchesTagFilters;
    });
  }, [contacts, searchQuery, activeTags]);

  const toggleRecordingPopup = () => {
    setIsRecordingPopupOpen(!isRecordingPopupOpen);
    if (!isRecordingPopupOpen) {
      setIsRecording(false);
      setAudioBlob(null);
      setAudioUrl(null);
    }
  };


  const onStop = (recordedBlob: { blob: Blob; blobURL: string }) => {
    console.log('recordedBlob is: ', recordedBlob);
    setAudioBlob(recordedBlob.blob);
  };
  
  const toggleRecording = () => {
    setIsRecording(!isRecording);
    if (isRecording) {
      setAudioBlob(null);
    }
  };
// Add a handler for video uploads
const handleVideoUpload = async (caption: string = '') => {
  if (!selectedVideo || !selectedChatId || !userData) return;

  try {
    // First upload the video file to get a URL
    const videoFile = new File([selectedVideo], `video_${Date.now()}.mp4`, { type: selectedVideo.type });
    const videoUrl = await uploadFile(videoFile);

    // Get company ID and other necessary data
    const docUserRef = doc(firestore, 'user', userData.email);
    const docUserSnapshot = await getDoc(docUserRef);
    if (!docUserSnapshot.exists()) {
      throw new Error('No such document for user!');
    }
    const userDataFromDb = docUserSnapshot.data();
    const companyId = userDataFromDb.companyId;

    // Format chat ID
    const phoneNumber = selectedChatId.split('+')[1];
    const chat_id = phoneNumber + "@s.whatsapp.net";

    // Call the video message API
    const response = await axios.post(`/api/v2/messages/video/${companyId}/${chat_id}`, {
      videoUrl,
      caption,
      phoneIndex: selectedContact.phoneIndex || 0,
      userName: userData.name
    });

    if (response.data.success) {
      setVideoModalOpen(false);
      setSelectedVideo(null);
      setVideoCaption('');
      toast.success('Video sent successfully');
    }
  } catch (error) {
    console.error('Error uploading video:', error);
    toast.error('Failed to send video message');
  }
};
  const convertToOggOpus = async (blob: Blob): Promise<Blob> => {
    const ffmpeg = new FFmpeg();
    await ffmpeg.load();
  
    const inputFileName = 'input.webm';
    const outputFileName = 'output.ogg';
  
    ffmpeg.writeFile(inputFileName, await fetchFile(blob));
  
    await ffmpeg.exec(['-i', inputFileName, '-c:a', 'libopus', outputFileName]);
  
    const data = await ffmpeg.readFile(outputFileName);
    return new Blob([data], { type: 'audio/ogg; codecs=opus' });
  };
  
const sendVoiceMessage = async () => {
  if (audioBlob && selectedChatId && userData) {
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
      // Convert the audio Blob to a File
      const audioFile = new File([audioBlob], `voice_message_${Date.now()}.webm`, { type: "audio/webm" });

      // Upload the audio file using the provided uploadFile function
      const audioUrl = await uploadFile(audioFile);
      console.log(audioUrl)
      const requestBody = {
        audioUrl,
        caption: '',
        phoneIndex: selectedContact?.phoneIndex || 0,
        userName: userData.name
      };

      const response = await axios.post(
        `${baseUrl}/api/v2/messages/audio/${userData.companyId}/${selectedChatId}`,
        requestBody
      );

      if (response.data.success) {
        console.log("Voice message sent successfully:", response.data.messageId);
        toast.success("Voice message sent successfully");
      } else {
        console.error("Failed to send voice message");
        toast.error("Failed to send voice message");
      }

      setAudioBlob(null);
      setIsRecordingPopupOpen(false);
    } catch (error) {
      console.error("Error sending voice message:", error);
      toast.error("Error sending voice message");
    }
  }
};

const handleReaction = async (message: any, emoji: string) => {
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
    // Ensure we have all required data
    if (!userData?.companyId || !message.id) {
      throw new Error('Missing required data: companyId or messageId');
    }

    // Use the full message ID from Firebase
    const messageId = message.id;
    
    console.log('Reaction details:', {
      emoji,
      messageId,
      companyId: userData.companyId,
      phoneIndex: selectedContact?.phoneIndex
    });
    
    // Construct the endpoint with the full message ID
    const endpoint = `${baseUrl}/api/messages/react/${userData.companyId}/${messageId}`;
    
    const payload = {
      reaction: emoji,
      phoneIndex: selectedContact?.phoneIndex || 0
    };

    console.log('Sending reaction request:', {
      endpoint,
      payload
    });

    const response = await axios.post(endpoint, payload);

    if (response.data.success) {
      setMessages(prevMessages => prevMessages.map(msg => {
        if (msg.id === message.id) {
          return {
            ...msg,
            reactions: [...(msg.reactions || []), { emoji, from_name: userData.name }]
          };
        }
        return msg;
      }));
      
      toast.success('Reaction added successfully');
    }
  } catch (error) {
    console.error('Error adding reaction:', error);
    if (axios.isAxiosError(error) && error.response?.data) {
      console.error('Error response:', error.response.data);
      const errorMessage = error.response.data.details || error.response.data.error || 'Failed to add reaction';
      toast.error(errorMessage);
    } else {
      toast.error('Failed to add reaction. Please try again.');
    }
  } finally {
    setShowReactionPicker(false);
  }
};

const ReactionPicker = ({ onSelect, onClose }: { onSelect: (emoji: string) => void, onClose: () => void }) => {
  const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
  
  return (
    <div className="absolute bottom-40 right-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 z-50">
      <div className="flex items-center justify-between align-middle space-x-2">
        {commonEmojis.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSelect(emoji)}
            className="hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-full transition-colors text-2xl"
          >
            {emoji}
          </button>
        ))}
        <button
          onClick={onClose}
          className="p-2 rounded-full transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <Lucide icon="X" className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};


  const uploadDocument = async (file: File): Promise<string> => {
    const storage = getStorage(); // Correctly initialize storage
    const storageRef = ref(storage, `quickReplies/${file.name}`); // Use the initialized storage
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const handleMessageSearchClick = () => {
    setIsMessageSearchOpen(!isMessageSearchOpen);
    if (!isMessageSearchOpen) {
      setTimeout(() => {
        messageSearchInputRef.current?.focus();
      }, 0);
    }
  };

  const handleMessageSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageSearchQuery(e.target.value);
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (user && userData) {
      const companyId = userData.companyId;
      const contactsRef = collection(firestore, `companies/${companyId}/contacts`);
      const q = query(contactsRef, orderBy("last_message.timestamp", "desc"));
  
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const updatedContacts = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Contact));
        setContacts(updatedContacts);
      });
  
      return () => unsubscribe();
    }
  }, [userData]);

  useEffect(() => {
    const fetchCompanyData = async () => {
      const user = auth.currentUser;
      if (user) {
        const docUserRef = doc(firestore, 'user', user.email!);
        const docUserSnapshot = await getDoc(docUserRef);
        if (docUserSnapshot.exists()) {
          const userData = docUserSnapshot.data();
          const companyId = userData.companyId;
          setCompanyId(companyId);

          const companyRef = doc(firestore, 'companies', companyId);
          const companySnapshot = await getDoc(companyRef);
          if (companySnapshot.exists()) {
            const companyData = companySnapshot.data();
            if (companyData) {
              setIsAssistantAvailable(!!companyData.assistantId);
            }
            if(companyData.plan === 'blaster'){
              setIsAssistantAvailable(false);
            }
            const phoneCount = companyData.phoneCount || 0;
            const newPhoneNames: Record<number, string> = {};
            for (let i = 0; i < phoneCount; i++) {
              newPhoneNames[i] = companyData[`phone${i + 1}`] || `Phone ${i + 1}`;
            }
            setPhoneNames(newPhoneNames);
            setPhoneCount(phoneCount);
          }
        }
      }
    };
  
    fetchCompanyData();
  }, []);

  useEffect(() => {
    if (messageSearchQuery) {
      const results = messages.filter(message => 
        message.type === 'text' && 
        message.text?.body.toLowerCase().includes(messageSearchQuery.toLowerCase())
      );
      setMessageSearchResults(results);
    } else {
      setMessageSearchResults([]);
    }
  }, [messageSearchQuery, messages]);

  const scrollToMessage = (messageId: string) => {
    if (messageListRef.current) {
      const messageElement = messageListRef.current.querySelector(`[data-message-id="${messageId}"]`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        messageElement.classList.add('highlight-message');
        setTimeout(() => {
          messageElement.classList.remove('highlight-message');
        }, 2000);
      }
    }
    setIsMessageSearchOpen(false); // Close the search panel after clicking a result
  };

  useEffect(() => {
    if (selectedContact) {
      setEditedName(selectedContact.contactName || selectedContact.firstName || '');
    }
  }, [selectedContact]);



  useEffect(() => {
    updateEmployeeAssignedContacts();
    const initializeActiveTags = async () => {
      const user = auth.currentUser;
      if (user) {
        const docUserRef = doc(firestore, 'user', user.email!);
        const docUserSnapshot = await getDoc(docUserRef);
        if (docUserSnapshot.exists()) {
          const userData = docUserSnapshot.data();
          const companyId = userData.companyId;
  
          if (companyId !== '042') {
        
            filterTagContact('all');
          } else {
            // Keep the existing logic for bot042
          
            filterTagContact('mine');
          }
        }
      }
    };
  
    initializeActiveTags();
  }, []); 

  const handleBack = () => {
    navigate("/"); // or wherever you want to navigate to
    setIsChatActive(false);
    setSelectedChatId(null);
    setMessages([]);
  };
  

  useEffect(() => {
    updateVisibleTags();
  }, [contacts, tagList, isTagsExpanded]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (privateNoteRef.current && !privateNoteRef.current.contains(event.target as Node)) {
        setIsPrivateNotesExpanded(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [privateNoteRef]);

  const updateVisibleTags = () => {
    const nonGroupContacts = contacts.filter(contact => 
      contact.chat_id && !contact.chat_id.includes('@g.us')
    );
  
    const allUnreadTags = [
      { 
        id: 'all', 
        name: 'All', 
        count: nonGroupContacts.length
      },
      { 
        id: 'unread', 
        name: 'Unread', 
        count: nonGroupContacts.filter(contact => (contact.unreadCount || 0) > 0).length
      },
    ];
  
    const updatedTagList = tagList.map(tag => ({
      ...tag,
      count: nonGroupContacts.filter(contact => 
        contact.tags?.includes(tag.name) && (contact.unreadCount || 0) > 0
      ).length
    }));
  
    if (isTagsExpanded) {
      setVisibleTags([...allUnreadTags, ...updatedTagList]);
    } else {
      const containerWidth = 300; // Adjust this based on your container width
      const tagWidth = 100; // Approximate width of each tag button
      const tagsPerRow = Math.floor(containerWidth / tagWidth);
      const visibleTagsCount = tagsPerRow * 2 - 3; // Two rows, minus All, Unread, and Group
      setVisibleTags([...allUnreadTags, ...updatedTagList.slice(0, visibleTagsCount)]);
    }
  };

  const toggleTagsExpansion = () => {
    setIsTagsExpanded(!isTagsExpanded);
  };
  const [stopbot, setStopbot] = useState(false);


  const handlePrivateNoteMentionSelect = (employee: Employee) => {
    const mentionText = `@${employee.name} `;
    const newValue = newMessage.replace(/@[^@]*$/, mentionText);
    setNewMessage(newValue);
    setIsPrivateNotesMentionOpen(false);
  };

  // useEffect(() => {
  //   console.log('Initial contacts:', initialContacts);
  // }, []);

  const filterContactsByUserRole = useCallback((contacts: Contact[], userRole: string, userName: string) => {
    console.log('Filtering contacts by user role', { userRole, userName, contactsCount: contacts.length });
    switch (userRole) {
      case '1': // Admin
        return contacts; // Admin sees all contacts
      case '2': // Sales
      case '3': // Observer
      case '4': // Manager
        // Sales, Observer, and Manager see only contacts assigned to them
        return contacts.filter(contact => 
          contact.tags?.some(tag => tag.toLowerCase() === userName.toLowerCase())
        );
      case '5': // Other role
        return contacts;
      default:
        console.warn(`Unknown user role: ${userRole}`);
        return [];
    }
  }, []);
// Add this function to handle phone change
const handlePhoneChange = async (newPhoneIndex: number) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error('No authenticated user');
      return;
    }

    const docUserRef = doc(firestore, 'user', user.email!);
    await updateDoc(docUserRef, { phone: newPhoneIndex });
    // Update local state
    setUserData(prevState => {
      if (prevState === null) {
        return {
          phone: newPhoneIndex,
          companyId: '',
          name: '',
          role: ''
        };
      }
      return {
        ...prevState,
        phone: newPhoneIndex
      };
    });

    toast.success('Phone updated successfully');
  } catch (error) {
    console.error('Error updating phone:', error);
    toast.error('Failed to update phone');
  }
};
  const filterAndSetContacts = useCallback((contactsToFilter: Contact[]) => {
    console.log('Filtering contacts', { 
      contactsLength: contactsToFilter.length, 
      userRole, 
      userName: userData?.name,
      activeTags,
    });
  
    // Apply role-based filtering first
    let filtered = filterContactsByUserRole(contactsToFilter, userRole, userData?.name || '');
    console.log('After role-based filtering:', { filteredCount: filtered.length });
  
    // Filter out group chats
    filtered = filtered.filter(contact => 
      contact.chat_id && !contact.chat_id.includes('@g.us')
    );
    console.log('After filtering group chats:', { filteredCount: filtered.length });
  
    // Apply tag-based filtering only if activeTags is not empty and doesn't include 'all'
    if (activeTags.length > 0 && !activeTags.includes('all')) {
      filtered = filtered.filter(contact => 
        contact.tags?.some(tag => activeTags.includes(tag))
      );
      console.log('After tag-based filtering:', { filteredCount: filtered.length, activeTags });
    }
  
    setFilteredContacts(filtered);
    console.log('Final filtered contacts set:', { filteredCount: filtered.length });
  }, [userRole, userData, activeTags, filterContactsByUserRole]);

  useEffect(() => {
    const fetchContacts = async () => {
      if (!userData?.companyId) {
        console.log('No company ID available, skipping contact fetch');
        return;
      }
  
      console.log('Fetching contacts for company:', userData.companyId);
      const contactsRef = collection(firestore, `companies/${userData.companyId}/contacts`);
      const q = query(contactsRef, orderBy("last_message.timestamp", "desc"));
  
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const updatedContacts = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Contact));
        console.log('Fetched contacts:', updatedContacts.length);
        setContacts(updatedContacts);
        filterAndSetContacts(updatedContacts);
      }, (error) => {
        console.error('Error fetching contacts:', error);
      });
  
      return () => unsubscribe();
    };
  
    fetchContacts();
  }, [userData, filterAndSetContacts]);

  // useEffect(() => {
  //   if (initialContacts.length > 0) {
  //     console.log('Initial contacts:', initialContacts.length);
  //     setContacts(initialContacts);
  //     filterAndSetContacts(initialContacts);
  //     localStorage.setItem('contacts', LZString.compress(JSON.stringify(initialContacts)));
  //     sessionStorage.setItem('contactsFetched', 'true');
  //   }
  // }, [initialContacts, userRole, userData, filterAndSetContacts]);




useEffect(() => {
  const handleScroll = () => {
    if (
      contactListRef.current &&
      contactListRef.current.scrollTop + contactListRef.current.clientHeight >=
        contactListRef.current.scrollHeight
    ) {
      // loadMoreContacts();
    }
  };

  if (contactListRef.current) {
    contactListRef.current.addEventListener('scroll', handleScroll);
  }

  return () => {
    if (contactListRef.current) {
      contactListRef.current.removeEventListener('scroll', handleScroll);
    }
  };
}, [contacts]);

useEffect(() => {
  try {
    const pinned = activeTags.filter(tag => tag === 'pinned');
    const employees = activeTags.filter(tag => 
      employeeList.some(employee => employee.name.toLowerCase() === tag.toLowerCase())
    );
    const others = activeTags.filter(tag => 
      tag !== 'pinned' && !employeeList.some(employee => employee.name.toLowerCase() === tag.toLowerCase())
    );

    setPinnedTags(pinned);
    setEmployeeTags(employees);
    setOtherTags(others);
    setTagsError(false);
  } catch (error) {
    console.error("Error processing tags:", error);
    setTagsError(true);
  }
}, [activeTags, employeeList]);

// const loadMoreContacts = () => {
//   if (initialContacts.length <= contacts.length) return;

//   const nextPage = currentPage + 1;
//   const newContacts = initialContacts.slice(
//     contacts.length,
//     nextPage * contactsPerPage
//   );

//   setContacts((prevContacts) => {
//     const updatedContacts = [...prevContacts, ...newContacts];
//     return filterContactsByUserRole(updatedContacts, userRole, userData?.name || '');
//   });
//   setCurrentPage(nextPage);
// };

const handleEmojiClick = (emojiObject: EmojiClickData) => {
  setNewMessage(prevMessage => prevMessage + emojiObject.emoji);
};


const detectMentions = (message: string) => {
  const mentionRegex = /@(\w+)/g;
  const atSymbolRegex = /@$/;
  return message.match(mentionRegex) || (message.match(atSymbolRegex) ? ['@'] : []);
};

const sendWhatsAppAlert = async (employeeName: string, chatId: string) => {
  try {
    const user = auth.currentUser;
    if (!user) return;

    const docUserRef = doc(firestore, 'user', user.email!);
    const docUserSnapshot = await getDoc(docUserRef);
    if (!docUserSnapshot.exists()) return;

    const userData = docUserSnapshot.data();
    const companyId = userData.companyId;
    const docRef = doc(firestore, 'companies', companyId);
    const docSnapshot = await getDoc(docRef);
    if (!docSnapshot.exists()) return;

    const companyData = docSnapshot.data();

    const baseUrl = companyData.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';
    // Fetch employee's WhatsApp number
    const employeesRef = collection(firestore, 'companies', companyId, 'employee');
    const q = query(employeesRef, where("name", "==", employeeName));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log(`No employee found with name ${employeeName}`);
      return; 
    }

    const employeeData = querySnapshot.docs[0].data();
    const employeePhone = employeeData.phoneNumber;
    const temp = employeePhone.split('+')[1];
    const employeeId = temp+`@c.us`;

    console.log(employeeId);
    console.log(selectedChatId);

    // Send WhatsApp alert using the ngrok URL
    const response = await fetch(`${baseUrl}/api/v2/messages/text/${companyId}/${employeeId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `You've been mentioned in a chat. Click here to view: https://web.jutasoftware.co/chat?chatId=${chatId}`,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send WhatsApp alert: ${response.statusText}`);
    }

    console.log(`WhatsApp alert sent to ${employeeName}`);
  } catch (error) {
    console.error('Error sending WhatsApp alert:', error);
  }
};

const openPDFModal = (url: string) => {
  setPdfUrl(url);
  setPDFModalOpen(true);
};

const closePDFModal = () => {
  setPDFModalOpen(false);
  setPdfUrl('');
};
  let companyId = "";
  let user_name = '';
  let user_role='2';
  let totalChats = 0;


  const openDeletePopup = () => {
    setIsDeletePopupOpen(true);
  };
  const closeDeletePopup = () => {
    setIsDeletePopupOpen(false);
  };

  const deleteMessages = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error('No authenticated user');
        toast.error('Authentication error. Please try logging in again.');
        return;
      }
  
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error('No such document for user!');
        toast.error('User data not found. Please contact support.');
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.log('No such document!');
        return;
      }
      const data2 = docSnapshot.data();
      const baseUrl = data2.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';
      let successCount = 0;
      let failureCount = 0;
  
      const phoneIndex = selectedContact?.phoneIndex || 0;
  
      for (const message of selectedMessages) {
        try {
          console.log(`Attempting to delete message: ${message.id}`);
          const response = await axios.delete(
            `${baseUrl}/api/v2/messages/${companyId}/${selectedChatId}/${message.id}`,
            {
              data: { 
                deleteForEveryone: true, 
                phoneIndex: phoneIndex,
                messageId: message.id, // Add the message ID to ensure it's passed to the API
                chatId: selectedChatId // Add the chat ID for additional context
              },
              headers: {
                'Authorization': `Bearer ${userData.accessToken}`
              }
            }
          );
  
          if (response.data.success) {
            console.log(`Successfully deleted message: ${message.id}`);
            setMessages((prevMessages) => prevMessages.filter((msg) => msg.id !== message.id));
            successCount++;
          } else {
            console.error(`Failed to delete message: ${message.id}`, response.data);
            failureCount++;
          }
        } catch (error) {
          console.error('Error deleting message:', message.id, error);
          if (axios.isAxiosError(error) && error.response) {
            console.error('Error details:', error.response.status, error.response.data);
          }
          failureCount++;
        }
      }
  
      if (successCount > 0) {
        toast.success(`Successfully deleted ${successCount} message(s)`);
        // Refresh the chat to ensure WhatsApp changes are reflected
        await fetchMessages(selectedChatId!, whapiToken!);
      }
      if (failureCount > 0) {
        toast.error(`Failed to delete ${failureCount} message(s)`);
      }
  
      setSelectedMessages([]);
      closeDeletePopup();
    } catch (error) {
      console.error('Error in delete operation:', error);
      toast.error('Failed to delete messages. Please try again.');
    }
  };

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [selectedChatId, messages]);

  useEffect(() => {
   fetchConfigFromDatabase().catch(error => {
     console.error('Error in fetchConfigFromDatabase:', error);
     // Handle the error appropriately (e.g., show an error message to the user)
   });
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

  const uploadImage = async (file: File): Promise<string> => {
    const storage = getStorage(); // Initialize storage
    const storageRef = ref(storage, `images/${file.name}`); // Set the storage path
    await uploadBytes(storageRef, file); // Upload the file
    return await getDownloadURL(storageRef); // Return the download URL
};

const fetchFileFromURL = async (url: string): Promise<File | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const decodedUrl = decodeURIComponent(url);
    const filename = decodedUrl.split('/').pop()?.split('?')[0] || 'document';
    return new File([blob], filename, { type: blob.type });
  } catch (error) {
    console.error('Error fetching file from URL:', error);
    return null;
  }
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
        type: newQuickReplyType,
        createdAt: serverTimestamp(),
        createdBy: user.email,
        document: selectedDocument ? await uploadDocument(selectedDocument) : null, // URL stored
        image: selectedImage ? await uploadImage(selectedImage) : null,
      };
  
      if (newQuickReplyType === 'self') {
        // Add to user's personal quick replies
        const userQuickReplyRef = collection(firestore, `user/${user.email}/quickReplies`);
        await addDoc(userQuickReplyRef, newQuickReplyData);
      } else {
        // Add to company's quick replies
        const companyQuickReplyRef = collection(firestore, `companies/${companyId}/quickReplies`);
        await addDoc(companyQuickReplyRef, newQuickReplyData);
      }
  
      setNewQuickReply('');
      setSelectedDocument(null);
      setSelectedImage(null);
      setNewQuickReplyKeyword('');
      setNewQuickReplyType('all');
      fetchQuickReplies();
    } catch (error) {
      console.error('Error adding quick reply:', error);
    }
  };
  const updateQuickReply = async (id: string, keyword: string, text: string, type: 'all' | 'self') => {
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
  
      await updateDoc(quickReplyDoc, { text, keyword });
      setEditingReply(null);
      fetchQuickReplies(); // Refresh quick replies
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
      fetchQuickReplies(); // Refresh quick replies
    } catch (error) {
      console.error('Error deleting quick reply:', error);
    }
  };
  const handleQR = () => {
    setIsQuickRepliesOpen(!isQuickRepliesOpen);
    if (!isQuickRepliesOpen) {
      fetchQuickReplies(); // Fetch quick replies when opening the dropdown
    }
  };

  const handleQRClick = (reply: QuickReply) => {
    if (reply.image) {
      setPastedImageUrl(reply.image);
      setImageModalOpen2(true);
    }
  
    if (reply.document) {
      fetchFileFromURL(reply.document).then(file => {
        if (file) {
          setSelectedDocument(file);
          setDocumentModalOpen(true);
        }
      });
    }
  
    setNewMessage(reply.text);
    setIsQuickRepliesOpen(false);
  };



  const updateContactLastMessage = async (notification: Notification) => {
    if (!userData?.companyId) return;
  
    const contactRef = doc(firestore, `companies/${userData.companyId}/contacts`, notification.chat_id);
    
    await updateDoc(contactRef, {
      last_message: {
        text: { body: notification.text.body },
        timestamp: notification.timestamp,
        from_me: false,
        type: notification.type
      }
    });
  };
  
  let params :URLSearchParams;
  let chatId: any ;
  if(location != undefined){
    params = new URLSearchParams(location.search);
    chatId = params.get("chatId");
    if (chatId && !chatId.endsWith('@g.us')) {
      chatId += '@c.us';
    }
  }

  const handleNotificationClick = (chatId: string, index: number) => {
    selectChat(chatId);
    setNotifications(prev => prev.filter((_, i) => i !== index));
  };

// Update the showNotificationToast function
const showNotificationToast = (notification: Notification, index: number) => {
  // Check if a notification with the same chat_id and timestamp already exists
  const isDuplicate = activeNotifications.some(id => {
    const existingToast = toast.isActive(id);
    if (existingToast) {
      const content = document.getElementById(`toast-${id}`)?.textContent;
      return content?.includes(notification.from) && content?.includes(notification.text.body);
    }
    return false;
  });

  if (isDuplicate) {
    console.log('Duplicate notification, not showing toast');
    return;
  }

  let displayText = 'New message';

  switch (notification.type) {
    case 'text':
      displayText = notification.text?.body?.substring(0, 100) || 'New message'; // Truncate text to 100 characters
      break;
      case 'image':
        displayText = 'Image';
        break;
      case 'video':
        displayText = 'Video';
        break;
      case 'audio':
        displayText = 'Audio';
        break;
      case 'document':
        displayText = 'Document';
        break;
      case 'location':
        displayText = 'Location';
        break;
      case 'contact':
        displayText = 'Contact';
        break;
      default:
        displayText = 'New message';
  }
  const toastId = toast(
    <div id={`toast-${Date.now()}`} className="flex flex-col mr-2 pr-2">
      <strong className="font-semibold capitalize">{notification?.from}</strong>
      <p className="truncate max-w-xs pr-6">{displayText}</p>
    </div>,
    {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      onClick: () => handleNotificationClick(notification.chat_id, index),
      onClose: () => {
        setActiveNotifications(prev => prev.filter(id => id !== toastId));
      },
      closeButton: <button onClick={(e) => { e.stopPropagation(); toast.dismiss(toastId); }}><Lucide icon="X" className="absolute top-1 right-1 w-5 h-5 text-black" /></button>
    }
  );

  setActiveNotifications(prev => [...prev, toastId]);
};




// New separate useEffect for message listener
useEffect(() => {
  let unsubscribeMessages: (() => void) | null = null;

  const setupMessageListener = async () => {
    if (selectedChatId && auth.currentUser) {
   
      const phone = "+"+selectedChatId.split('@')[0];
      console.log('listing to messages' + phone);
      const userDocRef = doc(firestore, 'user', auth.currentUser.email!);
      const userDocSnapshot = await getDoc(userDocRef);
      
      if (!userDocSnapshot.exists()) {
        console.log('No such user document!');
        return;
      }
      
      const dataUser = userDocSnapshot.data();
      const newCompanyId = dataUser.companyId;
      
      const companyDocRef = doc(firestore, 'companies', newCompanyId);
      const companyDocSnapshot = await getDoc(companyDocRef);
      
      if (!companyDocSnapshot.exists()) {
        console.log('No such company document!');
        return;
      }
      
      const data = companyDocSnapshot.data();
      console.log('Setting up message listener for company:', newCompanyId);

      let prevMessagesCount = 0;

      unsubscribeMessages = onSnapshot(
        collection(firestore, `companies/${newCompanyId}/contacts/${phone}/messages`),
        async (snapshot) => {
          const currentMessages = snapshot.docs;
          
          // Check if new messages have been added
          if (currentMessages.length > prevMessagesCount) {
            console.log('New message(s) detected');
            fetchMessagesBackground(selectedChatId, data.whapiToken);
          }

          // Update the previous messages count
          prevMessagesCount = currentMessages.length;
        }
      );
    }
  };

  if (selectedChatId) {
    setupMessageListener();
  }

  return () => {
    if (unsubscribeMessages) {
      unsubscribeMessages();
    }
  };
}, [selectedChatId]); 

  useEffect(() => {
    const fetchContact = async () => {
      const params = new URLSearchParams(location.search);
      const chatIdFromUrl = params.get('chatId');
  
      if (!chatIdFromUrl || !auth.currentUser) return;
  
      setLoading(true);
      try {
        const userDocRef = doc(firestore, 'user', auth.currentUser.email!);
        const userDocSnapshot = await getDoc(userDocRef);
        if (!userDocSnapshot.exists()) throw new Error('No user document found');
  
        const userData = userDocSnapshot.data() as UserData;
        if (!userData.companyId) throw new Error('Invalid user data or companyId');
  
        setUserData(userData);
        user_role = userData.role;
        companyId = userData.companyId;
  
        const companyDocRef = doc(firestore, 'companies', companyId);
        const companyDocSnapshot = await getDoc(companyDocRef);
        if (!companyDocSnapshot.exists()) throw new Error('No company document found');
  
        const companyData = companyDocSnapshot.data();
        const phone = "+" + chatIdFromUrl.split('@')[0];
  
        let contact;
        if (companyData.v2) {
          contact = contacts.find(c => c.phone === phone || c.chat_id === chatIdFromUrl);
          if (!contact) throw new Error('Contact not found in contacts');
        }
  
        setSelectedContact(contact);
        setSelectedChatId(chatIdFromUrl);
      } catch (error) {
        console.error('Error fetching contact:', error);
        // Handle error (e.g., show error message to user)
      } finally {
        setLoading(false);
      }
    };
  
    fetchContact();
  }, [location.search]);
async function fetchConfigFromDatabase() {
  const user = auth.currentUser;

  if (!user) {
    console.error('No user is authenticated');
    return;
  }

  try {
    const docUserRef = doc(firestore, 'user', user.email!);
    const docUserSnapshot = await getDoc(docUserRef);
    if (!docUserSnapshot.exists()) {
      console.error('No such document for user!');
      return;
    }
    const dataUser = docUserSnapshot.data() as UserData;
    setUserData(dataUser);
    user_role = dataUser.role;
    companyId = dataUser.companyId;
    setUserRole(dataUser.role);
    if (!dataUser || !dataUser.companyId) {
      console.error('Invalid user data or companyId');
      return;
    }

    console.log('Company ID:', companyId);

    const docRef = doc(firestore, 'companies', companyId);
    const docSnapshot = await getDoc(docRef);
    if (!docSnapshot.exists()) {
      console.error('No such document for company!');
      return;
    }
    const data = docSnapshot.data();

    console.log('Company Data:', data);

    if (!data) {
      console.error('Company data is missing');
      return;
    }
    setCompanyPlan(data.plan || '');
     // Add message usage tracking for enterprise plan
     if (data.plan === 'enterprise') {
      const currentDate = new Date();
      const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      
      const usageRef = doc(firestore, `companies/${companyId}/usage/${monthKey}`);
      const usageSnapshot = await getDoc(usageRef);
      
      if (usageSnapshot.exists()) {
        const totalMessages = usageSnapshot.data().total_messages || 0;
        setMessageUsage(totalMessages);
      } else {
        setMessageUsage(0);
      }
    }
    setPhoneCount(data.phoneCount);
    if(data.phoneCount >=2){
      setMessageMode('phone1');
    }
    console.log(messageMode);


    console.log('Tags:', data.tags);

    setToken(data.whapiToken);
    user_name = dataUser.name;


    const employeeRef = doc(firestore, `companies/${companyId}/employee`, dataUser.name);
    const employeeDoc = await getDoc(employeeRef);
    if (employeeDoc.exists()) {
      const employeeData = employeeDoc.data();
      setUserPhone(employeeData.phone || null);
    }

    const employeeCollectionRef = collection(firestore, `companies/${companyId}/employee`);
    const employeeSnapshot = await getDocs(employeeCollectionRef);

    const employeeListData: Employee[] = [];
    employeeSnapshot.forEach((doc) => {
      employeeListData.push({ id: doc.id, ...doc.data() } as Employee);
    });

    setEmployeeList(employeeListData);
    console.log('Employee List:', employeeListData);
    const employeeNames = employeeListData.map(employee => employee.name.trim().toLowerCase());

    // Check if the company is using v2
    if (data.v2) {
      console.log('Company is using v2, fetching tags from Firebase');
      // For v2, fetch tags from Firebase
      const tagsRef = collection(firestore, `companies/${companyId}/tags`);
      const tagsSnapshot = await getDocs(tagsRef);
      const tags = tagsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
      const filteredTags = tags.filter((tag: Tag) => !employeeNames.includes(tag.name.toLowerCase()));
      console.log('Fetched Tags:', filteredTags);
      setTagList(filteredTags);
    } else {
      console.log('Company is not using v2, fetching tags from GHL');
      // For non-v2, fetch from GHL API
 
    }

    console.log('User Role:', userRole);
    console.log('User Name:', userData?.name);
  } catch (error) {
    console.error('Error fetching config:', error);
  }
}
  

  const deleteNotifications = async (chatId: string) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('No authenticated user');
        return;
      }
  
      const notificationsRef = collection(firestore, 'user', user.email!, 'notifications');
      const q = query(notificationsRef, where('chat_id', '==', chatId));
      const querySnapshot = await getDocs(q);
  
      const batch = writeBatch(firestore);
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
  
      await batch.commit();
      console.log(`Deleted notifications for chat: ${chatId}`);
    } catch (error) {
      console.error('Error deleting notifications:', error);
    }
  };

  const selectChat = useCallback(async (chatId: string, contactId?: string, contactSelect?: Contact) => {
    console.log('Attempting to select chat:', { chatId, userRole, userName: userData?.name });
    
    try {
      // Only check permissions for role '3', allow role '2' full access
      if (userRole === "3" && contactSelect && contactSelect.assignedTo?.toLowerCase() !== userData?.name.toLowerCase()) {
        console.log('Permission denied for role 3 user');
        toast.error("You don't have permission to view this chat.");
        return;
      }
  
      // Find contact - prioritize contactSelect if provided
      let contact = contactSelect || contacts.find(c => c.chat_id === chatId || c.id === contactId);
      if (!contact) {
        console.error('Contact not found');
        return;
      }

      // Debug logging
      console.log('Selected contact:', contact);
      console.log('User role:', userRole);
  
      // Update local state first for immediate UI response
      setContacts(prevContacts => {
        const updatedContacts = prevContacts.map(c =>
          c.chat_id === chatId ? { ...c, unreadCount: 0 } : c
        ).sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          
          const timestampA = getTimestamp(a.last_message?.timestamp || a.last_message?.createdAt);
          const timestampB = getTimestamp(b.last_message?.timestamp || b.last_message?.createdAt);
          
          return timestampB - timestampA;
        });
  
        // Update localStorage with new contacts
        localStorage.setItem('contacts', LZString.compress(JSON.stringify(updatedContacts)));
        return updatedContacts;
      });
  
      // Update Firebase in parallel
      const updateFirebasePromise = (async () => {
        const user = auth.currentUser;
        if (!user?.email) return;
  
        const docUserRef = doc(firestore, 'user', user.email);
        const docUserSnapshot = await getDoc(docUserRef);
        
        if (docUserSnapshot.exists()) {
          const userData = docUserSnapshot.data();
          const contactRef = doc(firestore, `companies/${userData.companyId}/contacts`, contact.id!);
          await updateDoc(contactRef, { unreadCount: 0 });
          console.log('Updated unreadCount in Firebase for contact:', contact.id);
        }
      })();
  
      // Delete notifications in parallel
      const deleteNotificationsPromise = (async () => {
        const user = auth.currentUser;
        if (!user?.email) return;

        console.log('Deleted notifications for chat:', chatId);
      })();
  
      // Update UI state
      setSelectedContact(contact);
      setSelectedChatId(chatId);
      setIsChatActive(true);
  
      // Wait for background operations to complete
      await Promise.all([
        updateFirebasePromise,
        deleteNotificationsPromise
      ]);
  
      // Update URL without triggering a page reload
      const newUrl = `/chat?chatId=${chatId.replace('@c.us', '')}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
  
    } catch (error) {
      console.error('Error in selectChat:', error);
      toast.error('An error occurred while loading the chat. Please try again.');
    }
  }, [contacts, userRole, userData?.name]);

  const getTimestamp = (timestamp: any): number => {
    // If timestamp is missing, return 0 to put it at the bottom
    if (!timestamp) return 0;
  
    // If timestamp is already a number
    if (typeof timestamp === 'number') {
      // Convert to milliseconds if needed (check if it's in seconds)
      return timestamp < 10000000000 ? timestamp * 1000 : timestamp;
    }
  
    // If timestamp is a Firestore timestamp
    if (timestamp?.seconds) {
      return timestamp.seconds * 1000;
    }
  
    // If timestamp is an ISO string or other date format
    if (typeof timestamp === 'string') {
      const parsed = Date.parse(timestamp);
      return isNaN(parsed) ? 0 : parsed;
    }
  
    // Default case - invalid timestamp
    console.warn('Invalid timestamp format:', timestamp);
    return 0;
  };

const fetchContactsBackground = async (whapiToken: string, locationId: string, ghlToken: string, user_name: string, role: string, userEmail: string | null | undefined) => {
  try {
    if (!userEmail) throw new Error("User email is not provided.");
    
    const docUserRef = doc(firestore, 'user', userEmail);
    const docUserSnapshot = await getDoc(docUserRef);
    if (!docUserSnapshot.exists()) {
      console.log('User document not found');
      return;
    }

    const dataUser = docUserSnapshot.data();
    const companyId = dataUser?.companyId;
    if (!companyId) {
      console.log('Company ID not found');
      return;
    }

    // Pagination settings
    const batchSize = 4000;
    let lastVisible: QueryDocumentSnapshot<DocumentData> | null = null;
    const phoneSet = new Set<string>();
    let allContacts: Contact[] = [];

    // Fetch contacts in batches
    const contactsCollectionRef = collection(firestore, `companies/${companyId}/contacts`);
    while (true) {
      let queryRef: Query<DocumentData> = lastVisible
        ? query(contactsCollectionRef, startAfter(lastVisible), limit(batchSize))
        : query(contactsCollectionRef, limit(batchSize));

      const contactsSnapshot = await getDocs(queryRef);
      if (contactsSnapshot.empty) break;

      contactsSnapshot.docs.forEach(doc => {
        const contact = { ...doc.data(), id: doc.id } as Contact;
        if (contact.phone && !phoneSet.has(contact.phone)) {
          phoneSet.add(contact.phone);
          allContacts.push(contact);
        }
      });

      lastVisible = contactsSnapshot.docs[contactsSnapshot.docs.length - 1];
    }

    // Fetch pinned chats
    const pinnedChatsRef = collection(firestore, `user/${userEmail}/pinned`);
    const pinnedChatsSnapshot = await getDocs(pinnedChatsRef);
    const pinnedChats = pinnedChatsSnapshot.docs.map(doc => doc.data() as Contact);

    // Update pinned status in Firebase and local contacts
    const updatePromises = allContacts.map(async contact => {
      const isPinned = pinnedChats.some(pinned => pinned.chat_id === contact.chat_id);
      if (isPinned !== contact.pinned) {
        const contactDocRef = doc(contactsCollectionRef, contact.id!);
        await updateDoc(contactDocRef, { pinned: isPinned });
        contact.pinned = isPinned;
      }
    });

    await Promise.all(updatePromises);

    console.log('Before sorting - First 5 contacts:', allContacts.slice(0, 5).map(c => ({
      id: c.chat_id,
      unread: c.unreadCount,
      timestamp: c.last_message?.timestamp,
      pinned: c.pinned
    })));

    allContacts.sort((a, b) => {
      // First priority: pinned status
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      
      // Second priority: unread messages
      if (a.unreadCount && !b.unreadCount) return -1;
      if (!a.unreadCount && b.unreadCount) return 1;
      
      // Get timestamps with validation
      let timestampA = a.last_message?.timestamp;
      let timestampB = b.last_message?.timestamp;

      // Convert string timestamps to numbers if needed
      if (typeof timestampA === 'string') timestampA = parseInt(timestampA, 10);
      if (typeof timestampB === 'string') timestampB = parseInt(timestampB, 10);

      // Ensure timestamps are in seconds
      if (timestampA && timestampA > 9999999999) timestampA = Math.floor(timestampA / 1000);
      if (timestampB && timestampB > 9999999999) timestampB = Math.floor(timestampB / 1000);

      // If either timestamp is invalid, use 0
      timestampA = timestampA || 0;
      timestampB = timestampB || 0;

      // Sort descending (newest first)
      return timestampB - timestampA;
    });

    // Add debugging after sorting
    console.log('After sorting - First 5 contacts:', allContacts.slice(0, 5).map(c => ({
      id: c.chat_id,
      unread: c.unreadCount,
      timestamp: c.last_message?.timestamp,
      pinned: c.pinned
    })));

    // Before setting contacts, ensure all timestamps are in the correct format
    allContacts = allContacts.map(contact => {
      if (!contact.last_message) return contact;

      let timestamp = contact.last_message.timestamp;
      
      // Convert string timestamps to numbers
      if (typeof timestamp === 'string') {
        timestamp = parseInt(timestamp, 10);
      }

      // Ensure timestamp is in seconds
      if (timestamp && timestamp > 9999999999) {
        timestamp = Math.floor(timestamp / 1000);
      }

      return {
        ...contact,
        last_message: {
          ...contact.last_message,
          timestamp
        }
      };
    });

    console.log('Active tag:', activeTags[0]);
    console.log('Total contacts:', allContacts.length);

    // Set all contacts to state instead of just the first 200
    setContacts(allContacts);

    // Store all contacts in localStorage
    localStorage.setItem('contacts', LZString.compress(JSON.stringify(allContacts)));
    sessionStorage.setItem('contactsFetched', 'true');
    
    // If you need to limit the displayed contacts, implement pagination in the UI component
    // For example, you could add a state variable for the current page:
    // const [currentPage, setCurrentPage] = useState(1);
    // const contactsPerPage = 200;
    // const displayedContacts = allContacts.slice((currentPage - 1) * contactsPerPage, currentPage * contactsPerPage);
    
  } catch (error) {
    console.error('Error fetching contacts:', error);
  }
};



useEffect(() => {
  const fetchUserRole = async () => {
    const user = auth.currentUser;
    if (user) {
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (docUserSnapshot.exists()) {
        const userData = docUserSnapshot.data();
        setUserRole(userData.role);
        console.log('User role set:', userData.role);
      }
    }
  };
  fetchUserRole();
}, []);

  useEffect(() => {
    if (selectedChatId) {
      console.log(selectedContact);
      console.log(selectedChatId);
      fetchMessages(selectedChatId, whapiToken!);
    }
  }, [selectedChatId]);

  const storeMessagesInLocalStorage = (chatId: string, messages: any[]) => {
    try {
      console.log(`Attempting to store ${messages.length} messages for chat ${chatId}`);
      const storageKey = `messages_${chatId}`;
      
      // Compress and store messages
      const compressedMessages = LZString.compress(JSON.stringify(messages));
      localStorage.setItem(storageKey, compressedMessages);
      
      // Store timestamp
      const timestamp = Date.now().toString();
      localStorage.setItem(`${storageKey}_timestamp`, timestamp);
      
      console.log('Messages stored successfully:', {
        chatId,
        messageCount: messages.length,
        timestamp: new Date(parseInt(timestamp)).toISOString()
      });
    } catch (error) {
      console.error('Error storing messages in localStorage:', error);
    }
  };

  const getMessagesFromLocalStorage = (chatId: string): any[] | null => {
    try {
      console.log(`Attempting to retrieve messages for chat ${chatId}`);
      const storageKey = `messages_${chatId}`;
      const compressedMessages = localStorage.getItem(storageKey);
      const timestamp = localStorage.getItem(`${storageKey}_timestamp`);
      
      if (!compressedMessages || !timestamp) {
        console.log('No cached messages found');
        return null;
      }
      
      if (Date.now() - parseInt(timestamp) > 3600000) {
        console.log('Cache expired:', {
          storedAt: new Date(parseInt(timestamp)).toISOString(),
          age: Math.floor((Date.now() - parseInt(timestamp)) / 1000 / 60) + ' minutes'
        });
        return null;
      }
      
      const messages = JSON.parse(LZString.decompress(compressedMessages));
      console.log('Retrieved messages from cache:', {
        chatId,
        messageCount: messages.length,
        cacheAge: Math.floor((Date.now() - parseInt(timestamp)) / 1000 / 60) + ' minutes'
      });
      
      return messages;
    } catch (error) {
      console.error('Error retrieving messages from localStorage:', error);
      return null;
    }
  };

  async function fetchMessages(selectedChatId: string, whapiToken: string) {
    setLoading(true);
    setSelectedIcon('ws');

    // Try to get messages from localStorage first
    const cachedMessages = getMessagesFromLocalStorage(selectedChatId);
    
    if (cachedMessages) {
      console.log('Using cached messages');
      setMessages(cachedMessages);
      setLoading(false);
      
      // Fetch fresh messages in the background
      fetchMessagesBackground(selectedChatId, whapiToken);
      return;
    }

    const auth = getAuth(app);
    const user = auth.currentUser;
    
    try {
        const docUserRef = doc(firestore, 'user', user?.email!);
        const docUserSnapshot = await getDoc(docUserRef);
        
        if (!docUserSnapshot.exists()) {
            console.log('No such document!');
            return;
        }
        const dataUser = docUserSnapshot.data();

        console.log('Fetching messages for user role:', dataUser.role);
        
        const companyId = dataUser.companyId;
        const docRef = doc(firestore, 'companies', companyId);
        const docSnapshot = await getDoc(docRef);
        if (!docSnapshot.exists()) {
            console.log('No such document!');
            return;
        }
        const data2 = docSnapshot.data();
        
        setToken(data2.whapiToken);
        console.log('fetching messages');
        let messages = await fetchMessagesFromFirebase(companyId, selectedChatId);
        console.log('messages');
        console.log(messages);
        
        const formattedMessages: any[] = [];
        const reactionsMap: Record<string, any[]> = {};

        messages.forEach(async (message: any) => {
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
                edited: message.edited // Add this line to include phoneIndex
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
          }else {
                // For regular messages, multiply timestamp by 1000
                formattedMessage.createdAt = new Date(message.timestamp * 1000).toISOString();
            }
        
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
                        case 'chat':
                          formattedMessage.text = {
                              body: message.text ? message.text.body : '', // Include the message body
                              context: message.text && message.text.context ? {
                                  quoted_author: message.text.context.quoted_author,
                                  quoted_content: {
                                      body: message.text.context.quoted_content?.body || ''
                                  }
                              } : null
                          }; 
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
                        console.log('Private note data:', message);
                        formattedMessage.text = typeof message.text === 'string' ? message.text : message.text?.body || '';
                        console.log('Formatted private note text:', formattedMessage.text);
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

        storeMessagesInLocalStorage(selectedChatId, formattedMessages);
        
        setMessages(formattedMessages);
        fetchContactsBackground(
          data2.whapiToken,
          data2.ghl_location,
          data2.ghl_accessToken,
          user_name,
          dataUser.role,
          dataUser.email
        );
    } catch (error) {
        console.error('Failed to fetch messages:', error);
    } finally {
        setLoading(false);
    }
}

async function fetchMessagesFromFirebase(companyId: string, chatId: string): Promise<any[]> {
  const number = '+' + chatId.split('@')[0];
  console.log(number);
  const messagesRef = collection(firestore, `companies/${companyId}/contacts/${number}/messages`);
  const messagesSnapshot = await getDocs(messagesRef);
  
  const messages = messagesSnapshot.docs.map(doc => doc.data());

  // Sort messages by timestamp in descending order (latest first)
  return messages.sort((a, b) => {
    const timestampA = a.timestamp?.seconds || a.timestamp || 0;
    const timestampB = b.timestamp?.seconds || b.timestamp || 0;
    return timestampB - timestampA;
  });
}


async function fetchMessagesBackground(selectedChatId: string, whapiToken: string) {
  setSelectedIcon('ws');
  const auth = getAuth(app);
  const user = auth.currentUser;
  
  try {
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
    
    setToken(data2.whapiToken);
    
    let messages;
    messages = await fetchMessagesFromFirebase(companyId, selectedChatId);
    console.log('messages');
    console.log(messages);
    
    const formattedMessages: any[] = [];
    const reactionsMap: Record<string, any[]> = {};

    messages.forEach(async (message: any) => {
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
          createdAt: new Date(message.timestamp * 1000).toISOString(), // Ensure the timestamp is correctly formatted
          type: message.type,
          author:message.author,
          name: message.name,
          phoneIndex: message.phoneIndex,
          userName: message.userName,
          edited: message.edited // Add this line to include phoneIndex
        };
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
      }else {
          // For regular messages, multiply timestamp by 1000
          formattedMessage.createdAt = new Date(message.timestamp * 1000).toISOString();
      }
  
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
                } : null // Include the context with quoted content
            };
            break;
            case 'chat':
              formattedMessage.text = {
                  body: message.text ? message.text.body : '', // Include the message body
                  context: message.text && message.text.context ? {
                      quoted_author: message.text.context.quoted_author,
                      quoted_content: {
                          body: message.text.context.quoted_content?.body || ''
                      }
                  } : null
              }; 
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
          case 'poll':
            formattedMessage.poll = message.poll ? message.poll : undefined;
            break;
          case 'hsm':
            formattedMessage.hsm = message.hsm ? message.hsm : undefined;
            break;
          case 'ptt':
            formattedMessage.ptt = message.ptt ? message.ptt : undefined;
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
              console.log('Private note data:', message);
              formattedMessage.text = typeof message.text === 'string' ? message.text : message.text?.body || '';
              console.log('Formatted private note text:', formattedMessage.text);
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

    // Fetch private notes for the selected chat
    const privateNotesRef = collection(firestore, 'companies', companyId, 'contacts', selectedChatId, 'privateNotes');
    const privateNotesSnapshot = await getDocs(privateNotesRef);
    const chatPrivateNotes = privateNotesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp.toDate().getTime(),
      type: 'privateNote'
    }));

    // Combine regular messages and private notes
    const allMessages = [...formattedMessages, ...chatPrivateNotes].sort((a, b) => 
      a.timestamp - b.timestamp
    );

    storeMessagesInLocalStorage(selectedChatId, allMessages);

    setMessages(allMessages);
    
    // Update private notes state
    setPrivateNotes(prevNotes => ({
      ...prevNotes,
      [selectedChatId]: chatPrivateNotes.map(note => ({
        id: note.id,
        text: 'text' in note && typeof note.text === 'string' ? note.text : '',
        timestamp: note.timestamp
      }))
    }));
    
  } catch (error) {
    console.error('Failed to fetch messages:', error);
  }
}





  const handleAddPrivateNote = async (newMessage: string) => {
    if (!newMessage.trim() || !selectedChatId) return;
    
    const user = auth.currentUser;
    if (!user) {
      console.error('No authenticated user');
      return;
    }
  
    try {
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
      
      const numericChatId = '+' + selectedChatId.split('').filter(char => /\d/.test(char)).join('');
      console.log('Numeric Chat ID:', numericChatId);
  
      const privateNoteRef = collection(firestore, 'companies', companyId, 'contacts', numericChatId, 'privateNotes');
      const currentTimestamp = new Date();
      const newPrivateNote = {
        text: newMessage,
        from: userData.name,
        timestamp: currentTimestamp,
        type: 'privateNote'
      };
  
      console.log('Adding private note:', newPrivateNote);
      console.log('Private note ref:', privateNoteRef);
  
      const docRef = await addDoc(privateNoteRef, newPrivateNote);
      console.log('Private note added with ID:', docRef.id);
  
      const messageData = {
        chat_id: numericChatId,
        from: user.email ?? "",
        from_me: true,
        id: docRef.id,
        source: "web",
        status: "delivered",
        text: {
          body: newMessage
        },
        timestamp: currentTimestamp,
        type: "privateNote",
      };
  
      const contactRef = doc(firestore, 'companies', companyId, 'contacts', numericChatId);
      const messagesRef = collection(contactRef, 'messages');
      const messageDoc = doc(messagesRef, docRef.id);
      await setDoc(messageDoc, messageData);
  
      console.log('Private note added to messages collection');
  
      const mentions = detectMentions(newMessage);
      console.log('Mentions:', mentions); 
      for (const mention of mentions) {
        const employeeName = mention.slice(1);
        console.log(employeeName);
        console.log('Adding notification for:', employeeName);
        await addNotificationToUser(companyId, employeeName, {
          chat_id: selectedChatId,
          from: userData.name,
          timestamp: currentTimestamp,
          from_me: false,
          text: {
            body: newMessage
          },
          type: "privateNote"
        });
        await sendWhatsAppAlert(employeeName, selectedChatId);
      }
  
      setPrivateNotes(prevNotes => ({
        ...prevNotes,
        [selectedChatId]: [
          ...(prevNotes[selectedChatId] || []),
          { id: docRef.id, text: newMessage, timestamp: currentTimestamp.getTime() }
        ]
      }));
  
      fetchMessages(selectedChatId, "");
  
      setNewMessage('');
      toast.success("Private note added successfully!");
    } catch (error) {
      console.error('Error adding private note:', error);
      toast.error("Failed to add private note");
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChatId) return;
    
    // Store the message text before clearing input
    const messageText = newMessage;
    setNewMessage('');
    setReplyToMessage(null);
  
    // Create temporary message object for immediate display
    const tempMessage = {
      id: `temp_${Date.now()}`,
      from_me: true,
      text: { body: messageText },
      createdAt: new Date().toISOString(),
      type: 'text',
      phoneIndex: selectedContact?.phoneIndex ?? 0,
      chat_id: selectedChatId,
      from_name: userData?.name || '',
      timestamp: Math.floor(Date.now() / 1000)
    };

    console.log('Current messages in localStorage:', getMessagesFromLocalStorage(selectedChatId));
  
    const currentMessages = getMessagesFromLocalStorage(selectedChatId) || [];
    console.log('Retrieved current messages from localStorage:', currentMessages.length, 'messages');
    
    const updatedMessages = [...currentMessages, tempMessage];
    console.log('Adding new message to localStorage. Total messages:', updatedMessages.length);
    
    storeMessagesInLocalStorage(selectedChatId, updatedMessages);
    console.log('Messages stored in localStorage successfully');

    // Update UI immediately
    setMessages(prevMessages => [
      ...prevMessages, 
      { 
        ...tempMessage, 
        createdAt: new Date(tempMessage.createdAt).getTime() 
      } as unknown as Message
    ]);
  
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user');
  
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) throw new Error('No user document found');
  
      const dataUser = docUserSnapshot.data();
      companyId = dataUser.companyId;
      const phoneIndex = selectedContact?.phoneIndex ?? 0;
      const userName = dataUser.name || dataUser.email || '';
  
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) throw new Error('No company document found');
  
      const data2 = docSnapshot.data();
      const baseUrl = data2.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';
  
      if (messageMode === 'privateNote') {
        handleAddPrivateNote(messageText);
        return;
      }
  
      // Send message to API
      const response = await fetch(`${baseUrl}/api/v2/messages/text/${companyId}/${selectedChatId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          quotedMessageId: replyToMessage?.id || null,
          phoneIndex,
          userName
        }),
      });
  
      if (!response.ok) throw new Error('Failed to send message');
  
      const now = new Date();
      const data = await response.json();
      console.log('response:', data);
  
      // Update contacts list
      setContacts(prevContacts => 
        prevContacts.map(contact => 
          contact.id === selectedContact?.id 
            ? updateContactWithNewMessage(contact, messageText, now, phoneIndex)
            : contact
        )
      );
  
      // Handle special case for company 0123
      if (companyId === '0123' && selectedContact?.id) {
        const contactRef = doc(firestore, `companies/${companyId}/contacts`, selectedContact.id);
        const contactSnapshot = await getDoc(contactRef);
        
        if (contactSnapshot.exists()) {
          const currentTags = contactSnapshot.data().tags || [];
          const updatedLastMessage = {
            text: { body: messageText },
            chat_id: selectedContact.chat_id || '',
            timestamp: Math.floor(now.getTime() / 1000),
            id: selectedContact.last_message?.id || `temp_${now.getTime()}`,
            from_me: true,
            type: 'text',
            phoneIndex,
          };
  
          if (!currentTags.includes('stop bot')) {
            await updateDoc(contactRef, {
              tags: arrayUnion('stop bot'),
              last_message: updatedLastMessage
            });
            
            setContacts(prevContacts =>
              prevContacts.map(contact =>
                contact.id === selectedContact.id
                  ? { ...contact, tags: [...(contact.tags || []), 'stop bot'] }
                  : contact
              )
            );
          } else {
            await updateDoc(contactRef, { last_message: updatedLastMessage });
          }
        }
      } else {
        // Update for non-0123 companies
        const contactRef = doc(firestore, `companies/${companyId}/contacts`, selectedContact?.id);
        const updatedLastMessage: Message = {
          text: { body: messageText },
          chat_id: selectedContact?.chat_id || '',
          timestamp: Math.floor(now.getTime() / 1000),
          id: selectedContact?.last_message?.id || `temp_${now.getTime()}`,
          from_me: true,
          type: 'text',
          phoneIndex,
        };
        
        await updateDoc(contactRef, { last_message: updatedLastMessage });
      }
  
      // Fetch updated messages and update local storage
      fetchMessagesBackground(selectedChatId, data2.apiToken);

      // After successful API call
      console.log('Message sent successfully to API');

      // Verify local storage was updated
      const storedMessages = getMessagesFromLocalStorage(selectedChatId);
      console.log('Current state of localStorage after API call:', {
        messageCount: storedMessages?.length || 0,
        lastMessage: storedMessages?.[storedMessages.length - 1]
      });
  
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Failed to send message");
      
      // Remove temporary message from local storage and UI if send failed
      console.log('Message send failed, removing temporary message from localStorage');
      const currentMessages = getMessagesFromLocalStorage(selectedChatId) || [];
      const filteredMessages = currentMessages.filter(msg => msg.id !== tempMessage.id);
      storeMessagesInLocalStorage(selectedChatId, filteredMessages);
      
      // Verify removal
      const updatedStoredMessages = getMessagesFromLocalStorage(selectedChatId);
      console.log('LocalStorage state after removing failed message:', {
        messageCount: updatedStoredMessages?.length || 0,
        tempMessageStillExists: updatedStoredMessages?.some(msg => msg.id === tempMessage.id)
      });

      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== tempMessage.id));
    }
  };

  
  const updateContactWithNewMessage = (contact: Contact, newMessage: string, now: Date,phoneIndex: number): Contact => {
    const updatedLastMessage: Message = {
      text: { body: newMessage },
      chat_id: contact.chat_id || '',
      timestamp:  Math.floor(now.getTime() / 1000),
      id: contact.last_message?.id || `temp_${now.getTime()}`,
      from_me: true,
      type: 'text',
      from_name: contact.last_message?.from_name || '',
      phoneIndex: phoneIndex,
      // Add any other required fields with appropriate default values
    };
  
    return {
      ...contact,
      last_message: updatedLastMessage
    };
  };
  const openNewChatModal = () => {
    setIsNewChatModalOpen(true);
  };

  const closeNewChatModal = () => {
    setIsNewChatModalOpen(false);
    setNewContactNumber('');
  };

  const handleCreateNewChat = async () => {
    console.log('Attempting to create new chat:', { userRole });
    if (userRole === "3") {
      console.log('Permission denied for role 3 user');
      toast.error("You don't have permission to create new chats.");
      return;
    }
  
    if (!newContactNumber) return;
  
    try {
      const chatId = `${newContactNumber}@c.us`;
      const contactId = `+${newContactNumber}`; // This will be used as the document ID
      console.log('contactId:', contactId);
      const newContact: Contact = {
        id: contactId, // Ensure the id is set here
        chat_id: chatId,
        contactName: contactId,
        phone: newContactNumber,
        tags: [],
        unreadCount: 0,
      };
  
      // Add the new contact to Firestore
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
  
      // Use setDoc with merge option to add or update the document with the specified ID
      await setDoc(doc(firestore, 'companies', companyId, 'contacts', contactId), newContact, { merge: true });
  
      // Update local state
      setContacts(prevContacts => {
        const updatedContacts = [...prevContacts, newContact];
        // Update local storage
        localStorage.setItem('contacts', LZString.compress(JSON.stringify(updatedContacts)));
        return updatedContacts;
      });
  
      // Close the modal and reset the input
      closeNewChatModal();
  
      // Select the new chat
      selectChat(chatId, contactId, newContact);
  
    } catch (error) {
      console.error('Error creating new chat:', error);
      toast.error('Failed to create new chat');
    }
  };
  const actionPerformedRef = useRef(false);
  const toggleStopBotLabel = useCallback(async (contact: Contact, index: number, event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    event.preventDefault();
    event.stopPropagation();
  
    if (actionPerformedRef.current) return;
    actionPerformedRef.current = true;
  
    console.log('Toggling stop bot label for contact:', contact.id);
    if (userRole === "3") {
      toast.error("You don't have permission to control the bot.");
      return;
    }
  
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('No authenticated user');
        return;
      }
  
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
  
      if (companyId && contact.id) {
        const docRef = doc(firestore, 'companies', companyId, 'contacts', contact.id);
        const docSnapshot = await getDoc(docRef);
        if (!docSnapshot.exists()) {
          console.log('No such document for contact!');
          return;
        }
  
        const hasLabel = contact.tags?.includes('stop bot') || false;
        const newHasLabel = !hasLabel;
  
        // Update Firestore
        await updateDoc(docRef, {
          tags: newHasLabel ? arrayUnion('stop bot') : arrayRemove('stop bot')
        });
  
        // Update both contacts and filteredContacts states
        const updateContactsList = (prevContacts: Contact[]) => 
          prevContacts.map(c => 
            c.id === contact.id
              ? {
                  ...c,
                  tags: newHasLabel
                    ? [...(c.tags || []), "stop bot"]
                    : (c.tags || []).filter(tag => tag !== "stop bot")
                }
              : c
          );
    
        setContacts(updateContactsList);
        setFilteredContacts(prevFilteredContacts => updateContactsList(prevFilteredContacts));
  
        // Update localStorage
        const updatedContacts = updateContactsList(contacts);
        localStorage.setItem('contacts', LZString.compress(JSON.stringify(updatedContacts)));

        sessionStorage.setItem('contactsFetched', 'true');

        // Show a success toast
        toast.success(`Bot ${newHasLabel ? 'disabled' : 'enabled'} for ${contact.contactName || contact.firstName || contact.phone}`);
      } else {
        console.error('companyId or contact.id is null or undefined');
      }
    } catch (error) {
      console.error('Error toggling label:', error);
      toast.error('Failed to toggle bot status');
    } finally {
      setTimeout(() => {
        actionPerformedRef.current = false;
      }, 100);
    }
  }, [contacts, userRole]);
  
  // Add this useEffect to update filteredContacts when contacts change
  useEffect(() => {
    setFilteredContacts(contacts);
  }, [contacts]);

  const handleBinaTag = async (requestType: string, phone: string, first_name: string, phoneIndex: number) => {
    console.log('Request Payload:', JSON.stringify({ requestType, phone, first_name, phoneIndex }));
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

    try {
        const response = await fetch(`${baseUrl}/api/bina/tag`, {
            method: 'POST', // Ensure this is set to POST
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                requestType,
                phone,
                first_name,
                phoneIndex,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Response data:', data);
    } catch (error) {
        console.error('Error:', error);
    }
};

const handleEdwardTag = async (requestType: string, phone: string, first_name: string, phoneIndex: number) => {
  console.log('Request Payload:', JSON.stringify({ requestType, phone, first_name, phoneIndex }));
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
  try {
      const response = await fetch(`${baseUrl}/api/edward/tag`, {
          method: 'POST', // Ensure this is set to POST
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({
              requestType,
              phone,
              first_name,
              phoneIndex,
          }),
      });

      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Response data:', data);
  } catch (error) {
      console.error('Error:', error);
  }
};

  const addTagBeforeQuote = (contact: Contact) => {
    console.log('Adding tag before quote for contact:', contact.phone);
    console.log('Adding tag before quote for contact:', contact.contactName);
    if (!contact.phone || !contact.contactName) {
      console.error('Phone or firstname is null or undefined');
      return;
    }
    handleBinaTag('addBeforeQuote', contact.phone, contact.contactName, contact.phoneIndex ?? 0);
  };

  const addTagBeforeQuoteEnglish = (contact: Contact) => {
    console.log('Adding tag before quote (English) for contact:', contact.phone);
    console.log('Adding tag before quote (English) for contact:', contact.contactName);
    if (!contact.phone || !contact.contactName) {
      console.error('Phone or firstname is null or undefined');
      return;
    }
    handleBinaTag('addBeforeQuote', contact.phone, contact.contactName, contact.phoneIndex ?? 0);
};

const addTagBeforeQuoteMalay = (contact: Contact) => {
    console.log('Adding tag before quote (Malay) for contact:', contact.phone);
    console.log('Adding tag before quote (Malay) for contact:', contact.contactName);
    if (!contact.phone || !contact.contactName) {
      console.error('Phone or firstname is null or undefined');
      return;
    }
    handleBinaTag('addBeforeQuote', contact.phone, contact.contactName, contact.phoneIndex ?? 0);
};

const addTagBeforeQuoteChinese = (contact: Contact) => {
    console.log('Adding tag before quote (Chinese) for contact:', contact.phone);
    console.log('Adding tag before quote (Chinese) for contact:', contact.contactName);
    if (!contact.phone || !contact.contactName) {
      console.error('Phone or firstname is null or undefined');
      return;
    }
    handleBinaTag('addBeforeQuote', contact.phone, contact.contactName, contact.phoneIndex ?? 0);
};
  
  const addTagAfterQuote = (contact: Contact) => {
    console.log('Adding tag after quote for contact:', contact.phone);
    console.log('Adding tag after quote for contact:', contact.contactName);
    if (contact.phone && contact.contactName) {
      handleBinaTag('addAfterQuote', contact.phone, contact.contactName, contact.phoneIndex ?? 0);
    } else {
      console.error('Phone or firstname is null or undefined');
    }
  };
  
  const addTagAfterQuoteEnglish = (contact: Contact) => {
    console.log('Adding tag after quote (English) for contact:', contact.phone);
    console.log('Adding tag after quote (English) for contact:', contact.contactName);
    if (!contact.phone || !contact.contactName) {
      console.error('Phone or firstname is null or undefined');
      return;
    }
    handleBinaTag('addAfterQuoteEnglish', contact.phone, contact.contactName, contact.phoneIndex ?? 0);
};

const addTagAfterQuoteChinese = (contact: Contact) => {
    console.log('Adding tag after quote (Chinese) for contact:', contact.phone);
    console.log('Adding tag after quote (Chinese) for contact:', contact.contactName);
    if (!contact.phone || !contact.contactName) {
      console.error('Phone or firstname is null or undefined');
      return;
    }
    handleBinaTag('addAfterQuoteChinese', contact.phone, contact.contactName, contact.phoneIndex ?? 0);
};

const addTagAfterQuoteMalay = (contact: Contact) => {
    console.log('Adding tag after quote (Malay) for contact:', contact.phone);
    console.log('Adding tag after quote (Malay) for contact:', contact.contactName);
    if (!contact.phone || !contact.contactName) {
      console.error('Phone or firstname is null or undefined');
      return;
    }
    handleBinaTag('addAfterQuoteMalay', contact.phone, contact.contactName, contact.phoneIndex ?? 0);
};

const removeTagBeforeQuote = (contact: Contact) => {
    console.log('Removing tag before quote for contact:', contact.phone);
    console.log('Removing tag before quote for contact:', contact.contactName);
    if (!contact.phone || !contact.contactName) {
      console.error('Phone or firstname is null or undefined');
      return;
    }
    handleBinaTag('removeBeforeQuote', contact.phone, contact.contactName, contact.phoneIndex ?? 0);
};

const removeTagAfterQuote = (contact: Contact) => {
    console.log('Removing tag after quote for contact:', contact.phone);
    console.log('Removing tag after quote for contact:', contact.contactName);
    if (!contact.phone || !contact.contactName) {
      console.error('Phone or firstname is null or undefined');
      return;
    }
    handleBinaTag('removeAfterQuote', contact.phone, contact.contactName, contact.phoneIndex ?? 0);
};

const removeTag5Days = (contact: Contact) => {
    console.log('Removing tag 5 days for contact:', contact.phone);
    console.log('Removing tag 5 days for contact:', contact.contactName);
    if (!contact.phone || !contact.contactName) {
      console.error('Phone or firstname is null or undefined');
      return;
    }
    handleBinaTag('remove5DaysFollowUp', contact.phone, contact.contactName, contact.phoneIndex ?? 0);
};

const removeTagPause = (contact: Contact) => {
    console.log('Removing tag pause for contact:', contact.phone);
    console.log('Removing tag pause for contact:', contact.contactName);
    if (!contact.phone || !contact.contactName) {
      console.error('Phone or firstname is null or undefined');
      return;
    }
    handleBinaTag('resumeFollowUp', contact.phone, contact.contactName, contact.phoneIndex ?? 0);
};

const removeTagEdward = (contact: Contact) => {
  console.log('Removing tag Edward for contact:', contact.phone);
  console.log('Removing tag Edward for contact:', contact.contactName);
  if (!contact.phone || !contact.contactName) {
    console.error('Phone or firstname is null or undefined');
    return;
  }
  handleEdwardTag('removeFollowUp', contact.phone, contact.contactName, contact.phoneIndex ?? 0);
};

const fiveDaysFollowUpEnglish = (contact: Contact) => {
    console.log('5 Days Follow Up (English) for contact:', contact.phone);
    console.log('5 Days Follow Up (English) for contact:', contact.contactName);
    if (!contact.phone || !contact.contactName) {
      console.error('Phone or firstname is null or undefined');
      return;
    }
    handleBinaTag('5DaysFollowUpEnglish', contact.phone, contact.contactName, contact.phoneIndex ?? 0);
};

const fiveDaysFollowUpChinese = (contact: Contact) => {
    console.log('5 Days Follow Up (Chinese) for contact:', contact.phone);
    console.log('5 Days Follow Up (Chinese) for contact:', contact.contactName);
    if (!contact.phone || !contact.contactName) {
      console.error('Phone or firstname is null or undefined');
      return;
    }
    handleBinaTag('5DaysFollowUpChinese', contact.phone, contact.contactName, contact.phoneIndex ?? 0);
};

const fiveDaysFollowUpMalay = (contact: Contact) => {
    console.log('5 Days Follow Up (Malay) for contact:', contact.phone);
    console.log('5 Days Follow Up (Malay) for contact:', contact.contactName);
    if (!contact.phone || !contact.contactName) {
      console.error('Phone or firstname is null or undefined');
      return;
    }
    handleBinaTag('5DaysFollowUpMalay', contact.phone, contact.contactName, contact.phoneIndex ?? 0);
};

const pauseFiveDaysFollowUp = (contact: Contact) => {
  console.log('Pausing 5 Days Follow Up for contact:', contact.phone);
  console.log('Pausing 5 Days Follow Up for contact:', contact.contactName);
  if (!contact.phone || !contact.contactName) {
    console.error('Phone or firstname is null or undefined');
    return;
  }
  handleBinaTag('pauseFollowUp', contact.phone, contact.contactName, contact.phoneIndex ?? 0);
};

const handleAddTagToSelectedContacts = async (tagName: string, contact: Contact) => {
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
    const docRef = doc(firestore, 'companies', companyId);
    const docSnapshot = await getDoc(docRef);
    if (!docSnapshot.exists()) {
      console.log('No such document!');
      return;
    }
    const data2 = docSnapshot.data();
    const baseUrl = data2.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';

    // Special handling for company '0123'
    if (companyId === '0123') {
      // Check if the new tag is an employee name
      const isNewTagEmployee = employeeList.some(emp => emp.name === tagName);
      
      if (isNewTagEmployee) {
        const contactRef = doc(firestore, 'companies', companyId, 'contacts', contact.id!);
        const contactDoc = await getDoc(contactRef);

        if (!contactDoc.exists()) {
          console.error(`Contact document does not exist: ${contact.id}`);
          toast.error(`Failed to add tag: Contact not found`);
          return;
        }

        const currentTags = contactDoc.data().tags || [];
        // Find and remove any existing employee tags
        const updatedTags = currentTags.filter((tag: string) => !employeeList.some(emp => emp.name === tag));
        
        // Add the new employee tag
        updatedTags.push(tagName);

        // Update Firestore with the new tags
        await updateDoc(contactRef, {
          tags: updatedTags
        });

        // Update local state
        setContacts(prevContacts =>
          prevContacts.map(c =>
            c.id === contact.id
              ? { ...c, tags: updatedTags }
              : c
          )
        );

        console.log(`Employee tag updated to ${tagName} for contact ${contact.id}`);
        toast.success(`Contact reassigned to ${tagName}`);

        // Send assignment notification for the new employee
        await sendAssignmentNotification(tagName, contact);
        return;
      }
    }

    // Check if tag is a trigger tag by looking up follow-up templates
    const templatesRef = collection(firestore, 'companies', companyId, 'followUpTemplates');
    const templatesSnapshot = await getDocs(templatesRef);
    
    let matchingTemplate: any = null;
    templatesSnapshot.forEach(doc => {
      const template = doc.data();
      if (template.triggerTags?.includes(tagName) && template.status === 'active') {
        matchingTemplate = { 
          id: doc.id, 
          ...template 
        };
      }
    });

    // Update contact's tags
    const contactRef = doc(firestore, 'companies', companyId, 'contacts', contact.id!);
    const contactDoc = await getDoc(contactRef);

    if (!contactDoc.exists()) {
      console.error(`Contact document does not exist: ${contact.id}`);
      toast.error(`Failed to add tag: Contact not found`);
      return;
    }

    const currentTags = contactDoc.data().tags || [];

    if (!currentTags.includes(tagName)) {
      await updateDoc(contactRef, {
        tags: arrayUnion(tagName)
      });

      // Update local state
      setContacts(prevContacts =>
        prevContacts.map(c =>
          c.id === contact.id
            ? { ...c, tags: [...(c.tags || []), tagName] }
            : c
        )
      );

      console.log(`Tag ${tagName} added to contact ${contact.id}`);
      toast.success(`Tag "${tagName}" added to contact`);

      // If this is a trigger tag, call the follow-up API
      if (matchingTemplate) {
        try {
          const response = await fetch(`${baseUrl}/api/tag/followup`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              requestType: 'startTemplate',
              phone: contact.phone,
              first_name: contact.contactName || contact.firstName || contact.phone,
              phoneIndex: contact.phoneIndex || 0,
              templateId: matchingTemplate.id,
              idSubstring: companyId
            }),
          });

          if (!response.ok) {
            throw new Error(`Follow-up API error: ${response.statusText}`);
          }

          console.log('Follow-up template started successfully');
          toast.success('Follow-up sequence started');
        } catch (error) {
          console.error('Error starting follow-up sequence:', error);
          toast.error('Failed to start follow-up sequence');
        }
      }

      // Handle specific tags
      if (tagName === 'Before Quote Follow Up') {
        addTagBeforeQuote(contact);
      } else if (tagName === 'Before Quote Follow Up EN') {
        addTagBeforeQuoteEnglish(contact);
      } else if (tagName === 'Before Quote Follow Up BM') {
        addTagBeforeQuoteMalay(contact);
      } else if (tagName === 'Before Quote Follow Up CN') {
        addTagBeforeQuoteChinese(contact);
      } else if (tagName === 'Pause Follow Up') {
        pauseFiveDaysFollowUp(contact);
      } else {
        // Check if the tag is an employee's name and send assignment notification
        const employee = employeeList.find(emp => emp.name === tagName);
        if (employee) {
          await sendAssignmentNotification(tagName, contact);
        }
      }

    } else {
      console.log(`Tag ${tagName} already exists for contact ${contact.id}`);
      toast.info(`Tag "${tagName}" already exists for this contact`);
    }

  } catch (error) {
    console.error('Error adding tag to contact:', error);
    toast.error('Failed to add tag to contact');
  }
};


  

// Add this function to handle adding notifications
const addNotificationToUser = async (companyId: string, employeeName: string, notificationData: any) => {
  try {
    // Find the user with the specified companyId and name
    const usersRef = collection(firestore, 'user');
    const q = query(usersRef, 
      where('companyId', '==', companyId),
      where('name', '==', employeeName)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log('No matching user found for:', employeeName);
      return;
    }

    // Add the new notification to the notifications subcollection of the user's document
    querySnapshot.forEach(async (doc) => {
      const userRef = doc.ref;
      const notificationsRef = collection(userRef, 'notifications');
      await addDoc(notificationsRef, notificationData);
      console.log(`Notification added for user: ${employeeName}`);
    });
  } catch (error) {
    console.error('Error adding notification: ', error);
  }
};

const sendAssignmentNotification = async (assignedEmployeeName: string, contact: Contact) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error('No authenticated user');
      return;
    }

    const docUserRef = doc(firestore, 'user', user.email!);
    const docUserSnapshot = await getDoc(docUserRef);
    if (!docUserSnapshot.exists()) {
      console.error('No user document found');
      return;
    }

    const userData = docUserSnapshot.data();
    const companyId = userData.companyId;
    console.log('Company ID:', companyId); // New log

    if (!companyId || typeof companyId !== 'string') {
      console.error('Invalid companyId:', companyId);
      throw new Error('Invalid companyId');
    }

    // Check if notification has already been sent
    const notificationRef = doc(firestore, 'companies', companyId, 'assignmentNotifications', `${contact.id}_${assignedEmployeeName}`);
    const notificationSnapshot = await getDoc(notificationRef);
    
    if (notificationSnapshot.exists()) {
      console.log('Notification already sent for this assignment');
      return;
    }

    // Find the employee in the employee list
    const assignedEmployee = employeeList.find(emp => emp.name.toLowerCase() === assignedEmployeeName.toLowerCase());
    if (!assignedEmployee) {
      console.error(`Employee not found: ${assignedEmployeeName}`);
      toast.error(`Failed to send assignment notification: Employee ${assignedEmployeeName} not found`);
      return;
    }

    // Fetch all admin users
    const usersRef = collection(firestore, 'user');
    const adminQuery = query(usersRef, where('companyId', '==', companyId), where('role', '==', '1'));
    const adminSnapshot = await getDocs(adminQuery);
    const adminUsers = adminSnapshot.docs.map(doc => doc.data());

    console.log(`Found ${adminUsers.length} admin users for notifications`);

    const docRef = doc(firestore, 'companies', companyId);
    const docSnapshot = await getDoc(docRef);
    if (!docSnapshot.exists()) {
      console.error('No company document found');
      return;
    }
    const companyData = docSnapshot.data();
    console.log('Company Data:', companyData); // New log
    console.log('User Phone:', userData.phone);
    console.log('WhatsApp API Token:', companyData.whapiToken); // New log
    console.log('Using API v2:', companyData.v2); // New log

    // Function to send WhatsApp message
    const sendWhatsAppMessage = async (phoneNumber: string, message: string) => {
      const chatId = `${phoneNumber.replace(/[^\d]/g, '')}@c.us`;
      console.log('Employee Phone Number:', phoneNumber); // New log
      console.log('Formatted Chat ID:', chatId); // New log
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
      let userPhoneIndex = userData?.phone >= 0 ? userData?.phone : 0;
      if (userPhoneIndex === -1) {
        userPhoneIndex = 0;
      }
      let url;
      let requestBody;
      if (companyData.v2 === true) {
        url = `${baseUrl}/api/v2/messages/text/${companyId}/${chatId}`;
        requestBody = { 
          message,
          phoneIndex: userPhoneIndex,
          userName: userData.name || ''
        };
      } else {
        url = `${baseUrl}/api/messages/text/${chatId}/${companyData.whapiToken}`;
        requestBody = { message };
      }
      console.log('API URL:', url); // New log
      console.log('Request Body:', requestBody); // New log

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Full error response:', errorText); // Updated log
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      return await response.json();
    };

    // Send notification to assigned employee
    if (assignedEmployee.phoneNumber) {
      let employeeMessage = `Hello ${assignedEmployee.name}, a new contact has been assigned to you:\n\nName: ${contact.contactName || contact.firstName || 'N/A'}\nPhone: ${contact.phone}\n\nKindly login to https://web.jutasoftware.co/login \n\nThank you.\n\nJuta Teknologi`;
      if(companyId == '042'){
        employeeMessage = `Hi ${assignedEmployee.employeeId || assignedEmployee.phoneNumber} ${assignedEmployee.name}.\n\nAnda telah diberi satu prospek baharu\n\nSila masuk ke https://zahintravel.chat/login untuk melihat perbualan di antara Zahin Travel dan prospek.\n\nTerima kasih.\n\nIkhlas,\nZahin Travel Sdn. Bhd. (1276808-W)\nNo. Lesen Pelancongan: KPK/LN 9159\nNo. MATTA: MA6018\n\n#zahintravel - Nikmati setiap detik..\n#diyakini\n#responsif\n#budibahasa`;
      }
      await sendWhatsAppMessage(assignedEmployee.phoneNumber, employeeMessage);
    }

    // Send notification to all admins
    for (const admin of adminUsers) {
      if (admin.phoneNumber) {
        const adminMessage = `Admin notification: A new contact has been assigned to ${assignedEmployee.name}:\n\nName: ${contact.contactName || contact.firstName || 'N/A'}\nPhone: ${contact.phone}`;
        await sendWhatsAppMessage(admin.phoneNumber, adminMessage);
      }
    }

    // Mark notification as sent
    await setDoc(notificationRef, {
      sentAt: serverTimestamp(),
      employeeName: assignedEmployeeName,
      contactId: contact.id
    });

    toast.success("Assignment notifications sent successfully!");
  } catch (error) {
    console.error('Error sending assignment notifications:', error);
    console.log('Assigned Employee Name:', assignedEmployeeName);
    console.log('Contact:', contact);
    console.log('Employee List:', employeeList);
    console.log('Company ID:', companyId);
  }
};


//start of sending daily summary code

useEffect(() => {
  const checkAndSendDailySummary = async () => {
    const now = new Date();
    const targetHour = 23; // 11 PM
    const targetMinute = 30;

    if (now.getHours() === targetHour && now.getMinutes() === targetMinute) {
      console.log('It\'s 11:30 PM. Preparing to send daily summary...');
      const user = auth.currentUser;
      if (user) {
        const docUserRef = doc(firestore, 'user', user.email!);
        const docUserSnapshot = await getDoc(docUserRef);
        if (docUserSnapshot.exists()) {
          const userData = docUserSnapshot.data();
          const companyId = userData.companyId;
          const companyRef = doc(firestore, 'companies', companyId);
          const companySnapshot = await getDoc(companyRef);
          if (companySnapshot.exists()) {
            const companyData = companySnapshot.data();
            const companyName = companyData.name;
            console.log(`Sending daily summary for company ${companyName} (ID: ${companyId})`);
            await sendDailyLeadsSummary(companyId);
          } else {
            console.log('Company document does not exist');
          }
        } else {
          console.log('User document does not exist');
        }
      } else {
        console.log('No authenticated user');
      }
    }
  };

  // Check every minute
  const intervalId = setInterval(checkAndSendDailySummary, 60000);

  return () => clearInterval(intervalId);
}, []);

const sendDailyLeadsSummary = async (companyId: string) => {
  try {
    console.log('Starting to send daily leads summary');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Query to get contacts created today
    const contactsRef = collection(firestore, 'companies', companyId, 'contacts');
    const todayQuery = query(
      contactsRef,
      where('createdAt', '>=', Timestamp.fromDate(today)),
      where('createdAt', '<', Timestamp.fromDate(tomorrow))
    );
    const todaySnapshot = await getDocs(todayQuery);
    const newLeadsCount = todaySnapshot.size;

    console.log(`New leads count: ${newLeadsCount}`);

    // Get all admin users
    const usersRef = collection(firestore, 'user');
    const adminQuery = query(usersRef, where('companyId', '==', companyId), where('role', '==', '1'));
    const adminSnapshot = await getDocs(adminQuery);
    const adminUsers = adminSnapshot.docs.map(doc => doc.data());

    console.log(`Found ${adminUsers.length} admin users`);

    // Get company data
    const companyRef = doc(firestore, 'companies', companyId);
    const companySnapshot = await getDoc(companyRef);
    if (!companySnapshot.exists()) {
      throw new Error('Company document not found');
    }
    const companyData = companySnapshot.data();

    // Send summary to all admin users
    for (const admin of adminUsers) {
      if (admin.phoneNumber) {
        const summaryMessage = `Daily Lead Summary\n\nDate: ${today.toLocaleDateString()}\nNew Leads: ${newLeadsCount}\n\nThis is an automated message from your CRM system.`;
        console.log(`Sending summary to ${admin.phoneNumber}`);
        await sendWhatsAppMessage(admin.phoneNumber, summaryMessage, companyId, companyData);
      } else {
        console.log(`Admin ${admin.email} has no phone number`);
      }
    }

    console.log(`Daily lead summary sent to ${adminUsers.length} admin users.`);
  } catch (error) {
    console.error('Error sending daily leads summary:', error);
  }
};


const sendWhatsAppMessage = async (phoneNumber: string, message: string, companyId: string, companyData: any) => {
  try {
    const chatId = `${phoneNumber.replace(/[^\d]/g, '')}@c.us`;
    
    // Get current user's phone index, defaulting to 0 if invalid
    let userPhoneIndex = userData?.phone >= 0 ? userData?.phone : 0;
    const userName = userData?.name || userData?.email || '';

    if (userPhoneIndex === -1) {
      userPhoneIndex = 0;
    }
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
    console.log('Sending WhatsApp message:', {
      url: `${baseUrl}/api/v2/messages/text/${companyId}/${chatId}`,
      phoneIndex: userPhoneIndex, // Using adjusted phone index
      userName,
      chatId
    });

    const response = await fetch(`${baseUrl}/api/v2/messages/text/${companyId}/${chatId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        phoneIndex: userPhoneIndex, // Using adjusted phone index
        userName
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
};

 
const formatText = (text: string) => {
  const parts = text.split(/(\*[^*]+\*|\*\*[^*]+\*\*)/g);
  return parts.map((part: string, index: any) => {
 if (part.startsWith('*') && part.endsWith('*')) {
      return <strong key={index}>{part.slice(1, -1)}</strong>;
    } else {
      return part;
    }
  });
};
const openEditMessage = (message: Message) => {
  setEditingMessage(message);
  setEditedMessageText(message.text?.body || "");
};

function formatDate(timestamp: string | number | Date) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  } else {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
  const handleEyeClick = () => {
    setIsTabOpen(!isTabOpen);
  };

  
const handlePageChange = ({ selected }: { selected: number }) => {
  setCurrentPage(selected);
};

const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
const [paginatedContacts, setPaginatedContacts] = useState<Contact[]>([]);

useEffect(() => {
  if (filteredContacts.length === 0) {
    setLoadingMessage("Fetching contacts...");
  } else {
    setLoadingMessage("Fetching contacts...");
    const timer = setTimeout(() => {
      if (paginatedContacts.length === 0) {
        setLoadingMessage("There are a lot of contacts, fetching them might take some time...");
      }
    }, 15000);

    return () => clearTimeout(timer);
  }
}, [filteredContacts, paginatedContacts, activeTags]);

useEffect(() => {
  console.log('Filtering contacts', { 
    contactsLength: contacts.length, 
    userRole, 
    userName: userData?.name,
    activeTags,
    searchQuery
  });

  let filtered = contacts;

  // Apply role-based filtering
  if (userRole === "3") {
    filtered = filtered.filter(contact => 
      contact.assignedTo?.toLowerCase() === userData?.name?.toLowerCase() ||
      contact.tags?.some(tag => tag.toLowerCase() === userData?.name?.toLowerCase())
    );
  }

  // Apply tag filter
  if (activeTags.length > 0) {
    filtered = filtered.filter((contact) => {
      if (activeTags.includes('Mine')) {
        return contact.assignedTo?.toLowerCase() === userData?.name?.toLowerCase() ||
               contact.tags?.some(tag => tag.toLowerCase() === userData?.name?.toLowerCase());
      }
      if (activeTags.includes('Unassigned')) {
        return !contact.assignedTo && !contact.tags?.some(tag => employeeList.some(employee => employee.name.toLowerCase() === tag.toLowerCase()));
      }
      if (activeTags.includes('All')) {
        return true;
      }
      return activeTags.some(tag => contact.tags?.includes(tag));
    });
  }

  // Apply search filter
  if (searchQuery.trim() !== '') {
    filtered = filtered.filter((contact) =>
      (contact.contactName?.toLowerCase() || '')
        .includes(searchQuery.toLowerCase()) ||
      (contact.firstName?.toLowerCase() || '')
        .includes(searchQuery.toLowerCase()) ||
      (contact.phone?.toLowerCase() || '')
        .includes(searchQuery.toLowerCase()) ||
      (contact.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
    );
  }

  setFilteredContacts(filtered);
  if (searchQuery.trim() !== '') {
    setCurrentPage(0); // Reset to first page when searching
  }

  console.log('Filtered contacts updated:', filtered);
}, [contacts, searchQuery, activeTags, currentUserName, employeeList, userRole, userData]);

// Update the pagination logic
useEffect(() => {
  const startIndex = currentPage * contactsPerPage;
  const endIndex = startIndex + contactsPerPage;
  setPaginatedContacts(filteredContacts.slice(startIndex, endIndex));
}, [currentPage, contactsPerPage, filteredContacts]);

const getSortedContacts = useCallback((contactsToSort: Contact[]) => {
  return [...contactsToSort].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    
    const timestampA = a.last_message?.timestamp ? new Date(a.last_message.timestamp).getTime() : 0;
    const timestampB = b.last_message?.timestamp ? new Date(b.last_message.timestamp).getTime() : 0;
    
    return timestampB - timestampA;
  });
}, []);

useEffect(() => {
  const sortedAndFilteredContacts = getSortedContacts(filteredContactsSearch);
  setFilteredContacts(sortedAndFilteredContacts);
}, [filteredContactsSearch, getSortedContacts]);

const sortContacts = (contacts: Contact[]) => {
  let fil = contacts;
  const activeTag = activeTags[0].toLowerCase();
  
  // Check if the user has a selected phone
  let userPhoneIndex = userData?.phone !== undefined ? parseInt(userData.phone, 10) : 0;
  if (userPhoneIndex === -1) {
    userPhoneIndex = 0;
  }
  console.log("userPhoneIndex", userPhoneIndex);
  
  // Filter by user's selected phone first
  if (userPhoneIndex !== -1) {
    fil = fil.filter(contact => 
      contact.phoneIndexes 
        ? contact.phoneIndexes.includes(userPhoneIndex)
        : contact.phoneIndex === userPhoneIndex
    );
  }
  
  // Check if the active tag matches any of the phone names
  const phoneIndex = Object.entries(phoneNames).findIndex(([_, name]) => 
    name.toLowerCase() === activeTag
  );
  
  if (phoneIndex !== -1) {
    fil = fil.filter(contact => 
      contact.phoneIndexes 
        ? contact.phoneIndexes.includes(phoneIndex)
        : contact.phoneIndex === phoneIndex
    );
  }
  // Apply search filter
  if (searchQuery.trim() !== '') {
    fil = fil.filter((contact) =>
      (contact.contactName?.toLowerCase() || '')
        .includes(searchQuery.toLowerCase()) ||
      (contact.firstName?.toLowerCase() || '')
        .includes(searchQuery.toLowerCase()) ||
      (contact.phone?.toLowerCase() || '')
        .includes(searchQuery.toLowerCase()) ||
      (contact.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
    );
  }

  const getDate = (contact: Contact) => {
    if (contact.last_message?.timestamp) {
      return typeof contact.last_message.timestamp === 'number'
        ? contact.last_message.timestamp
        : new Date(contact.last_message.timestamp).getTime() / 1000;
    } else {
      return 0;
    }
  };

  return fil.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    
    const timestampA = a.last_message?.timestamp ? new Date(a.last_message.timestamp).getTime() : 0;
    const timestampB = b.last_message?.timestamp ? new Date(b.last_message.timestamp).getTime() : 0;
    
    return timestampB - timestampA;
  });
};

  const filterTagContact = (tag: string) => {
    setActiveTags([tag.toLowerCase()]);
    setSearchQuery('');
    console.log('active1:' + activeTags[0]);

  };

  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  const handleGlobalMessageSearch = async (searchQuery: string, page: number = 1) => {
    if (!searchQuery.trim()) {
      setGlobalSearchResults([]);
      setIsGlobalSearchActive(false);
      setGlobalSearchLoading(false);
      return;
    }

    setGlobalSearchLoading(true);
    setIsGlobalSearchActive(true);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user');

      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) throw new Error('No user document found');

      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;

      // Get all contacts for the company
      const contactsRef = collection(firestore, 'companies', companyId, 'contacts');
      const contactsSnapshot = await getDocs(contactsRef);

      let allResults: any[] = [];

      // Search through each contact's messages
      for (const contactDoc of contactsSnapshot.docs) {
        const messagesRef = collection(firestore, 'companies', companyId, 'contacts', contactDoc.id, 'messages');
        
        // Simplified query that only uses orderBy
        const messagesQuery = query(
          messagesRef,
          orderBy('timestamp', 'desc'),
          limit(100)
        );

        const messagesSnapshot = await getDocs(messagesQuery);
        
        // Filter messages client-side
        const contactResults = messagesSnapshot.docs
          .filter(doc => {
            const data = doc.data() as { text?: { body?: string } };
            const messageText = data.text?.body?.toLowerCase() || '';
            return messageText.includes(searchQuery.toLowerCase());
          })
          .map(doc => ({
            ...(doc.data() as Record<string, any>),
            id: doc.id,
            contactId: contactDoc.id
          }));

        allResults = [...allResults, ...contactResults];
      }

      // Format and sort results
      const formattedResults = allResults.map(result => ({
        ...result,
        text: {
          body: result.text?.body || result.message || result.content || '',
        },
        timestamp: result.timestamp || result.created_at || Date.now(),
        from_me: result.from_me || false,
        chat_id: result.chat_id || result.chatId || '',
        type: result.type || 'text'
      }));

      const sortedResults = formattedResults.sort((a, b) => {
        const timestampA = typeof a.timestamp === 'number' ? a.timestamp : new Date(a.timestamp).getTime();
        const timestampB = typeof b.timestamp === 'number' ? b.timestamp : new Date(b.timestamp).getTime();
        return timestampB - timestampA;
      });

      setGlobalSearchResults(sortedResults);
      toast.success(`Found ${sortedResults.length} message${sortedResults.length === 1 ? '' : 's'}`);

    } catch (error) {
      console.error('Search failed:', error);
      setGlobalSearchResults([]);
      toast.error('Search failed. Please try again.');
    } finally {
      setGlobalSearchLoading(false);
    }
  };

  const loadMoreSearchResults = (page: number) => {
    handleGlobalMessageSearch(searchQuery, page);
  };

  // Update the search handler to use debouncing more effectively
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (!query.trim()) {
      setGlobalSearchResults([]);
      setIsGlobalSearchActive(false);
      setGlobalSearchLoading(false);
      return;
    }
    
    setGlobalSearchLoading(true);
    searchTimeoutRef.current = setTimeout(() => {
      handleGlobalMessageSearch(query);
    }, 750); // Increased debounce time to reduce API calls
  };


  const filterForwardDialogContacts = (tag: string) => {
    setForwardDialogTags(prevTags => 
      prevTags.includes(tag) ? prevTags.filter(t => t !== tag) : [...prevTags, tag]
    );
  };
  
  // Modify the handleSearchChange2 function
  const handleSearchChange2 = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery2(e.target.value);
  };
  
  // Add this function to get filtered contacts
  const getFilteredForwardingContacts = () => {
    return contacts.filter(contact => {
      const matchesSearch = 
        contact.contactName?.toLowerCase().includes(searchQuery2.toLowerCase()) ||
        contact.firstName?.toLowerCase().includes(searchQuery2.toLowerCase()) ||
        contact.phone?.toLowerCase().includes(searchQuery2.toLowerCase());
  
      const matchesTags = forwardDialogTags.length === 0 || 
        contact.tags?.some(tag => forwardDialogTags.includes(tag));
  
      return matchesSearch && matchesTags;
    });
  };

  // Update the pagination logic
  const indexOfLastContact = currentPage * contactsPerPage;
  const indexOfFirstContact = indexOfLastContact - contactsPerPage;
  const currentContacts = filteredContactsSearch.slice(indexOfFirstContact, indexOfLastContact);

  // Update the total pages calculation
  const totalPages = Math.ceil(filteredContactsSearch.length / contactsPerPage);
  
  useEffect(() => {
    console.log('Filtering contacts - Start', { 
      contactsLength: contacts.length, 
      activeTags,
      searchQuery,
      userRole,
      userData
    });
  
    const tag = activeTags[0]?.toLowerCase() || 'all';
    let filteredContacts = filterContactsByUserRole(contacts, userRole, userData?.name || '');
    setMessageMode('reply');
  
    console.log('After filterContactsByUserRole:', filteredContacts.length);
  
    // First, filter contacts based on the employee's assigned phone
    if (userData?.phone !== undefined && userData.phone !== -1) {
      const userPhoneIndex = parseInt(userData.phone, 10);
      setMessageMode(`phone${userPhoneIndex + 1}`);
      filteredContacts = filteredContacts.filter(contact => 
        contact.phoneIndexes 
          ? contact.phoneIndexes.includes(userPhoneIndex)
          : contact.phoneIndex === userPhoneIndex
      );
      console.log('After phone filter:', filteredContacts.length);
    }
  
    // Filtering logic
    if (Object.values(phoneNames).map(name => name.toLowerCase()).includes(tag)) {
      const phoneIndex = Object.entries(phoneNames).findIndex(([_, name]) => 
        name.toLowerCase() === tag
      );
      if (phoneIndex !== -1) {
        setMessageMode(`phone${phoneIndex + 1}`);
        filteredContacts = filteredContacts.filter(contact => 
          contact.phoneIndex === phoneIndex
        );
        console.log('After phone name filter:', filteredContacts.length);
      }
    } else {
      // Existing filtering logic for other tags
      switch (tag) {
        case 'all':
          if(companySubstring?.includes('042')){
            filteredContacts = filteredContacts.filter(contact => 
              !contact.chat_id?.endsWith('@g.us') && 
              !contact.tags?.includes('snooze')
            );
          } else {
            filteredContacts = filteredContacts.filter(contact => 
              !contact.tags?.includes('snooze')
            );
          }
          break;
        case 'unread':
          filteredContacts = filteredContacts.filter(contact => contact.unreadCount && contact.unreadCount > 0 && 
          !contact.tags?.includes('snooze'));
          break;
        case 'mine':
          filteredContacts = filteredContacts.filter(contact => 
            contact.tags?.some(t => t.toLowerCase() === currentUserName.toLowerCase())&& 
            !contact.tags?.includes('snooze')
          );
          break;
        case 'unassigned':
          filteredContacts = filteredContacts.filter(contact => 
            !contact.tags?.some(t => employeeList.some(e => e.name.toLowerCase() === t.toLowerCase())) && 
            !contact.tags?.includes('snooze')
          );
          break;
        case 'snooze':
          filteredContacts = filteredContacts.filter(contact => 
            contact.tags?.includes('snooze')
          );
          break;
        case 'group':
          filteredContacts = filteredContacts.filter(
            (contact) =>
              contact.chat_id?.endsWith("@g.us") && !contact.tags?.includes("snooze")
          );
          break;
        case "stop bot":
          filteredContacts = filteredContacts.filter(contact => 
            contact.tags?.includes('stop bot') && 
            !contact.tags?.includes('snooze')
          );
          break;
        case 'resolved':
          filteredContacts = filteredContacts.filter(contact => 
            contact.tags?.includes('resolved') && 
            !contact.tags?.includes('snooze')
          );
          break;
        case 'active bot':
          filteredContacts = filteredContacts.filter(contact => 
            !contact.tags?.includes('stop bot') && 
            !contact.tags?.includes('snooze')
          );
          break;
        default:
          filteredContacts = filteredContacts.filter(contact => 
            contact.tags?.some(t => t.toLowerCase() === tag.toLowerCase()) && 
            !contact.tags?.includes('snooze')
          );
      }
      console.log('After tag filter:', filteredContacts.length);
    }
  
    filteredContacts = sortContacts(filteredContacts);
    console.log("MESSAGE MODE", messageMode);
  
    if (searchQuery) {
      filteredContacts = filteredContacts.filter((contact) => {
        const name = (contact.contactName || contact.firstName || '').toLowerCase();
        const phone = (contact.phone || '').toLowerCase();
        const tags = (contact.tags || []).join(' ').toLowerCase();
        
        return name.includes(searchQuery.toLowerCase()) || 
              phone.includes(searchQuery.toLowerCase()) || 
              tags.includes(searchQuery.toLowerCase());
      });
      console.log('After search filter:', filteredContacts.length);
    }
  
    console.log('Final filtered contacts:', filteredContacts.length);
    setFilteredContacts(filteredContacts);
  
  }, [contacts, searchQuery, activeTags, showAllContacts, showUnreadContacts, showMineContacts, showUnassignedContacts, showSnoozedContacts, showGroupContacts, currentUserName, employeeList, userData, userRole]);
  
  const handleSnoozeContact = async (contact: Contact) => {
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
  
      // Update Firestore
      if (companyId && contact.id) {
        const contactRef = doc(firestore, 'companies', companyId, 'contacts', contact.id);
        await updateDoc(contactRef, {
          tags: arrayUnion('snooze')
        });
      } else {
        console.error('Invalid companyId or contact.id');
      }
      // Update local state
      setContacts(prevContacts =>
        prevContacts.map(c =>
          c.id === contact.id
            ? { ...c, tags: [...(c.tags || []), 'snooze'] }
            : c
        )
      );
  
      toast.success('Contact snoozed successfully');
    } catch (error) {
      console.error('Error snoozing contact:', error);
      toast.error('Failed to snooze contact');
    }
  };
  const handleUnsnoozeContact = async (contact: Contact) => {
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
  
      // Update Firestore
      if (companyId && contact.id) {
        const contactRef = doc(firestore, 'companies', companyId, 'contacts', contact.id);
        await updateDoc(contactRef, {
          tags: arrayRemove('snooze')
        });
      } else {
        console.error('Invalid companyId or contact.id');
      }
      // Update local state
      setContacts(prevContacts =>
        prevContacts.map(c =>
          c.id === contact.id
            ? { ...c, tags: c.tags?.filter(tag => tag !== 'snooze') }
            : c
        )
      );
  
      toast.success('Contact unsnoozed successfully');
    } catch (error) {
      console.error('Error unsnoozing contact:', error);
      toast.error('Failed to unsnooze contact');
    }
  };

  const handleResolveContact = async (contact: Contact) => {
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
  
      // Update Firestore
      if (companyId && contact.id) {
        const contactRef = doc(firestore, 'companies', companyId, 'contacts', contact.id);
        await updateDoc(contactRef, {
          tags: arrayUnion('resolved')
        });
      } else {
        console.error('Invalid companyId or contact.id');
      }
      // Update local state
      setContacts(prevContacts =>
        prevContacts.map(c =>
          c.id === contact.id
            ? { ...c, tags: [...(c.tags || []), 'resolved'] }
            : c
        )
      );
  
      toast.success('Contact marked as resolved');
    } catch (error) {
      console.error('Error resolving contact:', error);
      toast.error('Failed to mark contact as resolved');
    }
  };

  const handleUnresolveContact = async (contact: Contact) => {
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
  
      // Update Firestore
      if (companyId && contact.id) {
        const contactRef = doc(firestore, 'companies', companyId, 'contacts', contact.id);
        await updateDoc(contactRef, {
          tags: arrayRemove('resolved')
        });
      } else {
        console.error('Invalid companyId or contact.id');
      }
      // Update local state
      setContacts(prevContacts =>
        prevContacts.map(c =>
          c.id === contact.id
            ? { ...c, tags: c.tags?.filter(tag => tag !== 'resolved') }
            : c
        )
      );
  
      toast.success('Contact unmarked as resolved');
    } catch (error) {
      console.error('Error unresolving contact:', error);
      toast.error('Failed to unmark contact as resolved');
    }
  };

  const handleSelectMessage = (message: Message) => {
    setSelectedMessages(prevSelectedMessages =>
        prevSelectedMessages.includes(message)
            ? prevSelectedMessages.filter(m => m.id !== message.id)
            : [...prevSelectedMessages, message]
    );
  };

  const handleForwardMessage = async () => {
    if (selectedMessages.length === 0 || selectedContactsForForwarding.length === 0) return;
  
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user');
  
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) throw new Error('No user document found');
  
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;

      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.log('No such document!');
        return;
      }
      const data2 = docSnapshot.data();
      const baseUrl = data2.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';
      for (const contact of selectedContactsForForwarding) {
        for (const message of selectedMessages) {
          try {
            if (message.type === 'image') {
              let imageUrl = message.image?.link || message.image?.url;
              
              if (!imageUrl && message.image?.data) {
                // If we have base64 data, upload it to get a URL
                const base64Data = message.image.data.startsWith('data:') 
                  ? message.image.data 
                  : `data:${message.image?.mimetype};base64,${message.image?.data}`;
                imageUrl = await uploadBase64Image(base64Data, message.image?.mimetype || '');
              }
  
              if (!imageUrl) {
                console.error('No valid image data found for message:', message);
                toast.error(`Failed to forward image: No valid image data`);
                continue;
              }

              await sendImageMessage(contact.chat_id ?? '', imageUrl, message.image?.caption ?? '');
            } else if (message.type === 'document') {
              // Ensure we have a valid document link
              const documentLink = message.document?.link;
              if (!documentLink) {
                throw new Error('Invalid document link');
              }
              await sendDocumentMessage(
                contact.chat_id ?? '',
                documentLink,
                message.document?.mime_type ?? '',
                message.document?.file_name ?? '',
                message.document?.caption ?? ''
              );
            } else {
              // For text messages, use the existing API call
              const response = await fetch(`${baseUrl}/api/v2/messages/text/${companyId}/${contact.chat_id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  message: message.text?.body || '',
                  phoneIndex: userData.phone || 0,
                  userName: userData.name || userData.email || ''
                }),
              });
  
              if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to forward text message: ${response.status} ${errorText}`);
              }
            }
            console.log('Message forwarded successfully');
          } catch (error) {
            console.error('Error forwarding message:', error);
            toast.error(`Failed to forward a message: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }
  
      setIsForwardDialogOpen(false);
      setSelectedMessages([]);
      setSelectedContactsForForwarding([]);
      toast.success('Messages forwarded successfully');
    } catch (error) {
      console.error('Error in forward process:', error);
      toast.error(`Error in forward process: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const uploadBase64Image = async (base64Data: string, mimeType: string): Promise<string> => {
    try {
      const response = await fetch(base64Data);
      const blob = await response.blob();
  
      const storage = getStorage();
      const storageRef = ref(storage, `images/${Date.now()}.${mimeType.split('/')[1]}`);
      
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading base64 image:', error);
      throw error;
    }
  };

  const handleSelectContactForForwarding = (contact: Contact) => {
    setSelectedContactsForForwarding(prevContacts => 
      prevContacts.includes(contact) ? prevContacts.filter(c => c.id !== contact.id) : [...prevContacts, contact]
    );
  };
  const formatTimestamp = (timestamp: number | string | undefined): string => {

    if (!timestamp) {
      return 'Invalid date';
    }
    
    let date: Date;
  
    if (typeof timestamp === 'number') {
      if (isNaN(timestamp)) {
        return 'Invalid date';
      }
      date = new Date(timestamp * 1000);
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
    } else {
      return 'Invalid date';
    }
  
    try {
      return format(date, 'p');
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Invalid date';
    }
  };
  const handleTagClick = () => {
 
  };
  useEffect(() => {
    const handleKeyDown = (event: { key: string; }) => {
      if (event.key === "Escape") {
        console.log('escape');
        setSelectedContact(null);
    setSelectedChatId(null);
      }
    };
  
    window.addEventListener("keydown", handleKeyDown);
  
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
  
  const handleDocumentUpload: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    setLoading(true);
    const files = event.target.files;
    if (files) {
      for (const file of Array.from(files)) {
        const imageUrl = await uploadFile(file);
        await sendDocumentMessage(selectedChatId!, imageUrl!, file.type, file.name, "");
      }
    }
    setLoading(false);
  };
  
  const uploadFile = async (file: any): Promise<string> => {
    const storage = getStorage();
    const storageRef = ref(storage, `${file.name}`);
    
    // Upload the file
    await uploadBytes(storageRef, file);
  
    // Get the file's download URL
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  };
  
  const sendImageMessage = async (chatId: string, imageUrl: string, caption?: string) => {
    try {
      console.log(`Sending image message. ChatId: ${chatId}`);
      
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user');
  
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) throw new Error('No user document found');
  
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
      
      // Use selectedContact's phoneIndex
      if (!selectedContact) throw new Error('No contact selected');
      const phoneIndex = selectedContact.phoneIndex ?? 0;
      console.log(`Using contact's phoneIndex: ${phoneIndex}`);
      
      const userName = userData.name || userData.email || '';
  
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) throw new Error('No company document found');
  
      const companyData = docSnapshot.data();
      const baseUrl = companyData.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';
      let response;
      try {
        console.log(`Attempting to send image via API. PhoneIndex: ${phoneIndex}`);
        response = await fetch(`${baseUrl}/api/v2/messages/image/${companyId}/${chatId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrl: imageUrl,
            caption: caption || '',
            phoneIndex: phoneIndex,
            userName: userName,
          }),
        });
  
        if (!response.ok) throw new Error(`API failed with status ${response.status}`);
      } catch (error) {
        console.error('Error sending image:', error);
        throw error;
      }
  
      const data = await response.json();
      console.log('Image message sent successfully:', data);
      fetchMessages(chatId, companyData.ghl_accessToken);
    } catch (error) {
      console.error('Error sending image message:', error);
      toast.error(`Failed to send image: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };
  const sendDocumentMessage = async (chatId: string, documentUrl: string, mimeType: string, fileName: string, caption?: string) => {
    try {
      console.log(`Sending document message. ChatId: ${chatId}`);
      
      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user');
  
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) throw new Error('No user document found');
  
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
      
      // Use selectedContact's phoneIndex
      if (!selectedContact) throw new Error('No contact selected');
      const phoneIndex = selectedContact.phoneIndex ?? 0;
      console.log(`Using contact's phoneIndex: ${phoneIndex}`);
      
      const userName = userData.name || userData.email || '';
  
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) throw new Error('No company document found');
  
      const companyData = docSnapshot.data();
      const baseUrl = companyData.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';
      let response;
      try {
        console.log(`Attempting to send document via API. PhoneIndex: ${phoneIndex}`);
        response = await fetch(`${baseUrl}/api/v2/messages/document/${companyId}/${chatId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            documentUrl: documentUrl,
            filename: fileName,
            caption: caption || '',
            phoneIndex: phoneIndex,
            userName: userName,
          }),
        });
  
        if (!response.ok) throw new Error(`API failed with status ${response.status}`);
      } catch (error) {
        console.error('Error sending document:', error);
        throw error;
      }
  
      const data = await response.json();
      console.log('Document message sent successfully:', data);
      fetchMessages(chatId, companyData.ghl_accessToken);
    } catch (error) {
      console.error('Error sending document message:', error);
      toast.error(`Failed to send document: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  
  const handleCloseForwardDialog = () => {
    setIsForwardDialogOpen(false);
    setSearchQuery2(''); // Clear the search query
  };

  const togglePinConversation = async (chatId: string) => {
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
  
      if (!companyId) {
        console.error('Company ID is missing');
        return;
      }
  
      const contactToToggle = contacts.find(contact => contact.chat_id === chatId);
      if (!contactToToggle || !contactToToggle.id) {
        console.error("Contact not found for chatId:", chatId);
        return;
      }
  
      const contactDocRef = doc(firestore, 'companies', companyId, 'contacts', contactToToggle.id);
  
      // Toggle the pinned status
      const newPinnedStatus = !contactToToggle.pinned;
  
      // Update the contact document in Firestore
      await updateDoc(contactDocRef, {
        pinned: newPinnedStatus
      });
  
      // Update the local state
      setContacts(prevContacts => 
        prevContacts.map(contact =>
          contact.id === contactToToggle.id
            ? { ...contact, pinned: newPinnedStatus }
            : contact
        )
      );
  
      console.log(`Chat ${chatId} ${newPinnedStatus ? 'pinned' : 'unpinned'}`);
      toast.success(`Conversation ${newPinnedStatus ? 'pinned' : 'unpinned'}`);
    } catch (error) {
      console.error('Error toggling chat pin state:', error);
      toast.error('Failed to update pin status');
    }
  };

  const openImageModal = (imageUrl: string) => {
    setModalImageUrl(imageUrl);
    setImageModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('No authenticated user!');
        return;
      }
  
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
  
      // Update Firestore
      await updateDoc(doc(firestore, 'companies', companyId, 'contacts', selectedContact.id), {
        contactName: editedName
      });
  
      // Update local state
      setSelectedContact((prevContact: any) => ({
        ...prevContact,
        contactName: editedName
      }));
  
      // Update contacts in state
      setContacts(prevContacts => 
        prevContacts.map(contact => 
          contact.id === selectedContact.id 
            ? { ...contact, contactName: editedName } 
            : contact
        )
      );
  
      // Update localStorage
      const storedContacts = localStorage.getItem('contacts');
      if (storedContacts) {
        const decompressedContacts = JSON.parse(LZString.decompress(storedContacts));
        const updatedContacts = decompressedContacts.map((contact: any) => 
          contact.id === selectedContact.id 
            ? { ...contact, contactName: editedName } 
            : contact
        );
        localStorage.setItem('contacts', LZString.compress(JSON.stringify(updatedContacts)));
      }
  
      setIsEditing(false);
      toast.success('Contact name updated successfully!');
    } catch (error) {
      console.error('Error updating contact name:', error);
      toast.error('Failed to update contact name.');
    }
  };

  const closeImageModal = () => {
    setImageModalOpen(false);
    setModalImageUrl('');
  };

  // Handle keydown event
  const handleKeyDown = (event: { key: string; }) => {
    if (event.key === "Escape") {
      setSelectedMessages([]);
    }
  };
  const isSameDay = (date1: Date, date2: Date) => {
  return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };
  
  const formatDateHeader = (timestamp: string | number | Date) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };
  useEffect(() => {
    // Add event listener for keydown
    window.addEventListener("keydown", handleKeyDown);
    
    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
  
// First, ensure you have the Template interface defined
interface Template {
  id: string;
  triggerTags?: string[];
  name?: string;
  messages?: {
    text: string;
    delay: number;
    delayUnit: string;
  }[];
  createdAt?: any;
  updatedAt?: any;
}

 const handleRemoveTag = async (contactId: string, tagName: string) => {
    try {
      const user = auth.currentUser;
      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) throw new Error('No company document found');
  
      const companyData = docSnapshot.data();
      const baseUrl = companyData.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';
      // Check if tag is a trigger tag
      const templatesRef = collection(firestore, 'companies', companyId, 'followUpTemplates');
      const templatesSnapshot = await getDocs(templatesRef);
      
      let matchingTemplate: any = null;
      templatesSnapshot.forEach(doc => {
        const template = doc.data();
        if (template.triggerTags?.includes(tagName) && template.status === 'active') {
          matchingTemplate = { 
            id: doc.id, 
            ...template 
          };
        }
      });
  
      // Update Firestore
      const contactRef = doc(firestore, 'companies', companyId, 'contacts', contactId);
      const contactSnapshot = await getDoc(contactRef);
      const contact = contactSnapshot.data() as Contact;
      await updateDoc(contactRef, {
        tags: arrayRemove(tagName)
      });
  
      // If this was a trigger tag, call the follow-up API to remove the template
      if (matchingTemplate) {
        try {
          const response = await fetch(`${baseUrl}/api/tag/followup`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              requestType: 'removeTemplate',
              phone: contact.phone,
              first_name: contact.contactName || contact.firstName || contact.phone,
              phoneIndex: contact.phoneIndex || 0,
              templateId: matchingTemplate.id,
              idSubstring: companyId
            }),
          });
  
          if (!response.ok) {
            throw new Error(`Follow-up API error: ${response.statusText}`);
          }
  
          console.log('Follow-up template removed successfully');
          toast.success('Follow-up sequence stopped');
        } catch (error) {
          console.error('Error stopping follow-up sequence:', error);
          toast.error('Failed to stop follow-up sequence');
        }
      }
  
      // Check if the removed tag is an employee name
      const isEmployeeTag = employeeList.some(employee => employee.name.toLowerCase() === tagName.toLowerCase());
      if (isEmployeeTag) {
        const employeeRef = doc(firestore, 'companies', companyId, 'employee', tagName);
        const employeeDoc = await getDoc(employeeRef);
        
        if (employeeDoc.exists()) {
          const currentData = employeeDoc.data();
          const currentQuotaLeads = currentData.quotaLeads || 0;
          
          await updateDoc(employeeRef, {
            assignedContacts: arrayRemove(contactId),
            quotaLeads: currentQuotaLeads + 1 // Increase quota by 1
          });

          await updateDoc(contactRef, {
            assignedTo: deleteField()
          });

          toast.success(`Contact unassigned from ${tagName}. Quota leads updated from ${currentQuotaLeads} to ${currentQuotaLeads + 1}.`);
        } else {
          console.error(`Employee document for ${tagName} does not exist.`);
          console.log('Current employeeList:', employeeList);
          
          // List all documents in the employee collection
          const employeeCollectionRef = collection(firestore, 'companies', companyId, 'employee');
          const employeeSnapshot = await getDocs(employeeCollectionRef);
          console.log('All employee documents:');
          employeeSnapshot.forEach(doc => {
            console.log(doc.id, '=>', doc.data());
          });
        }
      }

      //handle specific tags
      if (tagName === 'Before Quote Follow Up') {
        removeTagBeforeQuote(contact);
      } else if (tagName === 'Before Quote Follow Up EN') {
        removeTagBeforeQuote(contact);
      } else if (tagName === 'Before Quote Follow Up BM') {
        removeTagBeforeQuote(contact);
      } else if (tagName === 'Before Quote Follow Up CN') {
        removeTagBeforeQuote(contact); 
      } else if (tagName === 'Pause Follow Up') {
        removeTagPause(contact);
      } else if (tagName === 'Edward Follow Up') {
        removeTagEdward(contact);
      }
  
      // Update state
      setContacts(prevContacts => {
        return prevContacts.map(contact =>
          contact.id === contactId
            ? { ...contact, tags: contact.tags!.filter(tag => tag !== tagName), assignedTo: undefined }
            : contact
        );
      });
  
      const updatedContacts = contacts.map((contact: Contact) =>
        contact.id === contactId
          ? { ...contact, tags: contact.tags!.filter((tag: string) => tag !== tagName), assignedTo: undefined }
          : contact
      );
  
      const updatedSelectedContact = updatedContacts.find(contact => contact.id === contactId);
      if (updatedSelectedContact) {
        setSelectedContact(updatedSelectedContact);
      }
      toast.success('Tag removed successfully!');
    } catch (error) {
      console.error('Error removing tag:', error);
      toast.error('Failed to remove tag.');
    }
  };
  
 

  const adjustHeight = (textarea: HTMLTextAreaElement, reset = false) => {
    if (reset) {
      textarea.style.height = 'auto';
    }
    const lineHeight = 24; // Approximate line height in pixels
    const maxLines = 8;
    const maxHeight = lineHeight * maxLines;

    textarea.style.height = 'auto';
    if (textarea.scrollHeight > maxHeight) {
      textarea.style.height = `${maxHeight}px`;
      textarea.style.overflowY = 'scroll';
    } else {
      textarea.style.height = `${textarea.scrollHeight}px`;
      textarea.style.overflowY = 'hidden';
    }
  };

  // Adjust height on new message change
  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight(textareaRef.current);
    }
  }, [newMessage]);
  const cancelEditMessage = () => {
    setEditingMessage(null);
    setEditedMessageText("");
  };
  
  const handleEditMessage = async () => {
    if (!editedMessageText.trim() || !editingMessage) return;

    try {
      const messageTimestamp = new Date(editingMessage.timestamp).getTime();
      const currentTime = new Date().getTime();
      const diffInMinutes = (currentTime - messageTimestamp) / (1000 * 60);

      if (diffInMinutes > 15) {
        toast.error('Message cannot be edited as it has been more than 15 minutes since it was sent.');
        return;
      }

      const user = auth.currentUser;
      if (!user) throw new Error('No authenticated user');

      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) throw new Error('No such document for user');

      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) throw new Error('No company document found');
      const companyData = docSnapshot.data();
      const baseUrl = companyData.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';
      const chatId = editingMessage.id.split('_')[1];
      console.log('editing this chat id', chatId);
      const response = await axios.put(
        `${baseUrl}/api/v2/messages/${companyId}/${chatId}/${editingMessage.id}`,
        { newMessage: editedMessageText,
          phoneIndex: userData.phoneIndex || 0
         }
      );

      if (response.data.success) {
        toast.success('Message edited successfully');

        // Update the message locally
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg.id === editingMessage.id
              ? { ...msg, text: { ...msg.text, body: editedMessageText }, edited: true }
              : msg
          )
        );

        setEditingMessage(null);
        setEditedMessageText("");
      } else {
        throw new Error(response.data.error || 'Failed to edit message');
      }
    } catch (error) {
      console.error('Error editing message:', error);
      toast.error('Failed to edit message. Please try again.');
    }
  };
  
  const sendDocument = async (file: File, caption: string) => {
    setLoading(true);
    try {
      const uploadedDocumentUrl = await uploadFile(file);
      if (uploadedDocumentUrl) {
        await sendDocumentMessage(selectedChatId!, uploadedDocumentUrl, file.type, file.name, caption);
      }
    } catch (error) {
      console.error('Error sending document:', error);
      toast.error('Failed to send document. Please try again.');
    } finally {
      setLoading(false);
      setDocumentModalOpen(false);
    }
  };

  const uploadLocalImageUrl = async (localUrl: string): Promise<string | null> => {
    try {
      const response = await fetch(localUrl);
      const blob = await response.blob();
  
      // Check the blob content
      console.log('Blob type:', blob.type);
      console.log('Blob size:', blob.size);
  
      const storageRef = ref(getStorage(), `${Date.now()}_${blob.type.split('/')[1]}`);
      const uploadResult = await uploadBytes(storageRef, blob);
  
      console.log('Upload result:', uploadResult);
  
      const publicUrl = await getDownloadURL(storageRef);
      console.log('Public URL:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };
  
  const sendImage = async (imageUrl: string | null, caption: string) => {
    console.log('Image URL:', imageUrl);
    console.log('Caption:', caption);
    setLoading(true);
    try {
      if (imageUrl) {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], 'image.jpg', { type: blob.type });
        
        const uploadedImageUrl = await uploadFile(file);
        if (uploadedImageUrl) {
          await sendImageMessage(selectedChatId!, uploadedImageUrl, caption);
        }
      }
    } catch (error) {
      console.error('Error sending image:', error);
      toast.error('Failed to send image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (quickRepliesRef.current && !quickRepliesRef.current.contains(event.target as Node)) {
        setIsQuickRepliesOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const [allBotsStopped, setAllBotsStopped] = useState(false);
  const [botsStatus, setBotsStatus] = useState<'allStopped' | 'allRunning' | 'mixed'>('mixed');

  useEffect(() => {
    const checkAllBotsStopped = () => {
      const allStopped = contacts.every(contact => contact.tags?.includes('stop bot'));
      setAllBotsStopped(allStopped);
    };

    checkAllBotsStopped();
  }, [contacts]);

  useEffect(() => {
    const checkBotsStatus = () => {
      const allStopped = contacts.every(contact => contact.tags?.includes('stop bot'));
      const allRunning = contacts.every(contact => !contact.tags?.includes('stop bot'));
      if (allStopped) {
        setBotsStatus('allStopped');
      } else if (allRunning) {
        setBotsStatus('allRunning');
      } else {
        setBotsStatus('mixed');
      }
    };
  
    checkBotsStatus();
  }, [contacts]);

  useEffect(() => {
    const checkAllBotsStopped = () => {
      const allStopped = contacts.every(contact => contact.tags?.includes('stop bot'));
      setAllBotsStopped(allStopped);
    };

    checkAllBotsStopped();
  }, [contacts]);

  useEffect(() => {
    const checkBotsStatus = () => {
      const allStopped = contacts.every(contact => contact.tags?.includes('stop bot'));
      const allRunning = contacts.every(contact => !contact.tags?.includes('stop bot'));
      if (allStopped) {
        setBotsStatus('allStopped');
      } else if (allRunning) {
        setBotsStatus('allRunning');
      } else {
        setBotsStatus('mixed');
      }
    };
  
    checkBotsStatus();
  }, [contacts]);

  const [companyStopBot, setCompanyStopBot] = useState(false);
// Update the useEffect that fetches company stop bot status
useEffect(() => {
  const fetchCompanyStopBot = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) return;

      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
      const currentPhoneIndex = userData.phone || 0;

      const companyRef = doc(firestore, 'companies', companyId);
      const companySnapshot = await getDoc(companyRef);
      if (!companySnapshot.exists()) return;

      const companyData = companySnapshot.data();
      const stopbots = companyData.stopbots || {};
      setCompanyStopBot(stopbots[currentPhoneIndex] || false);
    } catch (error) {
      console.error('Error fetching company stopbot status:', error);
    }
  };

  fetchCompanyStopBot();
}, [userData?.phone]); // Add userData?.phone as dependency

const toggleBot = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return;

    const docUserRef = doc(firestore, 'user', user.email!);
    const docUserSnapshot = await getDoc(docUserRef);
    if (!docUserSnapshot.exists()) return;

    const userData = docUserSnapshot.data();
    const companyId = userData.companyId;
    const currentPhoneIndex = userData.phone || 0;

    const companyRef = doc(firestore, 'companies', companyId);
    const companySnapshot = await getDoc(companyRef);
    if (!companySnapshot.exists()) return;

    const companyData = companySnapshot.data();
    
    // Check if phoneCount exists and is not null
    if (companyData.phoneCount) {
      // Handle multiple phones case with stopbots
      const currentStopbots = companyData.stopbots || {};
      
      if (companyData.phoneCount) {
        // If phoneCount exists, use stopbots map
        const newStopbots = {
          ...currentStopbots,
          [currentPhoneIndex]: !currentStopbots[currentPhoneIndex]
        };
        await updateDoc(companyRef, {
          stopbots: newStopbots
        });
        setCompanyStopBot(!currentStopbots[currentPhoneIndex]);
        toast.success(`Bot for ${phoneNames[currentPhoneIndex]} ${currentStopbots[currentPhoneIndex] ? 'enabled' : 'disabled'} successfully`);
      }
    } else {
      // Handle single phone case with stopbot
      await updateDoc(companyRef, {
        stopbot: !companyData.stopbot
      });
      setCompanyStopBot(!companyData.stopbot);
      toast.success(`Bot ${companyData.stopbot ? 'enabled' : 'disabled'} successfully`);
    }

  } catch (error) {
    console.error('Error toggling bot status:', error);
    toast.error('Failed to toggle bot status');
  }
};

  const { show } = useContextMenu({
    id: 'contact-context-menu',
  });

  const handleContextMenu = (event: React.MouseEvent, contact: Contact) => {
    event.preventDefault();
    show({
      event,
      props: {
        contact,
        onSnooze: () => handleSnoozeContact(contact),
        onUnsnooze: () => handleUnsnoozeContact(contact),
        isSnooze: contact.tags?.includes('snooze'),
        onResolve: () => handleResolveContact(contact),
        onUnresolve: () => handleUnresolveContact(contact),
        isResolved: contact.tags?.includes('resolved'),
      },
    });
  };
  const markAsUnread = async (contact: Contact) => {
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
      // Update Firebase
      if (companyId && contact.id) {
        const contactRef = doc(firestore, 'companies', companyId, 'contacts', contact.id);
        await updateDoc(contactRef, {
          unreadCount: increment(1),
        });
      } else {
        console.error('Invalid companyId or contact.id');
      }

      // Update local state
      setContacts(prevContacts =>
        prevContacts.map(c =>
          c.id === contact.id ? { ...c, unreadCount: (c.unreadCount || 0) + 1 } : c
        )
      );

      // Update local storage
      const storedContacts = JSON.parse(LZString.decompress(localStorage.getItem('contacts') || '') || '[]');
      const updatedStoredContacts = storedContacts.map((c: Contact) =>
        c.id === contact.id ? { ...c, unreadCount: (c.unreadCount || 0) + 1 } : c
      );
      localStorage.setItem('contacts', LZString.compress(JSON.stringify(updatedStoredContacts)));

      toast.success('Marked as unread');
    } catch (error) {
      console.error('Error marking as unread:', error);
      toast.error('Failed to mark as unread');
    }
  };
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedMedia(file);
    }
  };
  const sendBlastMessage = async () => {
    console.log('Starting sendBlastMessage function');

    // Ensure selectedChatId is valid
    if (!selectedChatId) {
      console.log('No chat selected');
      toast.error("No chat selected!");
      return;
    }
    // Combine date and time
    const scheduledTime = blastStartTime || new Date();
    const now = new Date();
    if (scheduledTime <= now) {
      console.log('Selected time is in the past');
      toast.error("Please select a future time for the blast message.");
      return;
    }
    setIsScheduling(true);
    try {
      let mediaUrl = '';
      let documentUrl = '';
      if (selectedMedia) {
        console.log('Uploading media...');
        mediaUrl = await uploadFile(selectedMedia);
        console.log(`Media uploaded. URL: ${mediaUrl}`);
      }
      if (selectedDocument) {
        console.log('Uploading document...');
        documentUrl = await uploadFile(selectedDocument);
        console.log(`Document uploaded. URL: ${documentUrl}`);
      }

      const user = auth.currentUser;
      console.log(`Current user: ${user?.email}`);

      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
      console.log(`Company ID: ${companyId}`);
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) throw new Error('No company document found');
      const companyData = docSnapshot.data();
      const baseUrl = companyData.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';
      const chatIds = [selectedChatId]; // Use selectedChatId directly
      const processedMessages = [selectedContact].map(contact => {
        let processedMessage = blastMessage;
        // Replace placeholders
        processedMessage = processedMessage.replace(/@{contactName}/g, contact.contactName || '');
        processedMessage = processedMessage.replace(/@{firstName}/g, contact.firstName || '');
        processedMessage = processedMessage.replace(/@{lastName}/g, contact.lastName || '');
        processedMessage = processedMessage.replace(/@{email}/g, contact.email || '');
        processedMessage = processedMessage.replace(/@{phone}/g, contact.phone || '');
        processedMessage = processedMessage.replace(/@{vehicleNumber}/g, contact.vehicleNumber || '');
        processedMessage = processedMessage.replace(/@{branch}/g, contact.branch || '');
        processedMessage = processedMessage.replace(/@{expiryDate}/g, contact.expiryDate || '');  
        // Add more placeholders as needed
        return { chatId: contact.phone?.replace(/\D/g, '') + "@s.whatsapp.net", message: processedMessage };
      });

      const scheduledMessageData = {
        chatIds: chatIds,
        message: blastMessage,
        messages: processedMessages,
        batchQuantity: batchQuantity,
        companyId: companyId,
        createdAt: Timestamp.now(),
        documentUrl: documentUrl || "",
        fileName: selectedDocument ? selectedDocument.name : null,
        image: selectedImage ? await uploadImage(selectedImage) : null,
        mediaUrl: mediaUrl || "",
        mimeType: selectedMedia ? selectedMedia.type : (selectedDocument ? selectedDocument.type : null),
        repeatInterval: repeatInterval,
        repeatUnit: repeatUnit,
        scheduledTime: Timestamp.fromDate(scheduledTime),
        status: "scheduled",
        v2: true, // Adjust as needed
        whapiToken: null, // Adjust as needed
        phoneIndex: userData.phoneIndex,
        minDelay,
        maxDelay,
        activateSleep,
        sleepAfterMessages: activateSleep ? sleepAfterMessages : null,
        sleepDuration: activateSleep ? sleepDuration : null,
      };

      console.log('Sending scheduledMessageData:', JSON.stringify(scheduledMessageData, null, 2));

      // Make API call to schedule the message
      const response = await axios.post(`${baseUrl}/api/schedule-message/${companyId}`, scheduledMessageData);

      console.log(`Scheduled message added. Document ID: ${response.data.id}`);
      toast.success(`Blast message scheduled successfully.`);
      toast.info(`Message will be sent at: ${scheduledTime.toLocaleString()} (local time)`);

      // Close the modal and reset state
      setBlastMessageModal(false);
      setBlastMessage("");
      setBlastStartTime(null);
      setBatchQuantity(10);
      setRepeatInterval(0);
      setRepeatUnit('days');
      setSelectedMedia(null);
      setSelectedDocument(null);
    } catch (error) {
      console.error('Error scheduling blast message:', error);
      toast.error("An error occurred while scheduling the blast message. Please try again.");
    } finally {
      setIsScheduling(false);
    }
  };

  const handleReminderClick = () => {
    setIsReminderModalOpen(true);
  };
  const authorColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', 
    '#F06292', '#AED581', '#7986CB', '#4DB6AC', '#9575CD'
  ];
  function getAuthorColor(author: string) {
    const index = author.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % authorColors.length;
    return authorColors[index];
  }
  const handleSetReminder = async  (text: string)=> {
    if (!reminderDate) {
      toast.error('Please select a date and time for the reminder');
      return;
    }

    if (!selectedContact) {
      toast.error('No contact selected for the reminder');
      return;
    }

    const now = new Date();
    if (reminderDate <= now) {
      toast.error("Please select a future time for the reminder.");
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error("User not authenticated");
        return;
      }

      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        toast.error("User document not found");
        return;
      }

      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
      
      const companyRef = doc(firestore, 'companies', companyId);
      const companySnapshot = await getDoc(companyRef);
      if (!companySnapshot.exists()) {
        toast.error("Company document not found");
        return;
      }

      const companyData = companySnapshot.data();
      const baseUrl = companyData.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';
      const isV2 = companyData.v2 || false;
      const whapiToken = companyData.whapiToken || '';
      const phone = userData.phoneNumber.split('+')[1];
      const chatId = phone + "@s.whatsapp.net"; // The specific number you want to send the reminder to
      
      console.log(chatId)
      const reminderMessage = `*Reminder for contact:* ${selectedContact.contactName || selectedContact.firstName || selectedContact.phone}\n\n${text}`;

      const scheduledMessageData = {
        batchQuantity: 1,
        chatIds: [chatId],
        companyId: companyId,
        createdAt: Timestamp.now(),
        documentUrl: "",
        fileName: null,
        mediaUrl: "",
        message: reminderMessage,
        mimeType: null,
        repeatInterval: 0,
        repeatUnit: 'days',
        scheduledTime: Timestamp.fromDate(reminderDate),
        status: "scheduled",
        v2: isV2,
        whapiToken: isV2 ? null : whapiToken,
      };
  
      console.log('Sending scheduledMessageData:', JSON.stringify(scheduledMessageData, null, 2));
  
      // Make API call to schedule the message
      const response = await axios.post(`${baseUrl}/api/schedule-message/${companyId}`, scheduledMessageData);

      console.log(`Reminder scheduled. Document ID: ${response.data.id}`);

      toast.success('Reminder set successfully');
      setIsReminderModalOpen(false);
      setReminderText('');
      setReminderDate(null);

    } catch (error) {
      console.error('Error setting reminder:', error);
      toast.error("An error occurred while setting the reminder. Please try again.");
    }
  };
  
  const handleGenerateAIResponse = async () => {
    if (messages.length === 0) return;
  
    try {
      setIsGeneratingResponse(true);
  console.log(messages);
      // Prepare the context from recent messages
        // Prepare the context from all messages in reverse order
 // Prepare the context from the last 20 messages in reverse order
 const context = messages.slice(0, 10).reverse().map(msg => 
  `${msg.from_me ? "Me" : "User"}: ${msg.text?.body || ""}`
).join("\n");
console.log(context);

const prompt = `
Your goal is to act like you are Me, and generate a response to the last message in the conversation, if the last message is from "Me", continue or add to that message appropriately, maintaining the same language and style. Note that "Me" indicates messages I sent, and "User" indicates messages from the person I'm talking to.

Based on this conversation:
${context}

:`;

console.log(prompt);
  
      // Use the sendMessageToAssistant function
      const aiResponse = await sendMessageToAssistant(prompt);
  
      // Set the AI's response as the new message
      setNewMessage(aiResponse);
  
    } catch (error) {
      console.error('Error generating AI response:', error);
      toast.error("Failed to generate AI response");
    } finally {
      setIsGeneratingResponse(false);
    }
  };
  const visiblePhoneTags = useMemo(() => {
    if (userData?.role === '1') {
      // Admin users can see all phone tags
      return Object.entries(phoneNames).slice(0, phoneCount).map(([_, name]) => name);
    } else if (userData?.phone && userData.phone !== '0') {
      // Regular users can only see their associated phone tag
      const phoneIndex = Object.keys(phoneNames).findIndex(index => phoneNames[Number(index)] === userData.phone);
      if (phoneIndex !== -1 && phoneIndex < phoneCount) {
        return [phoneNames[phoneIndex]];
      }
    }
    return [];
  }, [userData, phoneNames, phoneCount]);

  const sendMessageToAssistant = async (messageText: string) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error("User not authenticated");
        toast.error("User not authenticated");
        return;
      }
  
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error("User document not found");
        toast.error("User document not found");
        return;
      }
  
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
  
      const companyRef = doc(firestore, 'companies', companyId);
      const companySnapshot = await getDoc(companyRef);
      if (!companySnapshot.exists()) {
        console.error("Company document not found");
        toast.error("Company document not found");
        return;
      }
  
      const companyData = companySnapshot.data();
      const baseUrl = companyData.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';
      const assistantId = companyData.assistantId;
  
      const res = await axios.get(`${baseUrl}/api/assistant-test/`, {
        params: {
          message: messageText,
          email: user.email!,
          assistantid: assistantId
        },
      });
  
      return res.data.answer;
    } catch (error) {
      console.error('Error:', error);
      toast.error("Failed to send message to assistant");
      throw error;
    }
  };

  const NotificationPopup: React.FC<{ notifications: any[] }> = ({ notifications: initialNotifications }) => {
    const [notifications, setNotifications] = useState(initialNotifications);
    const navigate = useNavigate(); // Initialize useNavigate
    const handleDelete = (index: number) => {
      setNotifications(notifications.filter((_, i) => i !== index));
    };
    const handleNotificationClick = (chatId: string,index: number) => {
      setNotifications(notifications.filter((_, i) => i !== index));
      navigate(`/chat/?chatId=${chatId}`);
    };
    
    return (
      <div>
        {notifications.slice(-1).map((notification, index) => (
          <div key={index}>
          </div>
        ))}
      </div>
    );
  };
  
  const updateEmployeeAssignedContacts = async () => {
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
  
      // Get all contacts
      const contactsRef = collection(firestore, `companies/${companyId}/contacts`);
      const contactsSnapshot = await getDocs(contactsRef);
  
      // Object to store employee assignment counts
      const employeeAssignments: { [key: string]: number } = {};
  
      const employeeRef = collection(firestore, `companies/${companyId}/employee`);
      const employeeSnapshot = await getDocs(employeeRef);
      const employeeList = employeeSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        name: doc.data().name, 
        quotaLeads: doc.data().quotaLeads || 0 
      }));
  
      // Count assignments
      contactsSnapshot.forEach((doc) => {
        const contact = doc.data();
        if (contact.tags) {
          contact.tags.forEach((tag: string) => {
            const employee = employeeList.find(emp => emp.name.toLowerCase() === tag.toLowerCase());
            if (employee) {
              employeeAssignments[employee.quotaLeads] = (employeeAssignments[employee.quotaLeads] || 0) + 1;
            }
          });
        }
      });
  
      console.log('Employee assignments before update:', employeeAssignments);
  
      // Update employee documents
      const employeeUpdates = Object.entries(employeeAssignments).map(async ([employeeId, count]) => {
        const employeeDocRef = doc(firestore, `companies/${companyId}/employee`, employeeId);
        const employeeDoc = await getDoc(employeeDocRef);
  
        if (employeeDoc.exists()) {
          const currentData = employeeDoc.data();
          const currentQuotaLeads = currentData.quotaLeads || 0;
          const currentAssignedContacts = currentData.assignedContacts || 0;
          
          // Calculate the difference in assigned contacts
          const assignedContactsDiff = count - currentAssignedContacts;
          
          // Calculate new quotaLeads
          const newQuotaLeads = Math.max(0, currentQuotaLeads - assignedContactsDiff);
          
          // Update assigned contacts and quotaLeads
          await updateDoc(employeeDocRef, {
            assignedContacts: count,
            quotaLeads: newQuotaLeads
          });
          console.log(`Updated ${currentData.name}: Assigned contacts from ${currentAssignedContacts} to ${count}, Quota leads from ${currentQuotaLeads} to ${newQuotaLeads}`);
        } else {
          console.error(`Employee document for ID ${employeeId} not found`);
        }
      });
  
      await Promise.all(employeeUpdates);
  
      console.log('Employee assigned contacts and quota leads updated successfully');
    } catch (error) {
      console.error('Error updating employee assigned contacts and quota leads:', error);
      toast.error('Failed to update employee assigned contacts and quota leads.');
    }
  };

  const insertPlaceholder = (field: string) => {
    const placeholder = `@{${field}}`;
    setBlastMessage(prevMessage => prevMessage + placeholder);
  };


  const [isEditing, setIsEditing] = useState(false);
  const [editedContact, setEditedContact] = useState<Contact | null>(null);

  const handleEditClick = () => {
    setIsEditing(true);
    setEditedContact({ ...selectedContact });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContact(null);
  };

  const handleSaveContact = async () => {
    if (!editedContact) return;

    try {
      const user = auth.currentUser;
      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
      const contactsCollectionRef = collection(firestore, `companies/${companyId}/contacts`);

      const updateData: { [key: string]: any } = {};
      const fieldsToUpdate = [
        'contactName', 'email', 'lastName', 'phone', 'address1', 'city', 
        'state', 'postalCode', 'website', 'dnd', 'dndSettings', 'tags', 
        'customFields', 'source', 'country', 'companyName', 'branch', 
        'expiryDate', 'vehicleNumber', 'points', 'IC', 'assistantId', 'threadid',
      ];

      fieldsToUpdate.forEach(field => {
        if (editedContact[field as keyof Contact] !== undefined) {
          updateData[field] = editedContact[field as keyof Contact];
        }
      });

      const contactDocRef = doc(contactsCollectionRef, editedContact.phone!);
      await updateDoc(contactDocRef, updateData);

      setSelectedContact({ ...selectedContact, ...updateData });
      setIsEditing(false);
      setEditedContact(null);
      toast.success("Contact updated successfully!");
    } catch (error) {
      console.error('Error saving contact:', error);
      toast.error("Failed to update contact.");
    }
  };

  useEffect(() => {
    const fetchTotalContacts = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const docUserRef = doc(firestore, 'user', user.email!);
        const docUserSnapshot = await getDoc(docUserRef);
        if (!docUserSnapshot.exists()) return;

        const userData = docUserSnapshot.data();
        const companyId = userData.companyId;

        const contactsRef = collection(firestore, `companies/${companyId}/contacts`);
        const snapshot = await getCountFromServer(contactsRef);
        setTotalContacts(snapshot.data().count);
      } catch (error) {
        console.error('Error fetching total contacts:', error);
      }
    };

    fetchTotalContacts();
  }, []);

  return (
    <div className="flex flex-col md:flex-row overflow-y-auto bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200" style={{ height: '100vh' }}>
      <audio ref={audioRef} src={noti} />
        <div className={`flex flex-col w-full md:min-w-[35%] md:max-w-[35%] bg-gray-100 dark:bg-gray-900 border-r border-gray-300 dark:border-gray-700 ${selectedChatId ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex items-center justify-between pl-4 pr-4 pt-6 pb-2 sticky top-0 z-10 bg-gray-100 dark:bg-gray-900">
          <div>
            <div className="text-start text-2xl font-semibold capitalize text-gray-800 dark:text-gray-200">
              {userData?.company}
            </div>
            <div className="text-start text-lg font-medium text-gray-600 dark:text-gray-400">
              Total Contacts: {totalContacts}
            </div>
          </div>
          {userData?.phone !== undefined && (
            <Menu as="div" className="relative inline-block text-left">
              <div>
                <Menu.Button className="flex items-center space-x-2 text-lg font-semibold opacity-75 bg-white dark:bg-gray-800 px-3 py-2 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-blue-500">
                  <Lucide icon="Phone" className="w-5 h-5 text-gray-800 dark:text-white" />
                  <span className="text-gray-800 font-medium dark:text-white">
                    {phoneNames[userData.phone] || 'No phone assigned'}
                  </span>
                  <Lucide icon="ChevronDown" className="w-4 h-4 text-gray-500" />
                </Menu.Button>
              </div>
           
                <Menu.Items className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5">
                  <div className="py-1 max-h-60 overflow-y-auto" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                    {Object.entries(phoneNames).map(([index, phoneName]) => (
                      <Menu.Item key={index}>
                        {({ active }) => (
                          <button
                            onClick={() => handlePhoneChange(parseInt(index))}
                            className={`${
                              active ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-200'
                            } block w-full text-left px-4 py-2 text-sm`}
                          >
                            {phoneName}
                          </button>
                        )}
                      </Menu.Item>
                    ))}
                  </div>
                </Menu.Items>
           
            </Menu>
          )}
  
        </div>
        {companyPlan === 'enterprise' && (
  <div className="px-4 py-2">
    <div className="flex items-center justify-between mb-1">
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
        Monthly Message Usage
      </span>
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
        {messageUsage}/500
      </span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
      <div 
        className={`h-2.5 rounded-full ${
          messageUsage > 450 ? 'bg-red-600' : 
          messageUsage > 350 ? 'bg-yellow-400' : 
          'bg-green-600'
        }`}
        style={{ width: `${Math.min((messageUsage / 500) * 100, 100)}%` }}
      ></div>
    </div>
  </div>
)}
        <div className="sticky top-20 bg-gray-100 dark:bg-gray-900 p-2">
          <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-900">
            {notifications.length > 0 && <NotificationPopup notifications={notifications} />}

            <Dialog
              open={isDeletePopupOpen}
              onClose={closeDeletePopup}
              className="fixed inset-0 z-100 overflow-y-auto"
            >
              <div className="flex items-center justify-center min-h-screen">
                <div className="fixed inset-0 bg-black opacity-30" />
                <div className="bg-white dark:bg-gray-800 rounded-lg text-left shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full">
                  <Dialog.Title
                    as="h3"
                    className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-200 px-4 pt-5"
                  >
                    Delete Messages
                  </Dialog.Title>
                  <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Are you sure you want to delete {selectedMessages.length} message(s)? This action cannot be undone.
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg">
                    <Button
                      type="button"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                      onClick={deleteMessages}
                    >
                      Delete
                    </Button>
                    <Button
                      type="button"
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:w-auto sm:text-sm"
                      onClick={closeDeletePopup}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </Dialog>
            <Dialog open={blastMessageModal} onClose={() => setBlastMessageModal(false)}>
            <div className="fixed inset-0 flex items-center justify-center p-4 bg-black bg-opacity-50">
              <Dialog.Panel className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-md mt-40 text-gray-900 dark:text-white">
                <div className="mb-4 text-lg font-semibold">Schedule Blast Message</div>
                  <textarea
                    className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Type your message here..."
                    value={blastMessage}
                    onChange={(e) => setBlastMessage(e.target.value)}
                    rows={3}
                    style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                  ></textarea>
                   <div className="mt-2">
                    <button
                      type="button"
                      className="text-sm text-blue-500 hover:text-blue-400"
                      onClick={() => setShowPlaceholders(!showPlaceholders)}
                    >
                      {showPlaceholders ? 'Hide Placeholders' : 'Show Placeholders'}
                    </button>
                    {showPlaceholders && (
                      <div className="mt-2 space-y-1">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Click to insert:</p>
                        {['contactName', 'firstName', 'lastName', 'email', 'phone', 'vehicleNumber', 'branch', 'expiryDate'].map(field => (
                          <button
                            key={field}
                            type="button"
                            className="mr-2 mb-2 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                            onClick={() => insertPlaceholder(field)}
                          >
                            @{'{'}${field}{'}'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Attach Media (Image or Video)</label>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={(e) => handleMediaUpload(e)}
                      className="block w-full mt-1 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Attach Document</label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                      onChange={(e) => handleDocumentUpload(e)}
                      className="block w-full mt-1 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date & Time</label>
                    <div className="flex space-x-2">
                      <DatePickerComponent
                        selected={blastStartDate}
                        onChange={(date: Date) => setBlastStartDate(date)}
                        dateFormat="MMMM d, yyyy"
                        className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <DatePickerComponent
                        selected={blastStartTime}
                        onChange={(date: Date) => setBlastStartTime(date)}
                        showTimeSelect
                        showTimeSelectOnly
                        timeIntervals={15}
                        timeCaption="Time"
                        dateFormat="h:mm aa"
                        className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Batch Quantity</label>
                    <input
                      type="number"
                      value={batchQuantity}
                      onChange={(e) => setBatchQuantity(parseInt(e.target.value))}
                      min={1}
                      className="block w-full mt-1 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Repeat Every</label>
                    <div className="flex items-center">
                      <input
                        type="number"
                        value={repeatInterval}
                        onChange={(e) => setRepeatInterval(parseInt(e.target.value))}
                        min={0}
                        className="w-20 mr-2 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <select
                        value={repeatUnit}
                        onChange={(e) => setRepeatUnit(e.target.value as 'minutes' | 'hours' | 'days')}
                        className="border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Delay between messages</label>
        <div className="flex items-center space-x-2 mt-1">
          <div className="flex items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">Wait between:</span>
            <input
              type="number"
              value={minDelay}
              onChange={(e) => setMinDelay(parseInt(e.target.value))}
              min={1}
              className="w-20 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400 mx-2">and</span>
            <input
              type="number"
              value={maxDelay}
              onChange={(e) => setMaxDelay(parseInt(e.target.value))}
              min={1}
              className="w-20 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">Seconds</span>
          </div>
        </div>

        <div className="mt-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={activateSleep}
              onChange={(e) => setActivateSleep(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            />
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Activate Sleep between sending</span>
          </label>
          {activateSleep && (
            <div className="flex items-center space-x-2 mt-2 ml-6">
              <span className="text-sm text-gray-600 dark:text-gray-400">After:</span>
              <input
                type="number"
                value={sleepAfterMessages}
                onChange={(e) => setSleepAfterMessages(parseInt(e.target.value))}
                min={1}
                className="w-20 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">Messages</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">for:</span>
              <input
                type="number"
                value={sleepDuration}
                onChange={(e) => setSleepDuration(parseInt(e.target.value))}
                min={1}
                className="w-20 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">Seconds</span>
            </div>
          )}
        </div>
      </div>
                  <div className="flex justify-end mt-4">
                    <button
                      className="px-4 py-2 mr-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                      onClick={() => setBlastMessageModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={sendBlastMessage}
                      disabled={isScheduling}
                    >
                      {isScheduling ? "Scheduling..." : "Send Blast Message"}
                    </button>
                  </div>
                </Dialog.Panel>
              </div>
            </Dialog>
            <PDFModal isOpen={isPDFModalOpen} onClose={closePDFModal} pdfUrl={pdfUrl} />
            <Dialog
  open={editingMessage !== null}
  onClose={cancelEditMessage}
  className="fixed inset-0 z-100 overflow-y-auto"
>
  <div className="flex items-center justify-center min-h-screen">
    <div className="fixed inset-0 bg-black opacity-30" />
    <div className="bg-white dark:bg-gray-800 rounded-lg text-left shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full">
      <Dialog.Title
        as="h3"
        className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-200 px-4 pt-5"
      >
        Edit message
      </Dialog.Title>
      <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
        <textarea
          className="w-full h-24 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-info text-md resize-none overflow-hidden bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
          placeholder="Edit your message"
          value={editedMessageText}
          onChange={(e) => setEditedMessageText(e.target.value)}
          style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
        />
      </div>
      <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
        <Button
          type="button"
          className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-500 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
          onClick={handleEditMessage}
        >
          Save
        </Button>
        <Button
          type="button"
          className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:w-auto sm:text-sm"
          onClick={cancelEditMessage}
        >
          Cancel
        </Button>
      </div>
    </div>
  </div>
</Dialog>



<Dialog
  open={isForwardDialogOpen}
  onClose={() => handleCloseForwardDialog()}
  className="fixed inset-0 z-50 overflow-y-auto"
>
  <div className="flex items-center justify-center min-h-screen">
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75" />
    <div className="bg-white dark:bg-gray-800 rounded-lg text-left shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full relative z-10">
      <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
        <div className="sm:flex sm:items-start">
          <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
            <Dialog.Title as="h3" className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-200 mb-4">
              Forward message to
            </Dialog.Title>
            <div className="relative mb-4">
              <input
                type="text"
                className="w-full py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                placeholder="Search..."
                value={searchQuery2}
                onChange={handleSearchChange2}
              />
              <Lucide
                icon="Search"
                className="absolute top-2 right-3 w-5 h-5 text-gray-500 dark:text-gray-400"
              />
            </div>
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by tags:</h4>
              <div className="flex flex-wrap gap-2">
                {visibleForwardTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => filterForwardDialogContacts(tag.name)}
                    className={`px-3 py-1 rounded-full text-sm flex-shrink-0 ${
                      forwardDialogTags.includes(tag.name)
                        ? 'bg-primary text-white dark:bg-primary dark:text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                    } transition-colors duration-200`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
              {tagList.length > 5 && (
                <button
                  onClick={toggleForwardTagsVisibility}
                  className="mt-2 text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {showAllForwardTags ? 'Show Less' : 'Show More'}
                </button>
              )}
            </div>
            <div className="max-h-60 overflow-y-auto">
              {getFilteredForwardingContacts().map((contact, index) => (
                <div
                  key={contact.id || `${contact.phone}-${index}`}
                  className="flex items-center p-2 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <input
                    type="checkbox"
                    className="mr-3"
                    checked={selectedContactsForForwarding.includes(contact)}
                    onChange={() => handleSelectContactForForwarding(contact)}
                  />
                  <div className="flex items-center">
                    <div className="w-8 h-8 flex items-center justify-center bg-gray-300 dark:bg-gray-600 rounded-full mr-3 text-white">
                      {contact.contactName ? contact.contactName.charAt(0).toUpperCase() : "?"}
                    </div>
                    <div className="flex-grow">
                      <div className="font-semibold capitalize">{contact.contactName || contact.firstName || contact.phone}</div>
                      {contact.tags && contact.tags.length > 0 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Tags: {contact.tags.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
        <Button
          type="button"
          className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
          onClick={handleForwardMessage}
        >
          Forward
        </Button>
        <Button
          type="button"
          className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white dark:bg-gray-600 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
          onClick={() => handleCloseForwardDialog()}
        >
          Cancel
        </Button>
      </div>
    </div>
  </div>
</Dialog>

    <div className="flex justify-end space-x-2 w-full mr-2">
      
    {(
      // Replace or update the existing search input section
      <div className="relative flex-grow">
        <input
          type="text"
          className="flex-grow box w-full h-9 py-1 pl-10 pr-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-800"
          placeholder="Search messages..."
          value={searchQuery}
          onChange={handleSearchChange}
        />
        <Lucide
          icon="Search"
          className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400"
        />
        
        {/* Global Search Results Dropdown */}
        {isGlobalSearchActive && searchQuery && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg max-h-96 overflow-y-auto">
            {globalSearchLoading ? (
              <div className="w-full p-4 text-center text-gray-500">
                Searching...
              </div>
            ) : globalSearchResults.length > 0 ? (
              <>
                {globalSearchResults.map((result) => (
                  <div
                    key={result.id}
                    className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={async () => {
                      // Find and select the contact
                      const contact = contacts.find(c => c.id === result.contactId);
                      if (contact) {
                        await selectChat(contact.chat_id!, contact.id!, contact);
                        setIsGlobalSearchActive(false);
                        setSearchQuery('');
                      }
                      // Scroll to the message that was clicked on in the chat
                      scrollToMessage(result.id);
                    }}
                  >
                    <div className="flex-grow w-full justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">
                          {contacts.find(c => c.id === result.contactId)?.contactName || result.contactId}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          {result.text?.body ? (
                            <span dangerouslySetInnerHTML={{ __html: result.text.body.replace(new RegExp(`(${searchQuery})`, 'gi'), '<mark>$1</mark>') }} />
                          ) : (
                            result.caption || 'Media message'
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Pagination */}
                {totalGlobalSearchPages > 1 && (
                  <div className="pagination">
                    {Array.from({ length: totalGlobalSearchPages }, (_, i) => i + 1).map(pageNum => (
                      <button
                        key={pageNum}
                        onClick={() => loadMoreSearchResults(pageNum)}
                        disabled={pageNum === globalSearchPage}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="p-4 text-center text-gray-500">
                No messages found
              </div>
            )}
          </div>
        )}
      </div>
    )}
    {isAssistantAvailable && (
      <button 
        className={`flex items-center justify-start p-2 !box ${
          companyStopBot ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
        } ${userRole === "3" ? 'opacity-50 cursor-not-allowed' : ''}`} 
        onClick={toggleBot}
        disabled={userRole === "3"}
      >
        <Lucide 
          icon={companyStopBot ? 'PowerOff' : 'Power'} 
          className={`w-5 h-5 ${
            companyStopBot ? 'text-red-500' : 'text-green-500'
          }`}
        />                
      </button>
    )}
    <Menu as="div" className="relative inline-block text-left">
      <div className="flex items-right space-x-3">
        <Menu.Button as={Button} className="p-2 !box m-0" onClick={handleTagClick}>
          <span className="flex items-center justify-center w-5 h-5">
            <Lucide icon="Users" className="w-5 h-5 text-gray-800 dark:text-gray-200" />
          </span>
        </Menu.Button>
      </div>
      <Menu.Items className="absolute right-0 mt-2 w-60 shadow-lg rounded-md p-2 z-10 max-h-60 overflow-y-auto">
        {employeeList.sort((a, b) => a.name.localeCompare(b.name)).map((employee) => (
          <Menu.Item key={employee.id}>
            {({ active }) => (
              <button
                className={`flex items-center w-full text-left p-2 rounded-md ${
                  activeTags.includes(employee.name)
                    ? 'bg-primary text-white dark:bg-primary dark:text-white'
                    : active
                    ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
                    : 'text-gray-700 dark:text-gray-200'
                }`}
                onClick={() => filterTagContact(employee.name)}
              >
                <span>{employee.name}</span>
              </button>
            )}
          </Menu.Item>
        ))}
      </Menu.Items>
    </Menu>
    <button
      className="p-2 !box m-0 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
      onClick={toggleTagsExpansion}
    >
      <span className="flex items-center justify-center w-5 h-5">
        <Lucide 
          icon={isTagsExpanded ? "ChevronUp" : "ChevronDown"} 
          className="w-5 h-5 text-gray-800 dark:text-gray-200" 
        />
      </span>
    </button>
          </div>
          </div>
  <div className="border-b border-gray-300 dark:border-gray-700 mt-4"></div>

</div>
<div className="mt-4 mb-2 px-4 max-h-40 overflow-y-auto">
<div className="flex flex-wrap gap-2">
  {['Mine', 'All', 'Unassigned',
    ...(isTagsExpanded ? [
      'Group', 'Unread', 'Snooze', 'Stop Bot', 'Active Bot', 'Resolved', // Added 'Active Bot'
      ...(userData?.phone !== undefined && userData.phone !== -1 ? 
        [phoneNames[userData.phone] || `Phone ${userData.phone + 1}`] : 
        Object.values(phoneNames)
      ),
      ...visibleTags.filter(tag => 
        !['All', 'Unread', 'Mine', 'Unassigned', 'Snooze', 'Group', 'stop bot', 'Active Bot'].includes(tag.name) && // Added 'Active Bot'
        !visiblePhoneTags.includes(tag.name)
      )
    ] : [])
  ].map((tag) => {
    const tagName = typeof tag === 'string' ? tag : tag.name || String(tag);
    const tagLower = tagName.toLowerCase();
    let newfilter = contacts;
    if(userData?.phone !== undefined && userData.phone !== -1){
      const userPhoneIndex = parseInt(userData.phone, 10);
      newfilter = contacts.filter(contact => contact.phoneIndex === userPhoneIndex)
    }
    const unreadCount = newfilter.filter(contact => {
      const contactTags = contact.tags?.map(t => t.toLowerCase()) || [];
      const isGroup = contact.chat_id?.endsWith('@g.us');
      const phoneIndex = Object.entries(phoneNames).findIndex(([_, name]) => name.toLowerCase() === tagLower);
      
      return (
        (tagLower === 'all' ? !isGroup :
        tagLower === 'unread' ? contact.unreadCount && contact.unreadCount > 0 :
        tagLower === 'mine' ? contactTags.includes(currentUserName.toLowerCase()) :
        tagLower === 'unassigned' ? !contactTags.some(t => employeeList.some(e => e.name.toLowerCase() === t)) :
        tagLower === 'snooze' ? contactTags.includes('snooze') :
        tagLower === 'resolved' ? contactTags.includes('resolved') :
        tagLower === 'group' ? isGroup :
        tagLower === 'stop bot' ? contactTags.includes('stop bot') :
        tagLower === 'active bot' ? !contactTags.includes('stop bot') : // Added Active Bot condition
        phoneIndex !== -1 ? contact.phoneIndex === phoneIndex :
        contactTags.includes(tagLower)) &&
        (tagLower !== 'all' && tagLower !== 'unassigned' ? contact.unreadCount && contact.unreadCount > 0 : true)
      );
    }).length;

    return (
      <button
        key={typeof tag === 'string' ? tag : tag.id}
        onClick={() => filterTagContact(tagName)}
        className={`px-3 py-1 rounded-full text-sm flex items-center ${
          (tagLower === activeTags[0])
            ? 'bg-primary text-white dark:bg-primary dark:text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
        } transition-colors duration-200`}
      >
        <span>{tagName}</span>
        {userData?.role === '1' && unreadCount > 0 && (
          <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
            tagName.toLowerCase() === 'stop bot' ? 'bg-red-700' :
            tagName.toLowerCase() === 'active bot' ? 'bg-green-700' : 'bg-primary'
          } text-white`}>
            {unreadCount}
          </span>
        )}
      </button>
    );
  })}
</div>
</div>
  <span
    className="flex items-center justify-center p-2 cursor-pointer text-primary dark:text-blue-400 hover:underline transition-colors duration-200"
    onClick={toggleTagsExpansion}
  >
    {isTagsExpanded ? "Show Less" : "Show More"}
  </span>
  <div className="bg-gray-100 dark:bg-gray-900 flex-1 overflow-y-scroll h-full" ref={contactListRef}>
  {paginatedContacts.length === 0 ? ( // Check if paginatedContacts is empty
    <div className="flex items-center justify-center h-full">
      {paginatedContacts.length === 0 && (
        <div className="flex flex-col items-center">
          <div>
            <Lucide icon="MessageCircle" className="h-10 w-10 text-gray-500 dark:text-gray-400 mb-2" />
          </div>
          <div className="text-gray-500 text-2xl dark:text-gray-400 mt-2">No contacts found</div>
        </div>
      )}
    </div>
  ) : ((paginatedContacts).map((contact, index) => (
    <React.Fragment key={`${contact.id}-${index}` || `${contact.phone}-${index}`}>
    <div
      className={`m-2 pr-3 pb-2 pt-2 rounded-lg cursor-pointer flex items-center space-x-3 group ${
        contact.chat_id !== undefined
          ? selectedChatId === contact.chat_id
            ? 'bg-slate-300 text-white dark:bg-gray-800 dark:text-gray-200'
            : 'hover:bg-gray-300 dark:hover:bg-gray-700'
          : selectedChatId === contact.phone
          ? 'bg-slate-300 text-white dark:bg-gray-800 dark:text-gray-200'
          : 'hover:bg-gray-300 dark:hover:bg-gray-700'
      }`}
      onClick={() => selectChat(contact.chat_id!, contact.id!)}
      onContextMenu={(e) => handleContextMenu(e, contact)}
    >
    <div
      key={contact.id}
      className="hidden cursor-pointer"
      onClick={() => selectChat(contact.chat_id!, contact.id!)}
    >
    </div>
    <div className="relative w-14 h-14">
    <div className="flex items-center space-x-3">
      <div className="w-14 h-14 bg-gray-400 dark:bg-gray-600 rounded-full flex items-center justify-center text-white text-xl overflow-hidden">
        {contact && (
          contact.chat_id && contact.chat_id.includes('@g.us') ? (
            contact.profilePicUrl ? (
              <img 
                src={contact.profilePicUrl} 
                alt={contact.contactName || "Group"} 
                className="w-full h-full object-cover"
              />
            ) : (
              <Lucide icon="Users" className="w-8 h-8 text-white dark:text-gray-200" />
            )
          ) : contact.profilePicUrl ? (
            <img 
              src={contact.profilePicUrl} 
              alt={contact.contactName || "Profile"} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-400 dark:bg-gray-600 text-white">
              {<Lucide icon="User" className="w-10 h-10" />}
            </div>
          )
        )}
      </div>
      {(contact.unreadCount ?? 0) > 0 && (
        <span className="absolute -top-1 -right-1 bg-primary text-white dark:bg-blue-600 dark:text-gray-200 text-xs rounded-full px-2 py-1 min-w-[20px] h-[20px] flex items-center justify-center">
          {contact.unreadCount}
        </span>
      )}
    </div>
  </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <span className="font-semibold capitalize truncate w-25 text-gray-800 dark:text-gray-200">
              {((contact.contactName ?? contact.firstName ?? contact.phone ?? "").slice(0, 20))}
              {((contact.contactName ?? contact.firstName ?? contact.phone ?? "").length > 20 ? '...' : '')}
            </span>
            {!contact.chat_id?.includes('@g.us') && (userData?.role === '1' || userData?.role === '2') && (
              <span className="text-xs text-gray-600 dark:text-gray-400 truncate" style={{ 
                visibility: (contact.contactName === contact.phone || contact.firstName === contact.phone) ? 'hidden' : 'visible',
                display: (contact.contactName === contact.phone || contact.firstName === contact.phone) ? 'flex' : 'block',
                alignItems: 'center'
              }}>
                {contact.phone}
              </span>
            )}
          </div>
          <span className="text-xs flex items-center space-x-2 text-gray-600 dark:text-gray-400">
            <div className="flex flex-grow items-center">
              {(() => {
                const employeeTags = contact.tags?.filter(tag =>
                  employeeList.some(employee => employee.name.toLowerCase() === tag.toLowerCase())
                ) || [];
              
                const otherTags = contact.tags?.filter(tag =>
                  !employeeList.some(employee => employee.name.toLowerCase() === tag.toLowerCase())
                ) || [];
              
                // Create a unique set of all tags
                const uniqueTags = Array.from(new Set([...otherTags]));
              
                return (
                  <>
                  <button
                    className={`text-md ${
                      contact.pinned ? 'text-blue-500 dark:text-blue-400 font-bold' : 'text-gray-500 group-hover:text-blue-500 dark:text-gray-400 dark:group-hover:text-blue-400 group-hover:font-bold dark:group-hover:font-bold mr-1'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePinConversation(contact.chat_id!);
                    }}
                  >
                  {contact.pinned ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 48 48" className="text-gray-800 dark:text-blue-400 fill-current mr-1">
                      <mask id="ipSPin0">
                        <path fill="#fff" stroke="#fff" strokeLinejoin="round" strokeWidth="4" d="M10.696 17.504c2.639-2.638 5.774-2.565 9.182-.696L32.62 9.745l-.721-4.958L43.213 16.1l-4.947-.71l-7.074 12.73c1.783 3.638 1.942 6.544-.697 9.182l-7.778-7.778L6.443 41.556l11.995-16.31l-7.742-7.742Z"/>
                      </mask>
                      <path fill="currentColor" d="M0 0h48v48H0z" mask="url(#ipSPin0)"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 48 48" className="group-hover:block hidden">
                      <path fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="4" d="M10.696 17.504c2.639-2.638 5.774-2.565 9.182-.696L32.62 9.745l-.721-4.958L43.213 16.1l-4.947-.71l-7.074 12.73c1.783 3.638 1.942 6.544-.697 9.182l-7.778-7.778L6.443 41.556l11.995-16.31l-7.742-7.742Z"/>
                    </svg>
                  )}
                  </button>
                    {uniqueTags.filter(tag => tag.toLowerCase() !== 'stop bot').length > 0 && (
                      <Tippy
                        content={uniqueTags.filter(tag => tag.toLowerCase() !== 'stop bot').map(tag => tag.charAt(0).toUpperCase() + tag.slice(1)).join(', ')}
                        options={{ 
                          interactive: true,
                          appendTo: () => document.body
                        }}
                      >
                        <span className="bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200 text-xs font-semibold mr-1 px-2.5 py-0.5 rounded-full cursor-pointer">
                          <Lucide icon="Tag" className="w-4 h-4 inline-block" />
                          <span className="ml-1">{uniqueTags.filter(tag => tag.toLowerCase() !== 'stop bot').length}</span>
                        </span>
                      </Tippy>
                    )}
                    {employeeTags.length > 0 && (
                      <Tippy
                          content={employeeTags.map(tag => {
                            const employee = employeeList.find(e => e.name.toLowerCase() === tag.toLowerCase());
                            return employee ? employee.name : tag;
                          }).join(', ')}
                        options={{ 
                          interactive: true,  
                          appendTo: () => document.body
                        }}
                      >
                        <span className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200 text-xs font-semibold mr-1 px-2.5 py-0.5 rounded-full cursor-pointer">
                          <Lucide icon="Users" className="w-4 h-4 inline-block" />
                          <span className="ml-1 text-xxs capitalize">
                            {employeeTags.length === 1 
                              ? (employeeList.find(e => e.name.toLowerCase() === employeeTags[0].toLowerCase())?.employeeId || 
                                 (employeeTags[0].length > 8 ? employeeTags[0].slice(0, 6) : employeeTags[0]))
                              : employeeTags.length}
                          </span>
                        </span>
                      </Tippy>
                    )}
                  </>
                );
              })()}
            </div>

            <div className="flex items-center align-top space-x-1">
              <span className={`${
                contact.unreadCount && contact.unreadCount > 0 
                  ? 'text-blue-500 font-medium' 
                  : ''
              }`}>
                {contact.last_message?.createdAt || contact.last_message?.timestamp
                  ? formatDate(contact.last_message.createdAt || (contact.last_message.timestamp && contact.last_message.timestamp * 1000))
                  : 'No Messages'}
              </span>
            </div>
          </span>
    </div>
        <div className="flex justify-between items-center">
          <span className="text-sm truncate text-gray-600 dark:text-gray-400" style={{ width: '200px' }}>
            {contact.last_message ? (
              <>
                {contact.last_message.from_me && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="inline-block items-center justify-start w-5 h-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {contact.last_message.type === "text" ? (
                  contact.last_message.text?.body
                ) : contact.last_message.type === "image" ? (
                  "Photo"
                ) : contact.last_message.type === "document" ? (
                  "Document"
                ) : contact.last_message.type === "audio" ? (
                  "Audio"
                ) : contact.last_message.type === "video" ? (
                  "Video"
                ) : (
                  contact.last_message.from_me ? "You: Message" : "Bot: Message"
                )}
              </>
            ) : (
              "No Messages"
            )}
          </span>
          {isAssistantAvailable && (
            <div onClick={(e) => toggleStopBotLabel(contact, index, e)}
              className="cursor-pointer">
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={contact.tags?.includes("stop bot")}
                    readOnly
                  />
                <div className={`mt-1 ml-0 relative w-11 h-6 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer ${
                  contact.tags?.includes("stop bot") 
                    ? 'bg-red-500 dark:bg-red-700' 
                    : 'bg-green-500 dark:bg-green-700'
                } peer-checked:after:-translate-x-full rtl:peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:end-[2px] after:bg-white after:border-gray-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-400`}>
                </div>
              </label>
            </div>
          )}
        </div>
                  </div>
                </div>
    {index < filteredContacts.length - 1 && <hr className="my-2 border-gray-300 dark:border-gray-700" />}
  </React.Fragment>
))
)}
</div>
              <ReactPaginate
                breakLabel="..."
                nextLabel="Next"
                onPageChange={handlePageChange}
                pageRangeDisplayed={2}
                pageCount={Math.ceil(filteredContacts.length / contactsPerPage)}
                previousLabel="Previous"
                renderOnZeroPageCount={null}
                containerClassName="flex justify-center items-center mt-4 mb-4"
                pageClassName="mx-1"
                pageLinkClassName="px-2 py-1 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm"
                previousClassName="mx-1"
                nextClassName="mx-1"
                previousLinkClassName="px-2 py-1 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm"
                nextLinkClassName="px-2 py-1 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm"
                disabledClassName="opacity-50 cursor-not-allowed"
                activeClassName="font-bold"
                activeLinkClassName="bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700"
                forcePage={currentPage}
              />
        </div>
      <div className="flex flex-col w-full sm:w-3/4 bg-slate-300 dark:bg-gray-900 relative flext-1 overflow-hidden">
  {selectedChatId ? (
    <>
      <div className="flex items-center justify-between p-3 border-b border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-900">
        <div className="flex items-center">
        <button onClick={handleBack} className="back-button p-2 text-lg">
            <Lucide icon="ChevronLeft" className="w-6 h-6" />
          </button>
          <div className="w-10 h-10 overflow-hidden rounded-full shadow-lg bg-gray-700 flex items-center justify-center text-white mr-3 ml-2">
  {selectedContact?.profilePicUrl ? (
    <img 
      src={selectedContact.profilePicUrl} 
      alt={selectedContact.contactName || "Profile"} 
      className="w-10 h-10 rounded-full object-cover"
    />
  ) : (
    <span className="text-2xl font-bold">
      {selectedContact?.contactName ? selectedContact.contactName.charAt(0).toUpperCase() : "?"}
    </span>
  )}
</div>
          <div>
            <div className="font-semibold text-gray-800 dark:text-gray-200 capitalize">{selectedContact.contactName || selectedContact.firstName || selectedContact.phone}</div>
            {userRole === '1' && (
              <div className="text-sm text-gray-600 dark:text-gray-400">{selectedContact.phone}</div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex space-x-3">
          <button 
  className="p-2 m-0 !box" 
  onClick={() => {
    if (userRole !== "3") {
      setBlastMessageModal(true);
    } else {
      toast.error("You don't have permission to send blast messages.");
    }
  }}
  disabled={userRole === "3"}
>
  <span className="flex items-center justify-center w-5 h-5">
    <Lucide icon="Send" className="w-5 h-5 text-gray-800 dark:text-gray-200" />
  </span>
</button>
            {/* <button className="p-2 m-0 !box" onClick={handleReminderClick}>
              <span className="flex items-center justify-center w-5 h-5">
                <Lucide icon="BellRing" className="w-5 h-5 text-gray-800 dark:text-gray-200" />
              </span>
            </button> */}
            <Menu as="div" className="relative inline-block text-left">
              <Menu.Button as={Button} className="p-2 !box m-0">
                <span className="flex items-center justify-center w-5 h-5">
                  <Lucide icon="Users" className="w-5 h-5 text-gray-800 dark:text-gray-200" />
                </span>
              </Menu.Button>
              <Menu.Items className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 shadow-lg rounded-md p-2 z-10 max-h-60 overflow-y-auto">
                <div className="mb-2">
                  <input
                    type="text"
                    placeholder="Search employees..."
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  />
                </div>
                {employeeList
                  .filter(employee => {
                    if (userRole === '4') {
                      if (userData?.group) {
                        return employee.role === '2' && 
                              employee.group === userData.group && 
                              employee.name.toLowerCase().includes(employeeSearch.toLowerCase());
                      } else {
                        return employee.role === '2' && 
                              employee.name.toLowerCase().includes(employeeSearch.toLowerCase());
                      }
                    } else if (userRole === '1' || userRole === '5') {
                      return employee.name.toLowerCase().includes(employeeSearch.toLowerCase());
                    } else if (userRole === '2' || userRole === '3') {
                      return employee.role === userRole && 
                            employee.name.toLowerCase().includes(employeeSearch.toLowerCase());
                    }
                    return false;
                  })
                  .map((employee) => {
                    return (
                      <Menu.Item key={employee.id}>
                        <button
                          className="flex items-center justify-between w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                          onClick={() => handleAddTagToSelectedContacts(employee.name, selectedContact)}
                        >
                          <span className="text-gray-800 dark:text-gray-200 truncate flex-grow mr-2" style={{ maxWidth: '70%' }}>
                            {employee.name}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            Leads Quota: {employee.quotaLeads}
                          </span>
                        </button>
                      </Menu.Item>
                    );
                  })}
              </Menu.Items>
            </Menu>
            <Menu as="div" className="relative inline-block text-left">
              <Menu.Button as={Button} className="p-2 !box m-0">
                <span className="flex items-center justify-center w-5 h-5">
                  <Lucide icon="Tag" className="w-5 h-5 text-gray-800 dark:text-gray-200" />
                </span>
              </Menu.Button>
              <Menu.Items className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 shadow-lg rounded-md p-2 z-10 max-h-60 overflow-y-auto">
                {tagList.map((tag) => (
                  <Menu.Item key={tag.id}>
                    <button
                      className={`flex items-center w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md ${
                        activeTags.includes(tag.name) ? 'bg-gray-200 dark:bg-gray-700' : ''
                      }`}
                      onClick={() => handleAddTagToSelectedContacts(tag.name, selectedContact)}
                    >
                      <Lucide icon="User" className="w-4 h-4 mr-2 text-gray-800 dark:text-gray-200" />
                      <span className="text-gray-800 dark:text-gray-200">{tag.name}</span>
                    </button>
                  </Menu.Item>
                ))}
              </Menu.Items>
            </Menu>
            <button className="p-2 m-0 !box" onClick={handleEyeClick}>
              <span className="flex items-center justify-center w-5 h-5">
                <Lucide icon={isTabOpen ? "X" : "Eye"} className="w-5 h-5 text-gray-800 dark:text-gray-200" />
              </span>
            </button>
            <button className="p-2 m-0 !box" onClick={handleMessageSearchClick}>
              <span className="flex items-center justify-center w-5 h-5">
                <Lucide icon={isMessageSearchOpen ? "X" : "Search"} className="w-5 h-5 text-gray-800 dark:text-gray-200" />
              </span>
            </button>
          </div>
          <Menu as="div" className="sm:hidden relative inline-block text-left">
            <Menu.Button as={Button} className="p-2 !box m-0">
              <span className="flex items-center justify-center w-5 h-5">
                <Lucide icon="MoreVertical" className="w-5 h-5 text-gray-800 dark:text-gray-200" />
              </span>
            </Menu.Button>
            <Menu.Items className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 shadow-lg rounded-md p-2 z-10">
              {/* <Menu.Item>
                <button className="flex items-center w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md" onClick={handleReminderClick}>
                  <Lucide icon="BellRing" className="w-4 h-4 mr-2 text-gray-800 dark:text-gray-200" />
                  <span className="text-gray-800 dark:text-gray-200">Reminder</span>
                </button>
              </Menu.Item> */}
              <Menu.Item>
                <Menu as="div" className="relative inline-block text-left w-full">
                  <Menu.Button className="flex items-center w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                    <Lucide icon="Users" className="w-4 h-4 mr-2 text-gray-800 dark:text-gray-200" />
                    <span className="text-gray-800 dark:text-gray-200">Assign Employee</span>
                  </Menu.Button>
                  <Menu.Items className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 shadow-lg rounded-md p-2 z-10 overflow-y-auto max-h-96">
                    <div className="mb-2">
                      <input
                        type="text"
                        placeholder="Search employees..."
                        value={employeeSearch}
                        onChange={(e) => setEmployeeSearch(e.target.value)}
                        className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                      />
                    </div>
                    {employeeList
                      .filter(employee => {
                        if (userRole === '4' || userRole === '2') {
                          const shouldInclude = employee.role === '2' && employee.name.toLowerCase().includes(employeeSearch.toLowerCase());
                          return shouldInclude;
                        }
                        const shouldInclude = employee.name.toLowerCase().includes(employeeSearch.toLowerCase());
                        return shouldInclude;
                      })
                      .map((employee) => {
                        return (
                          <Menu.Item key={employee.id}>
                            <button
                              className="flex items-center w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                              onClick={() => handleAddTagToSelectedContacts(employee.name, selectedContact)}
                            >
                              <span className="text-gray-800 dark:text-gray-200">{employee.name}</span>
                            </button>
                          </Menu.Item>
                        );
                      })}
                  </Menu.Items>
                </Menu>
              </Menu.Item>
              <Menu.Item>
                <Menu as="div" className="relative inline-block text-left w-full">
                  <Menu.Button className="flex items-center w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                    <Lucide icon="Tag" className="w-4 h-4 mr-2 text-gray-800 dark:text-gray-200" />
                    <span className="text-gray-800 dark:text-gray-200">Add Tag</span>
                  </Menu.Button>
                  <Menu.Items className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 shadow-lg rounded-md p-2 z-10 max-h-60 overflow-y-auto">
                    {tagList.map((tag) => (
                      <Menu.Item key={tag.id}>
                        <button
                          className="flex items-center w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                          onClick={() => handleAddTagToSelectedContacts(tag.name, selectedContact)}
                        >
                          <span className="text-gray-800 dark:text-gray-200">{tag.name}</span>
                        </button>
                      </Menu.Item>
                    ))}
                  </Menu.Items>
                </Menu>
              </Menu.Item>
              <Menu.Item>
                <button className="flex items-center w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md" onClick={handleEyeClick}>
                  <Lucide icon={isTabOpen ? "X" : "Eye"} className="w-4 h-4 mr-2 text-gray-800 dark:text-gray-200" />
                  <span className="text-gray-800 dark:text-gray-200">{isTabOpen ? "Close" : "View"} Details</span>
                </button>
              </Menu.Item>
              <Menu.Item>
                <button className="flex items-center w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md" onClick={handleMessageSearchClick}>
                  <Lucide icon={isMessageSearchOpen ? "X" : "Search"} className="w-4 h-4 mr-2 text-gray-800 dark:text-gray-200" />
                  <span className="text-gray-800 dark:text-gray-200">{isMessageSearchOpen ? "Close" : "Open"} Search</span>
                </button>
              </Menu.Item>
            </Menu.Items>
          </Menu>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2" 
        style={{
          paddingBottom: "150px",
          backgroundColor: selectedContact ? 'transparent' : 'bg-slate-400 dark:bg-gray-800',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
        }}
        ref={messageListRef}>
        {isLoading2 && (
          <div className="fixed top-0 left-0 right-0 bottom-0 flex justify-center items-center bg-opacity-50">
            <div className="items-center absolute top-1/2 left-2/2 transform -translate-x-1/3 -translate-y-1/2 bg-white dark:bg-gray-800 p-4 rounded-md shadow-lg">
              <div role="status">
                <div className="flex flex-col items-center justify-end col-span-6 sm:col-span-3 xl:col-span-2">
                  <LoadingIcon icon="three-dots" className="w-20 h-20 p-4 text-gray-800 dark:text-gray-200" />
                  <div className="mt-2 text-xs text-center text-gray-800 dark:text-gray-200">Fetching Conversation...</div>
                </div>
              </div>
            </div>
          </div>
        )}
        {selectedChatId && (
          <>
            {messages
              .filter((message) => message.type !== 'action'&& 
              message.type !== 'e2e_notification' && 
              message.type !== 'notification_template'&&
              (userData?.company !== "Revotrend" || 
                (userData?.phone === undefined || 
                phoneCount === undefined || 
                phoneCount === 0 ||
                message.phoneIndex === undefined || 
                message.phoneIndex === null || 
                message.phoneIndex === userData?.phone)))
              .slice()
              .reverse()
              .map((message, index, array) => {
                const previousMessage = messages[index - 1];
                const showDateHeader =
                  index === 0 ||
                  !isSameDay(
                    new Date(array[index - 1]?.createdAt ?? array[index - 1]?.dateAdded ?? 0),
                    new Date(message.createdAt ?? message.dateAdded ?? 0)
                  );
                  const isMyMessage = message.from_me;
                  const prevMessage = messages[index - 1];
                  const nextMessage = messages[index + 1];
                  
                  const isFirstInSequence = !prevMessage || prevMessage.from_me !== message.from_me;
                  const isLastInSequence = !nextMessage || nextMessage.from_me !== message.from_me;
                  
                  let messageClass;
                  if (isMyMessage) {
                    messageClass = isFirstInSequence ? myFirstMessageClass :
                                   isLastInSequence ? myLastMessageClass :
                                   myMiddleMessageClass;
                  } else {
                    messageClass = isFirstInSequence ? otherFirstMessageClass :
                                   isLastInSequence ? otherLastMessageClass :
                                   otherMiddleMessageClass;
                  }

  return (
                  <React.Fragment key={message.id}>
                    {showDateHeader && (
                      <div className="flex justify-center my-4">
                        <div className="inline-block bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-bold py-1 px-4 rounded-lg shadow-md">
                          {formatDateHeader(message.createdAt?.toString() || message.dateAdded?.toString() || '')}
                        </div>
                      </div>
                    )}

                    <div
                      data-message-id={message.id}
                      className={`p-2 mr-6 ${
                        message.type === 'privateNote'
                          ? "bg-yellow-600 text-black rounded-tr-xl rounded-tl-xl rounded-br-xl rounded-bl-xl self-end ml-auto text-left mb-1 group"
                          : messageClass
                      }`}
                      style={{
                        maxWidth: message.type === 'document' ? '90%' : '70%',
                        width: `${
                          message.type === 'document'
                            ? '400'
                            : message.type !== 'text'
                            ? '320'
                            : message.text?.body
                            ? Math.min(Math.max(message.text.body.length, message.text?.context?.quoted_content?.body?.length || 0) * 30, 320)
                            : '150'
                        }px`,
                        minWidth: '200px',
                      }}
                      onMouseEnter={() => setHoveredMessageId(message.id)}
                      onMouseLeave={() => setHoveredMessageId(null)}
                    >
                      {/* {hoveredMessageId === message.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setReactionMessage(message);
                            setShowReactionPicker(true);
                          }}
                          className="absolute top-0 right-0 -mt-2 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Lucide icon="Smile" className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </button>
                      )} */}
                      {message.isPrivateNote && (
                        <div className="flex items-center mb-1">
                          <Lock size={16} className="mr-1" />
                          <span className="text-xs font-semibold">Private Note</span>
                        </div>
                      )}
                      {message.chat_id && message.chat_id.includes('@g') && message.author && (
                        <div 
                          className="pb-0.5 text-sm font-medium capitalize" 
                          style={{ color: getAuthorColor(message.author.split('@')[0]) }}
                        >
                          {message.author.split('@')[0].toLowerCase()}
                        </div>
                      )}
                      {message.type === 'text' && message.text?.context && (
                        <div 
                          className="p-2 mb-2 rounded bg-gray-200 dark:bg-gray-800 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-700"
                          onClick={() => {
                            const quotedMessageId = message.text?.context?.quoted_message_id;
                            const quotedContent = message.text?.context?.quoted_content?.body;

                            // First try by ID if available
                            if (quotedMessageId) {
                              scrollToMessage(quotedMessageId);
                              const element = messageListRef.current?.querySelector(`[data-message-id="${quotedMessageId}"]`);
                              if (element) {
                                element.classList.add('highlight-message');
                                setTimeout(() => {
                                  element.classList.remove('highlight-message');
                                }, 2000);
                                return;
                              }
                            }

                            // If ID not found or no match, search by content
                            if (quotedContent) {
                              const matchingMessage = messages.find(msg => 
                                msg.type === 'text' && 
                                msg.text?.body === quotedContent
                              );

                              if (matchingMessage) {
                                scrollToMessage(matchingMessage.id);
                                const element = messageListRef.current?.querySelector(`[data-message-id="${matchingMessage.id}"]`);
                                if (element) {
                                  element.classList.add('highlight-message');
                                  setTimeout(() => {
                                    element.classList.remove('highlight-message');
                                  }, 2000);
                                }
                              }
                            }
                          }}
                        >
                          <div 
                            className="text-sm font-medium" 
                            style={{ color: getAuthorColor(message.text.context.quoted_author) }}
                          >
                            {message.text.context.quoted_author || ''}
                          </div>
                          <div className="text-sm text-gray-700 dark:text-gray-300">
                            {message.text.context.quoted_content?.body || ''}
                          </div>
                        </div>
                      )}
                       {/* {message.chat_id && message.chat_id.includes('@g') && message.phoneIndex != null && phoneCount >= 2 && (
                        <span className="text-sm font-medium pb-0.5 "
                          style={{ color: getAuthorColor(message.phoneIndex.toString() ) }}>
                          {phoneNames[message.phoneIndex] || `Phone ${message.phoneIndex + 1}`}
                        </span>
                      )} */}
                      {message.type === 'privateNote' && (
                        <div className="inline-block whitespace-pre-wrap break-words text-white">
                          {(() => {
                            const text = typeof message.text === 'string' ? message.text : message.text?.body || 'No content';
                            const parts = text.split(/(@\w+)/g);
                            return parts.map((part, index) => 
                              part.startsWith('@') ? (
                                <span key={index} className="underline">{part}</span>
                              ) : (
                                part
                              )
                            );
                          })()}
                        </div>
                      )}
                      {(message.type === 'text' || message.type === 'chat') && message.text?.body && (
                        <div>
                        {message.from_me && message.userName && message.userName !== '' && (
                          <div className="text-sm text-gray-300 dark:text-gray-300 mb-1 capitalize font-medium">{message.userName}</div>
                        )}
                        <div 
                          className={`whitespace-pre-wrap break-words overflow-hidden ${
                            message.from_me ? myMessageTextClass : otherMessageTextClass
                          }`} 
                          style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                        >
                          {formatText(message.text.body)}
                        </div>
                        {message.edited && (
                          <div className="text-xs text-gray-500 mt-1 italic">Edited</div>
                        )}
                      </div>
                      )}
                      {message.type === 'image' && message.image && (
                        <div className="p-0 message-content image-message">
                          <img
                            src={message.image.data ? `data:${message.image.mimetype};base64,${message.image.data}` : message.image.link || ''}
                            alt="Image"
                            className="rounded-lg message-image cursor-pointer"
                            style={{ maxWidth: 'auto', maxHeight: 'auto', objectFit: 'contain' }}
                            onClick={() => openImageModal(message.image?.data ? `data:${message.image.mimetype};base64,${message.image.data}` : message.image?.link || '')}
                            onError={(e) => {
                              console.error("Error loading image:", e.currentTarget.src);
                              e.currentTarget.src = logoImage; // Replace with your fallback image path
                            }}
                          />
                            {message.image?.caption && (
                              <p className="mt-2 text-sm">{message.image.caption}</p>
                            )}
                        </div>
                      )}
{message.type === 'order' && message.order && (
  <div className="p-0 message-content">
    <div className="flex items-center space-x-3 bg-emerald-800 rounded-lg p-2">
      <img
        src={`data:image/jpeg;base64,${message.order.thumbnail}`}
        alt="Order"
        className="w-12 h-12 rounded-lg object-cover"
        onError={(e) => {
          console.error("Error loading order image:", e.currentTarget.src);
          e.currentTarget.src = logoImage;
        }}
      />
      <div className="text-white">
        <div className="flex items-center">
          <Lucide icon="ShoppingCart" className="w-4 h-4 mr-1" />
          <span className="text-sm">{message.order.itemCount} item</span>
        </div>
        <p className="text-sm opacity-90">MYR {(message.order.totalAmount1000 / 1000).toFixed(2)}</p>
      </div>
    </div>
  </div>
)}
                      {message.type === 'video' && message.video && (
                        <div className="video-content p-0 message-content image-message">
                          <video
                            controls
                            src={message.video.link}
                            className="rounded-lg message-image cursor-pointer"
                            style={{ width: 'auto', height: 'auto', maxWidth: '100%' }}
                          />
                        </div>
                      )}
                      {message.type === 'gif' && message.gif && (
                        <div className="gif-content p-0 message-content image-message">
                          <img
                            src={message.gif.link}
                            alt="GIF"
                            className="rounded-lg message-image cursor-pointer"
                            style={{ maxWidth: '300px' }}
                            onClick={() => openImageModal(message.gif?.link || '')}
                          />
                          <div className="caption text-gray-800 dark:text-gray-200">{message.gif.caption}</div>
                        </div>
                      )}
             {(message.type === 'audio' || message.type === 'ptt') && (message.audio || message.ptt) && (
              <div className="audio-content p-0 message-content image-message">
                <audio 
                  controls 
                  className="rounded-lg message-image cursor-pointer"
                  src={(() => {
                    const audioData = message.audio?.data || message.ptt?.data;
                    const mimeType = message.audio?.mimetype || message.ptt?.mimetype;
                    if (audioData && mimeType) {
                      const byteCharacters = atob(audioData);
                      const byteNumbers = new Array(byteCharacters.length);
                      for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                      }
                      const byteArray = new Uint8Array(byteNumbers);
                      const blob = new Blob([byteArray], { type: mimeType });
                      return URL.createObjectURL(blob);
                    }
                    return '';
                  })()}
                />
                {(message.audio?.caption || message.ptt?.caption) && (
                  <div className="caption text-gray-800 dark:text-gray-200 mt-2">
                    {message.audio?.caption || message.ptt?.caption}
                  </div>
                )}
              </div>
            )}
                      {message.type === 'voice' && message.voice && (
                        <div className="voice-content p-0 message-content image-message w-auto h-auto">
                          <audio controls src={message.voice.link} className="rounded-lg message-image cursor-pointer" />
                        </div>
                      )}
                      {message.type === 'document' && message.document && (
                        <div className="document-content flex flex-col items-center p-4 rounded-md shadow-md bg-white dark:bg-gray-800">
                          <div 
                            className="w-full cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 p-4 rounded-lg"
                            onClick={() => {
                              if (message.document) {
                                const docUrl = message.document.link || 
                                  (message.document.data ? `data:${message.document.mimetype};base64,${message.document.data}` : null);
                                if (docUrl) {
                                  openPDFModal(docUrl);
                                }
                              }
                            }}
                          >
                            <div className="flex items-center">
                              {message.document.mimetype?.startsWith('video/') ? (
                                <Lucide icon="Video" className="w-8 h-8 text-gray-500 dark:text-gray-400 mr-3" />
                              ) : message.document.mimetype?.startsWith('image/') ? (
                                <Lucide icon="Image" className="w-8 h-8 text-gray-500 dark:text-gray-400 mr-3" />
                              ) : message.document.mimetype?.includes('pdf') ? (
                                <Lucide icon="FileText" className="w-8 h-8 text-gray-500 dark:text-gray-400 mr-3" />
                              ) : (
                                <Lucide icon="File" className="w-8 h-8 text-gray-500 dark:text-gray-400 mr-3" />
                              )}
                              
                              <div className="flex-1">
                                <div className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                                  {message.document.file_name || message.document.filename || 'Document'}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {message.document.page_count && `${message.document.page_count} page${message.document.page_count > 1 ? 's' : ''} • `}
                                  {message.document.mimetype || 'Unknown'} •{' '}
                                  {((message.document.file_size || message.document.fileSize || 0) / (1024 * 1024)).toFixed(2)} MB
                                </div>
                              </div>
                              <Lucide icon="ExternalLink" className="w-5 h-5 text-gray-400 dark:text-gray-500 ml-3" />
                            </div>
                          </div>

                          {message.document?.caption && (
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                              {message.document.caption}
                            </p>
                          )}
                        </div>
                      )}
                      {message.type === 'link_preview' && message.link_preview && (
                        <div className="link-preview-content p-0 message-content image-message rounded-lg overflow-hidden text-gray-800 dark:text-gray-200">
                          <a href={message.link_preview.body} target="_blank" rel="noopener noreferrer" className="block">
                            <img
                              src={message.link_preview.preview}
                              alt="Preview"
                              className="w-full"
                            />
                            <div className="p-2">
                              <div className="font-bold text-lg">{message.link_preview.title}</div>
                              <div className="text-sm text-gray-800 dark:text-gray-200">{message.link_preview.description}</div>
                              <div className="text-blue-500 mt-1">{message.link_preview.body}</div>
                            </div>
                          </a>
                        </div>
                      )}
                      {message.type === 'sticker' && message.sticker && (
                        <div className="sticker-content p-0 message-content image-message">
                          <img
                            src={`data:${message.sticker.mimetype};base64,${message.sticker.data}`}
                            alt="Sticker"
                            className="rounded-lg message-image cursor-pointer"
                            style={{ maxWidth: 'auto', maxHeight: 'auto', objectFit: 'contain' }}
                            onClick={() => openImageModal(`data:${message.sticker?.mimetype};base64,${message.sticker?.data}`)}
                          />
                        </div>
                      )}
                      {message.type === 'location' && message.location && (
                        <div className="location-content p-0 message-content image-message">
                          <div className="text-sm text-gray-800 dark:text-gray-200">Location: {message.location.latitude}, {message.location.longitude}</div>
                        </div>
                      )}
                      {message.type === 'poll' && message.poll && (
                        <div className="poll-content p-0 message-content image-message">
                          <div className="text-sm text-gray-800 dark:text-gray-200">Poll: {message.poll.title}</div>
                        </div>
                      )}
                      {message.type === 'hsm' && message.hsm && (
                        <div className="hsm-content p-0 message-content image-message">
                          <div className="text-sm text-gray-800 dark:text-gray-200">HSM: {message.hsm.title}</div>
                        </div>
                      )}
                      {message.type === 'action' && message.action && (
                        <div className="action-content flex flex-col p-4 rounded-md shadow-md bg-white dark:bg-gray-800">
                          {message.action.type === 'delete' ? (
                            <div className="text-gray-400 dark:text-gray-600">This message was deleted</div>
                          ) : (
                            /* Handle other action types */
                            <div className="text-gray-800 dark:text-gray-200">{message.action.emoji}</div>
                          )}
                        </div>
                      )}

                      {showReactionPicker && reactionMessage?.id === message.id && (
                        <ReactionPicker
                          onSelect={(emoji) => handleReaction(message, emoji)}
                          onClose={() => setShowReactionPicker(false)}
                        />
                      )}
                      {message.reactions && message.reactions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1 rounded-full px-2 py-0.5 w-fit">
                          {message.reactions.map((reaction: any, index: number) => (
                            <span 
                              key={index}
                              className="text-lg"
                            >
                              {reaction.emoji}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex justify-between items-center mt-1">
                      
                        <div className={`message-timestamp text-xs ${message.from_me ? myMessageTextClass : otherMessageTextClass} flex items-center h-6 ml-auto`}>
                          <div className="flex items-center mr-2">
                            {(hoveredMessageId === message.id || selectedMessages.includes(message)) && (
                              <>
                                <button className="ml-2 text-white hover:text-blue-600 dark:text-white dark:hover:text-blue-300 transition-colors duration-200 mr-2" onClick={() => setReplyToMessage(message)}><Lucide icon="MessageCircleReply" className="w-6 h-6" /></button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReactionMessage(message);
                                    setShowReactionPicker(true);
                                  }}
                                  className="mr-2 p-1 text-white hover:text-blue-500 dark:text-white dark:hover:text-blue-300"
                                ><Lucide icon="Heart" className="w-6 h-6" /></button>
                                {showReactionPicker && reactionMessage?.id === message.id && (
                                  <ReactionPicker
                                    onSelect={(emoji) => handleReaction(message, emoji)}
                                    onClose={() => setShowReactionPicker(false)}
                                  />
                                )}
                                {message.from_me && message.createdAt && new Date().getTime() - new Date(message.createdAt).getTime() < 15 * 60 * 1000 && userRole !== "3" && (
                                  <button className="ml-2 mr-2 text-white hover:text-blue-500 dark:text-white dark:hover:text-blue-300 transition-colors duration-200" onClick={() => openEditMessage(message)}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z" /></svg></button>
                                )}
                                <input type="checkbox" className="mr-2 form-checkbox h-5 w-5 text-blue-500 transition duration-150 ease-in-out rounded-full" checked={selectedMessages.includes(message)} onChange={() => handleSelectMessage(message)} />
                              </>
                            )}
                            {message.name && <span className="ml-2 text-gray-400 dark:text-gray-600">{message.name}</span>}
                            {message.phoneIndex !== undefined && (
                            <div className="text-xs text-white-500 dark:text-gray-400 px-2 py-1">
                              {phoneNames[message.phoneIndex] || `Phone ${message.phoneIndex + 1}`}
                            </div>
                          )}
                            {formatTimestamp(message.createdAt || message.dateAdded)}
                          
                          </div>
                          
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })
            }
            
     
        
          </>
        )}
      </div>
      
      <div className="absolute bottom-0 left-0 w-500px !box m-1 py-1 px-2">
 
        {replyToMessage && (
          <div className="p-2 mb-2 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-between">
            <div>
              <div className="font-semibold text-gray-800 dark:text-gray-200">{replyToMessage.from_name}</div>
              <div>
                {replyToMessage.type === 'text' && replyToMessage.text?.body}
                {replyToMessage.type === 'link_preview' && replyToMessage.link_preview?.body}
                {replyToMessage.type === 'image' && <img src={replyToMessage.image?.link} alt="Image" style={{ maxWidth: '200px' }} />}
                {replyToMessage.type === 'video' && <video controls src={replyToMessage.video?.link} style={{ maxWidth: '200px' }} />}
                {replyToMessage.type === 'gif' && <img src={replyToMessage.gif?.link} alt="GIF" style={{ maxWidth: '200px' }} />}
                {replyToMessage.type === 'audio' && <audio controls src={replyToMessage.audio?.link} />}
                {replyToMessage.type === 'voice' && <audio controls src={replyToMessage.voice?.link} />}
                {replyToMessage.type === 'document' && <iframe src={replyToMessage.document?.link} width="100%" height="200px" />}
                {replyToMessage.type === 'sticker' && <img src={replyToMessage.sticker?.link} alt="Sticker" style={{ maxWidth: '150px' }} />}
                {replyToMessage.type === 'location' && (
                  <div className="text-gray-800 dark:text-gray-200">
                    Location: {replyToMessage.location?.latitude}, {replyToMessage.location?.longitude}
                  </div>
                )}
                {replyToMessage.type === 'poll' && <div className="text-gray-800 dark:text-gray-200">Poll: {replyToMessage.poll?.title}</div>}
                {replyToMessage.type === 'hsm' && <div className="text-gray-800 dark:text-gray-200">HSM: {replyToMessage.hsm?.title}</div>}
              </div>
            </div>
            <button onClick={() => setReplyToMessage(null)}>
              <Lucide icon="X" className="w-5 h-5 text-gray-800 dark:text-gray-200" />
            </button>
          </div>
        )}
         <div className="flex mb-1">
            <button
              className={`px-4 py-2 mr-1 rounded-lg ${
                messageMode === 'reply' || messageMode === `phone${selectedContact?.phoneIndex + 1}`
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-200'
              }`}
              onClick={() => {
                const phoneIndex = selectedContact?.phoneIndex || 0;
                setMessageMode(`phone${phoneIndex + 1}`);
              }}
            >
              Reply
            </button>
            <button
              className={`px-4 py-2 rounded-lg ${
                messageMode === 'privateNote'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-200'
              }`}
              onClick={() => setMessageMode('privateNote')}
            >
              Private Note
            </button>
          </div>
         {isPrivateNotesMentionOpen && messageMode === 'privateNote' && (
                    <div className="absolute bottom-full left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-40 overflow-y-auto mb-1">
                      {employeeList.map((employee) => (
                        <div
                          key={employee.id}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-gray-800 dark:text-gray-200"
                          onClick={() => handlePrivateNoteMentionSelect(employee)}
                        >
                          {employee.name}
                        </div>
                      ))}
                    </div>
                  )}
        <div className="flex items-center w-full bg-white dark:bg-gray-800 pl-2 pr-2 rounded-lg">
          <button className="p-2 m-0 !box" onClick={() => setEmojiPickerOpen(!isEmojiPickerOpen)}>
            <span className="flex items-center justify-center w-5 h-5">
              <Lucide icon="Smile" className="w-5 h-5 text-gray-800 dark:text-gray-200" />
            </span>
          </button>
          <Menu as="div" className="relative inline-block text-left p-2">
            <div className="flex items-center space-x-3">
              <Menu.Button as={Button} className="p-2 !box m-0" onClick={handleTagClick}>
                <span className="flex items-center justify-center w-5 h-5">
                  <Lucide icon="Paperclip" className="w-5 h-5 text-gray-800 dark:text-gray-200" />
                </span>
              </Menu.Button>
            </div>
            <Menu.Items className="absolute left-0 bottom-full mb-2 w-40 bg-white dark:bg-gray-800 shadow-lg rounded-md p-2 z-10 max-h-60 overflow-y-auto">
            <button className="flex items-center w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
  <label htmlFor="imageUpload" className="flex items-center cursor-pointer text-gray-800 dark:text-gray-200 w-full">
    <Lucide icon="Image" className="w-4 h-4 mr-2" />
    Image
    <input
      type="file"
      id="imageUpload"
      accept="image/*"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) {
          const imageUrl = URL.createObjectURL(file);
          setPastedImageUrl(imageUrl);
          setImageModalOpen2(true);
        }
      }}
    />
  </label>
</button>
<button className="flex items-center w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
    <label htmlFor="videoUpload" className="flex items-center cursor-pointer text-gray-800 dark:text-gray-200 w-full">
      <Lucide icon="Video" className="w-4 h-4 mr-2" />
      Video
      <input
        type="file"
        id="videoUpload"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            setSelectedVideo(file);
            setVideoModalOpen(true);
          }
        }}
      />
    </label>
  </button>
<button className="flex items-center w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
  <label htmlFor="documentUpload" className="flex items-center cursor-pointer text-gray-800 dark:text-gray-200 w-full">
    <Lucide icon="File" className="w-4 h-4 mr-2" />
    Document
    <input
  type="file"
  id="documentUpload"
  accept="application/pdf"
  className="hidden"
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedDocument(file);
      setDocumentModalOpen(true);
    }
  }}
/>
  </label>
</button>
            </Menu.Items>
          </Menu>
          <button className="p-2 m-0 !box" onClick={handleQR}>
            <span className="flex items-center justify-center w-5 h-5">
              <Lucide icon='Zap' className="w-5 h-5 text-gray-800 dark:text-gray-200" />
            </span>
          </button>
          <button className="p-2 m-0 !box ml-2" onClick={toggleRecordingPopup}>
        <span className="flex items-center justify-center w-5 h-5">
          <Lucide icon="Mic" className="w-5 h-5 text-gray-800 dark:text-gray-200" />
        </span>
      </button>

      {isRecordingPopupOpen && (
        <div className="absolute bottom-full mb-2 left-0 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
          <div className="flex items-center mb-2">
            <button
              className={`p-2 rounded-md ${isRecording ? 'bg-red-500 text-white' : 'bg-primary text-white'}`}
              onClick={toggleRecording}
            >
              <Lucide icon={isRecording ? "StopCircle" : "Mic"} className="w-5 h-5" />
            </button>
            <ReactMicComponent
              record={isRecording}
              className="w-44 rounded-md h-10 mr-2 ml-2"
              onStop={onStop}
              strokeColor="#0000CD"
              backgroundColor="#FFFFFF"
              mimeType="audio/webm"
            />
          </div>
          <div className="flex flex-col space-y-2">
            {audioBlob && (
              <>
                <audio src={URL.createObjectURL(audioBlob)} controls className="w-full h-10 mb-2" />
                <div className="flex justify-between">
                  <button
                    className="px-3 py-1 rounded bg-gray-500 text-white"
                    onClick={() => setAudioBlob(null)}
                  >
                    Remove
                  </button>
                  <button
                    className="px-3 py-1 rounded bg-green-700 text-white"
                    onClick={sendVoiceMessage}
                  >
                    Send
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
          {userData?.company === 'Juta Software' && (
        <button 
          className="p-2 m-0 !box ml-2" 
          onClick={handleGenerateAIResponse}
          disabled={isGeneratingResponse}
        >
          <span className="flex items-center justify-center w-5 h-5">
            {isGeneratingResponse ? (
              <Lucide icon="Loader" className="w-5 h-5 text-gray-800 dark:text-gray-200 animate-spin" />
            ) : (
              <Lucide icon="Sparkles" className="w-5 h-5 text-gray-800 dark:text-gray-200" />
            )}
          </span>
        </button>
      )}
          <textarea
            ref={textareaRef}
            className={`flex-grow h-10 px-2 py-2 m-1 ml-2 border rounded-lg focus:outline-none focus:border-info text-md resize-none overflow-hidden ${
              'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400'
            } border-gray-300 dark:border-gray-700`}
            placeholder={messageMode === 'privateNote' ? "Type a private note..." : "Type a message..."}
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              adjustHeight(e.target);
              const lastAtSymbolIndex = e.target.value.lastIndexOf('@');
              if (lastAtSymbolIndex !== -1 && lastAtSymbolIndex === e.target.value.length - 1) {
                setIsPrivateNotesMentionOpen(true);
                console.log('Private note mention open');
              } else {
                setIsPrivateNotesMentionOpen(false);
              }
              if (e.target.value === '\\') {
                handleQR();
                setNewMessage('');
              }
              // Update this condition for quick reply search
              if (e.target.value.startsWith('/')) {
                setIsQuickRepliesOpen(true);
                setQuickReplyFilter(e.target.value.slice(1));
              } else {
                setIsQuickRepliesOpen(false);
                setQuickReplyFilter('');
              }
            }}
            rows={1}
            style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
            onKeyDown={(e) => {
              const target = e.target as HTMLTextAreaElement;
              const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                } else if (e.key === 'Enter') {
                  if (e.shiftKey) {
                    e.preventDefault();
                    setNewMessage((prev) => prev + '\n');
                  } else {
                    e.preventDefault();
                    if (selectedIcon === 'ws') {
                      if (messageMode !== 'privateNote') {
                        handleSendMessage();
                      } else {
                        handleAddPrivateNote(newMessage);
                      }
                    } 
                    setNewMessage('');
                    adjustHeight(target, true); // Reset height after sending message
                  }
                }
              };
              handleKeyDown(e);
            }}
            onPaste={(e) => {
              e.preventDefault();
              const items = e.clipboardData?.items;
              if (items) {
                for (const item of items) {
                  const blob = item.getAsFile();
                  if (blob) {
                    const fileType = getFileTypeFromMimeType(item.type);
                    if (fileType === 'Unknown') {
                      console.warn('Unsupported file type:', item.type);
                      continue;
                    }
            
                    const url = URL.createObjectURL(blob);
                    if (['JPEG', 'PNG', 'GIF', 'WebP', 'SVG'].includes(fileType)) {
                      setPastedImageUrl(url);
                      setImageModalOpen2(true);
                    } else {
                      setSelectedDocument(blob);
                      setDocumentModalOpen(true);
                    }
                    return;
                  }
                }
              }
              const text = e.clipboardData?.getData('text');
              if (text) {
                setNewMessage((prev) => prev + text);
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={async (e) => {
              e.preventDefault();
              e.stopPropagation();
            
              const files = e.dataTransfer.files;
              if (files.length > 0) {
                const file = files[0];
                const fileType = getFileTypeFromMimeType(file.type);
                if (fileType === 'Unknown') {
                  console.warn('Unsupported file type:', file.type);
                  return;
                }
            
                const url = URL.createObjectURL(file);
                if (['JPEG', 'PNG', 'GIF', 'WebP', 'SVG'].includes(fileType)) {
                  setPastedImageUrl(url);
                  setImageModalOpen2(true);
                } else {
                  setSelectedDocument(file);
                  setDocumentModalOpen(true);
                }
              }
            }}
            disabled={userRole === "3"}
          />
          {isQuickRepliesOpen && (
            <div ref={quickRepliesRef} className="absolute bottom-full left-0 mb-2 w-full max-w-md bg-gray-100 dark:bg-gray-800 p-2 rounded-md shadow-lg mt-2 z-10">
            <div className="flex justify-between mb-4">
              <button
                className={`px-4 py-2 rounded-lg ${
                  activeQuickReplyTab === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}
                onClick={() => setActiveQuickReplyTab('all')}
              >
                All
              </button>
              <button
                className={`px-4 py-2 rounded-lg ${
                  activeQuickReplyTab === 'self'
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}
                onClick={() => setActiveQuickReplyTab('self')}
              >
                Self
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {quickReplies
                .filter(reply => 
                  activeQuickReplyTab === 'all' || reply.type === 'self'
                )
                .filter(reply => 
                  reply.keyword.toLowerCase().includes(quickReplyFilter.toLowerCase()) ||
                  reply.text.toLowerCase().includes(quickReplyFilter.toLowerCase())
                )
                .sort((a, b) => a.keyword.localeCompare(b.keyword))
                .map(reply => (
                  <div key={reply.id} className="flex items-center justify-between mb-2 dark:bg-gray-800">
                    {editingReply?.id === reply.id ? (
                      <>
                        <input
                          className="flex-grow px-2 py-1 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 mr-2"
                          value={editingReply.keyword}
                          onChange={(e) => setEditingReply({ ...editingReply, keyword: e.target.value })}
                          style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                        />
                        <textarea
                          className="flex-grow px-2 py-1 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 mr-2"
                          value={editingReply.text}
                          onChange={(e) => setEditingReply({ ...editingReply, text: e.target.value })}
                          placeholder="Text"
                          rows={1}
                        />
                        <button className="p-2 m-1 !box" onClick={() => updateQuickReply(reply.id, editingReply.keyword, editingReply.text, editingReply.type as "all" | "self")}>
                          <span className="flex items-center justify-center w-5 h-5">
                            <Lucide icon="Save" className="w-5 h-5 text-gray-800 dark:text-gray-200" />
                          </span>
                        </button>
                      </>
                    ) : (
                      <>
                      <span className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded-md text-gray-800 dark:text-gray-200 m-2">
                        {reply.keyword}
                      </span>
                      <span
                        className="px-2 py-1 flex-grow text-lg cursor-pointer text-gray-800 dark:text-gray-200"
                        onClick={() => {
                          handleQRClick(reply);
                          let message = reply.text;
                          if (reply.image) {
                            const imageFile = new File([reply.image], "image.png", { type: "image/png" });
                            const imageUrl = URL.createObjectURL(imageFile);
                            console.log("reply image:", JSON.stringify(reply, null, 2));
                            setPastedImageUrl(reply.image);
                            setDocumentCaption(reply.text);
                            setImageModalOpen2(true);
                          }
                          if (reply.document) {
                            const documentFile = new File([reply.document], "document", { type: reply.document });
                            setSelectedDocument(documentFile);
                            setDocumentModalOpen(true);
                            setDocumentCaption(reply.text);
                          }
                          setNewMessage(message);
                          setIsQuickRepliesOpen(false);
                        }}
                        style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                      >
                        {reply.text}
                      </span>
                      {(typeof reply.document === 'string' && reply.document !== '') || (typeof reply.image === 'string' && reply.image !== '') ? (
                        <>
                          {typeof reply.document === 'string' && reply.document !== '' && (
                            <a href={reply.document} target="_blank" className="p-2 m-1 !box">
                              <span className="flex items-center justify-center w-5 h-5">
                                <Lucide icon="File" className="w-5 h-5 text-gray-800 dark:text-gray-200" />
                              </span>
                            </a>
                          )}
                          {typeof reply.image === 'string' && reply.image !== '' && (
                            <a href={reply.image} target="_blank" className="p-2 m-1 !box">
                              <span className="flex items-center justify-center w-5 h-5">
                                <Lucide icon="Image" className="w-5 h-5 text-gray-800 dark:text-gray-200" />
                              </span>
                            </a>
                          )}
                        </>
                      ) : null}
                      <div>
                        <button className="p-2 m-1 !box" onClick={() => setEditingReply(reply)}>
                          <span className="flex items-center justify-center w-5 h-5">
                            <Lucide icon="Eye" className="w-5 h-5 text-gray-800 dark:text-gray-200" />
                          </span>
                        </button>
                        <button className="p-2 m-1 !box text-red-500 dark:text-red-400" onClick={() => deleteQuickReply(reply.id, reply.type as "all" | "self")}>
                          <span className="flex items-center justify-center w-5 h-5">
                            <Lucide icon="Trash" className="w-5 h-5" />
                          </span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center mb-4">
          {(newMessage === '/' || isQuickRepliesOpen) && !quickReplyFilter && (
            <>
              <input
                className="flex-grow px-1 py-1 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 mr-2"
                placeholder="Add new keyword"
                value={newQuickReplyKeyword}
                onChange={(e) => setNewQuickReplyKeyword(e.target.value)}
                style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'Arial, sans-serif', fontSize: '14px' }}
              />
              <textarea
                className="flex-grow px-2 py-1 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                placeholder="Add new quick reply"
                value={newQuickReply}
                onChange={(e) => setNewQuickReply(e.target.value)}
                rows={1}
                style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'Arial, sans-serif', fontSize: '14px' }}
              />
              <input
                type="file"
                className="hidden"
                id="quickReplyFile"
                onChange={(e) => setSelectedDocument(e.target.files ? e.target.files[0] : null)}
              />
              <label htmlFor="quickReplyFile" className="p-2 m-1 !box cursor-pointer">
                <span className="flex items-center justify-center w-5 h-5">
                  <Lucide icon="File" className="w-5 h-5 text-gray-800 dark:text-gray-200" />  
                </span>
              </label>  
              {/* <input
                type="file"
                accept="image/*"
                className="hidden"
                id="quickReplyImage"
                onChange={(e) => setSelectedImage(e.target.files ? e.target.files[0] : null)}
              />
              <label htmlFor="quickReplyImage" className="p-2 m-1 !box cursor-pointer">
                <span className="flex items-center justify-center w-5 h-5">
                  <Lucide icon="Image" className="w-5 h-5 text-gray-800 dark:text-gray-200" />  
                </span>
              </label>   */}
            </>
          )}
          <div className="flex flex-col ml-2">
            {!quickReplyFilter && (
              <button className="p-2 m-1 !box" onClick={addQuickReply}>
                <span className="flex items-center justify-center w-5 h-5">
                  <Lucide icon="Plus" className="w-5 h-5 text-gray-800 dark:text-gray-200" />
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    )}
        </div>
        {isEmojiPickerOpen && (
          <div className="absolute bottom-20 left-2 z-10">
            <EmojiPicker onEmojiClick={handleEmojiClick} />
          </div>
        )}
      </div>
    </>
  ) : (
    <div className="hidden md:flex flex-col w-full h-full bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 items-center justify-center">
      <div className="flex flex-col items-center justify-center p-8 rounded-lg shadow-lg bg-gray-100 dark:bg-gray-700">
        <Lucide icon="MessageSquare" className="w-16 h-16 text-black dark:text-white mb-4" />
        <p className="text-black dark:text-white text-lg text-center mb-6">Select a chat to start messaging</p>
        <button
          onClick={openNewChatModal}
          className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded transition duration-200"
        >
          Start New Chat
        </button>
      </div>
    </div>
  )}
</div>

{selectedMessages.length > 0 && (
  <div className="fixed bottom-16 right-2 md:right-10 space-y-2 md:space-y-0 md:space-x-4 flex flex-col md:flex-row">
    <button
      className="bg-blue-800 dark:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg w-full md:w-auto"
      onClick={() => setIsForwardDialogOpen(true)}>
      Forward
    </button>
    <button
      className="bg-red-800 dark:bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg w-full md:w-auto"
      onClick={openDeletePopup}>
      Delete
    </button>
    <button
      className="bg-gray-700 dark:bg-gray-600 text-white px-4 py-2 rounded-lg shadow-lg w-full md:w-auto"
      onClick={() => setSelectedMessages([])}
      onKeyDown={handleKeyDown}>
      Cancel
    </button>
  </div>
)}
{isNewChatModalOpen && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl">
      <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">Start New Chat</h2>
      <div className="mb-4">
        <label htmlFor="newContactNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Enter contact number (include country code)
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-600 dark:text-gray-400">
            +
          </span>
          <input
            type="text"
            id="newContactNumber"
            value={newContactNumber}
            onChange={(e) => setNewContactNumber(e.target.value)}
            placeholder="60123456789"
            className="w-full p-2 pl-6 border rounded text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700"
          />
        </div>
      
      </div>
      <div className="flex justify-end space-x-2">
        <button
          onClick={closeNewChatModal}
          className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition duration-200"
        >
          Cancel
        </button>
        <button
          onClick={handleCreateNewChat}
          className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded transition duration-200"
        >
          Start Chat
        </button>
      </div>
    </div>
  </div>
)}
{isTabOpen && (
  <div className="absolute top-0 right-0 h-full w-full md:w-1/4 bg-white dark:bg-gray-800 border-l border-gray-300 dark:border-gray-700 overflow-y-auto z-50 shadow-lg transition-all duration-300 ease-in-out">
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-900">
        <div className="flex items-center space-x-3">
        <div className="w-10 h-10 overflow-hidden rounded-full shadow-lg bg-gray-700 flex items-center justify-center text-white">
  {selectedContact.profilePicUrl ? (
    <img 
      src={selectedContact.profilePicUrl} 
      alt={selectedContact.contactName || "Profile"} 
      className="w-full h-full object-cover"
    />
  ) : (
    <span className="text-2xl font-bold">
      {selectedContact.contactName ? selectedContact.contactName.charAt(0).toUpperCase() : "?"}
    </span>
  )}
</div>

          <div className="flex flex-col">
            {isEditing ? (
              <div className="flex items-center">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="font-semibold bg-transparent text-gray-800 dark:text-gray-200 capitalize border-b-2 border-primary dark:border-primary-400 focus:outline-none focus:border-primary-600 dark:focus:border-primary-300 mr-2 px-1 py-0.5 transition-all duration-200"
                  onKeyPress={(e) => e.key === 'Enter' && handleSave()}
                />
                <button
                  onClick={handleSave}
                  className="p-1 bg-primary hover:bg-primary-600 text-white rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-400"
                >
                  <Lucide icon="Save" className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div 
                className="font-semibold text-gray-800 dark:text-gray-200 capitalize cursor-pointer hover:text-primary dark:hover:text-primary-400 transition-colors duration-200 flex items-center group"
                onClick={() => setIsEditing(true)}
              >
                <span>{selectedContact?.contactName || selectedContact?.firstName || selectedContact?.phone || ''}</span>
                <Lucide icon="Pencil" className="w-4 h-4 ml-2 text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </div>
            )}
            {userRole === '1' && (
              <span className="text-sm text-gray-500 dark:text-gray-400">{selectedContact.phone}</span>
            )}
          </div>
        </div>
        <button onClick={handleEyeClick} className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 transition-all duration-200">
          <Lucide icon="X" className="w-6 h-6 text-gray-800 dark:text-gray-200" />
        </button>
      </div>
      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        <div className="bg-white dark:bg-gray-700 rounded-lg shadow-md overflow-hidden">
          <div className="bg-blue-50 dark:bg-blue-900 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Contact Information</h3>
              <div className="flex space-x-2">
                {!isEditing ? (
                  <>
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setEditedContact({ ...selectedContact });
                      }}
                      className="px-3 py-1 bg-primary text-white rounded-md hover:bg-primary-dark transition duration-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this contact? This action cannot be undone.')) {
                          const user = auth.currentUser;
                          const docUserRef = doc(firestore, 'user', user?.email!);
                          getDoc(docUserRef).then((docUserSnapshot) => {
                            if (!docUserSnapshot.exists()) {
                              console.log('No such document for user!');
                              return;
                            }
                            const userData = docUserSnapshot.data();
                            const companyId = userData.companyId;
                            const contactRef = doc(firestore, `companies/${companyId}/contacts`, selectedContact.id);
                            deleteDoc(contactRef).then(() => {
                              toast.success('Contact deleted successfully');
                              setIsTabOpen(false);
                              setContacts(contacts.filter(contact => contact.id !== selectedContact.id));
                              navigate('/chat');
                            }).catch((error) => {
                              console.error('Error deleting contact:', error);
                              toast.error('Failed to delete contact');
                            });
                          });
                        }
                      }}
                      className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition duration-200"
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSaveContact}
                      className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition duration-200"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditedContact(null);
                      }}
                      className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="p-4">
              {/* Phone Index Selector */}
              <div className="mb-4 flex justify-between items-center">
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Active Phone:</p>
                <select
                  value={selectedContact.phoneIndex ?? 0}
                  onChange={async (e) => {
                    const newPhoneIndex = parseInt(e.target.value);
                    // Update local state
                    setSelectedContact({ ...selectedContact, phoneIndex: newPhoneIndex });
                    const user = auth.currentUser;
                    const docUserRef = doc(firestore, 'user', user?.email!);
                    const docUserSnapshot = await getDoc(docUserRef);
                    if (!docUserSnapshot.exists()) {
                      console.log('No such document for user!');
                      return;
                    }
                    const userData = docUserSnapshot.data();
                    const companyId = userData.companyId;
                    // Update Firestore
                    try {
                      const contactRef = doc(firestore, `companies/${companyId}/contacts`, selectedContact.id);
                      await updateDoc(contactRef, { phoneIndex: newPhoneIndex });
                      toast.success('Phone updated successfully');
                    } catch (error) {
                      console.error('Error updating phone:', error);
                      toast.error('Failed to update phone');
                      // Revert local state on error
                      setSelectedContact({ ...selectedContact });
                    }
                  }}
                  className="px-2 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ml-4 w-32"
                >
                  {Object.entries(phoneNames).map(([index, name]) => (
                    <option key={index} value={index}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            <div className="grid grid-cols-2 gap-4">

              {[
                  { label: "First Name", key: "contactName" },
                  { label: "Last Name", key: "lastName" },
                  { label: "Email", key: "email" },
                  { label: "Phone", key: "phone" },
                  { label: "Company", key: "companyName" },
                  { label: "Address", key: "address1" },
                  { label: "Website", key: "website" },
                  ...(userData?.companyId === '095' ? [
                    { label: "Country", key: "country" },
                    { label: "Nationality", key: "nationality" },
                    { label: "Highest Education", key: "highestEducation" },
                    { label: "Program of Study", key: "programOfStudy" },
                    { label: "Intake Preference", key: "intakePreference" },
                    { label: "English Proficiency", key: "englishProficiency" },
                    { label: "Passport Validity", key: "passport" },
                  ] : []),
                  ...((['079', '001'].includes(userData?.companyId ?? '')) ? [
                    { label: "IC", key: "ic" },
                    { label: "Points", key: "points" },
                    { label: "Branch", key: "branch" },
                    { label: "Expiry Date", key: "expiryDate" },
                    { label: "Vehicle Number", key: "vehicleNumber" },
                  ] : []),
                  ...(userData?.companyId === '001' ? [
                    { label: "Assistant ID", key: "assistantId" },
                    { label: "Thread ID", key: "threadid" },
                  ] : []),
                  ...(selectedContact.customFields ? Object.entries(selectedContact.customFields).map(([key, value]) => (
                    { label: key, key: `customFields.${key}`, isCustom: true }
                  )) : []),
                  
              ].map((item, index) => (
                <div key={index} className="col-span-1">
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{item.label}</p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedContact?.[item.key as keyof Contact] || ''}
                      onChange={(e) => setEditedContact({ ...editedContact, [item.key]: e.target.value } as Contact)}
                      className="w-full mt-1 px-2 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  ) : (
                    <p className="text-gray-800 dark:text-gray-200">
                      {selectedContact[item.key as keyof Contact] || 'N/A'}
                    </p>
                  )}
                </div>
              ))}         
            </div>
            <div className="border-t border-gray-200 dark:border-gray-600 mt-4 pt-4"></div>
            {selectedContact.tags.some((tag: string) => employeeList.some(employee => employee.name.toLowerCase() === tag.toLowerCase())) && (
                    <div className="w-full">
                      <h4 className="font-semibold text-gray-500 dark:text-gray-400 inline-block mr-2">Employees Assigned:</h4>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedContact.tags
                          .filter((tag: string) => employeeList.some(employee => employee.name.toLowerCase() === tag.toLowerCase()))
                          .map((employeeTag: string, index: number) => (
                            <div key={index} className="inline-flex items-center bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 text-sm font-semibold px-3 py-1 rounded-full border border-green-400 dark:border-green-600">
                              <span>{employeeTag}</span>
                              <button
                                className="ml-2 focus:outline-none"
                                onClick={() => handleRemoveTag(selectedContact.id, employeeTag)}
                              >
                                <Lucide icon="X" className="w-4 h-4 text-green-600 hover:text-green-800 dark:text-green-300 dark:hover:text-green-100" />
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-700 rounded-lg shadow-md overflow-hidden">
          <div className="bg-indigo-50 dark:bg-indigo-900 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Tags</h3>
          </div>
          <div className="p-4">
            <div className="flex flex-wrap gap-2">
              {selectedContact && selectedContact.tags && selectedContact.tags.length > 0 ? (
                <>
                  {selectedContact.tags
                    .filter((tag: string) => 
                      tag.toLowerCase() !== 'stop bot' && 
                      !employeeList.some(employee => employee.name.toLowerCase() === tag.toLowerCase())
                    )
                    .map((tag: string, index: number) => (
                      <div key={index} className="inline-flex items-center bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-sm font-semibold px-3 py-1 rounded-full border border-blue-400 dark:border-blue-600">
                        <span>{tag}</span>
                        <button
                          className="ml-2 focus:outline-none"
                          onClick={() => handleRemoveTag(selectedContact.id, tag)}
                        >
                          <Lucide icon="X" className="w-4 h-4 text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100" />
                        </button>
                      </div>
                    ))}
                </>
              ) : (
                <span className="text-gray-500 dark:text-gray-400">No tags assigned</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
)}
 {isMessageSearchOpen && (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-40"
      onClick={() => {
        setIsMessageSearchOpen(false);
        setMessageSearchQuery('');
      }}
    >
      <div 
        className="absolute top-16 right-0 w-full md:w-1/3 bg-white dark:bg-gray-800 border-l border-gray-300 dark:border-gray-700 p-4 shadow-lg z-50"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={messageSearchInputRef}
          type="text"
          placeholder="Search messages..."
          value={messageSearchQuery}
          onChange={handleMessageSearchChange}
          className="w-full border rounded text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400"
        />
        <div className="mt-4 max-h-96 overflow-y-auto">
          {messageSearchResults.map((result) => (
            <div 
              key={result.id} 
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-200"
              onClick={() => scrollToMessage(result.id)}
            >
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {result.from_me ? 'You' : (selectedContact.contactName || selectedContact.firstName || result.from.split('@')[0])}
              </p>
              <p className="text-gray-800 dark:text-gray-200">
                {result.text.body.length > 100 
                  ? result.text.body.substring(0, 100) + '...' 
                  : result.text.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )}

<DocumentModal 
  isOpen={documentModalOpen} 
  type={selectedDocument?.type || ''}
  onClose={() => setDocumentModalOpen(false)} 
  document={selectedDocument} 
  onSend={(document, caption) => {
    if (document) {
      sendDocument(document, caption);
    }
    setDocumentModalOpen(false);
  }} 
  initialCaption={documentCaption}
/>
      <ImageModal isOpen={isImageModalOpen} onClose={closeImageModal} imageUrl={modalImageUrl} />
      <ImageModal2 isOpen={isImageModalOpen2} onClose={() => setImageModalOpen2(false)} imageUrl={pastedImageUrl} onSend={sendImage}  initialCaption={documentCaption} />
      {videoModalOpen && selectedVideo && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-2xl w-full">
      <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">Send Video</h2>
      <video
        src={URL.createObjectURL(selectedVideo)}
        controls
        className="w-full mb-4 rounded"
        style={{ maxHeight: '400px' }}
      />
      <textarea
        value={videoCaption}
        onChange={(e) => setVideoCaption(e.target.value)}
        placeholder="Add a caption..."
        className="w-full p-2 mb-4 border rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
      />
      <div className="flex justify-end space-x-2">
        <button
          onClick={() => {
            setVideoModalOpen(false);
            setSelectedVideo(null);
            setVideoCaption('');
          }}
          className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded"
        >
          Cancel
        </button>
        <button
          onClick={() => handleVideoUpload(videoCaption)}
          className="px-4 py-2 bg-primary text-white rounded"
        >
          Send
        </button>
      </div>
    </div>
  </div>
)}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />

      <ContextMenu id="contact-context-menu">
        <Item onClick={({ props }) => markAsUnread(props.contact)}>
          Mark as Unread
        </Item>
        <Separator />
        <Item 
          onClick={({ props }) => props.isSnooze ? props.onUnsnooze(props.contact) : props.onSnooze(props.contact)}
        >
          Snooze/Unsnooze
        </Item>
        <Separator />
        <Item onClick={({ props }) => props.isResolved ? props.onUnresolve(props.contact) : props.onResolve(props.contact)}>
          Resolve/Unresolve
        </Item>
      </ContextMenu>
      {isReminderModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setIsReminderModalOpen(false)}>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">Set Reminder</h2>
            <textarea
              placeholder="Enter reminder message..."
              className="w-full md:w-96 lg:w-120 p-2 border rounded text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700 mb-4"
              rows={3}
              onChange={(e) => setReminderText(e.target.value)}
              value={reminderText}
            />
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reminder Date and Time
              </label>
              <DatePickerComponent
                selected={reminderDate}
                onChange={(date: Date) => setReminderDate(date)}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="MMMM d, yyyy h:mm aa"
                className="w-full md:w-96 lg:w-120 p-2 border rounded text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700"
                placeholderText="Select date and time"
              />
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => {
                  setIsReminderModalOpen(false);
                  setReminderText('');
                }}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition duration-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSetReminder(reminderText)}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded transition duration-200"
              >
                Set Reminder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface ImageModalProps2 {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onSend: (url: string | null, caption: string) => void;
  initialCaption?: string; // Add this line
}

const ImageModal2: React.FC<ImageModalProps2> = ({ isOpen, onClose, imageUrl, onSend, initialCaption }) => {
  const [caption, setCaption] = useState(initialCaption); // Initialize with initialCaption

  useEffect(() => {
    // Update caption when initialCaption changes
    setCaption(initialCaption || "" );
  }, [initialCaption]);


  const handleSendClick = () => {
    setCaption('');
    onSend(imageUrl, caption || ''); // Provide empty string fallback for caption
    onClose(); // Close the modal after sending
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-400 bg-opacity-75" onClick={onClose}>
      <div
        className="relative bg-slate-400 dark:bg-gray-800 rounded-lg shadow-lg w-full md:w-[800px] h-[90vh] md:h-[600px] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
                      <button
            className="text-black hover:text-gray-800 dark:text-gray-200 dark:hover:text-gray-400"
            onClick={onClose}
          >
            <Lucide icon="X" className="w-6 h-6" />
          </button>
        </div>
        <div className="bg-slate-400 dark:bg-gray-800 p-4 rounded-lg mb-4 flex justify-center items-center" style={{ height: '70%' }}>
          <img
            src={imageUrl}
            alt="Modal Content"
            className="rounded-md"
            style={{ maxWidth: '100%', maxHeight: '100%' }}
          />
        </div>
        <div className="flex items-center bg-slate-500 dark:bg-gray-700 rounded-lg p-2">
          <input
            type="text"
            placeholder="Add a caption"
            className="flex-grow bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-2 rounded-lg focus:outline-none"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          <button
            className="ml-2 bg-primary dark:bg-blue-600 text-white p-2 rounded-lg"
            onClick={handleSendClick}
                      >
                        <Lucide icon="Send" className="w-5 h-5" />
                      </button>
         
                  </div>
                </div>
              </div>
  );
};

export default Main;
import _ from "lodash";
import clsx from "clsx";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import fakerData from "@/utils/faker";
import Button from "@/components/Base/Button";
import Pagination from "@/components/Base/Pagination";
import { FormInput, FormSelect } from "@/components/Base/Form";
import Lucide from "@/components/Base/Lucide";
import Tippy from "@/components/Base/Tippy";
import { Dialog, Menu } from "@/components/Base/Headless";
import Table from "@/components/Base/Table";
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, setDoc, getDocs, deleteDoc, updateDoc,addDoc, arrayUnion, arrayRemove, Timestamp, query, where, onSnapshot, orderBy, limit, serverTimestamp, writeBatch, increment, deleteField } from 'firebase/firestore';
import { initializeApp } from "firebase/app";
import axios from "axios";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { rateLimiter } from '../../utils/rate';
import { useNavigate } from "react-router-dom";
import LoadingIcon from "@/components/Base/LoadingIcon";
import { useContacts } from "@/contact";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import LZString from 'lz-string';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format, compareAsc, parseISO } from 'date-fns';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import ReactPaginate from 'react-paginate';
import { Tab } from '@headlessui/react';


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
const auth = getAuth(app);
const firestore = getFirestore(app);


function Main() {
  interface Contact {
    threadid?: string | null;
    assistantId?: string | null;
    additionalEmails?: string[] | null;
    address1?: string | null;
    assignedTo?: string | null;
    businessId?: string | null;
    city?: string | null;
    companyName?: string | null;
    contactName?: string | null;
    firstName?: string | null;
    country?: string | null;
    dateAdded?: string | null;
    dateOfBirth?: string | null;
    dateUpdated?: string | null;
    dnd?: boolean | null;
    dndSettings?: any | null;
    email?: string | null;
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
    chat_pic_full?: string | null;
    profilePicUrl?: string | null;
    chat_id?:string | null;
    points?:number | null;
    phoneIndex?:number | null;
    branch?:string | null;
    expiryDate?:string | null;
    vehicleNumber?:string | null;
    ic?: string | null;
    createdAt?: string | null;
    nationality?:string | null;
    highestEducation?:string | null;
    programOfStudy?:string | null;
    intakePreference?:string | null;
    englishProficiency?:string | null;
    passport?:string | null;
    customFields?: { [key: string]: string };

  }
  
  interface Employee {
    id: string;
    name: string;
    role: string;
    phoneNumber: string;
    phoneIndex: number;
    employeeId: string;

  }
  interface Tag {
    id: string;
    name: string;
  }
  interface TagsState {
    [key: string]: string[];
  }

  interface ScheduledMessage {
    id?: string;
    chatIds: string[];
    message: string;
    mediaUrl?: string;
    documentUrl?: string;
    mimeType?: string;
    fileName?: string;
    scheduledTime: Timestamp;
    batchQuantity: number;
    repeatInterval: number;
    repeatUnit: 'minutes' | 'hours' | 'days';
    additionalInfo: {
      contactName?: string;
      phone?: string;
      email?: string;
      // ... any other contact fields you want to include
    };
    status: 'scheduled' | 'sent' | 'failed';
    createdAt: Timestamp;
    sentAt?: Timestamp;
    error?: string;
    count?: number;
    v2?:boolean;
    whapiToken?:string;
    processedMessages?: {
      chatId: string;
      message: string;
      contactData?: {
        contactName: string;
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        vehicleNumber: string;
        branch: string;
        expiryDate: string;
        ic: string;
      };
    }[];
    templateData?: {
      hasPlaceholders: boolean;
      placeholdersUsed: string[];
    };
  }

  const DatePickerComponent = DatePicker as any;
  
  const [deleteConfirmationModal, setDeleteConfirmationModal] = useState(false);
  const [editContactModal, setEditContactModal] = useState(false);
  const [viewContactModal, setViewContactModal] = useState(false);
  const deleteButtonRef = useRef(null);
  const [isLoading, setLoading] = useState<boolean>(false);
  const [isFetching, setFetching] = useState<boolean>(false);
  const [employeeList, setEmployeeList] = useState<Employee[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [showAddUserButton, setShowAddUserButton] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentContact, setCurrentContact] = useState<Contact | null>(null);
  const [isTabOpen, setIsTabOpen] = useState(false);
  const [addContactModal, setAddContactModal] = useState(false);
  const [tagList, setTagList] = useState<Tag[]>([]);
  const [newTag, setNewTag] = useState("");
  const [showAddTagModal, setShowAddTagModal] = useState(false);
  const [showDeleteTagModal, setShowDeleteTagModal] = useState(false);
  const [selectedImportTags, setSelectedImportTags] = useState<string[]>([]);
  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null);
  const [tags, setTags] = useState<TagsState>({}); 
  const [blastMessageModal, setBlastMessageModal] = useState(false);
  const [blastMessage, setBlastMessage] = useState("");
  const [progress, setProgress] = useState<number>(0);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const contactsPerPage = 200;
  const contactListRef = useRef<HTMLDivElement>(null);
  const { contacts: initialContacts, refetchContacts } = useContacts();
  const [totalContacts, setTotalContacts] = useState(contacts.length);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [excludedTags, setExcludedTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportModalContent, setExportModalContent] = useState<React.ReactNode | null>(null);
  const [newContact, setNewContact] = useState({
      contactName: '',
      lastName: '',
      email: '',
      phone: '',
      address1: '',
      companyName: '',
      locationId:'',
      points:0,
      branch:'',
      expiryDate:'',
      vehicleNumber:'',
      ic:'',
  });
  const [total, setTotal] = useState(0);
  const [fetched, setFetched] = useState(0);
  const [allContactsLoaded, setAllContactsLoaded] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<File | null>(null);
  const [blastStartTime, setBlastStartTime] = useState<Date | null>(null);
  const [blastStartDate, setBlastStartDate] = useState<Date>(new Date());
  const [batchQuantity, setBatchQuantity] = useState<number>(10);
  const [repeatInterval, setRepeatInterval] = useState<number>(0);
  const [repeatUnit, setRepeatUnit] = useState<'minutes' | 'hours' | 'days'>('days');
  const [showCsvImportModal, setShowCsvImportModal] = useState(false);
  const [selectedCsvFile, setSelectedCsvFile] = useState<File | null>(null);
  const [showSyncConfirmationModal, setShowSyncConfirmationModal] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [editScheduledMessageModal, setEditScheduledMessageModal] = useState(false);
  const [currentScheduledMessage, setCurrentScheduledMessage] = useState<ScheduledMessage | null>(null);
  const [editMediaFile, setEditMediaFile] = useState<File | null>(null);
  const [editDocumentFile, setEditDocumentFile] = useState<File | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [stopbot, setStopbot] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [itemOffset, setItemOffset] = useState(0);
  const itemsPerPage = 50;
  const [employeeNames, setEmployeeNames] = useState<string[]>([]);
  const [showMassDeleteModal, setShowMassDeleteModal] = useState(false);
  const [userFilter, setUserFilter] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'tags' | 'users'>('tags');
  const [selectedTagFilters, setSelectedTagFilters] = useState<string[]>([]);
  const [selectedUserFilters, setSelectedUserFilters] = useState<string[]>([]);
  const [activeFilterTab, setActiveFilterTab] = useState('tags');
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [showPlaceholders, setShowPlaceholders] = useState(false);
  const [companyId, setCompanyId] = useState<string>("");
  const [showAllMessages, setShowAllMessages] = useState(false);
  const [phoneIndex, setPhoneIndex] = useState<number>(0);
  const [phoneOptions, setPhoneOptions] = useState<number[]>([]);
  const [phoneNames, setPhoneNames] = useState<{ [key: number]: string }>({});
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedPhoneIndex, setSelectedPhoneIndex] = useState<number | null>(null);
  const [showRecipients, setShowRecipients] = useState<string | null>(null);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [minDelay, setMinDelay] = useState(1);
  const [maxDelay, setMaxDelay] = useState(2);
  const [activateSleep, setActivateSleep] = useState(false);
  const [sleepAfterMessages, setSleepAfterMessages] = useState(20);
  const [sleepDuration, setSleepDuration] = useState(5);
  const [showScheduledMessages, setShowScheduledMessages] = useState<boolean>(true);
 

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        const docUserRef = doc(firestore, 'user', user.email!);
        const docUserSnapshot = await getDoc(docUserRef);
        if (docUserSnapshot.exists()) {
          const userData = docUserSnapshot.data();
          setCompanyId(userData.companyId);

          fetchPhoneIndex(userData.companyId);
        }
      }
    };

    fetchUserData();
  }, []);

  const fetchPhoneIndex = async (companyId: string) => {
    try {
      const companyDocRef = doc(firestore, 'companies', companyId);
      const companyDocSnap = await getDoc(companyDocRef);
      if (companyDocSnap.exists()) {
        const companyData = companyDocSnap.data();
        const phoneCount = companyData.phoneCount || 0;
        console.log('phoneCount for this company:', phoneCount);
        
        // Generate phoneNames object
        const phoneNamesData: { [key: number]: string } = {};
        for (let i = 0; i <= phoneCount; i++) {
          const phoneName = companyData[`phone${i}`];
          if (phoneName) {
            phoneNamesData[i] = phoneName;
          }
        }
        console.log('Phone names:', phoneNamesData);
        setPhoneNames(phoneNamesData);
        setPhoneOptions(Object.keys(phoneNamesData).map(Number));
      }
    } catch (error) {
      console.error("Error fetching phone count:", error);
      setPhoneOptions([]);
      setPhoneNames({});
    }
  };

  const filterContactsByUserRole = (contacts: Contact[], userRole: string, userName: string) => {
    switch (userRole) {
      case '1':
        return contacts; // Admin sees all contacts
      case '2':
        // Sales sees only contacts assigned to them
        return contacts.filter(contact => 
          contact.tags?.some(tag => tag.toLowerCase() === userName.toLowerCase())
        );
      case '3':
        // Observer sees only contacts assigned to them
        return contacts.filter(contact => 
          contact.tags?.some(tag => tag.toLowerCase() === userName.toLowerCase())
        );
      case '4':
        // Manager sees only contacts assigned to them
        return contacts.filter(contact => 
          contact.tags?.some(tag => tag.toLowerCase() === userName.toLowerCase())
        );
      case '5':
        return contacts;
      default:
        return [];
    }
  };
  const handleRemoveTagsFromContact = async (contact: Contact, tagsToRemove: string[]) => {
    if (userRole === "3") {
      toast.error("You don't have permission to remove tags.");
      return;
    }
  
    try {
      const user = auth.currentUser;
      if (!user) {
        console.error('No authenticated user');
        return;
      }
  
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) return;
  
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
  
      // Include empty tags in the tagsToRemove array
      const allTagsToRemove = [...tagsToRemove, ""];
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) throw new Error('No company document found');
      const companyData = docSnapshot.data();
      const baseUrl = companyData.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';
      const response = await axios.post(`${baseUrl}/api/contacts/remove-tags`, {
        companyId,
        contactPhone: contact.phone,
        tagsToRemove: allTagsToRemove
      });
  
      if (response.data.success) {
        // Update local state
        setContacts(prevContacts =>
          prevContacts.map(c =>
            c.id === contact.id
              ? { ...c, tags: response.data.updatedTags }
              : c
          )
        );
  
        toast.success('Tags removed successfully!');
        await fetchContacts();
      }
    } catch (error) {
      console.error('Error removing tags:', error);
      toast.error('Failed to remove tags');
    }
  };
  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const auth = getAuth();
      const firestore = getFirestore();
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
      const userRole = userData.role;
      const userName = userData.name;
  
      const contactsRef = collection(firestore, `companies/${companyId}/contacts`);
      const q = query(contactsRef,);
  
      const querySnapshot = await getDocs(q);
      const fetchedContacts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contact));
      console.log('Fetched contacts2:', fetchedContacts);
      // Function to check if a chat_id is for an individual contact
      const isIndividual = (chat_id: string | undefined) => {
        return chat_id?.endsWith('@c.us') || false;
      };
  
      // Separate contacts into categories
      const individuals = fetchedContacts.filter(contact => isIndividual(contact.chat_id || ''));
      const groups = fetchedContacts.filter(contact => !isIndividual(contact.chat_id || ''));
  
      // Combine all contacts in the desired order
      const allSortedContacts = [
        ...individuals,
        ...groups
      ];
// Helper function to get timestamp value
const getTimestamp = (createdAt: any): number => {
  if (!createdAt) return 0;
  if (typeof createdAt === 'string') {
    return new Date(createdAt).getTime();
  }
  if (createdAt.seconds) {
    return createdAt.seconds * 1000 + (createdAt.nanoseconds || 0) / 1000000;
  }
  return 0;
};

// Sort contacts based on createdAt
allSortedContacts.sort((a, b) => {
  const dateA = getTimestamp(a.createdAt);
  const dateB = getTimestamp(b.createdAt);
  return dateB - dateA; // For descending order
});
      const filteredContacts = filterContactsByUserRole(allSortedContacts, userRole, userName);
      
      setContacts(filteredContacts);
      setFilteredContacts(filteredContacts);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to fetch contacts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);


  useEffect(() => {
    const handleScroll = () => {
      if (
        contactListRef.current &&
        contactListRef.current.scrollTop + contactListRef.current.clientHeight >=
          contactListRef.current.scrollHeight
      ) {
        loadMoreContacts();
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
  }, [filteredContacts]);
  useEffect(() => {
    console.log('Selected tags updated:', selectedTags);
  }, [selectedTags]);
  const loadMoreContacts = () => {
    if (initialContacts.length <= contacts.length) return;

    const nextPage = currentPage + 1;
    const newContacts = initialContacts.slice(
      contacts.length,
      nextPage * contactsPerPage
    );

    setContacts((prevContacts) => [...prevContacts, ...newContacts]);
    setCurrentPage(nextPage);
  };
  const handleExportContacts = () => {
    if (userRole === "2" || userRole === "3") {
      toast.error("You don't have permission to export contacts.");
      return;
    }
  
    const exportOptions = [
      { id: 'selected', label: 'Export Selected Contacts' },
      { id: 'tagged', label: 'Export Contacts by Tag' },
    ];
  
    const exportModal = userRole === "1" ? (
      <Dialog open={true} onClose={() => setExportModalOpen(false)}>
        <Dialog.Panel className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Export Contacts</h3>
          <div className="space-y-4">
            {exportOptions.map((option) => (
              <button
                key={option.id}
                className="w-full p-2 text-left bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md"
                onClick={() => handleExportOption(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </Dialog.Panel>
      </Dialog>
    ) : null;
  
    setExportModalOpen(true);
    setExportModalContent(exportModal);
  };

  const handleExportOption = (option: string) => {
    setExportModalOpen(false);
  
    if (option === 'selected') {
      if (selectedContacts.length === 0) {
        toast.error("No contacts selected. Please select contacts to export.");
        return;
      }
      exportContactsToCSV(selectedContacts);
    } else if (option === 'tagged') {
      showTagSelectionModal();
    }
  };

  const TagSelectionModal = ({ onClose, onExport }: { onClose: () => void, onExport: (tags: string[]) => void }) => {
    const [localSelectedTags, setLocalSelectedTags] = useState<string[]>(selectedTags);
  
    const handleLocalTagSelection = (e: React.ChangeEvent<HTMLInputElement>, tagName: string) => {
      const isChecked = e.target.checked;
      setLocalSelectedTags(prevTags => 
        isChecked ? [...prevTags, tagName] : prevTags.filter(tag => tag !== tagName)
      );
    };
  
    return (
      <Dialog.Panel className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Select Tags to Export</h3>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {tagList.map((tag) => (
            <label key={tag.id} className="flex items-center space-x-2">
              <input
                type="checkbox"
                value={tag.name}
                checked={localSelectedTags.includes(tag.name)}
                onChange={(e) => handleLocalTagSelection(e, tag.name)}
                className="form-checkbox"
              />
              <span className="text-gray-700 dark:text-gray-300">{tag.name}</span>
            </label>
          ))}
                </div>
      <div className="mt-4 flex justify-end space-x-2">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          Cancel
        </button>
        <button
          onClick={() => onExport(localSelectedTags)}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          >
          Export
        </button>
      </div>
    </Dialog.Panel>
  );
};
const showTagSelectionModal = () => {
  setExportModalContent(
    <Dialog open={true} onClose={() => setExportModalOpen(false)}>
      <TagSelectionModal 
        onClose={() => setExportModalOpen(false)}
        onExport={(tags) => {
          console.log('Exporting with tags:', tags);
          exportContactsByTags(tags);
        }}
      />
    </Dialog>
  );
  setExportModalOpen(true);
};

const exportContactsByTags = (currentSelectedTags: string[]) => {
  console.log('Exporting contacts. Selected tags:', currentSelectedTags);

  if (currentSelectedTags.length === 0) {
    toast.error("No tags selected. Please select at least one tag.");
    return;
  }

  const contactsToExport = contacts.filter(contact => 
    contact.tags && contact.tags.some(tag => currentSelectedTags.includes(tag))
  );

  console.log('Contacts to export:', contactsToExport);

  if (contactsToExport.length === 0) {
    toast.error("No contacts found with the selected tags.");
    return;
  }

  exportContactsToCSV(contactsToExport);
  setExportModalOpen(false);
  setSelectedTags(currentSelectedTags);
};

const exportContactsToCSV = (contactsToExport: Contact[]) => {
  const csvData = contactsToExport.map(contact => ({
    contactName: contact.contactName || '',
    email: contact.email || '',
    phone: contact.phone || '',
    address: contact.address1 || '',
    company: contact.companyName || '',
    tags: (contact.tags || []).join(', ')
  }));

  const csv = Papa.unparse(csvData);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const fileName = `contacts_export_${new Date().toISOString()}.csv`;
  saveAs(blob, fileName);

  toast.success(`${contactsToExport.length} contacts exported successfully!`);
};

const handleTagSelection = (e: React.ChangeEvent<HTMLInputElement>, tagName: string) => {
  try {
    const isChecked = e.target.checked;
    setSelectedTags(prevTags => {
      if (isChecked) {
        return [...prevTags, tagName];
      } else {
        return prevTags.filter(tag => tag !== tagName);
      }
    });
  } catch (error) {
    console.error('Error handling tag selection:', error);
    toast.error("An error occurred while selecting tags. Please try again.");
  }
};

const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    setSelectedMedia(file);
  }
};

const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    setSelectedDocument(file);
  }
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

  
let role = 1;
let userName ='';

useEffect(() => {
  setTotalContacts(contacts.length);
}, [contacts]);

const handleTagFilterChange = (tagName: string) => {
  setSelectedTagFilters(prev => 
    prev.includes(tagName) 
      ? prev.filter(tag => tag !== tagName)
      : [...prev, tagName]
  );
};

const handleExcludeTag = (tag: string) => {
  setExcludedTags(prev => [...prev, tag]);
};

const handleRemoveExcludedTag = (tag: string) => {
  setExcludedTags(prev => prev.filter(t => t !== tag));
};

const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // If the number starts with '0', replace it with '60'
  // Otherwise, ensure it starts with '60'
  const formattedNumber = digits.startsWith('0')
    ? `60${digits.slice(1)}`
    : digits.startsWith('60')
    ? digits
    : `60${digits}`;
  
  // Add the '+' at the beginning
  return `+${formattedNumber}`;
};

const handleSaveNewContact = async () => {
  if (userRole === "3") {
    toast.error("You don't have permission to add contacts.");
    return;
  }

  try {
    if (!newContact.phone) {
      toast.error("Phone number is required.");
      return;
    }

    // Format the phone number
    const formattedPhone = formatPhoneNumber(newContact.phone);

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

    // Use the formatted phone number as the document ID
    const contactDocRef = doc(contactsCollectionRef, formattedPhone);

    // Check if a contact with this phone number already exists
    const existingContact = await getDoc(contactDocRef);
    if (existingContact.exists()) {
      toast.error("A contact with this phone number already exists.");
      return;
    }
    const chat_id = formattedPhone.split('+')[1]+"@c.us";
    // Prepare the contact data with the formatted phone number
    const contactData = {
      id: formattedPhone,
      chat_id: chat_id,
      contactName: newContact.contactName,
      lastName: newContact.lastName,
      email: newContact.email,
      phone: formattedPhone,
      address1: newContact.address1,
      companyName: newContact.companyName,
      locationId: newContact.locationId,
      dateAdded: new Date().toISOString(),
      unreadCount: 0,
      points: newContact.points || 0,
      branch: newContact.branch,
      expiryDate: newContact.expiryDate,
      vehicleNumber: newContact.vehicleNumber,
      ic: newContact.ic,
    };

    // Add new contact to Firebase
    await setDoc(contactDocRef, contactData);

    toast.success("Contact added successfully!");
    setAddContactModal(false);
    setContacts(prevContacts => [...prevContacts, contactData]);
    setNewContact({
      contactName: '',
      lastName: '',
      email: '',
      phone: '',
      address1: '',
      companyName: '',
      locationId: '',
      points: 0,
      branch: '',
      expiryDate: '',
      vehicleNumber: '',
      ic: '',
    });

    await fetchContacts();
  } catch (error) {
    console.error('Error adding contact:', error);
    toast.error("An error occurred while adding the contact: " + error);
  }
};

const handleSaveNewTag = async () => {
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

    const companyRef = doc(firestore, 'companies', companyId);
    const companySnapshot = await getDoc(companyRef);
    if (!companySnapshot.exists()) {
      console.log('No such document for company!');
      return;
    }
    const companyData = companySnapshot.data();
    
    if (companyData.v2) {
      // For v2 users, add tag to Firestore under the company's tags collection
      const tagsCollectionRef = collection(firestore, `companies/${companyId}/tags`);
      const newTagRef = await addDoc(tagsCollectionRef, {
        name: newTag,
        createdAt: serverTimestamp()
      });

      setTagList([...tagList, { id: newTagRef.id, name: newTag }]);
    } else {
      // Existing code for non-v2 users (using GHL API)
      const accessToken = companyData.ghl_accessToken;
      if (!accessToken) {
        console.error('Access token not found in company data');
        toast.error("Access token not found. Please check your configuration.");
        return;
      }
      const locationId = companyData.ghl_location;
      if (!locationId) {
        console.error('Location ID not found in company data');
        toast.error("Location ID not found. Please check your configuration.");
        return;
      }

      const apiUrl = `https://services.leadconnectorhq.com/locations/${locationId}/tags`;
      const response = await axios.post(apiUrl, 
        { name: newTag },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Version: '2021-07-28',
            'Content-Type': 'application/json',
            Accept: 'application/json'
          }
        }
      );
      console.log(response.data);
      setTagList([...tagList, response.data.tag]);
    }

    setShowAddTagModal(false);
    setNewTag("");
    toast.success("Tag added successfully!");
  } catch (error) {
    console.error('Error adding tag:', error);
    if (axios.isAxiosError(error)) {
      console.error('Error details:', error.response?.data);
    }
    toast.error("An error occurred while adding the tag.");
  }
};

const handleConfirmDeleteTag = async () => {
  if (!tagToDelete) return;

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

    // Delete the tag from the tags collection
    const tagRef = doc(firestore, `companies/${companyId}/tags`, tagToDelete.id);
    await deleteDoc(tagRef);

    // Remove the tag from all contacts
    const contactsRef = collection(firestore, `companies/${companyId}/contacts`);
    const contactsSnapshot = await getDocs(contactsRef);
    const batch = writeBatch(firestore);

    contactsSnapshot.forEach((doc) => {
      const contactData = doc.data();
      if (contactData.tags && contactData.tags.includes(tagToDelete.name)) {
        const updatedTags = contactData.tags.filter((tag: string) => tag !== tagToDelete.name);
        batch.update(doc.ref, { tags: updatedTags });
      }
    });

    await batch.commit();

    // Update local state
    setTagList(tagList.filter(tag => tag.id !== tagToDelete.id));
    setContacts(contacts.map(contact => ({
      ...contact,
      tags: contact.tags ? contact.tags.filter(tag => tag !== tagToDelete.name) : []
    })))

    setShowDeleteTagModal(false);
    setTagToDelete(null);
    toast.success("Tag deleted successfully!");
  } catch (error) {
    console.error('Error deleting tag:', error);
    toast.error("Failed to delete tag.");
  }
};

  const handleEyeClick = () => {
    setIsTabOpen(!isTabOpen);
  };
  
  const toggleContactSelection = (contact: Contact) => {
    const isSelected = selectedContacts.some((c) => c.id === contact.id);
    if (isSelected) {
      setSelectedContacts(selectedContacts.filter((c) => c.id !== contact.id));
    } else {
      setSelectedContacts([...selectedContacts, contact]);
    }
  };

  const isContactSelected = (contact: Contact) => {
    return selectedContacts.some((c) => c.id === contact.id);
  };

  const toggleSelectAll = () => {
    setSelectAll(!selectAll);
    if (!selectAll) {
      setSelectedContacts([...contacts]);
    } else {
      setSelectedContacts([]);
    }
  };
  const fetchTags = async (token: string, location: string, employeeList: string[]) => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('No authenticated user');
        setLoading(false);
        return;
      }

      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        setLoading(false);
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;

      const companyRef = doc(firestore, 'companies', companyId);
      const companySnapshot = await getDoc(companyRef);
      if (!companySnapshot.exists()) {
        console.log('No such document for company!');
        setLoading(false);
        return;
      }
      const companyData = companySnapshot.data();

      let tags: Tag[] = [];

      if (companyData.v2) {
        // For v2 users, fetch tags from Firestore
        const tagsCollectionRef = collection(firestore, `companies/${companyId}/tags`);
        const tagsSnapshot = await getDocs(tagsCollectionRef);
        tags = tagsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
      } else {
        // For non-v2 users, fetch tags from GHL API
        const maxRetries = 5;
        const baseDelay = 1000;

        const fetchData = async (url: string, retries: number = 0): Promise<any> => {
          const options = {
            method: 'GET',
            url: url,
            headers: {
              Authorization: `Bearer ${token}`,
              Version: '2021-07-28',
            },
          };
          await rateLimiter();
          try {
            const response = await axios.request(options);
            return response;
          } catch (error: any) {
            if (error.response && error.response.status === 429 && retries < maxRetries) {
              const delay = baseDelay * Math.pow(2, retries);
              console.warn(`Rate limit hit, retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              return fetchData(url, retries + 1);
            } else {
              throw error;
            }
          }
        };

        const url = `https://services.leadconnectorhq.com/locations/${location}/tags`;
        const response = await fetchData(url);
        tags = response.data.tags;
      }

      const normalizedEmployeeNames = employeeList.map(name => name.toLowerCase());

      const filteredTags = tags.filter((tag: Tag) => 
        !normalizedEmployeeNames.includes(tag.name.toLowerCase())
      );

      setTagList(filteredTags);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tags:', error);
      setLoading(false);
    }
  };
  useEffect(() => {
    // Ensure employee names are properly stored when fetched
    const normalizedEmployeeNames = employeeList.map(employee => employee.name.toLowerCase());
    setEmployeeNames(normalizedEmployeeNames);
  }, [employeeList]);
  async function fetchCompanyData() {
    const user = auth.currentUser;
    try {
      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
      }

      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
      role = userData.role;
      userName = userData.name;
      setShowAddUserButton(userData.role === "1");
      setUserRole(userData.role); // Set the user's role

      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.log('No such document for company!');
        return;
      }
      const companyData = docSnapshot.data();
      console.log(companyData.tags);
      console.log('tags');
      setStopbot(companyData.stopbot || false);
      console.log(stopbot);
      console.log('stopbot');
      const employeeRef = collection(firestore, `companies/${companyId}/employee`);
      const employeeSnapshot = await getDocs(employeeRef);

      const employeeListData: Employee[] = [];
      employeeSnapshot.forEach((doc) => {
        employeeListData.push({ id: doc.id, ...doc.data() } as Employee);
      });
     console.log(employeeListData);
      setEmployeeList(employeeListData);
      const employeeNames = employeeListData.map(employee => employee.name.trim().toLowerCase());
      setEmployeeNames(employeeNames);
    
      if (companyData.v2 !== true) {
        await fetchTags(companyData.ghl_accessToken, companyData.ghl_location, employeeNames);
      } else {
        console.log('v2');
        const tagsCollectionRef = collection(firestore, `companies/${companyId}/tags`);
        const tagsSnapshot = await getDocs(tagsCollectionRef);
        const tagsArray = tagsSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name
        }));
        setTagList(tagsArray);
      }
      setLoading(false);
     // await searchContacts(companyData.ghl_accessToken, companyData.ghl_location);


    } catch (error) {
      console.error('Error fetching company data:', error);
    }
  }
  const toggleBot = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) return;

      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;

      const companyRef = doc(firestore, 'companies', companyId);
      await updateDoc(companyRef, {
        stopbot: !stopbot
      });
      setStopbot(!stopbot);
      toast.success(`Bot ${stopbot ? 'activated' : 'deactivated'} successfully!`);
    } catch (error) {
      console.error('Error toggling bot:', error);
      toast.error('Failed to toggle bot status.');
    }
  };
  const verifyContactIdExists = async (contactId: string, accessToken: string) => {
    try {
      const user = auth.currentUser;
      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return false;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
      const docRef = doc(firestore, `companies/${companyId}/contacts`, contactId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.log('No such document for contact!');
        return false;
      }
  
      // If the contact exists, return true
      return true;
    } catch (error) {
      console.error('Error verifying contact ID:', error);
      return false;
    }
  };

  
  
  const handleAddTagToSelectedContacts = async (tagName: string, contact: Contact) => {
    if (userRole === "3") {
      toast.error("You don't have permission to assign users to contacts.");
      return;
    }
  
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
      if (!docSnapshot.exists()) throw new Error('No company document found');
      const companyData = docSnapshot.data();
      const baseUrl = companyData.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';
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
  
      // Prepare update data
      const updateData: any = {
        tags: arrayUnion(tagName)
      };
  
      // Only include points if it's defined
      if (contact.points !== undefined) {
        updateData.points = contact.points;
      }
  
      // If the tag is 'closed', add 5 points to the contact
      if (tagName.toLowerCase() === 'closed') {
        updateData.points = (contact.points || 0) + 5;
      }
  
      await updateDoc(contactRef, updateData);
  
      // Update local state
      setContacts(prevContacts =>
        prevContacts.map(c =>
          c.id === contact.id
            ? { ...c, tags: [...(c.tags || []), tagName] }
            : c
        )
      );
  
      if (selectedContact && selectedContact.id === contact.id) {
        setSelectedContact((prevContact: Contact) => ({
          ...prevContact,
          tags: [...(prevContact.tags || []), tagName]
        }));
      }
  
      // If this is a trigger tag, call the follow-up API
      if (matchingTemplate) {
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
      }
  
      toast.success(`Tag "${tagName}" added to contact successfully!`);
  
      // Send assignment notification
      const employee = employeeList.find(emp => emp.name === tagName);
      if (employee) {
        await sendAssignmentNotification(tagName, contact);
      }
  
      await fetchContacts();
  
    } catch (error) {
      console.error('Error adding tag and assigning contact:', error);
      toast.error('Failed to add tag and assign contact.');
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
  
      if (!assignedEmployee.phoneNumber) {
        console.error(`Phone number missing for employee: ${assignedEmployeeName}`);
        toast.error(`Failed to send assignment notification: Phone number missing for ${assignedEmployeeName}`);
        return;
      }
  
      // Format the phone number for WhatsApp chat_id
      const employeePhone = `${assignedEmployee.phoneNumber.replace(/[^\d]/g, '')}@c.us`;
      console.log('Formatted employee chat_id:', employeePhone);
  
      if (!employeePhone || !/^\d+@c\.us$/.test(employeePhone)) {
        console.error('Invalid employeePhone:', employeePhone);
        throw new Error('Invalid employeePhone');
      }
  
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.error('No company document found');
        return;
      }
      const companyData = docSnapshot.data();
      const baseUrl = companyData.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';
      let message = `Hello ${assignedEmployee.name}, a new contact has been assigned to you:\n\nName: ${contact.contactName || contact.firstName || 'N/A'}\nPhone: ${contact.phone}\n\nPlease follow up with them as soon as possible.`;
      if(companyId == '042'){
        message = `Hi ${assignedEmployee.employeeId || assignedEmployee.phoneNumber} ${assignedEmployee.name}.\n\nAnda telah diberi satu prospek baharu\n\nSila masuk ke https://web.jutasoftware.co/login untuk melihat perbualan di antara Zahin Travel dan prospek.\n\nTerima kasih.\n\nIkhlas,\nZahin Travel Sdn. Bhd. (1276808-W)\nNo. Lesen Pelancongan: KPK/LN 9159\nNo. MATTA: MA6018\n\n#zahintravel - Nikmati setiap detik..\n#diyakini\n#responsif\n#budibahasa`;
      }
      let phoneIndex;
      if (userData?.phone !== undefined) {
          if (userData.phone === 0) {
              // Handle case for phone index 0
              phoneIndex = 0;
          } else if (userData.phone === -1) {
              // Handle case for phone index -1
              phoneIndex = 0;
          } else {
              // Handle other cases
              console.log(`User phone index is: ${userData.phone}`);
              phoneIndex = userData.phone;
          }
      } else {
          console.error('User phone is not defined');
          phoneIndex = 0; // Default value if phone is not defined
      }
      let url;
      let requestBody;
      if (companyData.v2 === true) {
        console.log("v2 is true");
        url = `${baseUrl}/api/v2/messages/text/${companyId}/${employeePhone}`;
        requestBody = { message, 
          phoneIndex  };
        } else {
        console.log("v2 is false");
        url = `${baseUrl}/api/messages/text/${employeePhone}/${companyData.whapiToken}`;
        requestBody = { message, 
          phoneIndex  };
      }
  
      console.log('Sending request to:', url);
      console.log('Request body:', JSON.stringify(requestBody));
  
      console.log('Full request details:', {
        url,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message,
          phoneIndex: phoneIndex,
        })
      });
  
      // Send WhatsApp message to the employee
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
    
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
  
      const responseData = await response.json();
      console.log('Assignment notification response:', responseData);
      console.log('Sent to phone number:', employeePhone);
  
      // Mark notification as sent
      await setDoc(notificationRef, {
        sentAt: serverTimestamp(),
        employeeName: assignedEmployeeName,
        contactId: contact.id
      });
  
      toast.success("Assignment notification sent successfully!");
    } catch (error) {
      console.error('Error sending assignment notification:', error);
      
      // Instead of throwing the error, we'll handle it here
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        toast.error('Network error. Please check your connection and try again.');
      } else {
        toast.error('Failed to send assignment notification. Please try again.');
      }
      
      // Log additional information that might be helpful
      console.log('Assigned Employee Name:', assignedEmployeeName);
      console.log('Contact:', contact);
      console.log('Employee List:', employeeList);
      console.log('Company ID:', companyId);
    }
  };

  const handleSyncConfirmation = () => {
    if (!isSyncing) {
      setShowSyncConfirmationModal(true);
    }
  };

  const handleConfirmSync = async () => {
    setShowSyncConfirmationModal(false);
    await handleSyncContact();
  };

  const handleSyncContact = async () => {
    try {
      console.log('Starting contact synchronization process');
      setFetching(true);
      const user = auth.currentUser;
      if (!user) {
        console.log('User not authenticated');
        setFetching(false);
        toast.error("User not authenticated");
        return;
      }

      console.log('Fetching user document');
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('User document not found');
        setFetching(false);
        toast.error("User document not found");
        return;
      }

      const userData = docUserSnapshot.data();
      const companyId = userData?.companyId;
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) throw new Error('No company document found');
      const companyData = docSnapshot.data();
      const baseUrl = companyData.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';
      if (!companyId) {
        console.log('Company ID not found');
        setFetching(false);
        toast.error("Company ID not found");
        return;
      }

      console.log(`Initiating sync for company ID: ${companyId}`);
      // Call the new API endpoint
      const response = await axios.post(`${baseUrl}/api/sync-contacts/${companyId}`);

      if (response.status === 200 && response.data.success) {
        console.log('Contact synchronization started successfully');
        toast.success("Contact synchronization started successfully");
        // You might want to add some UI indication that sync is in progress
      } else {
        console.error('Failed to start contact synchronization:', response.data.error);
        throw new Error(response.data.error || "Failed to start contact synchronization");
      }

    } catch (error) {
      console.error('Error syncing contacts:', error);
      toast.error("An error occurred while syncing contacts: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      console.log('Contact synchronization process completed');
      setFetching(false);
    }
  };
  
  const handleRemoveTag = async (contactId: string, tagName: string) => {
    console.log('removing tag', tagName);
    if (userRole === "3") {
      toast.error("You don't have permission to perform this action.");
      return;
    }
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
      if (!docSnapshot.exists()) throw new Error('No company document found');
      const companyData = docSnapshot.data();
      const baseUrl = companyData.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';
      const contactRef = doc(firestore, `companies/${companyId}/contacts`, contactId);
      const contactDoc = await getDoc(contactRef);
      const contactData = contactDoc.data();
      
      // Remove the tag from the contact's tags array
      await updateDoc(contactRef, {
        tags: arrayRemove(tagName)
      });
  
    // Check if tag is a trigger tag
    const templatesRef = collection(firestore, 'companies', companyId, 'followUpTemplates');
    const templatesSnapshot = await getDocs(templatesRef);
    
    // Find all templates where this tag is a trigger
    const matchingTemplates = templatesSnapshot.docs
      .filter(doc => {
        const template = doc.data();
        return template.triggerTags?.includes(tagName) && template.status === 'active';
      })
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

    // If we found matching templates, call the follow-up API for each one
    for (const template of matchingTemplates) {
      try {
        const phoneNumber = contactId.replace(/\D/g, '');
        const response = await fetch(`${baseUrl}/api/tag/followup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requestType: 'removeTemplate',
            phone: phoneNumber,
            first_name: contactData?.contactName || phoneNumber,
            phoneIndex: userData.phone || 0,
            templateId: template.id, // Using the actual template document ID
            idSubstring: companyId
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to remove template messages:', errorText);
        } else {
          console.log(`Follow-up template ${template.id} removed successfully`);
          toast.success('Follow-up sequence stopped');
        }
      } catch (error) {
        console.error('Error removing template messages:', error);
      }
    }

  
      // Update local state
      setContacts(prevContacts =>
        prevContacts.map(contact =>
          contact.id === contactId
            ? { ...contact, tags: contact.tags?.filter(tag => tag !== tagName) }
            : contact
        )
      );
  
      if (currentContact?.id === contactId) {
        setCurrentContact((prevContact: any) => ({
          ...prevContact,
          tags: prevContact.tags?.filter((tag: string) => tag !== tagName),
        }));
      }
  
      toast.success(`Tag "${tagName}" removed successfully!`);
      await fetchContacts();
    } catch (error) {
      console.error('Error removing tag:', error);
      toast.error('Failed to remove tag.');
    }
  };

  async function updateContactTags(contactId: string, accessToken: string, tags: string[], tagName:string) {
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
      if (!docSnapshot.exists()) {
        console.log('No such document for company!');
        return;
      }
      const companyData = docSnapshot.data();
  
      await updateDoc(doc(firestore, 'companies', companyId, 'contacts', contactId), {
        tags: arrayRemove(tagName)
      });
  
      // Update state
      setContacts(prevContacts =>
        prevContacts.map(contact =>
          contact.id === contactId
            ? { ...contact, tags: contact.tags!.filter(tag => tag !== tagName) }
            : contact
        )
      );

      const updatedContacts = contacts.map((contact: Contact) =>
        contact.id === contactId
          ? { ...contact, tags: contact.tags!.filter((tag: string) => tag !== tagName) }
          : contact
      );

      const updatedSelectedContact = updatedContacts.find(contact => contact.id === contactId);
      if (updatedSelectedContact) {
        setSelectedContacts(prevSelectedContacts =>
          prevSelectedContacts.map(contact =>
            contact.id === contactId
              ? { ...contact, tags: contact.tags!.filter(tag => tag !== tagName) }
              : contact
          )
        );
      }
      
      localStorage.setItem('contacts', LZString.compress(JSON.stringify(updatedContacts)));
      sessionStorage.setItem('contactsFetched', 'true');
      
      toast.success('Tag removed successfully!');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error updating contact tags:', error.response?.data || error.message);
      } else {
        console.error('Unexpected error updating contact tags:', error);
      }
      return false;
    }
  }

  const navigate = useNavigate(); // Initialize useNavigate
  const handleClick = (phone: any) => {
const tempphone = phone.split('+')[1];
const chatId = tempphone + "@c.us"
    navigate(`/chat/?chatId=${chatId}`);
  };
  async function searchContacts(accessToken: string, locationId: string) {
    setLoading(true);
    setFetching(true);
    setProgress(0);
    try {
      let allContacts: any[] = [];
      let fetchMore = true;
      let nextPageUrl = `https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&limit=100`;
  
      const maxRetries = 5;
      const baseDelay = 5000;
  
      const fetchData = async (url: string, retries: number = 0): Promise<any> => {
        const options = {
          method: 'GET',
          url: url,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Version: '2021-07-28',
          },
        };
        try {
          const response = await axios.request(options);
          console.log(response.data.meta.total);
          return response;
        } catch (error: any) {
          if (error.response && error.response.status === 429 && retries < maxRetries) {
            const delay = baseDelay * Math.pow(2, retries);
            console.warn(`Rate limit hit, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchData(url, retries + 1);
          } else {
            throw error;
          }
        }
      };
  
      let fetchedContacts = 0;
      let totalContacts = 0;
      while (fetchMore) {
        const response = await fetchData(nextPageUrl);
        const contacts = response.data.contacts;
        totalContacts = response.data.meta.total;
  
        if (contacts.length > 0) {
          allContacts = [...allContacts, ...contacts];
          if (role === 2) {
            const filteredContacts = allContacts.filter(contact => contact.tags.some((tag: string) => typeof tag === 'string' && tag.toLowerCase().includes(userName.toLowerCase())));
            setContacts([...filteredContacts]);
          } else {
            setContacts([...allContacts]);
          }
  
          fetchedContacts = allContacts.length;
          setTotal(totalContacts);
          setFetched(fetchedContacts);
          setProgress((fetchedContacts / totalContacts) * 100);
          setLoading(false);
        }
  
        if (response.data.meta.nextPageUrl) {
          nextPageUrl = response.data.meta.nextPageUrl;
        } else {
          fetchMore = false;
        }
      }
    } catch (error) {
      console.error('Error searching contacts:', error);
    } finally {
      setFetching(false);
    }
  }
  const handleEditContact = (contact: Contact) => {
    setCurrentContact(contact);
    setEditContactModal(true);
  };

  const handleViewContact = (contact: Contact) => {
    setCurrentContact(contact);
    setViewContactModal(true);
  };

  const handleDeleteContact = async () => {
    if (userRole === "3") {
      toast.error("You don't have permission to perform this action.");
      return;
    }
    if (currentContact) {
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
        if (!docSnapshot.exists()) throw new Error('No company document found');
        const companyData = docSnapshot.data();
        const baseUrl = companyData.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';

        // Format the contact's phone number for comparison with chatIds
        const contactChatId = currentContact.phone?.replace(/\D/g, '') + "@s.whatsapp.net";
  
        // Check and delete scheduled messages containing this contact
        const scheduledMessagesRef = collection(firestore, `companies/${companyId}/scheduledMessages`);
        const scheduledSnapshot = await getDocs(scheduledMessagesRef);
        
        const deletePromises = scheduledSnapshot.docs.map(async (doc) => {
          const messageData = doc.data();
          if (messageData.chatIds?.includes(contactChatId)) {
            if (messageData.chatIds.length === 1) {
              // If this is the only recipient, delete the entire scheduled message
              try {
                await axios.delete(`https://mighty-dane-newly.ngrok-free.app/api/schedule-message/${companyId}/${doc.id}`);
                console.log(`Deleted scheduled message ${doc.id}`);
              } catch (error) {
                console.error(`Error deleting scheduled message ${doc.id}:`, error);
              }
            } else {
              // If there are other recipients, remove this contact from the recipients list
              const updatedChatIds = messageData.chatIds.filter((id: string) => id !== contactChatId);
              const updatedMessages = messageData.messages?.filter((msg: any) => msg.chatId !== contactChatId) || [];
              
              try {
                await axios.put(
                  `https://mighty-dane-newly.ngrok-free.app/api/schedule-message/${companyId}/${doc.id}`,
                  {
                    ...messageData,
                    chatIds: updatedChatIds,
                    messages: updatedMessages
                  }
                );
                console.log(`Updated scheduled message ${doc.id}`);
              } catch (error) {
                console.error(`Error updating scheduled message ${doc.id}:`, error);
              }
            }
          }
        });

        // Wait for all scheduled message updates/deletions to complete
        await Promise.all(deletePromises);
  
        // Check for active templates
        const templatesRef = collection(firestore, `companies/${companyId}/followUpTemplates`);
        const templatesSnapshot = await getDocs(templatesRef);
        
        // Get all active templates
        const activeTemplates = templatesSnapshot.docs
          .filter(doc => doc.data().status === 'active')
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
  
        // Remove templates for this contact
        if (activeTemplates.length > 0) {
          const phoneNumber = currentContact.phone?.replace(/\D/g, '');
          
          for (const template of activeTemplates) {
            try {
              const response = await fetch(`${baseUrl}/api/tag/followup`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  requestType: 'removeTemplate',
                  phone: phoneNumber,
                  first_name: currentContact.contactName || phoneNumber,
                  phoneIndex: userData.phone || 0,
                  templateId: template.id,
                  idSubstring: companyId
                }),
              });
  
              if (!response.ok) {
                const errorText = await response.text();
                console.error('Failed to remove template messages:', errorText);
              } else {
                console.log(`Follow-up template ${template.id} removed for contact ${phoneNumber}`);
              }
            } catch (error) {
              console.error('Error removing template messages:', error);
            }
          }
        }
  
        // Delete the contact from Firestore
        const contactRef = doc(firestore, `companies/${companyId}/contacts`, currentContact.id!);
        await deleteDoc(contactRef);
  
        // Update local state
        setContacts(prevContacts => prevContacts.filter(contact => contact.id !== currentContact.id));
        setScheduledMessages(prev => prev.filter(msg => !msg.chatIds.includes(contactChatId)));
        setDeleteConfirmationModal(false);
        setCurrentContact(null);
        
        toast.success("Contact and associated scheduled messages deleted successfully!");
        await fetchContacts();
        await fetchScheduledMessages(); // Refresh scheduled messages list
      } catch (error) {
        console.error('Error deleting contact:', error);
        toast.error("An error occurred while deleting the contact.");
      }
    }
  };

  const handleMassDelete = async () => {
    if (userRole === "3") {
      toast.error("You don't have permission to perform this action.");
      return;
    }
    if (selectedContacts.length === 0) {
      toast.error("No contacts selected for deletion.");
      return;
    }
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
  
      // Delete selected contacts from Firestore
      const batch = writeBatch(firestore);
      selectedContacts.forEach(contact => {
        const contactRef = doc(firestore, `companies/${companyId}/contacts`, contact.id!);
        batch.delete(contactRef);
      });
      await batch.commit();
  
      // Update local state
      setContacts(prevContacts => prevContacts.filter(contact => !selectedContacts.some(selected => selected.id === contact.id)));
      setSelectedContacts([]);
      setShowMassDeleteModal(false);
      toast.success(`${selectedContacts.length} contacts deleted successfully!`);
      await fetchContacts();
    } catch (error) {
      console.error('Error deleting contacts:', error);
      toast.error("An error occurred while deleting the contacts.");
    }
  };

  const handleSaveContact = async () => {
    if (currentContact) {
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
  
        // Create an object with all fields, including custom fields
        const updateData: { [key: string]: any } = {};
  
        const fieldsToUpdate = [
          'contactName', 'email', 'lastName', 'phone', 'address1', 'city', 
          'state', 'postalCode', 'website', 'dnd', 'dndSettings', 'tags', 
          'source', 'country', 'companyName', 'branch', 
          'expiryDate', 'vehicleNumber', 'points', 'IC', 'assistantId', 'threadid',
        ];
  
        fieldsToUpdate.forEach(field => {
          if (currentContact[field as keyof Contact] !== undefined && currentContact[field as keyof Contact] !== null) {
            updateData[field] = currentContact[field as keyof Contact];
          }
        });
  
        // Ensure customFields are included in the update if they exist
        if (currentContact.customFields && Object.keys(currentContact.customFields).length > 0) {
          updateData.customFields = currentContact.customFields;
        }
  
        // Update contact in Firebase
        const contactDocRef = doc(contactsCollectionRef, currentContact.phone!);
        await updateDoc(contactDocRef, updateData);
  
        // Update local state immediately after saving
        setContacts(prevContacts => 
          prevContacts.map(contact => 
            contact.phone === currentContact.phone ? { ...contact, ...updateData } : contact
          )
        );
  
        setEditContactModal(false);
        setCurrentContact(null);
        await fetchContacts();
        toast.success("Contact updated successfully!");
      } catch (error) {
        console.error('Error saving contact:', error);
        toast.error("Failed to update contact.");
      }
    }
  };
// Function to add a new custom field to all contacts
const addCustomFieldToAllContacts = async (fieldName: string) => {
  try {
    const user = auth.currentUser;
    if (!user) return;

    const docUserRef = doc(firestore, 'user', user.email!);
    const docUserSnapshot = await getDoc(docUserRef);
    if (!docUserSnapshot.exists()) {
      console.log('No such document for user!');
      return;
    }
    const userData = docUserSnapshot.data();
    const companyId = userData.companyId;

    const contactsCollectionRef = collection(firestore, `companies/${companyId}/contacts`);
    const contactsSnapshot = await getDocs(contactsCollectionRef);

    const batch = writeBatch(firestore);

    contactsSnapshot.forEach((doc) => {
      const contactRef = doc.ref;
      batch.update(contactRef, {
        [`customFields.${fieldName}`]: ""
      });
    });

    await batch.commit();

    // Update local state
    setContacts(prevContacts => 
      prevContacts.map(contact => ({
        ...contact,
        customFields: {
          ...contact.customFields,
          [fieldName]: ""
        }
      }))
    );

    toast.success(`New custom field "${fieldName}" added to all contacts.`);
  } catch (error) {
    console.error('Error adding custom field to all contacts:', error);
    toast.error('Failed to add custom field to all contacts.');
  }
};
// Add this function to combine similar scheduled messages
const combineScheduledMessages = (messages: ScheduledMessage[]): ScheduledMessage[] => {
  const combinedMessages: { [key: string]: ScheduledMessage } = {};

  messages.forEach(message => {
    const key = `${message.message}-${message.scheduledTime.toDate().getTime()}`;
    if (combinedMessages[key]) {
      combinedMessages[key].count = (combinedMessages[key].count || 1) + 1;
    } else {
      combinedMessages[key] = { ...message, count: 1 };
    }
  });

  // Convert the object to an array and sort it
  return Object.values(combinedMessages).sort((a, b) => 
    compareAsc(a.scheduledTime.toDate(), b.scheduledTime.toDate())
  );
};

useEffect(() => {
  fetchCompanyData();
}, []);

// Add a user filter change handler
const handleUserFilterChange = (userName: string) => {
  setSelectedUserFilters(prev => 
    prev.includes(userName) 
      ? prev.filter(user => user !== userName)
      : [...prev, userName]
  );
};

const clearAllFilters = () => {
  setSelectedTagFilters([]);
  setSelectedUserFilters([]);
  setExcludedTags([]);
};

const filteredContactsSearch = useMemo(() => {
  return contacts.filter((contact) => {
    const name = (contact.contactName || '').toLowerCase();
    const phone = (contact.phone || '').toLowerCase();
    const tags = (contact.tags || []).map(tag => tag.toLowerCase());
    
    const matchesSearch = name.includes(searchQuery.toLowerCase()) || 
                          phone.includes(searchQuery.toLowerCase()) || 
                          tags.some(tag => tag.includes(searchQuery.toLowerCase()));

    const matchesTagFilters = selectedTagFilters.length === 0 || 
                              selectedTagFilters.every(filter => tags.includes(filter.toLowerCase()));
    const matchesUserFilters = selectedUserFilters.length === 0 || 
                               selectedUserFilters.some(filter => tags.includes(filter.toLowerCase()));
    const notExcluded = !excludedTags.some(tag => tags.includes(tag.toLowerCase()));

    return matchesSearch && matchesTagFilters && matchesUserFilters && notExcluded;
  });
}, [contacts, searchQuery, selectedTagFilters, selectedUserFilters, excludedTags]);

const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setSearchQuery(e.target.value);
};

const endOffset = itemOffset + itemsPerPage;
const currentContacts = filteredContactsSearch.slice(itemOffset, endOffset);
const pageCount = Math.ceil(filteredContactsSearch.length / itemsPerPage);

const handlePageClick = (event: { selected: number }) => {
  const newOffset = (event.selected * itemsPerPage) % filteredContactsSearch.length;
  setItemOffset(newOffset);
};

useEffect(() => {
  console.log('Contacts:', contacts);
  console.log('Filtered Contacts:', filteredContactsSearch);
  console.log('Search Query:', searchQuery);
}, [contacts, filteredContactsSearch, searchQuery]);


//faeez incompetent

const sendBlastMessage = async () => {
  console.log('Starting sendBlastMessage function');

  // Combine date and time
  const combinedDateTime = new Date(
    blastStartDate.getFullYear(),
    blastStartDate.getMonth(),
    blastStartDate.getDate(),
    blastStartTime?.getHours() || 0,
    blastStartTime?.getMinutes() || 0
  );

  if (selectedContacts.length === 0) {
    console.log('No contacts selected');
    toast.error("No contacts selected!");
    return;
  }

  if (!blastStartTime) {
    console.log('No start time selected');
    toast.error("Please select a start time for the blast message.");
    return;
  }

  const now = new Date();
  const scheduledTime = new Date(combinedDateTime);

  

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

    const companyRef = doc(firestore, 'companies', companyId);
    const companySnapshot = await getDoc(companyRef);
    if (!companySnapshot.exists()) {
      console.log('No such document for company!');
      return;
    }
    const companyData = companySnapshot.data();
    const baseUrl = companyData.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';
    const isV2 = companyData.v2 || false;
    const whapiToken = companyData.whapiToken || '';

    const chatIds = selectedContacts.map(contact => {
      const phoneNumber = contact.phone?.replace(/\D/g, '');
      return phoneNumber ? phoneNumber + "@s.whatsapp.net" : null;
    }).filter(chatId => chatId !== null);

    if (chatIds.length === 0) {
      toast.error("No valid chat IDs found in selected contacts.");
      return;
    }

    // Process message for each contact
    const processedMessages = selectedContacts.map(contact => {
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
      processedMessage = processedMessage.replace(/@{ic}/g, contact.ic || '');
      // Add more placeholders as needed
      return { chatId: contact.phone?.replace(/\D/g, '') + "@s.whatsapp.net", message: processedMessage };
    });

    const scheduledMessageData = {
      chatIds: chatIds,
      phoneIndex: phoneIndex,
      message: blastMessage,
      messages: processedMessages,
      batchQuantity: batchQuantity,
      companyId: companyId,
      createdAt: Timestamp.now(),
      documentUrl: documentUrl || "",
      fileName: selectedDocument ? selectedDocument.name : null,
      mediaUrl: mediaUrl || "",
      mimeType: selectedMedia ? selectedMedia.type : (selectedDocument ? selectedDocument.type : null),
      repeatInterval: repeatInterval,
      repeatUnit: repeatUnit,
      scheduledTime: Timestamp.fromDate(scheduledTime),
      status: "scheduled",
      v2: isV2,
      whapiToken: isV2 ? null : whapiToken,
      minDelay,
      maxDelay,
      activateSleep,
      sleepAfterMessages: activateSleep ? sleepAfterMessages : null,
      sleepDuration: activateSleep ? sleepDuration : null,
    };

    console.log('Sending scheduledMessageData:', JSON.stringify(scheduledMessageData, null, 2));

    // Make API call to schedule the messages
    const response = await axios.post(`${baseUrl}/api/schedule-message/${companyId}`, scheduledMessageData);

    console.log(`Scheduled messages added. Document ID: ${response.data.id}`);

    // Show success toast
    toast.success(`Blast messages scheduled successfully for ${selectedContacts.length} contacts.`);
    toast.info(`Messages will be sent at: ${scheduledTime.toLocaleString()} (local time)`);

    // Refresh the scheduled messages list
    await fetchScheduledMessages();

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
    console.error('Error scheduling blast messages:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('Server response:', error.response.data);
      console.error('Server status:', error.response.status);
      console.error('Server headers:', error.response.headers);
      const errorMessage = error.response.data.error || 'Unknown server error';
      toast.error(`Failed to schedule message: ${errorMessage}`);
    } else {
      console.error('Unexpected error:', error);
      toast.error("An unexpected error occurred while scheduling blast messages.");
    }
  } finally {
    setIsScheduling(false);
  }

  console.log('sendBlastMessage function completed');
};
  

  const sendImageMessage = async (id: string, imageUrl: string,caption?: string) => {
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
      if (!docSnapshot.exists()) {
        console.log('No such document for company!');
        return;
      }
      const phoneNumber = id.split('+')[1];
      const chat_id = phoneNumber+"@s.whatsapp.net"
      const companyData = docSnapshot.data();
      const baseUrl = companyData.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';
      const response = await fetch(`${baseUrl}/api/messages/image/${companyData.whapiToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId: chat_id,
          imageUrl: imageUrl,
          caption: caption || '',
        }),
      });
  
      if (!response.ok) {
        throw new Error(`Failed to send image message: ${response.statusText}`);
      }
  
      const data = await response.json();
    
      console.log('Image message sent successfully:', data);
    } catch (error) {
      console.error('Error sending image message:', error);
    }
  };
  
  const sendDocumentMessage = async (id: string, imageUrl: string,mime_type:string,fileName:string, caption?: string,) => {
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
      if (!docSnapshot.exists()) {
        console.log('No such document for company!');
        return;
      }
      const phoneNumber = id.split('+')[1];
      const chat_id = phoneNumber+"@s.whatsapp.net"
      const companyData = docSnapshot.data();
      const baseUrl = companyData.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';
      const response = await fetch(`${baseUrl}/api/messages/document/${companyData.whapiToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId: chat_id,
          imageUrl: imageUrl,
          mimeType:mime_type,
          fileName:fileName,
          caption: caption || '',
        }),
      });
  
      if (!response.ok) {
        throw new Error(`Failed to send image message: ${response.statusText}`);
      }
  
      const data = await response.json();
  
      console.log('Image message sent successfully:', data);
    } catch (error) {
      console.error('Error sending image message:', error);
    }
  };

  const handleCsvFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedCsvFile(file);
    }
  };

  const [importTags, setImportTags] = useState<string[]>([]);

  const handleCsvImport = async () => {
    if (!selectedCsvFile) {
      toast.error("Please select a CSV file to import.");
      return;
    }
  
    try {
      setLoading(true);
  
      // Read CSV data
      const parseCSV = async (): Promise<Array<any>> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const text = event.target?.result as string;
            const lines = text.split('\n');
            const headers = lines[0].toLowerCase().trim().split(',');
            const data = lines.slice(1)
              .filter(line => line.trim()) // Skip empty lines
              .map(line => {
                const values = line.split(',');
                return headers.reduce((obj: any, header, index) => {
                  obj[header.trim()] = values[index]?.trim() || '';
                  return obj;
                }, {});
              });
            resolve(data);
          };
          reader.onerror = () => reject(new Error('Failed to read CSV'));
          reader.readAsText(selectedCsvFile);
        });
      };
  
      // Get user and company data
      const user = auth.currentUser;
      if (!user?.email) throw new Error('User not authenticated');
  
      const docUserRef = doc(firestore, 'user', user.email);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) throw new Error('User document not found');
  
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
  
      // Parse CSV data
      const contacts = await parseCSV();
      console.log('Parsed contacts:', contacts);
  
      // Validate contacts
      const validContacts = contacts.filter(contact => {
        const isValid = contact.contactname && contact.phone;
        if (!isValid) {
          console.warn('Invalid contact:', contact);
        }
        return isValid;
      });
  
      if (validContacts.length === 0) {
        throw new Error('No valid contacts found in CSV');
      }
  
      // Create contacts in batches of 500 (Firestore limit)
      const batchSize = 500;
      const batches = [];
      
      for (let i = 0; i < validContacts.length; i += batchSize) {
        const batch = writeBatch(firestore);
        const batchContacts = validContacts.slice(i, i + batchSize);
  
        for (const contact of batchContacts) {
           // Format phone number (remove any non-digit characters)
          let phoneNumber = contact.phone.replace(/\D/g, '');
          
          // Add proper prefix based on the starting digits
          if (phoneNumber.startsWith('60')) {
            phoneNumber = '+' + phoneNumber;
          } else if (phoneNumber.startsWith('0')) {
            phoneNumber = '+6' + phoneNumber;
          } else if (phoneNumber.startsWith('1')) {
            phoneNumber = '+60' + phoneNumber;
          } else {
            console.warn('Invalid phone number format:', contact.phone);
            continue;
          }

          // Validate final phone number format
          if (!phoneNumber.match(/^\+60\d{9,10}$/)) {
            console.warn('Invalid Malaysian phone number:', phoneNumber);
            continue;
          }
  
          const contactRef = doc(firestore, `companies/${companyId}/contacts`, phoneNumber);
          
          // Prepare contact data
          const contactData = {
            contactName: contact.contactname,
            phone: phoneNumber,
            email: contact.email || '',
            lastName: contact.lastname || '',
            companyName: contact.companyname || '',
            address1: contact.address1 || '',
            city: contact.city || '',
            state: contact.state || '',
            postalCode: contact.postalcode || '',
            country: contact.country || '',
            branch: contact.branch || userData.branch || '',
            expiryDate: contact.expirydate || userData.expiryDate || '',
            vehicleNumber: contact.vehiclenumber || userData.vehicleNumber || '',
            points: contact.points || '0',
            IC: contact.ic || '',
            tags: [...new Set([...selectedImportTags, ...importTags])],
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            createdBy: user.email,
            updatedBy: user.email
          };
  
          // Log each contact being added
          console.log('Adding contact:', contactData);
          
          batch.set(contactRef, contactData, { merge: true });
        }
  
        batches.push(batch.commit());
      }
  
      // Execute all batches
      console.log(`Committing ${batches.length} batches...`);
      await Promise.all(batches);
      console.log('All batches committed successfully');
  
      // Verify the import
      const verifyImport = async (): Promise<boolean> => {
        const contactsRef = collection(firestore, `companies/${companyId}/contacts`);
        const snapshot = await getDocs(contactsRef);
        
        // Log verification results
        console.log('Verification - Total contacts in Firestore:', snapshot.size);
        console.log('Verification - Recent contacts:');
        snapshot.docs.slice(-5).forEach(doc => {
          console.log(doc.id, doc.data());
        });
  
        return snapshot.size > 0;
      };
  
      if (await verifyImport()) {
        // Clear cache and fetch updated contacts
        localStorage.removeItem('contacts');
        sessionStorage.removeItem('contactsFetched');
        await fetchContacts();
  
        toast.success(`Successfully imported ${validContacts.length} contacts!`);
        setShowCsvImportModal(false);
        setSelectedCsvFile(null);
        setSelectedImportTags([]);
        setImportTags([]);
      } else {
        throw new Error('Failed to verify contact import');
      }
  
    } catch (error) {
      console.error('CSV Import Error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to import contacts");
    } finally {
      setLoading(false);
    }
  };

  async function sendTextMessage(id: string, blastMessage: string, contact: Contact): Promise<void> {
    if (!blastMessage.trim()) {
      console.error('Blast message is empty');
      return;
    }
  
    try {
      const user = auth.currentUser;
      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error('User document not found!');
        return;
      }
  
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.error('Company document not found!');
        return;
      }
  
      const companyData = docSnapshot.data();
      const baseUrl = companyData.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';
      const accessToken = companyData.ghl_accessToken;
      const whapiToken = companyData.whapiToken;
      const phoneNumber = id.split('+')[1];
      const chat_id = phoneNumber + "@s.whatsapp.net";
      console.log(chat_id);

      if (companyData.v2) {
        // Handle v2 users
        const messagesRef = collection(firestore, `companies/${companyId}/contacts/${contact.phone}/messages`);
        await addDoc(messagesRef, {
          message: blastMessage,
          timestamp: new Date(),
          from_me: true,
          chat_id: chat_id,
          type: 'chat',
          // Add any other necessary fields
        });

        console.log("Message added to Firestore for v2 user");
      } else {
        // Handle non-v2 users
        const response = await axios.post(
          `${baseUrl}/api/messages/text/${chat_id}/${whapiToken}`,
          {
            contactId: id,
            message: blastMessage,
            additionalInfo: { ...contact },
            method: 'POST',
            body: JSON.stringify({
              message: blastMessage,
            }),
            headers: { 'Content-Type': 'application/json' }
          },
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.data && response.data.message) {
          // Store the message in Firebase for non-v2 users
          const messagesCollectionRef = collection(firestore, 'companies', companyId, 'messages');
          await setDoc(doc(messagesCollectionRef, response.data.message.id), {
            message: response.data.message,
            from: userData.name,
            timestamp: new Date(),
            whapiToken: whapiToken,
            chat_id: chat_id,
            type: 'chat',
            from_me: true,
            text: { body: blastMessage },
          });
        }

        console.log("Message sent and stored for non-v2 user");
      }

      console.log('Message sent successfully');
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }
  
  useEffect(() => {
    fetchScheduledMessages();
  }, []);
  const deleteCustomFieldFromAllContacts = async (fieldName: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
  
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
  
      const contactsCollectionRef = collection(firestore, `companies/${companyId}/contacts`);
      const contactsSnapshot = await getDocs(contactsCollectionRef);
  
      const batch = writeBatch(firestore);
  
      contactsSnapshot.forEach((doc) => {
        const contactRef = doc.ref;
        batch.update(contactRef, {
          [`customFields.${fieldName}`]: deleteField()
        });
      });
  
      await batch.commit();
  
      // Update local state
      setContacts(prevContacts => 
        prevContacts.map(contact => {
          const { [fieldName]: _, ...restCustomFields } = contact.customFields || {};
          return {
            ...contact,
            customFields: restCustomFields
          };
        })
      );
  
      toast.success(`Custom field "${fieldName}" removed from all contacts.`);
    } catch (error) {
      console.error('Error removing custom field from all contacts:', error);
      toast.error('Failed to remove custom field from all contacts.');
    }
  };
  const fetchScheduledMessages = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
  
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) return;
  
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
  
      const scheduledMessagesRef = collection(firestore, `companies/${companyId}/scheduledMessages`);
      const q = query(scheduledMessagesRef, where("status", "==", "scheduled"));
      const querySnapshot = await getDocs(q);
  
      const messages: ScheduledMessage[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        messages.push({ 
          id: doc.id, 
          ...data,
          chatIds: data.chatIds || [],
          message: data.message || '', // Ensure message is included
        } as ScheduledMessage);
      });
  
      // Sort messages by scheduledTime
      messages.sort((a, b) => a.scheduledTime.toDate().getTime() - b.scheduledTime.toDate().getTime());
  
      setScheduledMessages(messages);
      console.log('Fetched scheduled messages:', messages); // Add this log
    } catch (error) {
      console.error("Error fetching scheduled messages:", error);
    }
  };

  const handleEditScheduledMessage = (message: ScheduledMessage) => {
    setCurrentScheduledMessage(message);
    setBlastMessage(message.message || ''); // Set the blast message to the current message text
    setEditScheduledMessageModal(true);
  };

  const insertPlaceholder = (field: string) => {
    const placeholder = `@{${field}}`;
    setBlastMessage(prevMessage => prevMessage + placeholder);
  };

  const handleDeleteScheduledMessage = async (messageId: string) => {
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
      if (!docSnapshot.exists()) throw new Error('No company document found');
      const companyData = docSnapshot.data();
      const baseUrl = companyData.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';
      // Call the backend API to delete the scheduled message
      const response = await axios.delete(`${baseUrl}/api/schedule-message/${companyId}/${messageId}`);
      if (response.status === 200) {
        setScheduledMessages(scheduledMessages.filter(msg => msg.id !== messageId));
        toast.success("Scheduled message deleted successfully!");
      } else {
        throw new Error("Failed to delete scheduled message.");
      }
    } catch (error) {
      console.error("Error deleting scheduled message:", error);
      toast.error("Failed to delete scheduled message.");
    }
  };

  const handleEditMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setEditMediaFile(e.target.files[0]);
    }
  };

  const handleEditDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setEditDocumentFile(e.target.files[0]);
    }
  };

  const handleSaveScheduledMessage = async () => {
    if (!currentScheduledMessage) return;

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
      if (!docSnapshot.exists()) throw new Error('No company document found');
      const companyData = docSnapshot.data();
      const baseUrl = companyData.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';
      // Upload new media/document files (existing code)
      let newMediaUrl = currentScheduledMessage.mediaUrl;
      if (editMediaFile) {
        newMediaUrl = await uploadFile(editMediaFile);
      }

      let newDocumentUrl = currentScheduledMessage.documentUrl;
      let newFileName = currentScheduledMessage.fileName;
      if (editDocumentFile) {
        newDocumentUrl = await uploadFile(editDocumentFile);
        newFileName = editDocumentFile.name;
      }

      // Process messages for each contact
      const processedMessages = await Promise.all(
        currentScheduledMessage.chatIds.map(async (chatId) => {
          const phoneNumber = chatId.split('@')[0];
          const contact = contacts.find(c => c.phone?.replace(/\D/g, '') === phoneNumber);
          
          if (!contact) {
            console.warn(`No contact found for chatId: ${chatId}`);
            return { chatId, message: blastMessage }; // Return unprocessed message as fallback
          }
  
          // Process message with contact data using the NEW blast message
          let processedMessage = blastMessage
            .replace(/@{contactName}/g, contact.contactName || '')
            .replace(/@{firstName}/g, contact.contactName?.split(' ')[0] || '')
            .replace(/@{lastName}/g, contact.lastName || '')
            .replace(/@{email}/g, contact.email || '')
            .replace(/@{phone}/g, contact.phone || '')
            .replace(/@{vehicleNumber}/g, contact.vehicleNumber || '')
            .replace(/@{branch}/g, contact.branch || '')
            .replace(/@{expiryDate}/g, contact.expiryDate || '')
            .replace(/@{ic}/g, contact.ic || '');
  
          return {
            chatId,
            message: processedMessage
          };
        })
      );

      // Prepare the updated message data
      const updatedMessageData = {
        ...currentScheduledMessage,
        message: blastMessage, // Store the new template
        messages: processedMessages, // Store the newly processed messages
        templateData: {
          hasPlaceholders: blastMessage.includes('@{'),
          placeholdersUsed: [...blastMessage.matchAll(/@{([^}]+)}/g)].map(match => match[1])
        },
        batchQuantity: currentScheduledMessage.batchQuantity || 10,
        companyId,
        createdAt: currentScheduledMessage.createdAt || Timestamp.now(),
        documentUrl: newDocumentUrl,
        fileName: newFileName,
        mediaUrl: newMediaUrl,
        mimeType: editMediaFile ? editMediaFile.type : (editDocumentFile ? editDocumentFile.type : null),
        repeatInterval: currentScheduledMessage.repeatInterval || 0,
        repeatUnit: currentScheduledMessage.repeatUnit || 'days',
        scheduledTime: currentScheduledMessage.scheduledTime,
        status: 'scheduled',
        v2: currentScheduledMessage.v2 || false,
        whapiToken: currentScheduledMessage.whapiToken || null,
      };

      console.log('Updating scheduled message with data:', updatedMessageData);

      // Send PUT request to update the scheduled message
      const response = await axios.put(
        `${baseUrl}/api/schedule-message/${companyId}/${currentScheduledMessage.id}`,
        updatedMessageData
      );

      if (response.status === 200) {
        // Update local state
        setScheduledMessages(prev => 
          prev.map(msg => 
            msg.id === currentScheduledMessage.id 
              ? { 
                  ...msg, 
                  ...updatedMessageData, 
                  message: blastMessage, // Use the edited message content
                  mimeType: updatedMessageData.mimeType || undefined 
                } as ScheduledMessage
              : msg
          )
        );

        setEditScheduledMessageModal(false);
        setEditMediaFile(null);
        setEditDocumentFile(null);
        toast.success("Scheduled message updated successfully!");
        
        // Refresh the scheduled messages
        await fetchScheduledMessages();
      } else {
        throw new Error("Failed to update scheduled message");
      }

    } catch (error) {
      console.error("Error updating scheduled message:", error);
      toast.error("Failed to update scheduled message.");
    }
  };

  // Add this function to process messages when they're displayed
  const processScheduledMessage = (message: ScheduledMessage) => {
    if (!message.templateData?.hasPlaceholders) {
      return message.message;
    }

    // If the message has processed messages, use those
    if (message.processedMessages && message.processedMessages.length > 0) {
      // Return a summary or the first processed message
      return `Template: ${message.message}\nExample: ${message.processedMessages[0].message}`;
    }

    return message.message;
  };

  // Update the display of scheduled messages to use the processed version
  const renderScheduledMessage = (message: ScheduledMessage) => {
    return (
      <p className="text-gray-800 dark:text-gray-200 mb-2 font-medium text-md line-clamp-2">
        {processScheduledMessage(message)}
        {message.templateData?.hasPlaceholders && (
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
            (Uses placeholders)
          </span>
        )}
      </p>
    );
  };

  // Add this function to format the date
  const formatDate = (date: Date) => {
    return format(date, "MMM d, yyyy 'at' h:mm a");
  };

  const handleSelectAll = () => {
    if (selectedContacts.length === filteredContactsSearch.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts([...filteredContactsSearch]);
    }
  };

  const handleDeselectPage = () => {
    // Deselect all contacts from current page
    const currentContactIds = new Set(currentContacts.map(contact => contact.id));
    setSelectedContacts(prevSelected => 
      prevSelected.filter(contact => !currentContactIds.has(contact.id))
    );
  };

  const handleSelectCurrentPage = () => {
    const areAllCurrentSelected = currentContacts.every(contact => 
      selectedContacts.some(sc => sc.id === contact.id)
    );
  
    if (areAllCurrentSelected) {
      // If all current page contacts are selected, deselect them
      setSelectedContacts(prevSelected => 
        prevSelected.filter(contact => 
          !currentContacts.some(cc => cc.id === contact.id)
        )
      );
    } else {
      // If not all current page contacts are selected, select them all
      const currentPageContacts = currentContacts.filter(contact => 
        !selectedContacts.some(sc => sc.id === contact.id)
      );
      setSelectedContacts(prevSelected => [...prevSelected, ...currentPageContacts]);
    }
  };

  const renderTags = (tags: string[] | undefined, contact: Contact) => {
    if (!tags || tags.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {tags.map((tag, index) => (
          <span
            key={index}
            className={`px-2 py-1 text-xs font-semibold rounded-full ${
              // Make case-insensitive comparison
              employeeNames.some(name => name.toLowerCase() === tag.toLowerCase())
                ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
            }`}
          >
            {tag}
            <button
              className="absolute top-0 right-0 hidden group-hover:block bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs leading-none"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveTag(contact.id!, tag);
              }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    );
  };

  const handleDownloadSampleCsv = () => {
    const sampleCsvContent = `contactName,lastName,phone,email,companyName,address1,branch,expiryDate,vehicleNumber,ic,points
John,Doe,60123456789,john@example.com,ABC Company,123 Main St,Branch A,2023-12-31,ABC1234,123456-78-9012,100
Jane,Smith,60198765432,jane@example.com,XYZ Corp,456 Elm St,Branch B,2024-06-30,XYZ5678,987654-32-1098,200`;

    const blob = new Blob([sampleCsvContent], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, 'sample_contacts.csv');
  };
  

  const filterRecipients = (chatIds: string[], search: string) => {
    return chatIds.filter(chatId => {
      const phoneNumber = chatId.split('@')[0];
      const contact = contacts.find(c => c.phone?.replace(/\D/g, '') === phoneNumber);
      const contactName = contact?.contactName || phoneNumber;
      return contactName.toLowerCase().includes(search.toLowerCase()) || 
             phoneNumber.includes(search);
    });
  };
  // Add this function to filter scheduled messages
const getFilteredScheduledMessages = () => {
  if (!searchQuery) return scheduledMessages;

  return scheduledMessages.filter(message => {
    // Check if message content matches search
    if (message.message?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return true;
    }

    // Check if any recipient matches search
    const matchingRecipients = filterRecipients(message.chatIds, searchQuery);
    return matchingRecipients.length > 0;
  });
};
  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      <div className="flex-grow overflow-y-auto">
        <div className="grid grid-cols-12 mt-5">
          <div className="flex items-center col-span-12 intro-y sm:flex-nowrap">
            <div className="w-full sm:w-auto sm:mt-0 sm:ml-auto md:ml-0">
              <div className="flex">
                {/* Add Contact Button */}
                <div className="w-full">
                  {/* Desktop view */}
                  <div className="hidden sm:flex sm:w-full sm:space-x-2">
                    <button 
                      className={`flex items-center justify-start p-2 !box bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ${userRole === "3" ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => {
                        if (userRole !== "3") {
                          setAddContactModal(true);
                        } else {
                          toast.error("You don't have permission to add contacts.");
                        }
                      }}
                      disabled={userRole === "3"}
                    >
                      <Lucide icon="Plus" className="w-5 h-5 mr-2" />
                      <span className="font-medium">Add Contact</span>
                    </button>
                    <Menu as="div" className="relative inline-block text-left">
                      <Menu.Button as={Button} className="flex items-center justify-start p-2 !box bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <Lucide icon="User" className="w-5 h-5 mr-2" />
                        <span>Assign User</span>
                      </Menu.Button>
                      <Menu.Items className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 shadow-lg rounded-md p-2 z-10 overflow-y-auto max-h-96">
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
                              return employee.role === '2' && employee.name.toLowerCase().includes(employeeSearch.toLowerCase());
                            }
                            return employee.name.toLowerCase().includes(employeeSearch.toLowerCase());
                          })
                          .map((employee) => (
                            <Menu.Item key={employee.id}>
                              {({ active }) => (
                                <button
                                  className={`${
                                    active ? 'bg-gray-100 dark:bg-gray-700' : ''
                                  } group flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 transition-colors duration-200`}
                                  onClick={() => {
                                    if (userRole !== "3") {
                                      selectedContacts.forEach(contact => {
                                        handleAddTagToSelectedContacts(employee.name, contact);
                                      });
                                    } else {
                                      toast.error("You don't have permission to assign users to contacts.");
                                    }
                                  }}
                                >
                                  <Lucide icon="User" className="mr-3 h-5 w-5" />
                                  <span className="truncate">{employee.name}</span>
                                </button>
                              )}
                            </Menu.Item>
                          ))}
                      </Menu.Items>
                    </Menu>
                    <Menu>
                      {showAddUserButton && (
                        <Menu.Button as={Button} className="flex items-center justify-start p-2 !box bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                          <Lucide icon="Tag" className="w-5 h-5 mr-2" />
                          <span>Add Tag</span>
                        </Menu.Button>
                      )}
                      <Menu.Items className="w-full bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-md mt-1 shadow-lg">
                        <div className="p-2">
                          <button className="flex items-center p-2 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 w-full rounded-md" onClick={() => setShowAddTagModal(true)}>
                            <Lucide icon="Plus" className="w-4 h-4 mr-2" />
                            Add
                          </button>
                        </div>
                        {tagList.map((tag) => (
                          <div key={tag.id} className="flex items-center justify-between w-full hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded-md">
                            <button
                              className="flex-grow p-2 text-sm text-left"
                              onClick={() => {
                                selectedContacts.forEach(contact => {
                                  handleAddTagToSelectedContacts(tag.name, contact);
                                });
                              }}
                            >
                              {tag.name}
                            </button>
                            <button 
                              className="p-2 text-sm"
                              onClick={() => {
                                setTagToDelete(tag);
                                setShowDeleteTagModal(true);
                              }}
                            >
                              <Lucide icon="Trash" className="w-4 h-4 text-red-400 hover:text-red-600" />
                            </button>
                          </div>
                        ))}
                      </Menu.Items>
                    </Menu>
                    <Menu>
    {showAddUserButton && (
      <Menu.Button as={Button} className="flex items-center justify-start p-2 !box bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
        <Lucide icon="Tags" className="w-5 h-5 mr-2" />
        <span>Remove Tag</span>
      </Menu.Button>
    )}
    <Menu.Items className="w-full bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-md mt-1 shadow-lg">
      <div className="p-2">
        <button 
          className="flex items-center p-2 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 w-full rounded-md text-red-500"
          onClick={() => {
            selectedContacts.forEach(contact => {
              handleRemoveTagsFromContact(contact, contact.tags || []);
            });
          }}
        >
          <Lucide icon="XCircle" className="w-4 h-4 mr-2" />
          Remove All Tags
        </button>
      </div>
      {tagList.map((tag) => (
        <div key={tag.id} className="flex items-center justify-between w-full hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded-md">
          <button
            className="flex-grow p-2 text-sm text-left"
            onClick={() => {
              selectedContacts.forEach(contact => {
                handleRemoveTagsFromContact(contact, [tag.name]);
              });
            }}
          >
            {tag.name}
          </button>
        </div>
      ))}
    </Menu.Items>
  </Menu>
                    <Menu>
                      <Menu.Button as={Button} className="flex items-center justify-start p-2 !box bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <Lucide icon="Filter" className="w-5 h-5 mr-2" />
                        <span>Filter Tags</span>
                      </Menu.Button>
                      <Menu.Items className="w-full bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 min-w-[200px] p-2">
                        <div>
                          <button
                            className="flex items-center p-2 font-medium w-full rounded-md"
                            onClick={clearAllFilters}
                          >
                            <Lucide icon="X" className="w-4 h-4 mr-1" />
                            Clear All Filters
                          </button>
                        </div>
                        <Tab.Group>
                          <Tab.List className="flex p-1 space-x-1 bg-blue-900/20 rounded-xl mt-2">
                            <Tab
                              className={({ selected }) =>
                                `w-full py-2.5 text-sm font-medium leading-5 text-blue-700 rounded-lg
                                focus:outline-none focus:ring-2 ring-offset-2 ring-offset-blue-400 ring-white ring-opacity-60
                                ${selected ? 'bg-white shadow' : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'}`
                              }
                              onClick={() => setActiveFilterTab('tags')}
                            >
                              Tags
                            </Tab>
                            <Tab
                              className={({ selected }) =>
                                `w-full py-2.5 text-sm font-medium leading-5 text-blue-700 rounded-lg
                                focus:outline-none focus:ring-2 ring-offset-2 ring-offset-blue-400 ring-white ring-opacity-60
                                ${selected ? 'bg-white shadow' : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'}`
                              }
                              onClick={() => setActiveFilterTab('users')}
                            >
                              Users
                            </Tab>
                          </Tab.List>
                          <Tab.Panels className="mt-2 max-h-[300px] overflow-y-auto">
                            <Tab.Panel>
                              {tagList.map((tag) => (
                                <div key={tag.id} className={`flex items-center justify-between m-2 p-2 text-sm w-full rounded-md ${selectedTagFilters.includes(tag.name) ? 'bg-primary dark:bg-primary text-white' : ''}`}>
                                  <div 
                                    className="flex items-center cursor-pointer"
                                    onClick={() => handleTagFilterChange(tag.name)}
                                  >
                                    {tag.name}
                                  </div>
                                  <button
                                    className={`px-2 py-1 text-xs rounded ${
                                      excludedTags.includes(tag.name)
                                        ? 'bg-red-500 text-white'
                                        : 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
                                    }`}
                                    onClick={() => 
                                      excludedTags.includes(tag.name)
                                        ? handleRemoveExcludedTag(tag.name)
                                        : handleExcludeTag(tag.name)
                                    }
                                  >
                                    {excludedTags.includes(tag.name) ? 'Excluded' : 'Exclude'}
                                  </button>
                                </div>
                              ))}
                            </Tab.Panel>
                            <Tab.Panel>
                              {employeeList.map((employee) => (
                                <div key={employee.id} className={`flex items-center justify-between m-2 p-2 text-sm w-full rounded-md ${selectedUserFilters.includes(employee.name) ? 'bg-primary dark:bg-primary text-white' : ''}`}>
                                  <div 
                                    className={`flex items-center cursor-pointer capitalize ${selectedUserFilters.includes(employee.name) ? 'bg-primary dark:bg-primary text-white' : ''}`}
                                    onClick={() => handleUserFilterChange(employee.name)}
                                  >
                                    {employee.name}
                                  </div>
                                </div>
                              ))}
                            </Tab.Panel>
                          </Tab.Panels>
                        </Tab.Group>
                      </Menu.Items>
                    </Menu>
                    <button 
                      className={`flex items-center justify-start p-2 !box bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 ${userRole === "3" ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => {
                        if (userRole !== "3") {
                          setBlastMessageModal(true);
                        } else {
                          toast.error("You don't have permission to send blast messages.");
                        }
                      }}
                      disabled={userRole === "3"}
                    >
                      <Lucide icon="Send" className="w-5 h-5 mr-2" />
                      <span className="font-medium">Send Blast Message</span>
                    </button>
                    <button 
                      className={`flex items-center justify-start p-2 !box ${
                        isSyncing || userRole === "3"
                          ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed' 
                          : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                      } text-gray-700 dark:text-gray-300`}
                      onClick={() => {
                        if (userRole !== "3") {
                          handleSyncConfirmation();
                        } else {
                          toast.error("You don't have permission to sync the database.");
                        }
                      }}
                      disabled={isSyncing || userRole === "3"}
                    >
                      <Lucide icon="FolderSync" className="w-5 h-5 mr-2" />
                      <span className="font-medium">
                        {isSyncing ? 'Syncing...' : 'Sync Database'}
                      </span>
                    </button>

                    <button 
                      className={`flex items-center justify-start p-2 !box ${
                        userRole === "3"
                          ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed' 
                          : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                      } text-gray-700 dark:text-gray-300`}
                      onClick={() => {
                        if (userRole !== "3") {
                          setShowCsvImportModal(true);
                        } else {
                          toast.error("You don't have permission to import CSV files.");
                        }
                      }}
                      disabled={userRole === "3"}
                    >
                      <Lucide icon="Upload" className="w-5 h-5 mr-2" />
                      <span className="font-medium">Import CSV</span>
                    </button>
                    {userRole !== "2" && userRole !== "3" && userRole !== "5" && (
                      <>
                        <button 
                          className={`flex items-center justify-start p-2 !box bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300`}
                          onClick={handleExportContacts}
                        >
                          <Lucide icon="FolderUp" className="w-5 h-5 mr-2" />
                          <span className="font-medium">Export Contacts</span>
                        </button>
                        {exportModalOpen && exportModalContent}
                      </>
                    )}
                  </div>             
                  {/* Mobile view */}
                  <div className="sm:hidden grid grid-cols-2 gap-2">
                    <button className="flex items-center justify-start p-2 w-full !box bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setAddContactModal(true)}>
                      <Lucide icon="Plus" className="w-5 h-5 mr-2" />
                      <span className="font-medium">Add Contact</span>
                    </button>
                    <Menu className="w-full">
                      <Menu.Button as={Button} className="flex items-center justify-start p-2 w-full !box bg-white text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <Lucide icon="User" className="w-5 h-5 mr-2" />
                        <span>Assign User</span>
                      </Menu.Button>
                      <Menu.Items className="w-full bg-white text-gray-800 dark:text-gray-200">
                        {employeeList.map((employee) => (
                          <Menu.Item key={employee.id}>
                            <span
                              className="flex items-center p-2"
                              onClick={() => {
                                selectedContacts.forEach(contact => {
                                  handleAddTagToSelectedContacts(employee.name, contact);
                                });
                              }}
                            >
                              <Lucide icon="User" className="w-4 h-4 mr-2" />
                              <span className="truncate">{employee.name}</span>
                            </span>
                          </Menu.Item>
                        ))}
                      </Menu.Items>
                    </Menu>
                    <Menu>
                      {showAddUserButton && (
                        <Menu.Button as={Button} className="flex items-center justify-start p-2 w-full !box bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                          <Lucide icon="Tag" className="w-5 h-5 mr-2" />
                          <span>Add Tag</span>
                        </Menu.Button>
                      )}
                      <Menu.Items className="w-full bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-md mt-1 shadow-lg">
                        <div className="p-2">
                          <button className="flex items-center p-2 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 w-full rounded-md" onClick={() => setShowAddTagModal(true)}>
                            <Lucide icon="Plus" className="w-4 h-4 mr-2" />
                            Add
                          </button>
                        </div>
                        {tagList.map((tag) => (
                          <div key={tag.id} className="flex items-center justify-between w-full hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded-md">
                            <button
                              className="flex-grow p-2 text-sm text-left"
                              onClick={() => {
                                selectedContacts.forEach(contact => {
                                  handleAddTagToSelectedContacts(tag.name, contact);
                                });
                              }}
                            >
                              {tag.name}
                            </button>
                            <button 
                              className="p-2 text-sm"
                              onClick={() => {
                                setTagToDelete(tag);
                                setShowDeleteTagModal(true);
                              }}
                            >
                              <Lucide icon="Trash" className="w-4 h-4 text-red-400 hover:text-red-600" />
                            </button>
                          </div>
                        ))}
                      </Menu.Items>
                    </Menu>
                    <Menu>
                      <Menu.Button as={Button} className="flex items-center justify-start p-2 w-full !box bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                        <Lucide icon="Filter" className="w-5 h-5 mr-2" />
                        <span>Filter Tags</span>
                      </Menu.Button>
                      <Menu.Items className="w-full bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 min-w-[200px] p-2">
                        <div>
                          <button
                            className="flex items-center p-2 font-medium w-full rounded-md"
                            onClick={clearAllFilters}
                          >
                            <Lucide icon="X" className="w-4 h-4 mr-1" />
                            Clear All Filters
                          </button>
                        </div>
                        <Tab.Group>
                          <Tab.List className="flex p-1 space-x-1 bg-blue-900/20 rounded-xl mt-2">
                            <Tab
                              className={({ selected }) =>
                                `w-full py-2.5 text-sm font-medium leading-5 text-blue-700 rounded-lg
                                focus:outline-none focus:ring-2 ring-offset-2 ring-offset-blue-400 ring-white ring-opacity-60
                                ${selected ? 'bg-white shadow' : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'}`
                              }
                              onClick={() => setActiveFilterTab('tags')}
                            >
                              Tags
                            </Tab>
                            <Tab
                              className={({ selected }) =>
                                `w-full py-2.5 text-sm font-medium leading-5 text-blue-700 rounded-lg
                                focus:outline-none focus:ring-2 ring-offset-2 ring-offset-blue-400 ring-white ring-opacity-60
                                ${selected ? 'bg-white shadow' : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'}`
                              }
                              onClick={() => setActiveFilterTab('users')}
                            >
                              Users
                            </Tab>
                          </Tab.List>
                          <Tab.Panels className="mt-2">
                            <Tab.Panel>
                              {tagList.map((tag) => (
                                <div key={tag.id} className={`flex items-center justify-between m-2 p-2 text-sm w-full rounded-md ${selectedTagFilters.includes(tag.name) ? 'bg-primary dark:bg-primary text-white' : ''}`}>
                                  <div 
                                    className="flex items-center cursor-pointer"
                                    onClick={() => handleTagFilterChange(tag.name)}
                                  >
                                    {tag.name}
                                  </div>
                                  <button
                                    className={`px-2 py-1 text-xs rounded ${
                                      excludedTags.includes(tag.name)
                                        ? 'bg-red-500 text-white'
                                        : 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
                                    }`}
                                    onClick={() => 
                                      excludedTags.includes(tag.name)
                                        ? handleRemoveExcludedTag(tag.name)
                                        : handleExcludeTag(tag.name)
                                    }
                                  >
                                    {excludedTags.includes(tag.name) ? 'Excluded' : 'Exclude'}
                                  </button>
                                </div>
                              ))}
                            </Tab.Panel>
                            <Tab.Panel>
                              {employeeList.map((employee) => (
                                <div key={employee.id} className={`flex items-center justify-between m-2 p-2 text-sm w-full rounded-md ${selectedUserFilters.includes(employee.name) ? 'bg-primary dark:bg-primary text-white' : ''}`}>
                                  <div 
                                    className={`flex items-center cursor-pointer capitalize ${selectedUserFilters.includes(employee.name) ? 'bg-primary dark:bg-primary text-white' : ''}`}
                                    onClick={() => handleUserFilterChange(employee.name)}
                                  >
                                    {employee.name}
                                  </div>
                                </div>
                              ))}
                            </Tab.Panel>
                          </Tab.Panels>
                        </Tab.Group>
                      </Menu.Items>
                    </Menu>
                    <button className="flex items-center justify-start p-2 w-full !box bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setBlastMessageModal(true)}>
                      <Lucide icon="Send" className="w-5 h-5 mr-2" />
                      <span className="font-medium">Send Blast</span>
                    </button>
                    <button 
                      className={`flex items-center justify-start p-2 w-full !box ${
                        isSyncing 
                          ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed' 
                          : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                      } text-gray-700 dark:text-gray-300`}
                      onClick={handleSyncConfirmation}
                      disabled={isSyncing}
                    >
                      <Lucide icon="FolderSync" className="w-5 h-5 mr-2" />
                      <span className="font-medium">
                        {isSyncing ? 'Syncing...' : 'Sync DB'}
                      </span>
                    </button>
                    
                    <button className="flex items-center justify-start p-2 w-full !box bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => setShowCsvImportModal(true)}>
                      <Lucide icon="Upload" className="w-5 h-5 mr-2" />
                      <span className="font-medium">Import CSV</span>
                    </button>
                  
                  </div>
                </div>
                {/* Add this new element to display the number of selected contacts */}
              </div>
              <div className="relative w-full text-slate-500 p-2 mb-3">
                {isFetching ? (
                <div className="fixed top-0 left-0 right-0 bottom-0 flex justify-center items-center bg-white dark:bg-gray-900 bg-opacity-50">
                  <div className="items-center absolute top-1/2 left-2/2 transform -translate-x-1/3 -translate-y-1/2 bg-white dark:bg-gray-800 p-4 rounded-md shadow-lg">
                    <div role="status">
                    <div className="flex flex-col items-center justify-end col-span-6 sm:col-span-3 xl:col-span-2">
                      <LoadingIcon icon="spinning-circles" className="w-8 h-8" />
                      <div className="mt-2 text-xs text-center text-gray-600 dark:text-gray-400">Fetching Data...</div>
                    </div>
                    </div>
                  </div>
                </div>
              ) : (
                  <>
                    <div className="relative">
                      <FormInput
                        type="text"
                        className="relative w-full h-[40px] !box text-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        placeholder="Search contacts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {searchQuery ? (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute inset-y-0 right-0 flex items-center pr-3"
                        >
                          <Lucide
                            icon="X"
                            className="w-5 h-5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                          />
                        </button>
                      ) : (
                        <Lucide
                          icon="Search"
                          className="absolute inset-y-0 right-0 items-center w-5 h-5 m-2 text-gray-500 dark:text-gray-400"
                        />
                      )}
                    </div>
                  </>
                )}
              </div>
              {/* Scheduled Messages Section */}
              <div className="mt-3 mb-5">
                <div className="flex items-center">
                  <h2 className="z-10 text-xl font-semibold mb-1 text-gray-700 dark:text-gray-300">Scheduled Messages</h2>
                  <button
                    onClick={() => setShowScheduledMessages(prev => !prev)}
                    className="text-gray-700 dark:text-gray-300"
                  >
                    <Lucide icon={showScheduledMessages ? "ChevronUp" : "ChevronDown"} className="w-6 h-6 ml-2 mb-1 text-gray-700 dark:text-gray-300" />
                  </button>
                </div>
                {showScheduledMessages && (
                  getFilteredScheduledMessages().length > 0 ? (
                    <div className="z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                      {combineScheduledMessages(getFilteredScheduledMessages()).map((message) => (
                        <div key={message.id} className="z-10 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg flex flex-col h-full">
                          <div className="z-10 p-4 flex-grow">
                            <div className="z-10 flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                                {message.status === 'scheduled' ? 'Scheduled' : message.status}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatDate(message.scheduledTime.toDate())}
                              </span>
                            </div>
                            <p className="text-gray-800 dark:text-gray-200 mb-2 font-medium text-md line-clamp-2">
                              {message.message ? message.message : 'No message content'}
                            </p>  
                            <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                              <Lucide icon="Users" className="w-4 h-4 mr-1" />
                              <div className="ml-5 max-h-20 overflow-y-auto">
                                {message.chatIds.map(chatId => {
                                  const phoneNumber = chatId.split('@')[0];
                                  const contact = contacts.find(c => c.phone?.replace(/\D/g, '') === phoneNumber);
                                  return (
                                    <div key={chatId} className="truncate">
                                      {contact?.contactName || phoneNumber}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            {message.mediaUrl && (
                              <div className="flex items-center text-xs text-gray-600 dark:text-gray-400 mt-1">
                                <Lucide icon="Image" className="w-4 h-4 mr-1" />
                                <span>Media attached</span>
                              </div>
                            )}
                            {message.documentUrl && (
                              <div className="flex items-center text-xs text-gray-600 dark:text-gray-400 mt-1">
                                <Lucide icon="File" className="w-4 h-4 mr-1" />
                                <span>{message.fileName || 'Document attached'}</span>
                              </div>
                            )}
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 flex justify-end mt-auto">
                            <button
                              onClick={() => handleEditScheduledMessage(message)}
                              className="text-sm bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-medium py-1 px-3 rounded-md shadow-sm transition-colors duration-200 mr-2"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteScheduledMessage(message.id!)}
                              className="text-sm bg-red-600 hover:bg-red-700 text-white font-medium py-1 px-3 rounded-md shadow-sm transition-colors duration-200"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="z-1 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
                      <Lucide icon="Calendar" className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
                      <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                        {searchQuery ? 'No matching scheduled messages' : 'No scheduled messages yet'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        {searchQuery ? 'Try a different search term' : 'When you schedule messages, they will appear here.'}
                      </p>
                    </div>
                  )
                )}
              </div>
              {/* Edit Scheduled Message Modal */}
              <Dialog open={editScheduledMessageModal} onClose={() => setEditScheduledMessageModal(false)}>
                <div className="fixed inset-0 flex items-center justify-center p-4 bg-black bg-opacity-50">
                  <Dialog.Panel className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-md mt-10 text-gray-900 dark:text-white">
                    <div className="mb-4 text-lg font-semibold">Edit Scheduled Message</div>
                    <textarea
                      className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      value={blastMessage} // Use blastMessage instead of currentScheduledMessage?.message
                      onChange={(e) => setBlastMessage(e.target.value)}
                      rows={3}
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
                          {['contactName', 'firstName', 'lastName', 'email', 'phone', 'vehicleNumber', 'branch', 'expiryDate', 'ic'].map(field => (
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
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Scheduled Time</label>
                      <div className="flex space-x-2">
                        <DatePickerComponent
                          selected={currentScheduledMessage?.scheduledTime.toDate()}
                          onChange={(date: Date | null) => date && setCurrentScheduledMessage({...currentScheduledMessage!, scheduledTime: Timestamp.fromDate(date)})}
                          dateFormat="MMMM d, yyyy"
                          className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        <DatePickerComponent
                          selected={currentScheduledMessage?.scheduledTime.toDate()}
                          onChange={(date: Date | null) => date && setCurrentScheduledMessage({...currentScheduledMessage!, scheduledTime: Timestamp.fromDate(date)})}
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
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Attach Media (Image or Video)</label>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={(e) => handleEditMediaUpload(e)}
                        className="block w-full mt-1 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Attach Document</label>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                        onChange={(e) => handleEditDocumentUpload(e)}
                        className="block w-full mt-1 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="flex justify-end mt-4">
                      <button
                        className="px-4 py-2 mr-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                        onClick={() => setEditScheduledMessageModal(false)}
                      >
                        Cancel
                      </button>
                      <button
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                        onClick={handleSaveScheduledMessage}
                      >
                        Save
                      </button>
                    </div>
                  </Dialog.Panel>
                </div>
              </Dialog>
            </div>
          </div>
        </div>
        <div className="flex flex-col">
          <div className="sticky top-0 bg-gray-100 dark:bg-gray-900 z-10 py-2">
            <div className="flex flex-col md:flex-row items-start md:items-center text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex-grow">
                <span className="mb-2 mr-2 md:mb-0 text-2xl text-left">Contacts</span>
                <div className="inline-flex flex-wrap items-center space-x-2">
                  <button
                    onClick={handleSelectAll}
                    className="inline-flex items-center p-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg cursor-pointer transition-colors duration-200"
                  >
                    <Lucide 
                      icon={selectedContacts.length === filteredContacts.length ? "CheckSquare" : "Square"} 
                      className="w-4 h-4 mr-1 text-gray-600 dark:text-gray-300" 
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap font-medium">
                      Select All
                    </span>
                  </button>
                  <button
                    onClick={() => handleSelectCurrentPage()}
                    className="inline-flex items-center p-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg cursor-pointer transition-colors duration-200"
                  >
                    <Lucide 
                      icon={currentContacts.every(contact => selectedContacts.some(sc => sc.id === contact.id)) ? "CheckSquare" : "Square"} 
                      className="w-4 h-4 mr-1 text-gray-600 dark:text-gray-300" 
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap font-medium">
                      Select Page
                    </span>
                  </button>
                  {selectedContacts.length > 0 && currentContacts.some(contact => 
                    selectedContacts.map(c => c.id).includes(contact.id)
                  ) && (
                    <button
                      onClick={handleDeselectPage}
                      className="inline-flex items-center p-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg cursor-pointer transition-colors duration-200"
                    >
                      <span className="text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap font-medium">
                        Deselect Page
                      </span>
                      <Lucide 
                        icon="X" 
                        className="w-4 h-4 ml-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 focus:outline-none" 
                      />
                    </button>
                  )}
                  {selectedTagFilter && (
                    <span className="px-2 py-1 text-sm font-semibold rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200">
                      {selectedTagFilter}
                      <button
                        className="text-md ml-1 text-blue-600 hover:text-blue-100"
                        onClick={() => handleTagFilterChange("")}
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {excludedTags.map(tag => (
                    <span key={tag} className="px-2 py-1 text-sm font-semibold rounded-lg bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200">
                      {tag}
                      <button
                        className="text-md ml-1 text-red-600 hover:text-red-100"
                        onClick={() => handleRemoveExcludedTag(tag)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {selectedContacts.length > 0 && (
                    <div className="inline-flex items-center p-2 bg-gray-200 dark:bg-gray-700 rounded-md">
                      <span className="text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap font-medium">{selectedContacts.length} selected</span>
                      <button
                        onClick={() => setSelectedContacts([])}
                        className="ml-2 text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 focus:outline-none"
                      >
                        <Lucide icon="X" className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {selectedContacts.length > 0 && (
                    <button 
                      className={`inline-flex items-center p-2 ${
                        userRole === "3"
                          ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed' 
                          : 'bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700'
                      } text-white rounded-lg transition-colors duration-200`}
                      onClick={() => {
                        if (userRole !== "3") {
                          setShowMassDeleteModal(true);
                        } else {
                          toast.error("You don't have permission to delete contacts.");
                        }
                      }}
                      disabled={userRole === "3"}
                    >
                      <Lucide icon="Trash2" className="w-4 h-4 mr-1" />
                      <span className="text-xs whitespace-nowrap font-medium">
                        Delete Selected
                      </span>
                    </button>
                  )}
                  <div className="flex flex-wrap items-center mt-2 space-x-2">
                    {selectedTagFilters.map(tag => (
                      <span key={tag} className="px-2 py-1 text-sm font-semibold rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200">
                        {tag}
                        <button
                          className="ml-1 text-blue-600 hover:text-blue-800"
                          onClick={() => handleTagFilterChange(tag)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {selectedUserFilters.map(user => (
                      <span key={user} className="px-2 py-1 text-sm font-semibold rounded-lg bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200">
                        {user}
                        <button
                          className="ml-1 text-green-600 hover:text-green-800"
                          onClick={() => handleUserFilterChange(user)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              {showMassDeleteModal && (
                <Dialog open={showMassDeleteModal} onClose={() => setShowMassDeleteModal(false)}>
                  <Dialog.Panel className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg">
                    <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      Confirm Multiple Contacts Deletion
                    </Dialog.Title>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      Are you sure you want to delete {selectedContacts.length} selected contacts? This action cannot be undone.
                    </p>
                    <div className="mt-4 flex justify-end space-x-2">
                      <button
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-500"
                        onClick={() => setShowMassDeleteModal(false)}
                      >
                        Cancel
                      </button>
                      <button
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500"
                        onClick={handleMassDelete}
                      >
                        Delete
                      </button>
                    </div>
                  </Dialog.Panel>
                </Dialog>
              )}
              <div className="flex justify-end items-center font-medium">
              <ReactPaginate
                breakLabel="..."
                nextLabel="Next >"
                onPageChange={handlePageClick}
                pageRangeDisplayed={5}
                pageCount={pageCount}
                previousLabel="< Previous"
                renderOnZeroPageCount={null}
                containerClassName="flex justify-center items-center"
                pageClassName="mx-1"
                pageLinkClassName="px-2 py-1 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm"
                previousClassName="mx-1"
                nextClassName="mx-1"
                previousLinkClassName="px-2 py-1 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm"
                nextLinkClassName="px-2 py-1 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm"
                disabledClassName="opacity-50 cursor-not-allowed"
                activeClassName="font-bold"
                activeLinkClassName="bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700"
              />
              </div>
            </div>
          </div>
          <div className="w-full flex-wrap">
            <div className="h-[calc(150vh-200px)] overflow-y-auto mb-4" ref={contactListRef}>
              <table className="w-full border-collapse hidden sm:table">
                <thead className="sticky top-0 bg-white dark:bg-gray-700 z-10 py-2">
                  <tr className="text-left">
                    <th className="p-4 font-medium text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={currentContacts.length > 0 && currentContacts.every(contact => 
                          selectedContacts.some(sc => sc.phone === contact.phone)
                        )}
                        onChange={() => handleSelectCurrentPage()}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="p-4 font-medium text-gray-700 dark:text-gray-300">Contact</th>
                    <th className="p-4 font-medium text-gray-700 dark:text-gray-300">Phone</th>
                    <th className="p-4 font-medium text-gray-700 dark:text-gray-300">Tags</th>
                    <th className="p-4 font-medium text-gray-700 dark:text-gray-300">Points</th>
                    <th className="p-4 font-medium text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {currentContacts.map((contact, index) => {
                    const isSelected = selectedContacts.some((c) => c.phone === contact.phone);
                    return (
                      <tr 
                        key={index}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                          isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                      >
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleContactSelection(contact)}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center">
                            {contact.profilePicUrl ? (
                              <img 
                                src={contact.profilePicUrl} 
                                alt={contact.contactName || "Profile"} 
                                className="w-8 h-8 rounded-full object-cover mr-3" 
                              />
                            ) : (
                              <div className="w-8 h-8 mr-3 border-2 border-gray-500 dark:border-gray-400 rounded-full flex items-center justify-center">
                                {contact.chat_id && contact.chat_id.includes('@g.us') ? (
                                  <Lucide icon="Users" className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                ) : (
                                  <Lucide icon="User" className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                )}
                              </div>
                            )}
                            <span className="font-medium text-gray-900 dark:text-white">
                              {contact.contactName ? (contact.lastName ? `${contact.contactName} ${contact.lastName}` : contact.contactName) : contact.phone}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-gray-600 dark:text-gray-400">
                          {contact.phone ?? contact.source}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-2">
                            {contact.tags && contact.tags.length > 0 ? (
                              contact.tags.map((tag, index) => (
                                <div key={index} className="relative group">
                                  <span className={`px-2 py-1 text-xs font-semibold rounded-full inline-flex justify-center items-center ${
                                    employeeNames.includes(tag.toLowerCase())
                                      ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200'
                                      : 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
                                  }`}>
                                    {tag.charAt(0).toUpperCase() + tag.slice(1)}
                                  </span>
                                  <button
                                    className="absolute right-0 top-0 transform translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-red-500 hover:text-red-700"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveTag(contact.id!, tag);
                                    }}
                                  >
                                    <div className="w-4 h-4 bg-red-600 hover:bg-red-800 dark:bg-red-600 dark:hover:bg-red-800 rounded-full flex items-center justify-center">
                                      <Lucide 
                                        icon="X" 
                                        className="w-3 h-3 text-white" 
                                      />
                                    </div>
                                  </button>
                                </div>
                              ))
                            ) : (
                              <span className="text-sm text-gray-500 dark:text-gray-400">No tags</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-gray-600 dark:text-gray-400">
                          {contact.points || 0}
                        </td>
                        <td className="p-4">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setCurrentContact(contact);
                                setEditContactModal(true);
                              }}
                              className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                              title="View/Edit"
                            >
                              <Lucide icon="Eye" className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleClick(contact.phone)}
                              className="p-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                              title="Chat"
                            >
                              <Lucide icon="MessageSquare" className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => {
                                setCurrentContact(contact);
                                setDeleteConfirmationModal(true);
                              }}
                              className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                              title="Delete"
                            >
                              <Lucide icon="Trash" className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
               {/* Mobile Layout - Shown only on small screens */}
              <div className="sm:hidden">
                {currentContacts.map((contact, index) => {
                  const isSelected = selectedContacts.some((c) => c.phone === contact.phone);
                  return (
                    <div 
                      key={index}
                      className={`mb-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 ${
                        isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleContactSelection(contact)}
                            className="rounded border-gray-300"
                          />
                          {contact.profilePicUrl ? (
                            <img 
                              src={contact.profilePicUrl} 
                              alt={contact.contactName || "Profile"} 
                              className="w-10 h-10 rounded-full object-cover" 
                            />
                          ) : (
                            <div className="w-10 h-10 border-2 border-gray-500 dark:border-gray-400 rounded-full flex items-center justify-center">
                              {contact.chat_id && contact.chat_id.includes('@g.us') ? (
                                <Lucide icon="Users" className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                              ) : (
                                <Lucide icon="User" className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                              )}
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {contact.contactName ? (contact.lastName ? `${contact.contactName} ${contact.lastName}` : contact.contactName) : contact.phone}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {contact.phone ?? contact.source}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setCurrentContact(contact);
                              setEditContactModal(true);
                            }}
                            className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            title="View/Edit"
                          >
                            <Lucide icon="Eye" className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleClick(contact.phone)}
                            className="p-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                            title="Chat"
                          >
                            <Lucide icon="MessageSquare" className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
                              setCurrentContact(contact);
                              setDeleteConfirmationModal(true);
                            }}
                            className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            title="Delete"
                          >
                            <Lucide icon="Trash" className="w-5 h-5" />
                          </button>
                          </div>
                      </div>

                      <div className="mt-2">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Points: {contact.points || 0}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {contact.tags && contact.tags.length > 0 ? (
                            contact.tags.map((tag, index) => (
                              <div key={index} className="relative group">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full inline-flex justify-center items-center ${
                                  employeeNames.includes(tag.toLowerCase())
                                    ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200'
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
                                }`}>
                                  {tag.charAt(0).toUpperCase() + tag.slice(1)}
                                </span>
                                <button
                                  className="absolute right-0 top-0 transform translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-red-500 hover:text-red-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveTag(contact.id!, tag);
                                  }}
                                >
                                  <div className="w-4 h-4 bg-red-600 hover:bg-red-800 dark:bg-red-600 dark:hover:bg-red-800 rounded-full flex items-center justify-center">
                                    <Lucide icon="X" className="w-3 h-3 text-white" />
                                  </div>
                                </button>
                              </div>
                            ))
                          ) : (
                            <span className="text-sm text-gray-500 dark:text-gray-400">No tags</span>
                          )}
                        </div>
                      </div>
                    </div>
                    );
                })}
              </div>
            </div>
          </div>
        </div>
        <Dialog open={addContactModal} onClose={() => setAddContactModal(false)}>
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <Dialog.Panel className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-md mt-10 text-gray-900 dark:text-white">
              <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="block w-12 h-12 overflow-hidden rounded-full shadow-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-700 dark:text-white mr-4">
                  <Lucide icon="User" className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xl text-gray-900 dark:text-white">Add New User</span>
                </div>
              </div>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label>
                  <input
                    type="text"
                    className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
                    value={newContact.contactName}
                    onChange={(e) => setNewContact({ ...newContact, contactName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Last Name</label>
                  <input
                    type="text"
                    className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
                    value={newContact.lastName}
                    onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">IC</label>
                  <input
                    type="text"
                    className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
                    value={newContact.ic}
                    onChange={(e) => setNewContact({ ...newContact, ic: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Points</label>
                  <input
                    type="number"
                    className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
                    value={newContact.points || 0}
                    onChange={(e) => setNewContact({ ...newContact, points: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                  <input
                    type="text"
                    className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                  <input
                    type="text"
                    className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
                  <input
                    type="text"
                    className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
                    value={newContact.address1}
                    onChange={(e) => setNewContact({ ...newContact, address1: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Company</label>
                  <input
                    type="text"
                    className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
                    value={newContact.companyName}
                    onChange={(e) => setNewContact({ ...newContact, companyName: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="mt-4 block text-sm font-medium text-gray-700 dark:text-gray-300">Branch</label>
                <input
                  type="text"
                  className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
                  value={newContact.branch}
                  onChange={(e) => setNewContact({ ...newContact, branch: e.target.value })}
                />
              </div>
              {companyId === '079' || companyId === '001' && (
                <>
                  <div>
                    <label className="mt-4 block text-sm font-medium text-gray-700 dark:text-gray-300">Expiry Date</label>
                    <input
                      type="date"
                      className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
                      value={newContact.expiryDate}
                      onChange={(e) => setNewContact({ ...newContact, expiryDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mt-4 block text-sm font-medium text-gray-700 dark:text-gray-300">Vehicle Number</label>
                    <input
                      type="text"
                      className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
                      value={newContact.vehicleNumber}
                      onChange={(e) => setNewContact({ ...newContact, vehicleNumber: e.target.value })}
                    />
                  </div>
                </>
              )}
              <div className="flex justify-end mt-6">
                <button
                  className="px-4 py-2 mr-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                  onClick={() => setAddContactModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                  onClick={handleSaveNewContact}
                >
                  Save
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      
        <Dialog open={editContactModal} onClose={() => setEditContactModal(false)}>
  <div className="fixed inset-0 flex items-center justify-center p-4 bg-black bg-opacity-50">
    <Dialog.Panel className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-md mt-10 text-gray-900 dark:text-white overflow-y-auto max-h-[90vh]">
      <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="block w-12 h-12 overflow-hidden rounded-full shadow-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-700 dark:text-white mr-4">
          {currentContact?.profilePicUrl ? (
            <img 
              src={currentContact.profilePicUrl} 
              alt={currentContact.contactName || "Profile"} 
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xl">
              {currentContact?.contactName ? currentContact.contactName.charAt(0).toUpperCase() : ""}
            </span>
          )}
        </div>
        <div>
          <div className="font-semibold text-gray-900 dark:text-white text-lg capitalize">{currentContact?.contactName} {currentContact?.lastName}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{currentContact?.phone}</div>
        </div>
      </div>
      <div className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label>
          <input
            type="text"
            className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
            value={currentContact?.contactName || ''}
            onChange={(e) => setCurrentContact({ ...currentContact, contactName: e.target.value } as Contact)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Last Name</label>
          <input
            type="text"
            className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
            value={currentContact?.lastName || ''}
            onChange={(e) => setCurrentContact({ ...currentContact, lastName: e.target.value } as Contact)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
          <input
            type="text"
            className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
            value={currentContact?.email || ''}
            onChange={(e) => setCurrentContact({ ...currentContact, email: e.target.value } as Contact)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
          <input
            type="text"
            className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
            value={currentContact?.phone || ''}
            onChange={(e) => setCurrentContact({ ...currentContact, phone: e.target.value } as Contact)}
          />
        </div>
        {companyId === '095' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Country</label>
              <input
                type="text"
                className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
                value={currentContact?.country || ''}
                onChange={(e) => setCurrentContact({ ...currentContact, country: e.target.value } as Contact)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nationality</label>
              <input
                type="text"
                className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
                value={currentContact?.nationality || ''}
                onChange={(e) => setCurrentContact({ ...currentContact, nationality: e.target.value } as Contact)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Highest educational qualification</label>
              <input
                type="text"
                className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
                value={currentContact?.highestEducation || ''}
                onChange={(e) => setCurrentContact({ ...currentContact, highestEducation: e.target.value } as Contact)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Program Of Study</label>
              <input
                type="text"
                className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
                value={currentContact?.programOfStudy || ''}
                onChange={(e) => setCurrentContact({ ...currentContact, programOfStudy: e.target.value } as Contact)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Intake Preference</label>
              <input
                type="text"
                className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
                value={currentContact?.intakePreference || ''}
                onChange={(e) => setCurrentContact({ ...currentContact, intakePreference: e.target.value } as Contact)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">English Proficiency</label>
              <input
                type="text"
                className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
                value={currentContact?.englishProficiency || ''}
                onChange={(e) => setCurrentContact({ ...currentContact, englishProficiency: e.target.value } as Contact)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Validity of Passport</label>
              <input
                type="text"
                className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
                value={currentContact?.passport || ''}
                onChange={(e) => setCurrentContact({ ...currentContact, passport: e.target.value } as Contact)}
              />
            </div>
          </>
        )}
        {(companyId === '079' || companyId === '001') && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">IC</label>
              <input
                type="text"
                className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
                value={currentContact?.ic || ''}
                onChange={(e) => setCurrentContact({ ...currentContact, ic: e.target.value } as Contact)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Points</label>
              <input
                type="number"
                className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
                value={currentContact?.points || 0}
                onChange={(e) => setCurrentContact({ ...currentContact, points: parseInt(e.target.value) || 0 } as Contact)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
              <input
                type="text"
                className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
                value={currentContact?.address1 || ''}
                onChange={(e) => setCurrentContact({ ...currentContact, address1: e.target.value } as Contact)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Company</label>
              <input
                type="text"
                className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
                value={currentContact?.companyName || ''}
                onChange={(e) => setCurrentContact({ ...currentContact, companyName: e.target.value } as Contact)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Branch</label>
              <input
                type="text"
                className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
                value={currentContact?.branch || ''}
                onChange={(e) => setCurrentContact({ ...currentContact, branch: e.target.value } as Contact)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Expiry Date</label>
              <input
                type="date"
                className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"  
                value={currentContact?.expiryDate || ''}
                onChange={(e) => setCurrentContact({ ...currentContact, expiryDate: e.target.value } as Contact)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Vehicle Number</label>
              <input
                type="text" 
                className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
                value={currentContact?.vehicleNumber || ''}
                onChange={(e) => setCurrentContact({ ...currentContact, vehicleNumber: e.target.value } as Contact)}
              />
            </div>
          </>
        )}  
        {companyId === '001' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Assistant ID</label>
              <input
                type="text"
                className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
                value={currentContact?.assistantId || ''}
                onChange={(e) => setCurrentContact({ ...currentContact, assistantId: e.target.value } as Contact)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Thread ID</label>
              <input
                type="text"
                className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
                value={currentContact?.threadid || ''}
                onChange={(e) => setCurrentContact({ ...currentContact, threadid: e.target.value } as Contact)}
              />
            </div>
          </>
        )}

        {/* Custom Fields */}
        {currentContact?.customFields && Object.entries(currentContact.customFields).map(([key, value]) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{key}</label>
            <div className="flex">
              <input
                type="text"
                className="block w-full mt-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-gray-900 dark:text-white"
                value={value}
                onChange={(e) => setCurrentContact({
                  ...currentContact,
                  customFields: {
                    ...currentContact.customFields,
                    [key]: e.target.value
                  }
                } as Contact)}
              />
             <button
  className="ml-2 px-2 py-1 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
  onClick={() => {
    if (window.confirm(`Are you sure you want to delete the custom field "${key}" from all contacts?`)) {
      deleteCustomFieldFromAllContacts(key);
      const newCustomFields = { ...currentContact.customFields };
      delete newCustomFields[key];
      setCurrentContact({
        ...currentContact,
        customFields: newCustomFields
      } as Contact);
    }
  }}
>
  <Lucide icon="Trash2" className="w-4 h-4" />
</button>
            </div>
          </div>
        ))}

        {/* Add New Field Button */}
        <button
          className="px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-600 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900"
          onClick={() => {
            const fieldName = prompt("Enter the name of the new field:");
            if (fieldName) {
              addCustomFieldToAllContacts(fieldName);
              setCurrentContact(prevContact => ({
                ...prevContact!,
                customFields: {
                  ...prevContact?.customFields,
                  [fieldName]: ""
                }
              }));
            }
          }}
        >
          Add New Field
        </button>
      </div>
      <div className="flex justify-end mt-6">
        <button
          className="px-4 py-2 mr-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
          onClick={() => setEditContactModal(false)}
        >
          Cancel
        </button>
        <button
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          onClick={handleSaveContact}
        >
          Save
        </button>
      </div>
    </Dialog.Panel>
  </div>
</Dialog>
     
        <Dialog open={blastMessageModal} onClose={() => setBlastMessageModal(false)}>
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <Dialog.Panel className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-md mt-10 text-gray-900 dark:text-white">
              <div className="mb-4 text-lg font-semibold">Send Blast Message</div>
              {userRole === "3" ? (
                <div className="text-red-500">You don't have permission to send blast messages.</div>
              ) : (
                <>
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
                        {['contactName', 'firstName', 'lastName', 'email', 'phone', 'vehicleNumber', 'branch', 'expiryDate', 'ic'].map(field => (
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
                        onChange={(date: Date | null) => setBlastStartDate(date as Date)}
                        dateFormat="MMMM d, yyyy"
                        className="w-full mt-1 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <DatePickerComponent
                        selected={blastStartTime}
                        onChange={(date: Date | null) => setBlastStartTime(date as Date)}
                        showTimeSelect
                        showTimeSelectOnly
                        timeIntervals={15}
                        timeCaption="Time"
                        dateFormat="h:mm aa"
                        className="w-full mt-1 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contacts per Batch</label>
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
                        className="w-20 mt-1 mr-2 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <select
                        value={repeatUnit}
                        onChange={(e) => setRepeatUnit(e.target.value as 'minutes' | 'hours' | 'days')}
                        className="mt-1 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                      </select>
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
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="phone">Phone</label>
                      <select
                        id="phone"
                        name="phone"
                        value={phoneIndex}
                        onChange={(e) => setPhoneIndex(parseInt(e.target.value))}
                        className="mt-1 text-black dark:text-white border-primary dark:border-primary-dark bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700 rounded-lg text-sm w-full"
                      >
                        <option value="">Select a phone</option>
                        {Object.entries(phoneNames).map(([index, phoneName]) => (
                          <option key={index} value={parseInt(index) - 1}>
                            {phoneName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end mt-4">
                    <button
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={sendBlastMessage}
                      disabled={isScheduling}
                    >
                      {isScheduling ? (
                        <div className="flex items-center">
                          Scheduling...
                        </div>
                      ) : (
                        "Send Blast Message"
                      )}
                    </button>
                  </div>
                  {isScheduling && (
                    <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      Please wait while we schedule your messages...
                    </div>
                  )}
                </>
              )}
            </Dialog.Panel>
          </div>
        </Dialog>

        {showAddTagModal && (
          <Dialog open={showAddTagModal} onClose={() => setShowAddTagModal(false)}>
            <div className="fixed inset-0 flex items-center justify-center p-4 bg-black bg-opacity-50">
              <Dialog.Panel className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-md mt-40 text-gray-900 dark:text-white">
                <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="block w-12 h-12 overflow-hidden rounded-full shadow-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-700 dark:text-white mr-4">
                    <Lucide icon="Plus" className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xl text-gray-900 dark:text-white">Add New Tag</span>
                  </div>
                </div>
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tag Name</label>
                    <input
                      type="text"
                      className="block w-full mt-1 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-6">
                  <button
                    className="px-4 py-2 mr-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                    onClick={() => setShowAddTagModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                    onClick={handleSaveNewTag}
                  >
                    Save
                  </button>
                </div>
              </Dialog.Panel>
            </div>
          </Dialog>
        )}
        {showDeleteTagModal && (
          <Dialog open={showDeleteTagModal} onClose={() => setShowDeleteTagModal(false)}>
            <div className="fixed inset-0 flex items-center justify-center p-4 bg-black bg-opacity-50">
              <Dialog.Panel className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-md text-gray-900 dark:text-white">
                <div className="p-5 text-center">
                  <Lucide icon="XCircle" className="w-16 h-16 mx-auto mt-3 text-danger" />
                  <div className="mt-5 text-3xl text-gray-900 dark:text-white">Are you sure?</div>
                  <div className="mt-2 text-gray-600 dark:text-gray-400">
                    Do you really want to delete this tag? <br />
                    This process cannot be undone.
                  </div>
                </div>
                <div className="px-5 pb-8 text-center">
                  <Button
                    variant="outline-secondary"
                    type="button"
                    onClick={() => setShowDeleteTagModal(false)}
                    className="w-24 mr-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    type="button"
                    onClick={handleConfirmDeleteTag}
                    className="w-24 bg-red-600 text-white hover:bg-red-700"
                  >
                    Delete
                  </Button>
                </div>
              </Dialog.Panel>
            </div>
          </Dialog>
        )}
        <Dialog
          open={deleteConfirmationModal}
          onClose={() => setDeleteConfirmationModal(false)}
          initialFocus={deleteButtonRef}
        >
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <Dialog.Panel className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-md text-gray-900 dark:text-white">
              <div className="p-5 text-center">
                <Lucide icon="XCircle" className="w-16 h-16 mx-auto mt-3 text-danger" />
                <div className="mt-5 text-3xl text-gray-900 dark:text-white">Are you sure?</div>
                <div className="mt-2 text-gray-600 dark:text-gray-400">
                  Do you really want to delete this contact? <br />
                  This process cannot be undone.
                </div>
              </div>
              <div className="px-5 pb-8 text-center">
                <button
                  ref={deleteButtonRef}
                  className="px-4 py-2 mr-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                  onClick={handleDeleteContact}
                >
                  Delete
                </button>
                <button
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                  onClick={() => setDeleteConfirmationModal(false)}
                >
                  Cancel
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
        <Dialog open={showCsvImportModal} onClose={() => setShowCsvImportModal(false)}>
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <Dialog.Panel className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-md mt-10 text-gray-900 dark:text-white">
              <div className="mb-4 text-lg font-semibold">Import CSV</div>
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvFileSelect}
                className="block w-full mt-1 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <div className="mt-2">
                <button
                  onClick={handleDownloadSampleCsv}
                  className="text-sm text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Download Sample CSV
                </button>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Tags</label>
                <div className="mt-1 max-h-40 overflow-y-auto">
                  {tagList.map((tag) => (
                    <label key={tag.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        value={tag.name}
                        checked={selectedImportTags.includes(tag.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedImportTags([...selectedImportTags, tag.name]);
                          } else {
                            setSelectedImportTags(selectedImportTags.filter(t => t !== tag.name));
                          }
                        }}
                        className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{tag.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Add New Tags (comma-separated)</label>
                <input
                  type="text"
                  value={importTags.join(', ')}
                  onChange={(e) => setImportTags(e.target.value.split(',').map(tag => tag.trim()))}
                  className="block w-full mt-1 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter new tags separated by commas"
                />
              </div>
              <div className="flex justify-end mt-4">
                <button
                  className="px-4 py-2 mr-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                  onClick={() => setShowCsvImportModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                  onClick={handleCsvImport}
                  disabled={!selectedCsvFile || isLoading}
                >
                  {isLoading ? 'Importing...' : 'Import'}
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
        <Dialog open={showSyncConfirmationModal} onClose={() => setShowSyncConfirmationModal(false)}>
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <Dialog.Panel className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-md text-gray-900 dark:text-white mt-20">
              <div className="p-5 text-center">
                <Lucide icon="AlertTriangle" className="w-16 h-16 mx-auto mt-3 text-warning" />
                <div className="mt-5 text-3xl text-gray-900 dark:text-white">Are you sure?</div>
                <div className="mt-2 text-gray-600 dark:text-gray-400">
                  Do you really want to sync the database? This action may take some time and affect your current data.
                </div>
              </div>
              <div className="px-5 pb-8 text-center">
                <button
                  className="px-4 py-2 mr-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                  onClick={() => setShowSyncConfirmationModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                  onClick={handleConfirmSync}
                >
                  Confirm Sync
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
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
      </div>
    </div>
  );
}

export default Main;
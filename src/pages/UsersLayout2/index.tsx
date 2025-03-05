import _ from "lodash";
import fakerData from "@/utils/faker";
import Button from "@/components/Base/Button";
import Pagination from "@/components/Base/Pagination";
import { FormInput, FormSelect } from "@/components/Base/Form";
import Lucide from "@/components/Base/Lucide";
import { Menu } from "@/components/Base/Headless";
import { getAuth } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { DocumentReference, updateDoc, getDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { getFirestore, collection, doc, setDoc, DocumentSnapshot, Timestamp } from 'firebase/firestore';
import axios from "axios";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from 'react-toastify';
import ReactPaginate from 'react-paginate';
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { Dialog } from "@headlessui/react";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";


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
let companyId= "014";
let role= "1";
let ghlConfig ={
  ghl_id:'',
  ghl_secret:'',
  ghl_refreshToken:'',
};
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

// Add these types
interface Bot {
  botName: string;
  phoneCount: number | string;
  name: string;
  clientPhones: (string | null)[];
}

interface Employee {
  id: string;
  name: string;
  role: string;
  group?: string;
  email?: string;
  assignedContacts?: number;
  employeeId?: string;
  phoneNumber?: string;
  phoneNames?: { [key: number]: string };
  imageUrl?: string;
}

// Add uploadFile function before the Main component
const uploadFile = async (file: File): Promise<string> => {
  const storage = getStorage();
  const storageRef = ref(storage, `files/${file.name}`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
};

function Main() {
  const [employeeList, setEmployeeList] = useState<Employee[]>([]);
  const [showAddUserButton, setShowAddUserButton] = useState(false);
  const [contactData, setContactData] = useState<ContactData>({});
  const [response, setResponse] = useState<string>('');
  const [qrCodeImage, setQrCodeImage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const [employeeIdToDelete, setEmployeeIdToDelete] = useState<string>('');
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [role, setRole] = useState<string>("");
  const [phoneCount, setPhoneCount] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 21;

  // Add new state variables for blast message
  const [blastMessageModal, setBlastMessageModal] = useState(false);
  const [blastMessage, setBlastMessage] = useState('');
  const [blastStartTime, setBlastStartTime] = useState<Date | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [isScheduling, setIsScheduling] = useState(false);
  const [messages, setMessages] = useState<Array<{ text: string; delayAfter: number }>>([{ text: '', delayAfter: 0 }]);
  const [batchQuantity, setBatchQuantity] = useState(10);
  const [repeatInterval, setRepeatInterval] = useState(0);
  const [repeatUnit, setRepeatUnit] = useState<'minutes' | 'hours' | 'days'>('days');
  const [minDelay, setMinDelay] = useState(0);
  const [maxDelay, setMaxDelay] = useState(0);
  const [activateSleep, setActivateSleep] = useState(false);
  const [sleepAfterMessages, setSleepAfterMessages] = useState<number | null>(null);
  const [sleepDuration, setSleepDuration] = useState<number | null>(null);
  const [activeTimeStart, setActiveTimeStart] = useState('09:00');
  const [activeTimeEnd, setActiveTimeEnd] = useState('17:00');
  const [infiniteLoop, setInfiniteLoop] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<File | null>(null);

  const [groups, setGroups] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [phoneNames, setPhoneNames] = useState<{ [key: number]: string }>({});
  const [companyData, setCompanyData] = useState<any>(null);

  const toggleModal = (id?:string) => {
    setIsModalOpen(!isModalOpen);
    setEmployeeIdToDelete(id!)
  };

  interface ContactData {
    country?: string;
    firstName?: string | null;
    lastName?: string | null;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    address1?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string;
    website?: string | null;
    timezone?: string | null;
    dnd?: boolean;
    dndSettings?: any;
    inboundDndSettings?: any;
    tags?: string[];
    customFields?: any[];
    source?: string | null;
  }
  
  interface Props {
    accessToken: string;
    contactId: string;
  }

  let accessToken = "";
  
 
 useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (user) {
      
      setCurrentUserEmail(user.email);
      fetchEmployees();
    } else {
      
    }
  }, []);

  useEffect(() => {
    const fetchCompanyData = async () => {
      const auth = getAuth(app);
      const user = auth.currentUser;
      
      if (user) {
        const docUserRef = doc(firestore, 'user', user.email!);
        const docUserSnapshot = await getDoc(docUserRef);
        
        if (docUserSnapshot.exists()) {
          const userData = docUserSnapshot.data();
          companyId = userData.companyId;
          
          const companyRef = doc(firestore, 'companies', companyId);
          const companySnapshot = await getDoc(companyRef);
          
          if (companySnapshot.exists()) {
            const data = companySnapshot.data();
            setCompanyData(data);
            const phoneCount = data.phoneCount || 0;
            
            // Fetch bot data from API
            try {
              const baseUrl = data.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';
              const response = await axios.get(`${baseUrl}/api/bots`);
              const bots: Bot[] = response.data;
              
              // Match bot using companyId (which should match botName)
              const matchingBot = bots.find(bot => bot.botName === companyId);
              
              const newPhoneNames: { [key: number]: string } = {};
              if (matchingBot) {
                // Use clientPhones from API if available
                matchingBot.clientPhones.forEach((phone, index) => {
                  if (phone) {
                    newPhoneNames[index + 1] = phone;
                  } else {
                    newPhoneNames[index + 1] = data[`phone${index + 1}`] || `Phone ${index + 1}`;
                  }
                });
                
                // Update phoneCount based on API data if different
                const apiPhoneCount = typeof matchingBot.phoneCount === 'string' 
                  ? parseInt(matchingBot.phoneCount) 
                  : matchingBot.phoneCount;
                  
                setPhoneCount(apiPhoneCount);
              } else {
                // Fallback to existing data if no matching bot found
                for (let i = 1; i <= phoneCount; i++) {
                  newPhoneNames[i] = data[`phone${i}`] || `Phone ${i}`;
                }
                setPhoneCount(phoneCount);
              }
              
              setPhoneNames(newPhoneNames);
              
              
              
            } catch (error) {
              console.error('Error fetching bot data:', error);
              // Fallback to existing phone names
              const newPhoneNames: { [key: number]: string } = {};
              for (let i = 1; i <= phoneCount; i++) {
                newPhoneNames[i] = data[`phone${i}`] || `Phone ${i}`;
              }
              setPhoneNames(newPhoneNames);
              setPhoneCount(phoneCount);
            }
          }
        }
      }
    };
  
    fetchCompanyData();
  }, []);

  
  async function fetchEmployees() {
    const auth = getAuth(app);
    const user = auth.currentUser;
    setCurrentUserEmail(user?.email || null);
    try {
      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        return;
      }
    
      const dataUser = docUserSnapshot.data();
      companyId = dataUser.companyId;
      setRole(dataUser.role);
      

      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        return;
      }
      const companyData = docSnapshot.data();
      setPhoneCount(companyData.phoneCount);
      accessToken = companyData.ghl_accessToken;
      const baseUrl = companyData.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';
  
      // Fetch bot data from API
      let clientPhones: string[] = [];
      try {
        const botResponse = await axios.get(`${baseUrl}/api/bots`);
        const botData = botResponse.data.find((bot: any) => bot.botName === companyId);
        if (botData) {
          clientPhones = botData.clientPhones || [];
        }
      } catch (error) {
        console.error('Error fetching bot data:', error);
      }
  
      // Fetch phone names
      const phoneNamesData: { [key: number]: string } = {};
      for (let i = 1; i <= companyData.phoneCount; i++) {
        if (companyData[`phone${i}Name`]) {
          phoneNamesData[i] = companyData[`phone${i}Name`];
        } else {
          // Use client phone from bot data if available, otherwise fallback to default
          phoneNamesData[i] = clientPhones[i - 1] || `Phone ${i}`;
        }
      }
      setPhoneNames(phoneNamesData);

      const employeeRef = collection(firestore, `companies/${companyId}/employee`);
      const employeeSnapshot = await getDocs(employeeRef);

      const employeeListData: Employee[] = [];
      const groupSet = new Set<string>();

      employeeSnapshot.forEach((doc) => {
        const data = doc.data();
        const employeeGroup = data.group || '';
        if (employeeGroup) {
          groupSet.add(employeeGroup);
        }
        employeeListData.push({ 
          id: doc.id, 
          ...data,
          group: employeeGroup,
          email: data.email,
          name: data.name,
          employeeId: data.employeeId,
          phoneNumber: data.phoneNumber,
          role: data.role
        } as Employee);
      });

      
      

      const filteredEmployeeList = dataUser.role === "3"
        ? employeeListData.filter(employee => employee.email === user?.email)
        : employeeListData;
      
      
      setEmployeeList(filteredEmployeeList);
      setGroups(Array.from(groupSet));
      
      setShowAddUserButton(dataUser.role === "1");
    
    } catch (error) {
      console.error('Error fetching employees:', error);
      throw error;
    }
  }

  // Update the updatePhoneName function
  const updatePhoneName = async (index: number, name: string) => {
    try {
      const docRef = doc(firestore, 'companies', companyId);
      await updateDoc(docRef, {
        [`phone${index}`]: name
      });
      setPhoneNames(prev => ({ ...prev, [index]: name }));
      toast.success(`Phone ${index} name updated successfully`);
    } catch (error) {
      console.error('Error updating phone name:', error);
      toast.error('Failed to update phone name');
    }
  };

const handleDeleteEmployee = async (employeeId: string, companyId: any) => {
  try {
    // Get the employee's email before deleting
    const user = getAuth().currentUser;
    if (!user) {
      console.error("User not authenticated");
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
    const employeeRef = doc(firestore, `companies/${companyId}/employee/${employeeId}`);
    const employeeDoc = await getDoc(employeeRef);
    const employeeEmail = employeeDoc.data()?.email;

    if (!employeeEmail) {
      throw new Error('Employee email not found');
    }

    

    // Delete from Firestore
    await deleteDoc(employeeRef);
    
    
    // Delete from Firebase Auth via your API endpoint
    
    const response = await axios.delete(`${baseUrl}/api/auth/user`, {
      data: { email: employeeEmail }
    });
    
    
    if (response.status !== 200) {
      throw new Error('Failed to delete user from authentication');
    }

    // Update UI
    const updatedEmployeeList = employeeList.filter(employee => employee.id !== employeeId);
    setEmployeeList(updatedEmployeeList);
    
    toast.success('Employee deleted successfully');
    toggleModal();
  } catch (error) {
    console.error("Error deleting employee:", error);
    if (axios.isAxiosError(error)) {
      console.error('API Error details:', {
        status: error.response?.status,
        data: error.response?.data
      });
      toast.error(`Failed to delete employee: ${error.response?.data?.message || error.message}`);
    } else {
      toast.error('Failed to delete employee: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }
};

const handlePageChange = ({ selected }: { selected: number }) => {
  setCurrentPage(selected);
};

const [searchTerm, setSearchTerm] = useState("");

const filteredEmployees = useMemo(() => {
  let filtered = employeeList;
  
  if (searchTerm.trim()) {
    const lowercaseSearchTerm = searchTerm.toLowerCase();
    filtered = filtered.filter(employee => 
      employee.name.toLowerCase().includes(lowercaseSearchTerm) ||
      employee.email?.toLowerCase().includes(lowercaseSearchTerm) ||
      employee.employeeId?.toLowerCase().includes(lowercaseSearchTerm) ||
      employee.phoneNumber?.toLowerCase().includes(lowercaseSearchTerm)
    );
  }

  if (selectedGroup) {
    filtered = filtered.filter(employee => employee.group === selectedGroup);
  }

  return filtered;
}, [employeeList, searchTerm, selectedGroup]);

const paginatedEmployees = filteredEmployees
  .sort((a, b) => {
    const roleOrder = { "1": 0, "2": 1, "3": 2, "4": 3, "5": 4 };
    return roleOrder[a.role as keyof typeof roleOrder] - roleOrder[b.role as keyof typeof roleOrder];
  })
  .slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

const handleEmployeeSelection = (employee: Employee) => {
  setSelectedEmployees(prev => {
    const isSelected = prev.some(e => e.id === employee.id);
    if (isSelected) {
      return prev.filter(e => e.id !== employee.id);
    } else {
      return [...prev, employee];
    }
  });
};

const [phoneIndex, setPhoneIndex] = useState<number>(0);

const sendBlastMessage = async () => {
  // Validation checks
  if (selectedEmployees.length === 0) {
    toast.error("No employees selected!");
    return;
  }

  if (!blastStartTime) {
    toast.error("Please select a start time for the blast message.");
    return;
  }

  if (messages.some(msg => !msg.text.trim())) {
    toast.error("Please fill in all message fields");
    return;
  }

  setIsScheduling(true);

  try {
    let mediaUrl = '';
    let documentUrl = '';
    let fileName = '';
    let mimeType = '';

    // Handle media and document uploads
    if (selectedMedia) {
      try {
        mediaUrl = await uploadFile(selectedMedia);
        mimeType = selectedMedia.type;
      } catch (error) {
        console.error('Error uploading media:', error);
        toast.error("Failed to upload media file");
        return;
      }
    }

    if (selectedDocument) {
      try {
        documentUrl = await uploadFile(selectedDocument);
        fileName = selectedDocument.name;
        mimeType = selectedDocument.type;
      } catch (error) {
        console.error('Error uploading document:', error);
        toast.error("Failed to upload document");
        return;
      }
    }

    const user = getAuth(app).currentUser;
    if (!user) {
      toast.error("User not authenticated");
      return;
    }

    const docUserRef = doc(firestore, 'user', user.email!);
    const docUserSnapshot = await getDoc(docUserRef);
    if (!docUserSnapshot.exists()) {
      toast.error("User data not found");
      return;
    }

    const userData = docUserSnapshot.data();
    const companyId = userData.companyId;

    // Get user's default phone index
    let defaultPhoneIndex;
    if (userData?.phone !== undefined) {
      if (userData.phone === 0 || userData.phone === -1) {
        defaultPhoneIndex = 0;
      } else {
        defaultPhoneIndex = userData.phone;
      }
    } else {
      defaultPhoneIndex = 0;
    }

    const companyRef = doc(firestore, 'companies', companyId);
    const companySnapshot = await getDoc(companyRef);
    if (!companySnapshot.exists()) {
      toast.error("Company data not found");
      return;
    }

    const companyData = companySnapshot.data();
    const baseUrl = companyData.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';
    const isV2 = companyData.v2 || false;
    const whapiToken = companyData.whapiToken || '';

    // Process employee phone numbers
    const chatIds = selectedEmployees
      .map(employee => employee.phoneNumber)
      .filter((phone): phone is string => phone !== undefined && phone !== null)
      .map(phone => phone.replace(/\D/g, '') + "@c.us");

    const allMessages = [];
    
    // Add first message to the array
    if (messages.length > 0 && messages[0].text.trim()) {
      allMessages.push({
        text: messages[0].text,
        isMain: true,
        delayAfter: 0
      });
    }
    
    // Add additional messages
    if (messages.length > 1) {
      messages.slice(1).forEach((msg, idx) => {
        if (msg.text.trim()) {
          allMessages.push({
            text: msg.text,
            isMain: false,
            delayAfter: msg.delayAfter || 0
          });
        }
      });
    }

    const scheduledMessageData = {
      chatIds,
      phoneIndex: defaultPhoneIndex,
      messages: allMessages,
      messageDelays: messages.slice(1).map(msg => msg.delayAfter),
      batchQuantity,
      companyId,
      createdAt: Timestamp.now(),
      repeatInterval,
      repeatUnit,
      scheduledTime: Timestamp.fromDate(blastStartTime),
      status: "scheduled",
      v2: isV2,
      whapiToken: isV2 ? null : whapiToken,
      minDelay,
      maxDelay,
      activateSleep,
      sleepAfterMessages: activateSleep ? sleepAfterMessages : null,
      sleepDuration: activateSleep ? sleepDuration : null,
      activeHours: {
        start: activeTimeStart,
        end: activeTimeEnd
      },
      infiniteLoop,
      numberOfBatches: 1,
      isConsolidated: true,
      recipients: selectedEmployees.map(emp => ({
        name: emp.name,
        phone: emp.phoneNumber
      }))
    };

    // If there's media, send it first
    if (mediaUrl || documentUrl) {
      const mediaScheduledTime = new Date(blastStartTime);
      mediaScheduledTime.setMinutes(mediaScheduledTime.getMinutes() - 1);

      const mediaMessageData = {
        ...scheduledMessageData,
        mediaUrl,
        documentUrl,
        fileName,
        mimeType,
        message: '',
        scheduledTime: Timestamp.fromDate(mediaScheduledTime),
        messages: [],
        messageDelays: [],
      };

      try {
        const mediaResponse = await axios.post(`${baseUrl}/api/schedule-message/${companyId}`, mediaMessageData);
        if (!mediaResponse.data.success) {
          throw new Error(mediaResponse.data.message || "Failed to schedule media message");
        }
      } catch (error) {
        console.error('Error scheduling media message:', error);
        if (axios.isAxiosError(error) && error.response?.data) {
          console.error('Server error details:', error.response.data);
        }
        throw error;
      }
    }

    // Schedule the text messages
    const response = await axios.post(`${baseUrl}/api/schedule-message/${companyId}`, scheduledMessageData);

    if (response.data.success) {
      toast.success(`Blast messages scheduled successfully for ${selectedEmployees.length} employees.`);
      toast.info(`Messages will be sent at: ${blastStartTime.toLocaleString()} (local time)`);

      // Reset form and close modal
      setBlastMessageModal(false);
      setBlastMessage("");
      setBlastStartTime(null);
      setSelectedEmployees([]);
      setMessages([{ text: '', delayAfter: 0 }]);
      setBatchQuantity(10);
      setRepeatInterval(0);
      setRepeatUnit('days');
      setSelectedMedia(null);
      setSelectedDocument(null);
    } else {
      toast.error(response.data.message || "Failed to schedule messages");
    }

  } catch (error) {
    console.error('Error scheduling blast messages:', error);
    if (axios.isAxiosError(error) && error.response) {
      const errorMessage = error.response.data.error || 'Unknown server error';
      toast.error(`Failed to schedule message: ${errorMessage}`);
    } else {
      toast.error("An unexpected error occurred while scheduling blast messages.");
    }
  } finally {
    setIsScheduling(false);
  }
};

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header Section */}
      <div className="sticky top-0 z-40 bg-white dark:bg-gray-800 shadow-sm">
        <div className="px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Users Directory</h2>
              <div className="px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900">
                <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                  {employeeList.length} Users
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <FormInput
                  type="text"
                  className="w-64 pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Lucide
                  icon="Search"
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                />
              </div>
              <div className="flex items-center px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                <Lucide icon="User" className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {currentUserEmail && currentUserEmail.split('@')[0]}
                </span>
              </div>
            </div>
          </div>

          {/* Controls Section */}
          <div className="flex items-center justify-between mt-4 pb-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <Link to="settings">
                <Button variant="primary" className="shadow-sm hover:shadow-md transition-shadow duration-200">
                  <Lucide icon="Settings" className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </Link>
              {role === "1" && (
                <Button
                  variant="primary"
                  onClick={() => setBlastMessageModal(true)}
                  className="shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  <Lucide icon="Send" className="w-4 h-4 mr-2" />
                  Send Blast Message
                </Button>
              )}
              <Menu>
                <Menu.Button as={Button} variant="outline-secondary" className="shadow-sm hover:shadow-md transition-shadow duration-200">
                  <Lucide icon="Users" className="w-4 h-4 mr-2" />
                  {selectedGroup || "All Groups"}
                  <Lucide icon="ChevronDown" className="w-4 h-4 ml-2" />
                </Menu.Button>
                <Menu.Items className="absolute z-50 mt-2 w-48 rounded-lg bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="py-1">
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => setSelectedGroup('')}
                          className={`${
                            active ? 'bg-indigo-50 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'
                          } flex items-center w-full px-4 py-2 text-sm`}
                        >
                          <Lucide icon="Users" className="w-4 h-4 mr-2" />
                          All Groups
                        </button>
                      )}
                    </Menu.Item>
                    {groups.map(group => (
                      <Menu.Item key={group}>
                        {({ active }) => (
                          <button
                            onClick={() => setSelectedGroup(group)}
                            className={`${
                              active ? 'bg-indigo-50 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'
                            } flex items-center w-full px-4 py-2 text-sm`}
                          >
                            <Lucide icon="Users" className="w-4 h-4 mr-2" />
                            {group}
                          </button>
                        )}
                      </Menu.Item>
                    ))}
                  </div>
                </Menu.Items>
              </Menu>
            </div>
            <div className="flex items-center space-x-4">
              {phoneCount >= 2 && (
                <Menu>
                  <Menu.Button as={Button} variant="outline-secondary" className="shadow-sm hover:shadow-md transition-shadow duration-200">
                    <Lucide icon="Phone" className="w-4 h-4 mr-2" />
                    Phone Numbers
                    <Lucide icon="ChevronDown" className="w-4 h-4 ml-2" />
                  </Menu.Button>
                  <Menu.Items className="absolute right-0 z-50 mt-2 w-72 rounded-lg bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="p-2">
                      {Object.entries(phoneNames).map(([index, phoneName]) => (
                        <Menu.Item key={index}>
                          {({ active }) => (
                            <div className={`${
                              active ? 'bg-gray-50 dark:bg-gray-700' : ''
                            } px-4 py-3 rounded-md flex items-center justify-between group`}>
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {companyData?.[`phone${index}`] || `Phone ${index}`}
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  {phoneName || `Phone ${index}`}
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  const newName = prompt(`Enter new name for ${phoneName || `Phone ${index}`}`, phoneName);
                                  if (newName) updatePhoneName(parseInt(index), newName);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600"
                              >
                                <Lucide icon="Pencil" className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                              </button>
                            </div>
                          )}
                        </Menu.Item>
                      ))}
                    </div>
                  </Menu.Items>
                </Menu>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-5 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedEmployees.map((employee, index) => (
            <div 
              key={index} 
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-1"
            >
              <div className="p-6">
                <div className="flex items-start space-x-4">
                  {employee.imageUrl ? (
                    <img
                      src={employee.imageUrl}
                      alt={employee.name}
                      className="w-16 h-16 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-700"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center ring-2 ring-gray-200 dark:ring-gray-700">
                      <Lucide icon="User" className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                      {employee.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {employee.email}
                    </p>
                    <div className="mt-2 flex items-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        employee.role === "1" ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                        employee.role === "2" ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        employee.role === "3" ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        employee.role === "4" ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                      }`}>
                        {employee.role === "1" ? 'Admin' :
                         employee.role === "2" ? 'Sales' :
                         employee.role === "3" ? 'Observer' :
                         employee.role === "4" ? 'Manager' :
                         employee.role === "5" ? 'Supervisor' : 'Other'}
                      </span>
                      {employee.employeeId && (
                        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                          #{employee.employeeId}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2">
                    {(role === "1" || (role !== "1" && employee.email === currentUserEmail)) && (
                      <button
                        onClick={() => navigate(`crud-form`, { state: { contactId: employee.id, contact: employee, companyId: companyId || '' } })}
                        className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                        aria-label="Edit"
                      >
                        <Lucide icon="Pencil" className="w-5 h-5" />
                      </button>
                    )}
                    {role === "1" && (
                      <button 
                        onClick={() => toggleModal(employee.id)}
                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                        aria-label="Delete"
                      >
                        <Lucide icon="Trash" className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="mt-6">
          <ReactPaginate
            breakLabel="..."
            nextLabel={<div className="flex items-center">Next <Lucide icon="ChevronRight" className="w-4 h-4 ml-1" /></div>}
            previousLabel={<div className="flex items-center"><Lucide icon="ChevronLeft" className="w-4 h-4 mr-1" /> Previous</div>}
            onPageChange={handlePageChange}
            pageRangeDisplayed={3}
            marginPagesDisplayed={1}
            pageCount={Math.ceil(filteredEmployees.length / itemsPerPage)}
            renderOnZeroPageCount={null}
            containerClassName="flex justify-center items-center space-x-2"
            pageClassName="inline-flex"
            pageLinkClassName="inline-flex items-center px-4 py-2 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm font-medium"
            previousClassName="inline-flex"
            nextClassName="inline-flex"
            previousLinkClassName="inline-flex items-center px-4 py-2 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm font-medium"
            nextLinkClassName="inline-flex items-center px-4 py-2 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm font-medium"
            disabledClassName="opacity-50 cursor-not-allowed"
            activeClassName="font-bold"
            activeLinkClassName="!bg-indigo-50 !text-indigo-600 dark:!bg-indigo-900 dark:!text-indigo-300 !border-indigo-200 dark:!border-indigo-700"
            breakClassName="px-2 py-2 text-gray-500 dark:text-gray-400"
          />
        </div>
      </div>

      {/* Rest of the modals remain unchanged */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="bg-white dark:bg-gray-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Lucide icon="AlertTriangle" className="h-6 w-6 text-red-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-white">
                      Delete User
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Are you sure you want to delete this user? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  onClick={() => handleDeleteEmployee(employeeIdToDelete, companyId)}
                  className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => toggleModal()}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 sm:mt-0 sm:w-auto"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <Dialog open={blastMessageModal} onClose={() => setBlastMessageModal(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
            <Dialog.Title className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">
              Send Blast Message to Employees
            </Dialog.Title>
            
            {/* Employee Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Employees
              </label>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2 bg-white dark:bg-gray-700">
                {employeeList.map((employee) => (
                  <div key={employee.id} className="flex items-center space-x-2 mb-2">
                    <input
                      type="checkbox"
                      checked={selectedEmployees.some(e => e.id === employee.id)}
                      onChange={() => handleEmployeeSelection(employee)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-gray-900 dark:text-white">{employee.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Messages Section */}
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Messages</label>
                <button
                  type="button"
                  className="text-sm text-indigo-600 hover:text-indigo-500"
                  onClick={() => setMessages([...messages, { text: '', delayAfter: 0 }])}
                >
                  Add Message
                </button>
              </div>
              {messages.map((msg, index) => (
                <div key={index} className="mt-2">
                  <textarea
                    className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder={`Message ${index + 1}`}
                    value={msg.text}
                    onChange={(e) => {
                      const newMessages = [...messages];
                      newMessages[index].text = e.target.value;
                      setMessages(newMessages);
                    }}
                    rows={3}
                  />
                  {index > 0 && (
                    <div className="mt-2 flex items-center space-x-2">
                      <label className="text-sm text-gray-700 dark:text-gray-300">Delay after (seconds):</label>
                      <input
                        type="number"
                        value={msg.delayAfter}
                        onChange={(e) => {
                          const newMessages = [...messages];
                          newMessages[index].delayAfter = parseInt(e.target.value) || 0;
                          setMessages(newMessages);
                        }}
                        className="w-20 p-1 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        min="0"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Schedule Time */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Schedule Time
              </label>
              <input
                type="datetime-local"
                onChange={(e) => setBlastStartTime(new Date(e.target.value))}
                className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Batch Settings */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Batch Settings
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={batchQuantity}
                  onChange={(e) => setBatchQuantity(parseInt(e.target.value) || 1)}
                  className="w-20 p-1 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  min="1"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">messages per batch</span>
              </div>
            </div>

            {/* Media Upload */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Attachments
              </label>
              <div className="flex space-x-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400">Media</label>
                  <input
                    type="file"
                    onChange={(e) => setSelectedMedia(e.target.files?.[0] || null)}
                    className="mt-1"
                    accept="image/*,video/*"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400">Document</label>
                  <input
                    type="file"
                    onChange={(e) => setSelectedDocument(e.target.files?.[0] || null)}
                    className="mt-1"
                    accept=".pdf,.doc,.docx,.txt"
                  />
                </div>
              </div>
            </div>

            {/* Sleep Settings */}
            <div className="mt-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={activateSleep}
                  onChange={(e) => setActivateSleep(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Activate Sleep Mode
                </span>
              </label>
              {activateSleep && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-700 dark:text-gray-300">Sleep after:</label>
                    <input
                      type="number"
                      value={sleepAfterMessages || ''}
                      onChange={(e) => setSleepAfterMessages(parseInt(e.target.value) || null)}
                      className="w-20 p-1 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      min="1"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">messages</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-700 dark:text-gray-300">Sleep duration:</label>
                    <input
                      type="number"
                      value={sleepDuration || ''}
                      onChange={(e) => setSleepDuration(parseInt(e.target.value) || null)}
                      className="w-20 p-1 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      min="1"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">seconds</span>
                  </div>
                </div>
              )}
            </div>

            {/* Active Hours */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Active Hours
              </label>
              <div className="flex items-center space-x-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400">Start</label>
                  <input
                    type="time"
                    value={activeTimeStart}
                    onChange={(e) => setActiveTimeStart(e.target.value)}
                    className="mt-1 p-1 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400">End</label>
                  <input
                    type="time"
                    value={activeTimeEnd}
                    onChange={(e) => setActiveTimeEnd(e.target.value)}
                    className="mt-1 p-1 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Infinite Loop */}
            <div className="mt-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={infiniteLoop}
                  onChange={(e) => setInfiniteLoop(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Infinite Loop
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setBlastMessageModal(false)}
                className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={sendBlastMessage}
                disabled={isScheduling}
                className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isScheduling ? "Scheduling..." : "Schedule Message"}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}

export default Main;
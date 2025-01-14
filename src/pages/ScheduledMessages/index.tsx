import _ from "lodash";
import { useState, useEffect } from "react";

import { getAuth } from 'firebase/auth';
import Button from "@/components/Base/Button";
import { FormInput } from "@/components/Base/Form";
import Lucide from "@/components/Base/Lucide";
import Table from "@/components/Base/Table";
import { useNavigate } from "react-router-dom";
import { format } from 'date-fns';
import { ToastContainer, toast } from 'react-toastify';
import LoadingIcon from "@/components/Base/LoadingIcon";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDoc, setDoc, getDocs, deleteDoc, updateDoc,addDoc, arrayUnion, arrayRemove, Timestamp, query, where, onSnapshot, orderBy, limit, serverTimestamp, writeBatch, increment, deleteField } from 'firebase/firestore';


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
  
function Main() {
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

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
  const fetchAllScheduledMessages = async () => {
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

      const fetchedMessages: ScheduledMessage[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedMessages.push({ 
          id: doc.id, 
          ...data,
          chatIds: data.chatIds || [],
          message: data.message || '',
        } as ScheduledMessage);
      });

      // Sort messages by scheduledTime
      fetchedMessages.sort((a, b) => a.scheduledTime.toDate().getTime() - b.scheduledTime.toDate().getTime());
      setMessages(fetchedMessages);
    } catch (error) {
      console.error("Error fetching scheduled messages:", error);
      toast.error("Failed to fetch scheduled messages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllScheduledMessages();
  }, []);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    return format(date, "MMM d, yyyy 'at' h:mm a");
  };

  const filteredMessages = messages.filter(message =>
    message.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (message.additionalInfo?.contactName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <h2 className="mt-10 text-lg font-medium intro-y">Scheduled Messages</h2>
      <div className="grid grid-cols-12 gap-6 mt-5">
        <div className="flex flex-wrap items-center col-span-12 mt-2 intro-y sm:flex-nowrap">
          <Button variant="primary" className="mr-2 shadow-md" onClick={() => navigate(-1)}>
            Back
          </Button>
          <div className="hidden mx-auto md:block text-slate-500">
            Showing {filteredMessages.length} messages
          </div>
          <div className="w-full mt-3 sm:w-auto sm:mt-0 sm:ml-auto md:ml-0">
            <div className="relative w-56 text-slate-500">
              <FormInput
                type="text"
                className="w-56 pr-10 !box"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Lucide
                icon="Search"
                className="absolute inset-y-0 right-0 w-4 h-4 my-auto mr-3"
              />
            </div>
          </div>
        </div>
        {/* BEGIN: Data List */}
        <div className="col-span-12 overflow-auto intro-y lg:overflow-visible">
          {loading ? (
            <div className="flex justify-center mt-10">
              <LoadingIcon icon="puff" className="w-14 h-14" />
            </div>
          ) : (
            <Table className="border-spacing-y-[10px] border-separate -mt-2">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th className="border-b-0 whitespace-nowrap">MESSAGE</Table.Th>
                  <Table.Th className="border-b-0 whitespace-nowrap">SCHEDULED TIME</Table.Th>
                  <Table.Th className="border-b-0 whitespace-nowrap">RECIPIENTS</Table.Th>
                  <Table.Th className="border-b-0 whitespace-nowrap">STATUS</Table.Th>
                  <Table.Th className="border-b-0 whitespace-nowrap">MEDIA</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredMessages.map((message) => (
                  <Table.Tr key={message.id} className="intro-x">
                    <Table.Td className="first:rounded-l-md last:rounded-r-md bg-white border-b-0 dark:bg-darkmode-600 shadow-[20px_3px_20px_#0000000b]">
                      <div className="max-w-md truncate">{message.message}</div>
                    </Table.Td>
                    <Table.Td className="first:rounded-l-md last:rounded-r-md bg-white border-b-0 dark:bg-darkmode-600 shadow-[20px_3px_20px_#0000000b]">
                      {formatDate(message.scheduledTime)}
                    </Table.Td>
                    <Table.Td className="first:rounded-l-md last:rounded-r-md bg-white border-b-0 dark:bg-darkmode-600 shadow-[20px_3px_20px_#0000000b]">
                      {message.chatIds.length}
                    </Table.Td>
                    <Table.Td className="first:rounded-l-md last:rounded-r-md bg-white border-b-0 dark:bg-darkmode-600 shadow-[20px_3px_20px_#0000000b]">
                      <div className="flex items-center justify-center whitespace-nowrap">
                        <div className="flex items-center justify-center">
                          <div className={`w-2 h-2 rounded-full mr-2 ${
                            message.status === 'scheduled' ? 'bg-pending' : 
                            message.status === 'sent' ? 'bg-success' : 'bg-danger'
                          }`}></div>
                          {_.capitalize(message.status)}
                        </div>
                      </div>
                    </Table.Td>
                    <Table.Td className="first:rounded-l-md last:rounded-r-md bg-white border-b-0 dark:bg-darkmode-600 shadow-[20px_3px_20px_#0000000b]">
                      <div className="flex justify-center">
                        {message.mediaUrl && <Lucide icon="Image" className="w-4 h-4 mr-1" />}
                        {message.documentUrl && <Lucide icon="File" className="w-4 h-4" />}
                      </div>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </div>
        {/* END: Data List */}
      </div>
      <ToastContainer />
    </>
  );
}

export default Main; 
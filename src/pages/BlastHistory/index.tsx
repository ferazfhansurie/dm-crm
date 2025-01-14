import React, { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Button from "@/components/Base/Button";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Select from 'react-select';

interface User {
    companyId: string;
}

interface Tag {
    id: string;
    name: string;
}

interface ScheduledMessage {
  id: string;
  message: string;
  chatIds: string[];
  companyId: string;
  createdAt: Date;
  documentUrl: string;
  fileName: string | null;
  mediaUrl: string;
  status: 'scheduled' | 'completed' | 'failed';
  batchQuantity: number;
  activateSleep: boolean;
  maxDelay: number | null;
  minDelay: number | null;
  numberOfBatches: number;
  phoneIndex: number;
  repeatInterval: number;
  repeatUnit: string;
  scheduledTime: Date;
  sleepAfterMessages: number | null;
  sleepDuration: number | null;
  type: string;
  v2: boolean;
  whapiToken: string | null;
  messages?: {
    chatId: string;
    message: string;
    mimeType: string | null;
  }[];
  recipients?: {
    name: string;
    phone: string;
  }[];
  batches?: {
    id: string;
    status: string;
    count: number;
  }[];
}

const BlastHistoryPage: React.FC = () => {
    const [messages, setMessages] = useState<ScheduledMessage[]>([]);
    const [selectedDocument, setSelectedDocument] = useState<File | null>(null);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'scheduled' | 'completed' | 'failed'>('all');
    const [selectedRecipients, setSelectedRecipients] = useState<{name: string; phone: string;}[]>([]);
    const [isRecipientsModalOpen, setIsRecipientsModalOpen] = useState(false);

    useEffect(() => {
        fetchTags();
        fetchScheduledMessages();
    }, []);

    const fetchTags = async () => {
        try {
            const auth = getAuth();
            const firestore = getFirestore();
            const user = auth.currentUser;
            if (!user) return;

            const userRef = doc(firestore, 'user', user.email!);
            const userData = (await getDoc(userRef)).data() as User;
            
            const tagsRef = collection(firestore, `companies/${userData.companyId}/tags`);
            const tagsSnapshot = await getDocs(tagsRef);
            
            const fetchedTags = tagsSnapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name
            }));

            setTags(fetchedTags);
        } catch (error) {
            console.error('Error fetching tags:', error);
        }
    };
    const uploadDocument = async (file: File): Promise<string> => {
        const storage = getStorage();
        const storageRef = ref(storage, `quickReplies/${file.name}`);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    };

    const uploadImage = async (file: File): Promise<string> => {
        const storage = getStorage();
        const storageRef = ref(storage, `images/${file.name}`);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    };

    const fetchScheduledMessages = async () => {
        try {
            const auth = getAuth();
            const firestore = getFirestore();
            const user = auth.currentUser;
            if (!user) return;

            const userRef = doc(firestore, 'user', user.email!);
            const userData = (await getDoc(userRef)).data() as User;
            
            const messagesRef = collection(firestore, `companies/${userData.companyId}/scheduledMessages`);
            const messagesSnapshot = await getDocs(messagesRef);
            
            const fetchedMessages = await Promise.all(messagesSnapshot.docs.map(async (docSnapshot) => {
                const messageData = docSnapshot.data();
                
                // Fetch recipient details for each chatId
                const recipients = await Promise.all((messageData.chatIds || []).map(async (chatId: string) => {
                    const phoneNumber = '+' + chatId.split('@')[0];
                    
                    const contactRef = doc(firestore, `companies/${userData.companyId}/contacts`, phoneNumber);
                    const contactDoc = await getDoc(contactRef);
                    
                    if (contactDoc.exists()) {
                        const contactData = contactDoc.data();
                        const name = contactData.contactName || 
                                   contactData.name ||
                                   contactData.fullName ||
                                   phoneNumber;
                        
                        return {
                            name,
                            phone: phoneNumber
                        };
                    }
                    return {
                        name: phoneNumber,
                        phone: phoneNumber
                    };
                }));
                
                return {
                    id: docSnapshot.id,
                    message: messageData.message || '',
                    chatIds: messageData.chatIds || [],
                    companyId: messageData.companyId,
                    createdAt: messageData.createdAt?.toDate() || new Date(),
                    documentUrl: messageData.documentUrl || '',
                    fileName: messageData.fileName || null,
                    mediaUrl: messageData.mediaUrl || '',
                    status: messageData.status,
                    batchQuantity: messageData.batchQuantity || 1,
                    activateSleep: messageData.activateSleep || false,
                    maxDelay: messageData.maxDelay || null,
                    minDelay: messageData.minDelay || null,
                    numberOfBatches: messageData.numberOfBatches || 1,
                    phoneIndex: messageData.phoneIndex || 0,
                    repeatInterval: messageData.repeatInterval || 0,
                    repeatUnit: messageData.repeatUnit || 'days',
                    scheduledTime: messageData.scheduledTime?.toDate() || new Date(),
                    sleepAfterMessages: messageData.sleepAfterMessages || null,
                    sleepDuration: messageData.sleepDuration || null,
                    type: messageData.type || '',
                    v2: messageData.v2 || false,
                    whapiToken: messageData.whapiToken || null,
                    messages: messageData.messages || [],
                    recipients,
                } as ScheduledMessage;
            }));

            setMessages(fetchedMessages);
        } catch (error) {
            console.error('Error fetching scheduled messages:', error);
            toast.error('Failed to fetch messages');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteMessage = async (messageId: string) => {
        try {
            const auth = getAuth();
            const firestore = getFirestore();
            const user = auth.currentUser;
            if (!user) return;

            const userRef = doc(firestore, 'user', user.email!);
            const userData = (await getDoc(userRef)).data() as User;
            
            // Delete the message document
            await deleteDoc(doc(firestore, `companies/${userData.companyId}/scheduledMessages/${messageId}`));
            
            // Update the local state
            setMessages(messages.filter(msg => msg.id !== messageId));
            toast.success('Message deleted successfully');
        } catch (error) {
            console.error('Error deleting message:', error);
            toast.error('Failed to delete message');
        }
    };

    const filteredMessages = messages.filter(message => {
        // First apply status filter
        if (filter !== 'all' && message.status !== filter) return false;
        
        // Then apply search filter if there's a search query
        if (searchQuery.trim()) {
            return message.message.toLowerCase().includes(searchQuery.toLowerCase());
        }
        
        return true;
    }).sort((a, b) => {
        // Define status priority
        const statusPriority = {
            scheduled: 0,
            completed: 1,
            failed: 2
        };
        
        if (filter === 'all') {
            // First sort by status
            const statusCompare = statusPriority[a.status] - statusPriority[b.status];
            if (statusCompare !== 0) return statusCompare;
        }
        
        // Then sort by date (most recent first)
        return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return (
        <div className="h-screen overflow-hidden flex flex-col">
            <div className="mb-6 p-5">
                <h1 className="text-2xl font-bold mb-4">Blast History</h1>
                <div className="flex flex-col gap-4">
                    <div className="relative w-full">
                        <input
                            type="text"
                            placeholder="Search messages..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary w-full"
                        />
                        <svg
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            width="20"
                            height="20"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M21 21l-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button 
                            onClick={() => setFilter('all')}
                            className={filter === 'all' ? 'text-white bg-primary' : 'text-white bg-gray-500'}
                        >
                            All
                        </Button>
                        <Button 
                            onClick={() => setFilter('scheduled')}
                            className={filter === 'scheduled' ? 'text-white bg-primary' : 'text-white bg-gray-500'}
                        >
                            Scheduled
                        </Button>
                        <Button 
                            onClick={() => setFilter('completed')}
                            className={filter === 'completed' ? 'text-white bg-primary' : 'text-white bg-gray-500'}
                        >
                            Completed
                        </Button>
                        <Button 
                            onClick={() => setFilter('failed')}
                            className={filter === 'failed' ? 'text-white bg-primary' : 'text-white bg-gray-500'}
                        >
                            Failed
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-5">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <span>Loading...</span>
                    </div>
                ) : (
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        {filteredMessages.map(message => (
                            <div key={message.id} className="border rounded-lg p-4 flex flex-col h-full">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-medium">{message.message}</p>
                                        <button
                                            onClick={() => {
                                                setSelectedRecipients(message.recipients || []);
                                                setIsRecipientsModalOpen(true);
                                            }}
                                            className="text-sm text-black hover:text-black hover:underline bg-transparent border-none cursor-pointer"
                                        >
                                            Recipients: {message.chatIds.length}
                                        </button>
                                        <div>
                                            {message.documentUrl && (
                                                <a 
                                                    href={message.documentUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-500 hover:underline text-sm"
                                                >
                                                    {message.fileName}
                                                </a>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500">
                                            {message.createdAt.toLocaleDateString('en-GB')} {message.createdAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        {message.mediaUrl && (
                                            <div className="mt-2">
                                                <img
                                                    src={message.mediaUrl}
                                                    alt="Message Image"
                                                    className="rounded-lg cursor-pointer max-h-48 object-contain"
                                                    onClick={() => window.open(message.mediaUrl!, '_blank')}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-sm font-semibold capitalize ${
                                        message.status === 'completed' ? 'bg-green-100 text-green-800' :
                                        message.status === 'failed' ? 'bg-red-100 text-red-800' :
                                        'bg-blue-100 text-blue-800'
                                    }`}>
                                        {message.status}
                                    </span>
                                </div>
                                
                                {message.batches && message.batches.length > 0 && (
                                    <div className="mt-4">
                                        <p className="text-sm font-medium mb-2">Batches</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            {message.batches.map(batch => (
                                                <div key={batch.id} className="text-sm p-2 bg-gray-50 rounded">
                                                    <p>Count: {batch.count}</p>
                                                    <p>Status: {batch.status}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="mt-auto pt-4">
                                    {(message.status === 'completed' || message.status === 'scheduled' || message.status === 'failed') && (
                                        <Button
                                            onClick={() => handleDeleteMessage(message.id)}
                                            className="bg-red-500 hover:bg-red-600 text-white w-full"
                                        >
                                            Delete Message
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isRecipientsModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Recipients List</h2>
                            <Button
                                onClick={() => setIsRecipientsModalOpen(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <span className="text-xl">×</span>
                            </Button>
                        </div>
                        <div className="divide-y">
                            {selectedRecipients.map((recipient, index) => (
                                <div key={index} className="py-3 flex justify-between items-center">
                                    <div>
                                        <p className="font-medium">{recipient.name}</p>
                                        <p className="text-gray-600">{recipient.phone}</p>
                                    </div>
                                </div>
                            ))}
                            {selectedRecipients.length === 0 && (
                                <p className="text-gray-500 py-2">No recipients found</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BlastHistoryPage;
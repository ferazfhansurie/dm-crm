import React, { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Button from "@/components/Base/Button";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Select from 'react-select';
import { format } from 'date-fns';

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
  recipients?: {
    name: string;
    phone: string;
  }[];
  batches?: {
    id: string;
    status: string;
    count: number;
  }[];
  messages?: {
    text: string;
    delayAfter?: number;
  }[];
  messageDelays?: number[];
  templateData?: {
    hasPlaceholders: boolean;
  };
  processedMessages?: {
    message: string;
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
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initializeFirestore = async () => {
            try {
                const auth = getAuth();
                // Wait for auth state to be ready
                await new Promise((resolve) => {
                    const unsubscribe = auth.onAuthStateChanged((user) => {
                        unsubscribe();
                        resolve(user);
                    });
                });

                if (!auth.currentUser) {
                    setError("User not authenticated");
                    return;
                }

                await fetchTags();
                await fetchScheduledMessages();
            } catch (err) {
                console.error("Initialization error:", err);
                setError("Failed to initialize Firestore connection");
                toast.error("Failed to connect to database");
            }
        };

        initializeFirestore();
    }, []);

    const fetchTags = async () => {
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
            try {
                const auth = getAuth();
                const firestore = getFirestore();
                const user = auth.currentUser;
                
                if (!user) {
                    throw new Error("User not authenticated");
                }

                const userRef = doc(firestore, 'user', user.email!);
                const userSnap = await getDoc(userRef);
                
                if (!userSnap.exists()) {
                    throw new Error("User data not found");
                }
                
                const userData = userSnap.data() as User;
                const tagsRef = collection(firestore, `companies/${userData.companyId}/tags`);
                const tagsSnapshot = await getDocs(tagsRef);
                
                const fetchedTags = tagsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    name: doc.data().name
                }));

                setTags(fetchedTags);
                return;
            } catch (error) {
                retryCount++;
                console.error(`Error fetching tags (attempt ${retryCount}/${maxRetries}):`, error);
                
                if (retryCount === maxRetries) {
                    toast.error("Failed to fetch tags");
                    setError("Failed to fetch tags");
                } else {
                    // Exponential backoff
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
                }
            }
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
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
            try {
                setLoading(true);
                const auth = getAuth();
                const firestore = getFirestore();
                const user = auth.currentUser;
                
                if (!user) {
                    throw new Error("User not authenticated");
                }

                const userRef = doc(firestore, 'user', user.email!);
                const userSnap = await getDoc(userRef);
                
                if (!userSnap.exists()) {
                    throw new Error("User data not found");
                }
                
                const userData = userSnap.data() as User;
                const messagesRef = collection(firestore, `companies/${userData.companyId}/scheduledMessages`);
                const q = query(messagesRef, orderBy('createdAt', 'desc'));
                const messagesSnapshot = await getDocs(q);
                
                const fetchedMessages = await Promise.all(messagesSnapshot.docs.map(async (docSnapshot) => {
                    const messageData = docSnapshot.data();
                    return {
                        id: docSnapshot.id,
                        ...messageData,
                        createdAt: messageData.createdAt?.toDate() || new Date(),
                        scheduledTime: messageData.scheduledTime?.toDate() || new Date()
                    } as ScheduledMessage;
                }));

                setMessages(fetchedMessages);
                return;
            } catch (error) {
                retryCount++;
                console.error(`Error fetching messages (attempt ${retryCount}/${maxRetries}):`, error);
                
                if (retryCount === maxRetries) {
                    toast.error("Failed to fetch messages");
                    setError("Failed to fetch messages");
                } else {
                    // Exponential backoff
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
                }
            } finally {
                setLoading(false);
            }
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

    const processScheduledMessage = (message: ScheduledMessage) => {
        if (!message.templateData?.hasPlaceholders) {
            return message.message;
        }

        if (message.processedMessages && message.processedMessages.length > 0) {
            return `Template: ${message.message}\nExample: ${message.processedMessages[0].message}`;
        }

        return message.message;
    };

    const formatDate = (date: Date) => {
        return format(date, "MMM d, yyyy 'at' h:mm a");
    };

    return (
        <div className="h-screen overflow-hidden flex flex-col">
            {error ? (
                <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                        <p className="text-red-500 mb-4">{error}</p>
                        <Button 
                            onClick={() => window.location.reload()}
                            className="bg-primary text-white"
                        >
                            Retry
                        </Button>
                    </div>
                </div>
            ) : (
                <>
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
                                    <div key={message.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg flex flex-col h-full">
                                        <div className="p-4 flex-grow">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className={`text-sm font-medium ${
                                                    message.status === 'completed' ? 'capitalize text-green-600 dark:text-green-400' :
                                                    message.status === 'failed' ? 'capitalize text-red-600 dark:text-red-400' :
                                                    'capitalize text-indigo-600 dark:text-indigo-400'
                                                }`}>
                                                    {message.status === 'scheduled' ? 'Scheduled' : message.status}
                                                </span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    {formatDate(message.scheduledTime)}
                                                </span>
                                            </div>
                                            <div className="text-gray-800 dark:text-gray-200 mb-2 font-medium text-md">
                                                {/* First Message */}
                                                <p className="line-clamp-2">
                                                    {processScheduledMessage(message)}
                                                </p>

                                                {/* Additional Messages */}
                                                {message.messages && message.messages.length > 0 && (
                                                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                                        {message.messages.map((msg, index) => (
                                                            <div key={index} className="mt-2">
                                                                <p className="line-clamp-2">
                                                                    Message {index + 2}: {msg.text}
                                                                </p>
                                                                {message.messageDelays && message.messageDelays[index] > 0 && (
                                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                        Delay: {message.messageDelays[index]} seconds
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Message Settings */}
                                                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                        {/* Batch Settings */}
                                                        <div>
                                                            <span className="font-semibold">Batch Size:</span> {message.batchQuantity}
                                                        </div>
                                                        
                                                        {/* Delay Settings */}
                                                        {(message.minDelay || message.maxDelay) && (
                                                            <div>
                                                                <span className="font-semibold">Delay:</span> {message.minDelay}-{message.maxDelay}s
                                                            </div>
                                                        )}

                                                        {/* Sleep Settings */}
                                                        {message.activateSleep && (
                                                            <>
                                                                <div>
                                                                    <span className="font-semibold">Sleep After:</span> {message.sleepAfterMessages} messages
                                                                </div>
                                                                <div>
                                                                    <span className="font-semibold">Sleep Duration:</span> {message.sleepDuration} minutes
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Recipients */}
                                            {message.recipients && message.recipients.length > 0 && (
                                                <div className="flex items-center text-xs text-gray-600 dark:text-gray-400 mt-2">
                                                    <div className="ml-5 max-h-20 overflow-y-auto">
                                                        {message.recipients.map((recipient, index) => (
                                                            <div key={index} className="truncate">
                                                                {recipient.name || recipient.phone}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Media Attachments */}
                                            {message.mediaUrl && (
                                                <div className="flex items-center text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                    <span>Media attached</span>
                                                </div>
                                            )}
                                            {message.documentUrl && (
                                                <div className="flex items-center text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                    <span>{message.fileName || 'Document attached'}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 flex justify-end mt-auto">
                                            <Button
                                                onClick={() => handleDeleteMessage(message.id)}
                                                className="text-sm bg-red-600 hover:bg-red-700 text-white font-medium py-1 px-3 rounded-md shadow-sm transition-colors duration-200"
                                            >
                                                Delete
                                            </Button>
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
                </>
            )}
        </div>
    );
};

export default BlastHistoryPage;
import React, { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Button from "@/components/Base/Button";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from "react-router-dom";

interface ScheduledMessage {
    id: string;
    messages: string[];
    times: string[];
    frequency: number;
    status: 'active' | 'inactive';
    createdAt: Date;
    lastSent?: Date;
    documents?: string[];
    images?: string[];
    stopKeyword: string;
    distributionMethod: 'evenly' | 'random';
}

interface TimeOption {
    value: string;
    label: string;
}

const TIME_OPTIONS: TimeOption[] = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minute = (i % 2) * 30;
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    const ampm = hour < 12 ? 'AM' : 'PM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return {
        value: timeString,
        label: `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`
    };
});

const FREQUENCY_OPTIONS = [
    { value: 1, label: 'Once per day' },
    { value: 2, label: 'Twice per day' },
    { value: 3, label: 'Three times per day' },
    { value: 4, label: 'Four times per day' },
    { value: 6, label: 'Six times per day' },
];

const ScheduledMessagePage: React.FC = () => {
    const [messages, setMessages] = useState<ScheduledMessage[]>([]);
    const [selectedDocuments, setSelectedDocuments] = useState<File[]>([]);
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingMessage, setEditingMessage] = useState<ScheduledMessage | null>(null);

    const [newMessage, setNewMessage] = useState({
        messages: [''],
        times: ['09:00'],
        frequency: 1,
        status: 'active' as const,
        stopKeyword: 'STOP',
        distributionMethod: 'evenly' as 'evenly' | 'random'
    });

    const navigate = useNavigate();
    const firestore = getFirestore();
    const auth = getAuth();
    const storage = getStorage();

    useEffect(() => {
        fetchMessages();
    }, []);

    const BackButton: React.FC = () => {
        return (
            <Button
                onClick={() => navigate(-1)}
                className="mr-4"
            >
                ← Back
            </Button>
        );
    };

    const fetchMessages = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const userRef = doc(firestore, 'user', user.email!);
            const userSnapshot = await getDoc(userRef);
            if (!userSnapshot.exists()) return;
            const userData = userSnapshot.data();
            const companyId = userData.companyId;

            const messagesRef = collection(firestore, `companies/${companyId}/scheduledNurture`);
            const messagesQuery = query(messagesRef, orderBy('createdAt', 'desc'));
            const messagesSnapshot = await getDocs(messagesQuery);

            const fetchedMessages: ScheduledMessage[] = messagesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt.toDate(),
                lastSent: doc.data().lastSent?.toDate(),
            } as ScheduledMessage));

            setMessages(fetchedMessages);
        } catch (error) {
            console.error('Error fetching messages:', error);
            toast.error('Failed to fetch messages');
        }
    };

    const uploadFile = async (file: File, path: string): Promise<string> => {
        const storageRef = ref(storage, `${path}/${file.name}`);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    };

    const uploadFiles = async (files: File[], path: string): Promise<string[]> => {
        const uploadPromises = files.map(file => uploadFile(file, path));
        return Promise.all(uploadPromises);
    };

    const addMessageField = () => {
        setNewMessage({
            ...newMessage,
            messages: [...newMessage.messages, '']
        });
    };

    const removeMessageField = (index: number) => {
        const updatedMessages = newMessage.messages.filter((_, i) => i !== index);
        setNewMessage({
            ...newMessage,
            messages: updatedMessages
        });
    };

    const updateMessageText = (index: number, value: string) => {
        const updatedMessages = [...newMessage.messages];
        updatedMessages[index] = value;
        setNewMessage({
            ...newMessage,
            messages: updatedMessages
        });
    };

    const addMessage = async () => {
        if (newMessage.messages.some(msg => msg.trim() === '')) {
            toast.error('Messages cannot be empty');
            return;
        }

        try {
            const user = auth.currentUser;
            if (!user) {
                toast.error('No authenticated user');
                return;
            }

            const userRef = doc(firestore, 'user', user.email!);
            const userSnapshot = await getDoc(userRef);
            if (!userSnapshot.exists()) return;
            const userData = userSnapshot.data();
            const companyId = userData.companyId;

            const newMessageData = {
                ...newMessage,
                createdAt: serverTimestamp(),
                documents: selectedDocuments.length ? await uploadFiles(selectedDocuments, 'documents') : [],
                images: selectedImages.length ? await uploadFiles(selectedImages, 'images') : [],
            };

            const messageRef = collection(firestore, `companies/${companyId}/scheduledNurture`);
            await addDoc(messageRef, newMessageData);

            setNewMessage({
                messages: [''],
                times: ['09:00'],
                frequency: 1,
                status: 'active',
                stopKeyword: 'STOP',
                distributionMethod: 'evenly'
            });
            setSelectedDocuments([]);
            setSelectedImages([]);
            fetchMessages();
            toast.success('Messages added successfully');
        } catch (error) {
            console.error('Error adding messages:', error);
            toast.error('Failed to add messages');
        }
    };

    const updateMessage = async (id: string, updatedData: Partial<ScheduledMessage>) => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const userRef = doc(firestore, 'user', user.email!);
            const userSnapshot = await getDoc(userRef);
            if (!userSnapshot.exists()) return;
            const companyId = userSnapshot.data().companyId;

            const messageRef = doc(firestore, `companies/${companyId}/scheduledNurture`, id);

            if (selectedDocuments.length > 0) {
                updatedData.documents = await uploadFiles(selectedDocuments, 'documents');
            }
            if (selectedImages.length > 0) {
                updatedData.images = await uploadFiles(selectedImages, 'images');
            }

            await updateDoc(messageRef, updatedData);
            setIsEditing(null);
            setEditingMessage(null);
            setSelectedDocuments([]);
            setSelectedImages([]);
            fetchMessages();
            toast.success('Message updated successfully');
        } catch (error) {
            console.error('Error updating message:', error);
            toast.error('Failed to update message');
        }
    };

    const deleteMessage = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this message?')) return;

        try {
            const user = auth.currentUser;
            if (!user) return;

            const userRef = doc(firestore, 'user', user.email!);
            const userSnapshot = await getDoc(userRef);
            if (!userSnapshot.exists()) return;
            const companyId = userSnapshot.data().companyId;

            const messageRef = doc(firestore, `companies/${companyId}/scheduledNurture`, id);
            await deleteDoc(messageRef);
            fetchMessages();
            toast.success('Message deleted successfully');
        } catch (error) {
            console.error('Error deleting message:', error);
            toast.error('Failed to delete message');
        }
    };

    const filteredMessages = messages.filter(message =>
        message.messages.some(msg => msg.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <div className="flex-grow overflow-y-auto">
                <div className="p-5 min-h-full">
                    <BackButton />
                    <h2 className="text-2xl font-bold mb-5">Scheduled Messages</h2>

                    {/* Add new message form */}
                    <div className="mb-5 p-4 border rounded-lg">
                        <div className="mb-4">
                            <div className="flex justify-between items-center mb-2">
                                <label className="block font-medium">Messages</label>
                                <Button
                                    onClick={addMessageField}
                                    variant="secondary"
                                    className="text-sm"
                                >
                                    + Add Another Message
                                </Button>
                            </div>
                            {newMessage.messages.map((message, index) => (
                                <div key={index} className="flex gap-2 mb-2">
                                 <textarea
    className="flex-grow px-4 py-2 border rounded-lg"
    placeholder={`Enter message ${index + 1}`}
    rows={3}
    value={message}
    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateMessageText(index, e.target.value)}
/>
                                    {newMessage.messages.length > 1 && (
                                        <button
                                            onClick={() => removeMessageField(index)}
                                            className="px-2 text-red-500 hover:text-red-700"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block mb-2">Send Times</label>
                                <div className="space-y-2">
                                    {Array.from({ length: newMessage.frequency }).map((_, index) => (
                                        <div key={index} className="flex gap-2">
                                            <select
                                                className="w-full px-4 py-2 border rounded-lg"
                                                value={newMessage.times[index] || ''}
                                                onChange={(e) => {
                                                    const newTimes = [...newMessage.times];
                                                    newTimes[index] = e.target.value;
                                                    setNewMessage({ ...newMessage, times: newTimes });
                                                }}
                                            >
                                                {TIME_OPTIONS.map(option => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block mb-2">Frequency</label>
                                <select
                                    className="w-full px-4 py-2 border rounded-lg"
                                    value={newMessage.frequency}
                                    onChange={(e) => {
                                        const newFrequency = parseInt(e.target.value);
                                        let newTimes = [...newMessage.times];
                                        // Adjust times array based on new frequency
                                        if (newFrequency > newTimes.length) {
                                            // Add more times if frequency increased
                                            while (newTimes.length < newFrequency) {
                                                newTimes.push('09:00');
                                            }
                                        } else if (newFrequency < newTimes.length) {
                                            // Remove times if frequency decreased
                                            newTimes = newTimes.slice(0, newFrequency);
                                        }
                                        setNewMessage({
                                            ...newMessage,
                                            frequency: newFrequency,
                                            times: newTimes
                                        });
                                    }}
                                >
                                    {FREQUENCY_OPTIONS.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block mb-2">Stop Keyword</label>
                            <input
                                className="w-full px-4 py-2 border rounded-lg"
                                placeholder="Enter stop keyword (e.g., STOP)"
                                value={newMessage.stopKeyword}
                                onChange={(e) => setNewMessage({ ...newMessage, stopKeyword: e.target.value })}
                            />
                        </div>

                        <div className="mb-4">
                            <div className="flex gap-4">
                                <div>
                                    <input
                                        type="file"
                                        id="documents"
                                        className="hidden"
                                        multiple
                                        onChange={(e) => setSelectedDocuments(Array.from(e.target.files || []))}
                                    />
                                    <label
                                        htmlFor="documents"
                                        className="px-4 py-2 bg-gray-200 rounded-lg cursor-pointer hover:bg-gray-300"
                                    >
                                        Attach Documents
                                    </label>
                                </div>

                                <div>
                                    <input
                                        type="file"
                                        id="images"
                                        className="hidden"
                                        multiple
                                        accept="image/*"
                                        onChange={(e) => setSelectedImages(Array.from(e.target.files || []))}
                                    />
                                    <label
                                        htmlFor="images"
                                        className="px-4 py-2 bg-gray-200 rounded-lg cursor-pointer hover:bg-gray-300"
                                    >
                                        Attach Images
                                    </label>
                                </div>
                            </div>
                            
                            {(selectedDocuments.length > 0 || selectedImages.length > 0) && (
                                <div className="mt-2">
                                    {selectedDocuments.map((doc, index) => (
                                        <div key={`doc-${index}`} className="text-sm text-gray-600">
                                            📄 {doc.name}
                                        </div>
                                    ))}
                                    {selectedImages.map((img, index) => (
                                        <div key={`img-${index}`} className="text-sm text-gray-600">
                                            🖼️ {img.name}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <Button
                            onClick={addMessage}
                            className="w-full"
                        >
                            Add Schedule
                        </Button>
                    </div>

                    {/* Edit form */}
                    {isEditing && editingMessage && (
                        <div className="mb-5 p-4 border rounded-lg">
                            {/* Messages section */}
                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block font-medium">Messages</label>
                                    <Button
                                        onClick={() => {
                                            setEditingMessage({
                                                ...editingMessage,
                                                messages: [...editingMessage.messages, '']
                                            });
                                        }}
                                        variant="secondary"
                                        className="text-sm"
                                    >
                                        + Add Another Message
                                    </Button>
                                </div>
                                {editingMessage.messages.map((message, index) => (
                                    <div key={index} className="flex gap-2 mb-2">
                                        <textarea
                                            className="flex-grow px-4 py-2 border rounded-lg"
                                            placeholder={`Enter message ${index + 1}`}
                                            rows={3}
                                            value={message}
                                            onChange={(e) => {
                                                const newMessages = [...editingMessage.messages];
                                                newMessages[index] = e.target.value;
                                                setEditingMessage({
                                                    ...editingMessage,
                                                    messages: newMessages
                                                });
                                            }}
                                        />
                                        {editingMessage.messages.length > 1 && (
                                            <button
                                                onClick={() => {
                                                    const newMessages = editingMessage.messages.filter((_, i) => i !== index);
                                                    setEditingMessage({
                                                        ...editingMessage,
                                                        messages: newMessages
                                                    });
                                                }}
                                                className="px-2 text-red-500 hover:text-red-700"
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Times selection */}
                            <div>
                                <label className="block mb-2">Send Times</label>
                                <div className="space-y-2">
                                    {Array.from({ length: editingMessage.frequency }).map((_, index) => (
                                        <div key={index} className="flex gap-2">
                                            <select
                                                className="w-full px-4 py-2 border rounded-lg"
                                                value={editingMessage.times[index] || '09:00'}
                                                onChange={(e) => {
                                                    const newTimes = [...editingMessage.times];
                                                    newTimes[index] = e.target.value;
                                                    setEditingMessage({
                                                        ...editingMessage,
                                                        times: newTimes
                                                    });
                                                }}
                                            >
                                                {TIME_OPTIONS.map(option => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Frequency selection */}
                            <div className="mt-4">
                                <label className="block mb-2">Frequency</label>
                                <select
                                    className="w-full px-4 py-2 border rounded-lg"
                                    value={editingMessage.frequency}
                                    onChange={(e) => {
                                        const newFrequency = parseInt(e.target.value);
                                        let newTimes = [...editingMessage.times];
                                        if (newFrequency > newTimes.length) {
                                            while (newTimes.length < newFrequency) {
                                                newTimes.push('09:00');
                                            }
                                        } else if (newFrequency < newTimes.length) {
                                            newTimes = newTimes.slice(0, newFrequency);
                                        }
                                        setEditingMessage({
                                            ...editingMessage,
                                            frequency: newFrequency,
                                            times: newTimes
                                        });
                                    }}
                                >
                                    {FREQUENCY_OPTIONS.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Stop Keyword */}
                            <div className="mt-4">
                                <label className="block mb-2">Stop Keyword</label>
                                <input
                                    className="w-full px-4 py-2 border rounded-lg"
                                    placeholder="Enter stop keyword (e.g., STOP)"
                                    value={editingMessage.stopKeyword}
                                    onChange={(e) => setEditingMessage({
                                        ...editingMessage,
                                        stopKeyword: e.target.value
                                    })}
                                />
                            </div>

                            {/* Save and Cancel buttons */}
                            <div className="mt-4 flex gap-2">
                                <Button
                                    onClick={() => {
                                        updateMessage(editingMessage.id, {
                                            messages: editingMessage.messages,
                                            times: editingMessage.times,
                                            frequency: editingMessage.frequency,
                                            stopKeyword: editingMessage.stopKeyword,
                                        });
                                    }}
                                >
                                    Save Changes
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        setIsEditing(null);
                                        setEditingMessage(null);
                                        setSelectedDocuments([]);
                                        setSelectedImages([]);
                                    }}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Search */}
                    <div className="mb-4">
                        <input
                            className="w-full px-4 py-2 border rounded-lg"
                            placeholder="Search messages..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Messages list */}
                    <div className="space-y-4">
                        {filteredMessages.map((schedule) => (
                            <div key={schedule.id} className="p-4 border rounded-lg">
                                <div className="flex justify-between items-start">
                                    <div className="flex-grow">
                                        {schedule.messages.map((msg, index) => (
                                            <div key={index} className="mb-2">
                                                <p className="font-medium">Message {index + 1}:</p>
                                                <p className="ml-4">{msg}</p>
                                            </div>
                                        ))}
                                        <div className="text-sm text-gray-600 mt-2">
                                            <p>Send Times: {schedule.times.join(', ')}</p>
                                            <p>Frequency: {FREQUENCY_OPTIONS.find(opt => opt.value === schedule.frequency)?.label}</p>
                                            <p>Distribution: {schedule.distributionMethod === 'evenly' ? 'Evenly Spaced' : 'Random Times'}</p>
                                            {schedule.documents && schedule.documents.map((doc, index) => (
                                                <p key={`doc-${index}`}>
                                                    Document {index + 1}: <a href={doc} target="_blank" rel="noopener noreferrer" className="text-blue-500">View</a>
                                                </p>
                                            ))}
                                            {schedule.images && schedule.images.map((img, index) => (
                                                <p key={`img-${index}`}>
                                                    Image {index + 1}: <a href={img} target="_blank" rel="noopener noreferrer" className="text-blue-500">View</a>
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => {
                                                setIsEditing(schedule.id);
                                                setEditingMessage(schedule);
                                            }}
                                            variant="secondary"
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            onClick={() => deleteMessage(schedule.id)}
                                            variant="danger"
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <ToastContainer />
        </div>
    );
};

export default ScheduledMessagePage;
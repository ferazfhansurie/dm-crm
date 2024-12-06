import React, { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Button from "@/components/Base/Button";
import { FormInput, FormLabel, FormSelect } from "@/components/Base/Form";
import Lucide from "@/components/Base/Lucide";
import Table from "@/components/Base/Table";
import { useAppSelector } from "@/stores/hooks";
import { selectDarkMode } from "@/stores/darkModeSlice";

interface AIVoiceResponse {
    id: string;
    keyword: string;
    voiceUrls: string[];
    createdAt: Date;
    status: 'active' | 'inactive';
}

function AIVoiceResponses() {
    const [responses, setResponses] = useState<AIVoiceResponse[]>([]);
    const [selectedAudios, setSelectedAudios] = useState<File[]>([]);
    const [selectedAudioUrls, setSelectedAudioUrls] = useState<string[]>([]);
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    const [newResponse, setNewResponse] = useState({
        keyword: '',
        status: 'active' as const
    });

    const [audioElements, setAudioElements] = useState<{ [key: string]: HTMLAudioElement }>({});

    // Firebase setup
    const firestore = getFirestore();
    const auth = getAuth();
    const storage = getStorage();

    const darkMode = useAppSelector(selectDarkMode);

    // Add this state to track blob URLs
    const [blobUrls, setBlobUrls] = useState<string[]>([]);

    useEffect(() => {
        fetchResponses();
    }, []);

    useEffect(() => {
        const urls = selectedAudios.map(audio => URL.createObjectURL(audio));
        setSelectedAudioUrls(urls);
        return () => urls.forEach(url => URL.revokeObjectURL(url));
    }, [selectedAudios]);

    const fetchResponses = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const userRef = doc(firestore, 'user', user.email!);
            const userSnapshot = await getDoc(userRef);
            if (!userSnapshot.exists()) return;
            const userData = userSnapshot.data();
            const companyId = userData.companyId;

            const responsesRef = collection(firestore, `companies/${companyId}/aiVoiceResponses`);
            const responsesQuery = query(responsesRef, orderBy('createdAt', 'desc'));
            const responsesSnapshot = await getDocs(responsesQuery);

            const fetchedResponses: AIVoiceResponse[] = responsesSnapshot.docs.map(doc => ({
                id: doc.id,
                keyword: doc.data().keyword || '',
                voiceUrls: doc.data().voiceUrls || [],
                createdAt: doc.data().createdAt.toDate(),
                status: doc.data().status || 'active',
            }));

            setResponses(fetchedResponses);
        } catch (error) {
            console.error('Error fetching responses:', error);
            toast.error('Error fetching responses');
        }
    };

    const uploadAudios = async (files: File[]): Promise<string[]> => {
        const uploadPromises = files.map(async file => {
            const storageRef = ref(storage, `aiVoiceResponses/${file.name}`);
            await uploadBytes(storageRef, file);
            return await getDownloadURL(storageRef);
        });
        return Promise.all(uploadPromises);
    };

    const addResponse = async () => {
        if (newResponse.keyword.trim() === '' || selectedAudios.length === 0) {
            toast.error('Please provide both keyword and at least one audio');
            return;
        }

        try {
            const user = auth.currentUser;
            if (!user) return;

            const userRef = doc(firestore, 'user', user.email!);
            const userSnapshot = await getDoc(userRef);
            if (!userSnapshot.exists()) return;
            const userData = userSnapshot.data();
            const companyId = userData.companyId;

            const voiceUrls = await uploadAudios(selectedAudios);

            const newResponseData = {
                keyword: newResponse.keyword.toLowerCase(),
                voiceUrls,
                status: newResponse.status,
                createdAt: serverTimestamp(),
            };

            const responseRef = collection(firestore, `companies/${companyId}/aiVoiceResponses`);
            await addDoc(responseRef, newResponseData);

            setNewResponse({
                keyword: '',
                status: 'active'
            });
            setSelectedAudios([]);
            setSelectedAudioUrls([]);
            fetchResponses();
            toast.success('Response added successfully');
        } catch (error) {
            console.error('Error adding response:', error);
            toast.error('Error adding response');
        }
    };

    const updateResponse = async (id: string, keyword: string, status: 'active' | 'inactive') => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const userRef = doc(firestore, 'user', user.email!);
            const userSnapshot = await getDoc(userRef);
            if (!userSnapshot.exists()) return;
            const companyId = userSnapshot.data().companyId;

            const responseRef = doc(firestore, `companies/${companyId}/aiVoiceResponses`, id);

            const updatedData: Partial<AIVoiceResponse> = {
                keyword: keyword.toLowerCase(),
                status
            };

            if (selectedAudios.length > 0) {
                updatedData.voiceUrls = await uploadAudios(selectedAudios);
            }

            await updateDoc(responseRef, updatedData);
            setIsEditing(null);
            setSelectedAudios([]);
            setSelectedAudioUrls([]);
            fetchResponses();
            toast.success('Response updated successfully');
        } catch (error) {
            console.error('Error updating response:', error);
            toast.error('Error updating response');
        }
    };

    const deleteResponse = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this response?')) return;

        try {
            const user = auth.currentUser;
            if (!user) return;

            const userRef = doc(firestore, 'user', user.email!);
            const userSnapshot = await getDoc(userRef);
            if (!userSnapshot.exists()) return;
            const companyId = userSnapshot.data().companyId;

            const responseRef = doc(firestore, `companies/${companyId}/aiVoiceResponses`, id);
            await deleteDoc(responseRef);
            fetchResponses();
            toast.success('Response deleted successfully');
        } catch (error) {
            console.error('Error deleting response:', error);
            toast.error('Error deleting response');
        }
    };

    const filteredResponses = responses.filter(response =>
        response.keyword.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Add new function to handle audio preview
    const handleAudioSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        
        // Clean up old blob URLs
        blobUrls.forEach(url => URL.revokeObjectURL(url));
        
        // Create new blob URLs
        const newBlobUrls = files.map(file => URL.createObjectURL(file));
        setBlobUrls(newBlobUrls);
        setSelectedAudios(files);
        setSelectedAudioUrls(newBlobUrls);
    };

    // Add cleanup effect
    useEffect(() => {
        return () => {
            // Cleanup blob URLs when component unmounts
            blobUrls.forEach(url => URL.revokeObjectURL(url));
        };
    }, [blobUrls]);

    return (
        <>
        <div className="h-screen overflow-y-auto pb-10">
            <h2 className="mt-10 text-lg font-medium intro-y">AI Voice Responses</h2>
            <div className="grid grid-cols-12 gap-6 mt-5">
                <div className="intro-y col-span-12 lg:col-span-6">
                    {/* Add new response form */}
                    <div className="intro-y box dark:bg-gray-700">
                        <div className="flex flex-col sm:flex-row items-center p-5 border-b border-slate-200/60 dark:border-darkmode-400">
                            <h2 className="font-medium text-base mr-auto dark:text-slate-200">Add New Response</h2>
                        </div>
                        <div className="p-5">
                            <div className="grid grid-cols-12 gap-2">
                                <div className="col-span-12">
                                    <FormLabel htmlFor="keyword" className="dark:text-slate-200">Keyword</FormLabel>
                                    <FormInput
                                        id="keyword"
                                        type="text"
                                        value={newResponse.keyword}
                                        onChange={(e) => setNewResponse({ ...newResponse, keyword: e.target.value })}
                                        placeholder="Enter keyword"
                                        className="dark:bg-darkmode-800 dark:border-darkmode-400 dark:text-slate-200"
                                    />
                                </div>
                                <div className="col-span-12">
                                    <FormLabel className="dark:text-slate-200">Audios</FormLabel>
                                    <div className="border-2 border-dashed dark:border-darkmode-400 rounded-md pt-4">
                                        <div className="px-4 pb-4">
                                            {selectedAudioUrls.map((url, index) => (
                                                <div key={index} className="mb-3 flex items-center justify-between">
                                                    <audio 
                                                        controls
                                                        className="w-full"
                                                        preload="auto"
                                                        key={url}
                                                        onLoadedData={(e) => {
                                                            const audio = e.currentTarget;
                                                            audio.volume = 1.0;
                                                            console.log('Audio loaded:', {
                                                                duration: audio.duration,
                                                                volume: audio.volume,
                                                                muted: audio.muted,
                                                                readyState: audio.readyState
                                                            });
                                                        }}
                                                        onPlay={(e) => {
                                                            const audio = e.currentTarget;
                                                            console.log('Audio playing:', {
                                                                currentTime: audio.currentTime,
                                                                volume: audio.volume,
                                                                muted: audio.muted
                                                            });
                                                        }}
                                                        onError={(e) => {
                                                            const audio = e.currentTarget;
                                                            console.error('Audio error:', {
                                                                error: audio.error,
                                                                networkState: audio.networkState,
                                                                readyState: audio.readyState
                                                            });
                                                            toast.error(`Error loading audio file ${index + 1}`);
                                                        }}
                                                    >
                                                        <source 
                                                            src={url} 
                                                            type={selectedAudios[index]?.type || 'audio/mpeg'} 
                                                        />
                                                        Your browser does not support the audio element.
                                                    </audio>
                                                    <button
                                                        className="ml-2 bg-danger text-white rounded-full p-1"
                                                        onClick={() => {
                                                            URL.revokeObjectURL(url); // Revoke the blob URL
                                                            setBlobUrls(prev => prev.filter((_, i) => i !== index));
                                                            setSelectedAudios(prev => prev.filter((_, i) => i !== index));
                                                            setSelectedAudioUrls(prev => prev.filter((_, i) => i !== index));
                                                        }}
                                                    >
                                                        <Lucide icon="X" className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="px-4 pb-4 flex items-center cursor-pointer relative">
                                            <Lucide icon="Music" className="w-4 h-4 mr-2 dark:text-slate-200" />
                                            <span className="text-primary mr-1 dark:text-slate-200">Upload audios</span>
                                            <FormInput
                                                type="file"
                                                accept="audio/*"
                                                multiple
                                                className="w-full h-full top-0 left-0 absolute opacity-0"
                                                onChange={handleAudioSelect}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="col-span-12">
                                    <FormLabel className="dark:text-slate-200">Status</FormLabel>
                                    <FormSelect
                                        value={newResponse.status}
                                        onChange={(e) => setNewResponse({ ...newResponse, status: e.target.value as 'active' })}
                                        className="dark:bg-darkmode-800 dark:border-darkmode-400 dark:text-slate-200"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
</FormSelect>
                                </div>
                                <div className="col-span-12">
                                    <Button variant="primary" onClick={addResponse}>
                                        <Lucide icon="Plus" className="w-4 h-4 mr-2" /> Add Response
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="intro-y col-span-12 lg:col-span-6">
                    {/* Search and list */}
                    <div className="intro-y box dark:bg-gray-700">
                        <div className="p-5">
                            <FormInput
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search responses..."
                                className="mb-5 dark:bg-darkmode-800 dark:border-darkmode-400 dark:text-slate-200"
                            />

                            <div className="grid grid-cols-12 gap-5">
                                {filteredResponses.map((response) => (
                                    <div key={response.id} className="intro-y col-span-12">
                                        <div className="box p-5 dark:bg-gray-700">
                                            {isEditing === response.id ? (
                                                <div className="space-y-4">
                                                    <FormInput
                                                        type="text"
                                                        value={response.keyword}
                                                        onChange={(e) => {
                                                            const updatedResponses = responses.map(r =>
                                                                r.id === response.id ? { ...r, keyword: e.target.value } : r
                                                            );
                                                            setResponses(updatedResponses);
                                                        }}
                                                    />
                                                    <div className="col-span-12">
                                                            <FormLabel className="dark:text-slate-200">Audio Files</FormLabel>
                                                            <div className="border-2 border-dashed dark:border-darkmode-400 rounded-md pt-4">
                                                                <div className="px-4 pb-4 flex items-center cursor-pointer relative">
                                                                    <Lucide icon="Music" className="w-4 h-4 mr-2" />
                                                                    <span className="text-primary mr-1">Upload audio files</span>
                                                                    <FormInput
                                                                        type="file"
                                                                        accept="audio/*"
                                                                        multiple
                                                                        className="w-full h-full top-0 left-0 absolute opacity-0"
                                                                        onChange={(e) => setSelectedAudios(Array.from(e.target.files || []))}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    <FormSelect
                                                        value={response.status}
                                                        onChange={(e) => {
                                                            const updatedResponses = responses.map(r =>
                                                                r.id === response.id ? { ...r, status: e.target.value as 'active' | 'inactive' } : r
                                                            );
                                                            setResponses(updatedResponses);
                                                        }}
                                                    >
                                                        <option value="active">Active</option>
                                                        <option value="inactive">Inactive</option>
                                                    </FormSelect>
                                                    <div className="flex space-x-2">
                                                        <Button
                                                            variant="primary"
                                                            onClick={() => updateResponse(response.id, response.keyword, response.status)}
                                                        >
                                                            <Lucide icon="Save" className="w-4 h-4 mr-2" /> Save
                                                        </Button>
                                                        <Button
                                                            variant="secondary"
                                                            onClick={() => setIsEditing(null)}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <div className="flex justify-between items-center mb-4">
                                                        <div>
                                                            <div className="font-medium text-base">{response.keyword}</div>
                                                            <div className="text-slate-500">
                                                                Status: {response.status}
                                                            </div>
                                                            <div className="text-slate-500">
                                                                Created: {response.createdAt.toLocaleDateString()}
                                                            </div>
                                                        </div>
                                                        <div className="flex space-x-2">
                                                            <Button
                                                                variant="primary"
                                                                onClick={() => setIsEditing(response.id)}
                                                            >
                                                                <Lucide icon="PenSquare" className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="danger"
                                                                onClick={() => deleteResponse(response.id)}
                                                            >
                                                                <Lucide icon="Trash" className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <div className="rounded-md border border-slate-200/60 dark:border-darkmode-400 p-2">
                                                    <div className="space-y-2">
                                                        {response.voiceUrls.map((url, index) => (
                                                            <audio 
                                                                key={index}
                                                                controls
                                                                className="w-full"
                                                            >
                                                                <source src={url} type="audio/mpeg" />
                                                                Your browser does not support the audio element.
                                                            </audio>
                                                        ))}
                                                    </div>
                                                </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
                <ToastContainer theme={darkMode ? "dark" : "light"} />
            </div>
        </>
    );
}

export default AIVoiceResponses;
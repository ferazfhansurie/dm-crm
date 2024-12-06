import React, { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Button from "@/components/Base/Button";
import { FormInput, FormLabel, FormSelect } from "@/components/Base/Form";
import Lucide from "@/components/Base/Lucide";
import Table from "@/components/Base/Table";
import { useAppSelector } from "@/stores/hooks";
import { selectDarkMode } from "@/stores/darkModeSlice";
import clsx from "clsx";

interface AITagResponse {
    id: string;
    keyword: string;
    tags: string[];
    createdAt: Date;
    status: 'active' | 'inactive';
}

interface Tag {
    id: string;
    name: string;
}

function AITagResponses() {
    const [responses, setResponses] = useState<AITagResponse[]>([]);
    const [availableTags, setAvailableTags] = useState<Tag[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    const [newResponse, setNewResponse] = useState({
        keyword: '',
        status: 'active' as const
    });

    // Firebase setup
    const firestore = getFirestore();
    const auth = getAuth();

    const darkMode = useAppSelector(selectDarkMode);

    useEffect(() => {
        fetchResponses();
    }, []);

    useEffect(() => {
        fetchTags();
    }, []);

    useEffect(() => {
        if (isEditing) {
            const response = responses.find(r => r.id === isEditing);
            if (response) {
                // Convert tag names back to tag IDs for editing
                const tagIds = response.tags
                    .map(tagName => {
                        const tag = availableTags.find(t => t.name === tagName);
                        return tag ? tag.id : null;
                    })
                    .filter((id): id is string => id !== null);
                setSelectedTags(tagIds);
            }
        }
    }, [isEditing, responses, availableTags]);

    const fetchResponses = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const userRef = doc(firestore, 'user', user.email!);
            const userSnapshot = await getDoc(userRef);
            if (!userSnapshot.exists()) return;
            const userData = userSnapshot.data();
            const companyId = userData.companyId;

            const responsesRef = collection(firestore, `companies/${companyId}/aiTagResponses`);
            const responsesQuery = query(responsesRef, orderBy('createdAt', 'desc'));
            const responsesSnapshot = await getDocs(responsesQuery);

            const fetchedResponses: AITagResponse[] = responsesSnapshot.docs.map(doc => ({
                id: doc.id,
                keyword: doc.data().keyword || '',
                tags: doc.data().tags || [],
                createdAt: doc.data().createdAt.toDate(),
                status: doc.data().status || 'active',
            }));

            setResponses(fetchedResponses);
        } catch (error) {
            console.error('Error fetching responses:', error);
            toast.error('Error fetching responses');
        }
    };

    const fetchTags = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const userRef = doc(firestore, 'user', user.email!);
            const userSnapshot = await getDoc(userRef);
            if (!userSnapshot.exists()) return;
            const userData = userSnapshot.data();
            const companyId = userData.companyId;

            const tagsRef = collection(firestore, `companies/${companyId}/tags`);
            const tagsSnapshot = await getDocs(tagsRef);

            const fetchedTags: Tag[] = tagsSnapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name,
            }));

            setAvailableTags(fetchedTags);
        } catch (error) {
            console.error('Error fetching tags:', error);
            toast.error('Error fetching tags');
        }
    };

    const addResponse = async () => {
        if (newResponse.keyword.trim() === '' || selectedTags.length === 0) {
            toast.error('Please provide both keyword and at least one tag');
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

            const tagNames = selectedTags.map(tagId => {
                const tag = availableTags.find(t => t.id === tagId);
                return tag ? tag.name : '';
            }).filter(name => name !== '');

            const newResponseData = {
                keyword: newResponse.keyword.toLowerCase(),
                tags: tagNames,
                status: newResponse.status,
                createdAt: serverTimestamp(),
            };

            const responseRef = collection(firestore, `companies/${companyId}/aiTagResponses`);
            await addDoc(responseRef, newResponseData);

            setNewResponse({
                keyword: '',
                status: 'active'
            });
            setSelectedTags([]);
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

            const responseRef = doc(firestore, `companies/${companyId}/aiTagResponses`, id);

            const tagNames = selectedTags.map(tagId => {
                const tag = availableTags.find(t => t.id === tagId);
                return tag ? tag.name : '';
            }).filter(name => name !== '');

            const updatedData: Partial<AITagResponse> = {
                keyword: keyword.toLowerCase(),
                status,
                tags: tagNames
            };

            await updateDoc(responseRef, updatedData);
            setIsEditing(null);
            setSelectedTags([]);
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

            const responseRef = doc(firestore, `companies/${companyId}/aiTagResponses`, id);
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

    const handleTagSelection = (tagId: string) => {
        setSelectedTags(prev => 
            prev.includes(tagId) 
                ? prev.filter(id => id !== tagId)
                : [...prev, tagId]
        );
    };

    return (
        <>
        <div className="h-screen overflow-y-auto pb-10">
            <h2 className="mt-10 text-lg font-medium intro-y">AI Tag Responses</h2>
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
                                    <FormLabel className="dark:text-slate-200">Select Tags</FormLabel>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto p-4 border rounded-lg dark:border-darkmode-400">
                                        {availableTags.map((tag) => (
                                            <div 
                                                key={tag.id}
                                                className={clsx(
                                                    "flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors",
                                                    "hover:bg-slate-100 dark:hover:bg-darkmode-400",
                                                    selectedTags.includes(tag.id) && "bg-slate-100 dark:bg-darkmode-400"
                                                )}
                                                onClick={() => handleTagSelection(tag.id)}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedTags.includes(tag.id)}
                                                    onChange={() => handleTagSelection(tag.id)}
                                                    className="form-checkbox h-5 w-5 text-primary border-slate-300 rounded 
                                                             dark:border-darkmode-400 dark:bg-darkmode-800"
                                                />
                                                <span className="dark:text-slate-200">{tag.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-2 text-slate-500 text-sm">
                                        {selectedTags.length} tags selected
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
                                                        className="dark:bg-darkmode-800 dark:border-darkmode-400 dark:text-slate-200"
                                                    />
                                                    <FormSelect
                                                        value={response.status}
                                                        onChange={(e) => {
                                                            const updatedResponses = responses.map(r =>
                                                                r.id === response.id ? { ...r, status: e.target.value as 'active' | 'inactive' } : r
                                                            );
                                                            setResponses(updatedResponses);
                                                        }}
                                                        className="dark:bg-darkmode-800 dark:border-darkmode-400 dark:text-slate-200"
                                                    >
                                                        <option value="active">Active</option>
                                                        <option value="inactive">Inactive</option>
                                                    </FormSelect>

                                                    <div>
                                                        <FormLabel className="dark:text-slate-200">Edit Tags</FormLabel>
                                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto p-4 border rounded-lg dark:border-darkmode-400">
                                                            {availableTags.map((tag) => (
                                                                <div 
                                                                    key={tag.id}
                                                                    className={clsx(
                                                                        "flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors",
                                                                        "hover:bg-slate-100 dark:hover:bg-darkmode-400",
                                                                        selectedTags.includes(tag.id) && "bg-slate-100 dark:bg-darkmode-400"
                                                                    )}
                                                                    onClick={() => handleTagSelection(tag.id)}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedTags.includes(tag.id)}
                                                                        onChange={() => handleTagSelection(tag.id)}
                                                                        className="form-checkbox h-5 w-5 text-primary border-slate-300 rounded 
                                                                                 dark:border-darkmode-400 dark:bg-darkmode-800"
                                                                    />
                                                                    <span className="dark:text-slate-200">{tag.name}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="mt-2 text-slate-500 text-sm">
                                                            {selectedTags.length} tags selected
                                                        </div>
                                                    </div>

                                                    <div className="flex space-x-2">
                                                        <Button
                                                            variant="primary"
                                                            onClick={() => updateResponse(response.id, response.keyword, response.status)}
                                                        >
                                                            <Lucide icon="Save" className="w-4 h-4 mr-2" /> Save
                                                        </Button>
                                                        <Button
                                                            variant="secondary"
                                                            onClick={() => {
                                                                setIsEditing(null);
                                                                setSelectedTags([]);
                                                            }}
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
                                                            {response.tags.map((tagName, index) => (
                                                                <span 
                                                                    key={index} 
                                                                    className="inline-block bg-slate-100 dark:bg-darkmode-400 rounded px-2 py-1 mr-2 mb-2"
                                                                >
                                                                    {tagName}
                                                                </span>
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

export default AITagResponses;
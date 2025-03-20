import React, { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Button from "@/components/Base/Button";
import { FormInput, FormLabel, FormSelect, FormTextarea } from "@/components/Base/Form";
import Lucide from "@/components/Base/Lucide";
import { useAppSelector } from "@/stores/hooks";
import { selectDarkMode } from "@/stores/darkModeSlice";
import { AIDocumentResponse, AIResponse, AIVoiceResponse, AITagResponse, AIImageResponse, AIAssignResponse, AIVideoResponse } from "@/types/AIResponses";
import clsx from "clsx";
import TagResponseForm from "@/components/AIResponses/TagResponseForm";
import ImageResponseForm from "@/components/AIResponses/ImageResponseForm";
import VoiceResponseForm from "@/components/AIResponses/VoiceResponseForm";
import AssignResponseForm from "@/components/AIResponses/AssignResponseForm";
import DocumentResponseForm from "@/components/AIResponses/DocumentResponseForm";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import VideoResponseForm from "@/components/AIResponses/VideoResponseForm";


interface Tag {
    id: string;
    name: string;
}
interface Employee {
    id: string;
    name: string;
    email: string;
    role?: string;
}

type AIResponseType = 'Tag' | 'Image' | 'Voice' | 'Document' | 'Assign' | 'Video';

function AIResponses() {
    const [responses, setResponses] = useState<AIResponse[]>([]);
    const [responseType, setResponseType] = useState<AIResponseType>('Tag');
    const [availableTags, setAvailableTags] = useState<Tag[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    console.log('[AIResponses] Component mounted');
    console.log('[AIResponses] Current state:', {
        responseType,
        responsesCount: responses.length,
        availableTagsCount: availableTags.length,
        selectedTagsCount: selectedTags.length,
        isEditing,
        searchQuery
    });

    const [newResponse, setNewResponse] = useState({
        keywords: [''],
        description: '',
        status: 'active' as const
    });

    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [selectedImageUrls, setSelectedImageUrls] = useState<string[]>([]);
    const [selectedAudios, setSelectedAudios] = useState<File[]>([]);
    const [selectedAudioUrls, setSelectedAudioUrls] = useState<string[]>([]);
    const [selectedDocs, setSelectedDocs] = useState<File[]>([]);
    const [selectedDocUrls, setSelectedDocUrls] = useState<string[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
    const [selectedVideos, setSelectedVideos] = useState<File[]>([]);
    const [selectedVideoUrls, setSelectedVideoUrls] = useState<string[]>([]);

    const [keywordSource, setKeywordSource] = useState<'user' | 'bot' | 'own'>('user');

    const [tagActionMode, setTagActionMode] = useState<'add' | 'delete'>('add');

    const firestore = getFirestore();
    const auth = getAuth();
    const darkMode = useAppSelector(selectDarkMode);
    const storage = getStorage();

    useEffect(() => {
        console.log('[AIResponses] useEffect triggered with responseType:', responseType);
        fetchResponses();
        if (responseType === 'Tag') {
            fetchTags();
        } else if (responseType === 'Assign') {
            fetchEmployees();
        }
    }, [responseType]);

    const fetchResponses = async () => {
        try {
            console.log('[AIResponses] Fetching responses for type:', responseType);
            const user = auth.currentUser;
            if (!user) {
                console.log('[AIResponses] No user found, skipping fetch');
                return;
            }

            const userRef = doc(firestore, 'user', user.email!);
            const userSnapshot = await getDoc(userRef);
            if (!userSnapshot.exists()) {
                console.log('[AIResponses] No user document found, skipping fetch');
                return;
            }
            const companyId = userSnapshot.data().companyId;

            const responsesRef = collection(firestore, `companies/${companyId}/ai${responseType}Responses`);
            const responsesQuery = query(responsesRef, orderBy('createdAt', 'desc'));
            const responsesSnapshot = await getDocs(responsesQuery);

            console.log(`[AIResponses] Fetched ${responsesSnapshot.size} responses`);

            const fetchedResponses: AIResponse[] = responsesSnapshot.docs.map(doc => {
                const data = doc.data();
                console.log(`[AIResponses] Processing response ${doc.id}:`, data);
                const baseResponse = {
                    id: doc.id,
                    keywords: Array.isArray(data.keywords) ? data.keywords : 
                        (data.keyword ? [data.keyword] : []),
                    description: data.description || '',
                    createdAt: data.createdAt?.toDate() || new Date(),
                    status: data.status || 'active',
                    keywordSource: data.keywordSource || 'user'
                };

                switch (responseType) {
                    case 'Tag':
                        return { ...baseResponse, type: 'Tag', tags: data.tags || [] } as AITagResponse;
                    case 'Image':
                        return { 
                            ...baseResponse, 
                            type: 'Image', 
                            imageUrls: data.imageUrls || [],
                            imageUrl: data.imageUrl
                        } as AIImageResponse;
                    case 'Voice':
                        return { 
                            ...baseResponse, 
                            type: 'Voice', 
                            voiceUrls: data.voiceUrls || [],
                            captions: data.captions || []
                        } as AIVoiceResponse;
                    case 'Document':
                        return { 
                            ...baseResponse, 
                            type: 'Document', 
                            documentUrls: data.documentUrls || [],
                            documentNames: data.documentNames || []
                        } as AIDocumentResponse;
                        case 'Assign':
                            return {
                                ...baseResponse,
                                type: 'Assign',
                                assignedEmployees: data.assignedEmployees || []
                            } as AIAssignResponse;
                    case 'Video':
                        return {
                            ...baseResponse,
                            type: 'Video',
                            videoUrls: data.videoUrls || [],
                            videoTitles: data.videoTitles || []
                        } as AIVideoResponse;
                }
            });

            setResponses(fetchedResponses);
            console.log('[AIResponses] Successfully set responses:', fetchedResponses.length);
        } catch (error) {
            console.error('[AIResponses] Error fetching responses:', error);
            toast.error('Error fetching responses');
        }
    };

    const addKeywordField = () => {
        setNewResponse(prev => ({
            ...prev,
            keywords: [...prev.keywords, '']
        }));
    };

    const removeKeywordField = (index: number) => {
        setNewResponse(prev => ({
            ...prev,
            keywords: prev.keywords.filter((_, i) => i !== index)
        }));
    };

    const updateKeyword = (index: number, value: string) => {
        setNewResponse(prev => ({
            ...prev,
            keywords: prev.keywords.map((keyword, i) => 
                i === index ? value : keyword
            )
        }));
    };

    const fetchTags = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const userRef = doc(firestore, 'user', user.email!);
            const userSnapshot = await getDoc(userRef);
            if (!userSnapshot.exists()) return;
            const companyId = userSnapshot.data().companyId;

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

    const fetchEmployees = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;
    
            const userRef = doc(firestore, 'user', user.email!);
            const userSnapshot = await getDoc(userRef);
            if (!userSnapshot.exists()) return;
            const companyId = userSnapshot.data().companyId;
    
            const employeesRef = collection(firestore, `companies/${companyId}/employee`);
            const employeesSnapshot = await getDocs(employeesRef);
    
            const fetchedEmployees: Employee[] = employeesSnapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name || '',
                email: doc.data().email || '',
                role: doc.data().role,
                ...doc.data()
            }));
    
            setEmployees(fetchedEmployees);
        } catch (error) {
            console.error('Error fetching employees:', error);
            toast.error('Error fetching employees');
        }
    };

    const uploadFiles = async (files: File[], type: 'image' | 'voice' | 'document' | 'video'): Promise<string[]> => {
        const uploadPromises = files.map(async file => {
            const storageRef = ref(storage, `aiResponses/${type}/${file.name}`);
            await uploadBytes(storageRef, file);
            return await getDownloadURL(storageRef);
        });
        return Promise.all(uploadPromises);
    };

    const addResponse = async () => {
        console.log('[AIResponses] Adding new response:', {
            responseType,
            keywords: newResponse.keywords,
            description: newResponse.description,
            status: newResponse.status
        });

        const validKeywords = newResponse.keywords.filter(k => k.trim() !== '');
        if (validKeywords.length === 0) {
            console.log('[AIResponses] No valid keywords provided');
            toast.error('Please provide at least one keyword');
            return;
        }

        try {
            const user = auth.currentUser;
            if (!user) return;

            const userRef = doc(firestore, 'user', user.email!);
            const userSnapshot = await getDoc(userRef);
            if (!userSnapshot.exists()) return;
            const companyId = userSnapshot.data().companyId;

            let additionalData = {};
            
            // Handle different response types
            switch (responseType) {
                case 'Tag':
                    if (selectedTags.length === 0) {
                        toast.error('Please select at least one tag');
                        return;
                    }
                    const tagNames = selectedTags.map(tagId => {
                        const tag = availableTags.find(t => t.id === tagId);
                        return tag ? tag.name : '';
                    }).filter(name => name !== '');

                    additionalData = {
                        tags: tagNames,
                        keywordSource: keywordSource,
                        tagActionMode: tagActionMode
                    };
                    break;
                case 'Image':
                    if (selectedImages.length === 0) {
                        toast.error('Please select at least one image');
                        return;
                    }
                    const imageUrls = await uploadFiles(selectedImages, 'image');
                    additionalData = { 
                        imageUrls: imageUrls, 
                        imageUrl: imageUrls[0]
                    };
                    break;
                case 'Voice':
                    if (selectedAudios.length === 0) {
                        toast.error('Please select an audio file');
                        return;
                    }
                    const voiceUrls = await uploadFiles(selectedAudios, 'voice');
                    additionalData = { 
                        voiceUrls: voiceUrls,
                        captions: selectedAudios.map(() => '')
                    };
                    break;
                case 'Document':
                    if (selectedDocs.length === 0) {
                        toast.error('Please select a document');
                        return;
                    }
                    const docUrls = await uploadFiles(selectedDocs, 'document');
                    additionalData = { 
                        documentUrls: docUrls,
                        documentNames: selectedDocs.map(doc => doc.name)
                    };
                    break;
                    case 'Assign':
                        if (selectedEmployees.length === 0) {
                            toast.error('Please select at least one employee');
                            return;
                        }
                        additionalData = {
                            assignedEmployees: selectedEmployees
                        };
                        break;
                case 'Video':
                    if (selectedVideos.length === 0) {
                        toast.error('Please select at least one video');
                        return;
                    }
                    const videoUrls = await uploadFiles(selectedVideos, 'video');
                    additionalData = { 
                        videoUrls: videoUrls,
                        videoTitles: selectedVideos.map(video => video.name)
                    };
                    break;
            }

            const newResponseData = {
                keyword: validKeywords[0],
                keywords: validKeywords,
                description: newResponse.description,
                status: newResponse.status,
                createdAt: serverTimestamp(),
                keywordSource: keywordSource,
                ...additionalData
            };

            const responseRef = collection(firestore, `companies/${companyId}/ai${responseType}Responses`);
            await addDoc(responseRef, newResponseData);

            // Reset form
            setNewResponse({
                keywords: [''],
                description: '',
                status: 'active'
            });
            setSelectedTags([]);
            setSelectedImages([]);
            setSelectedImageUrls([]);
            setSelectedAudios([]);
            setSelectedAudioUrls([]);
            setSelectedDocs([]);
            setSelectedDocUrls([]);
            setSelectedEmployees([]);
            setSelectedVideos([]);
            setSelectedVideoUrls([]);
            
            console.log('[AIResponses] Successfully added response');
            fetchResponses();
            toast.success('Response added successfully');
        } catch (error) {
            console.error('[AIResponses] Error adding response:', error);
            toast.error('Error adding response');
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        console.log('[AIResponses] Selected images:', files.map(f => f.name));
        const urls = files.map(file => URL.createObjectURL(file));
        setSelectedImages(files);
        setSelectedImageUrls(urls);
    };

    const handleImageRemove = (index: number) => {
        console.log('[AIResponses] Removing image at index:', index);
        URL.revokeObjectURL(selectedImageUrls[index]);
        setSelectedImages(prev => prev.filter((_, i) => i !== index));
        setSelectedImageUrls(prev => prev.filter((_, i) => i !== index));
    };

    const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const urls = files.map(file => URL.createObjectURL(file));
        setSelectedAudios(files);
        setSelectedAudioUrls(urls);
    };

    const handleAudioRemove = (index: number) => {
        URL.revokeObjectURL(selectedAudioUrls[index]);
        setSelectedAudios(prev => prev.filter((_, i) => i !== index));
        setSelectedAudioUrls(prev => prev.filter((_, i) => i !== index));
    };

    const handleDocumentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const urls = files.map(file => URL.createObjectURL(file));
        setSelectedDocs(files);
        setSelectedDocUrls(urls);
    };

    const handleDocumentRemove = (index: number) => {
        URL.revokeObjectURL(selectedDocUrls[index]);
        setSelectedDocs(prev => prev.filter((_, i) => i !== index));
        setSelectedDocUrls(prev => prev.filter((_, i) => i !== index));
    };

    const handleTagSelection = (tagId: string) => {
        setSelectedTags(prev => 
            prev.includes(tagId) 
                ? prev.filter(id => id !== tagId) 
                : [...prev, tagId]
        );
    };

    const handleEmployeeSelection = (employeeId: string) => {
        setSelectedEmployees(prev =>
            prev.includes(employeeId)
                ? prev.filter(id => id !== employeeId)
                : [...prev, employeeId]
        );
    };

    const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const urls = files.map(file => URL.createObjectURL(file));
        setSelectedVideos(files);
        setSelectedVideoUrls(urls);
    };

    const handleVideoRemove = (index: number) => {
        URL.revokeObjectURL(selectedVideoUrls[index]);
        setSelectedVideos(prev => prev.filter((_, i) => i !== index));
        setSelectedVideoUrls(prev => prev.filter((_, i) => i !== index));
    };

    useEffect(() => {
        return () => {
            // Cleanup all blob URLs when component unmounts
            selectedImageUrls.forEach(URL.revokeObjectURL);
            selectedAudioUrls.forEach(URL.revokeObjectURL);
            selectedDocUrls.forEach(URL.revokeObjectURL);
            selectedVideoUrls.forEach(URL.revokeObjectURL);
        };
    }, [selectedImageUrls, selectedAudioUrls, selectedDocUrls, selectedVideoUrls]);

    const deleteResponse = async (id: string) => {
        console.log('[AIResponses] Deleting response:', id);
        try {
            const user = auth.currentUser;
            if (!user) {
                console.log('[AIResponses] No user found, skipping delete');
                return;
            }

            const userRef = doc(firestore, 'user', user.email!);
            const userSnapshot = await getDoc(userRef);
            if (!userSnapshot.exists()) {
                console.log('[AIResponses] No user document found, skipping delete');
                return;
            }
            const companyId = userSnapshot.data().companyId;

            await deleteDoc(doc(firestore, `companies/${companyId}/ai${responseType}Responses`, id));
            console.log('[AIResponses] Successfully deleted response');
            fetchResponses();
            toast.success('Response deleted successfully');
        } catch (error) {
            console.error('[AIResponses] Error deleting response:', error);
            toast.error('Error deleting response');
        }
    };

    const updateResponse = async (id: string) => {
        console.log('[AIResponses] Updating response:', id);
        try {
            const user = auth.currentUser;
            if (!user) {
                console.log('[AIResponses] No user found, skipping update');
                return;
            }

            const response = responses.find(r => r.id === id);
            if (!response) {
                console.log('[AIResponses] Response not found:', id);
                return;
            }

            console.log('[AIResponses] Current response data:', response);

            const userRef = doc(firestore, 'user', user.email!);
            const userSnapshot = await getDoc(userRef);
            if (!userSnapshot.exists()) return;
            const companyId = userSnapshot.data().companyId;

            const responseRef = doc(firestore, `companies/${companyId}/ai${responseType}Responses`, id);
            
            let updatedData: any = {
                keywords: response.keywords,
                description: response.description,
                status: response.status,
                keyword: response.keywords[0],
                keywordSource: keywordSource,
                tagActionMode: tagActionMode
            };

            switch (responseType) {
                case 'Tag':
                    if (selectedTags.length > 0) {
                        const existingTags = (response as AITagResponse).tags || [];
                        let updatedTags: string[];

                        if (tagActionMode === 'add') {
                            // Add new tags
                            const newTags = selectedTags.map(tagId => {
                                const tag = availableTags.find(t => t.id === tagId);
                                return tag ? tag.name : '';
                            }).filter(name => name !== '');
                            updatedTags = [...new Set([...existingTags, ...newTags])];
                        } else {
                            // Remove selected tags
                            const tagsToRemove = selectedTags.map(tagId => {
                                const tag = availableTags.find(t => t.id === tagId);
                                return tag ? tag.name : '';
                            }).filter(name => name !== '');
                            updatedTags = existingTags.filter(tag => !tagsToRemove.includes(tag));
                        }

                        if (updatedTags.length === 0) {
                            toast.error('Cannot remove all tags. At least one tag must remain.');
                            return;
                        }

                        updatedData.tags = updatedTags;
                    }
                    break;
                case 'Image':
                    if (selectedImages.length > 0) {
                        const newImageUrls = await uploadFiles(selectedImages, 'image');
                        updatedData.imageUrls = newImageUrls;
                        updatedData.imageUrl = newImageUrls[0] || '';
                    }
                    break;
                case 'Voice':
                    if (selectedAudios.length > 0) {
                        const voiceUrls = await uploadFiles(selectedAudios, 'voice');
                        updatedData.voiceUrls = voiceUrls;
                        updatedData.captions = selectedAudios.map(() => '');
                    }
                    break;
                case 'Document':
                    if (selectedDocs.length > 0) {
                        const docUrls = await uploadFiles(selectedDocs, 'document');
                        updatedData.documentUrls = docUrls;
                        updatedData.documentNames = selectedDocs.map(doc => doc.name);
                    }
                    break;
                case 'Assign':
                    if (selectedEmployees.length > 0) {
                        updatedData.assignedEmployees = selectedEmployees;
                    }
                    break;
                case 'Video':
                    if (selectedVideos.length > 0) {
                        const videoUrls = await uploadFiles(selectedVideos, 'video');
                        updatedData.videoUrls = videoUrls;
                        updatedData.videoTitles = selectedVideos.map(video => video.name);
                    }
                    break;
            }

            await updateDoc(responseRef, updatedData);
            console.log('[AIResponses] Successfully updated response');
            setIsEditing(null);
            resetForm();
            fetchResponses();
            toast.success('Response updated successfully');
        } catch (error) {
            console.error('[AIResponses] Error updating response:', error);
            toast.error('Error updating response');
        }
    };

    const resetForm = () => {
        setNewResponse({
            keywords: [''],
            description: '',
            status: 'active'
        });
        setSelectedTags([]);
        setSelectedImages([]);
        setSelectedImageUrls([]);
        setSelectedAudios([]);
        setSelectedAudioUrls([]);
        setSelectedDocs([]);
        setSelectedDocUrls([]);
        setSelectedEmployees([]);
        setSelectedVideos([]);
        setSelectedVideoUrls([]);
    };

    // Filter responses based on search query
    const filteredResponses = responses.filter(response =>
        response && (
            response.keywords?.some(keyword => 
                keyword.toLowerCase().includes(searchQuery.toLowerCase())
            ) ||
            response.description?.toLowerCase().includes(searchQuery.toLowerCase() || '')
        )
    );

    console.log('[AIResponses] Filtered responses:', {
        total: responses.length,
        filtered: filteredResponses.length,
        searchQuery
    });

    // When starting to edit, set the selected items based on the response type
    const startEditing = (response: AIResponse) => {
        console.log('[AIResponses] Starting edit for response:', response.id);
        setIsEditing(response.id);
        setKeywordSource(response.keywordSource || 'user');
        
        // Set the form state based on response type
        switch (response.type) {
            case 'Tag':
                const tagResponse = response as AITagResponse;
                console.log('[AIResponses] Setting selected tags:', tagResponse.tags);
                const selectedTagIds = tagResponse.tags
                    .map(tagName => availableTags.find(t => t.name === tagName)?.id)
                    .filter((id): id is string => id !== undefined);
                setSelectedTags(selectedTagIds);
                break;
            case 'Image':
                const imageResponse = response as AIImageResponse;
                setSelectedImageUrls(imageResponse.imageUrls || []);
                break;
            case 'Voice':
                const voiceResponse = response as AIVoiceResponse;
                setSelectedAudioUrls(voiceResponse.voiceUrls || []);
                break;
            case 'Document':
                const docResponse = response as AIDocumentResponse;
                setSelectedDocUrls(docResponse.documentUrls || []);
                break;
            case 'Assign':
                const assignResponse = response as AIAssignResponse;
                setSelectedEmployees(assignResponse.assignedEmployees || []);
                break;
            case 'Video':
                const videoResponse = response as AIVideoResponse;
                setSelectedVideoUrls(videoResponse.videoUrls || []);
                break;
        }
    };

    return (
        <div className="h-screen overflow-y-auto pb-10">
            <div className="mt-10 ml-2 justify-between items-center intro-y">
                <h2 className="text-lg font-medium">AI Responses</h2>
                <FormSelect
                    value={responseType}
                    onChange={(e) => setResponseType(e.target.value as AIResponseType)}
                    className="w-48"
                >
                    <option value="Tag">Tag Responses</option>
                    <option value="Image">Image Responses</option>
                    <option value="Voice">Voice Responses</option>
                    <option value="Document">Document Responses</option>
                    <option value="Assign">Assign Responses</option>
                    <option value="Video">Video Responses</option>
                </FormSelect>
            </div>

            <div className="grid grid-cols-12 gap-6 mt-5">
                {/* Add Response Form */}
                <div className="intro-y col-span-12 lg:col-span-6">
                    <div className="intro-y box">
                        <div className="p-5">
                            {/* Keywords Section */}
                            <div className="mb-4">
                                <FormLabel>Keywords</FormLabel>
                                {newResponse.keywords.map((keyword, index) => (
                                    <div key={index} className="flex gap-2 mb-2">
                                        <FormInput
                                            value={keyword}
                                            onChange={(e) => updateKeyword(index, e.target.value)}
                                            placeholder="Enter keyword"
                                        />
                                        <Button
                                            variant="danger"
                                            onClick={() => removeKeywordField(index)}
                                            disabled={newResponse.keywords.length === 1}
                                        >
                                            <Lucide icon="X" className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                                <Button
                                    variant="secondary"
                                    onClick={addKeywordField}
                                    className="mt-2"
                                >
                                    <Lucide icon="Plus" className="w-4 h-4 mr-2" /> Add Keyword
                                </Button>
                            </div>

                            {/* Description */}
                            <div className="mb-4">
                                <FormLabel>Description (Optional)</FormLabel>
                                <FormTextarea
                                    value={newResponse.description}
                                    onChange={(e) => setNewResponse(prev => ({
                                        ...prev,
                                        description: e.target.value
                                    }))}
                                    placeholder="Enter description"
                                />
                            </div>

                            {/* Type-specific forms */}
                            {responseType === 'Tag' && (
                                <TagResponseForm
                                    availableTags={availableTags}
                                    selectedTags={selectedTags}
                                    onTagSelection={handleTagSelection}
                                    keywordSource={keywordSource}
                                    onKeywordSourceChange={setKeywordSource}
                                    tagActionMode={tagActionMode}
                                    onTagActionModeChange={setTagActionMode}
                                />
                            )}
                            {responseType === 'Image' && (
                                <ImageResponseForm
                                    selectedImageUrls={selectedImageUrls}
                                    onImageSelect={handleImageSelect}
                                    onImageRemove={handleImageRemove}
                                    keywordSource={keywordSource}
                                    onKeywordSourceChange={setKeywordSource}
                                />
                            )}
                            {responseType === 'Voice' && (
                                <VoiceResponseForm
                                    selectedAudioUrls={selectedAudioUrls}
                                    onAudioSelect={handleAudioSelect}
                                    onAudioRemove={handleAudioRemove}
                                    keywordSource={keywordSource}
                                    onKeywordSourceChange={setKeywordSource}
                                />
                            )}
                            {responseType === 'Document' && (
                                <DocumentResponseForm
                                    selectedDocUrls={selectedDocUrls}
                                    onDocumentSelect={handleDocumentSelect}
                                    onDocumentRemove={handleDocumentRemove}
                                    keywordSource={keywordSource}
                                    onKeywordSourceChange={setKeywordSource}
                                />
                            )}
                            {responseType === 'Assign' && (
                                <AssignResponseForm
                                    employees={employees}
                                    selectedEmployees={selectedEmployees}
                                    onEmployeeSelection={handleEmployeeSelection}
                                    keywordSource={keywordSource}
                                    onKeywordSourceChange={setKeywordSource}
                                />
                            )}
                            {responseType === 'Video' && (
                                <VideoResponseForm
                                    selectedVideoUrls={selectedVideoUrls}
                                    onVideoSelect={handleVideoSelect}
                                    onVideoRemove={handleVideoRemove}
                                    keywordSource={keywordSource}
                                    onKeywordSourceChange={setKeywordSource}
                                />
                            )}

                            {/* Status and Submit */}
                            <div className="mt-4">
                                <FormLabel>Status</FormLabel>
                                <FormSelect
                                    value={newResponse.status}
                                    onChange={(e) => setNewResponse(prev => ({
                                        ...prev,
                                        status: e.target.value as 'active'
                                    }))}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </FormSelect>
                            </div>

                            <Button
                                variant="primary"
                                onClick={addResponse}
                                className="mt-4"
                            >
                                <Lucide icon="Plus" className="w-4 h-4 mr-2" /> Add Response
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Response List */}
                <div className="intro-y col-span-12 lg:col-span-6">
                    <div className="intro-y box dark:bg-gray-700">
                        <div className="p-5">
                            {/* Add Search Input */}
                            <FormInput
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search responses..."
                                className="mb-5 dark:bg-darkmode-800 dark:border-darkmode-400 dark:text-slate-200"
                            />

                            <div className="grid gap-5">
                                {filteredResponses.map((response) => (
                                    <div key={response.id} className="intro-y">
                                        <div className={clsx(
                                            "box p-5",
                                            darkMode ? "bg-darkmode-600" : "bg-white"
                                        )}>
                                            {isEditing === response.id ? (
                                                <div className="space-y-4">
                                                    {/* Keywords Edit */}
                                                    <div>
                                                        <FormLabel>Keywords</FormLabel>
                                                        {response.keywords.map((keyword, index) => (
                                                            <div key={index} className="flex gap-2 mb-2">
                                                                <FormInput
                                                                    value={keyword}
                                                                    onChange={(e) => {
                                                                        const updatedResponses = responses.map(r =>
                                                                            r.id === response.id
                                                                                ? {
                                                                                    ...r,
                                                                                    keywords: r.keywords.map((k, i) =>
                                                                                        i === index ? e.target.value : k
                                                                                    )
                                                                                }
                                                                                : r
                                                                        );
                                                                        setResponses(updatedResponses);
                                                                    }}
                                                                />
                                                                <Button
                                                                    variant="danger"
                                                                    onClick={() => {
                                                                        const updatedResponses = responses.map(r =>
                                                                            r.id === response.id
                                                                                ? {
                                                                                    ...r,
                                                                                    keywords: r.keywords.filter((_, i) => i !== index)
                                                                                }
                                                                                : r
                                                                        );
                                                                        setResponses(updatedResponses);
                                                                    }}
                                                                >
                                                                    <Lucide icon="X" className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                        <Button
                                                            variant="secondary"
                                                            onClick={() => {
                                                                const updatedResponses = responses.map(r =>
                                                                    r.id === response.id
                                                                        ? {
                                                                            ...r,
                                                                            keywords: [...r.keywords, '']
                                                                        }
                                                                        : r
                                                                );
                                                                setResponses(updatedResponses);
                                                            }}
                                                        >
                                                            <Lucide icon="Plus" className="w-4 h-4 mr-2" /> Add Keyword
                                                        </Button>
                                                    </div>

                                                    {/* Description Edit */}
                                                    <div>
                                                        <FormLabel>Description</FormLabel>
                                                        <FormTextarea
                                                            value={response.description}
                                                            onChange={(e) => {
                                                                const updatedResponses = responses.map(r =>
                                                                    r.id === response.id
                                                                        ? { ...r, description: e.target.value }
                                                                        : r
                                                                );
                                                                setResponses(updatedResponses);
                                                            }}
                                                        />
                                                    </div>

                                                    {/* Type-specific Edit Forms */}
                                                    {response.type === 'Tag' && (
                                                        <TagResponseForm
                                                            availableTags={availableTags}
                                                            selectedTags={selectedTags}
                                                            onTagSelection={handleTagSelection}
                                                            keywordSource={keywordSource}
                                                            onKeywordSourceChange={setKeywordSource}
                                                            tagActionMode={tagActionMode}
                                                            onTagActionModeChange={setTagActionMode}
                                                        />
                                                    )}
                                                    {response.type === 'Image' && (
                                                        <div>
                                                            {/* Form to add new images */}
                                                            <ImageResponseForm
                                                                selectedImageUrls={selectedImageUrls}
                                                                onImageSelect={handleImageSelect}
                                                                onImageRemove={handleImageRemove}
                                                                keywordSource={keywordSource}
                                                                onKeywordSourceChange={setKeywordSource}
                                                            />
                                                        </div>
                                                    )}
                                                    {response.type === 'Voice' && (
                                                        <VoiceResponseForm
                                                            selectedAudioUrls={selectedAudioUrls}
                                                            onAudioSelect={handleAudioSelect}
                                                            onAudioRemove={handleAudioRemove}
                                                            keywordSource={keywordSource}
                                                            onKeywordSourceChange={setKeywordSource}
                                                        />
                                                    )}
                                                    {response.type === 'Document' && (
                                                        <DocumentResponseForm
                                                            selectedDocUrls={selectedDocUrls}
                                                            onDocumentSelect={handleDocumentSelect}
                                                            onDocumentRemove={handleDocumentRemove}
                                                            keywordSource={keywordSource}
                                                            onKeywordSourceChange={setKeywordSource}
                                                        />
                                                    )}
                                                    {response.type === 'Assign' && (
                                                        <AssignResponseForm
                                                            employees={employees}
                                                            selectedEmployees={selectedEmployees}
                                                            onEmployeeSelection={handleEmployeeSelection}
                                                            keywordSource={keywordSource}
                                                            onKeywordSourceChange={setKeywordSource}
                                                        />
                                                    )}
                                                    {response.type === 'Video' && (
                                                        <div>
                                                            {/* Form to add new videos */}
                                                            <VideoResponseForm
                                                                selectedVideoUrls={selectedVideoUrls}
                                                                onVideoSelect={handleVideoSelect}
                                                                onVideoRemove={handleVideoRemove}
                                                                keywordSource={keywordSource}
                                                                onKeywordSourceChange={setKeywordSource}
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Status Edit */}
                                                    <div>
                                                        <FormLabel>Status</FormLabel>
                                                        <FormSelect
                                                            value={response.status}
                                                            onChange={(e) => {
                                                                const updatedResponses = responses.map(r =>
                                                                    r.id === response.id
                                                                        ? { ...r, status: e.target.value as 'active' | 'inactive' }
                                                                        : r
                                                                );
                                                                setResponses(updatedResponses);
                                                            }}
                                                        >
                                                            <option value="active">Active</option>
                                                            <option value="inactive">Inactive</option>
                                                        </FormSelect>
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="flex space-x-2">
                                                        <Button
                                                            variant="primary"
                                                            onClick={() => updateResponse(response.id)}
                                                        >
                                                            <Lucide icon="Save" className="w-4 h-4 mr-2" /> Save
                                                        </Button>
                                                        <Button
                                                            variant="secondary"
                                                            onClick={() => {
                                                                setIsEditing(null);
                                                                resetForm();
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
                                                            <div className="font-medium text-base">
                                                                Keywords: {Array.isArray(response.keywords) ? 
                                                                    response.keywords.join(', ') : 
                                                                    response.keywords || 'No keywords'}
                                                            </div>
                                                            <div className="text-slate-500">
                                                                Status: {response.status}
                                                            </div>
                                                            <div className="text-slate-500">
                                                                Created: {response.createdAt.toLocaleDateString()}
                                                            </div>
                                                            {response.description && (
                                                                <div className="text-slate-500">
                                                                    Description: {response.description}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex space-x-2">
                                                            <Button variant="primary" onClick={() => startEditing(response)}>
                                                                <Lucide icon="PenSquare" className="w-4 h-4" />
                                                            </Button>
                                                            <Button variant="danger" onClick={() => deleteResponse(response.id)}>
                                                                <Lucide icon="Trash" className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <div className="rounded-md border border-slate-200/60 dark:border-darkmode-400 p-4">
                                                        {response.type === 'Tag' && (
                                                            <div className="flex flex-wrap gap-2">
                                                                {(response as AITagResponse).tags.map((tag, index) => (
                                                                    <span key={index} className="inline-block bg-slate-100 dark:bg-darkmode-400 rounded px-2 py-1">
                                                                        {tag}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {response.type === 'Image' && (
                                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                                {((response as AIImageResponse).imageUrls ?? []).map((url, idx) => (
                                                                    <div key={idx} className="relative">
                                                                        <img 
                                                                            src={url} 
                                                                            alt={`Response ${idx + 1}`}
                                                                            className="w-full h-48 object-cover rounded-lg shadow-md"
                                                                            onError={(e) => {
                                                                                console.error(`Error loading image: ${url}`);
                                                                                (e.target as HTMLImageElement).src = '/placeholder-image.png';
                                                                            }}
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {response.type === 'Voice' && (
                                                            <div className="space-y-2">
                                                                {(response as AIVoiceResponse).voiceUrls.map((url, idx) => (
                                                                    <audio key={idx} controls className="w-full">
                                                                        <source src={url} type="audio/mpeg" />
                                                                        Your browser does not support the audio element.
                                                                    </audio>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {response.type === 'Document' && (
                                                            <div className="space-y-2">
                                                                {(response as AIDocumentResponse).documentUrls.map((url, idx) => (
                                                                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-darkmode-400 rounded">
                                                                        <div className="flex items-center">
                                                                            <Lucide icon="FileText" className="w-4 h-4 mr-2" />
                                                                            <span>{(response as AIDocumentResponse).documentNames[idx]}</span>
                                                                        </div>
                                                                        <a 
                                                                            href={url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="text-primary hover:underline"
                                                                        >
                                                                            <Lucide icon="Download" className="w-4 h-4" />
                                                                        </a>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {response.type === 'Assign' && (
                                                            <div className="flex flex-wrap gap-2">
                                                                {(response as AIAssignResponse).assignedEmployees.map((employeeId) => {
                                                                    const employee = employees.find(e => e.id === employeeId);
                                                                    return (
                                                                        <span 
                                                                            key={employeeId} 
                                                                            className="inline-block bg-slate-100 dark:bg-darkmode-400 rounded px-2 py-1"
                                                                        >
                                                                            {employee?.name || 'Unknown Employee'}
                                                                        </span>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                        {response.type === 'Video' && (
                                                            <div className="space-y-2">
                                                                {(response as AIVideoResponse).videoUrls.map((url, idx) => (
                                                                    <video key={idx} controls className="w-full">
                                                                        <source src={url} type="video/mp4" />
                                                                        Your browser does not support the video element.
                                                                    </video>
                                                                ))}
                                                            </div>
                                                        )}
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
    );
}

export default AIResponses; 
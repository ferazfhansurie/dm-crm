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
import clsx from "clsx";

interface AIGenerativeResponse {
    id: string;
    keywords: string[];
    description: string;
    prompt: string;
    template: string;
    targetType: 'group' | 'contact';
    targetId: string;
    responseType: 'report' | 'query' | 'template' | 'other';
    extractFields: Array<{
        name: string;
        key: string;
        required: boolean;
    }>;
    conditions?: Array<{
        field: string;
        value: string;
        template: string;
    }>;
    createdAt: Date;
    status: 'active' | 'inactive';
    keywordSource: 'user' | 'bot';
}

function AIGenerativeResponses() {
    const [responses, setResponses] = useState<AIGenerativeResponse[]>([]);
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [contacts, setContacts] = useState<{id: string, name: string}[]>([]);
    const [groups, setGroups] = useState<{id: string, name: string}[]>([]);
    const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
    
    const [newResponse, setNewResponse] = useState<Omit<AIGenerativeResponse, 'id' | 'createdAt'>>({
        keywords: [''],
        description: '',
        prompt: '',
        template: '',
        targetType: 'contact',
        targetId: '',
        responseType: 'report',
        extractFields: [],
        conditions: [],
        status: 'active',
        keywordSource: 'user'
    });

    const [extractFields, setExtractFields] = useState<Array<{
        name: string;
        key: string;
        required: boolean;
    }>>([]);

    const [conditions, setConditions] = useState<Array<{
        field: string;
        value: string;
        template: string;
    }>>([]);

    const firestore = getFirestore();
    const auth = getAuth();
    const darkMode = useAppSelector(selectDarkMode);

    useEffect(() => {
        fetchResponses();
        fetchContactsAndGroups();
    }, []);

    const fetchContactsAndGroups = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const userRef = doc(firestore, 'user', user.email!);
            const userSnapshot = await getDoc(userRef);
            if (!userSnapshot.exists()) return;
            const companyId = userSnapshot.data().companyId;

            // Fetch contacts
            const contactsRef = collection(firestore, `companies/${companyId}/contacts`);
            const contactsSnapshot = await getDocs(contactsRef);
            const fetchedContacts = contactsSnapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name || doc.data().number
            }));
            setContacts(fetchedContacts);

            // Fetch groups
            const groupsRef = collection(firestore, `companies/${companyId}/groups`);
            const groupsSnapshot = await getDocs(groupsRef);
            const fetchedGroups = groupsSnapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name
            }));
            setGroups(fetchedGroups);
        } catch (error) {
            console.error('Error fetching contacts and groups:', error);
            toast.error('Error fetching contacts and groups');
        }
    };

    const fetchResponses = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const userRef = doc(firestore, 'user', user.email!);
            const userSnapshot = await getDoc(userRef);
            if (!userSnapshot.exists()) return;
            const companyId = userSnapshot.data().companyId;

            const responsesRef = collection(firestore, `companies/${companyId}/aiGenerativeResponses`);
            const responsesQuery = query(responsesRef, orderBy('createdAt', 'desc'));
            const responsesSnapshot = await getDocs(responsesQuery);

            const fetchedResponses = responsesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date()
            })) as AIGenerativeResponse[];

            setResponses(fetchedResponses);
        } catch (error) {
            console.error('Error fetching responses:', error);
            toast.error('Error fetching responses');
        }
    };

    const validateResponse = () => {
        const validKeywords = newResponse.keywords.filter(k => k.trim() !== '');
        if (validKeywords.length === 0) {
            toast.error('Please provide at least one keyword');
            return false;
        }

        if (!newResponse.prompt.trim()) {
            toast.error('Please provide a prompt');
            return false;
        }

        if (!newResponse.targetId) {
            toast.error('Please select a target');
            return false;
        }

        if (!newResponse.template.trim()) {
            toast.error('Please provide a template');
            return false;
        }

        return true;
    };

    const addResponse = async () => {
        if (!validateResponse()) return;

        try {
            const user = auth.currentUser;
            if (!user) return;

            const userRef = doc(firestore, 'user', user.email!);
            const userSnapshot = await getDoc(userRef);
            if (!userSnapshot.exists()) return;
            const companyId = userSnapshot.data().companyId;

            const responseData = {
                ...newResponse,
                extractFields,
                conditions,
                keywords: newResponse.keywords.filter(k => k.trim() !== ''),
                createdAt: serverTimestamp(),
            };

            const responseRef = collection(firestore, `companies/${companyId}/aiGenerativeResponses`);
            await addDoc(responseRef, responseData);

            resetForm();
            fetchResponses();
            toast.success('Response added successfully');
        } catch (error) {
            console.error('Error adding response:', error);
            toast.error('Error adding response');
        }
    };

    const updateResponse = async (id: string) => {
        if (!validateResponse()) return;

        try {
            const user = auth.currentUser;
            if (!user) return;

            const userRef = doc(firestore, 'user', user.email!);
            const userSnapshot = await getDoc(userRef);
            if (!userSnapshot.exists()) return;
            const companyId = userSnapshot.data().companyId;

            const responseRef = doc(firestore, `companies/${companyId}/aiGenerativeResponses`, id);
            
            const updateData = {
                ...newResponse,
                extractFields,
                conditions,
                keywords: newResponse.keywords.filter(k => k.trim() !== '')
            };

            await updateDoc(responseRef, updateData);
            
            setIsEditing(null);
            resetForm();
            fetchResponses();
            toast.success('Response updated successfully');
        } catch (error) {
            console.error('Error updating response:', error);
            toast.error('Error updating response');
        }
    };

    const deleteResponse = async (id: string) => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const userRef = doc(firestore, 'user', user.email!);
            const userSnapshot = await getDoc(userRef);
            if (!userSnapshot.exists()) return;
            const companyId = userSnapshot.data().companyId;

            await deleteDoc(doc(firestore, `companies/${companyId}/aiGenerativeResponses`, id));
            fetchResponses();
            toast.success('Response deleted successfully');
        } catch (error) {
            console.error('Error deleting response:', error);
            toast.error('Error deleting response');
        }
    };

    const resetForm = () => {
        setNewResponse({
            keywords: [''],
            description: '',
            prompt: '',
            template: '',
            targetType: 'contact',
            targetId: '',
            responseType: 'report',
            extractFields: [],
            conditions: [],
            status: 'active',
            keywordSource: 'user'
        });
        setExtractFields([]);
        setConditions([]);
        setShowTemplateBuilder(false);
    };

    const startEditing = (response: AIGenerativeResponse) => {
        setIsEditing(response.id);
        setNewResponse({
            keywords: response.keywords,
            description: response.description,
            prompt: response.prompt,
            template: response.template,
            targetType: response.targetType,
            targetId: response.targetId,
            responseType: response.responseType,
            extractFields: response.extractFields,
            conditions: response.conditions || [],
            status: response.status,
            keywordSource: response.keywordSource
        });
        setExtractFields(response.extractFields);
        setConditions(response.conditions || []);
        setShowTemplateBuilder(true);
    };

    // Filter responses based on search query
    const filteredResponses = responses.filter(response =>
        response.keywords.some(keyword => 
            keyword.toLowerCase().includes(searchQuery.toLowerCase())
        ) ||
        response.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="h-screen overflow-y-auto pb-10">
            <div className="mt-10 ml-2">
                <h2 className="text-lg font-medium">AI Generative Responses</h2>
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
                                            onChange={(e) => {
                                                const updatedKeywords = [...newResponse.keywords];
                                                updatedKeywords[index] = e.target.value;
                                                setNewResponse(prev => ({
                                                    ...prev,
                                                    keywords: updatedKeywords
                                                }));
                                            }}
                                            placeholder="Enter keyword"
                                        />
                                        <Button
                                            variant="danger"
                                            onClick={() => {
                                                const updatedKeywords = newResponse.keywords.filter((_, i) => i !== index);
                                                setNewResponse(prev => ({
                                                    ...prev,
                                                    keywords: updatedKeywords
                                                }));
                                            }}
                                            disabled={newResponse.keywords.length === 1}
                                        >
                                            <Lucide icon="X" className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                                <Button
                                    variant="secondary"
                                    onClick={() => setNewResponse(prev => ({
                                        ...prev,
                                        keywords: [...prev.keywords, '']
                                    }))}
                                    className="mt-2"
                                >
                                    <Lucide icon="Plus" className="w-4 h-4 mr-2" /> Add Keyword
                                </Button>
                            </div>

                            {/* Response Type */}
                            <div className="mb-4">
                                <FormLabel>Response Type</FormLabel>
                                <FormSelect
                                    value={newResponse.responseType}
                                    onChange={(e) => setNewResponse(prev => ({
                                        ...prev,
                                        responseType: e.target.value as any
                                    }))}
                                >
                                    <option value="report">Report</option>
                                    <option value="query">Query</option>
                                    <option value="template">Template</option>
                                    <option value="other">Other</option>
                                </FormSelect>
                            </div>

                            {/* AI Prompt */}
                            <div className="mb-4">
                                <FormLabel>AI Prompt</FormLabel>
                                <FormTextarea
                                    value={newResponse.prompt}
                                    onChange={(e) => setNewResponse(prev => ({
                                        ...prev,
                                        prompt: e.target.value
                                    }))}
                                    placeholder="Enter the prompt for AI to generate content..."
                                    className="h-32"
                                />
                            </div>

                            {/* Template Builder Section */}
                            <div className="mb-4">
                                <FormLabel>Template Builder</FormLabel>
                                <Button
                                    variant="secondary"
                                    onClick={() => setShowTemplateBuilder(!showTemplateBuilder)}
                                    className="mb-2"
                                >
                                    {showTemplateBuilder ? 'Hide Template Builder' : 'Show Template Builder'}
                                </Button>

                                {showTemplateBuilder && (
                                    <div className="space-y-4 p-4 border rounded">
                                        {/* Extract Fields Section */}
                                        <div>
                                            <FormLabel>Fields to Extract</FormLabel>
                                            {extractFields.map((field, index) => (
                                                <div key={index} className="flex gap-2 mb-2">
                                                    <FormInput
                                                        placeholder="Field Name"
                                                        value={field.name}
                                                        onChange={(e) => {
                                                            const updated = [...extractFields];
                                                            updated[index].name = e.target.value;
                                                            setExtractFields(updated);
                                                        }}
                                                    />
                                                    <FormInput
                                                        placeholder="Key (e.g., customer_name)"
                                                        value={field.key}
                                                        onChange={(e) => {
                                                            const updated = [...extractFields];
                                                            updated[index].key = e.target.value;
                                                            setExtractFields(updated);
                                                        }}
                                                    />
                                                    <FormSelect
                                                        value={field.required ? 'required' : 'optional'}
                                                        onChange={(e) => {
                                                            const updated = [...extractFields];
                                                            updated[index].required = e.target.value === 'required';
                                                            setExtractFields(updated);
                                                        }}
                                                    >
                                                        <option value="required">Required</option>
                                                        <option value="optional">Optional</option>
                                                    </FormSelect>
                                                    <Button
                                                        variant="danger"
                                                        onClick={() => {
                                                            setExtractFields(extractFields.filter((_, i) => i !== index));
                                                        }}
                                                    >
                                                        <Lucide icon="X" className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                            <Button
                                                variant="secondary"
                                                onClick={() => setExtractFields([...extractFields, { name: '', key: '', required: true }])}
                                            >
                                                Add Field
                                            </Button>
                                        </div>

                                        {/* Conditional Templates Section */}
                                        <div>
                                            <FormLabel>Conditional Templates</FormLabel>
                                            {conditions.map((condition, index) => (
                                                <div key={index} className="border p-4 mb-4 rounded">
                                                    <div className="flex gap-2 mb-2">
                                                        <FormSelect
                                                            value={condition.field}
                                                            onChange={(e) => {
                                                                const updated = [...conditions];
                                                                updated[index].field = e.target.value;
                                                                setConditions(updated);
                                                            }}
                                                        >
                                                            <option value="">Select Field</option>
                                                            {extractFields.map(field => (
                                                                <option key={field.key} value={field.key}>{field.name}</option>
                                                            ))}
                                                        </FormSelect>
                                                        <FormInput
                                                            placeholder="Value"
                                                            value={condition.value}
                                                            onChange={(e) => {
                                                                const updated = [...conditions];
                                                                updated[index].value = e.target.value;
                                                                setConditions(updated);
                                                            }}
                                                        />
                                                        <Button
                                                            variant="danger"
                                                            onClick={() => {
                                                                setConditions(conditions.filter((_, i) => i !== index));
                                                            }}
                                                        >
                                                            <Lucide icon="X" className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                    <FormTextarea
                                                        value={condition.template}
                                                        onChange={(e) => {
                                                            const updated = [...conditions];
                                                            updated[index].template = e.target.value;
                                                            setConditions(updated);
                                                        }}
                                                        placeholder="Template format for this condition..."
                                                        className="h-32"
                                                    />
                                                </div>
                                            ))}
                                            <Button
                                                variant="secondary"
                                                onClick={() => setConditions([...conditions, { field: '', value: '', template: '' }])}
                                            >
                                                Add Condition
                                            </Button>
                                        </div>

                                        {/* Default Template */}
                                        <div>
                                            <FormLabel>Default Template</FormLabel>
                                            <FormTextarea
                                                value={newResponse.template}
                                                onChange={(e) => setNewResponse(prev => ({
                                                    ...prev,
                                                    template: e.target.value
                                                }))}
                                                placeholder={`Enter your default template format...
Example:
Contact Details:
1. Full Name: [full_name]
2. Contact Number: [contact_number]
3. Intended Usage: [usage]`}
                                                className="h-48"
                                            />
                                        </div>

                                        {/* Template Preview */}
                                        <div>
                                            <FormLabel>Template Preview</FormLabel>
                                            <div className="bg-slate-50 dark:bg-darkmode-400 p-4 rounded">
                                                <pre className="whitespace-pre-wrap">
                                                    {newResponse.template.replace(/\[(\w+)\]/g, (match, key) => {
                                                        const field = extractFields.find(f => f.key === key);
                                                        return field ? `[${field.name}]` : match;
                                                    })}
                                                </pre>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Target Type */}
                            <div className="mb-4">
                                <FormLabel>Target Type</FormLabel>
                                <FormSelect
                                    value={newResponse.targetType}
                                    onChange={(e) => setNewResponse(prev => ({
                                        ...prev,
                                        targetType: e.target.value as 'group' | 'contact',
                                        targetId: ''
                                    }))}
                                >
                                    <option value="contact">Contact</option>
                                    <option value="group">Group</option>
                                </FormSelect>
                            </div>

                            {/* Target Selection */}
                            <div className="mb-4">
                                <FormLabel>Select {newResponse.targetType === 'contact' ? 'Contact' : 'Group'}</FormLabel>
                                <FormSelect
                                    value={newResponse.targetId}
                                    onChange={(e) => setNewResponse(prev => ({
                                        ...prev,
                                        targetId: e.target.value
                                    }))}
                                >
                                    <option value="">Select {newResponse.targetType === 'contact' ? 'a contact' : 'a group'}</option>
                                    {newResponse.targetType === 'contact' 
                                        ? contacts.map(contact => (
                                            <option key={contact.id} value={contact.id}>{contact.name}</option>
                                        ))
                                        : groups.map(group => (
                                            <option key={group.id} value={group.id}>{group.name}</option>
                                        ))
                                    }
                                </FormSelect>
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

                            {/* Status */}
                            <div className="mb-4">
                                <FormLabel>Status</FormLabel>
                                <FormSelect
                                    value={newResponse.status}
                                    onChange={(e) => setNewResponse(prev => ({
                                        ...prev,
                                        status: e.target.value as 'active' | 'inactive'
                                    }))}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </FormSelect>
                            </div>

                            <Button
                                variant="primary"
                                onClick={isEditing ? () => updateResponse(isEditing) : addResponse}
                                className="mt-4"
                            >
                                <Lucide icon={isEditing ? "Save" : "Plus"} className="w-4 h-4 mr-2" />
                                {isEditing ? 'Update Response' : 'Add Response'}
                            </Button>

                            {isEditing && (
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        setIsEditing(null);
                                        resetForm();
                                    }}
                                    className="mt-4 ml-2"
                                >
                                    Cancel
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Response List */}
                <div className="intro-y col-span-12 lg:col-span-6">
                    <div className="intro-y box">
                        <div className="p-5">
                            <FormInput
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search responses..."
                                className="mb-5"
                            />

                            <div className="space-y-4">
                                {filteredResponses.map((response) => (
                                    <div key={response.id} className={clsx(
                                        "intro-y",
                                        "box",
                                        "p-4",
                                        "border",
                                        "rounded",
                                        darkMode ? "bg-darkmode-600" : "bg-white"
                                    )}>
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="font-medium">
                                                Keywords: {response.keywords.join(', ')}
                                            </div>
                                            <div className="flex space-x-2">
                                                <Button
                                                    variant="primary"
                                                    onClick={() => startEditing(response)}
                                                >
                                                    <Lucide icon="Pencil" className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="danger"
                                                    onClick={() => deleteResponse(response.id)}
                                                >
                                                    <Lucide icon="Trash" className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="text-slate-500">
                                            <div>Type: {response.responseType}</div>
                                            <div>Status: {response.status}</div>
                                            <div>Target: {response.targetType} - {
                                                response.targetType === 'contact'
                                                    ? contacts.find(c => c.id === response.targetId)?.name
                                                    : groups.find(g => g.id === response.targetId)?.name
                                            }</div>
                                            {response.description && (
                                                <div>Description: {response.description}</div>
                                            )}
                                        </div>
                                        <div className="mt-2">
                                            <div className="font-medium">Template Preview:</div>
                                            <pre className="whitespace-pre-wrap bg-slate-50 dark:bg-darkmode-400 p-2 rounded mt-1">
                                                {response.template}
                                            </pre>
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

export default AIGenerativeResponses;
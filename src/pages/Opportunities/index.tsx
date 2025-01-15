import { useEffect, useState } from "react";
import { getDocs, doc, getDoc, collection, getFirestore, deleteDoc, addDoc, updateDoc, setDoc } from "firebase/firestore";
import { getAuth } from 'firebase/auth';
import { initializeApp } from "firebase/app";
import Button from "@/components/Base/Button";
import Lucide from "@/components/Base/Lucide";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useNavigate } from "react-router-dom";
import { useContacts } from "../../contact";
import LoadingIcon from "@/components/Base/LoadingIcon";
import Tippy from "@/components/Base/Tippy";
import TippyContent from "@/components/Base/TippyContent";
import Dialog from "@/components/Base/Headless/Dialog";
import { ChevronUp, ChevronDown } from 'lucide-react';

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

interface ToolbarProps {
  employees: { name: string, email: string }[];
  onEmployeeChange: (email: string) => void;
  onOpenModal: () => void;
  onOpenAddOpportunityModal: () => void; // Add this line
  userRole: number | null;
  onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

function Toolbar({ onOpenModal, onOpenAddOpportunityModal, employees, onEmployeeChange, userRole, onSearchChange }: ToolbarProps) {
  return (
    <div className="flex flex-col w-full p-4 shadow-sm rounded-lg mb-4 bg-white dark:bg-gray-800 space-y-4">
      <div className="flex flex-col space-y-4 w-full">
        {userRole == 1 && (
          <select 
            className="px-3 py-2 border rounded-lg w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600" 
            onChange={(e) => onEmployeeChange(e.target.value)}
          >
            {employees.map((employee, index) => (
              <option key={index} value={employee.email}>{employee.name}</option>
            ))}
          </select>
        )}
        <input
          type="text"
          placeholder="Search Opportunities"
          className="px-3 py-2 border rounded-lg w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
          onChange={onSearchChange}
        />
      </div>
      <div className="flex flex-wrap justify-start items-center gap-2">
        {/* <Button variant="outline-secondary" className="px-4 py-2 dark:border-gray-600 dark:text-gray-300">
          Sort By
        </Button>
        <Button variant="outline-secondary" className="p-2 dark:border-gray-600 dark:text-gray-300">
          <Lucide icon="Filter" className="w-5 h-5" />
        </Button>
        <Button variant="outline-secondary" className="p-2 dark:border-gray-600 dark:text-gray-300">
          <Lucide icon="MoreHorizontal" className="w-5 h-5" />
        </Button> */}
        {userRole == 1 && (
          <>
            <Button variant="primary" className="px-4 py-2 text-white" onClick={onOpenModal}>
              Edit Pipeline
            </Button>
            <Button variant="primary" className="px-4 py-2 text-white" onClick={onOpenAddOpportunityModal}>
              Add Opportunity
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

interface Item {
  id: string;
  name: string;
  source: string;
  value: string;
  additionalEmails: string[];
  address1: string | null;
  assignedTo: string;
  businessId: string | null;
  chat: any;
  chat_id: string;
  profilePicUrl: string;
  city: string | null;
  companyName: string | null;
  country: string;
  customFields: any[];
  dateAdded: string;
  dateOfBirth: string | null;
  dateUpdated: string;
  dnd: boolean;
  dndSettings: any;
  email: string | null;
  contactName: string | null;
  followers: any[];
  lastName: string | null;
  lastNameRaw: string | null;
  last_message: any;
  locationId: string;
  phone: string;
  pinned: boolean;
  postalCode: string | null;
  sourceField: string | null;
  state: string | null;
  tags: string[];
  type: string;
  unreadCount: number;
  website: string | null;
  notes?: string;
  isCalled?: boolean; // Add this line
  callCount?: number; // Add this line
}


interface Column {
  id: string;
  name: string;
  sort: number;
  items: Item[];
}

interface Columns {
  [key: string]: Column;
}

function LoadingPage() {
  const [columns, setColumns] = useState<Columns>({});
  const [employees, setEmployees] = useState<{ name: string, email: string }[]>([]);
  const [selectedEmployeeEmail, setSelectedEmployeeEmail] = useState<string | null>(null);
  const navigate = useNavigate();
  const { contacts } = useContacts();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isModalOpen2, setIsModalOpen2] = useState(false);
  const [userRole, setUserRole] = useState<number | null>(null);
  const [isLoading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedItemPipelineId, setSelectedItemPipelineId] = useState<string | null>(null);
  const [isAddOpportunityModalOpen, setIsAddOpportunityModalOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [expandedPipelines, setExpandedPipelines] = useState<Set<string>>(new Set());

  const handleOpenAddOpportunityModal = () => {
    setIsAddOpportunityModalOpen(true);
  };

  const toggleItemExpansion = (itemId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the card click event
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const togglePipelineExpansion = (pipelineId: string) => {
    setExpandedPipelines(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pipelineId)) {
        newSet.delete(pipelineId);
      } else {
        newSet.add(pipelineId);
      }
      return newSet;
    });
  };

  const handleSaveSelectedContacts = async (selectedContacts: any[], selectedPipelineId: string) => {
    const user = auth.currentUser;
    if (!user) return;
  
    const pipelineRef = collection(firestore, `user/${selectedEmployeeEmail}/pipeline/${selectedPipelineId}/leads`);
    for (const contact of selectedContacts) {
      
      const leadData = {
        name: contact.contactName || '',
        source: contact.phone || '',
        value: '',
        additionalEmails: contact.additionalEmails || [],
        address1: contact.address1 || null,
        assignedTo: contact.assignedTo || '',
        businessId: contact.businessId || null,
        chat: contact.chat || {},
        chat_id: contact.chat_id || '',
        profilePicUrl: contact.profilePicUrl || '',
        city: contact.city || null,
        companyName: contact.companyName || null,
        country: contact.country || '',
        customFields: contact.customFields || [],
        dateAdded: contact.dateAdded || '',
        dateOfBirth: contact.dateOfBirth || null,
        dateUpdated: contact.dateUpdated || '',
        dnd: contact.dnd || false,
        dndSettings: contact.dndSettings || {},
        email: contact.email || null,
        contactName: contact.contactName || null,
        followers: contact.followers || [],
        lastName: contact.lastName || null,
        lastNameRaw: contact.lastNameRaw || null,
        last_message: contact.last_message || {},
        locationId: contact.locationId || '',
        phone: contact.phone || '',
        pinned: contact.pinned || false,
        postalCode: contact.postalCode || null,
        sourceField: contact.sourceField || null,
        state: contact.state || null,
        tags: contact.tags || [],
        type: contact.type || '',
        unreadCount: contact.unreadCount || 0,
        website: contact.website || null,
        notes: contact.notes || null
      };
      await addDoc(pipelineRef, leadData);
    }
  
    // Update local state
    setColumns(prevColumns => {
      const updatedColumns = { ...prevColumns };
      updatedColumns[selectedPipelineId].items.push(...selectedContacts.map(contact => ({
        id: contact.id,
        name: contact.contactName || '',
        source: contact.phone || '',
        value: '',
        additionalEmails: contact.additionalEmails || [],
        address1: contact.address1 || null,
        assignedTo: contact.assignedTo || '',
        businessId: contact.businessId || null,
        chat: contact.chat || {},
        chat_id: contact.chat_id || '',
        profilePicUrl: contact.profilePicUrl || '',
        city: contact.city || null,
        companyName: contact.companyName || null,
        country: contact.country || '',
        customFields: contact.customFields || [],
        dateAdded: contact.dateAdded || '',
        dateOfBirth: contact.dateOfBirth || null,
        dateUpdated: contact.dateUpdated || '',
        dnd: contact.dnd || false,
        dndSettings: contact.dndSettings || {},
        email: contact.email || null,
        contactName: contact.contactName || null,
        followers: contact.followers || [],
        lastName: contact.lastName || null,
        lastNameRaw: contact.lastNameRaw || null,
        last_message: contact.last_message || {},
        locationId: contact.locationId || '',
        phone: contact.phone || '',
        pinned: contact.pinned || false,
        postalCode: contact.postalCode || null,
        sourceField: contact.sourceField || null,
        state: contact.state || null,
        tags: contact.tags || [],
        type: contact.type || '',
        unreadCount: contact.unreadCount || 0,
        website: contact.website || null,
        notes: contact.notes || null
      })));
      return updatedColumns;
    });
  };
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };
  const handleItemClick = (pipelineId: string, item: Item) => {
    setSelectedItemPipelineId(pipelineId);
    setSelectedItem(item);
    setIsModalOpen2(true);
  };
  const handleSaveItem = async (pipelineId: string, updatedItem: Item) => {
    const user = auth.currentUser;
    if (!user) return;

    const itemDocRef = doc(firestore, `user/${selectedEmployeeEmail}/pipeline/${pipelineId}/leads/${updatedItem.id}`);
    
   
    // Convert updatedItem to a plain object and ensure notes is included
    const updatedItemData = {
      ...updatedItem,
      notes: updatedItem.notes || ''
    };
    
    try {
      // Set the document, which will create or update the item
      await setDoc(itemDocRef, updatedItemData);
  
      // Update local state
      setColumns(prevColumns => {
        const updatedColumns = { ...prevColumns };
        const column = updatedColumns[pipelineId];
        if (column) {
          const items = column.items;
          const itemIndex = items.findIndex(item => item.id === updatedItem.id);
          if (itemIndex !== -1) {
            items[itemIndex] = updatedItem;
          }
        }
        return updatedColumns;
      });
    } catch (error) {
      console.error('Error updating item in Firestore:', error);
    }
  };
  const filterItemsWithIndexes = (items: Item[], query: string) => {

    if (!query) return items.map((item, index) => ({ item, originalIndex: index }));
    const formattedQuery = query.replace(/[-\s]/g, '').toLowerCase(); // Remove hyphens and spaces from query and convert to lowercase
    return items
      .map((item, index) => ({ item, originalIndex: index }))
      .filter(({ item }) => {
        const formattedName = (item.name || '').replace(/[-\s]/g, '').toLowerCase();
        const formattedSource = (item.source || '').replace(/[-\s]/g, '').toLowerCase();
        return (
          formattedName.includes(formattedQuery) ||
          formattedSource.includes(formattedQuery)
        );
      });
  };
  const fetchUserData = async (contacts: any[]) => {
    setLoading(true);
    const user = auth.currentUser;
    if (!user) {
      
      return;
    }

    try {
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        
        return;
      }

      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;

      // Fetch employee data
      const employeeRef = collection(firestore, `companies/${companyId}/employee`);
      const employeeSnapshot = await getDocs(employeeRef);
      const employeeListData: { name: string, email: string }[] = [];
      employeeSnapshot.forEach((doc) => {
        const data = doc.data();
        employeeListData.push({ name: data.name, email: doc.id });
      });

      setEmployees(employeeListData);

      // Fetch pipeline data
      const pipelineRef = collection(firestore, `user/${user.email}/pipeline`);
      const pipelineSnapshot = await getDocs(pipelineRef);

      const fetchedColumns: Columns = {};
      for (const pipelineDoc of pipelineSnapshot.docs) {
        const pipelineData = pipelineDoc.data();
        const leadsRef = collection(firestore, `user/${user.email}/pipeline/${pipelineDoc.id}/leads`);
        const leadsSnapshot = await getDocs(leadsRef);
        const leadsData: Item[] = leadsSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || '',
          source: doc.data().source || '',
          value: doc.data().value || '',
          additionalEmails: doc.data().additionalEmails || [],
          address1: doc.data().address1 || null,
          assignedTo: doc.data().assignedTo || '',
          businessId: doc.data().businessId || null,
          chat: doc.data().chat || {},
          chat_id: doc.data().chat_id || '',
          profilePicUrl: doc.data().profilePicUrl || '',
          city: doc.data().city || null,
          companyName: doc.data().companyName || null,
          country: doc.data().country || '',
          customFields: doc.data().customFields || [],
          dateAdded: doc.data().dateAdded || '',
          dateOfBirth: doc.data().dateOfBirth || null,
          dateUpdated: doc.data().dateUpdated || '',
          dnd: doc.data().dnd || false,
          dndSettings: doc.data().dndSettings || {},
          email: doc.data().email || null,
          contactName: doc.data().contactName || null,
          followers: doc.data().followers || [],
          lastName: doc.data().lastName || null,
          lastNameRaw: doc.data().lastNameRaw || null,
          last_message: doc.data().last_message || {},
          locationId: doc.data().locationId || '',
          phone: doc.data().phone || '',
          pinned: doc.data().pinned || false,
          postalCode: doc.data().postalCode || null,
          sourceField: doc.data().sourceField || null,
          state: doc.data().state || null,
          tags: doc.data().tags || [],
          type: doc.data().type || '',
          unreadCount: doc.data().unreadCount || 0,
          website: doc.data().website || null,
          notes:doc.data().notes || null,
          isCalled: doc.data().isCalled || false, // Add this line
          callCount: doc.data().callCount || 0 // Add this line
        }));

        fetchedColumns[pipelineDoc.id] = {
          id: pipelineDoc.id,
          name: pipelineData.name,
          sort: pipelineData.sort,
          items: leadsData
        };
      }

      // Sort columns by sort number
      const sortedColumns = Object.keys(fetchedColumns)
        .sort((a, b) => fetchedColumns[a].sort - fetchedColumns[b].sort)
        .reduce((acc, key) => {
          acc[key] = fetchedColumns[key];
          return acc;
        }, {} as Columns);

      setColumns(sortedColumns);
      setUserRole(userData.role); // Set the user's role in state
      
      
      // Import contacts and filter out groups
      const filteredContacts = Array.isArray(contacts) ? contacts.filter(contact => contact.chat_id && !contact.chat_id.includes('@g.us')) : [];
      
      // Check which contacts are already in the pipelines
      const pipelineContacts = new Set();
      for (const column of Object.values(fetchedColumns)) {
        for (const item of column.items) {
          pipelineContacts.add(item.name);  // assuming `name` is unique and matches contactName
        }
      }
      
      const newContacts = filteredContacts.filter(contact => !pipelineContacts.has(contact.contactName));
      const uniqueContacts = Array.from(new Set(newContacts.map(contact => contact.contactName)))
        .map(contactName => newContacts.find(contact => contact.contactName === contactName));
      
      // Add unique contacts to the pipeline with sort 1
  
  

      setLoading(false);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setLoading(false);
    }
  };

  const fetchUserData2 = async (email: string, contacts: any[]) => {
    setLoading(true);
    if (!email) {
      
      setLoading(false);
      return;
    }

    try {
      
      const docUserRef = doc(firestore, 'user', email);
      const docUserSnapshot = await getDoc(docUserRef);
      
      if (!docUserSnapshot.exists()) {
        console.error(`No document found for user: ${email}`);
        setLoading(false);
        return;
      }

      const userData = docUserSnapshot.data();
      
      const companyId = userData.companyId;

      if (!companyId) {
        console.error(`No companyId found for user: ${email}`);
        setLoading(false);
        return;
      }
      
      // Fetch employee data
      const employeeRef = collection(firestore, `companies/${companyId}/employee`);
      const employeeSnapshot = await getDocs(employeeRef);
      const employeeListData: { name: string, email: string }[] = [];
      employeeSnapshot.forEach((doc) => {
        const data = doc.data();
        employeeListData.push({ name: data.name, email: doc.id });
      });

      setEmployees(employeeListData);

      // Fetch pipeline data
      const pipelineRef = collection(firestore, `user/${email}/pipeline`);
      const pipelineSnapshot = await getDocs(pipelineRef);

      const fetchedColumns: Columns = {};
      for (const pipelineDoc of pipelineSnapshot.docs) {
        const pipelineData = pipelineDoc.data();
        const leadsRef = collection(firestore, `user/${email}/pipeline/${pipelineDoc.id}/leads`);
        const leadsSnapshot = await getDocs(leadsRef);
        const leadsData: Item[] = leadsSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || '',
          source: doc.data().source || '',
          value: doc.data().value || '',
          additionalEmails: doc.data().additionalEmails || [],
          address1: doc.data().address1 || null,
          assignedTo: doc.data().assignedTo || '',
          businessId: doc.data().businessId || null,
          chat: doc.data().chat || {},
          chat_id: doc.data().chat_id || '',
          profilePicUrl: doc.data().profilePicUrl || '',
          city: doc.data().city || null,
          companyName: doc.data().companyName || null,
          country: doc.data().country || '',
          customFields: doc.data().customFields || [],
          dateAdded: doc.data().dateAdded || '',
          dateOfBirth: doc.data().dateOfBirth || null,
          dateUpdated: doc.data().dateUpdated || '',
          dnd: doc.data().dnd || false,
          dndSettings: doc.data().dndSettings || {},
          email: doc.data().email || null,
          contactName: doc.data().contactName || null,
          followers: doc.data().followers || [],
          lastName: doc.data().lastName || null,
          lastNameRaw: doc.data().lastNameRaw || null,
          last_message: doc.data().last_message || {},
          locationId: doc.data().locationId || '',
          phone: doc.data().phone || '',
          pinned: doc.data().pinned || false,
          postalCode: doc.data().postalCode || null,
          sourceField: doc.data().sourceField || null,
          state: doc.data().state || null,
          tags: doc.data().tags || [],
          type: doc.data().type || '',
          unreadCount: doc.data().unreadCount || 0,
          website: doc.data().website || null,
          notes:doc.data().notes || null
        }));

        fetchedColumns[pipelineDoc.id] = {
          id: pipelineDoc.id,
          name: pipelineData.name,
          sort: pipelineData.sort,
          items: leadsData
        };
      }

      // Sort columns by sort number before setting state
      const sortedColumnsArray = Object.keys(fetchedColumns)
        .map(key => fetchedColumns[key])
        .sort((a, b) => a.sort - b.sort);

      const sortedColumns = sortedColumnsArray.reduce((acc, column) => {
        acc[column.id] = column;
        return acc;
      }, {} as Columns);

      setColumns(sortedColumns);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };
  const handleEmployeeChange = (email: string) => {
    setSelectedEmployeeEmail(email);
    fetchUserData2(email, contacts);
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setSelectedEmployeeEmail(user.email);
       // Add this line to log contacts
      fetchUserData(contacts);
    }
  }, [contacts]);

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
  
    const { source, destination } = result;
  
    if (source.droppableId !== destination.droppableId) {
      const sourceColumn = columns[source.droppableId];
      const destColumn = columns[destination.droppableId];
      const sourceItems = [...sourceColumn.items];
      const destItems = [...destColumn.items];
      const [removed] = sourceItems.splice(source.index, 1);
      destItems.splice(destination.index, 0, removed);
  
      // Ensure all fields are defined
      const leadData = {
        name: removed.name || '',
        source: removed.source || '',
        value: removed.value || '',
        additionalEmails: removed.additionalEmails || [],
        address1: removed.address1 || null,
        assignedTo: removed.assignedTo || '',
        businessId: removed.businessId || null,
        chat: removed.chat || {},
        chat_id: removed.chat_id || '',
        profilePicUrl: removed.profilePicUrl || '',
        city: removed.city || null,
        companyName: removed.companyName || null,
        country: removed.country || '',
        customFields: removed.customFields || [],
        dateAdded: removed.dateAdded || '',
        dateOfBirth: removed.dateOfBirth || null,
        dateUpdated: removed.dateUpdated || '',
        dnd: removed.dnd || false,
        dndSettings: removed.dndSettings || {},
        email: removed.email || null,
        contactName: removed.contactName || null,
        followers: removed.followers || [],
        lastName: removed.lastName || null,
        lastNameRaw: removed.lastNameRaw || null,
        last_message: removed.last_message || {},
        locationId: removed.locationId || '',
        phone: removed.phone || '',
        pinned: removed.pinned || false,
        postalCode: removed.postalCode || null,
        sourceField: removed.sourceField || null,
        state: removed.state || null,
        tags: removed.tags || [],
        type: removed.type || '',
        unreadCount: removed.unreadCount || 0,
        website: removed.website || null,
        notes: removed.notes || null
      };
  
      // Update local state first
      setColumns({
        ...columns,
        [source.droppableId]: {
          ...sourceColumn,
          items: sourceItems
        },
        [destination.droppableId]: {
          ...destColumn,
          items: destItems
        }
      });
  
      // Update Firestore
      const user = auth.currentUser;
      if (!user) return;
  
      const sourceDocRef = doc(firestore, `user/${selectedEmployeeEmail}/pipeline/${source.droppableId}/leads/${removed.id}`);
      const destCollectionRef = collection(firestore, `user/${selectedEmployeeEmail}/pipeline/${destination.droppableId}/leads`);
  
      try {
        await deleteDoc(sourceDocRef);
        await addDoc(destCollectionRef, leadData);
      } catch (error) {
        console.error('Error updating Firestore:', error);
      }
    } else {
      const column = columns[source.droppableId];
      const copiedItems = [...column.items];
      const [removed] = copiedItems.splice(source.index, 1);
      copiedItems.splice(destination.index, 0, removed);
      setColumns({
        ...columns,
        [source.droppableId]: {
          ...column,
          items: copiedItems
        }
      });
    }
  };

  const columnColors = [
    "border-blue-500",
    "border-yellow-500",
    "border-red-500",
    "border-green-500",
    "border-purple-500",
    "border-pink-500"
  ];

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };
  const handleCallStatusChange = async (event: React.ChangeEvent<HTMLInputElement>, pipelineId: string, item: Item) => {
    const user = auth.currentUser;
    if (!user) return;
  
    // Update item with new fields if they don't exist
    const newItem = {
      ...item,
      isCalled: event.target.checked,
      callCount: event.target.checked ? (item.callCount || 0) + 1 : (item.callCount || 0)
    };
  
    const itemDocRef = doc(firestore, `user/${selectedEmployeeEmail}/pipeline/${pipelineId}/leads/${item.id}`);
    try {
      await updateDoc(itemDocRef, {
        isCalled: newItem.isCalled,
        callCount: newItem.callCount
      });
      
  
      setColumns(prevColumns => {
        const updatedColumns = { ...prevColumns };
        const column = updatedColumns[pipelineId];
        if (column) {
          const itemIndex = column.items.findIndex(i => i.id === item.id);
          if (itemIndex !== -1) {
            column.items[itemIndex] = newItem;
          }
        }
        return updatedColumns;
      });
    } catch (error) {
      console.error('Error updating document:', error);
    }
  };
  
  
  
  const handleSaveModal = async (data: Column[] | Column) => {
    const user = auth.currentUser;
    if (!user) return;

    if (Array.isArray(data)) {
      // Handle the reordering of pipelines
      setColumns((prevColumns) => {
        const updatedColumns = { ...prevColumns };
        data.forEach((pipeline, index) => {
          updatedColumns[pipeline.id] = { ...pipeline, sort: index + 1 };
        });
        return updatedColumns;
      });

      // Update Firestore
      for (const pipeline of data) {
        const pipelineDocRef = doc(firestore, `user/${selectedEmployeeEmail}/pipeline/${pipeline.id}`);
        await updateDoc(pipelineDocRef, { sort: pipeline.sort });
      }
    } else {
      // Handle adding or updating a single pipeline
      setColumns((prevColumns) => ({
        ...prevColumns,
        [data.id]: data,
      }));

      // Update Firestore
      const pipelineDocRef = doc(firestore, `user/${selectedEmployeeEmail}/pipeline/${data.id}`);
      await updateDoc(pipelineDocRef, { name: data.name, sort: data.sort });
    }
    setIsModalOpen(false);
  };
  const handleDeleteItem = async (pipelineId: string, itemId: string) => {
    const user = auth.currentUser;
    if (!user) return;
  
    const itemDocRef = doc(firestore, `user/${selectedEmployeeEmail}/pipeline/${pipelineId}/leads/${itemId}`);
    
    try {
      await deleteDoc(itemDocRef);
      
      setColumns(prevColumns => {
        const updatedColumns = { ...prevColumns };
        const column = updatedColumns[pipelineId];
        if (column) {
          const items = column.items.filter(item => item.id !== itemId);
          column.items = items;
        }
        return updatedColumns;
      });
    } catch (error) {
      console.error('Error deleting item from Firestore:', error);
    }
  };
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 dark:bg-gray-900 p-2 sm:p-4 overflow-hidden dark:dark-scrollbar">
      <Toolbar 
        onOpenModal={handleOpenModal} 
        onOpenAddOpportunityModal={handleOpenAddOpportunityModal} 
        employees={employees} 
        onEmployeeChange={handleEmployeeChange} 
        userRole={userRole} 
        onSearchChange={handleSearchChange} 
      />
      {isLoading && (
        <div className="fixed top-0 left-0 right-0 bottom-0 flex justify-center items-center bg-opacity-50 dark:bg-opacity-70">
          <div className="items-center absolute top-1/2 left-2/2 transform -translate-x-1/3 -translate-y-1/2 bg-white dark:bg-gray-800 p-4 rounded-md shadow-lg">
            <div role="status">
              <div className="flex flex-col items-center justify-end col-span-6 sm:col-span-3 xl:col-span-2">
              <LoadingIcon icon="three-dots" className="w-20 h-20 p-4 text-gray-800 dark:text-gray-200" />
                <div className="mt-2 text-xs text-center text-gray-600 dark:text-gray-400">Fetching Data...</div>
              </div>
            </div>
          </div>
        </div>
      )}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex flex-col w-full space-y-4 h-[calc(100vh-180px)] sm:h-[calc(100vh-160px)] overflow-y-auto dark:dark-scrollbar">
          {Object.entries(columns).map(([columnId, column], index) => {
            const borderColor = columnColors[index % columnColors.length];
            const filteredItemsWithIndexes = filterItemsWithIndexes(column.items, searchQuery);
            const leadCount = column.items.length;
            const isPipelineExpanded = expandedPipelines.has(columnId);

            return (
              <div key={columnId} className={`flex-shrink-0 flex flex-col w-full border-t-4 ${borderColor} overflow-hidden`}>
                <div 
                  className="w-full mb-4 p-4 bg-white dark:bg-gray-800 shadow rounded-lg border dark:border-gray-700 cursor-pointer"
                  onClick={() => togglePipelineExpansion(columnId)}
                >
                  <div className="flex justify-between items-center">
                    <h2 className="text-base font-bold text-primary dark:text-blue-400">{column.name} ({leadCount})</h2>
                    <button className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                      <Lucide icon={isPipelineExpanded ? "ChevronUp" : "ChevronDown"} className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                {isPipelineExpanded && (
                  <Droppable droppableId={columnId}>
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`p-4 rounded-lg w-full flex-grow overflow-y-auto ${
                          snapshot.isDraggingOver ? 'bg-slate-300 dark:bg-gray-700' : 'bg-slate-100 dark:bg-gray-800'
                        }`}
                      >
                        {filteredItemsWithIndexes.map(({ item, originalIndex }) => (
                          <Draggable key={item.id} draggableId={item.id} index={originalIndex}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`user-select-none p-4 mb-4 rounded-lg shadow-md border ${
                                  snapshot.isDragging ? 'bg-slate-200 dark:bg-gray-600' : 'bg-white dark:bg-gray-700'
                                } text-gray-800 dark:text-gray-200 hover:shadow-lg transition-shadow duration-200`}
                                onClick={() => handleItemClick(column.id, item)}
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center">
                                  {item.profilePicUrl ? (
                                      <img 
                                        src={item.profilePicUrl} 
                                        alt={item.contactName || "Profile"} 
                                        className="w-10 h-10 rounded-full object-cover mr-3 flex-shrink-0" 
                                      />
                                    ) : (
                                      <div className="w-10 h-10 mr-3 border-2 border-gray-500 dark:border-gray-400 rounded-full flex items-center justify-center flex-shrink-0">
                                        {item.chat_id && item.chat_id.includes('@g.us') ? (
                                          <Lucide icon="Users" className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                                        ) : (
                                          <Lucide icon="User" className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                                        )}
                                      </div>
                                    )}
                                    <div>
                                      <p className="font-semibold text-lg text-primary dark:text-blue-400 capitalize">
                                        {item.contactName || "Unknown"}
                                      </p>
                                      <p className="text-sm text-gray-600 dark:text-gray-400">{item.companyName || "No company"}</p>
                                    </div>
                                  </div>
                                  <div className="text-right flex items-center">
                                    {/* <p className="font-medium text-gray-700 dark:text-gray-300 mr-2">{item.value || "$0"}</p> */}
                                    <button
                                      onClick={(e) => toggleItemExpansion(item.id, e)}
                                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                    >
                                      <Lucide icon={expandedItems.has(item.id) ? "ChevronUp" : "ChevronDown"} className="w-5 h-5" />
                                    </button>
                                  </div>
                                </div>
                                
                                {expandedItems.has(item.id) && (
                                  <>
                                    {item.notes && (
                                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{item.notes}</p>
                                    )}
                                    
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center">
                                        <input
                                          type="checkbox"
                                          checked={item.isCalled || false}
                                          onChange={(e) => handleCallStatusChange(e, column.id, item)}
                                          className="mr-2 rounded border-gray-300 text-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-700"
                                        />
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                          {item.callCount || 0} call{item.callCount !== 1 ? 's' : ''}
                                        </span>
                                      </div>
                                      
                                      {item.tags && item.tags.length > 0 && (
                                        <Tippy content={item.tags.join(', ')}>
                                          <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 text-xs font-medium px-2.5 py-0.5 rounded-full cursor-pointer">
                                            <Lucide icon="Tag" className="w-3 h-3 inline-block mr-1" />
                                            {item.tags.length}
                                          </span>
                                        </Tippy>
                                      )}
                                    </div>

                                    <p className="text-sm text-gray-500 dark:text-gray-400">{item.source || "No source"}</p>
                                  </>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                )}
              </div>
            );
          })}
        </div>
      </DragDropContext>
      {isAddOpportunityModalOpen && (
        <AddOpportunityModal
          contacts={contacts}
          onClose={() => setIsAddOpportunityModalOpen(false)}
          onSave={handleSaveSelectedContacts}
          pipelines={Object.values(columns)}
        />
      )}
      {isModalOpen2 && selectedItem && selectedItemPipelineId && (
        <div className="fixed top-0 left-0 z-50 w-full h-full flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
            <EditItemModal
              pipelineId={selectedItemPipelineId}
              item={selectedItem}
              onClose={() => setIsModalOpen2(false)}
              onSave={handleSaveItem}
              onDelete={handleDeleteItem}
            />
          </div>
        </div>
      )}
      {isModalOpen && (
        <div className="fixed top-0 left-0 z-50 w-full h-full flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
            <ModalContent pipelines={Object.values(columns)} onClose={() => setIsModalOpen(false)} onSave={handleSaveModal} selectedEmployeeEmail={selectedEmployeeEmail} />
          </div>
        </div>
      )}
    </div>
  );
}


interface ModalContentProps {
  pipelines: Column[];
  onClose: () => void;
  onSave: (columns: Column[] | Column) => void;
  selectedEmployeeEmail: string | null; // Added prop for selected employee email
}

function ModalContent({ pipelines, onClose, onSave, selectedEmployeeEmail }: ModalContentProps) {
  const [pipelineList, setPipelineList] = useState<Column[]>(pipelines);

  const handlePipelineNameChange = (id: string, name: string) => {
    setPipelineList(prevList => 
      prevList.map(pipeline =>
        pipeline.id === id ? { ...pipeline, name } : pipeline
      )
    );
  };

  const handleSavePipelines = async () => {
    const email = selectedEmployeeEmail;
    if (!email) return;
  
    // Update state
    onSave(pipelineList);
  
    // Update Firestore
    for (const pipeline of pipelineList) {
      const pipelineDocRef = doc(firestore, `user/${email}/pipeline/${pipeline.id}`);
      await setDoc(pipelineDocRef, { name: pipeline.name, sort: pipeline.sort });
    }
  
    onClose();
  };

  const handleAddPipeline = () => {
    const newPipelineId = `newPipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newPipeline: Column = {
      id: newPipelineId,
      name: '',
      sort: pipelineList.length + 1,
      items: []
    };
    setPipelineList(prevList => [...prevList, newPipeline]);
  };


  const handleDeletePipeline = async (pipelineId: string) => {
    const updatedPipelines = pipelineList.filter(pipeline => pipeline.id !== pipelineId);
    updatedPipelines.forEach((pipeline, index) => {
      pipeline.sort = index + 1;
    });
    setPipelineList(updatedPipelines);
  
    const email = selectedEmployeeEmail;
    if (!email) return;
  
    const pipelineDocRef = doc(firestore, `user/${email}/pipeline/${pipelineId}`);
    await deleteDoc(pipelineDocRef);
  };

  const movePipeline = async (pipelineId: string, direction: 'up' | 'down') => {
    const index = pipelineList.findIndex(pipeline => pipeline.id === pipelineId);
    if (index === -1) return;
  
    const newPipelines = [...pipelineList];
    const [pipeline] = newPipelines.splice(index, 1);
  
    if (direction === 'up' && index > 0) {
      newPipelines.splice(index - 1, 0, pipeline);
    } else if (direction === 'down' && index < newPipelines.length - 1) {
      newPipelines.splice(index + 1, 0, pipeline);
    }
  
    newPipelines.forEach((pipeline, i) => (pipeline.sort = i + 1));
    setPipelineList(newPipelines);
  
    const email = selectedEmployeeEmail;
    if (!email) return;
  
    for (const updatedPipeline of newPipelines) {
      const pipelineDocRef = doc(firestore, `user/${email}/pipeline/${updatedPipeline.id}`);
      await updateDoc(pipelineDocRef, { sort: updatedPipeline.sort });
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Edit Pipelines</h2>
      <ul className="space-y-2">
        {pipelineList.sort((a, b) => a.sort - b.sort).map((pipeline) => (
          <li key={pipeline.id} className="flex justify-between items-center py-2 bg-gray-100 dark:bg-gray-700 rounded-lg px-4">
            <div className="flex items-center space-x-2">
              <button
                className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                onClick={() => movePipeline(pipeline.id, 'up')}
              >
                <Lucide icon="ArrowUp" className="w-5 h-5" />
              </button>
              <button
                className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                onClick={() => movePipeline(pipeline.id, 'down')}
              >
                <Lucide icon="ArrowDown" className="w-5 h-5" />
              </button>
              <input
                type="text"
                className="w-full border-none bg-transparent focus:ring-0 text-gray-900 dark:text-white"
                value={pipeline.name}
                onChange={(e) => handlePipelineNameChange(pipeline.id, e.target.value)}
                // Add a unique key to each input
                key={`input-${pipeline.id}`}
              />
            </div>
            <button className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300" onClick={() => handleDeletePipeline(pipeline.id)}>
              <Lucide icon="Trash" className="w-5 h-5" />
            </button>
          </li>
        ))}
      </ul>
      <Button variant="outline-secondary" className="px-4 py-2 mt-4 dark:border-gray-600 dark:text-gray-300" onClick={handleAddPipeline}>
        Add Pipeline
      </Button>
      <div className="flex justify-between mt-4">
        <Button variant="outline-secondary" className="px-4 py-2 dark:border-gray-600 dark:text-gray-300" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" className="px-4 py-2 text-white" onClick={handleSavePipelines}>
          Save
        </Button>
      </div>
    </div>
  );
}
interface EditItemModalProps {
  pipelineId: string;
  item: Item;
  onClose: () => void;
  onSave: (pipelineId: string, updatedItem: Item) => void;
  onDelete: (pipelineId: string, itemId: string) => void;
}

function EditItemModal({ pipelineId, item, onClose, onSave, onDelete }: EditItemModalProps) {
  const [updatedItem, setUpdatedItem] = useState({ ...item, notes: item.notes || '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUpdatedItem({ ...updatedItem, [name]: value });
  };

  const handleSave = () => {
    onSave(pipelineId, updatedItem);
    onClose();
  };

  const handleDelete = () => {
    onDelete(pipelineId, item.id);
    onClose();
  };

  return (
    <Dialog open onClose={onClose}>
      <div className="fixed inset-0 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <Dialog.Panel className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-md mt-10">
          <div className="flex items-center p-4 border-b">
            <div className="block w-12 h-12 overflow-hidden rounded-full shadow-lg bg-gray-700 flex items-center justify-center text-white mr-4">
            {updatedItem.profilePicUrl ? (
                                      <img 
                                        src={updatedItem.profilePicUrl} 
                                        alt={updatedItem.contactName || "Profile"} 
                                        className="w-10 h-10 rounded-full object-cover mr-3 flex-shrink-0" 
                                      />
                                    ) : (
                                      <div className="w-10 h-10 mr-3 border-2 border-gray-500 dark:border-gray-400 rounded-full flex items-center justify-center flex-shrink-0">
                                        {updatedItem.chat_id && updatedItem.chat_id.includes('@g.us') ? (
                                          <Lucide icon="Users" className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                                        ) : (
                                          <Lucide icon="User" className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                                        )}
                                      </div>
                                    )}
            </div>
            <div>
              <div className="font-semibold text-gray-800 dark:text-white">{updatedItem?.contactName} {updatedItem?.lastName}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{updatedItem?.phone}</div>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">First Name</label>
              <input
                type="text"
                name="contactName"
                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={updatedItem.contactName || ''}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
              <input
                type="text"
                name="phone"
                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={updatedItem.phone || ''}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Company</label>
              <input
                type="text"
                name="companyName"
                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={updatedItem.companyName || ''}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
              <input
                type="text"
                name="notes"
                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={updatedItem.notes}
                onChange={handleChange}
                placeholder="Notes"
              />
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <button
              className="px-4 py-2 mr-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 mr-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-700"
              onClick={handleDelete}
            >
              Delete
            </button>
            <button
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-blue-700"
              onClick={handleSave}
            >
              Save
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

interface AddOpportunityModalProps {
  contacts: any[];
  onClose: () => void;
  onSave: (selectedContacts: any[], selectedPipelineId: string) => void; // Modify the onSave function
  pipelines: Column[]; // Add pipelines prop
}
function AddOpportunityModal({ contacts, onClose, onSave, pipelines }: AddOpportunityModalProps) {
  const [selectedContacts, setSelectedContacts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredContacts, setFilteredContacts] = useState<any[]>(contacts);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>(pipelines.length > 0 ? pipelines[0].id : '');

  useEffect(() => {
    setFilteredContacts(
      contacts.filter(contact =>
        contact.contactName?.toLowerCase().includes(searchTerm.toLowerCase())||
        contact.phone?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [searchTerm, contacts]);

  const handleContactSelect = (contact: any) => {
    setSelectedContacts(prev => {
      if (prev.includes(contact)) {
        return prev.filter(c => c !== contact);
      } else {
        return [...prev, contact];
      }
    });
  };

  const handleSave = () => {
    onSave(selectedContacts, selectedPipelineId); // Pass the selectedPipelineId
    onClose();
  };

  return (
    <Dialog open onClose={onClose}>
      <div className="fixed inset-0 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <Dialog.Panel className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-md mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Select Contacts</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <Lucide icon="X" className="w-6 h-6" />
            </button>
          </div>
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 mb-4 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
          />
          <select
            className="w-full px-3 py-2 mb-4 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
            value={selectedPipelineId}
            onChange={(e) => setSelectedPipelineId(e.target.value)}
          >
            {pipelines.map(pipeline => (
              <option key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
              </option>
            ))}
          </select>
          <div className="mt-4 space-y-2 max-h-[70vh] overflow-y-auto">
            {filteredContacts.length > 0 ? (
              filteredContacts.map((contact, index) => (
                <div
                  key={contact.id || `${contact.contactName}-${index}`}
                  className="flex items-center p-2 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <input
                    type="checkbox"
                    className="mr-3 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:focus:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    checked={selectedContacts.includes(contact)}
                    onChange={() => handleContactSelect(contact)}
                  />
                  <div className="flex items-center">
                    <div className="w-8 h-8 flex items-center justify-center bg-gray-300 dark:bg-gray-600 rounded-full mr-3 text-white">
                    {contact.profilePicUrl ? (
                                      <img 
                                        src={contact.profilePicUrl} 
                                        alt={contact.contactName || "Profile"} 
                                        className="w-10 h-10 rounded-full object-cover mr-3 flex-shrink-0" 
                                      />
                                    ) : (
                                      <div className="w-10 h-10 mr-3 border-2 border-gray-500 dark:border-gray-400 rounded-full flex items-center justify-center flex-shrink-0">
                                        {contact.chat_id && contact.chat_id.includes('@g.us') ? (
                                          <Lucide icon="Users" className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                                        ) : (
                                          <Lucide icon="User" className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                                        )}
                                      </div>
                                    )}
                    </div>
                    <div className="flex-grow">
                      <div className="font-semibold capitalize text-gray-900 dark:text-white">{contact.name || contact.contactName || contact.phone}</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No contacts found</p>
            )}
          </div>
          <div className="flex justify-end mt-4">
            <button onClick={onClose} className="px-4 py-2 mr-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600">
              Cancel
            </button>
            <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700">
              Save
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

export default LoadingPage;



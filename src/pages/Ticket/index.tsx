import { useState, useEffect } from 'react';
import { getDoc, getFirestore, doc, setDoc, collection, addDoc, getDocs, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { initializeApp } from "firebase/app";
import { Dialog } from '@headlessui/react';
import { format } from 'date-fns';
import Lucide from "@/components/Base/Lucide";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// Firebase configuration
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

interface Task {
  id: string;
  title: string;
  deadline: string;
  poc: string;
  creator: string;
  clientName: string;
  tasks: string;
  taskStatus: { [key: string]: boolean };
  status: 'open' | 'in-progress' | 'doing-now' | 'completed' | 'blocked' | 'kiv' |'client';
  dateCreated: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedHours: number;
  comments: Array<{
    text: string;
    author: string;
    timestamp: string;
  }>;
  images?: string[];
}

interface Employee {
  id: string;
  name: string;
  email: string;
  role?: string;
  color: string;
  backgroundStyle: string;
}

interface Client {
  id: string;
  name: string;
}

const Ticket = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isClientFormOpen, setIsClientFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<Task['status'] | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<Task['priority'] | 'all'>('all');
  const [hideCompleted, setHideCompleted] = useState(true);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [filterPOC, setFilterPOC] = useState<string>('all');
  const [sortField, setSortField] = useState<keyof Task>('deadline');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchTasks();
    fetchEmployees();
    fetchClients();
  }, []);

  const fetchTasks = async () => {
    try {
      const user = auth.currentUser;
      if (!user?.email) return;
  
      // First get the company ID for the current user
      const docUserRef = doc(firestore, 'user', user.email);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
      }
  
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
  
      // Get all employees in the company
      const employeeRef = collection(firestore, `companies/${companyId}/employee`);
      const employeeSnapshot = await getDocs(employeeRef);
  
      // Fetch tasks for all employees
      const allTasksPromises = employeeSnapshot.docs.map(async (employeeDoc) => {
        const employeeEmail = employeeDoc.data().email;
        const tasksRef = collection(firestore, `user/${employeeEmail}/tasks`);
        const tasksSnapshot = await getDocs(tasksRef);
        
        return tasksSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      });
  
      const allTasksArrays = await Promise.all(allTasksPromises);
      const allTasks = allTasksArrays.flat() as Task[];
  
      setTasks(allTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
      }

      const dataUser = docUserSnapshot.data();
      const companyId = dataUser.companyId;
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.log('No such document for company!');
        return;
      }
      const companyData = docSnapshot.data();
      const accessToken = companyData.ghl_accessToken;

      const employeeRef = collection(firestore, `companies/${companyId}/employee`);
      const employeeSnapshot = await getDocs(employeeRef);

      const employeeListData: Employee[] = [];
      const colors = ["#FF5733", "#006400", "#3357FF", "#FF33A1", "#33FFF5", "#FF8C33", "#8C33FF", "#33FF8C"];
      const backgroundStyles = [
        "linear-gradient(to right, #1F3A8A 0%, #1F3A8A 50%, #2196F3 50%, #2196F3 100%)",
        "linear-gradient(to right, #8A2BE2 0%, #8A2BE2 50%, #9C27B0 50%, #9C27B0 100%)",
        "linear-gradient(to right, #00BCD4 0%, #00BCD4 50%, #795548 50%, #795548 100%)",
        "linear-gradient(to right, #607D8B 0%, #607D8B 50%, #E91E63 50%, #E91E63 100%)"
      ];
      let colorIndex = 0;

      employeeSnapshot.forEach((doc) => {
        employeeListData.push({
          id: doc.id,
          ...doc.data(),
          color: colors[colorIndex % colors.length],
          backgroundStyle: backgroundStyles[colorIndex % backgroundStyles.length]
        } as Employee);
        colorIndex++;
      });

      setEmployees(employeeListData);
    } catch (error) {
      console.error('Error fetching employees:', error);
      throw error;
    }
  };

  const fetchClients = async () => {
    try {
      const user = auth.currentUser;
      if (!user?.email) return;

      // First get the company ID for the current user
      const docUserRef = doc(firestore, 'user', user.email);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
      }

      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;

      // Get all employees in the company
      const employeeRef = collection(firestore, `companies/${companyId}/employee`);
      const employeeSnapshot = await getDocs(employeeRef);

      // Fetch clients for all employees
      const allClientsPromises = employeeSnapshot.docs.map(async (employeeDoc) => {
        const employeeEmail = employeeDoc.data().email;
        const clientsRef = collection(firestore, `user/${employeeEmail}/clients`);
        const clientsSnapshot = await getDocs(clientsRef);
        
        return clientsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      });

      const allClientsArrays = await Promise.all(allClientsPromises);
      // Flatten and remove duplicates based on client name
      const allClients = Array.from(new Map(
        allClientsArrays
          .flat()
          .map(client => [client.id, client])
      ).values()) as Client[];

      setClients(allClients);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'open':
        return 'bg-blue-500';
      case 'in-progress':
        return 'bg-yellow-500';
      case 'doing-now':
        return 'bg-purple-500';
        case 'completed':
            return 'bg-green-500';
      case 'client':
        return 'bg-orange-500';
      case 'blocked':
        return 'bg-red-500';
      case 'kiv':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const filteredTasks = tasks
    .filter(task => {
      if (hideCompleted && (task.status === 'completed' || task.status === 'kiv')) {
        return false;
      }

      const matchesSearch = 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.tasks.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.clientName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
      const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
      const matchesPOC = filterPOC === 'all' || task.poc === filterPOC;

      return matchesSearch && matchesStatus && matchesPriority && matchesPOC;
    })
    .sort((a, b) => {
      if (sortField === 'deadline' || sortField === 'dateCreated') {
        const dateA = new Date(a[sortField]).getTime();
        const dateB = new Date(b[sortField]).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      }
      
      if (sortField === 'estimatedHours') {
        return sortDirection === 'asc' 
          ? a[sortField] - b[sortField]
          : b[sortField] - a[sortField];
      }

      const valueA = String(a[sortField]).toLowerCase();
      const valueB = String(b[sortField]).toLowerCase();
      return sortDirection === 'asc'
        ? valueA.localeCompare(valueB)
        : valueB.localeCompare(valueA);
    });

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'low': return 'bg-gray-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const sendTaskNotification = async (poc: string, task: Task, isNew: boolean) => {
    try {
         // Skip notification if task is completed
    if (task.status === 'completed') {
        console.log('Task is completed, skipping notification');
        return;
      }
  
      const user = auth.currentUser;
      if (!user) return;

      // Get company ID
      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) return;

      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;

      // Get company data
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) return;

      const companyData = docSnapshot.data();
      const baseUrl = companyData.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';

      // Find employee's phone number
      const employeesRef = collection(firestore, 'companies', companyId, 'employee');
      const q = query(employeesRef, where("email", "==", poc));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log(`No employee found with email ${poc}`);
        return;
      }

      const employeeData = querySnapshot.docs[0].data();
      const employeePhone = employeeData.phoneNumber;
      if (!employeePhone) return;

      const chatId = `${employeePhone.replace(/[^\d]/g, '')}@c.us`;
      const groupChatId = "120363178065670386@g.us";

      // Check if this is a completion message by looking for celebration indicators
      const isCompletionMessage = task.title.includes('YEEP YEEP HURRAY') || 
                                 task.title.includes('Task Completed') ||
                                 task.title.includes('🎉') ||
                                 task.title.includes('🎊');

      // Prepare message based on context
      const taskUrl = `https://web.jutasoftware.co/ticket`;
      let message: string;
      let recipients: string[];

      if (isCompletionMessage) {
        // For completion messages, send only to group
        message = task.title; // Use the formatted completion message
        recipients = [groupChatId];
      } else if (isNew) {
        // For new tasks, send to both individual and group
        message = `Hello ${employeeData.name},\n\nA new task has been assigned to you:\n\nTitle: ${task.title}\nDeadline: ${format(new Date(task.deadline), 'dd/MM/yyyy')}\nClient: ${task.clientName}\nPriority: ${task.priority}\n\nPlease check the details at ${taskUrl}`;
        recipients = [chatId, groupChatId];
      } else {
        // For regular reminders, send only to individual
        message = `🔔 Reminder: ${employeeData.name},\n\nPlease check this task:\n\nTitle: ${task.title}\nDeadline: ${format(new Date(task.deadline), 'dd/MM/yyyy')}\nClient: ${task.clientName}\nPriority: ${task.priority}\nStatus: ${task.status}\n\nTask details at ${taskUrl}`;
        recipients = [chatId];
      }

      // Send messages to designated recipients
      for (const recipient of recipients) {
        const url = companyData.v2 === true
          ? `${baseUrl}/api/v2/messages/text/${companyId}/${recipient}`
          : `${baseUrl}/api/messages/text/${recipient}/${companyData.whapiToken}`;

        const requestBody = companyData.v2 === true
          ? { 
              message,
              phoneIndex: userData?.phone >= 0 ? userData?.phone : 0,
              userName: userData.name || ''
            }
          : { message };

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error sending task notification:', errorText);
          continue;
        }
      }

      console.log('Task notifications sent successfully');
    } catch (error) {
      console.error('Error sending task notification:', error);
    }
  };

  const handleDeleteTask = async (task: Task) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      // Delete task from the POC's collection
      const taskRef = doc(firestore, `user/${task.poc}/tasks`, task.id);
      await deleteDoc(taskRef);

      // Delete any associated images from storage
      if (task.images && task.images.length > 0) {
        const storage = getStorage();
        await Promise.all(
          task.images.map(async (imageUrl) => {
            try {
              const imageRef = ref(storage, imageUrl);
              await deleteObject(imageRef);
            } catch (error) {
              console.error('Error deleting image:', error);
            }
          })
        );
      }

      // Update local state
      setTasks(tasks.filter(t => t.id !== task.id));
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Error deleting task. Please try again.');
    }
  };

  return (
    <div className="p-5">
      <div className="mb-4 flex justify-between items-center">
    
        <div className="flex gap-2">
          <button
            onClick={() => setIsClientFormOpen(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-blue-700"
          >
            <Lucide icon="Users" className="w-4 h-4 mr-2 inline-block" />
            Manage Clients
          </button>
          <button
            onClick={() => {
              setCurrentTask(null);
              setIsTaskFormOpen(true);
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-blue-700"
          >
            <Lucide icon="Plus" className="w-4 h-4 mr-2 inline-block" />
            New Task
          </button>
        </div>
      </div>

      <div className="mb-4 flex gap-4 items-center flex-wrap">
        <input
          type="text"
          placeholder="Search tasks..."
          className="px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:placeholder-gray-400"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as Task['status'] | 'all')}
          className="px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="in-progress">In Progress</option>
          <option value="doing-now">Doing Now</option>
          <option value="completed">Completed</option>
          <option value="blocked">Blocked</option>
          <option value="kiv">KIV</option>
          <option value="client">Client</option>
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value as Task['priority'] | 'all')}
          className="px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
        >
          <option value="all">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <select
          value={filterPOC}
          onChange={(e) => setFilterPOC(e.target.value)}
          className="px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
        >
          <option value="all">All Employees</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.email}>
              {employee.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={hideCompleted}
            onChange={(e) => setHideCompleted(e.target.checked)}
            className="rounded dark:bg-gray-700 dark:border-gray-600"
          />
          <span className="text-sm dark:text-gray-300">Hide Completed & KIV Tasks</span>
        </label>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow">
        <div className="max-h-[calc(100vh-150px)] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
              <tr>
                {[
                  { key: 'title', label: 'Title' },
                  { key: 'deadline', label: 'Deadline' },
                  { key: 'poc', label: 'POC' },
                  { key: 'clientName', label: 'Client' },
                  { key: 'tasks', label: 'Tasks' },
                  { key: 'status', label: 'Status' },
                  { key: 'priority', label: 'Priority' },
                  { key: 'estimatedHours', label: 'Est. Hours' },
                  { key: 'comments', label: 'Comments' },
                  { key: 'images', label: 'Images' },
                  { key: 'dateCreated', label: 'Created' },
                  { key: 'actions', label: 'Actions' }
                ].map(({ key, label }) => (
                  <th 
                    key={key}
                    className={`px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                      key !== 'actions' ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700' : ''
                    }`}
                    onClick={() => {
                      if (key !== 'actions' && key !== 'comments') {
                        if (sortField === key) {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField(key as keyof Task);
                          setSortDirection('asc');
                        }
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      {label}
                      {key !== 'actions' && key !== 'comments' && (
                        <span className="inline-block">
                          {sortField === key && (
                            <Lucide 
                              icon={sortDirection === 'asc' ? 'ChevronUp' : 'ChevronDown'} 
                              className="w-4 h-4"
                            />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
              {filteredTasks.map((task, idx) => (
                <tr key={task.id} className={`
                  ${idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}
                  hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-base
                `}>
                  <td className="px-4 py-4 whitespace-nowrap text-base">{task.title}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-base">
                    <div className={`
                      ${(() => {
                        const daysUntilDeadline = Math.ceil((new Date(task.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        if (daysUntilDeadline < 0) return 'text-red-500'; 
                        if (daysUntilDeadline <= 3) return 'text-orange-500';
                        if (daysUntilDeadline <= 7) return 'text-yellow-500';
                        return 'text-gray-900 dark:text-gray-300';
                      })()}
                      font-medium text-base
                    `}>
                      {format(new Date(task.deadline), 'dd/MM/yyyy')}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-base">
                    <div className="flex items-center">
                      <span className="mr-2">{employees.find(emp => emp.email === task.poc)?.name || task.poc}</span>
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: employees.find(emp => emp.email === task.poc)?.color }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-base">{task.clientName}</td>
                  <td className="px-4 py-4">
                    <div className="max-w-xs">
                      {task.tasks.split('\n').map((item, index) => (
                        <div key={index} className="flex items-center gap-2 mb-1">
                          <input
                            type="checkbox"
                            checked={task.taskStatus?.[item] || false}
                            onChange={async () => {
                              try {
                                const user = auth.currentUser;
                                if (!user?.email) return;

                                const taskRef = doc(firestore, `user/${task.creator}/tasks`, task.id);
                                const newTaskStatus = {
                                  ...task.taskStatus,
                                  [item]: !task.taskStatus?.[item]
                                };

                                await updateDoc(taskRef, {
                                  taskStatus: newTaskStatus
                                });

                                // Update local state
                                setTasks(tasks.map(t => 
                                  t.id === task.id 
                                    ? { ...t, taskStatus: newTaskStatus }
                                    : t
                                ));
                              } catch (error) {
                                console.error('Error updating task status:', error);
                              }
                            }}
                            className="rounded border-gray-300 text-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-700"
                          />
                          <span className={`text-sm ${task.taskStatus?.[item] ? 'line-through text-gray-500' : 'text-gray-900 dark:text-gray-300'}`}>
                            {item}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-base">
                    <select
                      value={task.status}
                      onChange={async (e) => {
                        try {
                          const user = auth.currentUser;
                          if (!user?.email) return;

                          const taskRef = doc(firestore, `user/${task.creator}/tasks`, task.id);
                          const newStatus = e.target.value as Task['status'];
                          const completionTime = new Date().toISOString();

                          await updateDoc(taskRef, {
                            status: newStatus,
                            completionTime: newStatus === 'completed' ? completionTime : null
                          });

                          // Update local state
                          setTasks(tasks.map(t => 
                            t.id === task.id 
                              ? { ...t, status: newStatus, completionTime }
                              : t
                          ));

                          // Send detailed completion message if task is marked as completed
                          if (newStatus === 'completed' && task.status !== 'completed') {
                            const celebrationMessages = [
                              "🎉 YEEP YEEP HURRAY! Task Completed! 🌟",
                              "🎊 Amazing Achievement Unlocked! 🏆",
                              "🌟 BOOM! Outstanding Performance! 💪",
                              "🎯 Mission Accomplished in Style! 🚀",
                              "🏆 Excellent Work! Time to Celebrate! 💃"
                            ];
                            const randomMessage = celebrationMessages[Math.floor(Math.random() * celebrationMessages.length)];
                            
                            const employeeData = employees.find(emp => emp.email === task.poc);
                            const creatorData = employees.find(emp => emp.email === task.creator);
                            
                            // Calculate time statistics
                            const startDate = new Date(task.dateCreated);
                            const endDate = new Date();
                            const timeToComplete = endDate.getTime() - startDate.getTime();
                            const daysToComplete = Math.floor(timeToComplete / (1000 * 60 * 60 * 24));
                            const hoursToComplete = Math.floor((timeToComplete % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                            
                            // Calculate if completed before or after deadline
                            const deadlineDate = new Date(task.deadline);
                            const deadlineDiff = endDate.getTime() - deadlineDate.getTime();
                            const daysFromDeadline = Math.floor(deadlineDiff / (1000 * 60 * 60 * 24));
                            
                            // Calculate completion percentage of subtasks
                            const totalSubtasks = task.tasks.split('\n').length;
                            const completedSubtasks = Object.values(task.taskStatus || {}).filter(status => status).length;
                            const completionPercentage = Math.round((completedSubtasks / totalSubtasks) * 100);

                            const message = `${randomMessage}

🎯 Task Completed: ${task.title}
👤 Completed by: ${employeeData?.name || task.poc}
🏢 Client: ${task.clientName}
⏱️ Time to Complete: ${daysToComplete}d ${hoursToComplete}h
⚡ Estimated Hours: ${task.estimatedHours}h
${daysFromDeadline > 0 
  ? `⚠️ Completed ${daysFromDeadline} days after deadline`
  : `✅ Completed ${Math.abs(daysFromDeadline)} days before deadline`}
📊 Subtasks Completed: ${completedSubtasks}/${totalSubtasks} (${completionPercentage}%)
🎯 Priority Level: ${task.priority.toUpperCase()}
👥 Assigned by: ${creatorData?.name || task.creator}

Great work team! 🌟`;
                            
                           // await sendTaskNotification(task.poc, { ...task, title: message }, false);
                          }
                        } catch (error) {
                          console.error('Error updating task status:', error);
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-white text-sm font-medium ${getStatusColor(task.status)}`}
                    >
                      <option value="open">Open</option>
                      <option value="in-progress">In Progress</option>
                      <option value="doing-now">Doing Now</option>
                      <option value="completed">Completed</option>
                      <option value="blocked">Blocked</option>
                      <option value="client">Client</option>
                      <option value="kiv">KIV</option>
                    </select>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-base">
                    <span className={`px-3 py-1 rounded-full text-white text-sm font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-base text-gray-900 dark:text-gray-300">{task.estimatedHours}</td>
                  <td className="px-4 py-4">
                    <div className="max-h-20 overflow-y-auto">
                      {task.comments?.map((comment, index) => (
                        <div key={index} className="text-sm text-gray-500 mb-1">
                          <div className="font-medium text-gray-900 dark:text-gray-300">{comment.text}</div>
                          <div className="text-xs">
                            {comment.author} - {new Date(comment.timestamp).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {task.images && task.images.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {task.images.map((url, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <img
                              src={url}
                              alt={`Task image ${index + 1}`}
                              className="w-10 h-10 object-cover rounded"
                            />
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:text-blue-700 text-sm truncate max-w-[150px]"
                            >
                              View Image {index + 1}
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">No images</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-base text-sm text-gray-900 dark:text-gray-300">
                    {format(new Date(task.dateCreated), 'dd/MM/yyyy HH:mm')}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setCurrentTask(task);
                          setIsTaskFormOpen(true);
                        }}
                        className="inline-flex items-center px-3 py-1 text-sm font-medium text-white bg-primary rounded-md hover:bg-blue-700 transition-colors"
                      >
                        <Lucide icon="Pencil" className="w-4 h-4 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => sendTaskNotification(task.poc, task, false)}
                        className="inline-flex items-center px-3 py-1 text-sm font-medium text-white bg-yellow-500 rounded-md hover:bg-yellow-600 transition-colors"
                      >
                        <Lucide icon="Bell" className="w-4 h-4 mr-1" />
                        Remind
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task)}
                        className="inline-flex items-center px-3 py-1 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors"
                      >
                        <Lucide icon="Trash" className="w-4 h-4 mr-1" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <TaskFormModal
        isOpen={isTaskFormOpen}
        onClose={() => setIsTaskFormOpen(false)}
        task={currentTask}
        employees={employees}
        clients={clients}
        onSubmit={async (taskData) => {
          try {
            const user = auth.currentUser;
            if (!user?.email) return;

            // If editing an existing task, use the original creator's email
            const taskCreatorEmail = currentTask ? currentTask.creator : user.email;
            const tasksRef = collection(firestore, `user/${taskCreatorEmail}/tasks`);
            
            if (currentTask) {
              // When updating, exclude creator from taskData and use the original creator
              const { creator, ...updateData } = taskData;
              await updateDoc(doc(tasksRef, currentTask.id), {
                ...updateData,
                creator: currentTask.creator // Keep the original creator
              });
              
              // Send notification for task update
              await sendTaskNotification(taskData.poc, currentTask, false);
            } else {
              // Create new task under current user
              const newTaskRef = await addDoc(tasksRef, {
                ...taskData,
                creator: user.email,
                dateCreated: new Date().toISOString()
              });
              
              // Send notification for new task
              await sendTaskNotification(taskData.poc, { ...taskData, id: newTaskRef.id }, true);
            }

            fetchTasks();
            setIsTaskFormOpen(false);
          } catch (error) {
            console.error('Error saving task:', error);
          }
        }}
      />

      <ClientFormModal
        isOpen={isClientFormOpen}
        onClose={() => {
          setIsClientFormOpen(false);
          setEditingClient(null);
        }}
        clients={clients}
        editingClient={editingClient}
        onEdit={setEditingClient}
        onSubmit={async (clientName) => {
          try {
            const user = auth.currentUser;
            if (!user?.email) return;

            // Get company ID
            const docUserRef = doc(firestore, 'user', user.email);
            const docUserSnapshot = await getDoc(docUserRef);
            if (!docUserSnapshot.exists()) return;
            
            const userData = docUserSnapshot.data();
            const companyId = userData.companyId;

            // Add/update client at company level
            const clientsRef = collection(firestore, `companies/${companyId}/clients`);
            
            if (editingClient) {
              await updateDoc(doc(clientsRef, editingClient.id), { name: clientName });
            } else {
              await addDoc(clientsRef, { name: clientName });
            }

            fetchClients();
            setEditingClient(null);
          } catch (error) {
            console.error('Error saving client:', error);
          }
        }}
        onDelete={async (clientId) => {
          try {
            const user = auth.currentUser;
            if (!user?.email) return;

            // Get company ID
            const docUserRef = doc(firestore, 'user', user.email);
            const docUserSnapshot = await getDoc(docUserRef);
            if (!docUserSnapshot.exists()) return;
            
            const userData = docUserSnapshot.data();
            const companyId = userData.companyId;

            // Delete client at company level
            await deleteDoc(doc(firestore, `companies/${companyId}/clients`, clientId));
            fetchClients();
          } catch (error) {
            console.error('Error deleting client:', error);
          }
        }}
      />
    </div>
  );
};

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onSubmit: (taskData: Omit<Task, 'id'>) => void;
  employees: Employee[];
  clients: Client[];
}

const TaskFormModal = ({ isOpen, onClose, task, onSubmit, employees, clients }: TaskFormModalProps) => {
  const [taskForms, setTaskForms] = useState<Omit<Task, 'id'>[]>([{
    title: '',
    deadline: new Date().toISOString().split('T')[0],
    poc: '',
    creator: auth.currentUser?.email || '',
    clientName: '',
    tasks: '',
    taskStatus: {},
    status: 'open',
    dateCreated: new Date().toISOString(),
    priority: 'medium',
    estimatedHours: 0,
    comments: []
  }]);

  const [newComment, setNewComment] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (task) {
      setTaskForms([{
        title: task.title,
        deadline: task.deadline,
        poc: task.poc,
        creator: task.creator,
        clientName: task.clientName,
        tasks: task.tasks,
        taskStatus: task.taskStatus || {},
        status: task.status,
        dateCreated: task.dateCreated,
        priority: task.priority || 'medium',
        estimatedHours: task.estimatedHours || 0,
        comments: task.comments || []
      }]);
    } else {
      setTaskForms([{
        title: '',
        deadline: new Date().toISOString().split('T')[0],
        poc: '',
        creator: auth.currentUser?.email || '',
        clientName: '',
        tasks: '',
        taskStatus: {},
        status: 'open',
        dateCreated: new Date().toISOString(),
        priority: 'medium',
        estimatedHours: 0,
        comments: []
      }]);
    }
  }, [task]);

  const addTaskForm = () => {
    setTaskForms([...taskForms, {
      ...taskForms[0],
      title: '',
      tasks: '',
      comments: []
    }]);
  };

  const removeTaskForm = (index: number) => {
    setTaskForms(taskForms.filter((_, i) => i !== index));
  };

  const updateTaskForm = (index: number, updates: Partial<Omit<Task, 'id'>>) => {
    setTaskForms(taskForms.map((form, i) => 
      i === index ? { ...form, ...updates } : form
    ));
  };

  const parseBulkInput = () => {
    const items = bulkInput
      .split('*')
      .map(item => item.trim())
      .filter(item => item.length > 0);

    if (items.length > 0) {
      const formattedTasks = items
        .map(item => `• ${item}`)
        .join('\n');

      // Initialize taskStatus object with all items set to false
      const taskStatus = items.reduce((acc, item) => {
        acc[`• ${item}`] = false;
        return acc;
      }, {} as { [key: string]: boolean });

      setTaskForms([{
        ...taskForms[0],
        tasks: formattedTasks,
        taskStatus: taskStatus,
        creator: auth.currentUser?.email || ''
      }]);
      
      setBulkInput('');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const files = e.target.files;
    if (!files || !auth.currentUser?.email) return;

    setUploading(true);
    try {
      const storage = getStorage();
      const imageUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileRef = ref(storage, `tasks/${auth.currentUser.email}/${Date.now()}-${file.name}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        imageUrls.push(url);
      }

      updateTaskForm(index, {
        images: [...(taskForms[index].images || []), ...imageUrls]
      });
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Error uploading images. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async (taskIndex: number, imageUrl: string) => {
    try {
      const storage = getStorage();
      const imageRef = ref(storage, imageUrl);
      await deleteObject(imageRef);

      updateTaskForm(taskIndex, {
        images: taskForms[taskIndex].images?.filter(url => url !== imageUrl)
      });
    } catch (error) {
      console.error('Error removing image:', error);
      alert('Error removing image. Please try again.');
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <Dialog.Panel className="w-full max-w-2xl p-6 bg-white rounded-md dark:bg-gray-800 max-h-[90vh] overflow-y-auto">
          <form onSubmit={async (e) => {
            e.preventDefault();
            for (const taskData of taskForms) {
              await onSubmit(taskData);
            }
            onClose();
          }}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold dark:text-white">
                {task ? 'Edit Task' : 'New Tasks'}
              </h2>
              {!task && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={addTaskForm}
                    className="px-3 py-1 text-sm text-white bg-primary rounded hover:bg-blue-700"
                  >
                    Add Another Task
                  </button>
                </div>
              )}
            </div>


            {taskForms.map((taskForm, index) => (
              <div key={index} className="mb-6 p-4 border rounded-lg">
                <div className="flex justify-between items-center mb-4">
                 
                  {!task && taskForms.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTaskForm(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Lucide icon="X" className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                      value={taskForm.title}
                      onChange={(e) => updateTaskForm(index, { title: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Deadline</label>
                    <input
                      type="date"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                      value={taskForm.deadline.split('T')[0]}
                      onChange={(e) => updateTaskForm(index, { deadline: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Assign To</label>
                    <select
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                      value={taskForm.poc}
                      onChange={(e) => updateTaskForm(index, { poc: e.target.value })}
                    >
                      <option value="">Select an employee</option>
                      {employees.map((employee) => (
                        <option 
                          key={employee.id} 
                          value={employee.email}
                          style={{ backgroundColor: employee.color + '20' }}
                        >
                          {employee.name} ({employee.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Client</label>
                    <select
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                      value={taskForm.clientName}
                      onChange={(e) => updateTaskForm(index, { clientName: e.target.value })}
                    >
                      <option value="">Select a client</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.name}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tasks</label>
                    <textarea
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                      rows={3}
                      value={taskForm.tasks}
                      onChange={(e) => updateTaskForm(index, { tasks: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                    <select
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                      value={taskForm.status}
                      onChange={(e) => updateTaskForm(index, { status: e.target.value as Task['status'] })}
                    >
                      <option value="open">Open</option>
                      <option value="in-progress">In Progress</option>
                      <option value="doing-now">Doing Now</option>
                      <option value="completed">Completed</option>
                      <option value="blocked">Blocked</option>
                      <option value="kiv">KIV</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
                    <select
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                      value={taskForm.priority}
                      onChange={(e) => updateTaskForm(index, { priority: e.target.value as Task['priority'] })}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Estimated Hours</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.5"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                      value={taskForm.estimatedHours}
                      onChange={(e) => updateTaskForm(index, { estimatedHours: parseFloat(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Images
                    </label>
                    <div className="mt-2">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, index)}
                        className="block w-full text-sm text-gray-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-md file:border-0
                          file:text-sm file:font-medium
                          file:bg-primary file:text-white
                          hover:file:bg-blue-700
                          dark:text-gray-400"
                      />
                      {uploading && (
                        <div className="mt-2 text-sm text-gray-500">
                          Uploading images...
                        </div>
                      )}
                      {taskForm.images && taskForm.images.length > 0 && (
                        <div className="mt-4 grid grid-cols-2 gap-4">
                          {taskForm.images.map((url, imgIndex) => (
                            <div key={imgIndex} className="relative group">
                              <img
                                src={url}
                                alt={`Task image ${imgIndex + 1}`}
                                className="w-full h-32 object-cover rounded-lg"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveImage(index, url)}
                                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Lucide icon="X" className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Comments</label>
                    <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                      {taskForm.comments?.map((comment, index) => (
                        <div key={index} className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                          <p className="text-sm">{comment.text}</p>
                          <p className="text-xs text-gray-500">
                            {comment.author} - {new Date(comment.timestamp).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newComment.trim()) {
                            updateTaskForm(index, {
                              comments: [
                                ...(taskForm.comments || []),
                                {
                                  text: newComment.trim(),
                                  author: auth.currentUser?.email || 'Unknown',
                                  timestamp: new Date().toISOString()
                                }
                              ]
                            });
                            setNewComment('');
                          }
                        }}
                        className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-blue-700"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-blue-700"
              >
                {task ? 'Update Task' : 'Create Tasks'}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  editingClient: Client | null;
  onEdit: (client: Client) => void;
  onSubmit: (clientName: string) => void;
  onDelete: (clientId: string) => void;
}

const ClientFormModal = ({ 
  isOpen, 
  onClose, 
  clients, 
  editingClient, 
  onEdit, 
  onSubmit, 
  onDelete 
}: ClientFormModalProps) => {
  const [newClientName, setNewClientName] = useState('');

  useEffect(() => {
    if (editingClient) {
      setNewClientName(editingClient.name);
    } else {
      setNewClientName('');
    }
  }, [editingClient]);

  const handleSubmit = async () => {
    try {
      const user = auth.currentUser;
      if (!user?.email || !newClientName.trim()) return;

      // Get company ID
      const docUserRef = doc(firestore, 'user', user.email);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) return;
      
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;

      // Add client to user's clients collection
      const clientsRef = collection(firestore, `user/${user.email}/clients`);
      await addDoc(clientsRef, { name: newClientName.trim() });

      onSubmit(newClientName.trim());
      setNewClientName('');
    } catch (error) {
      console.error('Error adding client:', error);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <Dialog.Panel className="w-full max-w-md p-6 bg-white rounded-md dark:bg-gray-800">
          <h2 className="text-xl font-bold mb-4 dark:text-white">
            Manage Clients
          </h2>

          <div className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Client name"
                className="flex-1 px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
              />
              <button
                onClick={handleSubmit}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-blue-700"
              >
                {editingClient ? 'Update' : 'Add'} Client
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {clients.map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded dark:bg-gray-700"
              >
                <span className="dark:text-white">{client.name}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(client)}
                    className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400"
                  >
                    <Lucide icon="Pencil" className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(client.id)}
                    className="p-1 text-red-600 hover:text-red-800 dark:text-red-400"
                  >
                    <Lucide icon="Trash" className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
            >
              Close
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default Ticket;

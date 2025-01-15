import { useState, useEffect } from 'react';
import { Dialog } from '@/components/Base/Headless';
import { collection, query, getDocs, doc, updateDoc, deleteDoc, where, addDoc, setDoc, getFirestore, getDoc, Timestamp } from 'firebase/firestore';

import { format, parseISO, parse, addHours, format as formatDate } from 'date-fns';
import Lucide from "@/components/Base/Lucide";
import Select from 'react-select';
import { toast } from 'react-toastify';
import { getAuth } from 'firebase/auth';
import { initializeApp } from "firebase/app";
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface AppointmentRequest {
  id: string;
  customerName: string;
  customerPhone: string;
  requestedDate: string;
  notes: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: any;
}

interface Employee {
  id: string;
  name: string;
  color: string;
  backgroundStyle?: string;
}

interface Package {
  id: string;
  name: string;
  sessions: number;
}

interface AppointmentReminders {
  enabled: boolean;
  options: {
    type: string;
    enabled: boolean;
    message: string;
  }[];
  sentReminders?: Record<string, any>;
}

interface Appointment {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  address: string;
  appointmentStatus: string;
  staff: string[];
  tags: any[];
  color: string;
  packageId: string | null;
  dateAdded: string;
  contacts: { id: string; name: string; phone: string; email?: string; session?: number }[];
  meetLink?: string;
  notificationSent?: boolean;
  minyak?: number;
  toll?: number;
  details?: string;
  reminders: AppointmentReminders;
}
// Use the same Firebase config
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

function AppointmentRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<AppointmentRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<AppointmentRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [appointmentTime, setAppointmentTime] = useState<string>('');
  const [appointmentDuration, setAppointmentDuration] = useState<string>('60'); // in minutes
  const [appointmentDate, setAppointmentDate] = useState<string>('');
  const [currentEvent, setCurrentEvent] = useState<any>(null);

  // Fetch appointment requests
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const requestsRef = collection(firestore, 'companies/0153/dateRequests');
        const q = query(requestsRef);
        const querySnapshot = await getDocs(q);
        
        const requestsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as AppointmentRequest[];

        // Sort by creation date, newest first
        requestsData.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
        
        setRequests(requestsData);
      } catch (error) {
        console.error('Error fetching requests:', error);
      }
    };

    fetchRequests();
  }, []);

  // Fetch employees and packages
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch employees
        const employeesRef = collection(firestore, 'companies/0153/employees');
        const employeesSnapshot = await getDocs(employeesRef);
        const employeesData = employeesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Employee[];
        setEmployees(employeesData);

        // Fetch packages
        const packagesRef = collection(firestore, 'companies/0153/packages');
        const packagesSnapshot = await getDocs(packagesRef);
        const packagesData = packagesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Package[];
        setPackages(packagesData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  // Filter requests based on status and date
  const filteredRequests = requests.filter(request => {
    const matchesStatus = !filterStatus || request.status === filterStatus;
    const matchesDate = !filterDate || request.requestedDate === filterDate;
    return matchesStatus && matchesDate;
  });

  const sendAppointmentMessage = async (phoneNumber: string, appointmentTime: Date, messageType: 'confirmation' | 'reminder' | 'feedback' | 'staffReminder') => {
    try {
      const user = auth.currentUser;
      if (!user?.email) return;

      // Get company data for API configuration
      const docUserRef = doc(firestore, 'user', user.email);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) return;

      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;

      const companyRef = doc(firestore, 'companies', companyId);
      const companySnapshot = await getDoc(companyRef);
      if (!companySnapshot.exists()) return;

      const companyData = companySnapshot.data();
      const baseUrl = companyData.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';
      const isV2 = companyData.v2 || false;
      const whapiToken = companyData.whapiToken || '';

      // Format phone number for WhatsApp
      const formattedPhone = phoneNumber.replace(/\D/g, '') + "@c.us";

      // Format appointment time
      const formattedTime = appointmentTime.toLocaleString('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

      // Checklist image URLs
      const checklistImages = [
        'https://firebasestorage.googleapis.com/v0/b/onboarding-a5fcb.appspot.com/o/checklist1.jpg',
        'https://firebasestorage.googleapis.com/v0/b/onboarding-a5fcb.appspot.com/o/checklist2.jpg',
        'https://firebasestorage.googleapis.com/v0/b/onboarding-a5fcb.appspot.com/o/checklist3.jpg',
        'https://firebasestorage.googleapis.com/v0/b/onboarding-a5fcb.appspot.com/o/checklist4.jpg',
        'https://firebasestorage.googleapis.com/v0/b/onboarding-a5fcb.appspot.com/o/checklist5.jpg'
      ];

      let messageText = '';
      if (messageType === 'confirmation') {
        messageText = `Terima kasih kerana memilih BAROKAH AIRCOND! Temujanji anda telah disahkan pada ${formattedTime}. Kami akan memberikan perkhidmatan yang terbaik untuk anda! 😊`;
      } else if (messageType === 'reminder') {
        messageText = `Peringatan: Temujanji anda dengan BAROKAH AIRCOND akan bermula dalam masa 1 jam pada ${formattedTime}. Kami akan memberikan perkhidmatan yang terbaik untuk anda! 😊`;
      } else if (messageType === 'staffReminder') {
        messageText = `⚠️ PERINGATAN UNTUK STAFF ⚠️\n\n` +
          `Temujanji dalam 30 minit pada ${formattedTime}\n\n` +
          `📱 TINDAKAN SEGERA:\n` +
          `1. Sila hubungi pelanggan untuk mengesahkan temujanji\n` +
          `2. Hantar gambar sebelum servis\n` +
          `3. Hantar gambar semasa servis\n` +
          `4. Hantar gambar selepas servis\n` +
          `5. Hantar gambar invoice/resit\n` +
          `6. Hantar gambar bersama pelanggan (jika diizinkan)\n\n` +
          `👤 Maklumat Pelanggan:\n` +
          `Nama: ${selectedRequest?.customerName}\n` +
          `Tel: ${phoneNumber}`;
      } else {
        messageText = `TERIMA KASIH di atas kepecayaan cik menggunakan perkidmatan BAROKAH AIRCOND\n\nBagi tujuan menambahbaik 😊 perkidmatan yang baik kami berbesar hati ingin bertanya adakah anda perpuas hati dengan prrkhidmatan dari Barokah Aircond?`;
      }

      if (messageType === 'staffReminder') {
        // Get staff phone numbers from selected employees
        const staffPhones = await Promise.all(selectedEmployeeIds.map(async (employeeId) => {
          const employeeDoc = await getDoc(doc(firestore, `companies/0153/employee/${employeeId}`));
          const employeeData = employeeDoc.data();
          return employeeData?.phoneNumber?.replace(/\+/, '') + "@c.us"; // Using phoneNumber field instead of phone
        }));
        
        // Filter out any undefined phone numbers
        const validStaffPhones = staffPhones.filter(phone => phone);

        // Schedule staff reminder for each staff member
        for (const staffPhone of validStaffPhones) {
          const messageTime = new Date(appointmentTime.getTime() - 30 * 60 * 1000); // 30 minutes before
          
          const scheduledMessageData = {
            chatIds: [staffPhone],
            phoneIndex: 0,
            message: messageText,
            companyId,
            v2: isV2,
            whapiToken: isV2 ? null : whapiToken,
            scheduledTime: {
              seconds: Math.floor(messageTime.getTime() / 1000),
              nanoseconds: 0
            },
            status: "scheduled",
            createdAt: {
              seconds: Math.floor(Date.now() / 1000),
              nanoseconds: 0
            },
            batchQuantity: 1,
            messages: [],
            messageDelays: [],
            repeatInterval: null,
            repeatUnit: null,
            minDelay: 0,
            maxDelay: 0,
            activateSleep: false,
            sleepAfterMessages: null,
            sleepDuration: null,
            activeHours: {
              start: null,
              end: null
            },
            infiniteLoop: false,
            numberOfBatches: 1
          };

          await axios.post(`${baseUrl}/api/schedule-message/${companyId}`, scheduledMessageData);
        }
      } else if (messageType === 'confirmation') {
        // Schedule confirmation message 5 minutes after saving
        const messageTime = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
        
        const scheduledMessageData = {
          chatIds: [phoneNumber.replace(/\D/g, '') + "@c.us"],
          phoneIndex: 0,
          message: messageText,
          companyId,
          v2: isV2,
          whapiToken: isV2 ? null : whapiToken,
          scheduledTime: {
            seconds: Math.floor(messageTime.getTime() / 1000),
            nanoseconds: 0
          },
          status: "scheduled",
          createdAt: {
            seconds: Math.floor(Date.now() / 1000),
            nanoseconds: 0
          },
          batchQuantity: 1,
          messages: [],
          messageDelays: [],
          repeatInterval: null,
          repeatUnit: null,
          minDelay: 0,
          maxDelay: 0,
          activateSleep: false,
          sleepAfterMessages: null,
          sleepDuration: null,
          activeHours: {
            start: null,
            end: null
          },
          infiniteLoop: false,
          numberOfBatches: 1
        };

        await axios.post(`${baseUrl}/api/schedule-message/${companyId}`, scheduledMessageData);
      } else {
        // Schedule reminder or feedback message
        const messageTime = messageType === 'reminder' 
          ? new Date(appointmentTime.getTime() - 60 * 60 * 1000) // 1 hour before
          : new Date(appointmentTime.getTime() + 3 * 60 * 60 * 1000); // 3 hours after
        
        const scheduledMessageData = {
          chatIds: [formattedPhone],
          phoneIndex: 0,
          message: messageText,
          companyId,
          v2: isV2,
          whapiToken: isV2 ? null : whapiToken,
          scheduledTime: {
            seconds: Math.floor(messageTime.getTime() / 1000),
            nanoseconds: 0
          },
          status: "scheduled",
          createdAt: {
            seconds: Math.floor(Date.now() / 1000),
            nanoseconds: 0
          },
          batchQuantity: 1,
          messages: [],
          messageDelays: [],
          repeatInterval: null,
          repeatUnit: null,
          minDelay: 0,
          maxDelay: 0,
          activateSleep: false,
          sleepAfterMessages: null,
          sleepDuration: null,
          activeHours: {
            start: null,
            end: null
          },
          infiniteLoop: false,
          numberOfBatches: 1
        };

        await axios.post(`${baseUrl}/api/schedule-message/${companyId}`, scheduledMessageData);
      }

      // Success messages
      const successMessages = {
        confirmation: 'Confirmation message scheduled successfully',
        reminder: 'Reminder message scheduled successfully',
        feedback: 'Feedback message scheduled successfully',
        staffReminder: 'Staff reminders scheduled successfully'
      };
      toast.success(successMessages[messageType]);

    } catch (error) {
      console.error(`Error sending ${messageType} message:`, error);
      toast.error(`Failed to send ${messageType} message`);
    }
  };

  // Handle status update
  const handleStatusUpdate = async (requestId: string, newStatus: 'accepted' | 'rejected') => {
    try {
      if (newStatus === 'accepted') {
        if (!currentEvent?.startTimeStr || !currentEvent?.endTimeStr || selectedEmployeeIds.length === 0) {
          toast.error('Please fill in all required fields');
          return;
        }

        const firstEmployeeId = selectedEmployeeIds[0];
        const secondEmployeeId = selectedEmployeeIds[1];
        const firstEmployee = employees.find(emp => emp.id === firstEmployeeId);
        const secondEmployee = employees.find(emp => emp.id === secondEmployeeId);

        let color;
        if (firstEmployee && secondEmployee) {
          color = `linear-gradient(to right, ${firstEmployee.color} 50%, ${secondEmployee.color} 50%)`;
        } else if (firstEmployee) {
          color = firstEmployee.color;
        } else {
          color = '#51484f'; // Default color
        }

        const user = auth.currentUser;
        if (!user?.email) {
          toast.error('No authenticated user found');
          return;
        }

        // Create the start and end dates properly
        const startDate = new Date(`${currentEvent.dateStr}T${currentEvent.startTimeStr}`);
        const endDate = new Date(`${currentEvent.dateStr}T${currentEvent.endTimeStr}`);

        // Validate dates
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          toast.error('Invalid date or time selected');
          return;
        }

        const newEvent = {
          title: currentEvent.title,
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
          address: currentEvent.address || '',
          appointmentStatus: currentEvent.appointmentStatus || 'new',
          staff: selectedEmployeeIds,
          tags: currentEvent.tags || [],
          color: color,
          contacts: [{
            id: requestId,
            name: selectedRequest?.customerName || '',
            phone: selectedRequest?.customerPhone || '',
          }],
          details: currentEvent.details || selectedRequest?.notes || '',
          meetLink: '',
          minyak: 0,
          toll: 0,
          reminders: {
            enabled: true,
            options: [
              { type: '24h', enabled: true, message: "Your appointment is tomorrow" },
              { type: '3h', enabled: true, message: "Your appointment is in 3 hours" },
              { type: '1h', enabled: true, message: "Your appointment is in 1 hour" },
              { type: 'after', enabled: true, message: "Thank you for your time today" }
            ],
            sentReminders: {}
          }
        };

        // Add to user's appointments collection
        const appointmentsRef = collection(firestore, `user/${user.email}/appointments`);
        const newAppointmentRef = doc(appointmentsRef);
        const finalAppointment = {
          ...newEvent,
          id: newAppointmentRef.id
        };

        await setDoc(newAppointmentRef, finalAppointment);

        // Send all messages
        await sendAppointmentMessage(
          selectedRequest?.customerPhone || '',
          startDate,
          'confirmation'
        );

        await sendAppointmentMessage(
          selectedRequest?.customerPhone || '',
          startDate,
          'reminder'
        );

        await sendAppointmentMessage(
          selectedRequest?.customerPhone || '',
          startDate,
          'staffReminder'
        );

        await sendAppointmentMessage(
          selectedRequest?.customerPhone || '',
          startDate,
          'feedback'
        );

        // Update request status
        const requestRef = doc(firestore, 'companies/0153/dateRequests', requestId);
        await updateDoc(requestRef, {
          status: newStatus
        });

        toast.success('Appointment scheduled successfully');
        setIsModalOpen(false);
        
      } else {
        // Handle rejection
        const requestRef = doc(firestore, 'companies/0153/dateRequests', requestId);
        await updateDoc(requestRef, {
          status: newStatus
        });
        
        toast.info('Request rejected');
        setIsModalOpen(false);
      }

      setRequests(prev => prev.map(req => 
        req.id === requestId ? { ...req, status: newStatus } : req
      ));
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Error updating request. Please try again.');
    }
  };

  // Add fetchEmployees function
  const fetchEmployees = async () => {
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;

      if(!user) return;

      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        
        return;
      }

      const dataUser = docUserSnapshot.data();
      const companyId = dataUser.companyId;
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        
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

  // Add useEffect to fetch employees when component mounts
  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleRequestClick = (request: AppointmentRequest) => {
    // Create combined title with customer info
    const combinedTitle = `${request.customerName} (${request.customerPhone}) | ${request.notes || 'New Appointment'}`;
    
    // Set the current event with the combined title
    setCurrentEvent({
      title: combinedTitle,
      dateStr: request.requestedDate,
      startTimeStr: '',
      endTimeStr: '',
      appointmentStatus: 'new',
      address: '',
      details: request.notes || ''
    });
    
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  // Add this helper function near the top of the component
  const formatPhoneForChat = (phone: string) => {
    // Remove any non-digit characters and ensure it starts with the country code
    return phone.replace(/\D/g, '');
  };

  return (
    <div className="p-5">
      {/* Header with back button */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/calendar')}
            className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          >
            <Lucide icon="ArrowLeft" className="w-5 h-5 mr-2" />
            Back to Calendar
          </button>
          <h1 className="text-2xl font-bold dark:text-white">Appointment Requests</h1>
        </div>
        
        {/* Filters */}
        <div className="flex gap-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>

          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>

      {/* Requests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {filteredRequests.map((request) => (
          <div
            key={request.id}
            className="p-4 bg-white rounded-lg shadow cursor-pointer hover:shadow-md dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-semibold text-lg dark:text-white">{request.customerName}</h3>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent opening the modal
                    navigate(`/chat?chatId=${formatPhoneForChat(request.customerPhone)}`);
                  }}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full dark:text-blue-400 dark:hover:bg-gray-700"
                  title="Open chat"
                >
                  <Lucide icon="MessageCircle" className="w-5 h-5" />
                </button>
                <span className={`px-2 py-1 rounded-full text-sm ${
                  request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  request.status === 'accepted' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {request.status}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-sm dark:text-gray-300">
              <p className="flex items-center gap-2">
                <Lucide icon="Calendar" className="w-4 h-4" />
                {format(parseISO(request.requestedDate), 'MMMM d, yyyy')}
              </p>
              
              <p className="flex items-center gap-2">
                <Lucide icon="Phone" className="w-4 h-4" />
                {request.customerPhone}
              </p>

              <p className="flex items-center gap-2">
                <Lucide icon="Clock" className="w-4 h-4" />
                {format(request.createdAt.toDate(), 'MMM d, yyyy h:mm a')}
              </p>

              <p className="flex items-start gap-2">
                <Lucide icon="FileText" className="w-4 h-4 mt-1" />
                <span className="line-clamp-2">{request.notes}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Modified Detail Modal to match Calendar style */}
      {selectedRequest && (
        <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <Dialog.Panel className="w-full max-w-md p-6 bg-white rounded-md mt-10 dark:bg-gray-800">
              <div className="flex items-center p-4 border-b dark:border-gray-700">
                <div className="block w-12 h-12 overflow-hidden rounded-full shadow-lg bg-gray-700 flex items-center justify-center text-white mr-4">
                  <Lucide icon="User" className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xl dark:text-white">Schedule Appointment</span>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                  <input
                    type="text"
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={currentEvent?.title || ''}
                    onChange={(e) => setCurrentEvent({ ...currentEvent, title: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
                  <input
                    type="text"
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={currentEvent?.address || ''}
                    onChange={(e) => setCurrentEvent({ ...currentEvent, address: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
                  <input
                    type="date"
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={currentEvent?.dateStr || selectedRequest?.requestedDate || ''}
                    onChange={(e) => setCurrentEvent({ ...currentEvent, dateStr: e.target.value })}
                  />
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 dark:text-gray-400">Start Time</label>
                    <select
                      className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      value={currentEvent?.startTimeStr || ''}
                      onChange={(e) => {
                        const startTime = e.target.value;
                        setCurrentEvent((prev: any) => ({
                          ...prev,
                          startTimeStr: startTime,
                          endTimeStr: format(addHours(parse(startTime, 'HH:mm', new Date()), 1), 'HH:mm')
                        }));
                      }}
                    >
                      <option value="" disabled>Start Time</option>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0');
                        return (
                          <>
                            <option value={`${hour}:00`}>{format(parse(`${hour}:00`, 'HH:mm', new Date()), 'h:mm a')}</option>
                            <option value={`${hour}:30`}>{format(parse(`${hour}:30`, 'HH:mm', new Date()), 'h:mm a')}</option>
                          </>
                        );
                      })}
                    </select>
                  </div>

                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 dark:text-gray-400">End Time</label>
                    <select
                      className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      value={currentEvent?.endTimeStr || ''}
                      onChange={(e) => {
                        setCurrentEvent((prev: any) => ({
                          ...prev,
                          endTimeStr: e.target.value
                        }));
                      }}
                    >
                      <option value="" disabled>End Time</option>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0');
                        return (
                          <>
                            <option 
                              value={`${hour}:00`}
                              disabled={currentEvent?.startTimeStr && `${hour}:00` <= currentEvent.startTimeStr}
                            >
                              {format(parse(`${hour}:00`, 'HH:mm', new Date()), 'h:mm a')}
                            </option>
                            <option 
                              value={`${hour}:30`}
                              disabled={currentEvent?.startTimeStr && `${hour}:30` <= currentEvent.startTimeStr}
                            >
                              {format(parse(`${hour}:30`, 'HH:mm', new Date()), 'h:mm a')}
                            </option>
                          </>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Staff</label>
                  <div className="block w-full mt-1 border border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-2 dark:bg-gray-700 dark:border-gray-600">
                    {employees.map((employee) => (
                      <div key={employee.id} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`employee-${employee.id}`}
                          checked={selectedEmployeeIds.includes(employee.id)}
                          onChange={() => {
                            setSelectedEmployeeIds(prev => 
                              prev.includes(employee.id)
                                ? prev.filter(id => id !== employee.id)
                                : [...prev, employee.id]
                            );
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500"
                        />
                        <label htmlFor={`employee-${employee.id}`} className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          {employee.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Appointment Status</label>
                  <select
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={currentEvent?.appointmentStatus || 'new'}
                    onChange={(e) => setCurrentEvent({ ...currentEvent, appointmentStatus: e.target.value })}
                  >
                    <option value="new">New</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="showed">Showed</option>
                    <option value="noshow">No Show</option>
                    <option value="rescheduled">Rescheduled</option>
                    <option value="lost">Lost</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Additional Details
                  </label>
                  <textarea
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={currentEvent?.details || selectedRequest?.notes || ''}
                    onChange={(e) => setCurrentEvent({ ...currentEvent, details: e.target.value })}
                    rows={4}
                    placeholder="Add any additional details about the appointment..."
                  />
                </div>

                <div className="flex justify-end mt-6 space-x-2">
                  <button
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                    onClick={() => handleStatusUpdate(selectedRequest.id, 'rejected')}
                  >
                    Reject
                  </button>
                  <button
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
                    onClick={() => handleStatusUpdate(selectedRequest.id, 'accepted')}
                  >
                    Accept & Schedule
                  </button>
                </div>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}
    </div>
  );
}

export default AppointmentRequests; 
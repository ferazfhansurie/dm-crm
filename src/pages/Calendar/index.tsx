import Lucide from "@/components/Base/Lucide";
import { Menu, Dialog } from "@/components/Base/Headless";
import Button from "@/components/Base/Button";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { ChangeEvent, JSXElementConstructor, Key, ReactElement, ReactNode, useEffect, useState, useRef } from "react";
import axios from "axios";
import { getAuth } from 'firebase/auth';
import { initializeApp } from "firebase/app";
import { format } from 'date-fns';
import { getDoc, getFirestore, doc, setDoc, collection, addDoc, getDocs, updateDoc, deleteDoc, QueryDocumentSnapshot, DocumentData, query, where } from 'firebase/firestore';
import { useContacts } from "@/contact";
import Select from 'react-select';
import { error } from "console";
import { title } from "process";
import CreatableSelect from 'react-select/creatable';

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

interface Appointment {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  address: string;
  appointmentStatus: string;
  staff: string[];
  tags: Tag[];
  color: string;
  packageId: string | null;
  dateAdded: string;
  contacts: { id: string, name: string, session: number }[];
  meetLink?: string;
  notificationSent?: boolean;
}
interface CalendarConfig {
  calendarId: string;
  startHour: number;
  endHour: number;
  slotDuration: number;
  daysAhead: number;
}
interface Employee {
  id: string;
  name: string;
  color: string;
  backgroundStyle: string;
}

interface Contact {
  additionalEmails: string[];
  address1: string | null;
  assignedTo: string | null;
  businessId: string | null;
  city: string | null;
  companyName: string | null;
  contactName: string;
  country: string;
  customFields: any[];
  dateAdded: string;
  dateOfBirth: string | null;
  dateUpdated: string;
  dnd: boolean;
  dndSettings: any;
  email: string | null;
  firstName: string;
  followers: string[];
  id: string;
  lastName: string;
  locationId: string;
  phone: string | null;
  postalCode: string | null;
  source: string | null;
  state: string | null;
  tags: string[];
  type: string;
  website: string | null;
}

interface ContactWithSession extends Contact {
  session: number;
}

type BackgroundStyle = {
  backgroundColor?: string;
  background?: string;
};

interface Package {
  id: string;
  name: string;
  sessions: number;
}

interface Tag {
  id: string;
  name: string;
}

function Main() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [accessToken, setAccessToken] = useState<string>('');
  const [locationId, setLocationId] = useState<string>('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const [view, setView] = useState<string>('dayGridMonth');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const { contacts: initialContacts } = useContacts();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [contactSessions, setContactSessions] = useState<{ [key: string]: number }>({});
  const [initialAppointmentStatus, setInitialAppointmentStatus] = useState<string | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [newPackageName, setNewPackageName] = useState("");
  const [newPackageSessions, setNewPackageSessions] = useState(0);
  const [isAddingPackage, setIsAddingPackage] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const calendarRef = useRef(null);
  const [appointmentTags, setAppointmentTags] = useState<Tag[]>([]);
  const [companyId, setCompanyId] = useState<string>('');
  const [config, setConfig] = useState<CalendarConfig>({
    calendarId: '',
    startHour: 11,
    endHour: 21,
    slotDuration: 30,
    daysAhead: 3
  });
  const [isCalendarConfigOpen, setIsCalendarConfigOpen] = useState(false);
  useEffect(() => {
    const fetchCompanyId = async () => {
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (user) {
        const docUserRef = doc(firestore, 'user', user.email!);
        const docUserSnapshot = await getDoc(docUserRef);
        if (docUserSnapshot.exists()) {
          const dataUser = docUserSnapshot.data();
          setCompanyId(dataUser.companyId);
        }
      }
    };
  
    fetchCompanyId();
    fetchTags();
  }, []);
  
  const fetchTags = async () => {
    console.log('Fetching tags for company:', companyId);
    if (companyId) {
      const tagsCollectionRef = collection(firestore, `companies/${companyId}/tags`);
      const querySnapshot = await getDocs(tagsCollectionRef);
      const tags = querySnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
      console.log('Fetched tags:', tags);
      setAppointmentTags(tags);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);

  }, []);

  

// ... existing code ...

const generateTimeSlots = (isWeekend: boolean): string[] => {
  const start = isWeekend ? 8 : 8; // Start time (8 AM)
  const end = isWeekend ? 20 : 20;  // End time (8 PM)
  const slots: string[] = [];

  for (let hour = start; hour < end; hour++) {
    // Add the full hour slot
    slots.push(`${hour.toString().padStart(2, '0')}:00 - ${hour.toString().padStart(2, '0')}:30`);
    // Add the half hour slot
    slots.push(`${hour.toString().padStart(2, '0')}:30 - ${(hour + 1).toString().padStart(2, '0')}:00`);
  }

  return slots;
};

// ... rest of the code ...
  // Utility function to blend two colors
  const blendColors = (color1: string, color2: string): string => {
    const hex = (color: string) => {
      return color.replace("#", "");
    };

    const r1 = parseInt(hex(color1).substring(0, 2), 16);
    const g1 = parseInt(hex(color1).substring(2, 4), 16);
    const b1 = parseInt(hex(color1).substring(4, 6), 16);

    const r2 = parseInt(hex(color2).substring(0, 2), 16);
    const g2 = parseInt(hex(color2).substring(2, 4), 16);
    const b2 = parseInt(hex(color2).substring(4, 6), 16);

    const r = Math.round((r1 + r2) / 2).toString(16).padStart(2, "0");
    const g = Math.round((g1 + g2) / 2).toString(16).padStart(2, "0");
    const b = Math.round((b1 + b2) / 2).toString(16).padStart(2, "0");

    return `#${r}${g}${b}`;
  };


  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateStr = e.target.value;
    const date = new Date(dateStr);
    const dayOfWeek = date.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday (0) or Saturday (6)
    setCurrentEvent({ ...currentEvent, dateStr, isWeekend, timeSlots: generateTimeSlots(isWeekend) });
  };
  
  const handleTimeSlotChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [startTimeStr, endTimeStr] = e.target.value.split(' - ');
    setCurrentEvent({ ...currentEvent, startTimeStr, endTimeStr });
  };

  let role = 1;
  let userName = '';

  useEffect(() => {
    fetchEmployees();
  }, []);



  const fetchEmployees = async () => {
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;

      if(!user) return;

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
      const backgroundStyles = ["linear-gradient(to right, #1F3A8A 0%, #1F3A8A 50%, #2196F3 50%, #2196F3 100%)",
        "linear-gradient(to right, #8A2BE2 0%, #8A2BE2 50%, #9C27B0 50%, #9C27B0 100%)",
        "linear-gradient(to right, #00BCD4 0%, #00BCD4 50%, #795548 50%, #795548 100%)",
        "linear-gradient(to right, #607D8B 0%, #607D8B 50%, #E91E63 50%, #E91E63 100%)"];
      let colorIndex = 0;
  
      employeeSnapshot.forEach((doc) => {
        employeeListData.push({ id: doc.id, ...doc.data(), color: colors[colorIndex % colors.length], backgroundStyle: backgroundStyles[colorIndex % backgroundStyles.length] } as Employee);
        colorIndex++;
      });

      setEmployees(employeeListData);
      fetchAppointments(user?.email!);
    } catch (error) {
      console.error('Error fetching employees:', error);
      throw error;
    }
  };

  const fetchAppointments = async (selectedUserId: string) => {
    setLoading(true);
    console.log('fetcing appointments');
    console.log(selectedUserId);
    try {
      const userRef = doc(firestore, 'user', selectedUserId);
      const userSnapshot = await getDoc(userRef);
      
      if (!userSnapshot.exists()) {
        console.error('User document not found');
        return;
      }
  
      const userData = userSnapshot.data();
      const companyId = userData.companyId;
      let appointmentsQuery;
      if (selectedEmployeeId) {
        // If an employee is selected, fetch only their appointments
        console.log('Fetching appointments for employee:', selectedEmployeeId);
        appointmentsQuery = query(
          collection(firestore, `user/${selectedUserId}/appointments`)
        );
      } else {
        // If no employee is selected, fetch all appointments
        console.log('Fetching all appointments');
        appointmentsQuery = collection(firestore, `user/${selectedUserId}/appointments`);
      }
      
      const querySnapshot = await getDocs(appointmentsQuery);
      console.log('Number of appointments found:', querySnapshot.size);
      console.log('Query path:', appointmentsQuery);
      const allAppointments = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Appointment data:', {
          id: doc.id,
          title: data.title,
          staff: data.staff,
          startTime: data.startTime,
          endTime: data.endTime
        });
        return {
          id: doc.id,
          ...data,
        } as Appointment;
      });
  
      // Fetch package details for each appointment
      const appointmentsWithPackages = await Promise.all(allAppointments.map(async (appointment: Appointment) => {
        if (appointment.packageId) {
          const packageRef = doc(firestore, `companies/${companyId}/packages`, appointment.packageId);
          const packageSnapshot = await getDoc(packageRef);
          if (packageSnapshot.exists()) {
            const packageData = packageSnapshot.data();
            return {
              ...appointment,
              package: {
                id: packageSnapshot.id,
                name: packageData.name,
                sessions: packageData.sessions
              }
            };
          }
        }
        return appointment;
      }));
  
      setAppointments(appointmentsWithPackages.sort((a, b) => 
        new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
      ));
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };
  const handleEmployeeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const employeeId = event.target.value;
    setSelectedEmployeeId(employeeId);
    console.log(employeeId);
    fetchAppointments(employeeId);
  };

  const fetchContactSession = async (contactId: string) => {
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;

      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
      }

      const dataUser = docUserSnapshot.data();
      const companyId = dataUser.companyId;

      const sessionsCollectionRef = collection(firestore, `companies/${companyId}/session`);
      const q = query(sessionsCollectionRef, where('id', '==', contactId));
      const querySnapshot = await getDocs(q);

      let sessionNumber = 0;
      querySnapshot.forEach((doc) => {
        sessionNumber = doc.data().session;
      });

      setContactSessions((prevSessions) => ({
        ...prevSessions,
        [contactId]: sessionNumber,
      }));
    } catch (error) {
      console.error('Error fetching contact session:', error);
    }
  };

  const handleContactChange = (selectedOptions: any) => {
    const selectedContactsArray = selectedOptions.map((option: any) => contacts.find(contact => contact.id === option.value)!);
    setSelectedContacts(selectedContactsArray);

    selectedContactsArray.forEach((contact: { id: string; }) => fetchContactSession(contact.id));
  };

  const handleEventClick = async (info: any) => {
    const appointment = appointments.find(app => app.id === info.event.id);
  
    if (!appointment) {
      console.error('Appointment not found!');
      return;
    }
  
    const startStr = format(new Date(appointment.startTime), 'HH:mm');
    const endStr = format(new Date(appointment.endTime), 'HH:mm');
    const dateStr = format(new Date(appointment.startTime), 'yyyy-MM-dd');
    const date = new Date(dateStr);
    const dayOfWeek = date.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const eventContacts = appointment.contacts || [];
  
    console.log('Event info:', info);
    console.log('Event contacts:', eventContacts);
  
    // Fetch the contact sessions if not already fetched
    const fetchContactSessions = async () => {
      const newContactSessions: { [key: string]: number } = {};
      await Promise.all(eventContacts.map(async (contact: { id: string }) => {
        const auth = getAuth(app);
        const user = auth.currentUser;
        if (!user || !user.email) {
          console.error('No authenticated user or email found');
          return;
        }
  
        const docUserRef = doc(firestore, 'user', user.email);
        const docUserSnapshot = await getDoc(docUserRef);
        if (!docUserSnapshot.exists()) {
          console.error('No such document for user!');
          return;
        }
  
        const dataUser = docUserSnapshot.data();
        const companyId = dataUser.companyId as string;
        const contactRef = doc(firestore, `companies/${companyId}/session`, contact.id);
        const contactSnapshot = await getDoc(contactRef);
  
        if (contactSnapshot.exists()) {
          const contactData = contactSnapshot.data();
          newContactSessions[contact.id] = contactData.session;
          console.log(`Fetched session for contact ${contact.id}: ${contactData.session}`);
        }
      }));
  
      setContactSessions((prevSessions) => {
        const updatedSessions = { ...prevSessions, ...newContactSessions };
        console.log('Updated contact sessions:', updatedSessions);
        return updatedSessions;
      });
    };
  
    // Fetch contact sessions and wait for completion
    await fetchContactSessions();
  
    // Map event contacts to ContactWithSession objects
    const fullContacts: ContactWithSession[] = eventContacts.map((contact: { id: string }) => {
      const foundContact = contacts.find(c => c.id === contact.id);
      if (foundContact) {
        console.log(`Mapping contact ${contact.id} with session ${contactSessions[contact.id] || 0}`);
        return {
          ...foundContact,
          session: contactSessions[contact.id] || 0
        };
      }
      return null;
    }).filter((contact): contact is ContactWithSession => contact !== null);
  
    console.log('Full contacts after mapping:', fullContacts);
  
    setSelectedContacts(fullContacts);
    console.log('Selected contacts:', fullContacts);
  
    setCurrentEvent({
      id: appointment.id,
      title: appointment.title,
      dateStr: dateStr,
      startTimeStr: startStr,
      endTimeStr: endStr,
      extendedProps: {
        address: appointment.address,
        appointmentStatus: appointment.appointmentStatus,
        staff: appointment.staff,
        package: packages.find(p => p.id === appointment.packageId) || null,
        dateAdded: appointment.dateAdded,
        contacts: eventContacts, // Include contacts in currentEvent
        tags: appointment.tags || []
      },
      isWeekend: isWeekend,
      timeSlots: generateTimeSlots(isWeekend)
    });
    console.log('Current event set:', {
      id: appointment.id,
      title: appointment.title,
      dateStr: dateStr,
      startTimeStr: startStr,
      endTimeStr: endStr,
      extendedProps: {
        address: appointment.address,
        appointmentStatus: appointment.appointmentStatus,
        staff: appointment.staff,
        package: packages.find(p => p.id === appointment.packageId) || null,
        dateAdded: appointment.dateAdded,
        contacts: eventContacts,
        tags: appointment.tags || []
      },
      isWeekend: isWeekend,
      timeSlots: generateTimeSlots(isWeekend)
    });
    setInitialAppointmentStatus(appointment.appointmentStatus);
    setEditModalOpen(true);
  };

  const handleTagChange = (newValue: any, actionMeta: any) => {
    const selectedTags = newValue ? newValue.map((item: any) => ({ id: item.value, name: item.label })) : [];
    setCurrentEvent({
      ...currentEvent,
      extendedProps: {
        ...currentEvent.extendedProps,
        tags: selectedTags
      }
    });
  };
  const sendWhatsAppNotification = async (contacts: any[], appointmentDetails: any, companyId: string) => {
    try {
      // Format the message
      const message = `
  🗓️ New Appointment Details:
  📌 ${appointmentDetails.title}
  📅 Date: ${format(new Date(appointmentDetails.startTime), 'MMMM dd, yyyy')}
  ⏰ Time: ${format(new Date(appointmentDetails.startTime), 'h:mm a')} - ${format(new Date(appointmentDetails.endTime), 'h:mm a')}
  ${appointmentDetails.meetLink ? `\n🎥 Join Meeting: ${appointmentDetails.meetLink}` : ''}
  `;
  
      // Send WhatsApp message to each contact
      const sendPromises = contacts.map(async (contact) => {
        if (!contact.id) {
          console.error('Contact ID missing:', contact);
          return;
        }
  
        try {
          const response = await fetch(`https://mighty-dane-newly.ngrok-free.app/api/v2/messages/text/${companyId}/${contact.id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message }),
          });
  
          if (!response.ok) {
            throw new Error(`WhatsApp API responded with status: ${response.status}`);
          }
  
          const result = await response.json();
          console.log(`WhatsApp notification sent to contact ${contact.id}:`, result);
          return result;
        } catch (error) {
          console.error(`Failed to send WhatsApp notification to contact ${contact.id}:`, error);
          throw error;
        }
      });
  
      await Promise.all(sendPromises);
      return true;
    } catch (error) {
      console.error('Error sending WhatsApp notifications:', error);
      return false;
    }
  };
  
  // Update the handleSaveAppointment function
  const handleSaveAppointment = async () => {


 
    const { id, title, dateStr, startTimeStr, endTimeStr, extendedProps } = currentEvent;
    const startTime = new Date(`${dateStr}T${startTimeStr}`).toISOString();
    const endTime = new Date(`${dateStr}T${endTimeStr}`).toISOString();
   
    const firstEmployeeId = extendedProps.staff[0];
    const secondEmployeeId = extendedProps.staff[1];
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
    try {
      const user = auth.currentUser;
      if (!user?.email) return;
  
      // Get company ID
      const userDocRef = doc(firestore, 'user', user.email);
      const userDocSnap = await getDoc(userDocRef);
      if (!userDocSnap.exists()) {
        throw new Error('User document not found');
      }
      const companyId = userDocSnap.data().companyId;
  
      const updatedAppointment: Appointment = {
        id,
        title,
        startTime,
        endTime,
        address: extendedProps.address,
        appointmentStatus: extendedProps.appointmentStatus,
        staff: extendedProps.staff,
        color: color,
        tags: extendedProps.tags || [],
        packageId: extendedProps.package ? extendedProps.package.id : null,
        dateAdded: extendedProps.dateAdded,
        meetLink: extendedProps.meetLink,
        notificationSent: extendedProps.notificationSent || false,
        contacts: selectedContacts.map(contact => ({
          id: contact.id,
          name: contact.contactName,
          session: contactSessions[contact.id] || 0
        })),
      };
  
      const appointmentRef = doc(firestore, `user/${user.email}/appointments/${id}`);
      await setDoc(appointmentRef, updatedAppointment);
  
      // Send WhatsApp notification if there's a meet link and notifications haven't been sent
      if (updatedAppointment.meetLink && !updatedAppointment.notificationSent) {
        const notificationSent = await sendWhatsAppNotification(selectedContacts, updatedAppointment, companyId);
        if (notificationSent) {
          // Update the appointment to mark notifications as sent
          updatedAppointment.notificationSent = true;
          await setDoc(appointmentRef, updatedAppointment);
        }
      }
  
      setAppointments(appointments.map(appointment =>
        appointment.id === id ? updatedAppointment : appointment
      ));
  
      setEditModalOpen(false);
    } catch (error) {
      console.error('Error saving appointment:', error);
    }
  };

  const handleDateSelect = (selectInfo: any) => {
    const dateStr = format(new Date(selectInfo.startStr), 'yyyy-MM-dd');
    const date = new Date(dateStr);
    const dayOfWeek = date.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday (0) or Saturday (6)

    setCurrentEvent({
      title: '',
      dateStr: dateStr,
      startTimeStr: '',
      endTimeStr: '',
      extendedProps: {
        address: '',
        appointmentStatus: '',
        staff: '',
        package: '',
        dateAdded: new Date().toISOString(),
        tags: []
      },
      isWeekend: isWeekend,
      timeSlots: generateTimeSlots(isWeekend)
    });

    setAddModalOpen(true);
  };

  const handleAddAppointment = async () => {
    const firstEmployeeId = selectedEmployeeIds[0];
    const firstEmployee = employees.find(emp => emp.id === firstEmployeeId);
  
    const newEvent = {
      title: currentEvent.title,
      startTime: new Date(`${currentEvent.dateStr}T${currentEvent.startTimeStr}`).toISOString(),
      endTime: new Date(`${currentEvent.dateStr}T${currentEvent.endTimeStr}`).toISOString(),
      address: currentEvent.extendedProps.address,
      appointmentStatus: currentEvent.extendedProps.appointmentStatus,
      staff: selectedEmployeeIds,
      tags: currentEvent.extendedProps.tags || [],
      color: firstEmployee ? firstEmployee.color : '#51484f',
      contacts: selectedContacts.map(contact => ({
        id: contact.id,
        name: contact.contactName,
        session: contactSessions[contact.id] || getPackageSessions(currentEvent.extendedProps.package)
      })),
      packageId: currentEvent.extendedProps.package?.id || null,
    };
    await createAppointment(newEvent);
    setAddModalOpen(false);
  };
  

  const createAppointment = async (newEvent: any) => {
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        console.error('No authenticated user or email found');
        return;
      }
      const userRef = doc(firestore, 'user', user.email);
  
      const appointmentsCollectionRef = collection(userRef, 'appointments');
      const newAppointmentRef = doc(appointmentsCollectionRef);
  
      const newAppointment = {
        id: newAppointmentRef.id,
        title: newEvent.title,
        startTime: newEvent.startTime,
        endTime: newEvent.endTime,
        address: newEvent.address,
        appointmentStatus: newEvent.appointmentStatus,
        staff: newEvent.staff,
        color: newEvent.color,
        packageId: newEvent.packageId,
        dateAdded: new Date().toISOString(),
        contacts: newEvent.contacts,
        tags: newEvent.tags || []
      };
  
      await setDoc(newAppointmentRef, newAppointment);
  
      const companyRef = doc(firestore, 'companies', user.email);
      const sessionsCollectionRef = collection(companyRef, 'session');
  
      for (const contact of newEvent.contacts) {
        const newSessionsRef = doc(sessionsCollectionRef, contact.id);
        const newSessions = {
          id: contact.id,
          session: contact.session
        };
  
        await setDoc(newSessionsRef, newSessions);
      }
  
      setAppointments([...appointments, newAppointment as Appointment]);
    } catch (error) {
      console.error('Error creating appointment:', error);
    }
  };
  

  const handleEventDrop = async (eventDropInfo: any) => {
    const { event } = eventDropInfo;
  
    console.log('Event Drop Info:', eventDropInfo);
    console.log('Event:', event);
    console.log('Event Start:', event.start);
    console.log('Event End:', event.end);
    console.log('Event Extended Props:', event.extendedProps);
  
    // Fetch the full appointment data to get the contacts array
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        console.error('No authenticated user or email found');
        return;
      }
  
      const userRef = doc(firestore, 'user', user.email);
      const appointmentsCollectionRef = collection(userRef, 'appointments');
      const appointmentRef = doc(appointmentsCollectionRef, event.id);
      const appointmentDoc = await getDoc(appointmentRef);
  
      if (!appointmentDoc.exists()) {
        console.error('No such document!');
        return;
      }
  
      const appointmentData = appointmentDoc.data() as Appointment;
  
      const updatedAppointment: Appointment = {
        ...appointmentData,
        startTime: event.start.toISOString(),
        endTime: event.end.toISOString()
      };
  
      console.log('Updated Appointment:', updatedAppointment);
  
      await setDoc(appointmentRef, updatedAppointment);
  
      setAppointments(appointments.map(appointment =>
        appointment.id === event.id ? updatedAppointment : appointment
      ));
    } catch (error) {
      console.error('Error updating appointment:', error);
    }
  };
  

  const handleStatusFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterStatus(event.target.value);
  };

  const handleDateFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilterDate(event.target.value);
  };

  const filteredAppointments = appointments.filter(appointment => {
    return (
      (filterStatus ? appointment.appointmentStatus === filterStatus : true) &&
      (filterDate ? format(new Date(appointment.startTime), 'yyyy-MM-dd') === filterDate : true) &&
      (selectedEmployeeId ? appointment.staff.includes(selectedEmployeeId) : true)
    );
  });

  const handleAppointmentClick = async (appointment: Appointment) => {
    // Fetch the contact sessions if not already fetched
    const fetchContactSessions = async () => {
      const newContactSessions: { [key: string]: number } = {};
      await Promise.all(appointment.contacts.map(async (contact) => {
        const auth = getAuth(app);
        const user = auth.currentUser;
        if (!user || !user.email) {
          console.error('No authenticated user or email found');
          return;
        }
  
        const docUserRef = doc(firestore, 'user', user.email);
        const docUserSnapshot = await getDoc(docUserRef);
        if (!docUserSnapshot.exists()) {
          console.error('No such document for user!');
          return;
        }
  
        const dataUser = docUserSnapshot.data();
        const companyId = dataUser.companyId as string;
        const contactRef = doc(firestore, `companies/${companyId}/session`, contact.id);
        const contactSnapshot = await getDoc(contactRef);
  
        if (contactSnapshot.exists()) {
          const contactData = contactSnapshot.data();
          newContactSessions[contact.id] = contactData.session;
          console.log(`Fetched session for contact ${contact.id}: ${contactData.session}`);
        }
      }));
  
      setContactSessions((prevSessions) => {
        const updatedSessions = { ...prevSessions, ...newContactSessions };
        console.log('Updated contact sessions:', updatedSessions);
        return updatedSessions;
      });
    };
  
    // Fetch contact sessions and wait for completion
    await fetchContactSessions();
  
    // Map appointment contacts to ContactWithSession objects
    const fullContacts: ContactWithSession[] = appointment.contacts.map(contact => {
      const foundContact = contacts.find(c => c.id === contact.id);
      if (foundContact) {
        console.log(`Mapping contact ${contact.id} with session ${contactSessions[contact.id] || 0}`);
        return {
          ...foundContact,
          session: contactSessions[contact.id] || 0
        };
      }
      return null;
    }).filter((contact): contact is ContactWithSession => contact !== null);
  
    console.log('Full contacts after mapping:', fullContacts);
  
    setSelectedContacts(fullContacts);
    console.log('Selected contacts:', fullContacts);
  
    setCurrentEvent({
      id: appointment.id,
      title: appointment.title,
      dateStr: format(new Date(appointment.startTime), 'yyyy-MM-dd'),
      startTimeStr: format(new Date(appointment.startTime), 'HH:mm'),
      endTimeStr: format(new Date(appointment.endTime), 'HH:mm'),
      extendedProps: {
        address: appointment.address,
        appointmentStatus: appointment.appointmentStatus,
        staff: appointment.staff,
        package: packages.find(p => p.id === appointment.packageId) || null,
        dateAdded: appointment.dateAdded,
        contacts: appointment.contacts, // Include contacts in currentEvent
        tags: appointment.tags || []
      }
    });
    console.log('Current event set:', {
      id: appointment.id,
      title: appointment.title,
      dateStr: format(new Date(appointment.startTime), 'yyyy-MM-dd'),
      startTimeStr: format(new Date(appointment.startTime), 'HH:mm'),
      endTimeStr: format(new Date(appointment.endTime), 'HH:mm'),
      extendedProps: {
        address: appointment.address,
        appointmentStatus: appointment.appointmentStatus,
        staff: appointment.staff,
        package: packages.find(p => p.id === appointment.packageId) || null,
        dateAdded: appointment.dateAdded,
        contacts: appointment.contacts,
        tags: appointment.tags || []
      }
    });
    setInitialAppointmentStatus(appointment.appointmentStatus);
    setEditModalOpen(true);
  };
  

  const handleDeleteAppointment = async (appointmentId: string) => {
    const user = auth.currentUser;
    if (!user) return;
  
    const appointmentDocRef = doc(firestore, `user/${user.email}/appointments/${appointmentId}`);
  
    try {
      await deleteDoc(appointmentDocRef);
  
      setAppointments(prevAppointments => prevAppointments.filter(appointment => appointment.id !== appointmentId));
    } catch (error) {
      console.error('Error deleting appointment from Firestore:', error);
    }
  };
  

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-gray-500';
      case 'confirmed':
        return 'bg-green-500';
      case 'cancelled':
        return 'bg-red-500';
      case 'showed':
        return 'bg-green-500';
      case 'noshow':
        return 'bg-red-500';
      case 'rescheduled':
        return 'bg-gray-500';
      case 'lost':
        return 'bg-red-500';
      case 'closed':
        return 'bg-blue-700';
      default:
        return 'bg-gray-500';
    }
  };

  const getPackageName = (status: string) => {
    switch (status) {
      case 'trial1':
        return 'Trial - Private';
      case 'trial2':
        return 'Trial - Duo';
      case 'privDrop':
        return 'Private - Drop In';
      case 'priv4':
        return 'Private - 4 Sessions';
      case 'priv10':
        return 'Private - 10 Sessions';
      case 'priv20':
        return 'Private - 20 Sessions';
      case 'DuoDrop':
        return 'Duo - Drop In';
      case 'duo4':
        return 'Duo - 4 Sessions';
      case 'duo10':
        return 'Duo - 10 Sessions';
      case 'duo20':
        return 'Duo - 20 Sessions';
      default:
        return null;
    }
  };

  const renderEventContent = (eventInfo: any) => {
    const staffIds = eventInfo.event.extendedProps.staff;
    const staffColors = employees
      .filter(employee => staffIds.includes(employee.id))
      .map(employee => employee.color);
  
    let backgroundStyle: BackgroundStyle = { backgroundColor: '#51484f' }; // Default color
  
    if (staffColors.length === 1) {
      backgroundStyle = { backgroundColor: staffColors[0] };
    } else if (staffColors.length === 2) {
      backgroundStyle = { background: `linear-gradient(to right, ${staffColors[0]} 0%, ${staffColors[0]} 33%, ${staffColors[1]} 66%, ${staffColors[1]} 100%)` };
    } else if (staffColors.length > 2) {
      backgroundStyle = { backgroundColor: '#FFD700' }; // Distinct color for more than 2 colors
    }
  
    return (
      <div className="flex-grow text-center text-normal font-medium" style={{ ...backgroundStyle, color: 'white', padding: '5px', borderRadius: '5px' }}>
        <i>{eventInfo.event.title}</i>
        {/* {eventInfo.event.extendedProps.tags && eventInfo.event.extendedProps.tags.length > 0 && (
          <div className="text-xs mt-1">
            {eventInfo.event.extendedProps.tags.map((tag: Tag) => (
              <span key={tag.id} className="bg-gray-200 text-gray-800 px-1 rounded mr-1">
                {tag.name}
              </span>
            ))}
          </div>
        )} */}
      </div>
    );
  };

  const selectedEmployee = employees.find(employee => employee.id === selectedEmployeeId);

  const handleStaffChange = (employeeId: string) => {
    setCurrentEvent((prevEvent: { extendedProps: { staff: string[]; }; }) => {
      const isSelected = prevEvent.extendedProps.staff.includes(employeeId);
      const newStaff = isSelected
        ? prevEvent.extendedProps.staff.filter((id: string) => id !== employeeId)
        : [...prevEvent.extendedProps.staff, employeeId];
  
      return {
        ...prevEvent,
        extendedProps: {
          ...prevEvent.extendedProps,
          staff: newStaff
        }
      };
    });
  };
  
  const handleStaffChangeAddModal = (employeeId: string) => {
    setSelectedEmployeeIds((prevSelected) => {
      const isSelected = prevSelected.includes(employeeId);
      return isSelected ? prevSelected.filter((id) => id !== employeeId) : [...prevSelected, employeeId];
    });
  };

  const getPackageSessions = (packageType: string) => {
    switch (packageType) {
      case 'priv4':
        return 4;
      case 'priv10':
        return 10;
      case 'priv20':
        return 20;
      case 'duo4':
        return 4;
      case 'duo10':
        return 10;
      case 'duo20':
        return 20;
      default:
        return null; // Default to 1 for any other package types
    }
  };
  
  const decrementSession = async (contactId: string) => {
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user || !user.email) {
        console.error('No authenticated user or email found');
        return;
      }
  
      const docUserRef = doc(firestore, 'user', user.email);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error('No such document for user!');
        return;
      }
  
      const dataUser = docUserSnapshot.data();
      const companyId = dataUser.companyId as string;
      const contactRef = doc(firestore, `companies/${companyId}/session`, contactId);
      const contactSnapshot = await getDoc(contactRef);
  
      if (!contactSnapshot.exists()) {
        console.error('No such document for contact!');
        return;
      }
  
      const contactData = contactSnapshot.data();
      const currentSessionCount = contactData.session;
      const newSessionCount = currentSessionCount - 1;
  
      setContactSessions({
        ...contactSessions,
        [contactId]: newSessionCount
      });
  
      await updateDoc(contactRef, { session: newSessionCount });
    } catch (error) {
      console.error('Error decrementing session count:', error);
    }
  };

  const incrementSession = async (contactId: string) => {
    // Fetch the current session count from the database
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user || !user.email) {
        console.error('No authenticated user or email found');
        return;
      }
  
      const docUserRef = doc(firestore, 'user', user.email);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.error('No such document for user!');
        return;
      }
  
      const dataUser = docUserSnapshot.data();
      if (!dataUser) {
        console.error('No data found for user!');
        return;
      }
  
      const companyId = dataUser.companyId as string;
      const contactRef = doc(firestore, `companies/${companyId}/session`, contactId);
      const contactSnapshot = await getDoc(contactRef);
  
      if (!contactSnapshot.exists()) {
        console.error('No such document for contact!');
        return;
      }
  
      const contactData = contactSnapshot.data();
      const currentSessionCount = contactData.session;
      console.log(currentSessionCount);
      // Increment the session count
      const newSessionCount = currentSessionCount < getPackageSessions ? currentSessionCount + getPackageSessions : 0;
      console.log(newSessionCount);
      // Update the session count in the state
      setContactSessions({
        ...contactSessions,
        [contactId]: newSessionCount
      });
  
      // Update the session count in the database
      await updateDoc(contactRef, { session: newSessionCount });
    } catch (error) {
      console.error('Error incrementing session count:', error);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;

      if (!user) return;

      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
      }

      const dataUser = docUserSnapshot.data();
      const companyId = dataUser.companyId;
      const packagesRef = collection(firestore, `companies/${companyId}/packages`);
      const packagesSnapshot = await getDocs(packagesRef);

      const packagesData: Package[] = [];
      packagesSnapshot.forEach((doc) => {
        packagesData.push({ id: doc.id, ...doc.data() } as Package);
      });

      setPackages(packagesData);
    } catch (error) {
      console.error('Error fetching packages:', error);
    }
  };

  const addNewPackage = async () => {
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;

      if (!user) return;

      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
      }

      const dataUser = docUserSnapshot.data();
      const companyId = dataUser.companyId;
      const packagesRef = collection(firestore, `companies/${companyId}/packages`);

      const newPackage = {
        name: newPackageName,
        sessions: newPackageSessions,
      };

      const docRef = await addDoc(packagesRef, newPackage);
      setPackages([...packages, { id: docRef.id, ...newPackage }]);
      setNewPackageName("");
      setNewPackageSessions(0);
      setIsAddingPackage(false);
    } catch (error) {
      console.error('Error adding new package:', error);
    }
  };

  useEffect(() => {
    const fetchCalendarConfig = async () => {
      try {
        const auth = getAuth(app);
        const user = auth.currentUser;
        if (!user) return;
  
        const docUserRef = doc(firestore, 'user', user.email!);
        const docUserSnapshot = await getDoc(docUserRef);
        if (!docUserSnapshot.exists()) {
          console.log('No such document for user!');
          return;
        }
  
        const dataUser = docUserSnapshot.data();
        const companyId = dataUser.companyId;
        
        const configRef = doc(firestore, `companies/${companyId}/config/calendar`);
        const configSnapshot = await getDoc(configRef);
        
        if (configSnapshot.exists()) {
          const calendarConfig = configSnapshot.data() as CalendarConfig;
          setConfig(calendarConfig);
        } else {
          const defaultConfig: CalendarConfig = {
            calendarId: '',
            startHour: 11,
            endHour: 21,
            slotDuration: 30,
            daysAhead: 3
          };
          await setDoc(configRef, defaultConfig);
          setConfig(defaultConfig);
        }
      } catch (error) {
        console.error('Error fetching calendar config:', error);
      }
    };
  
    fetchCalendarConfig();
  }, []);

  // Modify the updateCalendarConfig function
  const updateCalendarConfig = async (newConfig: typeof config) => {
    try {
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (!user) return;

      const docUserRef = doc(firestore, 'user', user.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
      }

      const dataUser = docUserSnapshot.data();
      const companyId = dataUser.companyId;
      
      // Update the path to match your structure
      const configRef = doc(firestore, `companies/${companyId}/config/calendar`);
      await setDoc(configRef, newConfig);
      
      setConfig(newConfig);
      console.log('Calendar config updated successfully');
    } catch (error) {
      console.error('Error updating calendar config:', error);
    }
  };

  // Add this JSX somewhere in your return statement, perhaps in the settings section or as a new modal
  const renderCalendarConfigModal = () => (
    <Dialog open={isCalendarConfigOpen} onClose={() => setIsCalendarConfigOpen(false)}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <Dialog.Panel className="w-full max-w-md p-6 bg-white rounded-md mt-10 dark:bg-gray-800">
          <h2 className="text-lg font-medium mb-4 dark:text-white">Calendar Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Google Calendar ID</label>
              <input
                type="text"
                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={config.calendarId}
                onChange={(e) => setConfig({ ...config, calendarId: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Hour (24h)</label>
              <input
                type="number"
                min="0"
                max="23"
                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={config.startHour}
                onChange={(e) => setConfig({ ...config, startHour: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Hour (24h)</label>
              <input
                type="number"
                min="0"
                max="23"
                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={config.endHour}
                onChange={(e) => setConfig({ ...config, endHour: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Slot Duration (minutes)</label>
              <input
                type="number"
                min="15"
                step="15"
                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={config.slotDuration}
                onChange={(e) => setConfig({ ...config, slotDuration: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Days Ahead</label>
              <input
                type="number"
                min="1"
                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={config.daysAhead}
                onChange={(e) => setConfig({ ...config, daysAhead: parseInt(e.target.value) })}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
                onClick={() => setIsCalendarConfigOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
                onClick={() => {
                  updateCalendarConfig(config);
                  setIsCalendarConfigOpen(false);
                }}
              >
                Save Settings
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );

  return (
    <>
      <div className="flex flex-col items-start mt-8 intro-y sm:flex-row sm:flex-wrap lg:flex-nowrap">
        {/* Employee selection dropdown */}
        <div className="w-full mb-4 sm:w-1/4 sm:mr-2 lg:w-auto lg:mb-0 lg:mr-4">
          {employees.length > 0 && (
            <select
              value={selectedEmployeeId}
              onChange={handleEmployeeChange}
              className="w-full text-white bg-primary hover:bg-white hover:text-primary focus:ring-2 focus:ring-blue-300 font-medium rounded-lg text-sm text-start inline-flex items-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
            >
              <option value="">Select an employee</option>
              {employees.map(employee => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Status and date filters */}
        <div className="w-full mb-2 sm:w-1/4 sm:mr-2 lg:w-auto lg:mb-0 lg:mr-4">
          <select
            value={filterStatus}
            onChange={handleStatusFilterChange}
            className="w-full mb-2 sm:mb-0 text-primary border-primary bg-white hover focus:ring-2 focus:ring-blue-300 font-small rounded-lg text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600"
          >
            <option value="">All Statuses</option>
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

        <div className="w-full mb-2 sm:w-1/4 sm:mr-2 lg:w-auto lg:mb-0 lg:mr-4 relative">
          <div className="relative">
            <input
              type="date"
              value={filterDate}
              onChange={handleDateFilterChange}
              className="block w-full p-2 text-primary bg-white border border-primary rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            />
          </div>
          {filterDate && (
            <button
              onClick={() => setFilterDate('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3"
            >
              <Lucide icon="X" className="w-6 h-6 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300" />
            </button>
          )}
        </div>

        {/* Add New Package and Calendar Settings buttons */}
        <div className="w-full mb-4 sm:w-1/4 sm:mr-2 lg:w-auto lg:mb-0 lg:mr-4 flex gap-2">
          <button
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
            onClick={() => setIsAddingPackage(true)}
          >
            Add New Package
          </button>
          <button
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
            onClick={() => setIsCalendarConfigOpen(true)}
          >
            Calendar Settings
          </button>
        </div>

        {/* Add New Appointment button */}
        <div className="w-full sm:w-1/4 sm:mr-2 lg:w-auto lg:mr-4">
          <Button
            variant="primary"
            type="button"
            className="w-full"
            onClick={() => {
              setSelectedContacts([]);
              setCurrentEvent({
                title: '',
                dateStr: '',
                startTimeStr: '',
                endTimeStr: '',
                extendedProps: {
                  address: '',
                  appointmentStatus: '',
                  staff: '',
                  package: '',
                  dateAdded: new Date().toISOString(),
                  tags: []
                }
              });
              setAddModalOpen(true);
            }}
          >
            <Lucide icon="FilePenLine" className="w-4 h-4 mr-2" /> Add New Appointment
          </Button>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-5">
        {/* Appointments list */}
        <div className={`${isMobile ? 'order-1' : ''} md:col-span-4 xl:col-span-4 2xl:col-span-3`}>
          <div className="p-5 box intro-y" style={{ maxHeight: '700px', overflowY: 'auto' }}>
            <div className="flex justify-between items-center h-10 intro-y gap-4">
              <h2 className="text-3xl sm:text-xl md:text-2xl font-bold dark:text-white">
                Appointments
              </h2>
              <div className="flex flex-wrap">
                <span className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-300 me-3 mb-1"><span className="flex w-2.5 h-2.5 bg-gray-500 rounded-full me-1.5 flex-shrink-0"></span>New</span>
                <span className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-300 me-3 mb-1"><span className="flex w-2.5 h-2.5 bg-green-500 rounded-full me-1.5 flex-shrink-0"></span>Showed</span>
                <span className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-300 me-3 mb-1"><span className="flex w-2.5 h-2.5 bg-red-500 rounded-full me-1.5 flex-shrink-0"></span>Canceled</span>
                <span className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-300 me-3 mb-1"><span className="flex w-2.5 h-2.5 bg-blue-700 rounded-full me-1.5 flex-shrink-0"></span>Closed</span>
              </div>
            </div>
            <div className="mt-4 mb-2 border-t border-b border-slate-200/60 dark:border-gray-600">
              {filteredAppointments.length > 0 ? (
                filteredAppointments.map((appointment, index) => (
                  <div key={index} className="relative" onClick={() => handleAppointmentClick(appointment)}>
                    <div className="flex m-2 p-2 -mx-3 transition duration-300 ease-in-out rounded-md cursor-pointer event hover:bg-slate-200 dark:hover:bg-gray-600">
                      <div className={`w-2 mr-3 rounded-sm ${getStatusColor(appointment.appointmentStatus)}`} style={{ height: 'auto' }}></div>
                      <div className="pr-2 item-center w-full">
                        <div className="flex justify-between">
                          <div>
                            <div className="truncate event__title text-lg font-semibold dark:text-white text-start capitalize">{appointment.title}</div>
                        <div className="text-xs flex flex-wrap mt-1">
                          {appointment.staff.map((employeeId) => {
                            const employee = employees.find(e => e.id === employeeId);
                            return employee ? (
                              <span key={employee.id} className="text-xs px-1 rounded mr-1 mb-1 text-start capitalize" style={{ backgroundColor: employee.color, color: '#fff' }}>
                                {employee.name}
                              </span>
                            ) : null;
                          })}
                          {appointment.tags && appointment.tags.length > 0 && (
                            <>
                              {appointment.tags.slice(0, 2).map(tag => (
                                <span key={tag.id} className="bg-blue-200 text-blue-800 text-xs px-1 rounded mr-1 mb-1">
                                  {tag.name}
                                </span>
                              ))}
                              {appointment.tags.length > 2 && (
                                <span className="bg-blue-200 text-blue-800 text-xs px-1 rounded mr-1 mb-1">
                                  +{appointment.tags.length - 2} more
                                </span>
                              )}
                            </>
                          )}
                        </div>
                        {packages.find(p => p.id === appointment.packageId) && packages.find(p => p.id === appointment.packageId)?.name !== 'No Packages' && (
                          <div className="text-slate-500 text-xs dark:text-gray-300 items-center font-medium">
                                {packages.find(p => p.id === appointment.packageId)?.name} package
                                {(packages.find(p => p.id === appointment.packageId)?.sessions ?? 0) > 0 && 
                                  ` (${packages.find(p => p.id === appointment.packageId)?.sessions ?? 0} sessions)`}
                              </div>
                            )}
                        <div className="text-slate-500 text-xs dark:text-gray-300 flex flex-wrap items-center">
                          {appointment.contacts.map(contact => (
                            <div key={contact.id} className="flex items-center mb-1">
                              <span className="text-gray-800 dark:text-gray-200 text-lg">•</span>
                              <span className="text-gray-800 dark:text-gray-200 text-xs px-1 rounded items-center">
                                {contact.name}
                                {contact.session > 0 && ` | Session ${contact.session}`}
                              </span>
                            </div>
                          ))}
                        </div>
                          </div>
                          <div className="text-slate-500 text-xs mt-0.5 dark:text-gray-300 text-right">
                            <div>
                              {new Date(appointment.startTime).toLocaleString('en-US', {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </div>
                            <div>
                              {new Date(appointment.startTime).toLocaleString('en-US', {
                                hour: 'numeric',
                                minute: 'numeric',
                                hour12: true
                              })} - {new Date(appointment.endTime).toLocaleString('en-US', {
                                hour: 'numeric',
                                minute: 'numeric',
                                hour12: true
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 text-center text-slate-500 dark:text-gray-400">
                  No appointments yet
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className={`${isMobile ? 'hidden' : ''} md:col-span-8 xl:col-span-8 2xl:col-span-9`}>
          <div className="p-5 box intro-y">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView={view}
              events={filteredAppointments.map(appointment => ({
                id: appointment.id,
                title: appointment.title,
                start: appointment.startTime,
                end: appointment.endTime,
                extendedProps: {
                  appointmentStatus: appointment.appointmentStatus,
                  staff: appointment.staff,
                  tags: appointment.tags || []
                }
              }))}
              selectable={true}
              select={handleDateSelect}
              eventClick={handleEventClick}
              editable={true}
              eventDrop={handleEventDrop}
              eventContent={renderEventContent}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
              }}
              datesSet={(dateInfo) => setView(dateInfo.view.type)}
            />
            <style>{`
              .fc .fc-toolbar {
                color: #0C4A6E;
              }
              .fc .fc-toolbar button {
                background-color: #0C4A6E;
                color: white;
                border: none;
                padding: 0.5rem 1rem;
                margin: 0 0.25rem;
                border-radius: 0.375rem;
                cursor: pointer;
              }
              .fc .fc-toolbar button:hover {
                background-color: #082F49;
              }
              .dark .fc .fc-toolbar {
                color: #fff;
              }
              .dark .fc .fc-toolbar button {
                background-color: #1e40af;
              }
              .dark .fc .fc-toolbar button:hover {
                background-color: #1e3a8a;
              }
            `}</style>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editModalOpen && (
        <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)}>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <Dialog.Panel className="w-full max-w-md p-6 bg-white rounded-md mt-10 dark:bg-gray-800">
              <div className="flex items-center p-4 border-b dark:border-gray-700">
                <div className="block w-12 h-12 overflow-hidden rounded-full shadow-lg bg-gray-700 flex items-center justify-center text-white mr-4">
                  <span className="text-xl">{currentEvent?.title.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <div className="font-semibold text-gray-800 dark:text-white">{currentEvent?.title}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">{currentEvent?.extendedProps?.address}</div>
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
                  <input
                    type="date"
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={currentEvent?.dateStr || ''}
                    onChange={handleDateChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Time Slot</label>
                  <select
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={currentEvent?.startTimeStr && currentEvent?.endTimeStr ? `${currentEvent.startTimeStr} - ${currentEvent.endTimeStr}` : ''}
                    onChange={handleTimeSlotChange}
                  >
                    <option value="" disabled>Select a time slot</option>
                    {currentEvent?.timeSlots?.map((slot: string) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Appointment Status</label>
                  <select
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={currentEvent?.extendedProps?.appointmentStatus || ''}
                    onChange={(e) => setCurrentEvent({ ...currentEvent, extendedProps: { ...currentEvent.extendedProps, appointmentStatus: e.target.value } })}
                  >
                    <option value="" disabled>Set a status</option>
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
                <div className="space-y-2">
  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
    Google Meet Link
  </label>
  <div className="flex gap-2">
    <input
      type="text"
      className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
      value={currentEvent?.extendedProps?.meetLink || ''}
      onChange={(e) => setCurrentEvent({
        ...currentEvent,
        extendedProps: {
          ...currentEvent.extendedProps,
          meetLink: e.target.value
        }
      })}
      placeholder="https://meet.google.com/..."
    />

  </div>
  {currentEvent?.extendedProps?.meetLink && (
    <div className="flex justify-between items-center mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
      <a
        href={currentEvent.extendedProps.meetLink}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
      >
        Open Meet Link
      </a>
      <button
        className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
        onClick={() => {
          navigator.clipboard.writeText(currentEvent.extendedProps.meetLink);
        }}
      >
        Copy Link
      </button>
    </div>
  )}
  {!currentEvent?.extendedProps?.notificationSent && currentEvent?.extendedProps?.meetLink && (
    <div className="text-sm text-gray-600 dark:text-gray-400">
      Meeting link will be sent to contacts when you save
    </div>
  )}
  {currentEvent?.extendedProps?.notificationSent && (
    <div className="text-sm text-green-600 dark:text-green-400">
      Meeting link has been sent to contacts
    </div>
  )}
</div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tags</label>
                  <Select
                    isMulti
                    options={appointmentTags.map((tag: any) => ({ value: tag.id, label: tag.name }))}
                    value={currentEvent?.extendedProps?.tags?.map((tag: any) => ({ value: tag.id, label: tag.name })) || []}
                    onChange={handleTagChange}
                    className="capitalize"
                    styles={{
                      control: (provided, state) => ({
                        ...provided,
                        backgroundColor: state.isFocused ? '#ffffff' : '#f9fafb', // Light mode background
                        borderColor: state.isFocused ? '#2563eb' : '#d1d5db', // Light mode border
                        boxShadow: state.isFocused ? '0 0 0 1px #2563eb' : 'none', // Light mode shadow
                        '&:hover': {
                          borderColor: '#2563eb', // Light mode hover border
                        },
                        '&.dark': {
                          backgroundColor: state.isFocused ? '#374151' : '#1f2937', // Dark mode background
                          borderColor: state.isFocused ? '#3b82f6' : '#4b5563', // Dark mode border
                          boxShadow: state.isFocused ? '0 0 0 1px #3b82f6' : 'none', // Dark mode shadow
                          '&:hover': {
                            borderColor: '#3b82f6', // Dark mode hover border
                          },
                        },
                      }),
                      menu: (provided, state) => ({
                        ...provided,
                        backgroundColor: state.selectProps.menuIsOpen ? '#ffffff' : '#f9fafb', // Light mode menu background
                        '&.dark': {
                          backgroundColor: state.selectProps.menuIsOpen ? '#374151' : '#1f2937', // Dark mode menu background
                        },
                      }),
                      multiValue: (provided, state) => ({
                        ...provided,
                        backgroundColor: '#e5e7eb', // Light mode multi-value background
                        '&.dark': {
                          backgroundColor: '#4b5563', // Dark mode multi-value background
                        },
                      }),
                      multiValueLabel: (provided, state) => ({
                        ...provided,
                        color: '#1f2937', // Light mode multi-value label color
                        '&.dark': {
                          color: '#d1d5db', // Dark mode multi-value label color
                        },
                      }),
                      multiValueRemove: (provided, state) => ({
                        ...provided,
                        color: '#1f2937', // Light mode multi-value remove color
                        '&:hover': {
                          backgroundColor: '#d1d5db', // Light mode multi-value remove hover background
                          color: '#111827', // Light mode multi-value remove hover color
                        },
                        '&.dark': {
                          color: '#d1d5db', // Dark mode multi-value remove color
                          '&:hover': {
                            backgroundColor: '#6b7280', // Dark mode multi-value remove hover background
                            color: '#f9fafb', // Dark mode multi-value remove hover color
                          },
                        },
                      }),
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Staff</label>
                  <div className="block w-full mt-1 border border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-2 dark:bg-gray-700 dark:border-gray-600">
                    {employees.map((employee) => (
                      <div key={employee.id} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`employee-${employee.id}`}
                          checked={currentEvent?.extendedProps?.staff.includes(employee.id)}
                          onChange={() => handleStaffChange(employee.id)}
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Package</label>
                  <select
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={currentEvent?.extendedProps?.package?.id || ''}
                    onChange={(e) => {
                      const packageId = e.target.value;
                      setCurrentEvent({
                        ...currentEvent,
                        extendedProps: {
                          ...currentEvent.extendedProps,
                          package: packageId === '' ? null : packages.find(p => p.id === packageId)
                        }
                      });
                    }}
                  >
                    <option value="">No Package</option>
                    {packages.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} - {pkg.sessions} Sessions
                      </option>
                    ))}
                  </select>
                  <button
                    className="mt-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/80 dark:bg-blue-600 dark:hover:bg-blue-700"
                    onClick={() => setIsAddingPackage(true)}
                  >
                    Add New Package
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contacts</label>
                  <Select
                    isMulti
                    value={selectedContacts.map(contact => ({ value: contact.id, label: contact.contactName }))}
                    options={contacts.map(contact => ({ value: contact.id, label: contact.contactName }))}
                    onChange={handleContactChange}
                    classNamePrefix="react-select"
                    className="capitalize"
                    styles={{
                      control: (provided, state) => ({
                        ...provided,
                        backgroundColor: state.isFocused ? '#f9fafb' : '#ffffff', // Light mode background
                        borderColor: state.isFocused ? '#3b82f6' : '#d1d5db', // Light mode border
                        boxShadow: state.isFocused ? '0 0 0 1px #3b82f6' : 'none',
                        '&:hover': {
                          borderColor: '#3b82f6',
                        },
                        '.dark &': {
                          backgroundColor: state.isFocused ? '#374151' : '#1f2937', // Dark mode background
                          borderColor: state.isFocused ? '#3b82f6' : '#4b5563', // Dark mode border
                          boxShadow: state.isFocused ? '0 0 0 1px #3b82f6' : 'none',
                          '&:hover': {
                            borderColor: '#3b82f6',
                          },
                        },
                      }),
                      menu: (provided) => ({
                        ...provided,
                        backgroundColor: '#ffffff', // Light mode background
                        '.dark &': {
                          backgroundColor: '#1f2937', // Dark mode background
                        },
                      }),
                      multiValue: (provided) => ({
                        ...provided,
                        backgroundColor: '#e5e7eb', // Light mode background
                        '.dark &': {
                          backgroundColor: '#4b5563', // Dark mode background
                        },
                      }),
                      multiValueLabel: (provided) => ({
                        ...provided,
                        color: '#111827', // Light mode text color
                        '.dark &': {
                          color: '#d1d5db', // Dark mode text color
                        },
                      }),
                      multiValueRemove: (provided) => ({
                        ...provided,
                        color: '#111827', // Light mode text color
                        '&:hover': {
                          backgroundColor: '#d1d5db', // Light mode hover background
                          color: '#111827', // Light mode hover text color
                        },
                        '.dark &': {
                          color: '#d1d5db', // Dark mode text color
                          '&:hover': {
                            backgroundColor: '#4b5563', // Dark mode hover background
                            color: '#f9fafb', // Dark mode hover text color
                          },
                        },
                      }),
                    }}
                  />
                  {selectedContacts.map(contact => (
                    <div key={contact.id} className="capitalize text-sm text-gray-600 dark:text-gray-300">
                      {contact.contactName}: Session {contactSessions[contact.id] || 'N/A'}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end mt-6 space-x-2">
                {currentEvent?.id && (
                  <button
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
                    onClick={() => {
                      handleDeleteAppointment(currentEvent.id);
                      setEditModalOpen(false);
                    }}
                  >
                    Delete
                  </button>
                )}
                <button
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
                  onClick={() => setEditModalOpen(false)}
                >
                  Cancel
                </button>
                {(initialAppointmentStatus !== 'showed' && initialAppointmentStatus !== 'noshow') &&  (
                  <button
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
                    onClick={handleSaveAppointment}
                  >
                    Save
                  </button>
                )}
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}

      {/* Add Modal */}
      {addModalOpen && (
        <Dialog open={addModalOpen} onClose={() => setAddModalOpen(false)}>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <Dialog.Panel className="w-full max-w-md p-6 bg-white rounded-md mt-10 dark:bg-gray-800">
              <div className="flex items-center p-4 border-b dark:border-gray-700">
                <div className="block w-12 h-12 overflow-hidden rounded-full shadow-lg bg-gray-700 flex items-center justify-center text-white mr-4">
                  <Lucide icon="User" className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xl dark:text-white">Add New Appointment</span>
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
                  <input
                    type="date"
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={currentEvent?.dateStr || ''}
                    onChange={handleDateChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Time Slot</label>
                  <select
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={currentEvent?.startTimeStr && currentEvent?.endTimeStr ? `${currentEvent.startTimeStr} - ${currentEvent.endTimeStr}` : ''}
                    onChange={handleTimeSlotChange}
                  >
                    <option value="" disabled>Select a time slot</option>
                    {currentEvent?.timeSlots?.map((slot: string) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
                  <input
                    type="text"
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={currentEvent?.extendedProps?.address || ''}
                    onChange={(e) => setCurrentEvent({ ...currentEvent, extendedProps: { ...currentEvent.extendedProps, address: e.target.value } })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Appointment Status</label>
                  <select
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={currentEvent?.extendedProps?.appointmentStatus || ''}
                    onChange={(e) => setCurrentEvent({ ...currentEvent, extendedProps: { ...currentEvent.extendedProps, appointmentStatus: e.target.value } })}
                  >
                    <option value="" disabled>Set a status</option>
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tags</label>
                  <Select
                    isMulti
                    options={appointmentTags.map((tag: any) => ({ value: tag.id, label: tag.name }))}
                    value={currentEvent?.extendedProps?.tags?.map((tag: any) => ({ value: tag.id, label: tag.name })) || []}
                    onChange={handleTagChange}
                    className="capitalize dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    styles={{
                      control: (provided: any) => ({
                        ...provided,
                        backgroundColor: '#1f2937', // Solid color for better visibility
                        borderColor: 'border-gray-300 dark:border-gray-600',
                        boxShadow: 'shadow-sm',
                      }),
                      menu: (provided) => ({
                        ...provided,
                        backgroundColor: '#1f2937', // Solid color for better visibility
                      }),
                      multiValue: (provided) => ({
                        ...provided,
                        backgroundColor: '#4b5563', // Solid color for better visibility
                      }),
                      multiValueLabel: (provided) => ({
                        ...provided,
                        color: 'text-gray-800 dark:text-gray-200',
                      }),
                      multiValueRemove: (provided) => ({
                        ...provided,
                        color: 'text-gray-800 dark:text-gray-200',
                        '&:hover': {
                          backgroundColor: 'bg-gray-300 dark:bg-gray-500',
                          color: 'text-gray-900 dark:text-gray-100',
                        },
                      }),
                    }}
                  />
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
                          onChange={() => handleStaffChangeAddModal(employee.id)}
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Package</label>
                  <select
                    className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={currentEvent?.extendedProps?.package?.id || ''}
                    onChange={(e) => {
                      const packageId = e.target.value;
                      setCurrentEvent({
                        ...currentEvent,
                        extendedProps: {
                          ...currentEvent.extendedProps,
                          package: packageId === '' ? null : packages.find(p => p.id === packageId)
                        }
                      });
                    }}
                  >
                    <option value="">No Package</option>
                    {packages.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} - {pkg.sessions} Sessions
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contacts</label>
                  <Select
                    isMulti
                    options={contacts.map(contact => ({ value: contact.id, label: contact.contactName }))}
                    onChange={handleContactChange}
                    className="capitalize dark:bg-gray-700 dark:text-white"
                  />
                  {selectedContacts.map(contact => (
                    <div key={contact.id} className="capitalize text-sm text-gray-600 dark:text-gray-300">
                      {contact.contactName}: Session {contactSessions[contact.id] || 'N/A'}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end mt-6 space-x-2">
                <button
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
                  onClick={() => {
                    setAddModalOpen(false);
                    setSelectedContacts([]);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
                  onClick={handleAddAppointment}
                >
                  Save
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}

      {/* Add Package Modal */}
      <Dialog open={isAddingPackage} onClose={() => setIsAddingPackage(false)}>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <Dialog.Panel className="w-full max-w-md p-6 bg-white rounded-md mt-10 dark:bg-gray-800">
            <h2 className="text-lg font-medium mb-4 dark:text-white">Add New Package</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Package Name</label>
                <input
                  type="text"
                  className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={newPackageName}
                  onChange={(e) => setNewPackageName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Number of Sessions</label>
                <input
                  type="number"
                  className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={newPackageSessions}
                  onChange={(e) => setNewPackageSessions(parseInt(e.target.value))}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
                  onClick={() => setIsAddingPackage(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
                  onClick={addNewPackage}
                >
                  Add Package
                </button>
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {renderCalendarConfigModal()}
    </>
  );
}

export default Main;

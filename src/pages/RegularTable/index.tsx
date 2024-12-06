import _ from "lodash";
import clsx from "clsx";
import React, { useState, useEffect, useRef } from "react";
import Button from "@/components/Base/Button";
import Pagination from "@/components/Base/Pagination";
import { FormInput, FormSelect } from "@/components/Base/Form";
import Lucide from "@/components/Base/Lucide";
import Tippy from "@/components/Base/Tippy";
import { Dialog, Menu } from "@/components/Base/Headless";
import Table from "@/components/Base/Table";
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { initializeApp } from "firebase/app";
import axios from "axios";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { rateLimiter } from '../../utils/rate';
import { useNavigate } from "react-router-dom";
import LoadingIcon from "@/components/Base/LoadingIcon";
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

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

function Main() {
  interface Appointment {
    id: string;
    address: string;
    title: string;
    calendarId: string;
    locationId: string;
    contactId: string;
    groupId: string;
    appointmentStatus: string;
    assignedUserId: string;
    users: string[];
    notes: string;
    startTime: string;
    endTime: string;
    dateAdded: string;
    dateUpdated: string;
  }
  interface User {
    id: string;
    name: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    extension: string;
    permissions: any;
    roles: any;
  }

  const DatePickerComponent = DatePicker as any;

  const [deleteConfirmationModal, setDeleteConfirmationModal] = useState(false);
  const [editAppointmentModal, setEditAppointmentModal] = useState(false);
  const [viewAppointmentModal, setViewAppointmentModal] = useState(false);
  const deleteButtonRef = useRef(null);
  const [isLoading, setLoading] = useState<boolean>(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [selectedAppointments, setSelectedAppointments] = useState<Appointment[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentAppointment, setCurrentAppointment] = useState<Appointment | null>(null);
  const [addAppointmentModal, setAddAppointmentModal] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [newAppointment, setNewAppointment] = useState({
    title: '',
    address: '',
    notes: '',
    startTime: '',
    endTime: '',
    assignedUserId: '',
  });
  const [total, setTotal] = useState(0);
  const [fetched, setFetched] = useState(0);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [appointmentsPerPage] = useState(10); // Adjust the number of appointments per page as needed

  let role = 1;
  let userName = '';

  const fetchUsers = async (accessToken: string, locationId: string) => {
    const maxRetries = 5;
    const baseDelay = 5000;
  
    const fetchData = async (url: string, retries: number = 0): Promise<any> => {
      const options = {
        method: 'GET',
        url: url,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Version: '2021-07-28',
          Accept: 'application/json',
        },
      };
  
      try {
        const response = await axios.request(options);
        return response;
      } catch (error: any) {
        if (error.response && error.response.status === 429 && retries < maxRetries) {
          const delay = baseDelay * Math.pow(2, retries);
          console.warn(`Rate limit hit, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return fetchData(url, retries + 1);
        } else {
          throw error;
        }
      }
    };
  
    try {
      const url = `https://services.leadconnectorhq.com/users?locationId=${locationId}`;
      const response = await fetchData(url);
      console.log(response)
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    const fetchCompanyData = async () => {
      const user = auth.currentUser;
      try {
        const docUserRef = doc(firestore, 'user', user?.email!);
        const docUserSnapshot = await getDoc(docUserRef);
        if (!docUserSnapshot.exists()) {
          console.log('No such document for user!');
          return;
        }
        const userData = docUserSnapshot.data();
        const companyId = userData.companyId;
        role = userData.role;
        userName = userData.name;

        const docRef = doc(firestore, 'companies', companyId);
        const docSnapshot = await getDoc(docRef);
        if (!docSnapshot.exists()) {
          console.log('No such document for company!');
          return;
        }
        const companyData = docSnapshot.data();
        await setDoc(doc(firestore, 'companies', companyId), {
          ghl_accessToken: companyData.ghl_accessToken,
          ghl_refreshToken: companyData.ghl_refreshToken,
        }, { merge: true });

        await fetchUsers(companyData.ghl_accessToken, companyData.ghl_location);

        const startTime = new Date(0).getTime(); // January 1, 1970 in milliseconds
        const endTime = new Date(Date.now() + 50 * 365 * 24 * 60 * 60 * 1000).getTime(); // 50 years from now in milliseconds

        await fetchAppointments(companyData.ghl_accessToken, companyData.ghl_location, startTime, endTime);
      } catch (error) {
        console.error('Error fetching company data:', error);
      }
    };

    fetchCompanyData();
  }, []);

  const handleSaveNewAppointment = async () => {
    try {
      console.log(newAppointment);

      const user = auth.currentUser;
      const docUserRef = doc(firestore, 'user', user?.email!);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        console.log('No such document for user!');
        return;
      }
      const userData = docUserSnapshot.data();
      const companyId = userData.companyId;
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        console.log('No such document for company!');
        return;
      }
      const companyData = docSnapshot.data();
      const accessToken = companyData.ghl_accessToken;

      const apiUrl = 'https://services.leadconnectorhq.com/calendars/events';
      const options = {
        method: 'POST',
        url: apiUrl,
        data: {
          title: newAppointment.title,
          address: newAppointment.address,
          notes: newAppointment.notes,
          startTime: newAppointment.startTime,
          endTime: newAppointment.endTime,
          assignedUserId: newAppointment.assignedUserId,
          locationId: companyData.ghl_location,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Version: '2021-04-15',
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      };

      const response = await axios.request(options);
      console.log(response);
      if (response.status === 201) {
        toast.success("Appointment added successfully!");
        setAddAppointmentModal(false);
        setAppointments(prevAppointments => [...prevAppointments, response.data.event]);
        setNewAppointment({
          title: '',
          address: '',
          notes: '',
          startTime: '',
          endTime: '',
          assignedUserId: '',
        });
      } else {
        console.error('Failed to add appointment:', response.statusText);
        toast.error("Failed to add appointment." + response.statusText);
      }
    } catch (error) {
      console.error('Error adding appointment:', error);
      toast.error("An error occurred while adding the appointment." + error);
    }
  };

  const handleDeleteAppointment = async () => {
    if (currentAppointment) {
      try {
        const user = auth.currentUser;
        const docUserRef = doc(firestore, 'user', user?.email!);
        const docUserSnapshot = await getDoc(docUserRef);
        if (!docUserSnapshot.exists()) {
          console.log('No such document for user!');
          return;
        }
        const userData = docUserSnapshot.data();
        const companyId = userData.companyId;
        const docRef = doc(firestore, 'companies', companyId);
        const docSnapshot = await getDoc(docRef);
        if (!docSnapshot.exists()) {
          console.log('No such document for company!');
          return;
        }
        const companyData = docSnapshot.data();
        const accessToken = companyData.ghl_accessToken;
        const apiUrl = `https://services.leadconnectorhq.com/calendars/events/${currentAppointment.id}`;

        const options = {
          method: 'DELETE',
          url: apiUrl,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Version: '2021-04-15',
            Accept: 'application/json'
          }
        };

        const response = await axios.request(options);
        if (response.status === 200) {
          setAppointments(prevAppointments => prevAppointments.filter(appointment => appointment.id !== currentAppointment.id));
          setDeleteConfirmationModal(false);
          setCurrentAppointment(null);
          toast.success("Appointment deleted successfully!");
        } else {
          console.error('Failed to delete appointment:', response.statusText);
          toast.error("Failed to delete appointment.");
        }
      } catch (error) {
        console.error('Error deleting appointment:', error);
        toast.error("An error occurred while deleting the appointment.");
      }
    }
  };

  const handleSaveAppointment = async () => {
    if (currentAppointment) {
      try {
        const user = auth.currentUser;
        const docUserRef = doc(firestore, 'user', user?.email!);
        const docUserSnapshot = await getDoc(docUserRef);
        if (!docUserSnapshot.exists()) {
          console.log('No such document for user!');
          return;
        }
        const userData = docUserSnapshot.data();
        const companyId = userData.companyId;
        const docRef = doc(firestore, 'companies', companyId);
        const docSnapshot = await getDoc(docRef);
        if (!docSnapshot.exists()) {
          console.log('No such document for company!');
          return;
        }
        const companyData = docSnapshot.data();
        const accessToken = companyData.ghl_accessToken;
        const apiUrl = `https://services.leadconnectorhq.com/calendars/events/${currentAppointment.id}`;

        const options = {
          method: 'PUT',
          url: apiUrl,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Version: '2021-04-15',
            'Content-Type': 'application/json',
          },
          data: {
            title: currentAppointment.title,
            address: currentAppointment.address,
            notes: currentAppointment.notes,
            startTime: currentAppointment.startTime,
            endTime: currentAppointment.endTime,
            assignedUserId: currentAppointment.assignedUserId,
          }
        };

        const response = await axios.request(options);
        if (response.status === 200) {
          setAppointments(appointments.map(appointment => (appointment.id === currentAppointment.id ? response.data.event : appointment)));
          setEditAppointmentModal(false);
          setCurrentAppointment(null);
          toast.success("Appointment updated successfully!");
        } else {
          console.error('Failed to update appointment:', response.statusText);
          toast.error("Failed to update appointment.");
        }
      } catch (error) {
        console.error('Error saving appointment:', error);
        toast.error("Failed to update appointment.");
      }
    }
  };

  const fetchAppointments = async (accessToken: string, locationId: string, startTime: number, endTime: number) => {
    setLoading(true);
    try {
      let allAppointments: any[] = [];
      let fetchMore = true;
      let nextPageUrl = `https://services.leadconnectorhq.com/calendars/events?locationId=${locationId}&startTime=${startTime}&endTime=${endTime}&userId=1mD58bL7xsPzybyG394Z`;
  
      const maxRetries = 5;
      const baseDelay = 5000;
  
      const fetchData = async (url: string, retries: number = 0): Promise<any> => {
        const options = {
          method: 'GET',
          url: url,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Version: '2021-04-15',
          },
        };
  
        try {
          const response = await axios.request(options);
          console.log(response.data);
          return response;
        } catch (error: any) {
          if (error.response && error.response.status === 429 && retries < maxRetries) {
            const delay = baseDelay * Math.pow(2, retries);
            console.warn(`Rate limit hit, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchData(url, retries + 1);
          } else {
            throw error;
          }
        }
      };
  
      while (fetchMore) {
        const response = await fetchData(nextPageUrl);
        const appointments = response.data.events;
  
        if (appointments.length > 0) {
          allAppointments = [...allAppointments, ...appointments];
          setAppointments([...allAppointments]);
          setLoading(false);
        }
  
        if (response.data.meta.nextPageUrl) {
          nextPageUrl = response.data.meta.nextPageUrl;
        } else {
          fetchMore = false;
        }
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setLoading(false);
    }
  };

  const filteredAppointments = appointments.filter(appointment =>
    appointment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    appointment.notes.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const indexOfLastAppointment = currentPage * appointmentsPerPage;
  const indexOfFirstAppointment = indexOfLastAppointment - appointmentsPerPage;
  const currentAppointments = filteredAppointments.slice(indexOfFirstAppointment, indexOfLastAppointment);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <>
      <div className="grid grid-cols-12 mt-5">
        <div className="flex items-center col-span-12 intro-y sm:flex-nowrap">
          <div className="w-full sm:w-auto sm:mt-0 sm:ml-auto md:ml-0">
            <div className="flex">
              <button className="flex inline p-2 m-2 !box" onClick={() => setAddAppointmentModal(true)}>
                <span className="flex items-center justify-center w-5 h-5">
                  <Lucide icon="Plus" className="w-5 h-5" />
                </span>
                <span className="ml-2 font-medium">Add Appointment</span>
              </button>
              <div className="relative w-full text-slate-500 p-2 mb-3">
                <FormInput
                  type="text"
                  className="relative w-full h-[40px] pr-10 !box text-lg"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Lucide
                  icon="Search"
                  className="absolute inset-y-0 right-5 w-5 h-5 my-auto"
                />
              </div>
              <FormSelect
                className="relative w-full h-[40px] pr-10 !box text-lg"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
              >
                <option value="">Select User</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </FormSelect>
              <div className="flex space-x-2 p-2 mb-3">
                <DatePickerComponent
                  selected={startDate}
                  onChange={(date: Date | null) => date && setStartDate(date)}
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  placeholderText="Start Date"
                  className="relative w-full h-[40px] pr-10 !box text-lg"
                />
                <DatePickerComponent
                  selected={endDate}
                  onChange={(date: Date | null) => date && setEndDate(date)}
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  minDate={startDate}
                  placeholderText="End Date"
                  className="relative w-full h-[40px] pr-10 !box text-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto shadow-md sm:rounded-lg">
        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="p-4">
                <div className="flex items-center">
                  <input
                    id="checkbox-select-all"
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:focus:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    checked={selectAll}
                    onChange={() => setSelectAll(!selectAll)}
                  />
                  <label htmlFor="checkbox-select-all" className="sr-only">
                    Select All
                  </label>
                </div>
              </th>
              <th scope="col" className="px-6 py-3">Title</th>
              <th scope="col" className="px-6 py-3">Address</th>
              <th scope="col" className="px-6 py-3">Start Time</th>
              <th scope="col" className="px-6 py-3">End Time</th>
              <th scope="col" className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentAppointments.map((appointment, index) => (
              <tr
                key={index}
                className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600`}
              >
                <td className="w-4 p-4">
                  <div className="flex items-center">
                    <input
                      id={`checkbox-table-search-${index}`}
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:focus:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      checked={selectedAppointments.some((a) => a.id === appointment.id)}
                      onChange={() => setSelectedAppointments(
                        selectedAppointments.some((a) => a.id === appointment.id)
                          ? selectedAppointments.filter((a) => a.id !== appointment.id)
                          : [...selectedAppointments, appointment]
                      )}
                    />
                    <label htmlFor={`checkbox-table-search-${index}`} className="sr-only">
                      checkbox
                    </label>
                  </div>
                </td>
                <td className="px-6 py-4 font-medium capitalize text-gray-900 whitespace-nowrap dark:text-white">
                  {appointment.title}
                </td>
                <td className="px-6 py-4">{appointment.address}</td>
                <td className="px-6 py-4">{new Date(appointment.startTime).toLocaleString()}</td>
                <td className="px-6 py-4">{new Date(appointment.endTime).toLocaleString()}</td>
                <td className="px-6 py-4">
                  <button className="p-2 m-1 !box" onClick={() => {
                    setCurrentAppointment(appointment);
                    setEditAppointmentModal(true);
                  }}>
                    <span className="flex items-center justify-center w-5 h-5">
                      <Lucide icon="Eye" className="w-5 h-5" />
                    </span>
                  </button>
                  <button className="p-2 m-1 !box text-red-500" onClick={() => {
                    setCurrentAppointment(appointment);
                    setDeleteConfirmationModal(true);
                  }}>
                    <span className="flex items-center justify-center w-5 h-5">
                      <Lucide icon="Trash" className="w-5 h-5" />
                    </span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={addAppointmentModal} onClose={() => setAddAppointmentModal(false)}>
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <Dialog.Panel className="w-full max-w-md p-6 bg-white rounded-md mt-10">
            <div className="flex items-center p-4 border-b">
              <div className="block w-12 h-12 overflow-hidden rounded-full shadow-lg bg-gray-700 flex items-center justify-center text-white mr-4">
                <Lucide icon="User" className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xl">{'Add New Appointment'}</span>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  value={newAppointment.title}
                  onChange={(e) => setNewAppointment({ ...newAppointment, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <input
                  type="text"
                  className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  value={newAppointment.address}
                  onChange={(e) => setNewAppointment({ ...newAppointment, address: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  value={newAppointment.notes}
                  onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Time</label>
                <input
                  type="datetime-local"
                  className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  value={newAppointment.startTime}
                  onChange={(e) => setNewAppointment({ ...newAppointment, startTime: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">End Time</label>
                <input
                  type="datetime-local"
                  className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  value={newAppointment.endTime}
                  onChange={(e) => setNewAppointment({ ...newAppointment, endTime: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Assigned User ID</label>
                <input
                  type="text"
                  className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  value={newAppointment.assignedUserId}
                  onChange={(e) => setNewAppointment({ ...newAppointment, assignedUserId: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                className="px-4 py-2 mr-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                onClick={() => setAddAppointmentModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                onClick={handleSaveNewAppointment}
              >
                Save
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      <ToastContainer />

      <Dialog
        open={deleteConfirmationModal}
        onClose={() => setDeleteConfirmationModal(false)}
        initialFocus={deleteButtonRef}
      >
        <Dialog.Panel>
          <div className="p-5 text-center">
            <Lucide icon="XCircle" className="w-16 h-16 mx-auto mt-3 text-danger" />
            <div className="mt-5 text-3xl">Are you sure?</div>
            <div className="mt-2 text-slate-500">
              Do you really want to delete this appointment? <br />
              This process cannot be undone.
            </div>
          </div>
          <div className="px-5 pb-8 text-center">
            <Button
              variant="outline-secondary"
              type="button"
              onClick={() => setDeleteConfirmationModal(false)}
              className="w-24 mr-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              type="button"
              onClick={handleDeleteAppointment}
              className="w-24"
              ref={deleteButtonRef}
            >
              Delete
            </Button>
          </div>
        </Dialog.Panel>
      </Dialog>

      {isLoading && (
        <div className="fixed top-0 left-0 right-0 bottom-0 flex justify-center items-center bg-opacity-50">
          <div className="items-center absolute top-1/2 left-2/2 transform -translate-x-1/3 -translate-y-1/2 bg-white p-4 rounded-md shadow-lg">
            <div role="status">
              <div className="flex flex-col items-center justify-end col-span-6 sm:col-span-3 xl:col-span-2">
                <LoadingIcon icon="spinning-circles" className="w-8 h-8" />
                <div className="mt-2 text-xs text-center">Fetching Data...</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Main;

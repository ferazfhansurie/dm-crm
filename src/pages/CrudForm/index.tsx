import { ClassicEditor } from "@/components/Base/Ckeditor";

import React, { useState, useEffect } from "react";
import Button from "@/components/Base/Button";
import { getAuth, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider, updateProfile } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useLocation, useNavigate } from 'react-router-dom';
import { FormInput, FormLabel } from "@/components/Base/Form";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { onAuthStateChanged } from "firebase/auth";

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

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  employeeId?: string;
  phoneNumber?: string;
}

function Main() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [categories, setCategories] = useState(["1"]);
  const [groups, setGroups] = useState<string[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { contactId, contact } = location.state ?? {};

  const [companyId, setCompanyId] = useState("");
  const [isAddingNewGroup, setIsAddingNewGroup] = useState(false);
  const [newGroup, setNewGroup] = useState("");

  const [employeeList, setEmployeeList] = useState<Employee[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [filteredEmployeeList, setFilteredEmployeeList] = useState<Employee[]>([]);

  const [phoneOptions, setPhoneOptions] = useState<number[]>([]);
  const [phoneNames, setPhoneNames] = useState<{ [key: number]: string }>({});

  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(firestore, 'user', user.email!);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setCompanyId(userData.companyId);
            setCurrentUserRole(userData.role);
            
            // Fetch employees
            const employeeRef = collection(firestore, `companies/${userData.companyId}/employee`);
            const employeeSnapshot = await getDocs(employeeRef);
            
            const employeeListData: Employee[] = [];
            employeeSnapshot.forEach((doc) => {
              const employeeData = doc.data();
              employeeListData.push({
                id: doc.id,
                name: employeeData.name,
                email: employeeData.email || doc.id,
                role: employeeData.role,
                employeeId: employeeData.employeeId,
                phoneNumber: employeeData.phoneNumber
              });
            });
            
            setEmployeeList(employeeListData);
            
            // Fetch phoneIndex from company document
            fetchPhoneIndex(userData.companyId);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    });

    return () => unsubscribe();
  }, [auth, firestore]);

  useEffect(() => {
    if (companyId) {
      fetchGroups();
    }
  }, [companyId]);

  const [userData, setUserData] = useState<{
    name: string;
    phoneNumber: string;
    email: string;
    password: string;
    role: string;
    companyId: string;
    group: string;
    employeeId: string;
    notes: string;
    quotaLeads: number;
    invoiceNumber: string | null;
    phone: number;
    phone2?: number;
    phone3?: number;
    imageUrl: string;
    weightage: number;
    weightage2?: number;
    weightage3?: number;
    viewEmployees: string[];
    viewEmployee: string | null;
  }>({
    name: "",
    phoneNumber: "",
    email: "",
    password: "",
    role: "",
    companyId: "",
    group: "",
    employeeId: "",
    notes: "",
    quotaLeads: 0,
    invoiceNumber: null,
    phone: 0,
    imageUrl: "",
    weightage: 0,
    viewEmployees: [],
    viewEmployee: null,
  });

  useEffect(() => {
    const fetchUserData = async () => {
      if (contact && contact.id) {
        try {
          const userDocRef = doc(firestore, 'user', contact.id);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            const firebaseUserData = userDocSnap.data();
            
            const userData = {
              name: firebaseUserData.name || "",
              phoneNumber: firebaseUserData.phoneNumber ? firebaseUserData.phoneNumber.split('+6')[1] ?? "" : "",
              email: contact.id,
              password: "",
              role: firebaseUserData.role || "",
              companyId: firebaseUserData.companyId || "",
              group: firebaseUserData.group || "",
              employeeId: firebaseUserData.employeeId || "",
              notes: firebaseUserData.notes || "",
              quotaLeads: firebaseUserData.quotaLeads || 0,
              invoiceNumber: firebaseUserData.invoiceNumber || null,
              phone: firebaseUserData.phone,
              phone2: firebaseUserData.phone2,
              phone3: firebaseUserData.phone3,
              imageUrl: firebaseUserData.imageUrl || "",
              weightage: firebaseUserData.weightage,
              weightage2: firebaseUserData.weightage2,
              weightage3: firebaseUserData.weightage3,
              viewEmployees: firebaseUserData.viewEmployees || [],
              viewEmployee: firebaseUserData.viewEmployee || null,
            };

            
            setUserData(userData);
            setSelectedEmployees(firebaseUserData.viewEmployees || []);
            setCategories([firebaseUserData.role]);
          } else {
            
          }
        } catch (error) {
          console.error("Error fetching user data from Firebase:", error);
        }
      }
    };

    fetchUserData();
    fetchGroups();
  }, [contact, companyId, firestore]);

  const fetchGroups = async () => {
    if (!companyId) {
      
      return;
    }
    
    try {
      const employeeCollectionRef = collection(firestore, `companies/${companyId}/employee`);
      const employeeSnapshot = await getDocs(employeeCollectionRef);
      const uniqueGroups = new Set<string>();
      employeeSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.group) {
          uniqueGroups.add(data.group);
        }
      });
      const groupsArray = Array.from(uniqueGroups);
      
      setGroups(groupsArray);
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  };

  const fetchPhoneIndex = async (companyId: string) => {
    try {
      const companyDocRef = doc(firestore, 'companies', companyId);
      const companyDocSnap = await getDoc(companyDocRef);
      if (companyDocSnap.exists()) {
        const companyData = companyDocSnap.data();
        const phoneCount = companyData.phoneCount || 0;
        
        
        // Generate phoneNames object
        const phoneNamesData: { [key: number]: string } = {};
        for (let i = 0; i < phoneCount; i++) {
          const phoneName = companyData[`phone${i + 1}`];
          if (phoneName) {
            phoneNamesData[i] = phoneName;
          } else {
            // Use default name if not found
            phoneNamesData[i] = `Phone ${i + 1}`;
          }
        }
        
        setPhoneNames(phoneNamesData);
        setPhoneOptions(Object.keys(phoneNamesData).map(Number));
      }
    } catch (error) {
      console.error("Error fetching phone count:", error);
      setPhoneOptions([]);
      setPhoneNames({});
    }
  };

  const handleChange = (e: { target: { name: any; value: any; }; }) => {
    const { name, value } = e.target;
    setUserData(prev => {
      const newData = { ...prev, [name]: value };
      
      // Reset phone to -1 if role is not "2" (Sales)
      if (name === 'role' && value !== "2") {
        newData.phone = -1;
      }
      
      return newData;
    });
  };

  const handleAddNewGroup = () => {
    setIsAddingNewGroup(true);
  };

  const handleCancelNewGroup = () => {
    setIsAddingNewGroup(false);
    setNewGroup("");
  };

  const handleSaveNewGroup = () => {
    if (newGroup.trim()) {
      setGroups(prev => [...prev, newGroup.trim()]);
      setUserData(prev => ({ ...prev, group: newGroup.trim() }));
      setIsAddingNewGroup(false);
      setNewGroup("");
    }
  };

  const handleGoBack = () => {
    window.history.back();
  };

  const handleEditorChange = (data: string) => {
    setUserData(prev => ({ ...prev, notes: data }));
  };

  const isFieldDisabled = (fieldName: string) => {
    if (currentUserRole === "1") return false; // Admin (role 1) can edit everything
    if (currentUserRole === "3") return fieldName !== "password"; // Observer can only edit password
    if (fieldName === "role") return false; // Allow role changes for non-admin users
    return userData.role === "3"; // For other roles, they can't edit users with role 3
  };

  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    const requiredFields = ['name', 'phoneNumber', 'email', 'role'];
    
    // Only require password for new users
    if (!contactId) {
      requiredFields.push('password');
    }
    
    requiredFields.forEach(field => {
      if (!userData[field as keyof typeof userData]) {
        errors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
      }
    });

    // Password validation
    if (userData.password && userData.password.length < 6) {
      errors.password = "Password must be at least 6 characters long";
    }
  
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const uploadImage = async () => {
    if (!imageFile) return null;
    const storage = getStorage(app);
    const storageRef = ref(storage, `${imageFile.name}`);
    await uploadBytes(storageRef, imageFile);
    return getDownloadURL(storageRef);
  };

  const handleEmployeeSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    // Get all selected options (can be empty if user deselects all)
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setSelectedEmployees(selectedOptions);
    
    // Update both viewEmployees (array) and viewEmployee (used by Chat component)
    setUserData(prev => ({ 
      ...prev, 
      viewEmployees: selectedOptions,
      // If no employees are selected, set viewEmployee to null
      // Otherwise use the first selected employee
      // This ensures both fields are consistent for the Chat component
      viewEmployee: selectedOptions.length > 0 ? selectedOptions[0] : null
    }));
  };

  const saveUser = async () => {
    if (!validateForm()) return;

    try {
      setIsLoading(true);
      const userOri = auth.currentUser;
      if (!userOri || !userOri.email) {
        setErrorMessage("No authenticated user found. Please log in again.");
        return;
      }

      // Check if the user is updating their own profile
      const isUpdatingSelf = userOri.email === userData.email;

      if (isUpdatingSelf && userData.password) {
        try {
          await updatePassword(userOri, userData.password);
        } catch (error: any) {
          if (error.code === 'auth/requires-recent-login') {
            setErrorMessage("For security reasons, please log out and log in again to change your password.");
          } else {
            setErrorMessage(`Password update failed: ${error.message}`);
          }
          setIsLoading(false);
          return;
        }
      }

      let imageUrl = userData.imageUrl;
      if (imageFile) {
        try {
          imageUrl = await uploadImage() || "";
        } catch (error: any) {
          setErrorMessage(`Failed to upload image: ${error.message}`);
          setIsLoading(false);
          return;
        }
      }

      if (currentUserRole !== "3" || isUpdatingSelf) {
        const docUserRef = doc(firestore, 'user', userOri.email);
        const docUserSnapshot = await getDoc(docUserRef);
        const dataUser = docUserSnapshot.data();
        const companyId = dataUser!.companyId;
        const company = dataUser!.company;
        const docRef = doc(firestore, 'companies', companyId);
        const docSnapshot = await getDoc(docRef);
        if (!docSnapshot.exists()) {
          return;
        }
        const data2 = docSnapshot.data();
        const baseUrl = data2.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';
        const formatPhoneNumber = (phoneNumber: string) => {
          return phoneNumber && !phoneNumber.startsWith('+') ? "+6" + phoneNumber : phoneNumber;
        };

        const companyDocRef = doc(firestore, 'companies', companyId);
        const companyDocSnap = await getDoc(companyDocRef);
        const companyData = companyDocSnap.data();
        const phoneCount = companyData?.phoneCount || 0;

        const userDataToSend = {
          name: userData.name,
          phoneNumber: formatPhoneNumber(userData.phoneNumber),
          email: userData.email,
          role: userData.role,
          companyId: companyId,
          company: company,
          group: userData.group,
          employeeId: userData.employeeId || null,
          notes: userData.notes || null,
          quotaLeads: userData.quotaLeads || 0,
          invoiceNumber: userData.invoiceNumber || null,
          phone: 0,
          weightage: Number(userData.weightage) || 0,
          ...(Object.keys(phoneNames).reduce((acc, index) => {
            const phoneIndex = parseInt(index);
            if (phoneIndex > 1) {
              const phoneField = `phone${phoneIndex}`;
              const weightageField = `weightage${phoneIndex}`;
              acc[phoneField] = phoneIndex;
              acc[weightageField] = Number(userData[weightageField as keyof typeof userData]) || 0;
            }
            return acc;
          }, {} as Record<string, any>)),
          imageUrl: imageUrl || "",
          viewEmployees: userData.viewEmployees || [],
          viewEmployee: userData.viewEmployee || null,
        };

        if (contactId) {
          // Updating existing user
          await updateDoc(doc(firestore, `companies/${companyId}/employee`, contactId), userDataToSend);
          await updateDoc(doc(firestore, 'user', userData.email), userDataToSend);
          toast.success("User updated successfully");
        } else {
          // Adding new user
          
          const response = await fetch(`${baseUrl}/api/create-user/${userData.email}/${formatPhoneNumber(userData.phoneNumber)}/${userData.password}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
          });

          if (!response.ok) {
            const errorData = await response.json();
            // Handle specific API error messages
            if (errorData.error === 'auth/phone-number-already-exists') {
              throw new Error('This phone number is already registered. Please use a different phone number.');
            } else if (errorData.error.includes('phone-number')) {
              throw new Error(`Phone number error: ${errorData.error}`);
            }
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
          }

          const responseData = await response.json();
          
          if (responseData.message === 'User created successfully') {
            await setDoc(doc(firestore, 'user', userData.email), userDataToSend);
            await setDoc(doc(firestore, `companies/${companyId}/employee`, userData.email), userDataToSend);
            toast.success("User created successfully");
            setUserData({
              name: "",
              phoneNumber: "",
              email: "",
              password: "",
              role: "",
              companyId: "",
              group: "",
              employeeId: "",
              notes: "",
              quotaLeads: 0,
              invoiceNumber: null,
              phone: -1,
              imageUrl: "",
              weightage: 0,
              viewEmployees: [],
              viewEmployee: null,
            });
        
            const roleMap = {
              "1": "Admin",
              "2": "Sales",
              "3": "Observer",
              "4": "Manager",
              "5": "Supervisor"
            };
      
            const message = `Hi ${userData.name},\n\nYou're successfully registered as a Staff - ${roleMap[userData.role as keyof typeof roleMap]} in our system.\nHere's your registered information:\n\nPhone Number: ${userData.phoneNumber}\nEmail: ${userData.email}\nRole: ${roleMap[userData.role as keyof typeof roleMap]}\n${userData.employeeId ? `Employee ID: ${userData.employeeId}\n` : ''}\nPassword: ${userData.password || '[Not changed]'}`;
      
            let url;
            let requestBody;
            let formattedPhone = userData.phoneNumber.replace(/[^\d]/g, '');
            if (!formattedPhone.startsWith('6')) {
              formattedPhone = '6' + formattedPhone;
            }
            formattedPhone += '@c.us';
            
              url = `${baseUrl}/api/v2/messages/text/${companyId}/${formattedPhone}`;
              requestBody = { 
                message,
                phoneIndex: 0, // Include phoneIndex in the request body
              };
      
     
      
            console.log('Full request details:', {
              url,
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestBody)
            });
      
            // Send WhatsApp message to the user
            const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestBody),
            });
      
            if (!response.ok) {
              const errorText = await response.text();
              console.error('Error response:', response.status, errorText);
              throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }
          } else {
            throw new Error(responseData.error || 'Unknown error occurred while creating user');
          }
        }
      
  
        setSuccessMessage(contactId ? "User updated successfully" : "User created successfully");
      }

      setErrorMessage('');
      setIsLoading(false);
      navigate('/users-layout-2');
    } catch (error: any) {
      console.error("Error saving user:", error);
      // Enhanced error message handling
      if (error.code === 'auth/email-already-in-use') {
        setErrorMessage('This email is already registered. Please use a different email.');
      } else if (error.code === 'auth/invalid-email') {
        setErrorMessage('The email address is not valid.');
      } else if (error.code === 'auth/weak-password') {
        setErrorMessage('The password is too weak. Please use at least 6 characters.');
      } else if (error.code === 'auth/phone-number-already-exists' || error.message.includes('phone number is already registered')) {
        setErrorMessage('This phone number is already registered. Please use a different phone number.');
      } else if (error.message.includes('Firebase')) {
        setErrorMessage(`Authentication error: ${error.message.replace('Firebase: ', '')}`);
      } else if (error.message.includes('Network')) {
        setErrorMessage('Network error. Please check your internet connection.');
      } else {
        // Clean up the error message by removing any technical prefixes
        const cleanErrorMessage = error.message
          .replace('Error: ', '')
          .replace('auth/', '')
          .replace(/-/g, ' ')
          .trim();
        setErrorMessage(`Error: ${cleanErrorMessage}`);
      }
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  const editorConfig = {
    toolbar: {
      items: [
        "bold",
        "italic",
        "link",
        "bulletedList",
        "numberedList",
        "blockQuote",
        "insertTable",
        "undo",
        "redo",
        "heading",
        "alignment",
        "fontColor",
        "fontSize",
      ],
    },
  };

  const [editorData, setEditorData] = useState("<p>Content of the editor.</p>");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Filter employees based on role hierarchy
    const filterEmployeesByRole = () => {
      if (!currentUserRole || !employeeList) return;
      
      const roleHierarchy: { [key: string]: number } = {
        "1": 5, // Admin - highest level
        "4": 4, // Manager
        "5": 3, // Supervisor
        "2": 2, // Sales
        "3": 1  // Observer - lowest level
      };

      const currentRoleLevel = roleHierarchy[currentUserRole];
      
      const filtered = employeeList.filter(employee => {
        const employeeRoleLevel = roleHierarchy[employee.role];
        return employeeRoleLevel < currentRoleLevel;
      });

      setFilteredEmployeeList(filtered);
    };

    filterEmployeesByRole();
  }, [currentUserRole, employeeList]);

  return (
    <div className="w-full px-4 py-6 h-full flex flex-col">
      <div className="flex items-center mb-2">
        <h2 className="text-2xl font-semibold">
          {contactId ? "Update User" : "Add User"}
        </h2>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex-grow overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FormLabel htmlFor="name">Name *</FormLabel>
            <FormInput
              id="name"
              name="name"
              type="text"
              value={userData.name}
              onChange={handleChange}
              placeholder="Name"
              disabled={isFieldDisabled("name")}
              required
            />
            {fieldErrors.name && <p className="text-red-500 text-sm mt-1">{fieldErrors.name}</p>}
          </div>
          <div>
            <FormLabel htmlFor="phoneNumber">Phone Number *</FormLabel>
            <div className="flex">
              <FormInput
                id="phoneNumber"
                name="phoneNumber"
                type="text"
                value={userData.phoneNumber}
                onChange={handleChange}
                placeholder="+60123456789"
                className="flex-grow"
                disabled={isFieldDisabled("phoneNumber")}
                required
              />
            </div>
            {fieldErrors.phoneNumber && <p className="text-red-500 text-sm mt-1">{fieldErrors.phoneNumber}</p>}
          </div>
          <div>
            <FormLabel htmlFor="email">Email *</FormLabel>
            <FormInput
              id="email"
              name="email"
              type="text"
              value={userData.email}
              onChange={handleChange}
              placeholder="Email"
              disabled={isFieldDisabled("email")}
              required
            />
            {fieldErrors.email && <p className="text-red-500 text-sm mt-1">{fieldErrors.email}</p>}
          </div>
          <div>
            <FormLabel htmlFor="group">Group</FormLabel>
            {isAddingNewGroup ? (
              <div className="flex items-center">
                <FormInput
                  type="text"
                  value={newGroup}
                  onChange={(e) => setNewGroup(e.target.value)}
                  placeholder="Enter new group name"
                  className="w-full mr-2"
                  disabled={isFieldDisabled("group")}
                />
                <Button
                  type="button"
                  variant="outline-secondary"
                  className="mr-2"
                  onClick={handleCancelNewGroup}
                  disabled={isFieldDisabled("group")}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSaveNewGroup}
                  disabled={isFieldDisabled("group")}
                >
                  Save
                </Button>
              </div>
            ) : (
              <div className="flex items-center">
                <select
                  id="group"
                  name="group"
                  value={userData.group}
                  onChange={handleChange}
                  className="text-black dark:text-white border-primary dark:border-primary-dark bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700 rounded-lg text-sm w-full mr-2 p-2.5"
                  disabled={isFieldDisabled("group")}
                >
                  <option value="">Select a group</option>
                  {groups.map((group) => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline-secondary"
                  onClick={handleAddNewGroup}
                  className="dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700 inline-flex items-center whitespace-nowrap"
                  disabled={isFieldDisabled("group")}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                  Add New Group
                </Button>
              </div>
            )}
          </div>
          <div>
            <FormLabel htmlFor="role">Role *</FormLabel>
            <select
              id="role"
              name="role"
              value={userData.role}
              onChange={(e) => {
                const newRole = e.target.value;
                if (currentUserRole !== "1" && newRole === "1") {
                  // Prevent non-admin users from selecting admin role
                  toast.error("You don't have permission to assign admin role.");
                  return;
                }
                handleChange(e);
                setCategories([newRole]);
              }}
              className="text-black dark:text-white border-primary dark:border-primary-dark bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700 rounded-lg text-sm w-full"
              disabled={isFieldDisabled("role")}
              required
            >
              <option value="">Select role</option>
              {currentUserRole === "1" && <option value="1">Admin</option>}
              {currentUserRole === "1" && <option value="4">Manager</option>}
              {currentUserRole === "1" && <option value="5">Supervisor</option>}
              {currentUserRole === "4" && <option value="4">Manager</option>}
              {currentUserRole === "5" && <option value="5">Supervisor</option>}
              <option value="2">Sales</option>
              <option value="3">Observer</option>
            </select>
            {fieldErrors.role && <p className="text-red-500 text-sm mt-1">{fieldErrors.role}</p>}
          </div>
          {auth.currentUser?.email === userData.email && currentUserRole !== "3" && currentUserRole !== "2" && (
            <div>
              <FormLabel htmlFor="viewEmployees">View Employee's Chats</FormLabel>
              <select
                id="viewEmployees"
                name="viewEmployees"
                multiple
                value={selectedEmployees}
                onChange={handleEmployeeSelection}
                className="text-black dark:text-white border-primary dark:border-primary-dark bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700 rounded-lg text-sm w-full"
                size={5}
              >
                {filteredEmployeeList.map((employee) => (
                  <option key={employee.id} value={employee.email}>
                    {employee.name} - {employee.role === "2" ? "Sales" : 
                                     employee.role === "3" ? "Observer" : 
                                     employee.role === "4" ? "Manager" : 
                                     employee.role === "5" ? "Supervisor" : "Admin"}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple employees or deselect all employees</p>
            </div>
          )}
          <div>
            <FormLabel htmlFor="phone">Phone</FormLabel>
            <select
              id="phone"
              name="phone"
              value={userData.phone}
              onChange={handleChange}
              className="text-black dark:text-white border-primary dark:border-primary-dark bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700 rounded-lg text-sm w-full"
              disabled={isFieldDisabled("phone") || (currentUserRole !== "1" && userData.role !== "2")}
            >
              <option value="">Select a phone</option>
              {Object.entries(phoneNames).map(([index, phoneName]) => (
                <option key={index} value={parseInt(index) - 1}>
                  {phoneName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FormLabel htmlFor="image">Profile Image</FormLabel>
            <input
              type="file"
              id="image"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
            {userData.imageUrl && (
              <img
                src={userData.imageUrl}
                alt="Profile"
                className="mt-2 w-32 h-32 object-cover rounded-full"
              />
            )}
          </div>
          <div>
            <FormLabel htmlFor="password">Password {contactId ? '(Leave blank to keep current)' : '*'}</FormLabel>
            <FormInput
              id="password"
              name="password"
              type="password"
              value={userData.password}
              onChange={handleChange}
              placeholder={contactId ? "New password (optional)" : "Password"}
              disabled={isFieldDisabled("password") || (contactId && userData.email !== auth.currentUser?.email)}
              required={!contactId}
            />
            {fieldErrors.password && <p className="text-red-500 text-sm mt-1">{fieldErrors.password}</p>}
          </div>
          <div>
            <FormLabel htmlFor="employeeId">Employee ID</FormLabel>
            <FormInput
              id="employeeId"
              name="employeeId"
              type="text"
              value={userData.employeeId}
              onChange={handleChange}
              placeholder="Employee ID (optional)"
              disabled={isFieldDisabled("employeeId")}
            />
          </div>
          <div>
            <FormLabel htmlFor="quotaLeads">Quota Leads</FormLabel>
            <FormInput
              id="quotaLeads"
              name="quotaLeads"
              type="number"
              value={userData.quotaLeads}
              onChange={(e) => setUserData(prev => ({ ...prev, quotaLeads: parseInt(e.target.value) || 0 }))}
              placeholder="Number of quota leads"
              min="0"
              disabled={isFieldDisabled("quotaLeads")}
            />
          </div>
          <div>
            <FormLabel htmlFor="invoiceNumber">Invoice Number</FormLabel>
            <FormInput
              id="invoiceNumber"
              name="invoiceNumber"
              type="text"
              value={userData.invoiceNumber || ""}
              onChange={(e) => setUserData(prev => ({ ...prev, invoiceNumber: e.target.value || null }))}
              placeholder="Invoice Number (optional)"
              disabled={isFieldDisabled("invoiceNumber")}
            />
          </div>
    
        </div>
        <div className="mt-4">
          <FormLabel htmlFor="notes">Notes</FormLabel>
          <div className="relative rounded-lg focus:ring-2 focus:ring-primary dark:focus:ring-primary-dark focus:border-transparent">
            <ClassicEditor
              value={userData.notes}
              onChange={handleEditorChange}
              config={editorConfig}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent"
              disabled={isFieldDisabled("notes")}
            />
          </div>
        </div>
        {currentUserRole === "1" && phoneOptions.length > 0 && (
  <>
    {Object.entries(phoneNames).map(([index, phoneName]) => {
      // Map the field names correctly - first weightage has no number
      const phoneField = index === '1' ? 'phone' : `phone${index}`;
      const weightageField = index === '1' ? 'weightage' : `weightage${index}`;
      
       // Debug log
      
      // Get the correct weightage value based on the field name
      const weightageValue = userData[weightageField as keyof typeof userData];
       // Debug log
      
      return (
        <div key={index} className="grid grid-cols-2 gap-4">
          <div>
            <FormLabel htmlFor={weightageField}>
              Weightage for {phoneName}
            </FormLabel>
            <FormInput
              id={weightageField}
              name={weightageField}
              type="number"
              value={weightageValue ?? 0}
              onChange={handleChange}
              placeholder="Weightage"
              min="0"
            />
            <input 
              type="hidden" 
              name={phoneField} 
              value={index}
            />
          </div>
        </div>
      );
    })}
  </>
)}
        {errorMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{errorMessage}</span>
          </div>
        )}
        {successMessage && <div className="text-green-500 mt-4">{successMessage}</div>}
      </div>
      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          variant="outline-secondary"
          className="w-24 mr-4"
          onClick={handleGoBack}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          className="w-24"
          onClick={saveUser}
          disabled={isLoading || (currentUserRole === "3" && !userData.password)}
        >
          {isLoading ? "Saving..." : "Save"}
        </Button>
      </div>
      <ToastContainer />
    </div>
  );
}

export default Main;
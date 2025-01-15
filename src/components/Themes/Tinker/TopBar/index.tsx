import { useState, Fragment } from "react";
import React, { useEffect, useRef } from "react";
import { JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal} from "react";
import Lucide from "@/components/Base/Lucide";
import Breadcrumb from "@/components/Base/Breadcrumb";
import { FormInput } from "@/components/Base/Form";
import { Menu, Popover } from "@/components/Base/Headless";
import fakerData from "@/utils/faker";
import _ from "lodash";
import clsx from "clsx";
import { Transition } from "@headlessui/react";
import { Link } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth"; // Import the signOut method
import { initializeApp } from 'firebase/app';
import { DocumentData, DocumentReference, getDoc, getDocs } from 'firebase/firestore';
import { getFirestore, collection, doc, setDoc, DocumentSnapshot } from 'firebase/firestore';
import { useNavigate } from "react-router-dom"; // Add this import

// Initialize Firebase app
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

let companyId = '014';
let companyName = '';
let userName = '';
let userEmail = '';
let ghlConfig = {
  ghl_id: '',
  ghl_secret: '',
  ghl_refreshToken: '',
};
let role = 2;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

const handleSignOut = () => {
  signOut(auth)
    .then(() => {
      
      localStorage.removeItem('contacts'); // Clear contacts from localStorage
      sessionStorage.removeItem('contactsFetched'); // Clear the session marker

    })
    .catch((error) => {
      console.error("Error signing out:", error);
    });
};

function Main() {
  const [searchDropdown, setSearchDropdown] = useState(false);
  const [whapiToken, setToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [userName, setUserName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredNotifications = notifications.filter((notification) => {
    return (
      notification.from_name.toLowerCase().includes(searchQuery) ||
      (notification.text && notification.text.body.toLowerCase().includes(searchQuery))
    );
  });

  const navigate = useNavigate(); // Initialize useNavigate

  const handleNotificationClick = (chatId: any) => {
    navigate(`/chat/?chatId=${chatId}`);
  };

  const showSearchDropdown = () => {
    setSearchDropdown(true);
  };

  const hideSearchDropdown = () => {
    setSearchDropdown(false);
  };

  useEffect(() => {
    fetchConfigFromDatabase();
  }, []);


  async function fetchConfigFromDatabase() {
    const user = auth.currentUser;
  
    if (!user) {
      console.error("No user is currently authenticated.");
      return;
    }
  
    const userEmail = user.email;
    setUserEmail(userEmail || "");
  
    if (!userEmail) {
      console.error("Authenticated user has no email.");
      return;
    }
  
    try {
      const docUserRef = doc(firestore, 'user', userEmail);
      const docUserSnapshot = await getDoc(docUserRef);
      if (!docUserSnapshot.exists()) {
        return;
      }
      const dataUser = docUserSnapshot.data();
      if (!dataUser) {
        return;
      }
  
      setUserName(dataUser.name);
      companyId = dataUser.companyId;
      role = dataUser.role;
  
      if (!companyId) {
        return;
      }
  
      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) {
        return;
      }
      const data = docSnapshot.data();
      if (!data) {
        console.error("No data found in company document.");
        return;
      }
  
      setCompanyName(data.companyName); // Set companyName
  

    } catch (error) {
      console.error('Error fetching config:', error);
      throw error;
    }
  }


  return (
    <>
      {/* BEGIN: Top Bar */}
      <div className="relative flex h-[67px] items-center border-b border-slate-200">
        {/* BEGIN: Breadcrumb */}
        <Breadcrumb className="hidden mr-auto -intro-x sm:flex text-slate-600">
          <h2 className="mr-5 text-lg font-medium truncate">
            Hello {userName}!
          </h2>
        </Breadcrumb>
        {/* END: Breadcrumb */}
        {/* BEGIN: Notifications  */}
        <div>
          <Menu>
            <Menu.Button className="block w-8 h-8 overflow-hidden rounded-full shadow-lg bg-gray-700 flex items-center justify-center text-white mr-4">
              <Lucide icon="Bell" className="w-5 h-5" />
            </Menu.Button>
            <Menu.Items className="w-auto mt-2 mr-8 text-white bg-primary">
              <Menu.Header className="font-normal">
                <div className="font-medium text-lg">Notifications</div>
              </Menu.Header>

              <div className="mt-2 pl-2 pr-2 h-64 overflow-y-auto"> {/* Set height and enable scrolling */}
                {filteredNotifications && filteredNotifications.length > 0 ? (
                  filteredNotifications.reduce((uniqueNotifications, notification) => {
                    const existingNotificationIndex = uniqueNotifications.findIndex(
                      (n: { chat_id: any; }) => n.chat_id === notification.chat_id
                    );
                    if (existingNotificationIndex !== -1) {
                      // If a notification with the same chat_id exists, replace it with the new one
                      uniqueNotifications[existingNotificationIndex] = notification;
                    } else {
                      // Otherwise, add the new notification
                      uniqueNotifications.push(notification);
                    }
                    return uniqueNotifications;
                  }, []).sort((a: { timestamp: number; }, b: { timestamp: number; }) => b.timestamp - a.timestamp).map((notification: { chat_id: any; from_name: string; text: { body: string | number | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | null | undefined; }; timestamp: number; }, key: Key | null | undefined) => (
                    <div key={key} className="w-100">
                      <div
                        className="flex items-center mb-2 box hover:bg-blue-100 zoom-in w-70 cursor-pointer"
                        onClick={() => handleNotificationClick(notification.chat_id)}
                      >
                        <div className="p-2 pl-1 ml-2" >
                          <div className="text-s font-medium text-slate-800 truncate capitalize">{notification.from_name}</div>
                          <div className="text-base text-xs text-slate-500">{notification.text ? notification.text.body : ""}</div>
                          <div className="text-slate-500 text-xs mt-0.5">
                            {new Date(notification.timestamp * 1000).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-slate-500">No messages available</div>
                )}
              </div>
            </Menu.Items>
          </Menu>
        </div>
        {/* END: Notifications  */}
        {/* BEGIN: Account Menu */}
        <Menu>
          <Menu.Button className="block w-8 h-8 overflow-hidden rounded-full shadow-lg bg-gray-700 flex items-center justify-center text-white">
          <Lucide icon="Settings" className="w-5 h-5" />
          </Menu.Button>
          <Menu.Items className="w-auto mt-2 mr-4 text-white bg-primary">
            <Menu.Header>
              <div className="font-medium">{userEmail}</div>
            </Menu.Header>
        
            <Menu.Divider className="bg-white/[0.08]" />
            <Menu.Item className="hover:bg-white/5">
              <Link to="/client-ticket">
                <Lucide icon="Ticket" className="w-4 h-4 mr-2" /> Client Ticket
              </Link>
            </Menu.Item>
            <Menu.Item className="hover:bg-white/5" >
              {/* Logout link with sign out function */}
              <Link to="/login" onClick={handleSignOut}>
                <Lucide icon="ToggleRight" className="w-4 h-4 mr-2" /> Logout
              </Link>
            </Menu.Item>
          </Menu.Items>
        </Menu>
      </div>
      {/* END: Top Bar */}
    </>
  );
}

export default Main;
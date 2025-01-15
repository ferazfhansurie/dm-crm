import "@/assets/css/themes/tinker/side-nav.css";
import { Transition as HeadlessTransition } from '@headlessui/react';
import { useState, useEffect, ReactElement, JSXElementConstructor, ReactNode, ReactPortal, Key, useCallback, useRef } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { selectMenu } from "@/stores/menuSlice";
import { useAppSelector } from "@/stores/hooks";
import { FormattedMenu, linkTo, nestedMenu, enter, leave } from "./simple-menu";
import Lucide from "@/components/Base/Lucide";
import Tippy from "@/components/Base/Tippy";
import logoUrl from "@/assets/images/logo.png";
import clsx from "clsx";
import TopBar from "@/components/Themes/Tinker/TopBar";
import MobileMenu from "@/components/MobileMenu";
import { Menu, Popover } from "@/components/Base/Headless";
import { getAuth, signOut } from "firebase/auth"; // Import the signOut method
import { initializeApp } from 'firebase/app';
import { DocumentData, DocumentReference, getDoc, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import { getFirestore, collection, doc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { useMediaQuery } from 'react-responsive';

function Main() {
  const location = useLocation();
  const [formattedMenu, setFormattedMenu] = useState<Array<FormattedMenu | "divider">>([]);
  const menuStore = useAppSelector(selectMenu("simple-menu"));
  const menu = () => nestedMenu(menuStore, location);
  const [searchDropdown, setSearchDropdown] = useState(false);
  const [whapiToken, setToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [userName, setUserName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const prevNotificationsRef = useRef<number | null>(null);
  const isInitialMount = useRef(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [uniqueNotifications, setUniqueNotifications] = useState<Notification[]>([]);
  const [company, setCompany] = useState("");
  const [showMobileMenu, setShowMobileMenu] = useState(true);
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [activeTab, setActiveTab] = useState('notifications');
  const [scheduledMessages, setScheduledMessages] = useState<any[]>([]);
  const [userData, setUserData] = useState<any>(null);
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

let ghlConfig = {
  ghl_id: '',
  ghl_secret: '',
  ghl_refreshToken: '',
};
let role = 2;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

const navigate = useNavigate(); // Initialize useNavigate

const handleNotificationClick = (chatId: string,index: number) => {
  setNotifications(notifications.filter((_, i) => i !== index));
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

useEffect(() => {
  fetchScheduledMessages();
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

    setCompanyName(dataUser.company); // Set company
  } catch (error) {
    console.error('Error fetching config:', error);
    throw error;
  }
}

async function fetchScheduledMessages() {
  const user = auth.currentUser;
  if (!user || !user.email) return;

  try {
    const docUserRef = doc(firestore, 'user', user.email!);
    const docUserSnapshot = await getDoc(docUserRef);
    if (!docUserSnapshot.exists()) return;

    const userData = docUserSnapshot.data();
    const companyId = userData.companyId;
    const scheduledMessagesRef = collection(firestore, `companies/${companyId}/scheduledMessages`);
    const scheduledMessagesSnapshot = await getDocs(scheduledMessagesRef);
    const messages = scheduledMessagesSnapshot.docs.map(doc => doc.data());
    setScheduledMessages(messages);
  } catch (error) {
    console.error('Error fetching scheduled messages:', error);
  }
}


const clearAllNotifications = async () => {
  const user = auth.currentUser;
  if (!user || !user.email) return;

  try {
    const notificationsRef = collection(firestore, 'user', user.email, 'notifications');
    const notificationsSnapshot = await getDocs(notificationsRef);
    
    const deletePromises = notificationsSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    setNotifications([]);
    setUniqueNotifications([]);
  } catch (error) {
    console.error('Error clearing notifications:', error);
  }
};

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

  const isMobile = useMediaQuery({ maxWidth: 767 });

  const toggleSideMenu = () => {
    setShowSideMenu(!showSideMenu);
  };

  const handleMenuItemClick = useCallback((menu: FormattedMenu) => {
    linkTo(menu, navigate);
    setFormattedMenu([...formattedMenu]);
    if (isMobile) {
      setShowSideMenu(false);
    }
  }, [isMobile, navigate, formattedMenu]);

  useEffect(() => {
    const filteredMenu = menu().filter((item) => {
      if (isMobile) {
        return item !== 'divider' && (item as FormattedMenu).title !== 'Assistants' && (item as FormattedMenu).title !== 'Opportunities';
      }
      return true;
    });
    setFormattedMenu(filteredMenu);
  }, [menuStore, location.pathname, isMobile]);

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user && user.email) {
        const userDocRef = doc(firestore, 'user', user.email);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setUserData(userDocSnap.data());
        }
      }
    };

    fetchUserData();
  }, []);

  return (
    <div className="tinker h-screen flex flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* BEGIN: Simple Menu */}
        <nav className={`pt-5 pl-1 pr-2 side-nav side-nav--simple ${isMobile ? (showSideMenu ? 'block' : 'hidden') : 'flex md:flex'} flex-col justify-between sm:w-[50px] md:w-[50px] xl:w-[50px] z-100 bg-slate-300 dark:bg-gray-800`}>
          <ul className="space-y-2 flex-grow">
            {/* BEGIN: First Child */}
            {formattedMenu.map((menu, menuKey) =>
              menu == "divider" ? (
                <li className="my-2 side-nav__divider" key={menuKey}></li>
              ) : (
                <li key={menuKey}>
                  <Tippy
                    as="a"
                    content={menu.title}
                    options={{
                      placement: "left",
                    }}
                    href={menu.subMenu ? "#" : menu.pathname}
                    onClick={(event: React.MouseEvent) => {
                      event.preventDefault();
                      handleMenuItemClick(menu);
                    }}
                    className={clsx([
                      "flex items-center p-2 rounded hover:bg-slate-400 dark:hover:bg-gray-700",
                      menu.active ? "bg-slate-400 dark:bg-gray-700 text-slate-200 dark:text-gray-200 font-medium" : "",
                    ])}
                  >
                    <div className="text-left w-10 h-6 m-0 flex items-center justify-between">
                      <Lucide icon={menu.icon} className="text-slate-900 dark:text-gray-200 hover:text-slate-900 dark:hover:text-gray-200" />
                    </div>
                  </Tippy>
                  {/* BEGIN: Second Child */}
                  {menu.subMenu && (
                    <HeadlessTransition
                      show={menu.activeDropdown}
                      enter="transition ease-out duration-300"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-300"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <ul
                        className={clsx({
                          "side-menu__sub-open": menu.activeDropdown,
                        })}
                      >
                        {menu.subMenu.map((subMenu, subMenuKey) => (
                          <li key={subMenuKey}>
                            <Tippy
                              as="a"
                              content={subMenu.title}
                              options={{
                                placement: "left",
                              }}
                              href={subMenu.subMenu ? "#" : subMenu.pathname}
                              onClick={(event: React.MouseEvent) => {
                                event.preventDefault();
                                linkTo(subMenu, navigate);
                                setFormattedMenu([...formattedMenu]);
                              }}
                              className={clsx([
                                "flex items-center p-1 my-1 rounded hover:bg-slate-400 dark:hover:bg-gray-700",
                                subMenu.active ? "bg-slate-400 dark:bg-gray-700" : "",
                              ])}
                            >
                              <div className="w-4 h-4 flex items-center justify-center">
                                <Lucide icon={subMenu.icon} className="text-slate-900 dark:text-gray-200" />
                              </div>
                            </Tippy>
                            {/* BEGIN: Third Child */}
                            {subMenu.subMenu && (
                              <HeadlessTransition
                                show={subMenu.activeDropdown}
                                enter="transition ease-out duration-300"
                                enterFrom="transform opacity-0 scale-95"
                                enterTo="transform opacity-100 scale-100"
                                leave="transition ease-in duration-300"
                                leaveFrom="transform opacity-100 scale-100"
                                leaveTo="transform opacity-0 scale-95"
                              >
                                <ul
                                  className={clsx({
                                    "side-menu__sub-open": subMenu.activeDropdown,
                                  })}
                                >
                                  {subMenu.subMenu.map((lastSubMenu, lastSubMenuKey) => (
                                    <li key={lastSubMenuKey}>
                                      <Tippy
                                        as="a"
                                        content={lastSubMenu.title}
                                        options={{
                                          placement: "left",
                                        }}
                                        href={
                                          lastSubMenu.subMenu ? "#" : lastSubMenu.pathname
                                        }
                                        onClick={(event: React.MouseEvent) => {
                                          event.preventDefault();
                                          linkTo(lastSubMenu, navigate);
                                          setFormattedMenu([
                                            ...formattedMenu,
                                          ]);
                                        }}
                                        className={clsx([
                                          "flex items-center p-1 my-1 rounded hover:bg-slate-400 dark:hover:bg-gray-700",
                                          lastSubMenu.active ? "bg-slate-400 dark:bg-gray-700" : "",
                                        ])}
                                      >
                                        <div className="w-10 h-10 flex items-center justify-center">
                                          <Lucide icon={lastSubMenu.icon} className="text-slate-900 dark:text-gray-200" />
                                        </div>
                                      </Tippy>
                                    </li>
                                  ))}
                                </ul>
                              </HeadlessTransition>
                            )}
                            {/* END: Third Child */}
                          </li>
                        ))}
                      </ul>
                    </HeadlessTransition>
                  )}
                  {/* END: Second Child */}
                </li>
              )
            )}
            {/* END: First Child */}
      </ul>
          <div className="mt-4 ml-1 mb-4">
          <Menu>
          <Menu.Button className="block w-8 h-8 overflow-hidden rounded-md bg-blue-600 flex items-center justify-center text-white mb-2">
                <Link to="/client-ticket">
                  <Lucide icon="Ticket" className="text-center justify-center w-4 h-4" />
                </Link>
              </Menu.Button>
          <Menu.Button 
            className="block w-8 h-8 overflow-hidden rounded-md bg-red-700 flex items-center justify-center text-white"
            onClick={() => {
              handleSignOut();
              navigate('/login');
            }}
          >
            <Lucide icon="LogOut" className="text-center justify-center w-4 h-4" />
          </Menu.Button>
          </Menu>
        </div>
        </nav>
       
        {/* END: Simple Menu */}
        {/* BEGIN: Content */}
        <div className="flex-1 overflow-hidden bg-slate-100 dark:bg-gray-900">
          <div className="h-full pb-2 px-2 md:px-2 relative before:content-[''] before:w-full before:h-px before:block after:content-[''] after:z-[-1] after:rounded-[40px_0px_0px_0px] after:w-full after:inset-y-0 after:absolute after:left-0 after:bg-white/10 after:mt-8 after:-ml-4 after:dark:bg-darkmode-400/50 after:hidden md:after:block dark:dark-scrollbar">
            <Outlet />
          </div>
        </div>
        {/* END: Content */}
      </div>

      {/* Floating menu button for mobile */}
      {isMobile && (
        <button
          onClick={toggleSideMenu}
          className="fixed bottom-4 left-4 z-50 w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center shadow-lg"
        >
          <Lucide icon={showSideMenu ? "X" : "Menu"} className="w-8 h-8" />
        </button>
      )}
    </div>
  );
}

export default Main;

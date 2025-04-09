import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getAuth, User, onAuthStateChanged, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { useNavigate } from "react-router-dom";
import LZString from 'lz-string';
import { useDispatch } from 'react-redux';
import { setConfig } from './stores/configSlice';

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
const firestore = getFirestore(app);
const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence);

interface ConfigContextProps {
  config: any;
  isLoading: boolean;
  userRole: string | null;
}

const ConfigContext = createContext<ConfigContextProps | undefined>(undefined);

export const ConfigProvider = ({ children }: { children: ReactNode }) => {
  const [config, setLocalConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    // Clear the session flag when the page reloads
    window.addEventListener('beforeunload', () => {
      sessionStorage.removeItem('configFetched');
    });

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = 'Are you sure you want to leave? Changes you made may not be saved.';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    const shouldFetchConfig = !sessionStorage.getItem('configFetched');

    fetchConfigOnAuthChange();

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [navigate]);

  const fetchConfigOnAuthChange = () => {
    const fetchConfig = async (user: User) => {
      try {
        setIsLoading(true);

        const docUserRef = doc(firestore, 'user', user.email!);
        const docUserSnapshot = await getDoc(docUserRef);
        if (!docUserSnapshot.exists()) {
          setIsLoading(false);
          return;
        }

        const dataUser = docUserSnapshot.data();
        const companyId = dataUser?.companyId;
        const role = dataUser?.role;
        
        setUserRole(role);

        if (!companyId) {
          setIsLoading(false);
          return;
        }

        const docRef = doc(firestore, 'companies', companyId);
        const docSnapshot = await getDoc(docRef);
        if (!docSnapshot.exists()) {
          setIsLoading(false);
          return;
        }

        const data = docSnapshot.data();

        // Store the configuration data in local state and Redux
        setLocalConfig(data);
        dispatch(setConfig({ 
          name: data.name,
          userRole: role,
          // Add other needed config properties
        }));
        
        localStorage.setItem('config', LZString.compress(JSON.stringify(data)));
        sessionStorage.setItem('configFetched', 'true');

      } catch (error) {
        console.error('Error fetching config:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchConfig(user);
      } else {
        const currentPath = window.location.pathname;
        if (currentPath === '/register') {
          navigate('/register');
        } else  if (!currentPath.includes('/guest-chat')) {
          navigate('/login');
        } else {

        }
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  };

  return (
    <ConfigContext.Provider value={{ config, isLoading, userRole }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};

export { ConfigContext };
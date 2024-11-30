import ThemeSwitcher from "@/components/ThemeSwitcher";
import logoUrl from "@/assets/images/logo.png";
import { FormInput } from "@/components/Base/Form";
import Button from "@/components/Base/Button";
import clsx from "clsx";
import { Link, useNavigate } from "react-router-dom";
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, collection, getDocs, addDoc } from "firebase/firestore";
import { useState, useEffect } from "react";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from "axios";

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

function Main() {
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [registerResult, setRegisterResult] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'blaster' | 'enterprise' | null>(null);
  const navigate = useNavigate();

  const handleRegister = async () => {
    try {
      // Validate plan selection
      if (!selectedPlan) {
        toast.error("Please select a plan to continue");
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await signInWithEmailAndPassword(auth, email, password);  
      // Fetch the current number of companies to generate a new company ID
      const querySnapshot = await getDocs(collection(firestore, "companies"));
      const companyCount = querySnapshot.size;
      const newCompanyId = `0${companyCount + 1}`;
    // Save user data to Firestore
    const trialStartDate = new Date();
    const trialEndDate = new Date(trialStartDate);
    trialEndDate.setDate(trialEndDate.getDate() + 7);
      // Create a new company document in Firestore
      await setDoc(doc(firestore, "companies", newCompanyId), {
        id: newCompanyId,
        name: companyName,
        plan: selectedPlan,
        whapiToken: "", // Initialize with any default values you need
        trialStartDate: trialStartDate,
        trialEndDate: trialEndDate,
      });

  

      await setDoc(doc(firestore, "user", user.email!), {
        name: name,
        company: companyName,
        email: user.email!,
        role: "1",
        companyId: newCompanyId,
        phoneNumber: phoneNumber,
        plan: selectedPlan,
        trialStartDate: trialStartDate,
        trialEndDate: trialEndDate,
      });

      // Save user data under the new company's employee collection
      await setDoc(doc(firestore, `companies/${newCompanyId}/employee`, user.email!), {
        name: name,
        email: user.email!,
        role: "1",
        phoneNumber: phoneNumber,


      });

      const response2 = await axios.post(`https://mighty-dane-newly.ngrok-free.app/api/channel/create/${newCompanyId}`);

      console.log(response2);

      // Sign in the user after successful registration
      navigate('/loading');

      // Navigate to the dashboard or home page
   

      toast.success("Registration successful!");

    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Axios error:", error.response?.data || error.message);
        toast.error(`Registration failed: ${error.response?.data?.message || error.message}`);
      } else if (error instanceof Error) {
        console.error("Error registering user:", error);
        setRegisterResult(error.message);
        toast.error("Failed to register user: " + error.message);
      } else {
        console.error("Unexpected error:", error);
        setRegisterResult("Unexpected error occurred");
        toast.error("Failed to register user: Unexpected error occurred");
      }
    }
  };

  const handleKeyDown = (event: { key: string; }) => {
    if (event.key === "Enter") {
      handleRegister();
    }
  };

  return (
    <>
      <div
        className={clsx([
          "p-3 sm:px-8 relative h-screen overflow-hidden bg-primary xl:bg-white dark:bg-darkmode-800 xl:dark:bg-darkmode-600", // Changed lg:overflow-y-auto to overflow-hidden
          "before:hidden before:xl:block before:content-[''] before:w-[57%] before:-mt-[28%] before:-mb-[16%] before:-ml-[13%] before:absolute before:inset-y-0 before:left-0 before:transform before:rotate-[-4.5deg] before:bg-primary/20 before:rounded-[100%] before:dark:bg-darkmode-400",
          "after:hidden after:xl:block after:content-[''] after:w-[57%] after:-mt-[20%] after:-mb-[13%] after:-ml-[13%] after:absolute after:inset-y-0 after:left-0 after:transform after:rotate-[-4.5deg] after:bg-primary after:rounded-[100%] after:dark:bg-darkmode-700",
        ])}
      >
        <ThemeSwitcher />
        <div className="container relative z-10 sm:px-10">
          <div className="block grid-cols-2 gap-4 xl:grid">
            {/* BEGIN: Register Info */}
            <div className="flex-col hidden min-h-screen xl:flex">
            <div className="my-auto flex flex-col items-center w-full">
                  <img
                    alt="Juta Software Logo"
                    className="w-[80%] -mt-16 -ml-64"
                    src={logoUrl}
                  />
                </div>
              </div>
            {/* END: Register Info */}
            {/* BEGIN: Register Form */}
            <div className="flex h-screen py-5 my-10 xl:h-auto xl:py-0 xl:my-0">
              <div className="w-full px-5 py-8 mx-auto my-auto bg-white rounded-md shadow-md xl:ml-20 dark:bg-darkmode-600 xl:bg-transparent sm:px-8 xl:p-0 xl:shadow-none sm:w-3/4 lg:w-2/4 xl:w-auto">
                <h2 className="text-2xl font-bold text-center intro-x xl:text-3xl xl:text-left">
                  Sign Up
                </h2>
                <div className="mt-2 text-center intro-x text-slate-400 dark:text-slate-400 xl:hidden">
                  Start your 7 days free trial now!
                </div>
                <div className="mt-8 intro-x">
                  <FormInput
                    type="text"
                    className="block px-4 py-3 intro-x min-w-full xl:min-w-[350px]"
                    placeholder="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <FormInput
                    type="text"
                    className="block px-4 py-3 mt-4 intro-x min-w-full xl:min-w-[350px]"
                    placeholder="Company Name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                      <FormInput
                    type="tel"
                    className="block px-4 py-3 mt-4 intro-x min-w-full xl:min-w-[350px]"
                    placeholder="Phone Number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <FormInput
                    type="text"
                    className="block px-4 py-3 mt-4 intro-x min-w-full xl:min-w-[350px]"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                
                  <FormInput
                    type="password"
                    className="block px-4 py-3 mt-4 intro-x min-w-full xl:min-w-[350px]"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                
               
                </div>
                <div className="mt-5 text-center intro-x xl:mt-8 xl:text-left">
                  <Button
                    variant="primary"
                    className="w-full px-4 py-3 align-top xl:w-32 xl:mr-3"
                    onClick={handleRegister}
                  >
                    Register
                  </Button>
                  <Link to="/login">
                    <Button
                      variant="outline-secondary"
                      className="w-full px-4 py-3 mt-3 align-top xl:w-32 xl:mt-0"
                    >
                      Back to Login
                    </Button>
                  </Link>
                </div>
                {registerResult && (
                  <div className="mt-5 text-center text-red-500">{registerResult}</div>
                )}
              </div>
            </div>
            {/* END: Register Form */}
          </div>
        </div>
      </div>
      <ToastContainer />
    </>
  );
}

export default Main;
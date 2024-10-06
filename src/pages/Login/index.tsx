
import { FormInput, FormCheck } from "@/components/Base/Form";
import Button from "@/components/Base/Button";
import clsx from "clsx";
import { Link, useNavigate } from "react-router-dom";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth"; // Import Firebase authentication methods
import { initializeApp } from 'firebase/app';
import { useState } from "react";
import { co } from "@fullcalendar/core/internal-common";
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

  function Main() {
    const [email, setEmail] = useState(""); // State for email input
    const [password, setPassword] = useState(""); // State for password input
    const [error, setError] = useState("");
    const [signedIn, setSignedIn] = useState(false);
    const navigate = useNavigate(); // Initialize useNavigate
    const handleSignIn = () => {
      setError(""); // Clear previous errors
      const auth = getAuth(app);
      signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          const user = userCredential.user;
          console.log(user);
          // Instead of directly navigating here, set a state indicating successful sign-in
          navigate(`/loading`);
        })
        .catch((error) => {
          const errorCode = error.code;
          switch (errorCode) {
            case "auth/invalid-email":
              setError("Please enter a valid email address.");
              break;
            case "auth/user-disabled":
              setError("This account has been disabled. Please contact support.");
              break;
            case "auth/user-not-found":
              setError("No account found with this email. Please check your email or sign up.");
              break;
            case "auth/wrong-password":
              setError("Incorrect password. Please try again.");
              break;
            default:
              setError("An error occurred during sign-in. Please try again later.");
          }
        });
    }

    const handleKeyDown = (event: { key: string; }) => {
      if (event.key === "Enter") {
        handleSignIn();
      }
    };
  
    return (
      <>
        <div
          className={clsx([
            "p-3 sm:px-8 relative h-screen lg:overflow-hidden bg-primary xl:bg-white dark:bg-darkmode-800 xl:dark:bg-darkmode-600",
            "before:hidden before:xl:block before:content-[''] before:w-[57%] before:-mt-[28%] before:-mb-[16%] before:-ml-[13%] before:absolute before:inset-y-0 before:left-0 before:transform before:rotate-[-4.5deg] before:bg-primary/20 before:rounded-[100%] before:dark:bg-darkmode-400",
            "after:hidden after:xl:block after:content-[''] after:w-[57%] after:-mt-[20%] after:-mb-[13%] after:-ml-[13%] after:absolute after:inset-y-0 after:left-0 after:transform after:rotate-[-4.5deg] after:bg-primary after:rounded-[100%] after:dark:bg-darkmode-700",
          ])}
        >
          <div className="container relative z-10 sm:px-10">
            <div className="block grid-cols-2 gap-4 xl:grid">
              <div className="flex-col hidden min-h-screen xl:flex">
                <div className="my-auto flex flex-col items-left w-full">
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-center intro-x xl:text-left text-white">
  DM LILY
</h1>
                </div>
              </div>
              <div className="flex h-screen py-5 my-10 xl:h-auto xl:py-0 xl:my-0">
                <div className="w-full px-5 py-8 mx-auto my-auto bg-white rounded-md shadow-md xl:ml-20 dark:bg-darkmode-600 xl:bg-transparent sm:px-8 xl:p-0 xl:shadow-none sm:w-3/4 lg:w-2/4 xl:w-auto">
                  <h2 className="text-2xl font-bold text-center intro-x xl:text-3xl xl:text-left">
                    Sign In
                  </h2>
                  <div className="mt-2 text-center intro-x text-slate-400 xl:hidden">
                    A few more clicks to sign in to your account. Manage all your
                    e-commerce accounts in one place
                  </div>
                  <div className="mt-8 intro-x">
                    <FormInput
                      type="text"
                      className="block px-4 py-3 intro-x min-w-full xl:min-w-[350px]"
                      placeholder="Email"
                      value={email} // Bind value to email state
                      onChange={(e) => setEmail(e.target.value)} // Update email state on change

                      onKeyDown={handleKeyDown} // Add keydown event listener
                    />
                    <FormInput
                      type="password"
                      className="block px-4 py-3 mt-4 intro-x min-w-full xl:min-w-[350px]"
                      placeholder="Password"
                      value={password} // Bind value to password state
                      onChange={(e) => setPassword(e.target.value)} // Update password state on change

                      onKeyDown={handleKeyDown} // Add keydown event listener
                    />
                  </div>
                  <div className="mt-5 text-center intro-x xl:mt-8 xl:text-left">
                    <Button
                      variant="primary"
                      className="w-full px-4 py-3 align-top xl:mr-3"
                      onClick={handleSignIn}
                    >
                      Login
                    </Button>
                  </div>
                  <div className="mt-5 text-center intro-x xl:mt-8 xl:text-left">
               
                    
                  </div>
                  {error && (
                    <div className="mt-5 text-center text-red-500">{error}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
  
  export default Main;
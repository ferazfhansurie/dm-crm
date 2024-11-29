import logoUrl from "@/assets/images/logo.png";
import logoUrl2 from "@/assets/images/logo3.png";
import illustrationUrl from "@/assets/images/illustration.svg";
import { FormInput, FormCheck } from "@/components/Base/Form";
import Button from "@/components/Base/Button";
import clsx from "clsx";
import { Link, useNavigate } from "react-router-dom";
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth"; // Import Firebase authentication methods
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
    const [resetEmail, setResetEmail] = useState("");
    const [resetMessage, setResetMessage] = useState("");
    const [showResetModal, setShowResetModal] = useState(false);
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
  
    const handleStartFreeTrial = () => {
      navigate('/register');
    };

    const handleForgotPassword = async () => {
      const auth = getAuth(app);
      setError("");
      setResetMessage("");
      
      if (!resetEmail) {
        setResetMessage("Please enter your email address.");
        return;
      }

      try {
        await sendPasswordResetEmail(auth, resetEmail);
        setResetMessage("Password reset email sent! Please check your inbox.");
        setResetEmail("");
        // Close modal after 3 seconds
        setTimeout(() => {
          setShowResetModal(false);
          setResetMessage("");
        }, 3000);
      } catch (error: any) {
        switch (error.code) {
          case "auth/invalid-email":
            setResetMessage("Please enter a valid email address.");
            break;
          case "auth/user-not-found":
            setResetMessage("No account found with this email.");
            break;
          default:
            setResetMessage("An error occurred. Please try again later.");
        }
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
              <div className="my-auto flex flex-col items-center w-full">
                  <img
<<<<<<< HEAD
                    alt="Logo"
                    className="w-2/4 -mt-16"
                    src={logoUrl}
=======
                    alt="Juta Software Logo"
                    className="w-[80%] -mt-16 -ml-64"
                    src={logoUrl2}
>>>>>>> 130fa6377572bb6aec551e242061d19e16ded04c
                  />
                </div>
              </div>
              <div className="flex h-screen py-5 my-10 xl:h-auto xl:py-0 xl:my-0">
                <div className="w-full px-5 py-8 mx-auto my-auto bg-white rounded-md shadow-md xl:ml-20 dark:bg-darkmode-600 xl:bg-transparent sm:px-8 xl:p-0 xl:shadow-none sm:w-3/4 lg:w-2/4 xl:w-auto">
                  <h2 className="text-2xl font-bold text-center intro-x xl:text-3xl xl:text-left">
                    Sign In
                  </h2>
                 
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
                  <Button
                      variant="secondary"
                      className="w-full px-4 py-3 align-top xl:mr-3"
                      onClick={handleStartFreeTrial}
                    >
                      Start Free Trial
                    </Button>
                    
                  </div>
                  <div className="mt-4 text-center intro-x">
                    <button 
                      onClick={() => setShowResetModal(true)} 
                      className="text-primary hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  {error && (
                    <div className="mt-5 text-center text-red-500">{error}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Password Reset Modal */}
        {showResetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="p-8 bg-white rounded-lg shadow-lg dark:bg-darkmode-600 w-96">
              <h3 className="mb-4 text-xl font-bold">Reset Password</h3>
              <FormInput
                type="email"
                className="block w-full px-4 py-3 mb-4"
                placeholder="Enter your email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
              <div className="flex justify-end space-x-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowResetModal(false);
                    setResetMessage("");
                    setResetEmail("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleForgotPassword}
                >
                  Send Reset Link
                </Button>
              </div>
              {resetMessage && (
                <div className={`mt-4 text-center ${
                  resetMessage.includes("sent") ? "text-green-500" : "text-red-500"
                }`}>
                  {resetMessage}
                </div>
              )}
            </div>
          </div>
        )}
      </>
    );
  }
  
  export default Main;
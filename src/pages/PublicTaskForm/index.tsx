import { useState, useEffect } from 'react';
import { addDoc, collection, getFirestore, doc, getDoc, query, getDocs, where } from 'firebase/firestore';
import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { format } from 'date-fns';

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const auth = getAuth();

interface TaskSubmission {
  title: string;
  tasks: string;
  clientName: string;
  creator: string;
  poc: string;
  deadline: string;
  dateCreated: string;
  estimatedHours: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in-progress' | 'doing-now' | 'completed' | 'blocked' | 'kiv' |'client';
  taskStatus: { [key: string]: boolean };
  comments: Array<{ text: string; author: string; timestamp: string }>;
  images?: string[];
}

const sendTaskNotification = async (poc: string, task: TaskSubmission, isNew: boolean) => {
  try {
    const user = auth.currentUser;
    if (!user) return;

    // Get company ID
    const docUserRef = doc(firestore, 'user', user.email!);
    const docUserSnapshot = await getDoc(docUserRef);
    if (!docUserSnapshot.exists()) {
      console.log('No such document for user!');
      return;
    }

    const userData = docUserSnapshot.data();
    const companyId = userData.companyId;

    // Get company data
    const docRef = doc(firestore, 'companies', companyId);
    const docSnapshot = await getDoc(docRef);
    if (!docSnapshot.exists()) return;

    const companyData = docSnapshot.data();
    const baseUrl = companyData.apiUrl || '';

    // Find employee's phone number
    const employeesRef = collection(firestore, 'companies', '001', 'employee');
    const q = query(employeesRef, where("email", "==", poc));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log(`No employee found with email ${poc}`);
      return;
    }

    const employeeData = querySnapshot.docs[0].data();
    const employeePhone = employeeData.phoneNumber;
    if (!employeePhone) return;

    const chatId = `${employeePhone.replace(/[^\d]/g, '')}@c.us`;
    const groupChatId = "120363178065670386@g.us";

    // Prepare message
    const taskUrl = `https://web.jutasoftware.co/ticket`;
    const message = isNew
      ? `Hello ${employeeData.name},\n\nA new issue has been reported:\n\nTitle: ${task.title}\nDeadline: ${format(new Date(task.deadline), 'dd/MM/yyyy')}\nClient: ${task.clientName}\nPriority: ${task.priority}\n\nPlease check the details at ${taskUrl}`
      : `🔔 Update: ${employeeData.name},\n\nIssue status update:\n\nTitle: ${task.title}\nDeadline: ${format(new Date(task.deadline), 'dd/MM/yyyy')}\nClient: ${task.clientName}\nPriority: ${task.priority}\nStatus: ${task.status}\n\nIssue details at ${taskUrl}`;

    // Send to both individual and group for new issues, only to individual for updates
    const recipients = isNew ? [chatId, groupChatId] : [chatId];

    // Send messages to designated recipients
    for (const recipient of recipients) {
      const url = companyData.v2 === true
        ? `https://mighty-dane-newly.ngrok-free.app/api/v2/messages/text/001/${recipient}`
        : `https://mighty-dane-newly.ngrok-free.app/api/messages/text/${recipient}/${companyData.whapiToken}`;

      const requestBody = companyData.v2 === true
        ? { 
            message,
            phoneIndex: 0,
            userName: userData.name || ''
          }
        : { message };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error sending notification:', errorText);
        continue;
      }
    }

    console.log('Issue notifications sent successfully');
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

const PublicTaskForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [companyName, setCompanyName] = useState('Server');
  const [formData, setFormData] = useState<TaskSubmission>({
    title: '',
    tasks: '',
    clientName: companyName,
    creator: auth.currentUser?.email || '',
    poc: 'ferazfhansurie@gmail.com',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateCreated: new Date().toISOString(),
    estimatedHours: 0,
    priority: 'low',
    status: 'client',
    taskStatus: {},
    comments: [],
    images: [],
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (auth.currentUser?.email) {
      setFormData(prev => ({
        ...prev,
        creator: auth.currentUser!.email!
      }));
    }
  }, [auth.currentUser]);

  useEffect(() => {
    const fetchCompanyData = async () => {
      if (auth.currentUser?.email) {
        try {
          const userDoc = doc(firestore, 'user', auth.currentUser.email);
          const userSnapshot = await getDoc(userDoc);
          
          if (userSnapshot.exists()) {
            const userData = userSnapshot.data();
            const company = userData.company || 'Server';
            setCompanyName(company);
            setFormData(prev => ({
              ...prev,
              clientName: company
            }));
          }
        } catch (error) {
          console.error('Error fetching company data:', error);
        }
      }
    };

    fetchCompanyData();
  }, [auth.currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const user = auth.currentUser;
      if (!user?.email) {
        throw new Error('No authenticated user found');
      }

      const submissionsRef = collection(firestore, `user/ferazfhansurie@gmail.com/tasks`);
      const docRef = await addDoc(submissionsRef, {
        ...formData,
        creator: user.email,
        dateCreated: new Date().toISOString(),
      });

      // Send notification for new issue
      await sendTaskNotification(formData.poc, formData, true);

      setSubmitSuccess(true);
      setFormData(prev => ({
        ...prev,
        title: '',
        tasks: '',
        dateCreated: new Date().toISOString(),
      }));
      setImageFile(null);
    } catch (error) {
      console.error('Error submitting issue:', error);
      alert('There was an error submitting your issue. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitSuccess(false);
    setFormData(prev => ({
      ...prev,
      title: '',
      tasks: '',
      dateCreated: new Date().toISOString(),
    }));
    setImageFile(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !auth.currentUser?.email) return;

    setIsUploading(true);
    try {
      const storage = getStorage();
      const imageUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileRef = ref(storage, `tasks/${auth.currentUser.email}/${Date.now()}-${file.name}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        imageUrls.push(url);
      }

      setFormData(prev => ({
        ...prev,
        images: [...(prev.images || []), ...imageUrls]
      }));
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Error uploading images. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-center mb-6 text-white">Report an Issue</h1>

        {submitSuccess ? (
          <div className="space-y-4">
            <div className="text-center p-4 bg-green-900 text-green-100 rounded-md mb-4">
              Issue submitted successfully! Thank you.
            </div>
            <button
              onClick={resetForm}
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Submit Another Issue
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-200">Title</label>
              <input
                type="text"
                required
                className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter issue title..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200">Description</label>
              <textarea
                required
                className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                rows={4}
                value={formData.tasks}
                onChange={(e) => setFormData({ ...formData, tasks: e.target.value })}
                placeholder="Please describe your issue in detail..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200">Attach Images (optional)</label>
              <input
                type="file"
                multiple
                accept="image/*"
                className="mt-1 block w-full text-gray-200 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-700 file:text-blue-400 hover:file:bg-gray-600"
                onChange={handleImageUpload}
              />
              {isUploading && (
                <div className="mt-2 text-sm text-gray-300">
                  Uploading images...
                </div>
              )}
              {formData.images && formData.images.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-4">
                  {formData.images.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Uploaded image ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            images: prev.images?.filter((_, i) => i !== index)
                          }));
                        }}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <span className="block w-4 h-4">×</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-800 disabled:text-gray-300"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Issue'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default PublicTaskForm; 
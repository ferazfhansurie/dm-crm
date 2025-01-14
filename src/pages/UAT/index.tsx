import { useState, useEffect } from 'react';
import { getDoc, getFirestore, doc, setDoc, collection, addDoc, getDocs, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { initializeApp } from "firebase/app";
import { Dialog } from '@headlessui/react';
import { format } from 'date-fns';
import Lucide from "@/components/Base/Lucide";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// Firebase configuration (use your existing config)
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
const auth = getAuth(app);
const firestore = getFirestore(app);

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  isActive?: boolean;
}

interface TestCase {
  id: string;
  feature: string;
  description: string;
  expectedResult: string;
  actualResult?: string;
  status: 'pending' | 'passed' | 'failed';
  testedBy?: string;
  testedAt?: string;
  screenshots?: string[];
  notes?: string;
}

interface UATSession {
  id: string;
  title: string;
  version: string;
  releaseDate: string;
  environment: 'development' | 'staging' | 'production';
  status: 'pending' | 'in-progress' | 'completed';
  testCases: TestCase[];
  assignedTesters: string[];
  developer: string;
  summary?: {
    totalTests: number;
    passed: number;
    failed: number;
    pending: number;
    completionRate: number;
  };
  startDate?: string;
  completionDate?: string;
}

const UAT = () => {
  const [sessions, setSessions] = useState<UATSession[]>([]);
  const [currentSession, setCurrentSession] = useState<UATSession | null>(null);
  const [isSessionFormOpen, setIsSessionFormOpen] = useState(false);
  const [isTestCaseFormOpen, setIsTestCaseFormOpen] = useState(false);
  const [currentTestCase, setCurrentTestCase] = useState<TestCase | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filterEnvironment, setFilterEnvironment] = useState<'all' | UATSession['environment']>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | UATSession['status']>('all');

  useEffect(() => {
    fetchSessions();
    fetchEmployees();
  }, []);

  const fetchSessions = async () => {
    try {
      const user = auth.currentUser;
      if (!user?.email) return;

      const sessionsRef = collection(firestore, `uat-sessions`);
      const sessionsSnapshot = await getDocs(sessionsRef);
      
      const sessionsData = sessionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        summary: calculateSessionSummary(doc.data().testCases)
      })) as UATSession[];

      setSessions(sessionsData);
    } catch (error) {
      console.error('Error fetching UAT sessions:', error);
    }
  };

  const calculateSessionSummary = (testCases: TestCase[]) => {
    const total = testCases.length;
    const passed = testCases.filter(tc => tc.status === 'passed').length;
    const failed = testCases.filter(tc => tc.status === 'failed').length;
    const pending = testCases.filter(tc => tc.status === 'pending').length;

    return {
      totalTests: total,
      passed,
      failed,
      pending,
      completionRate: total > 0 ? ((passed + failed) / total) * 100 : 0
    };
  };

  const handleTestCaseStatusUpdate = async (
    sessionId: string,
    testCaseId: string,
    status: TestCase['status'],
    actualResult: string,
    notes: string
  ) => {
    try {
      const user = auth.currentUser;
      if (!user?.email) return;

      const sessionRef = doc(firestore, 'uat-sessions', sessionId);
      const sessionDoc = await getDoc(sessionRef);
      
      if (!sessionDoc.exists()) return;

      const session = sessionDoc.data() as UATSession;
      const updatedTestCases = session.testCases.map(tc => 
        tc.id === testCaseId ? {
          ...tc,
          status,
          actualResult,
          notes,
          testedBy: user.email,
          testedAt: new Date().toISOString()
        } : tc
      );

      await updateDoc(sessionRef, {
        testCases: updatedTestCases,
        status: updatedTestCases.every(tc => tc.status !== 'pending') ? 'completed' : 'in-progress'
      });

      fetchSessions();
    } catch (error) {
      console.error('Error updating test case:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const employeesRef = collection(firestore, 'employees');
      const employeesSnapshot = await getDocs(employeesRef);
      
      const employeesData = employeesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Employee[];

      setEmployees(employeesData);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  return (
    <div className="p-5">
      <div className="mb-4 flex justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setCurrentSession(null);
              setIsSessionFormOpen(true);
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-blue-700"
          >
            <Lucide icon="Plus" className="w-4 h-4 mr-2 inline-block" />
            New Test Session
          </button>
        </div>

        <div className="flex gap-4">
          <select
            value={filterEnvironment}
            onChange={(e) => setFilterEnvironment(e.target.value as typeof filterEnvironment)}
            className="px-4 py-2 border rounded-md"
          >
            <option value="all">All Environments</option>
            <option value="development">Development</option>
            <option value="staging">Staging</option>
            <option value="production">Production</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            className="px-4 py-2 border rounded-md"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Test Sessions List */}
      <div className="grid gap-6">
        {sessions
          .filter(session => 
            (filterEnvironment === 'all' || session.environment === filterEnvironment) &&
            (filterStatus === 'all' || session.status === filterStatus)
          )
          .map(session => (
            <div key={session.id} className="border rounded-lg p-6 bg-white shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold mb-2">{session.title}</h2>
                  <div className="text-sm text-gray-500">
                    Version: {session.version} | Environment: {session.environment}
                  </div>
                  <div className="text-sm text-gray-500">
                    Release Date: {format(new Date(session.releaseDate), 'dd/MM/yyyy')}
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    session.status === 'completed' ? 'bg-green-100 text-green-800' :
                    session.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {session.status}
                  </span>
                </div>
              </div>

              {/* Progress Summary */}
              <div className="mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Testing Progress</span>
                  <span className="text-sm text-gray-500">
                    {(session.summary?.passed ?? 0) + (session.summary?.failed ?? 0)}/{session.summary?.totalTests ?? 0} completed
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500" style={{
                    width: `${session.summary?.completionRate || 0}%` 
                  }} />
                </div>
                <div className="flex justify-between mt-2 text-sm">
                  <span className="text-green-600">{session.summary?.passed} passed</span>
                  <span className="text-red-600">{session.summary?.failed} failed</span>
                  <span className="text-gray-600">{session.summary?.pending} pending</span>
                </div>
              </div>

              {/* Test Cases */}
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">Test Cases</h3>
                  <button
                    onClick={() => {
                      setCurrentSession(session);
                      setCurrentTestCase(null);
                      setIsTestCaseFormOpen(true);
                    }}
                    className="text-sm text-primary hover:text-primary-dark"
                  >
                    Add Test Case
                  </button>
                </div>
                <div className="space-y-2">
                  {session.testCases.map(testCase => (
                    <div
                      key={testCase.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setCurrentSession(session);
                        setCurrentTestCase(testCase);
                        setIsTestCaseFormOpen(true);
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{testCase.feature}</h4>
                          <p className="text-sm text-gray-600 mt-1">{testCase.description}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-sm ${
                          testCase.status === 'passed' ? 'bg-green-100 text-green-800' :
                          testCase.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {testCase.status}
                        </span>
                      </div>
                      {testCase.testedBy && (
                        <div className="mt-2 text-sm text-gray-500">
                          Tested by: {testCase.testedBy} on {format(new Date(testCase.testedAt!), 'dd/MM/yyyy HH:mm')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* Test Case Form Modal */}
      <TestCaseFormModal
        isOpen={isTestCaseFormOpen}
        onClose={() => setIsTestCaseFormOpen(false)}
        session={currentSession}
        testCase={currentTestCase}
        onSubmit={handleTestCaseStatusUpdate}
      />

      {/* Session Form Modal */}
      <SessionFormModal
        isOpen={isSessionFormOpen}
        onClose={() => setIsSessionFormOpen(false)}
        session={currentSession}
        employees={employees}
        onSubmit={async (sessionData) => {
          try {
            if (currentSession) {
              await updateDoc(doc(firestore, 'uat-sessions', currentSession.id), sessionData);
            } else {
              await addDoc(collection(firestore, 'uat-sessions'), {
                ...sessionData,
                status: 'pending',
                testCases: []
              });
            }
            fetchSessions();
            setIsSessionFormOpen(false);
          } catch (error) {
            console.error('Error saving session:', error);
          }
        }}
      />
    </div>
  );
};

interface TestCaseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: UATSession | null;
  testCase: TestCase | null;
  onSubmit: (sessionId: string, testCaseId: string, status: TestCase['status'], actualResult: string, notes: string) => void;
}

const TestCaseFormModal = ({ isOpen, onClose, session, testCase, onSubmit }: TestCaseFormModalProps) => {
  const [status, setStatus] = useState<TestCase['status']>(testCase?.status || 'pending');
  const [actualResult, setActualResult] = useState(testCase?.actualResult || '');
  const [notes, setNotes] = useState(testCase?.notes || '');

  useEffect(() => {
    if (testCase) {
      setStatus(testCase.status);
      setActualResult(testCase.actualResult || '');
      setNotes(testCase.notes || '');
    } else {
      setStatus('pending');
      setActualResult('');
      setNotes('');
    }
  }, [testCase]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !testCase) return;
    
    onSubmit(session.id, testCase.id, status, actualResult, notes);
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <div className="fixed inset-0 bg-black bg-opacity-25" />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6">
            <form onSubmit={handleSubmit}>
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                {testCase ? 'Update Test Case' : 'New Test Case'}
              </h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TestCase['status'])}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                >
                  <option value="pending">Pending</option>
                  <option value="passed">Passed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Actual Result</label>
                <textarea
                  value={actualResult}
                  onChange={(e) => setActualResult(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                />
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark"
                >
                  {testCase ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </div>
    </Dialog>
  );
};

interface SessionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: UATSession | null;
  employees: Employee[];
  onSubmit: (sessionData: Omit<UATSession, 'id' | 'testCases' | 'status' | 'summary'>) => void;
}

const SessionFormModal = ({ isOpen, onClose, session, employees, onSubmit }: SessionFormModalProps) => {
  const [formData, setFormData] = useState({
    title: session?.title || '',
    version: session?.version || '',
    releaseDate: session?.releaseDate || new Date().toISOString().split('T')[0],
    environment: session?.environment || 'development' as UATSession['environment'],
    assignedTesters: session?.assignedTesters || [],
    developer: session?.developer || '',
    startDate: session?.startDate || new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (session) {
      setFormData({
        title: session.title,
        version: session.version,
        releaseDate: session.releaseDate,
        environment: session.environment,
        assignedTesters: session.assignedTesters,
        developer: session.developer,
        startDate: session.startDate || new Date().toISOString().split('T')[0],
      });
    } else {
      setFormData({
        title: '',
        version: '',
        releaseDate: new Date().toISOString().split('T')[0],
        environment: 'development',
        assignedTesters: [],
        developer: '',
        startDate: new Date().toISOString().split('T')[0],
      });
    }
  }, [session]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <div className="fixed inset-0 bg-black bg-opacity-25" />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6">
            <form onSubmit={handleSubmit}>
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                {session ? 'Edit Test Session' : 'New Test Session'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Version</label>
                  <input
                    type="text"
                    value={formData.version}
                    onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Release Date</label>
                  <input
                    type="date"
                    value={formData.releaseDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, releaseDate: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Environment</label>
                  <select
                    value={formData.environment}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      environment: e.target.value as UATSession['environment']
                    }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    required
                  >
                    <option value="development">Development</option>
                    <option value="staging">Staging</option>
                    <option value="production">Production</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Developer</label>
                  <select
                    value={formData.developer}
                    onChange={(e) => setFormData(prev => ({ ...prev, developer: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    required
                  >
                    <option value="">Select Developer</option>
                    {employees
                      .filter(emp => emp.role === 'developer')
                      .map(dev => (
                        <option key={dev.id} value={dev.email}>
                          {dev.name}
                        </option>
                      ))
                    }
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Assigned Testers</label>
                  <select
                    multiple
                    value={formData.assignedTesters}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      assignedTesters: Array.from(e.target.selectedOptions, option => option.value)
                    }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    required
                  >
                    {employees
                      .filter(emp => emp.role === 'tester')
                      .map(tester => (
                        <option key={tester.id} value={tester.email}>
                          {tester.name}
                        </option>
                      ))
                    }
                  </select>
                  <p className="mt-1 text-sm text-gray-500">Hold Ctrl/Cmd to select multiple testers</p>
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark"
                >
                  {session ? 'Update Session' : 'Create Session'}
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </div>
    </Dialog>
  );
};

export default UAT; 
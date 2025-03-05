import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Tab } from '@headlessui/react';
import { Transition } from '@headlessui/react';
import { Dialog } from '@headlessui/react';
import Lucide from "@/components/Base/Lucide";
import classNames from 'classnames';
import { Contact } from '@/pages/Chat';
import { debounce } from 'lodash';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc } from 'firebase/firestore';

interface Message {
  id: string;
  contactId: string;
  text?: {
    body: string;
  };
  caption?: string;
  timestamp: number;
  type: string;
  from_me: boolean;
  // Contact information
  contactName?: string;
  profilePicUrl?: string;
}

interface SearchResponse {
  total: number;
  page: number;
  totalPages: number;
  results: Message[];
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (type: string, id: string, contactId: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  contacts: Contact[];
  companyId: string;
}

const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectResult,
  searchQuery,
  setSearchQuery,
  contacts,
  companyId,
}) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const observer = useRef<IntersectionObserver | null>(null);
  const lastMessageElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading) return;
    
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setCurrentPage(prevPage => prevPage + 1);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  const handleClose = () => {
    onClose();
  };

  // Debounced message search function
  const debouncedSearch = debounce(async (query: string, page: number, isNewSearch: boolean) => {
    if (!query || query.length < 2) {
      setMessages([]);
      setLoading(false);
      setHasMore(false);
      return;
    }

    if (!companyId) {
      setError('Company ID is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const auth = getAuth();
      const firestore = getFirestore();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const docRef = doc(firestore, 'companies', companyId);
      const docSnapshot = await getDoc(docRef);
      
      if (!docSnapshot.exists()) {
        throw new Error('Company configuration not found');
      }
      
      const companyData = docSnapshot.data();
      const baseUrl = companyData.apiUrl || 'https://mighty-dane-newly.ngrok-free.app';

      const params = new URLSearchParams({
        query,
        page: page.toString()
      });

      const url = `${baseUrl}/api/search-messages/${companyId}?${params.toString()}`;
      console.log('Making request to:', url, 'Company ID:', companyId);

      const response = await fetch(url);
      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to fetch messages: ${response.status} ${errorText}`);
      }

      const data: SearchResponse = await response.json();
      console.log('Search results:', data);
      
      // Enhance messages with contact information
      const enhancedMessages = data.results.map(message => {
        const contact = contacts.find(c => c.id === message.contactId);
        return {
          ...message,
          contactName: contact?.contactName || 'Unknown',
          profilePicUrl: contact?.profilePicUrl,
        };
      }).filter(message => {
        const messageText = (message.text?.body || message.caption || '').toLowerCase();
        return messageText.includes(query.toLowerCase());
      });

      setMessages(prevMessages => isNewSearch ? enhancedMessages : [...prevMessages, ...enhancedMessages]);
      setHasMore(data.page < data.totalPages);
      setInitialLoad(false);
    } catch (err) {
      console.error('Search error details:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, 100);

  // Effect to reset state when search query changes
  useEffect(() => {
    setMessages([]);
    setCurrentPage(1);
    setLoading(false);
    setHasMore(true);
    setInitialLoad(true);
  }, [searchQuery]);

  // Effect to trigger search when query or page changes
  useEffect(() => {
    if (searchQuery && searchQuery.length >= 2) {
      const isNewSearch = currentPage === 1;
      debouncedSearch(searchQuery, currentPage, isNewSearch);
    }
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchQuery, currentPage]);

  const filteredContacts = searchQuery ? contacts.filter((contact: Contact) =>
    contact.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone?.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  const categories = ['Contacts', 'Messages'];

  // Add a helper function to highlight matched text
  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? 
        <span key={i} className="bg-yellow-200 dark:bg-yellow-600">{part}</span> : 
        part
    );
  };

  return (
    <Transition show={isOpen} as={React.Fragment}>
      <Dialog
        as="div"
        className="fixed inset-0 z-50 overflow-y-auto"
        onClose={handleClose}
      >
        <div className="min-h-screen px-4 text-center">
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Overlay className="fixed inset-0 bg-black/50" />
          </Transition.Child>

          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="inline-block w-full max-w-3xl p-6 my-8 text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white">
                  Search {categories[selectedTab]}
                </Dialog.Title>
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <Lucide icon="X" className="w-5 h-5" />
                </button>
              </div>

              <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
                <Tab.List className="flex space-x-1 rounded-xl bg-gray-100 dark:bg-gray-700 p-1 mb-4">
                  {categories.map((category) => (
                    <Tab
                      key={category}
                      className={({ selected }) =>
                        classNames(
                          'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                          'focus:outline-none focus:ring-2 ring-offset-2 ring-offset-blue-400 ring-white ring-opacity-60',
                          selected
                            ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-white'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-white/[0.12] hover:text-gray-800 dark:hover:text-white'
                        )
                      }
                    >
                      {category}
                    </Tab>
                  ))}
                </Tab.List>

                <div className="relative mb-4">
                  <input
                    type="text"
                    className="w-full h-12 pl-12 pr-10 text-gray-900 dark:text-white placeholder-gray-500 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder={`Search ${categories[selectedTab].toLowerCase()}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                  <Lucide
                    icon="Search"
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchQuery('');
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <Lucide icon="X" className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <Tab.Panels className="mt-2 max-h-[60vh] overflow-y-auto">
                  <Tab.Panel>
                    {filteredContacts.length > 0 ? (
                      filteredContacts.map((contact) => (
                        <div
                          key={contact.id}
                          className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer"
                          onClick={() => onSelectResult('contact', contact.id!, contact.id!)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              {contact.profilePicUrl ? (
                                <img
                                  src={contact.profilePicUrl || undefined}
                                  alt={contact.contactName || 'Contact'}
                                  className="w-10 h-10 rounded-full"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                                  <Lucide icon="User" className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {contact.contactName || 'Unnamed Contact'}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {contact.phone || 'No phone number'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No contacts found
                      </div>
                    )}
                  </Tab.Panel>

                  <Tab.Panel>
                    {loading && (
                      <div className="text-center py-4 text-gray-600 dark:text-gray-400">
                        Searching through messages...
                      </div>
                    )}
                    {error && <div className="text-red-500 py-4">{error}</div>}
                    {!searchQuery && selectedTab === 1 && (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        Start typing to search messages
                      </div>
                    )}
                    {searchQuery && searchQuery.length < 2 && selectedTab === 1 && (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        Type at least 2 characters to search
                      </div>
                    )}
                    {!loading && searchQuery && searchQuery.length >= 2 && messages.length === 0 && selectedTab === 1 && (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No messages found
                      </div>
                    )}
                    <div className="space-y-4">
                      {messages.map((message, index) => (
                        <div 
                          key={message.id} 
                          ref={index === messages.length - 1 ? lastMessageElementRef : null}
                          className="p-4 border dark:border-gray-700 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                          onClick={() => onSelectResult('message', message.id, message.contactId)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0">
                                {message.profilePicUrl ? (
                                  <img
                                    src={message.profilePicUrl}
                                    alt={message.contactName}
                                    className="w-8 h-8 rounded-full"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                                    <Lucide icon="User" className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {message.contactName}
                                </p>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(message.timestamp).toLocaleString()}
                                </span>
                              </div>
                            </div>
                            <span className={`text-sm ${message.from_me ? 'text-blue-500' : 'text-green-500'}`}>
                              {message.from_me ? 'Sent' : 'Received'}
                            </span>
                          </div>
                          <div className="pl-11">
                            <p className="text-gray-900 dark:text-white">
                              {highlightText(message.text?.body || message.caption || '', searchQuery)}
                            </p>
                          </div>
                        </div>
                      ))}
                      {loading && (
                        <div className="text-center py-4">
                          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                        </div>
                      )}
                      {!loading && !hasMore && messages.length > 0 && (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                          No more messages to load
                        </div>
                      )}
                    </div>
                  </Tab.Panel>
                </Tab.Panels>
              </Tab.Group>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};

export default SearchModal; 
import React, { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import { Transition } from '@headlessui/react';
import { Dialog } from '@headlessui/react';
import Lucide from "@/components/Base/Lucide";
import classNames from 'classnames';
import { Contact, Message } from '@/pages/Chat';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (type: string, id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  contacts: Contact[];
  // Commented out for now - will be re-added when implementing message search
  // messages: Message[];
  // globalSearchLoading: boolean;
  // globalSearchResults: any[];
}

const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectResult,
  searchQuery,
  setSearchQuery,
  contacts,
  // Commented out for now
  // messages,
  // globalSearchLoading,
  // globalSearchResults,
}) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Add loading state when search query changes
  useEffect(() => {
    if (searchQuery.length >= 2) {
      setIsSearching(true);
      // Simulate a small delay to show loading state
      setTimeout(() => {
        setIsSearching(false);
      }, 300);
    }
  }, [searchQuery]);

  // Temporarily only showing Contacts
  const categories = ['Contacts'];

  const filteredContacts = contacts.filter((contact) =>
    contact.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /* Commented out for now - will be re-added when implementing message search
  const filteredMessages = globalSearchResults.map(message => {
    const contact = contacts.find(c => c.id === message.contactId);
    return {
      ...message,
      contactName: contact?.contactName || 'Unknown',
      profilePicUrl: contact?.profilePicUrl,
    };
  });
  */

  return (
    <Transition show={isOpen} as={React.Fragment}>
      <Dialog
        as="div"
        className="fixed inset-0 z-50 overflow-y-auto"
        onClose={onClose}
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
                  Search Contacts
                </Dialog.Title>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <Lucide icon="X" className="w-5 h-5" />
                </button>
              </div>

              <div className="relative mb-4">
                <input
                  type="text"
                  className="w-full h-12 pl-12 pr-4 text-gray-900 dark:text-white placeholder-gray-500 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                <Lucide
                  icon="Search"
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                />
              </div>

              <div className="mt-2 max-h-[60vh] overflow-y-auto">
                {filteredContacts.length > 0 ? (
                  filteredContacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer"
                      onClick={() => onSelectResult('contact', contact.id!)}
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
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};

export default SearchModal; 
import React, { useEffect, useState } from 'react';
import { Contact } from '@/types';

interface VirtualContactListProps {
  contacts: Contact[];
  onContactClick: (contact: Contact) => void;
  selectedChatId: string | null;
  isLoading: boolean;
  onLoadMore: () => void;
  hasMore: boolean;
}

const LOAD_MORE_THRESHOLD = 200; // pixels from bottom to trigger load more

const VirtualContactList: React.FC<VirtualContactListProps> = ({
  contacts,
  onContactClick,
  selectedChatId,
  isLoading,
  onLoadMore,
  hasMore
}) => {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (isLoadingMore || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const scrollThreshold = scrollHeight - clientHeight - LOAD_MORE_THRESHOLD;

    if (scrollTop > scrollThreshold) {
      setIsLoadingMore(true);
      onLoadMore();
    }
  };

  useEffect(() => {
    setIsLoadingMore(false);
  }, [contacts.length]);

  return (
    <div 
      ref={containerRef}
      className="h-full overflow-y-auto"
      onScroll={handleScroll}
    >
      {contacts.map((contact) => {
        const isSelected = contact.chat_id === selectedChatId;
        const lastMessage = contact.last_message?.text?.body || '';
        const timestamp = contact.last_message?.timestamp 
          ? new Date(contact.last_message.timestamp * 1000).toLocaleString()
          : '';

        return (
          <div
            key={contact.chat_id}
            className={`flex items-center p-4 cursor-pointer border-b ${
              isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
            }`}
            onClick={() => onContactClick(contact)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex justify-between">
                <span className="font-medium truncate">
                  {contact.contactName || contact.phone}
                </span>
                <span className="text-sm text-gray-500">{timestamp}</span>
              </div>
              <div className="text-sm text-gray-500 truncate">{lastMessage}</div>
            </div>
          </div>
        );
      })}
      {isLoading && (
        <div className="flex justify-center p-4">
          <div className="loader">Loading...</div>
        </div>
      )}
    </div>
  );
};

export default VirtualContactList; 
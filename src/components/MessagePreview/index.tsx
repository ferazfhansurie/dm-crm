import React from 'react';
import { Link } from 'react-router-dom';

interface MessagePreviewProps {
    message: string;
    document?: string | null;
    image?: string | null;
    isSender?: boolean;
    timestamp?: string;
}

const MessagePreview: React.FC<MessagePreviewProps> = ({ 
    message, 
    document, 
    image, 
    isSender = true,
    timestamp 
}) => {
    // Function to convert URLs to clickable links
    const formatMessage = (text: string) => {
        // URL regex pattern
        const urlPattern = /(https?:\/\/[^\s]+)/g;
        
        // Split message by newlines to preserve them
        const parts = text.split('\n');
        
        return parts.map((part, lineIndex) => {
            // Replace URLs with links
            const words = part.split(' ');
            const formattedWords = words.map((word, wordIndex) => {
                if (urlPattern.test(word)) {
                    return (
                        <a
                            key={`${lineIndex}-${wordIndex}`}
                            href={word}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline"
                        >
                            {word}
                        </a>
                    );
                }
                return <React.Fragment key={`${lineIndex}-${wordIndex}`}>{word} </React.Fragment>;
            });

            return (
                <React.Fragment key={lineIndex}>
                    {formattedWords}
                    {lineIndex < parts.length - 1 && <br />}
                </React.Fragment>
            );
        });
    };

    return (
        <div 
            className={`
                flex flex-col max-w-[85%] animate-fade-in
                ${isSender ? 'ml-auto items-end' : 'mr-auto items-start'}
            `}
        >
            {/* Message bubble */}
            <div 
                className={`
                    relative rounded-2xl p-3 shadow-sm
                    ${isSender 
                        ? 'bg-primary text-white rounded-tr-none' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-tl-none'
                    }
                `}
            >
                {/* Message text */}
                <div className="whitespace-pre-wrap break-words text-[15px] leading-[22px]">
                    {formatMessage(message)}
                </div>

                {/* Document attachment */}
                {document && (
                    <div className={`
                        mt-2 flex items-center gap-2 rounded p-2 transition-all duration-200 hover:bg-opacity-90
                        ${isSender ? 'bg-primary-dark' : 'bg-gray-200 dark:bg-gray-600'}
                    `}>
                        <svg className={`w-5 h-5 ${isSender ? 'text-white' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <a
                            href={document}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-sm hover:underline ${isSender ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`}
                        >
                            View Document
                        </a>
                    </div>
                )}

                {/* Image attachment */}
                {image && (
                    <div className="mt-2 rounded-lg overflow-hidden">
                        <img
                            src={image}
                            alt="Message attachment"
                            className="w-full max-h-48 object-contain cursor-zoom-in transition-transform hover:scale-[1.02]"
                            onClick={() => window.open(image, '_blank')}
                        />
                    </div>
                )}
            </div>

            {/* Timestamp */}
            {timestamp && (
                <span className="text-xs text-gray-500 mt-1">
                    {timestamp}
                </span>
            )}
        </div>
    );
};

// Add keyframe animation
const styles = `
@keyframes fade-in {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.animate-fade-in {
    animation: fade-in 0.2s ease-out;
}
`;

// Add styles to document head
const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

export default MessagePreview; 
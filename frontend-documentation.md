# Juta CRM System - Frontend Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Core Features](#core-features)
4. [Key Components](#key-components)
5. [Data Flow](#data-flow)
6. [Authentication & Authorization](#authentication--authorization)
7. [Firebase Integration](#firebase-integration)
8. [API Integration](#api-integration)
9. [Development Setup](#development-setup)
10. [Deployment](#deployment)
11. [Troubleshooting](#troubleshooting)
12. [Component Architecture Deep Dive](#component-architecture-deep-dive)
13. [State Management Patterns](#state-management-patterns)
14. [Performance Optimization](#performance-optimization)
15. [Security Considerations](#security-considerations)
16. [Testing Strategy](#testing-strategy)

## System Overview

Juta CRM is a comprehensive Customer Relationship Management system built with React, TypeScript, and Firebase. It's designed for businesses to manage customer communications, automate follow-ups, handle appointments, and track sales performance through WhatsApp integration.

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **State Management**: Redux Toolkit
- **Backend**: Firebase (Firestore, Authentication, Storage)
- **Communication**: WhatsApp Business API integration
- **Routing**: React Router v6

## Architecture

### Project Structure
```
src/
├── components/          # Reusable UI components
├── pages/              # Main application pages
├── stores/             # Redux store and slices
├── themes/             # UI theme configurations
├── router/             # Application routing
├── assets/             # Static assets
├── utils/              # Utility functions
└── types/              # TypeScript type definitions
```

### Key Design Patterns
- **Component-based architecture** with functional components and hooks
- **Redux for global state management**
- **Context providers** for specific data (Contacts, Config)
- **Firebase real-time listeners** for live data updates
- **Role-based access control** throughout the application

## Core Features

### 1. Chat Management (`/pages/Chat/`)
**Primary communication hub for WhatsApp conversations**

**Key Functionality:**
- Real-time message synchronization with WhatsApp Business API
- Multi-phone support (businesses can have multiple WhatsApp numbers)
- Message types: text, images, documents, voice notes, videos, locations
- Private notes system for internal team communication
- Contact assignment to sales representatives
- Message forwarding and reactions
- Quick replies and templates

**Important Files:**
- `src/pages/Chat/index.tsx` - Main chat interface (6,000+ lines)
- Message handling, contact management, real-time updates

**Data Flow:**
```
WhatsApp API → Firebase → Real-time Listeners → Chat Component → UI Updates
```

### 2. Contact Management (`/pages/CrudDataList/`)
**Comprehensive contact database with advanced filtering and management**

**Key Functionality:**
- Contact import/export (CSV support)
- Tag-based organization and filtering
- Bulk operations (messaging, tagging, assignment)
- Contact assignment to employees
- Custom fields support
- Advanced search and filtering
- Contact synchronization with external systems

**Important Files:**
- `src/pages/CrudDataList/index.tsx` - Main contact list interface

### 3. User Management (`/pages/CrudForm/`, `/pages/UsersLayout2/`)
**Employee and user account management**

**Key Functionality:**
- Role-based user creation (Admin, Manager, Supervisor, Sales, Observer)
- Employee assignment and quota management
- Phone number assignment for WhatsApp access
- Profile image upload
- Permission management based on role hierarchy

**Role Hierarchy:**
1. **Admin (Role 1)** - Full system access
2. **Manager (Role 4)** - Team management
3. **Supervisor (Role 5)** - Team oversight
4. **Sales (Role 2)** - Customer interaction
5. **Observer (Role 3)** - Read-only access

### 4. Dashboard & Analytics (`/pages/DashboardOverview1/`)
**Business intelligence and performance tracking**

**Key Functionality:**
- Employee performance metrics
- Contact assignment tracking
- Monthly statistics and trends
- Appointment overview
- Message volume analytics
- Revenue tracking

### 5. Calendar & Appointments (`/pages/Calendar/`)
**Appointment scheduling and management**

**Key Functionality:**
- Google Calendar integration
- Appointment booking and management
- Staff assignment to appointments
- Automated reminder system
- Package and session tracking
- Expense tracking (fuel, toll)

### 6. Automation Systems

#### Follow-ups (`/pages/FollowUps/`)
**Automated message sequences based on triggers**

**Key Functionality:**
- Tag-based trigger system
- Multi-message sequences with delays
- Batch processing with rate limiting
- Template management
- Scheduled execution

#### AI Responses (`/pages/AIResponses/`)
**Keyword-based automated responses**

**Key Functionality:**
- Keyword detection in incoming messages
- Multiple response types: tags, images, documents, assignments
- Employee assignment automation
- Response prioritization

#### Quick Replies (`/pages/QuickReplies/`)
**Pre-defined message templates**

**Key Functionality:**
- Categorized message templates
- Media attachment support
- Personal vs. company-wide templates

### 7. Settings & Configuration (`/pages/Settings/`)
**System configuration and preferences**

**Key Functionality:**
- Company settings management
- API configuration
- Bot control settings
- AI response delays
- System preferences

## Key Components

### Authentication Flow
```typescript
// Firebase Authentication integration
const auth = getAuth(app);
const firestore = getFirestore(app);

// Role-based access control
const checkUserRole = async (userEmail: string) => {
  const userDoc = await getDoc(doc(firestore, 'user', userEmail));
  return userDoc.data()?.role;
};
```

### Real-time Data Synchronization
```typescript
// Contact updates listener
const setupRealtimeListener = async () => {
  const contactsRef = collection(firestore, `companies/${companyId}/contacts`);
  onSnapshot(contactsRef, (snapshot) => {
    // Update local state with real-time changes
  });
};
```

### WhatsApp API Integration
```typescript
// Message sending
const sendMessage = async (chatId: string, message: string, phoneIndex: number) => {
  const response = await fetch(`${baseUrl}/api/v2/messages/text/${companyId}/${chatId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, phoneIndex })
  });
};
```

## Data Flow

### Message Flow
1. **Incoming Messages**: WhatsApp API → Firebase → Real-time listeners → UI update
2. **Outgoing Messages**: UI → Firebase → WhatsApp API → Delivery confirmation
3. **Message Processing**: AI responses → Follow-up triggers → Automation execution

### Contact Management Flow
1. **Contact Creation**: Form input → Validation → Firebase → External API sync
2. **Contact Updates**: UI changes → Firebase → Real-time propagation
3. **Bulk Operations**: Selection → Processing queue → Batch execution

### User Management Flow
1. **User Creation**: Form → Firebase Auth → Firestore profile → WhatsApp notification
2. **Role Assignment**: Permission check → Role update → Access control refresh

## Authentication & Authorization

### Firebase Authentication
- Email/password authentication
- Role-based access control stored in Firestore
- Session management with automatic token refresh

### Permission System
```typescript
interface UserRole {
  "1": "Admin",     // Full access
  "2": "Sales",     // Customer interaction
  "3": "Observer",  // Read-only
  "4": "Manager",   // Team management
  "5": "Supervisor" // Team oversight
}
```

### Access Control Implementation
- Route-level protection based on user roles
- Component-level permission checks
- API endpoint authorization
- Data filtering based on user permissions

## Firebase Integration

### Firestore Structure
```
companies/{companyId}/
├── employee/           # Employee profiles
├── contacts/          # Customer contacts
├── messages/          # Chat messages
├── scheduled/         # Scheduled messages
├── followups/         # Follow-up templates
├── quickreplies/      # Quick reply templates
└── settings/          # Company settings

user/{userEmail}       # User profiles and permissions
```

### Real-time Listeners
- Contact updates
- Message synchronization
- User status changes
- System notifications

### Storage Integration
- Profile image uploads
- Document attachments
- Media file storage
- Backup and archival

## API Integration

### WhatsApp Business API
- Message sending/receiving
- Media handling
- Contact synchronization
- Webhook processing

### External Integrations
- Google Calendar API
- CSV import/export
- Third-party CRM systems

## Development Setup

### Prerequisites
```bash
Node.js 18+
npm or yarn
Firebase CLI
```

### Installation
```bash
# Clone repository
git clone [repository-url]
cd juta-crm

# Install dependencies
npm install

# Environment setup
cp .env.example .env
# Configure Firebase credentials

# Start development server
npm run dev
```

### Environment Variables
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Build Process
```bash
# Production build
npm run build

# Preview build
npm run preview

# Type checking
npm run type-check
```

## Deployment

### Firebase Hosting
```bash
# Build and deploy
npm run build
firebase deploy
```

### Environment Configuration
- Production Firebase project
- WhatsApp Business API endpoints
- CDN configuration for media files

## Troubleshooting

### Common Issues

#### 1. Authentication Problems
- Check Firebase configuration
- Verify user roles in Firestore
- Clear browser cache and localStorage

#### 2. Real-time Updates Not Working
- Check Firebase security rules
- Verify network connectivity
- Monitor browser console for errors

#### 3. WhatsApp Integration Issues
- Verify API endpoints
- Check phone number configuration
- Monitor webhook responses

#### 4. Performance Issues
- Implement pagination for large datasets
- Optimize Firebase queries
- Use React.memo for expensive components

### Debug Tools
- Firebase Console for database inspection
- Browser DevTools for network monitoring
- Redux DevTools for state debugging

### Monitoring
- Firebase Analytics for usage tracking
- Error logging with Firebase Crashlytics
- Performance monitoring

## Component Architecture Deep Dive

### Chat Component Structure
The Chat component (`src/pages/Chat/index.tsx`) is the most complex component in the system:

```typescript
// Key state management
const [contacts, setContacts] = useState<Contact[]>([]);
const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
const [messages, setMessages] = useState<Message[]>([]);
const [newMessage, setNewMessage] = useState("");

// Real-time listeners
useEffect(() => {
  setupMessageListener();
  setupContactListener();
}, [companyId]);

// Message handling
const handleSendMessage = async () => {
  // Validation, API call, state update
};
```

### Contact Management Flow
```typescript
// Contact filtering and search
const getFilteredContacts = () => {
  return contacts.filter(contact => {
    // Tag filtering
    // Search filtering
    // Role-based filtering
  });
};

// Bulk operations
const handleBulkOperation = async (operation: string, selectedContacts: Contact[]) => {
  // Process in batches
  // Update UI progressively
  // Handle errors gracefully
};
```

### User Role Management
```typescript
// Role-based component rendering
const isFieldDisabled = (fieldName: string) => {
  if (currentUserRole === "1") return false; // Admin
  if (currentUserRole === "3") return fieldName !== "password"; // Observer
  return userData.role === "3"; // Can't edit observers
};
```

## State Management Patterns

### Redux Store Structure
```typescript
// Store configuration
export const store = configureStore({
  reducer: {
    theme: themeSlice,
    colorScheme: colorSchemeSlice,
    darkMode: darkModeSlice,
    menu: menuSlice,
  },
});
```

### Context Providers
```typescript
// Contacts context for global contact state
export const ContactsProvider = ({ children }) => {
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  return (
    <ContactsContext.Provider value={{ contacts, isLoading }}>
      {children}
    </ContactsContext.Provider>
  );
};
```

## Performance Optimization

### Lazy Loading
```typescript
// Component lazy loading
const Chat = lazy(() => import("../pages/Chat"));
const Dashboard = lazy(() => import("../pages/DashboardOverview1"));

// Data pagination
const loadMoreContacts = () => {
  setCurrentPage(prev => prev + 1);
  fetchContacts(currentPage + 1);
};
```

### Memoization
```typescript
// Expensive calculations
const filteredContacts = useMemo(() => {
  return contacts.filter(contact => 
    contact.contactName.toLowerCase().includes(searchQuery.toLowerCase())
  );
}, [contacts, searchQuery]);

// Component memoization
const ContactCard = React.memo(({ contact }) => {
  return <div>{contact.contactName}</div>;
});
```

### Real-time Optimization
```typescript
// Debounced updates
const debouncedSearch = useCallback(
  debounce((query: string) => {
    performSearch(query);
  }, 300),
  []
);

// Batch updates
const batchUpdateContacts = (updates: ContactUpdate[]) => {
  const batch = writeBatch(firestore);
  updates.forEach(update => {
    const docRef = doc(firestore, 'contacts', update.id);
    batch.update(docRef, update.data);
  });
  return batch.commit();
};
```

## Security Considerations

### Data Validation
```typescript
// Input sanitization
const sanitizeInput = (input: string) => {
  return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
};

// Role validation
const validateUserRole = (requiredRole: string, userRole: string) => {
  const roleHierarchy = { "1": 5, "4": 4, "5": 3, "2": 2, "3": 1 };
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};
```

### Firebase Security Rules
```javascript
// Example Firestore rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /companies/{companyId}/contacts/{contactId} {
      allow read, write: if request.auth != null && 
        resource.data.companyId == get(/databases/$(database)/documents/user/$(request.auth.token.email)).data.companyId;
    }
  }
}
```

## Testing Strategy

### Unit Testing
```typescript
// Component testing
import { render, screen, fireEvent } from '@testing-library/react';
import ContactCard from './ContactCard';

test('renders contact name', () => {
  const contact = { id: '1', contactName: 'John Doe' };
  render(<ContactCard contact={contact} />);
  expect(screen.getByText('John Doe')).toBeInTheDocument();
});
```

### Integration Testing
```typescript
// API integration tests
test('sends message successfully', async () => {
  const mockResponse = { success: true };
  jest.spyOn(global, 'fetch').mockResolvedValue({
    json: jest.fn().mockResolvedValue(mockResponse),
  });
  
  const result = await sendMessage('chat123', 'Hello');
  expect(result.success).toBe(true);
});
```

## Key Files Reference

### Critical Files to Understand
1. **`src/pages/Chat/index.tsx`** - Main chat interface (6,000+ lines)
2. **`src/pages/CrudDataList/index.tsx`** - Contact management
3. **`src/pages/CrudForm/index.tsx`** - User management
4. **`src/pages/DashboardOverview1/index.tsx`** - Analytics dashboard
5. **`src/router/index.tsx`** - Application routing
6. **`src/themes/Tinker/SimpleMenu/index.tsx`** - Main layout

### Configuration Files
- **Firebase config** - Embedded in components (should be moved to env)
- **Theme configuration** - `src/stores/themeSlice.ts`
- **Menu structure** - `src/main/simple-menu.ts`

### Type Definitions
- **Contact interface** - Defined in multiple files, needs consolidation
- **Message interface** - Complex structure for different message types
- **User roles** - String-based role system

## Migration Notes for New Developer

### Immediate Priorities
1. **Consolidate Firebase configuration** - Move to environment variables
2. **Type safety improvements** - Centralize interface definitions
3. **Error handling** - Implement consistent error boundaries
4. **Performance optimization** - Add proper loading states and pagination
5. **Code organization** - Break down large components into smaller modules

### Technical Debt
- Large component files (Chat component is 6,000+ lines)
- Inconsistent error handling
- Mixed TypeScript/JavaScript patterns
- Hardcoded configuration values
- Duplicate interface definitions

### Recommended Improvements
1. Implement proper error boundaries
2. Add comprehensive loading states
3. Optimize real-time listeners
4. Implement proper caching strategies
5. Add comprehensive testing suite

### Deployment Checklist

#### Pre-deployment
- [ ] Run type checking: `npm run type-check`
- [ ] Run build: `npm run build`
- [ ] Test production build: `npm run preview`
- [ ] Update environment variables
- [ ] Check Firebase security rules
- [ ] Verify API endpoints

#### Post-deployment
- [ ] Monitor error logs
- [ ] Check real-time functionality
- [ ] Verify user authentication
- [ ] Test critical user flows
- [ ] Monitor performance metrics

## Common Development Patterns

### Error Handling Pattern
```typescript
const handleAsyncOperation = async () => {
  try {
    setIsLoading(true);
    const result = await apiCall();
    setData(result);
    toast.success("Operation successful");
  } catch (error) {
    console.error("Operation failed:", error);
    toast.error(`Error: ${error.message}`);
  } finally {
    setIsLoading(false);
  }
};
```

### Form Validation Pattern
```typescript
const validateForm = () => {
  const errors: { [key: string]: string } = {};
  const requiredFields = ['name', 'email', 'role'];
  
  requiredFields.forEach(field => {
    if (!formData[field]) {
      errors[field] = `${field} is required`;
    }
  });
  
  setFieldErrors(errors);
  return Object.keys(errors).length === 0;
};
```

### Real-time Listener Pattern
```typescript
useEffect(() => {
  if (!companyId) return;
  
  const unsubscribe = onSnapshot(
    collection(firestore, `companies/${companyId}/contacts`),
    (snapshot) => {
      const updatedContacts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setContacts(updatedContacts);
    },
    (error) => {
      console.error("Real-time listener error:", error);
    }
  );
  
  return () => unsubscribe();
}, [companyId]);
```

This comprehensive documentation provides everything a new frontend developer needs to understand and work with the Juta CRM system effectively.
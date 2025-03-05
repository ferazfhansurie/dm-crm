export interface User {
    id?: string;
    email: string;
    name?: string;
    companyId: string;
    role?: 'admin' | 'user' | 'manager';
    createdAt?: any; // Firebase Timestamp
    updatedAt?: any; // Firebase Timestamp
    status?: 'active' | 'inactive';
    phoneNumber?: string;
    preferences?: UserPreferences;
}

interface UserPreferences {
    notifications?: {
        email: boolean;
        push: boolean;
        sms: boolean;
    };
    theme?: 'light' | 'dark' | 'system';
    timezone?: string;
} 
export interface FollowUpTemplate {
    id: string;
    name: string;
    status: 'active' | 'inactive';
    createdAt: Date;
    startTime: Date;
    isCustomStartTime: boolean;
    startType?: 'immediate' | 'delayed' | 'custom';
    triggerTags?: string[];
    triggerKeywords?: string[];
    batchSettings: BatchSettings;
}

export interface FollowUpMessage {
    id: string;
    message: string;
    dayNumber: number;
    sequence: number;
    status: 'active' | 'inactive';
    createdAt: Date;
    document?: string | null;
    image?: string | null;
    delayAfter?: {
        value: number;
        unit: 'minutes' | 'hours' | 'days';
        isInstantaneous: boolean;
    };
    specificNumbers: {
        enabled: boolean;
        numbers: string[];
    };
    useScheduledTime: boolean;
    scheduledTime: string;
    templateId?: string;
}

export interface BatchSettings {
    startDateTime: string;
    contactsPerBatch: number;
    repeatEvery: {
        value: number;
        unit: 'minutes';
    };
    messageDelay: {
        min: number;
        max: number;
        unit: 'seconds' | 'minutes';
    };
    sleepSettings: {
        enabled: boolean;
        activeHours: {
            start: string;
            end: string;
        };
    };
    isNeverending: boolean;
}

export interface ScheduledMessage {
    id?: string;
    contactId: string;
    templateId: string;
    messageId: string;
    scheduledTime: any; // Firebase Timestamp
    status: 'pending' | 'sent' | 'failed';
    message: string;
    document?: string | null;
    image?: string | null;
    createdAt?: any; // Firebase Timestamp
    sentAt?: any; // Firebase Timestamp
    error?: string | null;
} 
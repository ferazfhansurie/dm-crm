import { 
    getFirestore, 
    collection, 
    query, 
    where, 
    getDocs, 
    doc, 
    getDoc, 
    updateDoc,
    addDoc,
    serverTimestamp,
    Timestamp,
    orderBy,
    limit 
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';
import { FollowUpTemplate, FollowUpMessage } from '../types/followUp';
import { User } from '../types/user';

class FollowUpService {
    private firestore = getFirestore();
    private functions = getFunctions();

    /**
     * Processes all active follow-up templates and schedules messages
     * This should be called periodically by a cloud function
     */
    async processFollowUpTemplates(companyId: string) {
        try {
            // Get all active templates
            const templatesRef = collection(this.firestore, `companies/${companyId}/followUpTemplates`);
            const templatesQuery = query(templatesRef, where('status', '==', 'active'));
            const templatesSnapshot = await getDocs(templatesQuery);

            const templates = templatesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as FollowUpTemplate[];

            // Process each template
            for (const template of templates) {
                await this.processTemplate(companyId, template);
            }

            return { success: true, message: `Processed ${templates.length} templates` };
        } catch (error) {
            console.error('Error processing follow-up templates:', error);
            return { success: false, message: 'Failed to process follow-up templates' };
        }
    }

    /**
     * Process a single template
     */
    private async processTemplate(companyId: string, template: FollowUpTemplate) {
        try {
            // 1. Find contacts that match template criteria
            const contacts = await this.findMatchingContacts(companyId, template);
            
            // 2. For each matching contact, schedule follow-up messages
            for (const contact of contacts) {
                await this.scheduleMessagesForContact(companyId, template, contact);
            }
        } catch (error) {
            console.error(`Error processing template ${template.id}:`, error);
        }
    }

    /**
     * Find contacts that match the template's criteria (tags/keywords)
     */
    private async findMatchingContacts(companyId: string, template: FollowUpTemplate) {
        const contactsRef = collection(this.firestore, `companies/${companyId}/contacts`);
        let matchedContacts: any[] = [];

        // Find contacts with matching tags
        if (template.triggerTags && template.triggerTags.length > 0) {
            const tagQuery = query(
                contactsRef, 
                where('tags', 'array-contains-any', template.triggerTags)
            );
            const tagMatches = await getDocs(tagQuery);
            matchedContacts = tagMatches.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        }

        // Find contacts with matching keywords in messages
        // This is more complex and might require a Cloud Function
        
        return matchedContacts;
    }

    /**
     * Schedule follow-up messages for a contact based on the template
     */
    private async scheduleMessagesForContact(companyId: string, template: FollowUpTemplate, contact: any) {
        // Check if this contact already has scheduled messages for this template
        const scheduledRef = collection(this.firestore, `companies/${companyId}/scheduledMessages`);
        const existingQuery = query(
            scheduledRef,
            where('contactId', '==', contact.id),
            where('templateId', '==', template.id)
        );
        const existingDocs = await getDocs(existingQuery);
        
        if (!existingDocs.empty) {
            // Contact already has scheduled messages for this template
            return;
        }

        // Get all messages for the template
        const messagesRef = collection(this.firestore, `companies/${companyId}/followUpTemplates/${template.id}/messages`);
        const messagesQuery = query(messagesRef, orderBy('dayNumber'), orderBy('sequence'));
        const messagesSnapshot = await getDocs(messagesQuery);
        
        const messages = messagesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as FollowUpMessage[];

        console.log(`Scheduling ${messages.length} messages for contact ${contact.id} with template ${template.id}`);

        // Schedule each message
        let previousScheduledTime: Date | null = null;
        
        for (const message of messages) {
            let scheduledTime: Date;
            
            if (message.useScheduledTime) {
                // Use the specified time on the day determined by dayNumber
                const baseDate = new Date();
                baseDate.setDate(baseDate.getDate() + message.dayNumber - 1);
                
                const [hours, minutes] = message.scheduledTime.split(':');
                scheduledTime = new Date(baseDate);
                scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                console.log(`Message ${message.id} (day ${message.dayNumber}, seq ${message.sequence}) - Using scheduled time: ${scheduledTime.toLocaleString()}`);
            } else {
                // Calculate based on previous message time plus delay
                if (!previousScheduledTime) {
                    // First message uses template start time
                    if (template.isCustomStartTime && template.startTime) {
                        scheduledTime = new Date(template.startTime);
                        console.log(`First message ${message.id} - Using custom template start time: ${scheduledTime.toLocaleString()}`);
                    } else {
                        scheduledTime = new Date();
                        if (template.startType === 'delayed') {
                            scheduledTime.setHours(scheduledTime.getHours() + 24);
                            console.log(`First message ${message.id} - Using delayed start (24h): ${scheduledTime.toLocaleString()}`);
                        } else {
                            console.log(`First message ${message.id} - Using immediate start: ${scheduledTime.toLocaleString()}`);
                        }
                    }

                    // Apply delay for first message if it's not instantaneous
                    if (message.delayAfter && !message.delayAfter.isInstantaneous) {
                        const { value, unit } = message.delayAfter;
                        const originalTime = new Date(scheduledTime);
                        
                        switch (unit) {
                            case 'minutes':
                                scheduledTime.setMinutes(scheduledTime.getMinutes() + value);
                                break;
                            case 'hours':
                                scheduledTime.setHours(scheduledTime.getHours() + value);
                                break;
                            case 'days':
                                scheduledTime.setDate(scheduledTime.getDate() + value);
                                break;
                        }
                        console.log(`First message ${message.id} - Applied delay of ${value} ${unit}: ${originalTime.toLocaleString()} → ${scheduledTime.toLocaleString()}`);
                    }
                } else {
                    // Subsequent messages use delay from previous
                    scheduledTime = new Date(previousScheduledTime);
                    console.log(`Message ${message.id} (day ${message.dayNumber}, seq ${message.sequence}) - Starting from previous scheduled time: ${scheduledTime.toLocaleString()}`);
                    
                    if (message.delayAfter?.isInstantaneous) {
                        // Add a small delay (1 minute) for "instantaneous" messages
                        const originalTime = new Date(scheduledTime);
                        scheduledTime.setMinutes(scheduledTime.getMinutes() + 1);
                        console.log(`Message ${message.id} - Using instantaneous delay (1 min): ${originalTime.toLocaleString()} → ${scheduledTime.toLocaleString()}`);
                    } else {
                        // Add the specified delay
                        const { value, unit } = message.delayAfter || { value: 5, unit: 'minutes' };
                        const originalTime = new Date(scheduledTime);
                        
                        switch (unit) {
                            case 'minutes':
                                scheduledTime.setMinutes(scheduledTime.getMinutes() + value);
                                break;
                            case 'hours':
                                scheduledTime.setHours(scheduledTime.getHours() + value);
                                break;
                            case 'days':
                                scheduledTime.setDate(scheduledTime.getDate() + value);
                                break;
                        }
                        console.log(`Message ${message.id} - Applied delay of ${value} ${unit}: ${originalTime.toLocaleString()} → ${scheduledTime.toLocaleString()}`);
                    }
                }
            }
            
            // Apply batch settings if needed
            if (template.batchSettings) {
                // Add delay based on batch settings
                const delay = this.calculateBatchDelay(template.batchSettings);
                const originalTime = new Date(scheduledTime);
                scheduledTime.setMinutes(scheduledTime.getMinutes() + delay);
                console.log(`Message ${message.id} - Applied batch delay of ${delay} minutes: ${originalTime.toLocaleString()} → ${scheduledTime.toLocaleString()}`);
            }

            // Only schedule if the time is in the future
            if (scheduledTime > new Date()) {
                // Create scheduled message
                await addDoc(scheduledRef, {
                    contactId: contact.id,
                    templateId: template.id,
                    messageId: message.id,
                    scheduledTime: Timestamp.fromDate(scheduledTime),
                    status: 'pending',
                    message: message.message,
                    document: message.document,
                    image: message.image,
                    createdAt: serverTimestamp()
                });
                console.log(`Message ${message.id} - Successfully scheduled for ${scheduledTime.toLocaleString()}`);
            } else {
                console.log(`Message ${message.id} - Not scheduled because time is in the past: ${scheduledTime.toLocaleString()}`);
            }
            
            // Update for next message
            previousScheduledTime = scheduledTime;
        }
    }
    
    /**
     * Calculate random delay based on batch settings
     */
    private calculateBatchDelay(batchSettings: any): number {
        const { messageDelay } = batchSettings;
        if (!messageDelay) return 0;
        
        const { min, max } = messageDelay;
        // Calculate random delay between min and max
        const delayValue = Math.floor(Math.random() * (max - min + 1)) + min;
        
        // Convert to minutes if in seconds
        return messageDelay.unit === 'seconds' ? delayValue / 60 : delayValue;
    }
    
    /**
     * Execute pending scheduled messages
     * This should be called frequently by a cloud function
     */
    async executePendingMessages(companyId: string) {
        try {
            const now = new Date();
            const scheduledRef = collection(this.firestore, `companies/${companyId}/scheduledMessages`);
            
            // Find messages due for sending
            const pendingQuery = query(
                scheduledRef,
                where('status', '==', 'pending'),
                where('scheduledTime', '<=', Timestamp.fromDate(now)),
                limit(50) // Process in batches to avoid overloading
            );
            
            const pendingSnapshot = await getDocs(pendingQuery);
            let sentCount = 0;
            
            for (const scheduledDoc of pendingSnapshot.docs) {
                const scheduledMessage = scheduledDoc.data();
                
                // Send the message
                const success = await this.sendMessage(
                    companyId,
                    scheduledMessage.contactId,
                    scheduledMessage.message,
                    scheduledMessage.document,
                    scheduledMessage.image
                );
                
                // Update status
                await updateDoc(scheduledDoc.ref, {
                    status: success ? 'sent' : 'failed',
                    sentAt: success ? serverTimestamp() : null,
                    error: success ? null : 'Failed to send message'
                });
                
                if (success) sentCount++;
            }
            
            return { success: true, message: `Sent ${sentCount} of ${pendingSnapshot.size} pending messages` };
        } catch (error) {
            console.error('Error executing pending messages:', error);
            return { success: false, message: 'Failed to execute pending messages' };
        }
    }
    
    /**
     * Send a message to a contact
     */
    private async sendMessage(companyId: string, contactId: string, message: string, document?: string, image?: string) {
        try {
            // Get contact data
            const contactRef = doc(this.firestore, `companies/${companyId}/contacts`, contactId);
            const contactSnap = await getDoc(contactRef);
            if (!contactSnap.exists()) return false;
            
            const contact = contactSnap.data();
            
            // Send message via Firebase Cloud Function
            const sendMessageFn = httpsCallable(this.functions, 'sendMessage');
            const result = await sendMessageFn({
                companyId,
                contactId,
                phoneNumber: contact.phoneNumber,
                message,
                document,
                image
            });
            
            // Log the message in chat history
            await addDoc(collection(this.firestore, `companies/${companyId}/contacts/${contactId}/messages`), {
                content: message,
                document,
                image,
                sender: 'company',
                timestamp: serverTimestamp(),
                status: 'sent',
                isFollowUp: true
            });
            
            return (result.data as any).success;
        } catch (error) {
            console.error('Error sending message:', error);
            return false;
        }
    }
    
    /**
     * Test function to verify follow-up execution
     */
    async testFollowUpExecution(templateId: string) {
        try {
            // Get the current user's company ID
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) {
                return { success: false, message: 'User not authenticated' };
            }

            const userRef = doc(this.firestore, 'user', user.email!);
            const userSnapshot = await getDoc(userRef);
            if (!userSnapshot.exists()) {
                return { success: false, message: 'User profile not found' };
            }
            
            const userData = userSnapshot.data() as User;
            const companyId = userData.companyId;

            // Get the template
            const templateRef = doc(this.firestore, `companies/${companyId}/followUpTemplates`, templateId);
            const templateSnapshot = await getDoc(templateRef);
            if (!templateSnapshot.exists()) {
                return { success: false, message: 'Template not found' };
            }
            
            const template = {
                id: templateId,
                ...templateSnapshot.data()
            } as FollowUpTemplate;

            // Create a test contact
            const contactsRef = collection(this.firestore, `companies/${companyId}/contacts`);
            const testContact = {
                name: 'Test Contact',
                phone: `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`, // Random US number
                email: `test-${Date.now()}@example.com`,
                tags: template.triggerTags || [],
                createdAt: serverTimestamp(),
                isTestContact: true // Mark as test contact
            };
            
            const contactDoc = await addDoc(contactsRef, testContact);
            
            // Schedule messages for this contact
            await this.scheduleMessagesForContact(companyId, template, {
                id: contactDoc.id,
                ...testContact
            });
            
            return { 
                success: true, 
                message: 'Test follow-up scheduled successfully! Check your messages in a few minutes.' 
            };
        } catch (error) {
            console.error('Error testing follow-up execution:', error);
            return { 
                success: false, 
                message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
            };
        }
    }
}

export const followUpService = new FollowUpService(); 
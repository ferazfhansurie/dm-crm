export interface Contact {
  conversation_id?: string | null;
  additionalEmails?: string[] | null;
  address1?: string | null;
  assignedTo?: string | null;
  businessId?: string | null;
  city?: string | null;
  companyName?: string | null;
  contactName?: string | null;
  country?: string | null;
  customFields?: any[] | null;
  dateAdded?: string | null;
  dateOfBirth?: string | null;
  dateUpdated?: string | null;
  dnd?: boolean | null;
  dndSettings?: any | null;
  email?: string | null;
  firstName?: string | null;
  followers?: string[] | null;
  id?: string | null;
  lastName?: string | null;
  locationId?: string | null;
  phone?: string | null;
  postalCode?: string | null;
  source?: string | null;
  state?: string | null;
  tags?: string[] | null;
  type?: string | null;
  website?: string | null;
  chat?: any[] | null;
  last_message?: {
    chat_id: string;
    from: string;
    from_me: boolean;
    id: string;
    text: {
      body: string;
    };
    timestamp: number;
    type: string;
  } | null;
  chat_id?: string | null;
  unreadCount?: number | null;
  pinned?: boolean | null;
  profilePicUrl?: string;
  phoneIndex?: number | null;
  points?: number | null;
  phoneIndexes?: number[] | null;
} 
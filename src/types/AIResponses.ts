export type AIResponseType = 'Tag' | 'Image' | 'Voice' | 'Document' | 'Assign' | 'Video';

export interface BaseAIResponse {
  id: string;
  keywords: string[];
  createdAt: Date;
  status: 'active' | 'inactive';
  description?: string;
  keywordSource: 'user' | 'bot' | 'own';
}

export interface AITagResponse extends BaseAIResponse {
  type: 'Tag';
  tags: string[];
  tagActionMode?: 'add' | 'delete';
  removeTags?: string[];
}

export interface AIImageResponse extends BaseAIResponse {
  type: 'Image';
  imageUrl?: string;
  imageUrls?: string[];
}

export interface AIVoiceResponse extends BaseAIResponse {
  type: 'Voice';
  voiceUrls: string[];
  captions?: string[];
}

export interface AIDocumentResponse extends BaseAIResponse {
  type: 'Document';
  documentUrls: string[];
  documentNames: string[];
}
export interface AIAssignResponse extends BaseAIResponse {
  type: 'Assign';
  assignedEmployees: string[];
}

export interface AIVideoResponse extends BaseAIResponse {
  type: 'Video';
  videoUrls: string[];
  videoTitles?: string[];
}

export type AIResponse = AITagResponse | AIImageResponse | AIVoiceResponse | AIDocumentResponse | AIAssignResponse | AIVideoResponse; 
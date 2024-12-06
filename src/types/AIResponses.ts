export type AIResponseType = 'Tag' | 'Image' | 'Voice' | 'Document';

export interface BaseAIResponse {
  id: string;
  keywords: string[];
  createdAt: Date;
  status: 'active' | 'inactive';
  description?: string;
}

export interface AITagResponse extends BaseAIResponse {
  type: 'Tag';
  tags: string[];
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

export type AIResponse = AITagResponse | AIImageResponse | AIVoiceResponse | AIDocumentResponse; 
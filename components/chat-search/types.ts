export type Message = {
  id: string;
  from: 'user' | 'ai' | 'system';
  text: string;
};

export type WhyModalReason = {
  factor: string;
  description: string;
  weight?: number;
};

import type { SearchOrigin } from '../SearchOriginBadge';

export type WhyModalState = {
  apartmentId: string;
  apartmentTitle: string;
  score: number;
  origin: SearchOrigin;
  reasons: WhyModalReason[];
  aiReasons: string[];
  scoreComponents: {
    aiScore?: number | null;
    featureMatchScore?: number | null;
    semanticScore?: number | null;
  };
};

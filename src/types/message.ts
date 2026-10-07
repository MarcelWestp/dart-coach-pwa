export type MessageCategory = 'absence' | 'tournament' | 'general';

export interface CoachMessage {
  id?: string;
  playerId: string;
  coachId: string;
  category: MessageCategory;
  subject: string;
  content: string;
  startDate?: string; // Optional bei Urlaub/Abwesenheit
  endDate?: string;   // Optional bei Urlaub/Abwesenheit
  isRead: boolean;
  createdAt: string;
}
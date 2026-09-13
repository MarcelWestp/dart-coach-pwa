export interface AppFeedback {
  id?: string;
  userId: string;
  userEmail: string;
  userNickname: string;
  type: 'idea' | 'bug' | 'other';
  message: string;
  createdAt: string;
  status: 'open' | 'in_review' | 'done';
}
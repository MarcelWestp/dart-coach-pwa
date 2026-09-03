export interface PlayerGroup {
  id: string;
  name: string;
  description?: string;
  coachId: string;        // ID des Trainers, der die Gruppe verwaltet
  memberIds: string[];    // Array von User-UIDs der zugewiesenen Spieler
  createdAt: string;
  updatedAt: string;
}
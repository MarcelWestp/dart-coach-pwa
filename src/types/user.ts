export type UserRole = 'player' | 'coach' | 'admin';

export type VisibilitySetting = 'realName' | 'nickname' | 'both';

export type ThemePreference = 'light' | 'dark';

export interface EquipmentSettings {
  dartBarrel?: string;      // z. B. "Target Target Gabriel Clemens 21g"
  dartShaft?: string;       // z. B. "L-Style Carbon Short"
  dartFlight?: string;      // z. B. "L-Style EZ Standard"
  favoritePlayer?: string;  // z. B. "Phil Taylor" / "Martin Schindler"
  scoringSystem?: 'none' | 'scolia' | 'autodarts' | 'godartspro' | 'other';
  systemUsername?: string;  // Nutzername beim jeweiligen System
}

export interface TrainerLicense {
  id: string;
  title: string;             // z. B. "DOSB Trainer B Leistungssport"
  issuer: string;            // z. B. "Deutscher Dart Verband"
  licenseNumber?: string;    // Lizenznummer (optional)
  issuedAt?: string;         // Ausstellungsdatum
  validUntil?: string;       // Gültig bis (optional)
  fileUrl: string;           // URL der hochgeladenen Datei (Firebase Storage)
  fileType: 'image' | 'pdf'; // Dateityp
  status: 'pending' | 'approved' | 'rejected'; // Freigabestatus
  createdAt: string;
}

export interface NotificationSettings {
  enabled: boolean;                      // Haupt-Schalter (Alle an/aus)
  newOrUpdatedTrainingPlans: boolean;    // Neue / bearbeitete Trainingspläne
  newOrUpdatedPerformanceTest: boolean;  // Neuer / geänderter Leistungstest
  monthlyExerciseHighscore: boolean;     // Neuer Highscore in Übung des Monats
  achievementUnlocked: boolean;     // Neuer Highscore in Übung des Monats
  trainingPlanReminder: boolean;         // Erinnerung vor Ablauf des Trainingsplans
  reminderDaysBefore: number;            // Tage vor Ablauf (1, 2 oder 3)
}

export interface WidgetConfig {
  id: string;
  title: string;
  enabled: boolean;
  required?: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  realName: string;
  nickname: string;
  roles: UserRole[];
  isApproved: boolean;
  assignedCoachId?: string;
  privacySettings: {
    leaderboardVisibility: VisibilitySetting;
    showEquipmentPublicly?: boolean; // DSGVO: Wahl, ob Equipment öffentlich ist
  };
  notificationSettings?: NotificationSettings; // <--- Erweiterte Einstellungen
  equipment?: EquipmentSettings; // Neu: Equipment & Angaben
  themePreference?: ThemePreference;
  fcmToken?: string | null;
  photoURL?: string;
  createdAt: string;
  updatedAt: string;
  dashboardWidgets?: WidgetConfig[];
  favoriteExerciseIds?: string[]; // Liste der IDs der Lieblingsübungen
  trainerLicenses?: TrainerLicense[]; // Neu: Liste der Lizenzen
}
import React, { useState, useEffect } from "react";
import {
  doc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  getDocs,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import {
  updateProfile,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { db, storage, auth } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { useThemeContext } from "../../context/ThemeContext";
import type {
  VisibilitySetting,
  ThemePreference,
  EquipmentSettings,
  NotificationSettings,
  TrainerLicense,
} from "../../types/user";
import type {
  DynamicAchievement,
  UserAchievementProgress,
  AchievementTier,
} from "../../types/achievement";
import {
  Paper,
  Typography,
  TextField,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
  FormControl,
  Alert,
  Switch,
  Divider,
  Box,
  CircularProgress,
  Avatar,
  IconButton,
  Select,
  MenuItem,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Chip,
  Card,
  CardContent,
  Tabs,
  Tab,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import SportsMartsIcon from "@mui/icons-material/Sports";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import SecurityIcon from "@mui/icons-material/Security";
import PaletteIcon from "@mui/icons-material/Palette";
import LockIcon from "@mui/icons-material/Lock";
import NotificationsIcon from "@mui/icons-material/Notifications";
import FeedbackIcon from "@mui/icons-material/Feedback";
import SendIcon from "@mui/icons-material/Send";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import PendingIcon from "@mui/icons-material/HourglassEmpty";
import CancelIcon from "@mui/icons-material/Cancel";
import DeleteIcon from "@mui/icons-material/Delete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { calculateUserLevel } from "../../utils/level";
import { SendCoachMessageModal } from "./SendCoachMessageModal";

const TIER_COLORS: Record<AchievementTier, { color: string; label: string }> = {
  bronze: { color: "#CD7F32", label: "Bronze" },
  silver: { color: "#C0C0C0", label: "Silber" },
  gold: { color: "#FFD700", label: "Gold" },
  platinum: { color: "#E5E4E2", label: "Platin" },
  diamond: { color: "#B9F2FF", label: "Diamant" },
};

interface UserProfileViewProps {
  onNavigateToAchievements?: () => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  onNavigateToAchievements,
}) => {
  const { userProfile, refreshUserProfile, logout } = useAuth();
  const { mode, toggleTheme } = useThemeContext();

  // Tab State (0: Profil & Equipment, 1: Erfolge & Lizenzen, 2: Design & Benachrichtigungen, 3: Sicherheit & Feedback)
  const [activeTab, setActiveTab] = useState(0);

  // Stammdaten & Profil-Titel
  const [realName, setRealName] = useState("");
  const [nickname, setNickname] = useState("");
  const [selectedTitle, setSelectedTitle] = useState("");
  const [visibility, setVisibility] = useState<VisibilitySetting>("nickname");
  const [showEquipmentPublicly, setShowEquipmentPublicly] = useState(true);

  // Equipment States
  const [dartBarrel, setDartBarrel] = useState("");
  const [dartShaft, setDartShaft] = useState("");
  const [dartFlight, setDartFlight] = useState("");
  const [favoritePlayer, setFavoritePlayer] = useState("");
  const [scoringSystem, setScoringSystem] =
    useState<EquipmentSettings["scoringSystem"]>("none");
  const [systemUsername, setSystemUsername] = useState("");

  // Trainer-Lizenz Upload State
  const [licenseTitle, setLicenseTitle] = useState("");
  const [licenseIssuer, setLicenseIssuer] = useState("");
  const [licenseValidUntil, setLicenseValidUntil] = useState("");
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [licenseUploading, setLicenseUploading] = useState(false);

  // Achievements States
  const [achievements, setAchievements] = useState<DynamicAchievement[]>([]);
  const [userProgress, setUserProgress] = useState<
    Record<string, UserAchievementProgress>
  >({});
  const [loadingAchievements, setLoadingAchievements] = useState(false);

  // Benachrichtigungen States
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notifyPlans, setNotifyPlans] = useState(true);
  const [notifyPerformanceTests, setNotifyPerformanceTests] = useState(true);
  const [notifyHighscores, setNotifyHighscores] = useState(true);
  const [notifyPlanReminder, setNotifyPlanReminder] = useState(true);
  const [notifyAchievements, setNotifyAchievements] = useState(true);
  const [reminderDays, setReminderDays] = useState<number>(1);

  // Feedback & Ideen States
  const [feedbackType, setFeedbackType] = useState<"idea" | "bug" | "other">(
    "idea",
  );
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Passwort Ändern States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // UI States
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // DSGVO Account Löschen Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Message States
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);

  const isCoachOrAdmin =
    userProfile?.roles?.includes("coach") ||
    userProfile?.roles?.includes("admin");

  useEffect(() => {
    if (userProfile) {
      setRealName(userProfile.realName || "");
      setNickname(userProfile.nickname || "");
      setSelectedTitle(userProfile.activeTitle || "");
      setVisibility(
        userProfile.privacySettings?.leaderboardVisibility || "nickname",
      );
      setShowEquipmentPublicly(
        userProfile.privacySettings?.showEquipmentPublicly !== false,
      );

      if (userProfile.equipment) {
        setDartBarrel(userProfile.equipment.dartBarrel || "");
        setDartShaft(userProfile.equipment.dartShaft || "");
        setDartFlight(userProfile.equipment.dartFlight || "");
        setFavoritePlayer(userProfile.equipment.favoritePlayer || "");
        setScoringSystem(userProfile.equipment.scoringSystem || "none");
        setSystemUsername(userProfile.equipment.systemUsername || "");
      }

      if (userProfile.notificationSettings) {
        const notif = userProfile.notificationSettings;
        setNotificationsEnabled(notif.enabled ?? true);
        setNotifyPlans(notif.newOrUpdatedTrainingPlans ?? true);
        setNotifyPerformanceTests(notif.newOrUpdatedPerformanceTest ?? true);
        setNotifyHighscores(notif.monthlyExerciseHighscore ?? true);
        setNotifyPlanReminder(notif.trainingPlanReminder ?? true);
        setNotifyAchievements(notif.achievementUnlocked ?? true);
        setReminderDays(notif.reminderDaysBefore ?? 1);
      }

      fetchAchievementsData();
    }
  }, [userProfile]);

  const fetchAchievementsData = async () => {
    if (!userProfile?.uid) return;
    setLoadingAchievements(true);
    try {
      const [achSnap, progSnap] = await Promise.all([
        getDocs(collection(db, "achievements")),
        getDocs(collection(db, `users/${userProfile.uid}/achievements`)),
      ]);

      const fetchedAch: DynamicAchievement[] = [];
      achSnap.forEach((d) =>
        fetchedAch.push({ id: d.id, ...d.data() } as DynamicAchievement),
      );

      const progMap: Record<string, UserAchievementProgress> = {};
      progSnap.forEach(
        (d) => (progMap[d.id] = d.data() as UserAchievementProgress),
      );

      setAchievements(fetchedAch);
      setUserProgress(progMap);
    } catch (err) {
      console.error("Fehler beim Laden der Achievements im Profil:", err);
    } finally {
      setLoadingAchievements(false);
    }
  };

  // XP & Level ermitteln
  const totalXp = Object.values(userProgress).reduce((sum, prog) => {
    return sum + (prog.unlockedTiers?.length || 0) * 25;
  }, 0);

  const levelInfo = calculateUserLevel(totalXp);

  const handleUploadLicenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !userProfile ||
      !licenseFile ||
      !licenseTitle.trim() ||
      !licenseIssuer.trim()
    ) {
      setError("Bitte fülle alle Pflichtfelder aus und wähle eine Datei aus.");
      return;
    }

    try {
      setLicenseUploading(true);
      setError(null);
      setSuccess(null);

      const fileExt = licenseFile.name.split(".").pop()?.toLowerCase();
      const isPdf = fileExt === "pdf";
      const storageRef = ref(
        storage,
        `licenses/${userProfile.uid}/${Date.now()}_${licenseFile.name}`,
      );

      await uploadBytes(storageRef, licenseFile);
      const downloadURL = await getDownloadURL(storageRef);

      const newLicense: TrainerLicense = {
        id: crypto.randomUUID(),
        title: licenseTitle.trim(),
        issuer: licenseIssuer.trim(),
        validUntil: licenseValidUntil || undefined,
        fileUrl: downloadURL,
        fileType: isPdf ? "pdf" : "image",
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      const updatedLicenses = [
        ...(userProfile.trainerLicenses || []),
        newLicense,
      ];

      await updateDoc(doc(db, "users", userProfile.uid), {
        trainerLicenses: updatedLicenses,
      });

      await refreshUserProfile();

      setLicenseTitle("");
      setLicenseIssuer("");
      setLicenseValidUntil("");
      setLicenseFile(null);

      setSuccess(
        "Lizenz erfolgreich hochgeladen! Sie wird nach Prüfung durch einen Admin freigeschaltet.",
      );
    } catch (err) {
      console.error(err);
      setError("Fehler beim Hochladen der Trainer-Lizenz.");
    } finally {
      setLicenseUploading(false);
    }
  };

  const handleDeleteLicense = async (license: TrainerLicense) => {
    if (!userProfile) return;

    try {
      setLoading(true);
      setError(null);

      try {
        const fileRef = ref(storage, license.fileUrl);
        await deleteObject(fileRef);
      } catch (e) {
        console.warn("Datei konnte nicht aus Storage gelöscht werden:", e);
      }

      const updatedLicenses = (userProfile.trainerLicenses || []).filter(
        (l) => l.id !== license.id,
      );

      await updateDoc(doc(db, "users", userProfile.uid), {
        trainerLicenses: updatedLicenses,
      });

      await refreshUserProfile();
      setSuccess("Lizenz erfolgreich entfernt.");
    } catch (err) {
      console.error(err);
      setError("Fehler beim Löschen der Lizenz.");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userProfile || !auth.currentUser) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `avatars/${userProfile.uid}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      await updateProfile(auth.currentUser, { photoURL: downloadURL });
      await updateDoc(doc(db, "users", userProfile.uid), {
        photoURL: downloadURL,
        updatedAt: new Date().toISOString(),
      });

      await refreshUserProfile();
      setSuccess("Profilbild erfolgreich aktualisiert.");
    } catch (err) {
      setError("Fehler beim Hochladen des Profilbilds.");
    } finally {
      setUploading(false);
    }
  };

  const handleThemeChange = async (newMode: ThemePreference) => {
    if (newMode !== mode) {
      toggleTheme();
    }

    if (userProfile) {
      try {
        await updateDoc(doc(db, "users", userProfile.uid), {
          themePreference: newMode,
          updatedAt: new Date().toISOString(),
        });
        await refreshUserProfile();
      } catch (err) {
        console.error("Fehler beim Speichern des Themes:", err);
      }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const equipmentData: EquipmentSettings = {
        dartBarrel,
        dartShaft,
        dartFlight,
        favoritePlayer,
        scoringSystem,
        systemUsername,
      };

      const notificationData: NotificationSettings = {
        enabled: notificationsEnabled,
        newOrUpdatedTrainingPlans: notifyPlans,
        newOrUpdatedPerformanceTest: notifyPerformanceTests,
        monthlyExerciseHighscore: notifyHighscores,
        trainingPlanReminder: notifyPlanReminder,
        achievementUnlocked: notifyAchievements,
        reminderDaysBefore: reminderDays,
      };

      await updateDoc(doc(db, "users", userProfile.uid), {
        realName,
        nickname,
        activeTitle: selectedTitle,
        "privacySettings.leaderboardVisibility": visibility,
        "privacySettings.showEquipmentPublicly": showEquipmentPublicly,
        equipment: equipmentData,
        notificationSettings: notificationData,
        updatedAt: new Date().toISOString(),
      });

      await refreshUserProfile();
      setSuccess("Profil und Einstellungen erfolgreich gespeichert.");
    } catch (err) {
      setError("Fehler beim Speichern der Profildaten.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !feedbackMessage.trim()) return;

    setFeedbackSubmitting(true);
    setFeedbackError(null);
    setFeedbackSuccess(null);

    try {
      await addDoc(collection(db, "feedback"), {
        userId: userProfile.uid,
        userEmail: userProfile.email,
        userNickname: userProfile.nickname || userProfile.realName,
        type: feedbackType,
        message: feedbackMessage.trim(),
        status: "open",
        createdAt: new Date().toISOString(),
      });

      setFeedbackSuccess(
        "Vielen Dank! Dein Feedback wurde erfolgreich übermittelt.",
      );
      setFeedbackMessage("");
    } catch (err) {
      console.error(err);
      setFeedbackError(
        "Fehler beim Senden des Feedbacks. Bitte versuche es später erneut.",
      );
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!auth.currentUser || !auth.currentUser.email) {
      setPasswordError("Benutzer ist nicht authentifiziert.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError(
        "Das neue Passwort muss mindestens 6 Zeichen lang sein.",
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Die neuen Passwörter stimmen nicht überein.");
      return;
    }

    setPasswordLoading(true);

    try {
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        currentPassword,
      );
      await reauthenticateWithCredential(auth.currentUser, credential);

      await updatePassword(auth.currentUser, newPassword);

      setPasswordSuccess("Dein Passwort wurde erfolgreich geändert.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error(err);
      if (
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        setPasswordError("Das eingegebene aktuelle Passwort ist falsch.");
      } else if (err.code === "auth/weak-password") {
        setPasswordError("Das neue Passwort ist zu schwach.");
      } else {
        setPasswordError(
          "Fehler beim Ändern des Passworts. Bitte versuche es später erneut.",
        );
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!userProfile || !auth.currentUser) return;

    setDeleting(true);
    setError(null);

    try {
      try {
        const avatarRef = ref(storage, `avatars/${userProfile.uid}`);
        await deleteObject(avatarRef);
      } catch (e) {
        // Ignorieren falls kein Bild existiert
      }

      await deleteDoc(doc(db, "users", userProfile.uid));
      await deleteUser(auth.currentUser);

      await logout();
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/requires-recent-login") {
        setError(
          "Sicherheits-Hinweis: Bitte melde dich erneut an, bevor du deinen Account löschen kannst.",
        );
      } else {
        setError("Fehler beim Löschen des Accounts.");
      }
    } finally {
      setDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  if (!userProfile) {
    return (
      <Box className="flex justify-center items-center p-8">
        <CircularProgress />
      </Box>
    );
  }

  const unlockedAchievements = achievements.filter((ach) => {
    const prog = userProgress[ach.id];
    return prog && prog.unlockedTiers && prog.unlockedTiers.length > 0;
  });

  return (
    <Box className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <Typography
        variant="h4"
        component="h1"
        className="font-bold flex items-center gap-2"
        color="text.primary"
      >
        <PersonIcon fontSize="large" color="primary" /> Mein Profil &
        Einstellungen
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Unter-Navigation per Tabs */}
      <Paper variant="outlined" sx={{ bgcolor: "background.paper" }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Profil & Equipment" />
          <Tab label="Erfolge & Lizenzen" />
          <Tab label="Design & Benachrichtigungen" />
          <Tab label="Sicherheit & Support" />
        </Tabs>
      </Paper>

      {/* TAB 0: Profil & Equipment */}
      {activeTab === 0 && (
        <form onSubmit={handleSaveProfile} className="flex flex-col gap-6">
          {/* 1. Profilbild, Level-Badge & Stammdaten */}
          <Paper
            variant="outlined"
            sx={{ bgcolor: "background.paper", borderColor: "divider" }}
            className="p-4 sm:p-6 shadow-md flex flex-col gap-6"
          >
            <div className="flex items-center gap-6 flex-wrap sm:flex-nowrap">
              <div className="relative shrink-0">
                <Avatar
                  src={userProfile.photoURL}
                  sx={{
                    width: 96,
                    height: 96,
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                  }}
                  className="shadow-md"
                >
                  {userProfile.nickname
                    ? userProfile.nickname.substring(0, 2).toUpperCase()
                    : "U"}
                </Avatar>
                <IconButton
                  color="primary"
                  component="label"
                  sx={{ bgcolor: "background.paper" }}
                  className="absolute bottom-0 right-0 shadow"
                  size="small"
                  disabled={uploading}
                >
                  <input
                    hidden
                    accept="image/*"
                    type="file"
                    onChange={handleAvatarChange}
                  />
                  <PhotoCameraIcon fontSize="small" />
                </IconButton>
              </div>
              <div className="flex flex-col gap-1">
                <Typography
                  variant="h6"
                  className="font-bold"
                  color="text.primary"
                >
                  {userProfile.nickname}
                </Typography>

                <Box className="flex items-center gap-2 flex-wrap">
                  {/* Dynamisches Level-Badge */}
                  <Chip
                    label={`Lvl. ${levelInfo.level}`}
                    color="primary"
                    size="small"
                    className="font-bold"
                  />

                  {/* Freigeschalteter & gewählter Titel */}
                  {userProfile.activeTitle && (
                    <Chip
                      label={`🏆 ${userProfile.activeTitle}`}
                      variant="outlined"
                      color="secondary"
                      size="small"
                      className="font-semibold text-xs"
                    />
                  )}
                </Box>

                <Typography variant="body2" color="text.secondary">
                  {userProfile.email}
                </Typography>
              </div>
            </div>

            <Divider />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                label="Klarname"
                fullWidth
                required
                value={realName}
                onChange={(e) => setRealName(e.target.value)}
              />
              <TextField
                label="Spitzname (Nickname)"
                fullWidth
                required
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
            </div>

            {/* Auswahl des aktiven Titels */}
            {userProfile?.unlockedTitles &&
              userProfile.unlockedTitles.length > 0 && (
                <FormControl fullWidth size="small" className="mt-1">
                  <InputLabel id="active-title-label">
                    Mein Profil-Titel
                  </InputLabel>
                  <Select
                    labelId="active-title-label"
                    value={selectedTitle}
                    label="Mein Profil-Titel"
                    onChange={(e) => setSelectedTitle(e.target.value)}
                  >
                    <MenuItem value="">
                      <em>Kein Titel (Ausgeblendet)</em>
                    </MenuItem>
                    {userProfile.unlockedTitles.map((title) => (
                      <MenuItem key={title} value={title}>
                        🏆 {title}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

            <FormControl component="fieldset">
              <FormLabel component="legend">
                Anzeige in öffentlichen Ranglisten:
              </FormLabel>
              <RadioGroup
                value={visibility}
                onChange={(e) =>
                  setVisibility(e.target.value as VisibilitySetting)
                }
              >
                <FormControlLabel
                  value="nickname"
                  control={<Radio />}
                  label="Nur Nickname anzeigen"
                />
                <FormControlLabel
                  value="realName"
                  control={<Radio />}
                  label="Nur Klarnamen anzeigen"
                />
                <FormControlLabel
                  value="both"
                  control={<Radio />}
                  label="Klarname und Nickname anzeigen"
                />
              </RadioGroup>
            </FormControl>
          </Paper>

          {/* 2. Equipment & Dart Setup */}
          <Paper
            variant="outlined"
            sx={{ bgcolor: "background.paper", borderColor: "divider" }}
            className="p-4 sm:p-6 shadow-md flex flex-col gap-4"
          >
            <Typography
              variant="h6"
              className="font-bold flex items-center gap-2"
              color="primary"
            >
              <SportsMartsIcon /> Mein Equipment & Setup
            </Typography>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TextField
                label="Darts / Barrels"
                placeholder="z. B. Target Gabriel Clemens 21g"
                fullWidth
                value={dartBarrel}
                onChange={(e) => setDartBarrel(e.target.value)}
              />
              <TextField
                label="Shafts"
                placeholder="z. B. L-Style Carbon Short"
                fullWidth
                value={dartShaft}
                onChange={(e) => setDartShaft(e.target.value)}
              />
              <TextField
                label="Flights"
                placeholder="z. B. L-Style EZ Standard"
                fullWidth
                value={dartFlight}
                onChange={(e) => setDartFlight(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              <TextField
                label="Lieblingsspieler"
                placeholder="z. B. Phil Taylor, Martin Schindler"
                fullWidth
                value={favoritePlayer}
                onChange={(e) => setFavoritePlayer(e.target.value)}
              />

              <FormControl fullWidth>
                <InputLabel id="scoring-system-label">
                  Scoring System
                </InputLabel>
                <Select
                  labelId="scoring-system-label"
                  value={scoringSystem}
                  label="Scoring System"
                  onChange={(e) => setScoringSystem(e.target.value as any)}
                >
                  <MenuItem value="none">Keines / Manuell</MenuItem>
                  <MenuItem value="scolia">Scolia</MenuItem>
                  <MenuItem value="autodarts">Autodarts</MenuItem>
                  <MenuItem value="godartspro">GoDartsPro</MenuItem>
                  <MenuItem value="other">Sonstiges</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="System-Nutzername"
                placeholder="Dein Name auf Scolia/Autodarts"
                fullWidth
                value={systemUsername}
                onChange={(e) => setSystemUsername(e.target.value)}
                disabled={scoringSystem === "none"}
              />
            </div>

            <Divider className="my-2" />

            <FormControlLabel
              control={
                <Switch
                  checked={showEquipmentPublicly}
                  onChange={(e) => setShowEquipmentPublicly(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Typography variant="body2" color="text.primary">
                  Equipment öffentlich für andere Spieler im Profil anzeigen
                </Typography>
              }
            />

            <Box className="mt-2">
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading}
              >
                {loading ? "Speichert..." : "Profil & Equipment Speichern"}
              </Button>
            </Box>
          </Paper>
        </form>
      )}

      {/* TAB 1: Erfolge & Lizenzen */}
      {activeTab === 1 && (
        <div className="flex flex-col gap-6">
          {/* Erfolge & Badges */}
          <Paper
            variant="outlined"
            sx={{ bgcolor: "background.paper", borderColor: "divider" }}
            className="p-4 sm:p-6 shadow-md flex flex-col gap-4"
          >
            <div className="flex justify-between items-center flex-wrap gap-2">
              <Typography
                variant="h6"
                className="font-bold flex items-center gap-2"
                color="primary"
              >
                <EmojiEventsIcon sx={{ color: "#FFD700" }} /> Erfolge & Badges
              </Typography>
              <Chip
                icon={<EmojiEventsIcon />}
                label={`Gesamt XP: ${totalXp}`}
                color="primary"
                size="small"
                className="font-bold"
              />
            </div>

            {loadingAchievements ? (
              <Box className="flex justify-center p-3">
                <CircularProgress size={24} />
              </Box>
            ) : unlockedAchievements.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {unlockedAchievements.slice(0, 6).map((ach) => {
                  const prog = userProgress[ach.id];
                  const highestTier =
                    prog.unlockedTiers[prog.unlockedTiers.length - 1];
                  const tierInfo = TIER_COLORS[highestTier] || {
                    color: "#FFD700",
                    label: highestTier,
                  };

                  return (
                    <Paper
                      key={ach.id}
                      variant="outlined"
                      sx={{
                        bgcolor: "action.hover",
                        borderColor: "divider",
                        p: 2,
                      }}
                      className="flex items-center gap-3"
                    >
                      <EmojiEventsIcon
                        sx={{ fontSize: 32, color: tierInfo.color }}
                      />
                      <Box>
                        <Typography
                          variant="subtitle2"
                          className="font-bold text-xs sm:text-sm"
                          color="text.primary"
                        >
                          {ach.title}
                        </Typography>
                        <Chip
                          label={tierInfo.label}
                          size="small"
                          sx={{
                            bgcolor: tierInfo.color,
                            color: "#000",
                            fontWeight: "bold",
                            fontSize: "0.65rem",
                            height: 18,
                          }}
                        />
                      </Box>
                    </Paper>
                  );
                })}
              </div>
            ) : (
              <Typography
                variant="body2"
                color="text.secondary"
                className="italic"
              >
                Du hast noch keine Erfolge freigeschaltet. Absolviere Übungen,
                um deine ersten Badges zu verdienen!
              </Typography>
            )}

            {onNavigateToAchievements && (
              <Box className="mt-2 flex justify-end">
                <Button
                  variant="outlined"
                  size="small"
                  color="primary"
                  onClick={onNavigateToAchievements}
                >
                  Alle Erfolge im Detail ansehen
                </Button>
              </Box>
            )}
          </Paper>

          {/* Trainer-Lizenzen (Nur für Coach / Admin) */}
          {isCoachOrAdmin && (
            <Paper
              variant="outlined"
              sx={{ bgcolor: "background.paper", borderColor: "divider" }}
              className="p-4 sm:p-6 shadow-md flex flex-col gap-6"
            >
              <Box className="flex items-center gap-2">
                <VerifiedUserIcon color="primary" />
                <Typography
                  variant="h6"
                  className="font-bold"
                  color="text.primary"
                >
                  Trainer-Lizenzen & Zertifikate
                </Typography>
              </Box>

              <Typography variant="body2" color="text.secondary">
                Lade deine offiziellen Trainer-Lizenzen (z. B. DOSB
                C/B/A-Lizenz) hoch. Nach einer Prüfung durch einen Administrator
                wird deine Lizenz im Profil öffentlich für deine Spieler
                sichtbar geschaltet.
              </Typography>

              <Paper
                variant="outlined"
                sx={{ bgcolor: "action.hover", borderColor: "divider", p: 2.5 }}
                className="flex flex-col gap-4 rounded-lg"
              >
                <Typography
                  variant="subtitle2"
                  className="font-bold"
                  color="text.primary"
                >
                  Neue Lizenz einreichen
                </Typography>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextField
                    label="Bezeichnung der Lizenz"
                    placeholder="z. B. DOSB Trainer C Darts"
                    size="small"
                    fullWidth
                    required
                    value={licenseTitle}
                    onChange={(e) => setLicenseTitle(e.target.value)}
                  />
                  <TextField
                    label="Ausstellender Verband / Organisation"
                    placeholder="z. B. DDV / Landesverband"
                    size="small"
                    fullWidth
                    required
                    value={licenseIssuer}
                    onChange={(e) => setLicenseIssuer(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextField
                    label="Gültig bis (Optional)"
                    type="date"
                    size="small"
                    fullWidth
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={licenseValidUntil}
                    onChange={(e) => setLicenseValidUntil(e.target.value)}
                  />

                  <Button
                    variant="outlined"
                    component="label"
                    color={licenseFile ? "success" : "primary"}
                    startIcon={<CloudUploadIcon />}
                    className="h-10 my-auto"
                  >
                    {licenseFile
                      ? licenseFile.name
                      : "Nachweis auswählen (PDF / Bild)"}
                    <input
                      type="file"
                      hidden
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        if (e.target.files?.[0])
                          setLicenseFile(e.target.files[0]);
                      }}
                    />
                  </Button>
                </div>

                <Box className="flex justify-end mt-1">
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleUploadLicenseSubmit}
                    disabled={
                      licenseUploading ||
                      !licenseFile ||
                      !licenseTitle.trim() ||
                      !licenseIssuer.trim()
                    }
                  >
                    {licenseUploading
                      ? "Wird hochgeladen..."
                      : "Lizenz Hochladen"}
                  </Button>
                </Box>
              </Paper>

              <Divider />

              <Typography
                variant="subtitle1"
                className="font-bold"
                color="text.primary"
              >
                Meine hinterlegten Lizenzen
              </Typography>

              {userProfile.trainerLicenses &&
              userProfile.trainerLicenses.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {userProfile.trainerLicenses.map((license) => (
                    <Card
                      key={license.id}
                      variant="outlined"
                      sx={{
                        bgcolor: "background.paper",
                        borderColor: "divider",
                      }}
                    >
                      <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <Box className="space-y-1">
                          <Box className="flex items-center gap-2 flex-wrap">
                            <Typography
                              variant="subtitle2"
                              className="font-bold"
                              color="text.primary"
                            >
                              {license.title}
                            </Typography>

                            {license.status === "approved" && (
                              <Chip
                                icon={<VerifiedUserIcon fontSize="small" />}
                                label="Verifiziert"
                                color="success"
                                size="small"
                              />
                            )}
                            {license.status === "pending" && (
                              <Chip
                                icon={<PendingIcon fontSize="small" />}
                                label="Prüfung ausstehend"
                                color="warning"
                                size="small"
                              />
                            )}
                            {license.status === "rejected" && (
                              <Chip
                                icon={<CancelIcon fontSize="small" />}
                                label="Abgelehnt"
                                color="error"
                                size="small"
                              />
                            )}
                          </Box>

                          <Typography
                            variant="caption"
                            color="text.secondary"
                            className="block"
                          >
                            Ausgestellt von: <strong>{license.issuer}</strong>
                            {license.validUntil && (
                              <>
                                {" "}
                                • Gültig bis:{" "}
                                {new Date(
                                  license.validUntil,
                                ).toLocaleDateString("de-DE")}
                              </>
                            )}
                          </Typography>
                        </Box>

                        <Box className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<VisibilityIcon />}
                            onClick={() =>
                              window.open(license.fileUrl, "_blank")
                            }
                          >
                            Ansehen
                          </Button>
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleDeleteLicense(license)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  className="italic"
                >
                  Du hast bisher noch keine Lizenzen hinterlegt.
                </Typography>
              )}
            </Paper>
          )}
        </div>
      )}

      {/* TAB 2: Design & Benachrichtigungen */}
      {activeTab === 2 && (
        <form onSubmit={handleSaveProfile} className="flex flex-col gap-6">
          {/* Design & Erscheinungsbild */}
          <Paper
            variant="outlined"
            sx={{ bgcolor: "background.paper", borderColor: "divider" }}
            className="p-4 sm:p-6 shadow-md"
          >
            <div className="flex items-center gap-2 mb-4">
              <PaletteIcon color="primary" />
              <Typography
                variant="h6"
                className="font-bold"
                color="text.primary"
              >
                Design & Erscheinungsbild
              </Typography>
            </div>

            <FormControl component="fieldset">
              <FormLabel component="legend">Bevorzugtes Farbschema:</FormLabel>
              <RadioGroup
                row
                value={mode}
                onChange={(e) =>
                  handleThemeChange(e.target.value as ThemePreference)
                }
                className="mt-2"
              >
                <FormControlLabel
                  value="dark"
                  control={<Radio />}
                  label="Dunkles Design (Dark Mode)"
                />
                <FormControlLabel
                  value="light"
                  control={<Radio />}
                  label="Helles Design (Light Mode)"
                />
              </RadioGroup>
            </FormControl>
          </Paper>

          {/* Benachrichtigungen */}
          <Paper
            variant="outlined"
            sx={{ bgcolor: "background.paper", borderColor: "divider" }}
            className="p-4 sm:p-6 shadow-md flex flex-col gap-4"
          >
            <Typography
              variant="h6"
              className="font-bold flex items-center gap-2"
              color="primary"
            >
              <NotificationsIcon /> Benachrichtigungen
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Typography className="font-bold" color="text.primary">
                  Benachrichtigungen grundsätzlich aktivieren
                </Typography>
              }
            />

            <Divider />

            <div
              className={`flex flex-col gap-3 ${
                !notificationsEnabled ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={notifyPlans}
                    onChange={(e) => setNotifyPlans(e.target.checked)}
                    color="primary"
                    disabled={!notificationsEnabled}
                  />
                }
                label={
                  <Typography variant="body2" color="text.primary">
                    Neue oder bearbeitete Trainingspläne
                  </Typography>
                }
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={notifyPerformanceTests}
                    onChange={(e) =>
                      setNotifyPerformanceTests(e.target.checked)
                    }
                    color="primary"
                    disabled={!notificationsEnabled}
                  />
                }
                label={
                  <Typography variant="body2" color="text.primary">
                    Neuer oder geänderter Leistungstest
                  </Typography>
                }
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={notifyHighscores}
                    onChange={(e) => setNotifyHighscores(e.target.checked)}
                    color="primary"
                    disabled={!notificationsEnabled}
                  />
                }
                label={
                  <Typography variant="body2" color="text.primary">
                    Neuer Highscore bei der Übung des Monats
                  </Typography>
                }
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={notifyAchievements}
                    onChange={(e) => setNotifyAchievements(e.target.checked)}
                    color="primary"
                    disabled={!notificationsEnabled}
                  />
                }
                label={
                  <Typography variant="body2" color="text.primary">
                    Neuer Erfolg freigeschaltet
                  </Typography>
                }
              />

              <Divider className="my-1" />

              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <FormControlLabel
                  control={
                    <Switch
                      checked={notifyPlanReminder}
                      onChange={(e) => setNotifyPlanReminder(e.target.checked)}
                      color="primary"
                      disabled={!notificationsEnabled}
                    />
                  }
                  label={
                    <Typography variant="body2" color="text.primary">
                      Erinnerung an Trainingsplan bevor er abläuft
                    </Typography>
                  }
                />

                {notifyPlanReminder && notificationsEnabled && (
                  <FormControl size="small" className="w-48">
                    <InputLabel id="reminder-days-label">
                      Erinnerungsvorlauf
                    </InputLabel>
                    <Select
                      labelId="reminder-days-label"
                      value={reminderDays}
                      label="Erinnerungsvorlauf"
                      onChange={(e) => setReminderDays(Number(e.target.value))}
                    >
                      <MenuItem value={1}>1 Tag vorher</MenuItem>
                      <MenuItem value={2}>2 Tage vorher</MenuItem>
                      <MenuItem value={3}>3 Tage vorher</MenuItem>
                    </Select>
                  </FormControl>
                )}
              </div>
            </div>

            <Box className="mt-2">
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading}
              >
                {loading ? "Speichert..." : "Einstellungen Speichern"}
              </Button>
            </Box>
          </Paper>
        </form>
      )}

      {/* TAB 3: Sicherheit & Support */}
      {activeTab === 3 && (
        <div className="flex flex-col gap-6">
          {/* Nachricht an Trainer */}
          <Paper
            variant="outlined"
            sx={{ bgcolor: "background.paper", borderColor: "divider" }}
            className="p-4 sm:p-6 flex flex-col gap-3 shadow-sm"
          >
            <Typography
              variant="h6"
              className="font-bold flex items-center gap-2"
              color="text.primary"
            >
              Trainer-Kommunikation
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Teile deinem Trainer Urlaube, Abwesenheiten oder Ergebnisse von
              Turnieren und Ligaspielen mit.
            </Typography>
            <Box>
              <Button
                variant="outlined"
                color="primary"
                disabled={!userProfile?.assignedCoachId}
                onClick={() => setIsMessageModalOpen(true)}
              >
                {userProfile?.assignedCoachId
                  ? "Nachricht an Trainer schreiben"
                  : "Kein Trainer zugewiesen"}
              </Button>
            </Box>
          </Paper>

          {/* Feedback & Ideen */}
          <Paper
            variant="outlined"
            sx={{ bgcolor: "background.paper", borderColor: "divider" }}
            className="p-4 sm:p-6 shadow-md flex flex-col gap-4"
          >
            <Typography
              variant="h6"
              className="font-bold flex items-center gap-2"
              color="primary"
            >
              <FeedbackIcon /> Feedback & Ideen mitteilen
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Hast du eine Idee für eine neue Funktion oder einen Fehler
              gefunden? Teile es uns gerne mit!
            </Typography>

            {feedbackError && (
              <Alert severity="error" onClose={() => setFeedbackError(null)}>
                {feedbackError}
              </Alert>
            )}
            {feedbackSuccess && (
              <Alert
                severity="success"
                onClose={() => setFeedbackSuccess(null)}
              >
                {feedbackSuccess}
              </Alert>
            )}

            <form
              onSubmit={handleSubmitFeedback}
              className="flex flex-col gap-4"
            >
              <FormControl fullWidth size="small">
                <InputLabel id="feedback-category-label">Kategorie</InputLabel>
                <Select
                  labelId="feedback-category-label"
                  value={feedbackType}
                  label="Kategorie"
                  onChange={(e) =>
                    setFeedbackType(e.target.value as "idea" | "bug" | "other")
                  }
                >
                  <MenuItem value="idea">Idee / Feature-Wunsch</MenuItem>
                  <MenuItem value="bug">Fehler / Bug melden</MenuItem>
                  <MenuItem value="other">Sonstiges Feedback</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Deine Nachricht / Idee"
                multiline
                rows={4}
                fullWidth
                required
                placeholder="Beschreibe deine Idee oder das Feedback möglichst genau..."
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
              />

              <Box>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  startIcon={<SendIcon />}
                  disabled={feedbackSubmitting || !feedbackMessage.trim()}
                >
                  {feedbackSubmitting
                    ? "Wird gesendet..."
                    : "Feedback Absenden"}
                </Button>
              </Box>
            </form>
          </Paper>

          {/* Passwort ändern */}
          <Paper
            variant="outlined"
            sx={{ bgcolor: "background.paper", borderColor: "divider" }}
            className="p-4 sm:p-6 shadow-md flex flex-col gap-4"
          >
            <Typography
              variant="h6"
              className="font-bold flex items-center gap-2"
              color="primary"
            >
              <LockIcon /> Passwort ändern
            </Typography>

            {passwordError && (
              <Alert severity="error" onClose={() => setPasswordError(null)}>
                {passwordError}
              </Alert>
            )}
            {passwordSuccess && (
              <Alert
                severity="success"
                onClose={() => setPasswordSuccess(null)}
              >
                {passwordSuccess}
              </Alert>
            )}

            <form
              onSubmit={handleChangePassword}
              className="flex flex-col gap-4"
            >
              <TextField
                label="Aktuelles Passwort"
                type="password"
                fullWidth
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField
                  label="Neues Passwort"
                  type="password"
                  fullWidth
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <TextField
                  label="Neues Passwort bestätigen"
                  type="password"
                  fullWidth
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <Box>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={passwordLoading}
                >
                  {passwordLoading ? "Wird geändert..." : "Passwort Ändern"}
                </Button>
              </Box>
            </form>
          </Paper>

          {/* DSGVO & Account Löschen */}
          <Paper
            variant="outlined"
            sx={{
              bgcolor: "background.paper",
              borderColor: "error.main",
            }}
            className="p-4 sm:p-6 shadow-md"
          >
            <Typography
              variant="h6"
              className="font-bold flex items-center gap-2 mb-2"
              color="error"
            >
              <SecurityIcon /> DSGVO & Account löschen
            </Typography>
            <Typography variant="body2" color="text.secondary" className="mb-4">
              Hier kannst du dein Konto unwiderruflich löschen. Dabei werden
              alle deine Personen- und Profil-Daten gemäß DSGVO dauerhaft
              gelöscht.
            </Typography>

            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteForeverIcon />}
              onClick={() => setIsDeleteModalOpen(true)}
            >
              Konto Endgültig Löschen
            </Button>
          </Paper>
        </div>
      )}

      {/* Message Modal */}
      <SendCoachMessageModal
        open={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        coachId={userProfile?.assignedCoachId}
      />

      {/* Confirmation Modal für Account Löschung */}
      <Dialog
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      >
        <DialogTitle className="font-bold text-red-600">
          Account unwiderruflich löschen?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Möchtest du deinen Account und all deine gespeicherten Profildaten
            wirklich dauerhaft löschen? Dieser Schritt kann nicht rückgängig
            gemacht werden.
          </DialogContentText>
        </DialogContent>
        <DialogActions className="p-4">
          <Button onClick={() => setIsDeleteModalOpen(false)}>Abbrechen</Button>
          <Button
            onClick={handleDeleteAccount}
            color="error"
            variant="contained"
            disabled={deleting}
          >
            {deleting ? "Löscht..." : "Ja, Konto Löschen"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
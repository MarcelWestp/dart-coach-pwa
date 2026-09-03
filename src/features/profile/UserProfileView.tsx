import React, { useState, useEffect } from 'react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { updateProfile, deleteUser, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { db, storage, auth } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useThemeContext } from '../../context/ThemeContext';
import type { VisibilitySetting, ThemePreference, EquipmentSettings, NotificationSettings } from '../../types/user';
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
  DialogActions
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import SportsMartsIcon from '@mui/icons-material/Sports';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import SecurityIcon from '@mui/icons-material/Security';
import PaletteIcon from '@mui/icons-material/Palette';
import LockIcon from '@mui/icons-material/Lock';
import NotificationsIcon from '@mui/icons-material/Notifications';

export const UserProfileView: React.FC = () => {
  const { userProfile, refreshUserProfile, logout } = useAuth();
  const { mode, toggleTheme } = useThemeContext();

  // Stammdaten
  const [realName, setRealName] = useState('');
  const [nickname, setNickname] = useState('');
  const [visibility, setVisibility] = useState<VisibilitySetting>('nickname');
  const [showEquipmentPublicly, setShowEquipmentPublicly] = useState(true);

  // Equipment States
  const [dartBarrel, setDartBarrel] = useState('');
  const [dartShaft, setDartShaft] = useState('');
  const [dartFlight, setDartFlight] = useState('');
  const [favoritePlayer, setFavoritePlayer] = useState('');
  const [scoringSystem, setScoringSystem] = useState<EquipmentSettings['scoringSystem']>('none');
  const [systemUsername, setSystemUsername] = useState('');

  // Benachrichtigungen States
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notifyPlans, setNotifyPlans] = useState(true);
  const [notifyPerformanceTests, setNotifyPerformanceTests] = useState(true);
  const [notifyHighscores, setNotifyHighscores] = useState(true);
  const [notifyPlanReminder, setNotifyPlanReminder] = useState(true);
  const [reminderDays, setReminderDays] = useState<number>(1);

  // Passwort Ändern States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  useEffect(() => {
    if (userProfile) {
      setRealName(userProfile.realName || '');
      setNickname(userProfile.nickname || '');
      setVisibility(userProfile.privacySettings?.leaderboardVisibility || 'nickname');
      setShowEquipmentPublicly(userProfile.privacySettings?.showEquipmentPublicly !== false);

      if (userProfile.equipment) {
        setDartBarrel(userProfile.equipment.dartBarrel || '');
        setDartShaft(userProfile.equipment.dartShaft || '');
        setDartFlight(userProfile.equipment.dartFlight || '');
        setFavoritePlayer(userProfile.equipment.favoritePlayer || '');
        setScoringSystem(userProfile.equipment.scoringSystem || 'none');
        setSystemUsername(userProfile.equipment.systemUsername || '');
      }

      if (userProfile.notificationSettings) {
        const notif = userProfile.notificationSettings;
        setNotificationsEnabled(notif.enabled ?? true);
        setNotifyPlans(notif.newOrUpdatedTrainingPlans ?? true);
        setNotifyPerformanceTests(notif.newOrUpdatedPerformanceTest ?? true);
        setNotifyHighscores(notif.monthlyExerciseHighscore ?? true);
        setNotifyPlanReminder(notif.trainingPlanReminder ?? true);
        setReminderDays(notif.reminderDaysBefore ?? 1);
      }
    }
  }, [userProfile]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userProfile || !auth.currentUser) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `avatars/${userProfile.uid}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      await updateProfile(auth.currentUser, { photoURL: downloadURL });
      await updateDoc(doc(db, 'users', userProfile.uid), {
        photoURL: downloadURL,
        updatedAt: new Date().toISOString(),
      });

      await refreshUserProfile();
      setSuccess('Profilbild erfolgreich aktualisiert.');
    } catch (err) {
      setError('Fehler beim Hochladen des Profilbilds.');
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
        await updateDoc(doc(db, 'users', userProfile.uid), {
          themePreference: newMode,
          updatedAt: new Date().toISOString(),
        });
        await refreshUserProfile();
      } catch (err) {
        console.error('Fehler beim Speichern des Themes:', err);
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
        reminderDaysBefore: reminderDays,
      };

      await updateDoc(doc(db, 'users', userProfile.uid), {
        realName,
        nickname,
        'privacySettings.leaderboardVisibility': visibility,
        'privacySettings.showEquipmentPublicly': showEquipmentPublicly,
        equipment: equipmentData,
        notificationSettings: notificationData,
        updatedAt: new Date().toISOString(),
      });

      await refreshUserProfile();
      setSuccess('Profil und Einstellungen erfolgreich gespeichert.');
    } catch (err) {
      setError('Fehler beim Speichern der Profildaten.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!auth.currentUser || !auth.currentUser.email) {
      setPasswordError('Benutzer ist nicht authentifiziert.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Das neue Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Die neuen Passwörter stimmen nicht überein.');
      return;
    }

    setPasswordLoading(true);

    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);

      await updatePassword(auth.currentUser, newPassword);

      setPasswordSuccess('Dein Passwort wurde erfolgreich geändert.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setPasswordError('Das eingegebene aktuelle Passwort ist falsch.');
      } else if (err.code === 'auth/weak-password') {
        setPasswordError('Das neue Passwort ist zu schwach.');
      } else {
        setPasswordError('Fehler beim Ändern des Passworts. Bitte versuche es später erneut.');
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

      await deleteDoc(doc(db, 'users', userProfile.uid));
      await deleteUser(auth.currentUser);

      await logout();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/requires-recent-login') {
        setError('Sicherheits-Hinweis: Bitte melde dich erneut an, bevor du deinen Account löschen kannst.');
      } else {
        setError('Fehler beim Löschen des Accounts.');
      }
    } finally {
      setDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  if (!userProfile) return <CircularProgress />;

  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col gap-6">
      <Typography variant="h4" component="h1" className="font-bold flex items-center gap-2">
        <PersonIcon fontSize="large" color="primary" /> Mein Profil & Einstellungen
      </Typography>

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess(null)}>{success}</Alert>}

      <form onSubmit={handleSaveProfile} className="flex flex-col gap-6">
        {/* 1. Profilbild & Stammdaten */}
        <Paper className="p-6 shadow-md flex flex-col gap-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar src={userProfile.photoURL} sx={{ width: 96, height: 96 }} className="bg-primary-main">
                {userProfile.nickname ? userProfile.nickname.substring(0, 2).toUpperCase() : 'U'}
              </Avatar>
              <IconButton
                color="primary"
                component="label"
                className="absolute bottom-0 right-0 bg-white shadow"
                size="small"
                disabled={uploading}
              >
                <input hidden accept="image/*" type="file" onChange={handleAvatarChange} />
                <PhotoCameraIcon fontSize="small" />
              </IconButton>
            </div>
            <div>
              <Typography variant="h6" className="font-bold">{userProfile.nickname}</Typography>
              <Typography variant="body2" color="textSecondary">{userProfile.email}</Typography>
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

          <FormControl component="fieldset">
            <FormLabel component="legend">Anzeige in öffentlichen Ranglisten:</FormLabel>
            <RadioGroup value={visibility} onChange={(e) => setVisibility(e.target.value as VisibilitySetting)}>
              <FormControlLabel value="nickname" control={<Radio />} label="Nur Nickname anzeigen" />
              <FormControlLabel value="realName" control={<Radio />} label="Nur Klarnamen anzeigen" />
              <FormControlLabel value="both" control={<Radio />} label="Klarname und Nickname anzeigen" />
            </RadioGroup>
          </FormControl>
        </Paper>

        {/* 2. Design & Erscheinungsbild */}
        <Paper className="p-6 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <PaletteIcon color="primary" />
            <Typography variant="h6" className="font-bold">
              Design & Erscheinungsbild
            </Typography>
          </div>

          <FormControl component="fieldset">
            <FormLabel component="legend">Bevorzugtes Farbschema:</FormLabel>
            <RadioGroup
              row
              value={mode}
              onChange={(e) => handleThemeChange(e.target.value as ThemePreference)}
              className="mt-2"
            >
              <FormControlLabel value="dark" control={<Radio />} label="Dunkles Design (Dark Mode)" />
              <FormControlLabel value="light" control={<Radio />} label="Helles Design (Light Mode)" />
            </RadioGroup>
          </FormControl>
        </Paper>

        {/* 3. Benachrichtigungen (NEU) */}
        <Paper className="p-6 shadow-md flex flex-col gap-4">
          <Typography variant="h6" className="font-bold flex items-center gap-2" color="primary">
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
            label={<Typography className="font-bold">Benachrichtigungen grundsätzlich aktivieren</Typography>}
          />

          <Divider />

          <div className={`flex flex-col gap-3 ${!notificationsEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <FormControlLabel
              control={
                <Switch
                  checked={notifyPlans}
                  onChange={(e) => setNotifyPlans(e.target.checked)}
                  color="primary"
                  disabled={!notificationsEnabled}
                />
              }
              label="Neue oder bearbeitete Trainingspläne"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={notifyPerformanceTests}
                  onChange={(e) => setNotifyPerformanceTests(e.target.checked)}
                  color="primary"
                  disabled={!notificationsEnabled}
                />
              }
              label="Neuer oder geänderter Leistungstest"
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
              label="Neuer Highscore bei der Übung des Monats"
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
                label="Erinnerung an Trainingsplan bevor er abläuft"
              />

              {notifyPlanReminder && notificationsEnabled && (
                <FormControl size="small" className="w-48">
                  <InputLabel>Erinnerungsvorlauf</InputLabel>
                  <Select
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
        </Paper>

        {/* 4. Equipment & Dart Setup */}
        <Paper className="p-6 shadow-md flex flex-col gap-4">
          <Typography variant="h6" className="font-bold flex items-center gap-2" color="primary">
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
              <InputLabel>Scoring System</InputLabel>
              <Select
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
              disabled={scoringSystem === 'none'}
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
            label="Equipment öffentlich für andere Spieler im Profil anzeigen"
          />

          <Box className="mt-2">
            <Button type="submit" variant="contained" color="primary" disabled={loading}>
              {loading ? 'Speichert...' : 'Profil & Einstellungen Speichern'}
            </Button>
          </Box>
        </Paper>
      </form>

      {/* 5. Passwort ändern Kachel */}
      <Paper className="p-6 shadow-md flex flex-col gap-4">
        <Typography variant="h6" className="font-bold flex items-center gap-2" color="primary">
          <LockIcon /> Passwort ändern
        </Typography>

        {passwordError && <Alert severity="error" onClose={() => setPasswordError(null)}>{passwordError}</Alert>}
        {passwordSuccess && <Alert severity="success" onClose={() => setPasswordSuccess(null)}>{passwordSuccess}</Alert>}

        <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
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
            <Button type="submit" variant="contained" color="primary" disabled={passwordLoading}>
              {passwordLoading ? 'Wird geändert...' : 'Passwort Ändern'}
            </Button>
          </Box>
        </form>
      </Paper>

      {/* 6. DSGVO Datenschutz & Account Löschen */}
      <Paper className="p-6 shadow-md border border-red-200">
        <Typography variant="h6" className="font-bold flex items-center gap-2 text-red-600 mb-2">
          <SecurityIcon /> DSGVO & Account löschen
        </Typography>
        <Typography variant="body2" color="textSecondary" className="mb-4">
          Hier kannst du dein Konto unwiderruflich löschen. Dabei werden alle deine Personen- und Profil-Daten gemäß DSGVO dauerhaft gelöscht.
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

      {/* Confirmation Modal für Account Löschung */}
      <Dialog open={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>
        <DialogTitle className="font-bold text-red-600">Account unwiderruflich löschen?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Möchtest du deinen Account und all deine gespeicherten Profildaten wirklich dauerhaft löschen? Dieser Schritt kann nicht rückgängig gemacht werden.
          </DialogContentText>
        </DialogContent>
        <DialogActions className="p-4">
          <Button onClick={() => setIsDeleteModalOpen(false)}>Abbrechen</Button>
          <Button onClick={handleDeleteAccount} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Löscht...' : 'Ja, Konto Löschen'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
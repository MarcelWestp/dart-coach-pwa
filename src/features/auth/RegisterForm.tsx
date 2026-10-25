import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import type { UserProfile, VisibilitySetting } from '../../types/user';
import { notifyAllAdmins } from '../../services/notificationService';
import { 
  Button, 
  TextField, 
  RadioGroup, 
  FormControlLabel, 
  Radio, 
  FormLabel, 
  FormControl, 
  Alert, 
  Card, 
  CardContent, 
  Typography,
  Box
} from '@mui/material';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [realName, setRealName] = useState('');
  const [nickname, setNickname] = useState('');
  const [visibility, setVisibility] = useState<VisibilitySetting>('nickname');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const newUserProfile: UserProfile = {
        uid: user.uid,
        email: user.email || email,
        realName,
        nickname,
        roles: ['player'], // Automatisch Rolle "Spieler"
        isApproved: false,  // Standardmäßig NICHT freigegeben
        privacySettings: {
          leaderboardVisibility: visibility,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 1. Profil in Firestore speichern
      await setDoc(doc(db, 'users', user.uid), newUserProfile);

      // 2. NEU: Benachrichtigung an alle Admins senden
      await notifyAllAdmins({
        type: 'newPlayerRegistration',
        title: 'Neue Spielerregistrierung',
        message: `Ein neuer Spieler (${nickname || realName} - ${email}) hat sich registriert und wartet auf Freischaltung.`,
        link: '/admin',
      });

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Fehler bei der Registrierung.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card 
      variant="outlined"
      sx={{ 
        maxWidth: 440, 
        mx: 'auto', 
        my: { xs: 2, sm: 6 },
        width: '100%',
        bgcolor: 'background.paper',
        borderColor: 'divider',
        borderRadius: 2,
        boxShadow: (theme) => theme.palette.mode === 'dark' ? 4 : 2
      }}
    >
      <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
        <Typography 
          variant="h5" 
          component="h1" 
          align="center"
          sx={{ fontWeight: 'bold', mb: 3, color: 'text.primary' }}
        >
          Dart-Coach Registrierung
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box 
          component="form" 
          onSubmit={handleSubmit} 
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
        >
          <TextField
            label="Klarname (Vor- und Nachname)"
            variant="outlined"
            fullWidth
            required
            value={realName}
            onChange={(e) => setRealName(e.target.value)}
          />

          <TextField
            label="Spitzname (Nickname)"
            variant="outlined"
            fullWidth
            required
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />

          <TextField
            label="E-Mail"
            type="email"
            variant="outlined"
            fullWidth
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <TextField
            label="Passwort"
            type="password"
            variant="outlined"
            fullWidth
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <FormControl component="fieldset" sx={{ mt: 1 }}>
            <FormLabel component="legend" sx={{ fontSize: '0.875rem', fontWeight: 600, mb: 0.5 }}>
              Anzeige in öffentlichen Ranglisten:
            </FormLabel>
            <RadioGroup
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as VisibilitySetting)}
            >
              <FormControlLabel value="nickname" control={<Radio size="small" />} label="Nur Nickname anzeigen" />
              <FormControlLabel value="realName" control={<Radio size="small" />} label="Nur Klarnamen anzeigen" />
              <FormControlLabel value="both" control={<Radio size="small" />} label="Klarname und Nickname anzeigen" />
            </RadioGroup>
          </FormControl>

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={loading}
            size="large"
            sx={{ mt: 1, py: 1.2, fontWeight: 'bold' }}
          >
            {loading ? 'Registriere...' : 'Konto anfragen'}
          </Button>

          <Button
            variant="text"
            color="secondary"
            onClick={onSwitchToLogin}
            sx={{ textTransform: 'none' }}
          >
            Bereits registriert? Zum Login
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};
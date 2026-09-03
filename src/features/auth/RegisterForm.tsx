import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import type { UserProfile, VisibilitySetting } from '../../types/user';
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
  Typography 
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

      await setDoc(doc(db, 'users', user.uid), newUserProfile);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Fehler bei der Registrierung.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto my-8 shadow-lg">
      <CardContent className="p-6">
        <Typography variant="h5" component="h1" className="mb-4 text-center font-bold">
          Dart-Coach Registrierung
        </Typography>

        {error && <Alert severity="error" className="mb-4">{error}</Alert>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

          <FormControl component="fieldset" className="mt-2">
            <FormLabel component="legend">Anzeige in öffentlichen Ranglisten:</FormLabel>
            <RadioGroup
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as VisibilitySetting)}
            >
              <FormControlLabel value="nickname" control={<Radio />} label="Nur Nickname anzeigen" />
              <FormControlLabel value="realName" control={<Radio />} label="Nur Klarnamen anzeigen" />
              <FormControlLabel value="both" control={<Radio />} label="Klarname und Nickname anzeigen" />
            </RadioGroup>
          </FormControl>

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={loading}
            className="mt-4"
          >
            {loading ? 'Registriere...' : 'Konto anfragen'}
          </Button>

          <Button
            variant="text"
            color="secondary"
            onClick={onSwitchToLogin}
            className="mt-2"
          >
            Bereits registriert? Zum Login
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
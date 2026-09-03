import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { 
  Button, 
  TextField, 
  Alert, 
  Card, 
  CardContent, 
  Typography 
} from '@mui/material';

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error(err);
      setError('Anmeldung fehlgeschlagen. Bitte E-Mail und Passwort prüfen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto my-8 shadow-lg">
      <CardContent className="p-6">
        <Typography variant="h5" component="h1" className="mb-4 text-center font-bold">
          Dart-Coach Login
        </Typography>

        {error && <Alert severity="error" className="mb-4">{error}</Alert>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={loading}
            className="mt-4"
          >
            {loading ? 'Melde an...' : 'Anmelden'}
          </Button>

          <Button
            variant="text"
            color="secondary"
            onClick={onSwitchToRegister}
            className="mt-2"
          >
            Noch kein Konto? Hier registrieren
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
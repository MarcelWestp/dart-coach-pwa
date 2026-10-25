import React, { useState } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { 
  Button, 
  TextField, 
  Alert, 
  Card, 
  CardContent, 
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Box,
  useMediaQuery,
  useTheme
} from '@mui/material';

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // States für "Passwort vergessen" Modal
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

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

  const handleOpenResetDialog = () => {
    setResetEmail(email); // Vorbelegen mit im Login-Feld eingetragener E-Mail
    setResetError(null);
    setResetSuccess(null);
    setIsResetDialogOpen(true);
  };

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccess(null);

    if (!resetEmail.trim()) {
      setResetError('Bitte gib deine E-Mail-Adresse ein.');
      return;
    }

    setResetLoading(true);

    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setResetSuccess(
        'Eine E-Mail zum Zurücksetzen des Passworts wurde gesendet. Bitte überprüfe deinen Posteingang (und den Spam-Ordner).'
      );
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setResetError('Es wurde kein Konto mit dieser E-Mail-Adresse gefunden.');
      } else if (err.code === 'auth/invalid-email') {
        setResetError('Ungültiges E-Mail-Format.');
      } else {
        setResetError('Fehler beim Senden der E-Mail. Bitte versuche es später erneut.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <Box className="px-3 sm:px-6 py-4 sm:py-8">
      <Card 
        variant="outlined" 
        sx={{ 
          bgcolor: 'background.paper', 
          borderColor: 'divider' 
        }} 
        className="max-w-md mx-auto shadow-lg"
      >
        <CardContent className="p-4 sm:p-6">
          <Typography 
            variant="h5" 
            component="h1" 
            className="mb-4 text-center font-bold" 
            color="text.primary"
          >
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

            {/* Passwort vergessen Link */}
            <Box className="text-right -mt-2">
              <Button
                variant="text"
                size="small"
                color="primary"
                onClick={handleOpenResetDialog}
                className="normal-case text-xs sm:text-sm"
              >
                Passwort vergessen?
              </Button>
            </Box>

            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              disabled={loading}
              className="mt-2 min-h-[44px]"
            >
              {loading ? 'Melde an...' : 'Anmelden'}
            </Button>

            <Button
              variant="text"
              color="secondary"
              onClick={onSwitchToRegister}
              className="mt-2 text-xs sm:text-sm"
            >
              Noch kein Konto? Hier registrieren
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Dialog für Passwort-Zurücksetzen (Responsiv & MUI v6 Darkmode-fest) */}
      <Dialog 
        open={isResetDialogOpen} 
        onClose={() => setIsResetDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        fullScreen={isMobile}
        slotProps={{
          paper: {
            sx: {
              bgcolor: 'background.paper',
              backgroundImage: 'none',
              borderColor: 'divider'
            }
          }
        }}
      >
        <form onSubmit={handleSendResetEmail} className="flex flex-col h-full justify-between sm:h-auto">
          <Box>
            <DialogTitle className="font-bold" color="text.primary">
              Passwort zurücksetzen
            </DialogTitle>
            <DialogContent className="flex flex-col gap-4 pt-2">
              <DialogContentText color="text.secondary">
                Gib deine registrierte E-Mail-Adresse ein. Wir senden dir einen Link, mit dem du dein Passwort neu festlegen kannst.
              </DialogContentText>

              {resetError && <Alert severity="error">{resetError}</Alert>}
              {resetSuccess && <Alert severity="success">{resetSuccess}</Alert>}

              {!resetSuccess && (
                <TextField
                  label="E-Mail-Adresse"
                  type="email"
                  fullWidth
                  required
                  autoFocus
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="mt-2"
                />
              )}
            </DialogContent>
          </Box>

          <DialogActions className="p-4 gap-2 flex-col sm:flex-row">
            <Button 
              onClick={() => setIsResetDialogOpen(false)} 
              color="inherit" 
              fullWidth={isMobile}
            >
              {resetSuccess ? 'Schließen' : 'Abbrechen'}
            </Button>
            {!resetSuccess && (
              <Button 
                type="submit" 
                variant="contained" 
                color="primary"
                disabled={resetLoading}
                fullWidth={isMobile}
                className="min-h-[40px]"
              >
                {resetLoading ? 'Wird gesendet...' : 'Link anfordern'}
              </Button>
            )}
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};
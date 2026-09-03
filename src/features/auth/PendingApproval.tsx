import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, Typography, Button, Alert } from '@mui/material';

export const PendingApproval: React.FC = () => {
  const { logout, userProfile, refreshUserProfile } = useAuth();

  return (
    <Card className="max-w-lg mx-auto my-12 shadow-lg">
      <CardContent className="p-6 text-center">
        <Typography variant="h5" className="font-bold mb-4">
          Freischaltung ausstehend
        </Typography>

        <Alert severity="info" className="mb-6 text-left">
          Hallo <strong>{userProfile?.realName}</strong>! Dein Account wurde erfolgreich erstellt. Um die App nutzen zu können, muss dein Konto erst durch einen Administrator freigegeben werden.
        </Alert>

        <Typography variant="body2" color="textSecondary" className="mb-6">
          Bitte wende dich an deinen Trainer oder Admin. Sobald du freigeschaltet wurdest, kannst du die Seite aktualisieren.
        </Typography>

        <div className="flex justify-center gap-4">
          <Button variant="outlined" onClick={refreshUserProfile}>
            Status erneut prüfen
          </Button>
          <Button variant="contained" color="error" onClick={logout}>
            Abmelden
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
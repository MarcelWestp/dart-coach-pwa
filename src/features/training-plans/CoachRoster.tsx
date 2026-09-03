import React, { useEffect, useState } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import type { UserProfile } from '../../types/user';
import { 
  Paper, 
  Typography, 
  Button, 
  Avatar,  
  Alert, 
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import GroupsIcon from '@mui/icons-material/Groups';

export const CoachRoster: React.FC = () => {
  const { userProfile, refreshUserProfile } = useAuth();
  const [allPlayers, setAllPlayers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchPlayers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const players: UserProfile[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() as UserProfile;
        // Nur freigeschaltete Spieler anzeigen
        if (data.isApproved) {
          players.push(data);
        }
      });
      setAllPlayers(players);
    } catch (err: any) {
      console.error(err);
      setError('Fehler beim Laden der Spielerliste.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  const handleAssignPlayer = async (player: UserProfile) => {
    if (!userProfile) return;
    setActionLoading(player.uid);
    setError(null);
    setSuccess(null);

    try {
      const playerRef = doc(db, 'users', player.uid);
      await updateDoc(playerRef, {
        assignedCoachId: userProfile.uid,
        updatedAt: new Date().toISOString(),
      });

      setAllPlayers(prev =>
        prev.map(p => p.uid === player.uid ? { ...p, assignedCoachId: userProfile.uid } : p)
      );

      setSuccess(`Spieler ${player.realName} (${player.nickname}) wurde deinem Kader hinzugefügt.`);
      await refreshUserProfile();
    } catch (err: any) {
      console.error(err);
      setError('Fehler beim Zuweisen des Spielers.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnassignPlayer = async (player: UserProfile) => {
    if (!window.confirm(`Möchtest du ${player.realName} wirklich aus deinem Kader entfernen?`)) return;

    setActionLoading(player.uid);
    setError(null);
    setSuccess(null);

    try {
      const playerRef = doc(db, 'users', player.uid);
      await updateDoc(playerRef, {
        assignedCoachId: '',
        updatedAt: new Date().toISOString(),
      });

      setAllPlayers(prev =>
        prev.map(p => p.uid === player.uid ? { ...p, assignedCoachId: undefined } : p)
      );

      setSuccess(`Spieler ${player.realName} wurde aus deinem Kader entfernt.`);
      await refreshUserProfile();
    } catch (err: any) {
      console.error(err);
      setError('Fehler beim Entfernen des Spielers.');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <CircularProgress />
      </div>
    );
  }

  // Aufteilung in meinem Kader & verfügbare Spieler
  const myRoster = allPlayers.filter(p => p.assignedCoachId === userProfile?.uid);
  const availablePlayers = allPlayers.filter(p => !p.assignedCoachId && p.uid !== userProfile?.uid);

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <GroupsIcon fontSize="large" color="primary" />
        <Typography variant="h4" component="h1" className="font-bold" color="text.primary">
          Kaderverwaltung & Spielerzuordnung
        </Typography>
      </div>

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* Mein Kader */}
      <Paper className="p-6 shadow-md">
        <Typography variant="h6" className="font-bold mb-2" color="text.primary">
          Mein aktueller Kader ({myRoster.length})
        </Typography>
        <Typography variant="body2" color="textSecondary" className="mb-4">
          Diese Spieler sind dir zugewiesen und erhalten deine Wochen-Trainingspläne.
        </Typography>

        <Divider className="mb-4" />

        {myRoster.length === 0 ? (
          <Typography variant="body2" color="textSecondary" className="py-4 text-center">
            Du hast aktuell noch keine Spieler in deinem Kader. Wähle unten Spieler aus.
          </Typography>
        ) : (
          <List>
            {myRoster.map((player) => (
              <ListItem key={player.uid} divider className="hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
                <ListItemAvatar>
                  <Avatar className="bg-primary-main">{player.nickname.substring(0, 2).toUpperCase()}</Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={`${player.realName} (${player.nickname})`}
                  secondary={`E-Mail: ${player.email}`}
                />
                <ListItemSecondaryAction>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    startIcon={<PersonRemoveIcon />}
                    disabled={actionLoading === player.uid}
                    onClick={() => handleUnassignPlayer(player)}
                  >
                    Aus Kader entfernen
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      {/* Verfügbare Spieler */}
      <Paper className="p-6 shadow-md">
        <Typography variant="h6" className="font-bold mb-2" color="text.primary">
          Freie Spieler im System ({availablePlayers.length})
        </Typography>
        <Typography variant="body2" color="textSecondary" className="mb-4">
          Spieler, die derzeit keinem Trainer zugeordnet sind:
        </Typography>

        <Divider className="mb-4" />

        {availablePlayers.length === 0 ? (
          <Typography variant="body2" color="textSecondary" className="py-4 text-center">
            Keine freien Spieler verfügbar.
          </Typography>
        ) : (
          <List>
            {availablePlayers.map((player) => (
              <ListItem key={player.uid} divider className="hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
                <ListItemAvatar>
                  <Avatar>{player.nickname.substring(0, 2).toUpperCase()}</Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={`${player.realName} (${player.nickname})`}
                  secondary={`E-Mail: ${player.email}`}
                />
                <ListItemSecondaryAction>
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    startIcon={<PersonAddIcon />}
                    disabled={actionLoading === player.uid}
                    onClick={() => handleAssignPlayer(player)}
                  >
                    Dem Kader hinzufügen
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </div>
  );
};
import React, { useEffect, useState } from 'react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import type { UserProfile } from '../../types/user';
import type { PlayerGroup } from '../../types/group';
import { 
  Paper, 
  Typography, 
  Button, 
  TextField, 
  Alert, 
  CircularProgress, 
  Card, 
  CardContent, 
  Chip, 
  Divider, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  OutlinedInput, 
  Box, 
  IconButton, 
  Avatar 
} from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

export const GroupManager: React.FC = () => {
  const { userProfile } = useAuth();

  const [groups, setGroups] = useState<PlayerGroup[]>([]);
  const [players, setPlayers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal-States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PlayerGroup | null>(null);

  // Formular-States
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [groupsSnap, usersSnap] = await Promise.all([
        getDocs(collection(db, 'playerGroups')),
        getDocs(collection(db, 'users'))
      ]);

      const fetchedGroups: PlayerGroup[] = [];
      groupsSnap.forEach((d) => {
        const data = d.data();
        delete data.id;
        fetchedGroups.push({ id: d.id, ...data } as PlayerGroup);
      });

      const fetchedPlayers: UserProfile[] = [];
      usersSnap.forEach((d) => {
        const data = d.data();
        delete data.id;
        fetchedPlayers.push({ id: d.id, ...data } as unknown as UserProfile);
      });

      setGroups(fetchedGroups);
      setPlayers(fetchedPlayers);
    } catch (err) {
      console.error(err);
      setError('Fehler beim Laden der Gruppen und Spieler.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (group?: PlayerGroup) => {
    if (group) {
      setEditingGroup(group);
      setGroupName(group.name);
      setGroupDescription(group.description || '');
      setSelectedMemberIds(group.memberIds || []);
    } else {
      setEditingGroup(null);
      setGroupName('');
      setGroupDescription('');
      setSelectedMemberIds([]);
    }
    setIsModalOpen(true);
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !groupName.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      if (editingGroup) {
        const groupRef = doc(db, 'playerGroups', editingGroup.id);
        await updateDoc(groupRef, {
          name: groupName.trim(),
          description: groupDescription.trim(),
          memberIds: selectedMemberIds,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await addDoc(collection(db, 'playerGroups'), {
          name: groupName.trim(),
          description: groupDescription.trim(),
          coachId: userProfile.uid,
          memberIds: selectedMemberIds,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setError('Fehler beim Speichern der Gruppe.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm('Möchtest du diese Gruppe wirklich löschen?')) return;

    try {
      await deleteDoc(doc(db, 'playerGroups', groupId));
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
    } catch (err) {
      console.error(err);
      setError('Fehler beim Löschen der Gruppe.');
    }
  };

  const getDisplayName = (user?: UserProfile) => {
    if (!user) return 'Unbekannter Spieler';
    return user.nickname || user.realName || user.email;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col gap-6">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <Typography variant="h4" component="h1" className="font-bold flex items-center gap-2" color="text.primary">
            <GroupsIcon fontSize="large" color="primary" /> Trainingsgruppen
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Erstelle Spielergruppen, um Übungen und Trainingspläne mehreren Spielern gleichzeitig zuzuweisen.
          </Typography>
        </div>

        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenModal()}
        >
          Neue Gruppe Erstellen
        </Button>
      </div>

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.length === 0 ? (
          <Paper className="p-8 text-center col-span-full">
            <Typography variant="body1" color="textSecondary">
              Noch keine Trainingsgruppen vorhanden. Erstelle jetzt deine erste Gruppe!
            </Typography>
          </Paper>
        ) : (
          groups.map((group) => (
            <Card key={group.id} variant="outlined" className="flex flex-col justify-between shadow-sm">
              <CardContent>
                <div className="flex justify-between items-start mb-2">
                  <Typography variant="h6" className="font-bold">
                    {group.name}
                  </Typography>
                  <div>
                    <IconButton size="small" onClick={() => handleOpenModal(group)} color="primary">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDeleteGroup(group.id)} color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </div>
                </div>

                {group.description && (
                  <Typography variant="body2" color="textSecondary" className="mb-3">
                    {group.description}
                  </Typography>
                )}

                <Divider className="my-3" />

                <Typography variant="caption" className="font-bold block mb-2" color="textSecondary">
                  Mitglieder ({group.memberIds.length}):
                </Typography>

                <div className="flex flex-wrap gap-1">
                  {group.memberIds.length === 0 ? (
                    <Typography variant="caption" color="textSecondary" className="italic">
                      Keine Spieler zugewiesen.
                    </Typography>
                  ) : (
                    group.memberIds.map((memId) => {
                      const p = players.find((u) => u.uid === memId);
                      return (
                        <Chip
                          key={memId}
                          avatar={<Avatar src={p?.photoURL}>{getDisplayName(p).substring(0, 1)}</Avatar>}
                          label={getDisplayName(p)}
                          size="small"
                          variant="outlined"
                        />
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal: Gruppe erstellen / bearbeiten */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle className="font-bold">
          {editingGroup ? 'Gruppe Bearbeiten' : 'Neue Gruppe Erstellen'}
        </DialogTitle>
        <form onSubmit={handleSaveGroup}>
          <DialogContent dividers className="flex flex-col gap-4">
            <TextField
              label="Gruppenname"
              variant="outlined"
              fullWidth
              required
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="z. B. Kader A, Jugend, Ligamannschaft 1"
            />

            <TextField
              label="Beschreibung (Optional)"
              variant="outlined"
              fullWidth
              multiline
              rows={2}
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              placeholder="z. B. Ziel: Vorbereitung auf die Rückrunde"
            />

            <FormControl fullWidth>
              <InputLabel id="select-group-members-label">Spieler zuweisen</InputLabel>
              <Select
                labelId="select-group-members-label"
                multiple
                value={selectedMemberIds}
                onChange={(e) =>
                  setSelectedMemberIds(
                    typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value
                  )
                }
                input={<OutlinedInput label="Spieler zuweisen" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((uid) => {
                      const p = players.find((u) => u.uid === uid);
                      return <Chip key={uid} label={getDisplayName(p)} size="small" />;
                    })}
                  </Box>
                )}
              >
                {players.map((player) => (
                  <MenuItem key={player.uid} value={player.uid}>
                    {getDisplayName(player)} ({player.email})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>

          <DialogActions className="p-4">
            <Button onClick={() => setIsModalOpen(false)}>Abbrechen</Button>
            <Button type="submit" variant="contained" color="primary" disabled={submitting}>
              {submitting ? 'Speichert...' : 'Gruppe Speichern'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  );
};
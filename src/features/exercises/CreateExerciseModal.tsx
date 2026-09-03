import React, { useEffect, useState } from 'react';
import { 
  collection, 
  getDocs, 
  addDoc,
  doc,
  updateDoc 
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import type { Tag, ExerciseType, Exercise } from '../../types/exercise';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Select, 
  OutlinedInput, 
  Box, 
  Chip, 
  Alert 
} from '@mui/material';

interface CreateExerciseModalProps {
  open: boolean;
  onClose: () => void;
  onExerciseCreated: () => void;
  exerciseToEdit?: Exercise | null;
}

export const CreateExerciseModal: React.FC<CreateExerciseModalProps> = ({ 
  open, 
  onClose, 
  onExerciseCreated,
  exerciseToEdit
}) => {
  const { userProfile } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [type, setType] = useState<ExerciseType>('scoring');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'tags'));
        const tags: Tag[] = [];
        querySnapshot.forEach((docSnap) => {
          tags.push({ id: docSnap.id, ...docSnap.data() } as Tag);
        });
        setAvailableTags(tags);
      } catch (err) {
        console.error('Fehler beim Laden der Tags:', err);
      }
    };

    if (open) {
      fetchTags();
      if (exerciseToEdit) {
        setTitle(exerciseToEdit.title);
        setDescription(exerciseToEdit.description || '');
        setInstructions(exerciseToEdit.instructions || '');
        setType(exerciseToEdit.type);
        setSelectedTagIds(exerciseToEdit.tagIds || []);
      } else {
        setTitle('');
        setDescription('');
        setInstructions('');
        setType('scoring');
        setSelectedTagIds([]);
      }
    }
  }, [open, exerciseToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !userProfile) return;

    setLoading(true);
    setError(null);

    try {
      if (exerciseToEdit) {
        // Übung aktualisieren
        const exerciseRef = doc(db, 'exercises', exerciseToEdit.id);
        await updateDoc(exerciseRef, {
          title: title.trim(),
          description: description.trim(),
          instructions: instructions.trim(),
          type,
          tagIds: selectedTagIds,
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Neue Übung erstellen
        const isSystemStandard = userProfile.roles.includes('admin');
        await addDoc(collection(db, 'exercises'), {
          title: title.trim(),
          description: description.trim(),
          instructions: instructions.trim(),
          type,
          tagIds: selectedTagIds,
          createdBy: userProfile.uid,
          isSystemStandard,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      onExerciseCreated();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError('Fehler beim Speichern der Übung.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle className="font-bold">
        {exerciseToEdit ? 'Übung bearbeiten' : 'Neue Dart-Übung erstellen'}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent dividers className="flex flex-col gap-4">
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Titel der Übung"
            variant="outlined"
            fullWidth
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <FormControl fullWidth required>
            <InputLabel>Übungstyp</InputLabel>
            <Select
              value={type}
              label="Übungstyp"
              onChange={(e) => setType(e.target.value as ExerciseType)}
            >
              <MenuItem value="scoring">Scoring</MenuItem>
              <MenuItem value="check">Check</MenuItem>
              <MenuItem value="rules">Regeln/Sonstiges</MenuItem>
              <MenuItem value="technique">Technik</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Kurzbeschreibung (1-2 Sätze)"
            variant="outlined"
            fullWidth
            multiline
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <TextField
            label="Detaillierte Spielanleitung / Ablauf"
            variant="outlined"
            fullWidth
            required
            multiline
            rows={4}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Erkläre hier genau, wie die Übung gespielt wird..."
          />

          <FormControl fullWidth>
            <InputLabel id="tags-select-label">Tags zuweisen</InputLabel>
            <Select
              labelId="tags-select-label"
              multiple
              value={selectedTagIds}
              onChange={(e) => setSelectedTagIds(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
              input={<OutlinedInput label="Tags zuweisen" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((tagId) => {
                    const tag = availableTags.find((t) => t.id === tagId);
                    return <Chip key={tagId} label={tag ? tag.name : tagId} size="small" />;
                  })}
                </Box>
              )}
            >
              {availableTags.map((tag) => (
                <MenuItem key={tag.id} value={tag.id}>
                  {tag.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>

        <DialogActions className="p-4">
          <Button onClick={onClose} disabled={loading}>
            Abbrechen
          </Button>
          <Button type="submit" variant="contained" color="primary" disabled={loading}>
            {loading ? 'Speichert...' : exerciseToEdit ? 'Änderungen Speichern' : 'Übung Erstellen'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
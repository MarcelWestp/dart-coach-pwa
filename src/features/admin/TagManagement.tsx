import React, { useEffect, useState } from 'react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { Tag } from '../../types/exercise';
import { 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  Chip, 
  Alert, 
  CircularProgress,
  IconButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';

export const TagManagement: React.FC = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagName, setTagName] = useState('');
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'tags'));
      const fetchedTags: Tag[] = [];
      querySnapshot.forEach((docSnap) => {
        fetchedTags.push({ id: docSnap.id, ...docSnap.data() } as Tag);
      });
      setTags(fetchedTags);
    } catch (err: any) {
      console.error(err);
      setError('Fehler beim Laden der Tags.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagName.trim()) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const newTagData = {
        name: tagName.trim(),
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'tags'), newTagData);
      const createdTag: Tag = { id: docRef.id, ...newTagData };

      setTags((prev) => [...prev, createdTag]);
      setTagName('');
      setSuccess(`Tag "${createdTag.name}" erfolgreich erstellt.`);
    } catch (err: any) {
      console.error(err);
      setError('Fehler beim Erstellen des Tags.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTag = async (tagId: string, name: string) => {
    if (!window.confirm(`Möchtest du den Tag "${name}" wirklich löschen?`)) return;

    try {
      await deleteDoc(doc(db, 'tags', tagId));
      setTags((prev) => prev.filter((t) => t.id !== tagId));
      setSuccess(`Tag "${name}" wurde gelöscht.`);
    } catch (err: any) {
      console.error(err);
      setError('Fehler beim Löschen des Tags.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-6">
        <CircularProgress />
      </div>
    );
  }

  return (
    <Paper className="p-6 my-6 shadow-md">
      <div className="flex items-center gap-2 mb-4">
        <LocalOfferIcon color="primary" />
        <Typography variant="h6" className="font-bold">
          Übungs-Tags verwalten
        </Typography>
      </div>

      {error && <Alert severity="error" className="mb-4" onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" className="mb-4" onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* Formular zum Erstellen eines neuen Tags */}
      <form onSubmit={handleCreateTag} className="flex gap-4 mb-6 items-center">
        <TextField
          label="Neuer Tag Name (z. B. Doppel, Scoring, Bull)"
          variant="outlined"
          size="small"
          fullWidth
          value={tagName}
          onChange={(e) => setTagName(e.target.value)}
          disabled={submitting}
        />
        <Button 
          type="submit" 
          variant="contained" 
          color="primary"
          disabled={submitting || !tagName.trim()}
          className="whitespace-nowrap"
        >
          {submitting ? 'Speichert...' : 'Tag Hinzufügen'}
        </Button>
      </form>

      {/* Liste aller existierenden Tags */}
      <Typography variant="subtitle2" className="mb-2 text-gray-500">
        Vorhandene Tags ({tags.length}):
      </Typography>

      <div className="flex flex-wrap gap-2">
        {tags.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            Noch keine Tags vorhanden. Erstelle den ersten Tag oben.
          </Typography>
        ) : (
          tags.map((tag) => (
            <Chip
              key={tag.id}
              label={tag.name}
              color="primary"
              variant="outlined"
              onDelete={() => handleDeleteTag(tag.id, tag.name)}
              deleteIcon={
                <IconButton size="small" component="span">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              }
            />
          ))
        )}
      </div>
    </Paper>
  );
};
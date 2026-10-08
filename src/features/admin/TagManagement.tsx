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
  IconButton,
  useTheme,
  useMediaQuery,
  Box
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

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
    <Paper 
      variant="outlined" 
      sx={{ 
        p: { xs: 2, sm: 3 }, 
        my: { xs: 2, sm: 3 }, 
        bgcolor: 'background.paper', 
        borderColor: 'divider' 
      }} 
      className="shadow-sm"
    >
      {/* Titelzeile */}
      <div className="flex items-center gap-2 mb-4">
        <LocalOfferIcon color="primary" />
        <Typography variant="h6" className="font-bold text-base sm:text-lg" color="text.primary">
          Übungs-Tags verwalten
        </Typography>
      </div>

      {error && <Alert severity="error" className="mb-4" onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" className="mb-4" onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* Formular zum Erstellen eines neuen Tags (Auf Mobile flex-col, sonst flex-row) */}
      <form onSubmit={handleCreateTag} className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 items-stretch sm:items-center">
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
          size={isMobile ? "medium" : "small"}
          className="whitespace-nowrap min-h-[40px]"
        >
          {submitting ? 'Speichert...' : 'Tag Hinzufügen'}
        </Button>
      </form>

      {/* Liste aller existierenden Tags */}
      <Typography variant="subtitle2" className="mb-3 font-semibold" color="text.secondary">
        Vorhandene Tags ({tags.length}):
      </Typography>

      <Box className="flex flex-wrap gap-2">
        {tags.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
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
                <IconButton size="small" component="span" sx={{ p: 0.5 }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              }
              sx={{
                bgcolor: 'action.hover',
                borderColor: 'divider',
                '& .MuiChip-label': {
                  px: 1.5,
                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                }
              }}
            />
          ))
        )}
      </Box>
    </Paper>
  );
};
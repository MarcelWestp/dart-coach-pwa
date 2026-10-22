import React, { useEffect, useState } from 'react';
import {
  getChallengePool,
  addChallengeTask,
  updateChallengeTask,
  deleteChallengeTask,
} from '../../services/challengeService';
import type { ChallengeDifficulty, ChallengeTask } from '../../types/challenge';
import {
  Paper,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ExtensionIcon from '@mui/icons-material/Extension';

export const AdminChallengeManager: React.FC = () => {
  const [tasks, setTasks] = useState<ChallengeTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Tab Filter State (0: Alle, 1: Bronze, 2: Silber, 3: Gold)
  const [activeTab, setActiveTab] = useState<number>(0);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formDifficulty, setFormDifficulty] = useState<ChallengeDifficulty>('bronze');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchPool = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getChallengePool();
      setTasks(data);
    } catch (err) {
      console.error(err);
      setError('Fehler beim Laden des Challenge-Pools.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPool();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingTaskId(null);
    setFormTitle('');
    setFormDescription('');
    setFormDifficulty('bronze');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task: ChallengeTask) => {
    setEditingTaskId(task.id);
    setFormTitle(task.title);
    setFormDescription(task.description);
    setFormDifficulty(task.difficulty);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (editingTaskId) {
        await updateChallengeTask(editingTaskId, {
          title: formTitle.trim(),
          description: formDescription.trim(),
          difficulty: formDifficulty,
        });
        setSuccess('Herausforderung erfolgreich aktualisiert.');
      } else {
        await addChallengeTask({
          title: formTitle.trim(),
          description: formDescription.trim(),
          difficulty: formDifficulty,
        });
        setSuccess('Neue Herausforderung erfolgreich im Pool angelegt.');
      }

      setIsModalOpen(false);
      fetchPool();
    } catch (err) {
      console.error(err);
      setError('Fehler beim Speichern der Herausforderung.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (taskId: string, title: string) => {
    if (!window.confirm(`Möchtest du die Aufgabe "${title}" wirklich aus dem Pool löschen?`)) {
      return;
    }

    try {
      await deleteChallengeTask(taskId);
      setSuccess('Aufgabe gelöscht.');
      fetchPool();
    } catch (err) {
      console.error(err);
      setError('Fehler beim Löschen der Aufgabe.');
    }
  };

  // Filter Logik
  const getFilteredTasks = () => {
    if (activeTab === 1) return tasks.filter((t) => t.difficulty === 'bronze');
    if (activeTab === 2) return tasks.filter((t) => t.difficulty === 'silver');
    if (activeTab === 3) return tasks.filter((t) => t.difficulty === 'gold');
    return tasks;
  };

  const filteredTasks = getFilteredTasks();

  const getDifficultyChip = (difficulty: ChallengeDifficulty) => {
    switch (difficulty) {
      case 'bronze':
        return <Chip label="Bronze / Anfänger" size="small" sx={{ bgcolor: '#cd7f32', color: '#fff' }} />;
      case 'silver':
        return <Chip label="Silber / Fortgeschritten" size="small" sx={{ bgcolor: '#c0c0c0', color: '#000' }} />;
      case 'gold':
        return <Chip label="Gold / Profi" size="small" sx={{ bgcolor: '#ffd700', color: '#000' }} />;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col gap-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <Typography variant="h4" component="h1" className="font-bold flex items-center gap-2" color="text.primary">
            <ExtensionIcon fontSize="large" color="primary" /> Challenge-Pool Verwaltung
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Verwalte die Aufgabenpakete für die monatlichen Trainingskarten (Bronze, Silber & Gold).
          </Typography>
        </div>

        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenCreateModal}
        >
          Neue Challenge Anlegen
        </Button>
      </div>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Paper className="shadow-sm">
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label={`Alle (${tasks.length})`} />
          <Tab label={`Bronze (${tasks.filter((t) => t.difficulty === 'bronze').length})`} />
          <Tab label={`Silber (${tasks.filter((t) => t.difficulty === 'silver').length})`} />
          <Tab label={`Gold (${tasks.filter((t) => t.difficulty === 'gold').length})`} />
        </Tabs>
      </Paper>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <CircularProgress />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <Typography variant="body1" color="textSecondary">
                Keine Herausforderungen für diese Ausfallkategorie im Pool gefunden.
              </Typography>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <Card
                key={task.id}
                variant="outlined"
                sx={{ bgcolor: 'background.paper', borderColor: 'divider' }}
                className="shadow-sm flex flex-col justify-between"
              >
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    {getDifficultyChip(task.difficulty)}
                    <div className="flex items-center gap-1">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleOpenEditModal(task)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(task.id, task.title)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </div>
                  </div>

                  <Typography variant="h6" className="font-bold leading-tight" color="text.primary">
                    {task.title}
                  </Typography>

                  <Typography variant="body2" color="textSecondary" className="whitespace-pre-line">
                    {task.description || 'Keine Beschreibung vorhanden.'}
                  </Typography>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Editor Modal */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle className="font-bold">
          {editingTaskId ? 'Herausforderung Bearbeiten' : 'Neue Herausforderung Erstellen'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent dividers className="flex flex-col gap-4">
            <FormControl fullWidth required size="small">
              <InputLabel>Schwierigkeitsgrad</InputLabel>
              <Select
                value={formDifficulty}
                label="Schwierigkeitsgrad"
                onChange={(e) => setFormDifficulty(e.target.value as ChallengeDifficulty)}
              >
                <MenuItem value="bronze">Bronze / Anfänger</MenuItem>
                <MenuItem value="silver">Silber / Fortgeschritten</MenuItem>
                <MenuItem value="gold">Gold / Profi</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Titel der Herausforderung"
              required
              fullWidth
              size="small"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="z. B. 3x Bullseye in einer Aufnahme"
            />

            <TextField
              label="Beschreibung / Regelerklärung"
              multiline
              rows={3}
              fullWidth
              size="small"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Erkläre kurz, was der Spieler tun muss, um die Aufgabe abzuhaken."
            />
          </DialogContent>

          <DialogActions className="p-4">
            <Button onClick={() => setIsModalOpen(false)}>Abbrechen</Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={submitting || !formTitle.trim()}
            >
              {submitting ? 'Speichert...' : 'Speichern'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  );
};
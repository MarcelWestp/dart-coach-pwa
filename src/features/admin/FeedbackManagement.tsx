import React, { useEffect, useState } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { 
  Paper, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Chip, 
  IconButton, 
  Select, 
  MenuItem, 
  FormControl, 
  Alert, 
  CircularProgress,
  useTheme,
  Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import BugReportIcon from '@mui/icons-material/BugReport';
import CommentIcon from '@mui/icons-material/Comment';

export interface AppFeedbackItem {
  id: string;
  userId: string;
  userEmail: string;
  userNickname: string;
  type: 'idea' | 'bug' | 'other';
  message: string;
  status: 'open' | 'in_review' | 'done';
  createdAt: string;
}

export const FeedbackManagement: React.FC = () => {
  const [feedbackList, setFeedbackList] = useState<AppFeedbackItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const theme = useTheme();

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const fetched: AppFeedbackItem[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetched.push({
          id: docSnap.id,
          ...data,
        } as AppFeedbackItem);
      });
      setFeedbackList(fetched);
    } catch (err: any) {
      console.error(err);
      setError('Fehler beim Laden des Feedbacks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const handleStatusChange = async (id: string, newStatus: 'open' | 'in_review' | 'done') => {
    try {
      await updateDoc(doc(db, 'feedback', id), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });

      setFeedbackList((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
      );
      setSuccess('Status erfolgreich aktualisiert.');
    } catch (err) {
      console.error(err);
      setError('Fehler beim Aktualisieren des Status.');
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'feedback', id));
      setFeedbackList((prev) => prev.filter((item) => item.id !== id));
      setSuccess('Eintrag gelöscht.');
    } catch (err) {
      console.error(err);
      setError('Fehler beim Löschen des Eintrags.');
    }
  };

  const getTypeChip = (type: 'idea' | 'bug' | 'other') => {
    switch (type) {
      case 'idea':
        return <Chip icon={<LightbulbIcon fontSize="small" />} label="Idee" color="primary" size="small" variant="outlined" />;
      case 'bug':
        return <Chip icon={<BugReportIcon fontSize="small" />} label="Bug / Fehler" color="error" size="small" variant="outlined" />;
      default:
        return <Chip icon={<CommentIcon fontSize="small" />} label="Sonstiges" color="default" size="small" variant="outlined" />;
    }
  };

  const getStatusChipColor = (status: 'open' | 'in_review' | 'done') => {
    switch (status) {
      case 'open':
        return 'warning';
      case 'in_review':
        return 'info';
      case 'done':
        return 'success';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Typography variant="h6" className="font-bold" color="text.primary">
        Feedback & Bug-Reports ({feedbackList.length})
      </Typography>

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess(null)}>{success}</Alert>}

      <TableContainer component={Paper} className="shadow-lg">
        <Table>
          <TableHead sx={{ bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)' }}>
            <TableRow>
              <TableCell><strong>Kategorie</strong></TableCell>
              <TableCell><strong>Absender</strong></TableCell>
              <TableCell><strong>Nachricht</strong></TableCell>
              <TableCell><strong>Datum</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell align="center"><strong>Aktionen</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {feedbackList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" className="py-8">
                  <Typography variant="body2" color="textSecondary">
                    Bisher wurden keine Feedback-Einträge eingereicht.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              feedbackList.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>{getTypeChip(item.type)}</TableCell>
                  <TableCell>
                    <Typography variant="body2" className="font-bold" color="text.primary">
                      {item.userNickname}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {item.userEmail}
                    </Typography>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <Typography variant="body2" className="whitespace-pre-wrap" color="text.primary">
                      {item.message}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="textSecondary">
                      {new Date(item.createdAt).toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <FormControl size="small" variant="standard" className="min-w-[130px]">
                      <Select
                        value={item.status}
                        onChange={(e) => handleStatusChange(item.id, e.target.value as any)}
                        renderValue={(val) => (
                          <Chip 
                            label={val === 'open' ? 'Offen' : val === 'in_review' ? 'In Bearbeitung' : 'Erledigt'} 
                            color={getStatusChipColor(val as any)} 
                            size="small" 
                          />
                        )}
                      >
                        <MenuItem value="open">Offen</MenuItem>
                        <MenuItem value="in_review">In Bearbeitung</MenuItem>
                        <MenuItem value="done">Erledigt</MenuItem>
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Eintrag löschen">
                      <IconButton color="error" size="small" onClick={() => handleDeleteFeedback(item.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};
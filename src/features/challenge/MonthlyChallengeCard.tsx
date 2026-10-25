import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getCurrentMonthYear,
  getUserMonthlyChallenge,
  startUserMonthlyChallenge,
  toggleTaskCompletion,
  swapChallengeTask,
} from '../../services/challengeService';
import type { ChallengeDifficulty, UserMonthlyChallenge } from '../../types/challenge';
import {
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';

interface MonthlyChallengeCardProps {
  onOpenLeaderboard: (difficulty: ChallengeDifficulty) => void;
}

export const MonthlyChallengeCard: React.FC<MonthlyChallengeCardProps> = ({ onOpenLeaderboard }) => {
  const { userProfile } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [challenge, setChallenge] = useState<UserMonthlyChallenge | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Tausch-Modal State
  const [taskToSwapId, setTaskToSwapId] = useState<string | null>(null);

  const currentMonthYear = getCurrentMonthYear();

  const fetchUserChallenge = async () => {
    if (!userProfile?.uid) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getUserMonthlyChallenge(userProfile.uid, currentMonthYear);
      setChallenge(data);
    } catch (err) {
      console.error(err);
      setError('Fehler beim Laden deines Dart-Passes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserChallenge();
  }, [userProfile?.uid]);

  const handleStartChallenge = async (difficulty: ChallengeDifficulty) => {
    if (!userProfile?.uid) return;
    setActionLoading(true);
    setError(null);
    try {
      const created = await startUserMonthlyChallenge(userProfile.uid, difficulty, currentMonthYear);
      setChallenge(created);
      setSuccess(`Challenge '${difficulty.toUpperCase()}' erfolgreich gestartet!`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Fehler beim Starten der Challenge.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleTask = async (taskId: string) => {
    if (!challenge?.id) return;
    setActionLoading(true);
    setError(null);
    try {
      const updated = await toggleTaskCompletion(challenge.id, taskId);
      setChallenge(updated);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Fehler beim Aktualisieren der Aufgabe.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmSwap = async () => {
    if (!challenge?.id || !taskToSwapId) return;
    setActionLoading(true);
    setError(null);
    try {
      const updated = await swapChallengeTask(challenge.id, taskToSwapId);
      setChallenge(updated);
      setTaskToSwapId(null);
      setSuccess('Aufgabe erfolgreich neu gewählt!');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Fehler beim Tauschen der Aufgabe.');
    } finally {
      setActionLoading(false);
    }
  };

  // Formatiert YYYY-MM zu MM/YYYY
  const formatMonthYearDisplay = (myStr: string) => {
    const [y, m] = myStr.split('-');
    return `${m}/${y}`;
  };

  const getDifficultyBadge = (difficulty: ChallengeDifficulty) => {
    switch (difficulty) {
      case 'bronze':
        return <Chip label="BRONZE" sx={{ bgcolor: '#cd7f32', color: '#fff', fontWeight: 'bold' }} />;
      case 'silver':
        return <Chip label="SILBER" sx={{ bgcolor: '#c0c0c0', color: '#000', fontWeight: 'bold' }} />;
      case 'gold':
        return <Chip label="GOLD" sx={{ bgcolor: '#ffd700', color: '#000', fontWeight: 'bold' }} />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  // 1. SCHRITT: AUSWAHL DER SCHWIERIGKEITSSTUFE (Nur Bronze / Silber / Gold)
  if (!challenge) {
    return (
      <Paper
        elevation={2}
        sx={{
          p: { xs: 2.5, sm: 4 },
          maxWidth: '600px',
          mx: 'auto',
          bgcolor: 'background.paper',
          borderColor: 'divider',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        <Box>
          <MilitaryTechIcon color="primary" sx={{ fontSize: { xs: 48, sm: 60 } }} />
          <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold', mt: 1 }} color="text.primary">
            Dart-Pass ({formatMonthYearDisplay(currentMonthYear)})
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Wähle deine gewünschte Schwierigkeitsstufe. Das System stellt dir anschließend zufällig 7 Aufgaben aus dem Pool zusammen.
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mt: 1 }}>
          <Card
            variant="outlined"
            onClick={() => !actionLoading && handleStartChallenge('bronze')}
            sx={{
              p: 2,
              bgcolor: 'action.hover',
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              justify: 'space-between',
              cursor: actionLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': { borderColor: '#cd7f32' },
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#cd7f32', mb: 2 }}>
              BRONZE
            </Typography>
            <Button
              variant="contained"
              size="small"
              sx={{ bgcolor: '#cd7f32', '&:hover': { bgcolor: '#b86f28' } }}
              disabled={actionLoading}
            >
              Bronze Wählen
            </Button>
          </Card>

          <Card
            variant="outlined"
            onClick={() => !actionLoading && handleStartChallenge('silver')}
            sx={{
              p: 2,
              bgcolor: 'action.hover',
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              justify: 'space-between',
              cursor: actionLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': { borderColor: '#a0a0a0' },
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#a0a0a0', mb: 2 }}>
              SILBER
            </Typography>
            <Button
              variant="contained"
              size="small"
              sx={{ bgcolor: '#a0a0a0', color: '#000', '&:hover': { bgcolor: '#8a8a8a' } }}
              disabled={actionLoading}
            >
              Silber Wählen
            </Button>
          </Card>

          <Card
            variant="outlined"
            onClick={() => !actionLoading && handleStartChallenge('gold')}
            sx={{
              p: 2,
              bgcolor: 'action.hover',
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              justify: 'space-between',
              cursor: actionLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': { borderColor: '#ffd700' },
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#ffd700', mb: 2 }}>
              GOLD
            </Typography>
            <Button
              variant="contained"
              size="small"
              sx={{ bgcolor: '#ffd700', color: '#000', '&:hover': { bgcolor: '#e6c200' } }}
              disabled={actionLoading}
            >
              Gold Wählen
            </Button>
          </Card>
        </Box>
      </Paper>
    );
  }

  // 2. SCHRITT: DIE AKTIVE TRAININGSKARTE
  const completedTasksCount = challenge.tasks.filter((t) => t.completed).length;
  const isAllCompleted = completedTasksCount === 7;

  return (
    <Box sx={{ maxWidth: '800px', mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2, px: { xs: 1, sm: 2 } }}>
      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* TRAININGSKARTE CONTAINER */}
      <Paper
        elevation={3}
        sx={{
          p: { xs: 2, sm: 3.5 },
          borderRadius: 3,
          bgcolor: 'background.paper',
          borderColor: 'divider',
          borderWidth: 1,
          borderStyle: 'solid',
        }}
      >
        {/* HEADER BEREICH */}
        <Box
          sx={{
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
            borderBottom: 1,
            borderColor: 'divider',
            pb: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {getDifficultyBadge(challenge.difficulty)}
            <Typography variant={isMobile ? 'h6' : 'h5'} sx={{ fontWeight: 800, tracking: '0.05em' }} color="text.primary">
              Dart-Pass
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                bgcolor: 'action.hover',
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              <CalendarMonthIcon fontSize="small" color="primary" />
              <span>MONAT: {formatMonthYearDisplay(challenge.monthYear)}</span>
            </Box>
            <Box
              sx={{
                bgcolor: 'action.selected',
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              SPIELER: {userProfile?.nickname || userProfile?.realName || 'Darter'}
            </Box>
          </Box>
        </Box>

        {/* JOKER / TAUSCH BEREICH */}
        <Box
          sx={{
            my: 2.5,
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1.5,
            bgcolor: 'action.hover',
            p: 1.5,
            borderRadius: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }} color="text.primary">
              Neuwahl-Joker übrig: {challenge.swapsRemaining} / 2
            </Typography>
            <Typography variant="caption" color="text.secondary">
              (Du kannst max. 2 offene Aufgaben neu ziehen)
            </Typography>
          </Box>

          <Chip
            label={`Fortschritt: ${completedTasksCount} / 7 Erledigt`}
            color={isAllCompleted ? 'success' : 'primary'}
            sx={{ fontWeight: 'bold' }}
            size="small"
          />
        </Box>

        {/* AUFGABENLISTE */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, my: 2 }}>
          {challenge.tasks.map((task, index) => (
            <Card
              key={task.taskId}
              variant="outlined"
              sx={{
                bgcolor: task.completed ? 'action.selected' : 'background.paper',
                borderColor: task.completed ? 'success.main' : 'divider',
                transition: 'all 0.2s ease',
              }}
            >
              <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.85rem',
                        flexShrink: 0,
                      }}
                    >
                      {index + 1}
                    </Box>

                    <Checkbox
                      checked={task.completed}
                      onChange={() => handleToggleTask(task.taskId)}
                      disabled={actionLoading}
                      color="success"
                      size={isMobile ? 'small' : 'medium'}
                    />

                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: 'bold',
                          textDecoration: task.completed ? 'line-through' : 'none',
                          color: task.completed ? 'text.secondary' : 'text.primary',
                          fontSize: { xs: '0.9rem', sm: '1rem' },
                        }}
                      >
                        {task.title}
                      </Typography>
                      {task.description && (
                        <Typography variant="caption" color="text.secondary">
                          {task.description}
                        </Typography>
                      )}
                      {task.completedAt && (
                        <Typography variant="caption" color="success.main" sx={{ fontWeight: 600, mt: 0.5 }}>
                          Abgehakt am:{' '}
                          {new Date(task.completedAt).toLocaleDateString('de-DE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {/* Tausch Button */}
                  {!task.completed && challenge.swapsRemaining > 0 && (
                    <IconButton
                      size="small"
                      color="warning"
                      title="Diese Aufgabe neu ziehen"
                      onClick={() => setTaskToSwapId(task.taskId)}
                      disabled={actionLoading}
                    >
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* ABSCHLUSS-HERVORHEBUNG & RANGLISTEN-LINK */}
        {isAllCompleted && (
          <Box
            sx={{
              mt: 3,
              p: 2.5,
              borderRadius: 2,
              bgcolor: 'action.hover',
              borderColor: 'success.main',
              borderWidth: 1,
              borderStyle: 'solid',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <CheckCircleIcon color="success" sx={{ fontSize: 48 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }} color="text.primary">
                HERZLICHEN GLÜCKWUNSCH!
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Du hast alle 7 Aufgaben absolviert! Benötigte Zeit:{' '}
                <strong style={{ color: theme.palette.success.main }}>{challenge.daysNeeded} Tag(e)</strong>.
              </Typography>
            </Box>

            <Button
              variant="contained"
              color="success"
              startIcon={<EmojiEventsIcon />}
              onClick={() => onOpenLeaderboard(challenge.difficulty)}
            >
              Zur Monats-Rangliste ({challenge.difficulty.toUpperCase()})
            </Button>
          </Box>
        )}
      </Paper>

      {/* TAUSCH BESTÄTIGUNGS-MODAL */}
      <Dialog
        open={Boolean(taskToSwapId)}
        onClose={() => setTaskToSwapId(null)}
        fullWidth
        maxWidth="xs"
        slotProps={{
          paper: {
            sx: { bgcolor: 'background.paper', borderColor: 'divider' },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 'bold' }}>Aufgabe neu wählen?</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.primary">
            Möchtest du einen deiner Neuwahl-Joker einsetzen, um diese Aufgabe durch eine andere zufällige Aufgabe aus der Stufe{' '}
            <strong>{challenge.difficulty.toUpperCase()}</strong> zu ersetzen?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setTaskToSwapId(null)}>Abbrechen</Button>
          <Button variant="contained" color="warning" onClick={handleConfirmSwap} disabled={actionLoading}>
            {actionLoading ? 'Tauscht...' : 'Jetzt Tauschen'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
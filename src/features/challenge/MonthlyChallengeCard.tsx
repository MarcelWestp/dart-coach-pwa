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
      setError('Fehler beim Laden deiner monatlichen Challenge.');
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
      setSuccess(`Challenge auf Stufe '${difficulty.toUpperCase()}' erfolgreich gestartet!`);
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
        return <Chip label="BRONZE / LEVEL 1" sx={{ bgcolor: '#cd7f32', color: '#fff', fontWeight: 'bold' }} />;
      case 'silver':
        return <Chip label="SILBER / LEVEL 2" sx={{ bgcolor: '#c0c0c0', color: '#000', fontWeight: 'bold' }} />;
      case 'gold':
        return <Chip label="GOLD / LEVEL 3" sx={{ bgcolor: '#ffd700', color: '#000', fontWeight: 'bold' }} />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <CircularProgress />
      </div>
    );
  }

  // 1. SCHRITT: AUSWAHL DER SCHWIERIGKEITSSTUFE
  if (!challenge) {
    return (
      <Paper className="p-8 max-w-2xl mx-auto shadow-md text-center flex flex-col gap-6">
        <div>
          <MilitaryTechIcon color="primary" sx={{ fontSize: 60 }} />
          <Typography variant="h4" className="font-bold mt-2" color="text.primary">
            Monatliche Challenge ({formatMonthYearDisplay(currentMonthYear)})
          </Typography>
          <Typography variant="body1" color="textSecondary" className="mt-2">
            Wähle einmal im Monat deine gewünschte Schwierigkeitsstufe. Das System stellt dir anschließend zufällig 7 Aufgaben aus dem Pool.
          </Typography>
        </div>

        {error && <Alert severity="error">{error}</Alert>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <Card
            variant="outlined"
            className="p-4 flex flex-col justify-between hover:border-amber-700 transition-all cursor-pointer"
            onClick={() => !actionLoading && handleStartChallenge('bronze')}
          >
            <Typography variant="h6" className="font-bold text-amber-800">BRONZE</Typography>
            <Typography variant="caption" color="textSecondary" className="my-2">Anfänger Level</Typography>
            <Button variant="contained" sx={{ bgcolor: '#cd7f32', '&:hover': { bgcolor: '#b86f28' } }} disabled={actionLoading}>
              Bronze Wählen
            </Button>
          </Card>

          <Card
            variant="outlined"
            className="p-4 flex flex-col justify-between hover:border-slate-400 transition-all cursor-pointer"
            onClick={() => !actionLoading && handleStartChallenge('silver')}
          >
            <Typography variant="h6" className="font-bold text-slate-700">SILBER</Typography>
            <Typography variant="caption" color="textSecondary" className="my-2">Fortgeschritten Level</Typography>
            <Button variant="contained" sx={{ bgcolor: '#a0a0a0', '&:hover': { bgcolor: '#8a8a8a' } }} disabled={actionLoading}>
              Silber Wählen
            </Button>
          </Card>

          <Card
            variant="outlined"
            className="p-4 flex flex-col justify-between hover:border-yellow-600 transition-all cursor-pointer"
            onClick={() => !actionLoading && handleStartChallenge('gold')}
          >
            <Typography variant="h6" className="font-bold text-yellow-600">GOLD</Typography>
            <Typography variant="caption" color="textSecondary" className="my-2">Profi Level</Typography>
            <Button variant="contained" sx={{ bgcolor: '#ffd700', color: '#000', '&:hover': { bgcolor: '#e6c200' } }} disabled={actionLoading}>
              Gold Wählen
            </Button>
          </Card>
        </div>
      </Paper>
    );
  }

  // 2. SCHRITT: DIE AKTIVE TRAININGSKARTE
  const completedTasksCount = challenge.tasks.filter((t) => t.completed).length;
  const isAllCompleted = completedTasksCount === 7;

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* TRAININGSKARTE CONTAINER */}
      <Paper
        elevation={4}
        className="p-6 rounded-xl border-4 border-amber-900/30 bg-gradient-to-b from-stone-50 to-stone-100 dark:from-stone-900 dark:to-stone-950 shadow-xl"
      >
        {/* HEADER BEREICH */}
        <div className="flex justify-between items-center flex-wrap gap-4 border-b border-stone-300 dark:border-stone-800 pb-4">
          <div className="flex items-center gap-3">
            {getDifficultyBadge(challenge.difficulty)}
            <Typography variant="h5" className="font-extrabold tracking-wider" color="text.primary">
              TRAININSKARTE
            </Typography>
          </div>

          <div className="flex items-center gap-4 text-sm font-semibold">
            <Box className="flex items-center gap-1 bg-amber-100 dark:bg-amber-950/60 px-3 py-1 rounded-md border border-amber-300 dark:border-amber-800">
              <CalendarMonthIcon fontSize="small" color="primary" />
              <span>MONAT: {formatMonthYearDisplay(challenge.monthYear)}</span>
            </Box>
            <Box className="bg-stone-200 dark:bg-stone-800 px-3 py-1 rounded-md">
              SPIELER: {userProfile?.nickname || userProfile?.realName || 'Darter'}
            </Box>
          </div>
        </div>

        {/* JOKER / TAUSCH BEREICH */}
        <div className="my-4 flex justify-between items-center flex-wrap gap-2 bg-stone-200/50 dark:bg-stone-800/50 p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <Typography variant="subtitle2" className="font-bold" color="text.primary">
              Neuwahl-Joker übrig: {challenge.swapsRemaining} / 2
            </Typography>
            <Typography variant="caption" color="textSecondary">
              (Du kannst max. 2 offene Aufgaben neu ziehen)
            </Typography>
          </div>

          <Chip
            label={`Fortschritt: ${completedTasksCount} / 7 Erledigt`}
            color={isAllCompleted ? 'success' : 'primary'}
            className="font-bold"
          />
        </div>

        {/* AUFGABENLISTE */}
        <div className="flex flex-col gap-3 my-6">
          {challenge.tasks.map((task, index) => (
            <Card
              key={task.taskId}
              variant="outlined"
              className={`transition-all ${
                task.completed
                  ? 'bg-green-50/70 dark:bg-green-950/20 border-green-300 dark:border-green-800'
                  : 'bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-700'
              }`}
            >
              <CardContent className="p-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 rounded-full bg-amber-900 text-amber-50 font-bold flex items-center justify-center text-sm shrink-0">
                    {index + 1}
                  </div>

                  <Checkbox
                    checked={task.completed}
                    onChange={() => handleToggleTask(task.taskId)}
                    disabled={actionLoading}
                    color="success"
                  />

                  <div className="flex flex-col">
                    <Typography
                      variant="body1"
                      className={`font-bold ${task.completed ? 'line-through text-stone-500' : 'text-stone-900 dark:text-stone-100'}`}
                    >
                      {task.title}
                    </Typography>
                    {task.description && (
                      <Typography variant="caption" color="textSecondary">
                        {task.description}
                      </Typography>
                    )}
                    {task.completedAt && (
                      <Typography variant="caption" color="success.main" className="font-medium mt-0.5">
                        Abgehakt am: {new Date(task.completedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    )}
                  </div>
                </div>

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
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ABSCHLUSS-HERVORHEBUNG & RANGLISTEN-LINK */}
        {isAllCompleted && (
          <Box className="mt-6 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-center flex flex-col items-center gap-3">
            <CheckCircleIcon color="success" sx={{ fontSize: 48 }} />
            <div>
              <Typography variant="h6" className="font-bold text-emerald-900 dark:text-emerald-200">
                HERZLICHEN GLÜCKWUNSCH!
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Du hast alle 7 Aufgaben absolviert! Benötigte Zeit: <strong className="text-emerald-700 dark:text-emerald-300">{challenge.daysNeeded} Tag(e)</strong>.
              </Typography>
            </div>

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
      <Dialog open={Boolean(taskToSwapId)} onClose={() => setTaskToSwapId(null)}>
        <DialogTitle className="font-bold">Aufgabe neu wählen?</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">
            Möchtest du einen deiner 2 Neuwahl-Joker einsetzen, um diese Aufgabe durch eine andere zufällige Aufgabe aus der Stufe <strong>{challenge.difficulty.toUpperCase()}</strong> zu ersetzen?
          </Typography>
        </DialogContent>
        <DialogActions className="p-4">
          <Button onClick={() => setTaskToSwapId(null)}>Abbrechen</Button>
          <Button variant="contained" color="warning" onClick={handleConfirmSwap} disabled={actionLoading}>
            {actionLoading ? 'Tauscht...' : 'Jetzt Tauschen'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
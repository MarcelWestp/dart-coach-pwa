import React, { useState, useEffect, useRef } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { triggerAchievementCheck } from "../../services/achievementService";
import type {
  Exercise,
  PerformanceTest,
  ExerciseResultType,
} from "../../types/exercise";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Typography,
  Divider,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Chip,
  useMediaQuery,
  useTheme,
  IconButton,
  Tooltip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HelpIcon from "@mui/icons-material/Help";
import TimerIcon from "@mui/icons-material/Timer";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import ReplayIcon from "@mui/icons-material/Replay";

interface RecordResultModalProps {
  open: boolean;
  onClose: () => void;
  exercise?: Exercise | null;
  test?: PerformanceTest | null;
  allExercises: Exercise[];
  onResultRecorded: () => void;
  initialDurationMinutes?: number;
}

const getScoreInputLabel = (resultType?: ExerciseResultType): string => {
  switch (resultType) {
    case "attempts":
      return "Benötigte Versuche / Darts";
    case "hits":
      return "Anzahl Treffer";
    case "highestScore":
      return "Höchstes Ergebnis / Highscore";
    case "points":
    default:
      return "Erreichte Punkte";
  }
};

export const RecordResultModal: React.FC<RecordResultModalProps> = ({
  open,
  onClose,
  exercise,
  test,
  allExercises,
  onResultRecorded,
  initialDurationMinutes,
}) => {
  const { userProfile } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [scores, setScores] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Timer States
  const [timerSeconds, setTimerSeconds] = useState<number>(180);
  const [initialTimerSeconds, setInitialTimerSeconds] = useState<number>(180);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [timerPaused, setTimerPaused] = useState<boolean>(false);
  
  const timerRef = useRef<number | null>(null);

useEffect(() => {
    if (open) {
      setScores({});
      setError(null);
      setTimerRunning(false);
      setTimerPaused(false);
      if (timerRef.current) clearInterval(timerRef.current);

      // Priorität: 1. Prop aus Plan, 2. Übungs-Property, 3. Fallback (15 Minuten)
      const defaultMinutes = 
        initialDurationMinutes ?? 
        (exercise as any)?.durationMinutes ?? 
        (exercise as any)?.duration ?? 
        15;
        
      const totalSecs = Number(defaultMinutes) * 60;

      setTimerSeconds(totalSecs);
      setInitialTimerSeconds(totalSecs);
    }
  }, [open, exercise, test, initialDurationMinutes]);

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = window.setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  const handleStartTimer = () => {
    if (timerSeconds > 0) {
      setTimerRunning(true);
      setTimerPaused(false);
    }
  };

  const handlePauseTimer = () => {
    setTimerRunning(false);
    setTimerPaused(true);
  };

  const handleStopTimer = () => {
    setTimerRunning(false);
    setTimerPaused(false);
    setTimerSeconds(initialTimerSeconds);
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleScoreChange = (key: string, value: string) => {
    const numericValue = parseInt(value, 10);
    setScores((prev) => ({
      ...prev,
      [key]: isNaN(numericValue) ? 0 : numericValue,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    setLoading(true);
    setError(null);

    try {
      const completedAt = new Date().toISOString();

      if (test) {
        let totalPoints = 0;
        const exerciseScores = test.exerciseIds.map((exId, index) => {
          const key = `${index}_${exId}`;
          const points = scores[key] || 0;
          totalPoints += points;
          return {
            exerciseId: exId,
            points,
          };
        });

        await addDoc(collection(db, "testResults"), {
          testId: test.id,
          userId: userProfile.uid,
          totalPoints,
          exerciseScores,
          completedAt,
        });

        await triggerAchievementCheck(userProfile.uid, "total_exercises_count");

        for (const exScore of exerciseScores) {
          if (exScore.exerciseId) {
            await triggerAchievementCheck(
              userProfile.uid,
              "specific_exercise_count",
              { exerciseId: exScore.exerciseId }
            );
            await triggerAchievementCheck(
              userProfile.uid,
              "exercise_highscore",
              { exerciseId: exScore.exerciseId, score: exScore.points }
            );
          }
        }
      } else if (exercise) {
        const points = scores[exercise.id] || 0;

        await addDoc(collection(db, "testResults"), {
          exerciseId: exercise.id,
          userId: userProfile.uid,
          totalPoints: points,
          exerciseScores: [
            {
              exerciseId: exercise.id,
              points,
            },
          ],
          completedAt,
        });

        await triggerAchievementCheck(userProfile.uid, "total_exercises_count");
        await triggerAchievementCheck(
          userProfile.uid,
          "specific_exercise_count",
          { exerciseId: exercise.id }
        );
        await triggerAchievementCheck(
          userProfile.uid,
          "exercise_highscore",
          { exerciseId: exercise.id, score: points }
        );
      }

      setScores({});
      onResultRecorded();
      onClose();
    } catch (err: any) {
      console.error("Fehler beim Speichern des Ergebnisses:", err);
      setError("Fehler beim Speichern des Ergebnisses.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      slotProps={{
        paper: {
          sx: {
            bgcolor: "background.paper",
            backgroundImage: "none",
          },
        },
      }}
    >
      <DialogTitle className="font-bold">
        {test
          ? `Ergebnis eintragen: ${test.title}`
          : exercise
          ? `Ergebnis eintragen: ${exercise.title}`
          : "Ergebnis eintragen"}
      </DialogTitle>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1">
        <DialogContent dividers className="flex flex-col gap-4">
          {error && <Alert severity="error">{error}</Alert>}

          {/* Fall 1: Einzelleistungstest */}
          {test && (
            <Box className="space-y-4">
              <Typography variant="body2" color="text.secondary">
                Trage bitte das Ergebnis für jede im Leistungstest enthaltene Übung ein:
              </Typography>

              <div className="flex flex-col gap-4">
                {test.exerciseIds.map((exId, index) => {
                  const ex = allExercises.find((e) => e.id === exId);
                  const key = `${index}_${exId}`;
                  const inputLabel = getScoreInputLabel(ex?.resultType);

                  return (
                    <Paper
                      key={key}
                      variant="outlined"
                      sx={{
                        p: 2,
                        bgcolor: "background.paper",
                        borderColor: "divider",
                      }}
                      className="flex flex-col gap-2"
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                        <div>
                          <Typography
                            variant="subtitle2"
                            className="font-bold"
                            color="text.primary"
                          >
                            {index + 1}. {ex ? ex.title : "Übung"}
                          </Typography>
                          {ex?.scoreDirection && (
                            <Typography variant="caption" color="text.secondary">
                              {ex.scoreDirection === "lower_is_better"
                                ? " (Niedrigerer Wert ist besser)"
                                : " (Höherer Wert ist besser)"}
                            </Typography>
                          )}
                        </div>

                        <TextField
                          label={inputLabel}
                          type="number"
                          size="small"
                          className="w-full sm:w-44"
                          required
                          slotProps={{
                            htmlInput: { min: 0 },
                          }}
                          value={scores[key] !== undefined ? scores[key] : ""}
                          onChange={(e) =>
                            handleScoreChange(key, e.target.value)
                          }
                        />
                      </div>

                      {ex?.instructions && (
                        <Accordion
                          elevation={0}
                          variant="outlined"
                          sx={{
                            bgcolor: "action.hover",
                            borderColor: "divider",
                            mt: 1,
                          }}
                        >
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography
                              variant="caption"
                              className="flex items-center gap-1 font-semibold"
                              color="text.primary"
                            >
                              <HelpIcon fontSize="small" color="primary" />{" "}
                              Spielanleitung anzeigen
                            </Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              className="whitespace-pre-line dark:text-gray-100"
                            >
                              {ex.instructions}
                            </Typography>
                          </AccordionDetails>
                        </Accordion>
                      )}
                    </Paper>
                  );
                })}
              </div>

              <Divider sx={{ borderColor: "divider" }} />

              <div className="flex justify-between items-center px-2">
                <Typography
                  variant="subtitle1"
                  className="font-bold"
                  color="text.primary"
                >
                  Gesamtergebnis:
                </Typography>
                <Typography
                  variant="h6"
                  className="font-bold"
                  color="primary.main"
                >
                  {test.exerciseIds.reduce(
                    (sum, exId, idx) => sum + (scores[`${idx}_${exId}`] || 0),
                    0
                  )}
                </Typography>
              </div>
            </Box>
          )}

          {/* Fall 2: Einzelübung */}
          {exercise && (
            <Box className="space-y-3">
              <Typography variant="body2" color="text.secondary">
                {exercise.description ||
                  "Trage dein Ergebnis für diese Übung ein."}
              </Typography>

              {exercise.scoreDirection && (
                <Chip
                  label={
                    exercise.scoreDirection === "lower_is_better"
                      ? "Niedrigerer Wert ist besser"
                      : "Höherer Wert ist besser"
                  }
                  size="small"
                  color="info"
                  variant="outlined"
                  className="mb-1"
                />
              )}

              {/* Timer Accordion */}
              <Accordion
                elevation={0}
                variant="outlined"
                sx={{
                  bgcolor: "action.hover",
                  borderColor: "divider",
                  mt: 1,
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography
                    variant="caption"
                    className="font-bold flex items-center gap-1"
                    color="text.primary"
                  >
                    <TimerIcon fontSize="small" color="primary" /> Übungs-Timer öffnen
                  </Typography>
                </AccordionSummary>
                <AccordionDetails className="flex flex-col gap-3">
                  <Box className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-background.paper p-3 rounded-lg border border-divider">
                    <Box className="flex items-center gap-2 w-full sm:w-auto">
                      <TextField
                        label="Minuten"
                        type="number"
                        size="small"
                        disabled={timerRunning}
                        value={Math.round((timerSeconds / 60) * 10) / 10}
                        onChange={(e) => {
                          const mins = Math.max(0, parseFloat(e.target.value) || 0);
                          const totalSecs = Math.round(mins * 60);
                          setTimerSeconds(totalSecs);
                          setInitialTimerSeconds(totalSecs);
                        }}
                        className="w-28"
                        slotProps={{ htmlInput: { min: 0.1, step: 0.5 } }}
                      />
                      <Typography variant="h5" className="font-mono font-bold tracking-wider px-2" color="primary.main">
                        {formatTime(timerSeconds)}
                      </Typography>
                    </Box>

                    <Box className="flex items-center gap-1 flex-wrap justify-end w-full sm:w-auto">
                      {!timerRunning ? (
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          startIcon={<PlayArrowIcon />}
                          onClick={handleStartTimer}
                          disabled={timerSeconds === 0}
                        >
                          {timerPaused ? "Fortsetzen" : "Start"}
                        </Button>
                      ) : (
                        <Button
                          variant="contained"
                          color="warning"
                          size="small"
                          startIcon={<PauseIcon />}
                          onClick={handlePauseTimer}
                        >
                          Pause
                        </Button>
                      )}

                      <Tooltip title="Zurücksetzen auf Startwert">
                        <span>
                          <IconButton
                            color="error"
                            size="small"
                            onClick={handleStopTimer}
                            disabled={!timerRunning && timerSeconds === initialTimerSeconds}
                          >
                            <ReplayIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>

              {exercise.instructions && (
                <Accordion
                  elevation={0}
                  variant="outlined"
                  sx={{
                    bgcolor: "action.hover",
                    borderColor: "divider",
                    mt: 1,
                    mb: 2,
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography
                      variant="caption"
                      className="font-bold flex items-center gap-1"
                      color="text.primary"
                    >
                      <HelpIcon fontSize="small" color="primary" />{" "}
                      Spielanleitung anzeigen
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      className="whitespace-pre-line text-xs sm:text-sm dark:text-gray-100"
                    >
                      {exercise.instructions}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              )}

              <TextField
                label={getScoreInputLabel(exercise.resultType)}
                type="number"
                variant="outlined"
                fullWidth
                required
                slotProps={{
                  htmlInput: { min: 0 },
                }}
                value={
                  scores[exercise.id] !== undefined ? scores[exercise.id] : ""
                }
                onChange={(e) => handleScoreChange(exercise.id, e.target.value)}
              />
            </Box>
          )}
        </DialogContent>

        <DialogActions className="p-4 mt-auto">
          <Button onClick={onClose} disabled={loading} color="inherit">
            Abbrechen
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? "Speichert..." : "Ergebnis Speichern"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
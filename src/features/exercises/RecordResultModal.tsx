import React, { useState, useEffect } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
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
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HelpIcon from "@mui/icons-material/Help";

interface RecordResultModalProps {
  open: boolean;
  onClose: () => void;
  exercise?: Exercise | null;
  test?: PerformanceTest | null;
  allExercises: Exercise[];
  onResultRecorded: () => void;
}

// Hilfsfunktion zur Ermittlung des passenden Eingabelabels
const getScoreInputLabel = (resultType?: ExerciseResultType): string => {
  switch (resultType) {
    case "attempts":
      return "Benötigte Versuche / Darts";
    case "hits":
      return "Anzahl Treffer";
    case "highestScore":
      return "Höchstes Ergebnis";
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
}) => {
  const { userProfile } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [scores, setScores] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State beim Öffnen/Schließen des Modals zurücksetzen
  useEffect(() => {
    if (open) {
      setScores({});
      setError(null);
    }
  }, [open, exercise, test]);

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
          exerciseType: test.exerciseType,
          totalPoints,
          exerciseScores,
          completedAt,
        });
      } else if (exercise) {
        const points = scores[exercise.id] || 0;

        await addDoc(collection(db, "testResults"), {
          exerciseId: exercise.id,
          userId: userProfile.uid,
          exerciseType: exercise.type,
          totalPoints: points,
          exerciseScores: [
            {
              exerciseId: exercise.id,
              points,
            },
          ],
          completedAt,
        });
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
import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { sendNotificationIfEnabled } from "../../services/notificationService";
import { getWeekAndYearFromDate } from "../../utils/calenderweek";
import type { TrainingPlan } from "../../types/trainingPlan";
import type {
  Exercise,
  PerformanceTest,
  TestResult,
} from "../../types/exercise";
import { RecordResultModal } from "../exercises/RecordResultModal";
import {
  Paper,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Divider,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EditIcon from "@mui/icons-material/Edit";
import CommentIcon from "@mui/icons-material/Comment";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

export const PlayerPlanView: React.FC = () => {
  const { userProfile } = useAuth();

  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [tests, setTests] = useState<PerformanceTest[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Status für Filter & Auswahl
  const [showCompleted, setShowCompleted] = useState<boolean>(true);
  const [activePlanId, setActivePlanId] = useState<string>("");

  // Status für Ergebniseingabe
  const [activePlan, setActivePlan] = useState<TrainingPlan | null>(null);
  const [selectedExerciseToRecord, setSelectedExerciseToRecord] = useState<{
    exercise: Exercise;
    blockId: string;
    exIndex: number;
  } | null>(null);

  const [selectedTestToRecord, setSelectedTestToRecord] =
    useState<PerformanceTest | null>(null);

  // Modals für Spieler-Feedback (Plan / Block / Übung)
  const [feedbackNote, setFeedbackNote] = useState("");
  const [editingFeedbackTarget, setEditingFeedbackTarget] = useState<{
    planId: string;
    blockId?: string;
    exIndex?: number;
  } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [plansSnap, exSnap, testSnap, resultsSnap] = await Promise.all([
        getDocs(collection(db, "assignedPlans")),
        getDocs(collection(db, "exercises")),
        getDocs(collection(db, "performanceTests")),
        getDocs(collection(db, "testResults")),
      ]);

      const fetchedPlans: TrainingPlan[] = [];
      plansSnap.forEach((d) => {
        const { id, ...data } = d.data();
        if (data.playerId === userProfile?.uid && !data.isTemplate) {
          fetchedPlans.push({ id: d.id, ...data } as TrainingPlan);
        }
      });

      const fetchedResults: TestResult[] = [];
      resultsSnap.forEach((d) => {
        const data = d.data();
        delete data.id;
        fetchedResults.push({ id: d.id, ...data } as TestResult);
      });

      // Nach Kalenderwoche / Jahr absteigend sortieren
      fetchedPlans.sort((a, b) => {
        const yearA = a.year ?? 0;
        const yearB = b.year ?? 0;
        const weekA = a.calendarWeek ?? 0;
        const weekB = b.calendarWeek ?? 0;

        return yearB !== yearA ? yearB - yearA : weekB - weekA;
      });

      const fetchedExercises: Exercise[] = [];
      exSnap.forEach((d) => {
        const { id, ...data } = d.data();
        fetchedExercises.push({ id: d.id, ...data } as Exercise);
      });

      const fetchedTests: PerformanceTest[] = [];
      testSnap.forEach((d) => {
        const { id, ...data } = d.data();
        fetchedTests.push({ id: d.id, ...data } as PerformanceTest);
      });

      setPlans(fetchedPlans);
      setExercises(fetchedExercises);
      setTests(fetchedTests);
      setTestResults(fetchedResults);

      // --- ERINNERUNG FÜR AKTUELLE WOCHE PRÜFEN ---
      if (userProfile?.uid && fetchedPlans.length > 0) {
        const { calendarWeek, year } = getWeekAndYearFromDate(
          new Date().toISOString(),
        );

        const currentWeekUnstartedPlan = fetchedPlans.find(
          (p) =>
            p.calendarWeek === calendarWeek &&
            p.year === year &&
            (p.status as string) === "assigned",
        );

        if (currentWeekUnstartedPlan) {
          await sendNotificationIfEnabled({
            userId: userProfile.uid,
            type: "trainingPlanReminder",
            title: "Erinnerung: Trainingsplan offen",
            message: `Dein Trainingsplan für KW ${calendarWeek} ("${currentWeekUnstartedPlan.title}") ist noch unberührt. Vergiss nicht zu trainieren!`,
            link: "/my-plans",
          });
        }
      }
    } catch (err) {
      console.error(err);
      setError("Fehler beim Laden deines Trainingsplans.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userProfile?.uid]);

  // Gefilterte Liste anhand des Switch-Status (Completed anzeigen / verbergen)
  const visiblePlans = plans.filter((p) => {
    if (!showCompleted && p.status === "completed") {
      return false;
    }
    return true;
  });

  // Synchronisieren des aktiven Plans bei Filteränderungen oder Datenupdates
  useEffect(() => {
    if (visiblePlans.length === 0) {
      setActivePlan(null);
      setActivePlanId("");
      return;
    }

    const currentActiveInVisible = visiblePlans.find(
      (p) => p.id === activePlanId,
    );
    if (currentActiveInVisible) {
      setActivePlan(currentActiveInVisible);
    } else {
      setActivePlan(visiblePlans[0]);
      setActivePlanId(visiblePlans[0]?.id ?? "");
    }
  }, [plans, showCompleted, activePlanId]);

  // Hilfsfunktion: 48-Stunden-Sperrregel prüfen
  const canEditResult = (completedAt?: string) => {
    if (!completedAt) return true;
    const completedDate = new Date(completedAt).getTime();
    const now = new Date().getTime();
    const hoursDiff = (now - completedDate) / (1000 * 60 * 60);
    return hoursDiff <= 48;
  };

  // Spieler-Notiz/Feedback in Firestore speichern
  const handleSavePlayerFeedback = async () => {
    if (!editingFeedbackTarget || !activePlan || !activePlan?.id) return;

    try {
      const updatedBlocks = [...activePlan.blocks];

      if (
        editingFeedbackTarget.blockId !== undefined &&
        editingFeedbackTarget.exIndex !== undefined
      ) {
        const blockIdx = updatedBlocks.findIndex(
          (b) => b.id === editingFeedbackTarget.blockId,
        );
        if (blockIdx !== -1) {
          updatedBlocks[blockIdx].exercises[
            editingFeedbackTarget.exIndex
          ].playerNote = feedbackNote.trim();
        }
      } else if (editingFeedbackTarget.blockId !== undefined) {
        const blockIdx = updatedBlocks.findIndex(
          (b) => b.id === editingFeedbackTarget.blockId,
        );
        if (blockIdx !== -1) {
          updatedBlocks[blockIdx].playerNote = feedbackNote.trim();
        }
      } else {
        activePlan.playerNote = feedbackNote.trim();
      }

      const planRef = doc(db, "assignedPlans", activePlan.id);
      await updateDoc(planRef, {
        blocks: updatedBlocks,
        playerNote: activePlan.playerNote || "",
        updatedAt: new Date().toISOString(),
      });

      setPlans((prev) =>
        prev.map((p) =>
          p.id === activePlan.id ? { ...activePlan, blocks: updatedBlocks } : p,
        ),
      );
      setEditingFeedbackTarget(null);
      setFeedbackNote("");
    } catch (err) {
      console.error(err);
      setError("Fehler beim Speichern deiner Anmerkung.");
    }
  };

  // Nach Ergebniserfassung einer Übung
  const handleResultSaved = async () => {
    if (!selectedExerciseToRecord || !activePlan || !activePlan?.id) return;

    await fetchData();
    setSelectedExerciseToRecord(null);
  };

  // Nach Ergebniserfassung des Leistungstests
  const handleTestResultSaved = async () => {
    if (!activePlan || !activePlan?.id) return;

    await fetchData();
    setSelectedTestToRecord(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <CircularProgress />
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center">
        <Typography
          variant="h5"
          className="font-bold mb-2"
          color="text.primary"
        >
          Keine Trainingspläne vorhanden
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Dein Trainer hat dir derzeit noch keinen Wochenplan zugewiesen.
        </Typography>
      </div>
    );
  }

  const totalExercises = activePlan
    ? activePlan.blocks.reduce((s, b) => s + b.exercises.length, 0)
    : 0;
  const completedExercises = activePlan
    ? activePlan.blocks.reduce(
        (s, b) => s + b.exercises.filter((e) => !!e.completedAt).length,
        0,
      )
    : 0;
  const totalBlocks = activePlan ? activePlan.blocks.length : 0;
  const completedBlocks = activePlan
    ? activePlan.blocks.filter(
        (b) =>
          b.exercises.every((e) => !!e.completedAt) && b.exercises.length > 0,
      ).length
    : 0;

  const exerciseProgressPercent =
    totalExercises > 0
      ? Math.round((completedExercises / totalExercises) * 100)
      : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <CalendarTodayIcon fontSize="large" color="primary" />
        <Typography
          variant="h4"
          component="h1"
          className="font-bold"
          color="text.primary"
        >
          Mein Trainingsplan
        </Typography>
      </div>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filterleiste: Select-Drop-down & Switch */}
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <FormControl size="small" sx={{ minWidth: 260 }}>
          <InputLabel id="select-plan-label">
            Trainingsplan auswählen
          </InputLabel>
          <Select
            labelId="select-plan-label"
            value={activePlanId}
            label="Trainingsplan auswählen"
            onChange={(e) => setActivePlanId(e.target.value)}
          >
            {visiblePlans.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                KW {p.calendarWeek} / {p.year} - {p.title}
                {p.status === "completed" ? " (Abgeschlossen)" : ""}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControlLabel
          control={
            <Switch
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              color="primary"
            />
          }
          label={
            <Typography variant="body2" className="font-medium">
              Abgeschlossene Pläne anzeigen
            </Typography>
          }
        />
      </Paper>

      {visiblePlans.length === 0 && (
        <Paper className="p-6 text-center">
          <Typography variant="body1" color="textSecondary">
            Keine aktiven Pläne vorhanden. Aktiviere den Schalter oben, um
            bereits abgeschlossene Pläne anzuzeigen.
          </Typography>
        </Paper>
      )}

      {activePlan && visiblePlans.length > 0 && (
        <Paper className="p-6 shadow-md flex flex-col gap-6">
          {/* Header des aktiven Plans */}
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <Typography
                variant="h5"
                className="font-bold"
                color="text.primary"
              >
                {activePlan.title} (KW {activePlan.calendarWeek} /{" "}
                {activePlan.year})
              </Typography>
              {activePlan.coachNote && (
                <Typography
                  variant="body2"
                  color="textSecondary"
                  className="italic mt-1"
                >
                  Trainer-Notiz: "{activePlan.coachNote}"
                </Typography>
              )}
            </div>

            <Chip
              label={
                activePlan.status === "completed"
                  ? "Plan Abgeschlossen"
                  : "In Bearbeitung"
              }
              color={activePlan.status === "completed" ? "success" : "warning"}
            />
          </div>

          {/* Fortschritts-Anzeige */}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              bgcolor: "action.hover",
              borderRadius: 2,
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            <div className="flex justify-between items-center text-sm font-bold">
              <Typography variant="body2" className="font-bold">
                Gesamtfortschritt Übungen ({completedExercises} von{" "}
                {totalExercises})
              </Typography>
              <Typography variant="body2" className="font-bold">
                {exerciseProgressPercent}%
              </Typography>
            </div>
            <LinearProgress
              variant="determinate"
              value={exerciseProgressPercent}
              className="h-2 rounded"
            />

            <div className="flex gap-4 mt-2 text-xs">
              <Typography variant="caption" color="textSecondary">
                <strong>Blöcke:</strong> {completedBlocks} von {totalBlocks}{" "}
                erledigt
              </Typography>
              {activePlan.performanceTestId && (
                <Typography variant="caption" color="textSecondary">
                  <strong>Leistungstest:</strong>{" "}
                  {activePlan.performanceTestCompletedAt
                    ? "✓ Erledigt"
                    : "Offen"}
                </Typography>
              )}
            </div>
          </Paper>

          {/* Trainer Abschluss-Feedback */}
          {activePlan.coachFeedback && (
            <Alert severity="info">
              <strong>Abschluss-Feedback deines Trainers:</strong>{" "}
              {activePlan.coachFeedback}
            </Alert>
          )}

          {/* Optionaler Leistungstest */}
          {activePlan.performanceTestId &&
            (() => {
              const testObj = tests.find(
                (t) => t.id === activePlan.performanceTestId,
              );
              const isTestDone = !!activePlan.performanceTestCompletedAt;
              const isTestEditable = canEditResult(
                activePlan.performanceTestCompletedAt,
              );

              return (
                <Card
                  variant="outlined"
                  sx={{
                    borderColor: "warning.main",
                    bgcolor: "action.hover",
                  }}
                >
                  <CardContent className="flex justify-between items-center flex-wrap gap-2">
                    <div>
                      <Typography
                        variant="subtitle1"
                        className="font-bold"
                        color="text.primary"
                      >
                        Pflicht-Leistungstest der Woche:{" "}
                        {testObj ? testObj.title : "Leistungstest"}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        className="block"
                      >
                        {isTestDone
                          ? `Absolviert am ${new Date(
                              activePlan.performanceTestCompletedAt!,
                            ).toLocaleDateString("de-DE")}`
                          : "Noch nicht absolviert"}
                      </Typography>
                    </div>

                    <Button
                      variant="contained"
                      color={isTestDone ? "secondary" : "primary"}
                      disabled={isTestDone && !isTestEditable}
                      onClick={() =>
                        testObj && setSelectedTestToRecord(testObj)
                      }
                      startIcon={isTestDone ? <EditIcon /> : <PlayArrowIcon />}
                    >
                      {isTestDone
                        ? isTestEditable
                          ? "Ergebnis bearbeiten (innerhalb 48h)"
                          : "Gesperrt (>48h)"
                        : "Test absolvieren"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })()}

          <Divider />

          {/* Trainingsblöcke Ansicht */}
          <Typography variant="h6" className="font-bold" color="text.primary">
            Trainingsblöcke
          </Typography>

          <div className="flex flex-col gap-4">
            {activePlan.blocks.map((block) => {
              const isBlockDone =
                block.exercises.length > 0 &&
                block.exercises.every((e) => !!e.completedAt);

              return (
                <Accordion key={block.id} defaultExpanded variant="outlined">
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <div className="flex justify-between items-center w-full pr-4">
                      <div className="flex items-center gap-2">
                        {isBlockDone && (
                          <CheckCircleIcon color="success" fontSize="small" />
                        )}
                        <Typography variant="subtitle1" className="font-bold">
                          {block.title}
                        </Typography>
                      </div>
                      <Typography variant="caption" color="textSecondary">
                        {block.exercises.filter((e) => !!e.completedAt).length}{" "}
                        / {block.exercises.length} Übungen erledigt
                      </Typography>
                    </div>
                  </AccordionSummary>

                  <AccordionDetails className="flex flex-col gap-3">
                    {block.coachNote && (
                      <Paper
                        variant="outlined"
                        sx={{ p: 1.5, bgcolor: "action.hover" }}
                      >
                        <Typography
                          variant="body2"
                          color="textSecondary"
                          className="italic"
                        >
                          Anmerkung Trainer: {block.coachNote}
                        </Typography>
                      </Paper>
                    )}

                    {/* Übungs-Liste des Blocks */}
                    {block.exercises.map((bEx, exIdx) => {
                      const exerciseObj = exercises.find(
                        (e) => e.id === bEx.exerciseId,
                      );
                      const isDone = !!bEx.completedAt;
                      const isEditable = canEditResult(bEx.completedAt);

                      // Punkte aus dem Ergebnis ermitteln
                      const achievedScore =
                        (bEx as any).score ??
                        (bEx as any).result ??
                        (bEx as any).points ??
                        (bEx as any).totalPoints;

                      // Formatiertes Erledigungsdatum
                      const formattedDate = bEx.completedAt
                        ? new Date(bEx.completedAt).toLocaleDateString(
                            "de-DE",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            },
                          )
                        : "";

                      return (
                        <Paper
                          key={`${bEx.exerciseId}-${exIdx}`}
                          variant="outlined"
                          sx={{
                            p: 2,
                            bgcolor: "background.paper", // Garantiert korrekte Farbe im Light- & Darkmode
                            borderColor: "divider",
                          }}
                          className="flex justify-between items-center flex-wrap gap-2"
                        >
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {isDone && (
                                <CheckCircleIcon
                                  color="success"
                                  fontSize="small"
                                />
                              )}
                              <Typography
                                variant="body1"
                                className="font-bold"
                                color="text.primary"
                              >
                                {exIdx + 1}.{" "}
                                {exerciseObj ? exerciseObj.title : "Übung"}
                              </Typography>

                              {/* ZEITVORGABE DES TRAINERS ANZEIGEN (falls gesetzt) */}
                              {bEx.durationMinutes &&
                                bEx.durationMinutes > 0 && (
                                  <Chip
                                    icon={<AccessTimeIcon fontSize="small" />}
                                    label={`Vorgabe: ${bEx.durationMinutes} Min.`}
                                    size="small"
                                    color="info"
                                    variant="outlined"
                                  />
                                )}
                            </div>

                            {/* ANZEIGE DER ERREICHTEN PUNKTZAHL UND/ODER DES DATUMS */}
                            {isDone && (
                              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                <Chip
                                  icon={<EmojiEventsIcon fontSize="small" />}
                                  label={
                                    achievedScore !== undefined &&
                                    achievedScore !== null
                                      ? `Ergebnis: ${achievedScore} Pkt. (${formattedDate})`
                                      : `Absolviert am ${formattedDate}`
                                  }
                                  size="small"
                                  color="success"
                                  variant="outlined"
                                  className="font-bold"
                                />
                              </div>
                            )}

                            {bEx.coachNote && (
                              <Typography
                                variant="caption"
                                color="textSecondary"
                                className="block italic mt-1"
                              >
                                Notiz Trainer: {bEx.coachNote}
                              </Typography>
                            )}

                            {bEx.playerNote && (
                              <Typography
                                variant="caption"
                                color="primary"
                                className="block font-medium mt-0.5"
                              >
                                Dein Feedback: {bEx.playerNote}
                              </Typography>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant={isDone ? "outlined" : "contained"}
                              color={isDone ? "secondary" : "primary"}
                              size="small"
                              disabled={isDone && !isEditable}
                              onClick={() =>
                                exerciseObj &&
                                setSelectedExerciseToRecord({
                                  exercise: exerciseObj,
                                  blockId: block.id,
                                  exIndex: exIdx,
                                })
                              }
                              startIcon={
                                isDone ? <EditIcon /> : <PlayArrowIcon />
                              }
                            >
                              {isDone
                                ? isEditable
                                  ? "Bearbeiten"
                                  : "Gesperrt (>48h)"
                                : "Eintragen"}
                            </Button>
                          </div>
                        </Paper>
                      );
                    })}
                    {/* Block Spieler-Feedback Button */}
                    <div className="mt-2 text-right">
                      <Button
                        size="small"
                        startIcon={<CommentIcon />}
                        onClick={() => {
                          if (!activePlan?.id) return;
                          setEditingFeedbackTarget({
                            planId: activePlan.id,
                            blockId: block.id,
                          });
                          setFeedbackNote(block.playerNote || "");
                        }}
                      >
                        {block.playerNote
                          ? "Block-Feedback bearbeiten"
                          : "Feedback zum Block hinzufügen"}
                      </Button>
                    </div>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </div>

          {/* Spieler Feedback für gesamten Plan */}
          <Divider className="my-2" />

          <Paper
            variant="outlined"
            sx={{
              p: 2,
              bgcolor: "action.hover",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <div>
              <Typography
                variant="subtitle2"
                className="font-bold"
                color="text.primary"
              >
                Dein Feedback zum gesamten Wochenplan:
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {activePlan.playerNote || "Noch kein Feedback hinterlassen."}
              </Typography>
            </div>

            <Button
              variant="outlined"
              size="small"
              startIcon={<CommentIcon />}
              onClick={() => {
                if (!activePlan?.id) return;
                setEditingFeedbackTarget({ planId: activePlan.id });
                setFeedbackNote(activePlan.playerNote || "");
              }}
            >
              {activePlan?.playerNote ? "Bearbeiten" : "Feedback hinterlassen"}
            </Button>
          </Paper>
        </Paper>
      )}

      {/* Modal zur Ergebniseingabe Einzelübung */}
      {selectedExerciseToRecord && (
        <RecordResultModal
          open={!!selectedExerciseToRecord}
          onClose={() => setSelectedExerciseToRecord(null)}
          exercise={selectedExerciseToRecord.exercise}
          allExercises={exercises}
          onResultRecorded={handleResultSaved}
        />
      )}

      {/* Modal zur Ergebniseingabe Leistungstest */}
      {selectedTestToRecord && (
        <RecordResultModal
          open={!!selectedTestToRecord}
          onClose={() => setSelectedTestToRecord(null)}
          test={selectedTestToRecord}
          allExercises={exercises}
          onResultRecorded={handleTestResultSaved}
        />
      )}

      {/* Feedback-Eingabedialog */}
      {editingFeedbackTarget && (
        <Dialog
          open={!!editingFeedbackTarget}
          onClose={() => setEditingFeedbackTarget(null)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle className="font-bold">
            Anmerkung / Feedback abgeben
          </DialogTitle>
          <DialogContent dividers>
            <TextField
              label="Deine Anmerkung"
              variant="outlined"
              multiline
              rows={3}
              fullWidth
              value={feedbackNote}
              onChange={(e) => setFeedbackNote(e.target.value)}
              placeholder="Schreibe deinem Trainer eine kurze Rückmeldung..."
            />
          </DialogContent>
          <DialogActions className="p-4">
            <Button onClick={() => setEditingFeedbackTarget(null)}>
              Abbrechen
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSavePlayerFeedback}
            >
              Speichern
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
};

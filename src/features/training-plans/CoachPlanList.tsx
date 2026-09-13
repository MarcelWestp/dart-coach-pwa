import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { getWeekAndYearFromDate } from "../../utils/calenderweek";
import type { UserProfile } from "../../types/user";
import type {
  TrainingPlan,
  TrainingBlock,
  BlockExercise,
} from "../../types/trainingPlan";
import type { Exercise, TestResult } from "../../types/exercise";
import type { PlayerGroup } from "../../types/group";
import { sendNotificationIfEnabled } from "../../services/notificationService";
import {
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  RadioGroup,
  Radio,
  FormControlLabel,
  FormLabel,
  TextField,
  IconButton,
  Tabs,
  Tab,
  Box,
  Chip,
  Divider,
  LinearProgress,
  Switch,
} from "@mui/material";
import AssignmentIcon from "@mui/icons-material/Assignment";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SendIcon from "@mui/icons-material/Send";
import PersonIcon from "@mui/icons-material/Person";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";

interface CoachPlanListProps {
  myRoster?: UserProfile[];
}

export const CoachPlanList: React.FC<CoachPlanListProps> = () => {
  const { userProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<number>(0); // 0 = Vorlagen, 1 = Zugewiesene Pläne
  const [selectedPlayerFilter, setSelectedPlayerFilter] =
    useState<string>("all");

  const [templates, setTemplates] = useState<TrainingPlan[]>([]);
  const [assignedPlans, setAssignedPlans] = useState<TrainingPlan[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [players, setPlayers] = useState<UserProfile[]>([]);
  const [groups, setGroups] = useState<PlayerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState<boolean>(true);

  // Zuweisungs-Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedPlanTemplate, setSelectedPlanTemplate] =
    useState<TrainingPlan | null>(null);
  const [assignmentType, setAssignmentType] = useState<"single" | "group">(
    "single",
  );
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Editor-Modal State (Plan/Vorlage Erstellen & Bearbeiten)
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(
    null,
  );
  const [planTitle, setPlanTitle] = useState("");
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [planCoachNote, setPlanCoachNote] = useState("");
  const [blocks, setBlocks] = useState<TrainingBlock[]>([]);

  // Modal für Fortschrittsansicht des Zugewiesenen Plans (Coach-Ansicht)
  const [selectedPlanForView, setSelectedPlanForView] =
    useState<TrainingPlan | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        templatesSnap,
        assignedSnap,
        exercisesSnap,
        usersSnap,
        groupsSnap,
        resultsSnap,
      ] = await Promise.all([
        getDocs(collection(db, "trainingPlans")),
        getDocs(collection(db, "assignedPlans")),
        getDocs(collection(db, "exercises")),
        getDocs(collection(db, "users")),
        getDocs(collection(db, "playerGroups")),
        getDocs(collection(db, "testResults")),
      ]);

      // Vorlagen laden
      const fetchedTemplates: TrainingPlan[] = [];
      templatesSnap.forEach((d) => {
        const data = d.data();
        delete data.id;
        if (data.isTemplate && data.coachId === userProfile?.uid) {
          fetchedTemplates.push({ id: d.id, ...data } as TrainingPlan);
        }
      });

      // Zugewiesene Pläne laden
      const fetchedAssigned: TrainingPlan[] = [];
      assignedSnap.forEach((d) => {
        const data = d.data();
        delete data.id;
        if (data.coachId === userProfile?.uid) {
          fetchedAssigned.push({ id: d.id, ...data } as TrainingPlan);
        }
      });

      // Sortierung nach Jahr & Kalenderwoche absteigend
      fetchedAssigned.sort((a, b) => {
        const yearA = a.year ?? 0;
        const yearB = b.year ?? 0;
        const weekA = a.calendarWeek ?? 0;
        const weekB = b.calendarWeek ?? 0;
        return yearB !== yearA ? yearB - yearA : weekB - weekA;
      });

      const fetchedExercises: Exercise[] = [];
      exercisesSnap.forEach((d) => {
        const data = d.data();
        delete data.id;
        fetchedExercises.push({ id: d.id, ...data } as Exercise);
      });

      const fetchedPlayers: UserProfile[] = [];
      usersSnap.forEach((d) => {
        const data = d.data();
        delete data.id;
        fetchedPlayers.push({ id: d.id, ...data } as unknown as UserProfile);
      });

      const fetchedGroups: PlayerGroup[] = [];
      groupsSnap.forEach((d) => {
        const data = d.data();
        delete data.id;
        fetchedGroups.push({ id: d.id, ...data } as PlayerGroup);
      });

      const fetchedResults: TestResult[] = [];
      resultsSnap.forEach((d) => {
        const data = d.data();
        delete data.id;
        fetchedResults.push({ id: d.id, ...data } as TestResult);
      });

      setTemplates(fetchedTemplates);
      setAssignedPlans(fetchedAssigned);
      setExercises(fetchedExercises);
      setPlayers(fetchedPlayers);
      setGroups(fetchedGroups);
      setTestResults(fetchedResults);
    } catch (err) {
      console.error(err);
      setError("Fehler beim Laden der Daten.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userProfile?.uid]);

  // --- EDITOR-HANDLING ---
  const handleOpenCreateModal = () => {
    setEditingTemplateId(null);
    setPlanTitle("");
    setStartDate(new Date().toISOString().split("T")[0]);
    setPlanCoachNote("");
    setBlocks([]);
    setIsEditorModalOpen(true);
  };

  const handleOpenEditModal = (template: TrainingPlan) => {
    setEditingTemplateId(template.id || null);
    setPlanTitle(template.title || template.templateName || "");
    const defaultDate = template.createdAt
      ? template.createdAt.split("T")[0]
      : new Date().toISOString().split("T")[0];
    setStartDate(defaultDate);
    setPlanCoachNote(template.coachNote || "");
    setBlocks(template.blocks || []);
    setIsEditorModalOpen(true);
  };

  // Block verwalten
  const handleAddBlock = () => {
    const newBlock: TrainingBlock = {
      id: Date.now().toString(),
      title: `Block #${blocks.length + 1}`,
      coachNote: "",
      exercises: [],
    };
    setBlocks([...blocks, newBlock]);
  };

  const handleUpdateBlockTitle = (blockIndex: number, title: string) => {
    const updated = [...blocks];
    updated[blockIndex].title = title;
    setBlocks(updated);
  };

  const handleUpdateBlockNote = (blockIndex: number, note: string) => {
    const updated = [...blocks];
    updated[blockIndex].coachNote = note;
    setBlocks(updated);
  };

  const handleRemoveBlock = (blockIndex: number) => {
    setBlocks(blocks.filter((_, i) => i !== blockIndex));
  };

  // Übungen im Block verwalten
  const handleAddExerciseToBlock = (blockIndex: number, exerciseId: string) => {
    if (!exerciseId) return;
    const updated = [...blocks];
    const newExercise: BlockExercise = {
      exerciseId,
      coachNote: "",
    };
    updated[blockIndex].exercises.push(newExercise);
    setBlocks(updated);
  };

  const handleUpdateExerciseNote = (
    blockIndex: number,
    exerciseIndex: number,
    coachNote: string,
  ) => {
    const updated = [...blocks];
    updated[blockIndex].exercises[exerciseIndex].coachNote = coachNote;
    setBlocks(updated);
  };

  const handleUpdateExerciseDuration = (
    blockIndex: number,
    exerciseIndex: number,
    durationMinutes: number,
  ) => {
    const updated = [...blocks];
    updated[blockIndex].exercises[exerciseIndex].durationMinutes =
      durationMinutes;
    setBlocks(updated);
  };

  const handleRemoveExerciseFromBlock = (
    blockIndex: number,
    exerciseIndex: number,
  ) => {
    const updated = [...blocks];
    updated[blockIndex].exercises = updated[blockIndex].exercises.filter(
      (_, i) => i !== exerciseIndex,
    );
    setBlocks(updated);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    setSubmitting(true);
    setError(null);

    const { year, calendarWeek } = getWeekAndYearFromDate(startDate);

    try {
      const templateData = {
        title: planTitle,
        templateName: planTitle,
        coachId: userProfile.uid,
        year,
        calendarWeek,
        coachNote: planCoachNote,
        blocks,
        isTemplate: true,
        updatedAt: new Date().toISOString(),
      };

      if (editingTemplateId) {
        await updateDoc(
          doc(db, "trainingPlans", editingTemplateId),
          templateData,
        );
      } else {
        await addDoc(collection(db, "trainingPlans"), {
          ...templateData,
          createdAt: new Date(startDate).toISOString(),
        });
      }

      setIsEditorModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setError("Fehler beim Speichern der Trainingsplan-Vorlage.");
    } finally {
      setSubmitting(false);
    }
  };

  // LÖSCHEN EINER VORLAGE
  const handleDeleteTemplate = async (id?: string) => {
    if (!id) return;
    if (
      !window.confirm(
        "Möchtest du diese Trainingsplan-Vorlage wirklich löschen?",
      )
    )
      return;

    try {
      await deleteDoc(doc(db, "trainingPlans", id));
      fetchData();
    } catch (err) {
      console.error(err);
      setError("Fehler beim Löschen der Vorlage.");
    }
  };

  // LÖSCHEN EINES ZUGEWIESENEN PLANS
  const handleDeleteAssignedPlan = async (id?: string, title?: string) => {
    if (!id) return;
    if (
      !window.confirm(
        `Möchtest du den zugewiesenen Plan "${title || "Trainingsplan"}" für diesen Spieler wirklich löschen?`,
      )
    )
      return;

    try {
      await deleteDoc(doc(db, "assignedPlans", id));
      fetchData();
    } catch (err) {
      console.error(err);
      setError("Fehler beim Löschen des zugewiesenen Trainingsplans.");
    }
  };

  // --- ZUWEISUNGS-HANDLING ---
  const handleOpenAssignModal = (template: TrainingPlan) => {
    setSelectedPlanTemplate(template);
    setAssignmentType("single");
    setSelectedPlayerId("");
    setSelectedGroupId("");
    setIsAssignModalOpen(true);
  };

  const handleAssignPlan = async () => {
    if (!selectedPlanTemplate || !userProfile) return;

    setSubmitting(true);
    setError(null);

    try {
      let targetUserIds: string[] = [];

      if (assignmentType === "single") {
        if (!selectedPlayerId) return;
        targetUserIds = [selectedPlayerId];
      } else {
        const group = groups.find((g) => g.id === selectedGroupId);
        if (!group || group.memberIds.length === 0) return;
        targetUserIds = group.memberIds;
      }

      const assignPromises = targetUserIds.map(async (userId) => {
        await addDoc(collection(db, "assignedPlans"), {
          title: selectedPlanTemplate.title,
          coachId: userProfile.uid,
          playerId: userId,
          year: selectedPlanTemplate.year || new Date().getFullYear(),
          calendarWeek: selectedPlanTemplate.calendarWeek || 1,
          coachNote: selectedPlanTemplate.coachNote || "",
          blocks: selectedPlanTemplate.blocks || [],
          performanceTestId: selectedPlanTemplate.performanceTestId || null,
          status: "assigned",
          isTemplate: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        // Benachrichtigung senden
        await sendNotificationIfEnabled({
          userId,
          type: "newOrUpdatedTrainingPlans",
          title: "Neuer Trainingsplan zugewiesen",
          message: `Dein Trainer hat dir den Trainingsplan "${selectedPlanTemplate.title}" für KW ${selectedPlanTemplate.calendarWeek} zugewiesen.`,
          link: "/my-plans",
        });
      });

      await Promise.all(assignPromises);

      setIsAssignModalOpen(false);
      setSelectedPlayerId("");
      setSelectedGroupId("");
      fetchData();
    } catch (err) {
      console.error(err);
      setError("Fehler beim Zuweisen des Trainingsplans.");
    } finally {
      setSubmitting(false);
    }
  };

  const getPlayerName = (uid?: string) => {
    if (!uid) return "Unbekannter Spieler";
    const p = players.find((user) => user.uid === uid);
    return p ? p.nickname || p.realName || p.email : "Unbekannter Spieler";
  };

  // Hilfsfunktion zur Berechnung des Übungsfortschritts
  const calculatePlanProgress = (plan: TrainingPlan) => {
    let totalExercises = 0;
    let completedExercises = 0;

    plan.blocks?.forEach((b) => {
      b.exercises?.forEach((ex) => {
        totalExercises++;
        if (ex.completedAt) {
          completedExercises++;
        }
      });
    });

    const percent =
      totalExercises > 0
        ? Math.round((completedExercises / totalExercises) * 100)
        : 0;
    return { completedExercises, totalExercises, percent };
  };

  // Gefilterte Liste zugewiesener Pläne
  const filteredAssignedPlans = assignedPlans.filter((plan) => {
    if (
      selectedPlayerFilter !== "all" &&
      plan.playerId !== selectedPlayerFilter
    ) {
      return false;
    }
    if (!showCompleted && plan.status === "completed") {
      return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <Typography
            variant="h4"
            component="h1"
            className="font-bold flex items-center gap-2"
            color="text.primary"
          >
            <AssignmentIcon fontSize="large" color="primary" /> Trainingspläne &
            Vorlagen
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Erstelle Vorlagen und verwalte die zugewiesenen Pläne deiner
            Spieler.
          </Typography>
        </div>

        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenCreateModal}
        >
          Neue Vorlage erstellen
        </Button>
      </div>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Tabs zur Verwaltung */}
      <Paper variant="outlined">
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label={`Vorlagen (${templates.length})`} />
          <Tab label={`Zugewiesene Pläne (${assignedPlans.length})`} />
        </Tabs>
      </Paper>

      {/* TAB 0: VORLAGEN */}
      {activeTab === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.length === 0 ? (
            <Typography
              variant="body2"
              color="textSecondary"
              className="py-4 col-span-2 text-center italic"
            >
              Keine Vorlagen vorhanden. Erstelle eine neue Vorlage.
            </Typography>
          ) : (
            templates.map((template) => (
              <Card
                key={template.id}
                variant="outlined"
                className="flex flex-col justify-between shadow-sm"
              >
                <CardContent>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <Typography
                        variant="h6"
                        className="font-bold"
                        color="text.primary"
                      >
                        {template.title}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        KW {template.calendarWeek} / {template.year}
                      </Typography>
                    </div>

                    <div className="flex gap-1">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleOpenEditModal(template)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </div>
                  </div>

                  {template.coachNote && (
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      className="mb-2 italic"
                    >
                      "{template.coachNote}"
                    </Typography>
                  )}

                  <div className="flex flex-col gap-2 my-3">
                    {template.blocks && template.blocks.length > 0 ? (
                      template.blocks.map((block, idx) => (
                        <Paper
                          key={block.id || idx}
                          variant="outlined"
                          sx={{
                            borderRadius: 3,
                            px: 2,
                            py: 1.2,
                            bgcolor: "action.hover",
                            borderColor: "divider",
                          }}
                        >
                          <Typography
                            variant="body2"
                            className="font-medium"
                            color="text.primary"
                          >
                            {block.title} ({block.exercises?.length || 0}{" "}
                            {block.exercises?.length === 1
                              ? "Übung"
                              : "Übungen"}
                            )
                          </Typography>
                        </Paper>
                      ))
                    ) : (
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        className="italic"
                      >
                        Keine Blöcke in dieser Vorlage enthalten.
                      </Typography>
                    )}
                  </div>
                </CardContent>

                <Box className="p-4 pt-0">
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    startIcon={<SendIcon />}
                    onClick={() => handleOpenAssignModal(template)}
                  >
                    Plan Zuweisen
                  </Button>
                </Box>
              </Card>
            ))
          )}
        </div>
      )}

      {/* TAB 1: ZUGEWIESENE PLÄNE */}
      {activeTab === 1 && (
        <div className="flex flex-col gap-4">
          {/* Filter-Zeile: Spieler-Filter + Abgeschlossen-Switch */}
          <div className="flex justify-between items-center flex-wrap gap-4 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4 flex-wrap">
              <FormControl size="small" className="min-w-[220px]">
                <InputLabel>Nach Spieler filtern</InputLabel>
                <Select
                  value={selectedPlayerFilter}
                  label="Nach Spieler filtern"
                  onChange={(e) => setSelectedPlayerFilter(e.target.value)}
                >
                  <MenuItem value="all">
                    Alle Spieler ({assignedPlans.length} Pläne)
                  </MenuItem>
                  {players.map((p) => {
                    const count = assignedPlans.filter(
                      (ap) => ap.playerId === p.uid,
                    ).length;
                    return (
                      <MenuItem key={p.uid} value={p.uid}>
                        {p.nickname || p.realName} ({count})
                      </MenuItem>
                    );
                  })}
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
            </div>

            <Typography variant="caption" color="textSecondary">
              Zeige {filteredAssignedPlans.length} von {assignedPlans.length}{" "}
              zugewiesenen Plänen
            </Typography>
          </div>

          {/* Karten-Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAssignedPlans.length === 0 ? (
              <Typography
                variant="body2"
                color="textSecondary"
                className="py-4 col-span-2 text-center italic"
              >
                Bisher wurden für diese Filterkombination keine Trainingspläne
                gefunden.
              </Typography>
            ) : (
              filteredAssignedPlans.map((plan) => {
                const { completedExercises, totalExercises, percent } =
                  calculatePlanProgress(plan);

                return (
                  <Card
                    key={plan.id}
                    variant="outlined"
                    className="flex flex-col justify-between shadow-sm"
                  >
                    <CardContent>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <Typography variant="h6" className="font-bold">
                            {plan.title}
                          </Typography>
                          <Typography
                            variant="subtitle2"
                            color="primary"
                            className="font-bold flex items-center gap-1"
                          >
                            <PersonIcon fontSize="small" />{" "}
                            {getPlayerName(plan.playerId)}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Zugewiesen für KW {plan.calendarWeek} / {plan.year}
                          </Typography>
                        </div>

                        <IconButton
                          size="small"
                          color="error"
                          onClick={() =>
                            handleDeleteAssignedPlan(plan.id, plan.title)
                          }
                          title="Zugewiesenen Plan löschen"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </div>

                      <div className="flex justify-between items-center my-2">
                        <Chip
                          label={
                            plan.status === "completed"
                              ? "Abgeschlossen"
                              : plan.status === "in_progress"
                                ? "In Bearbeitung"
                                : "Zugewiesen"
                          }
                          color={
                            plan.status === "completed"
                              ? "success"
                              : plan.status === "in_progress"
                                ? "warning"
                                : "default"
                          }
                          size="small"
                        />
                        <Typography variant="caption" className="font-semibold">
                          {completedExercises} / {totalExercises} Übungen
                        </Typography>
                      </div>

                      <LinearProgress
                        variant="determinate"
                        value={percent}
                        className="rounded mb-3"
                      />

                      {plan.coachNote && (
                        <Typography
                          variant="body2"
                          color="textSecondary"
                          className="mt-2 italic"
                        >
                          Hinweis: {plan.coachNote}
                        </Typography>
                      )}
                    </CardContent>

                    <CardActions className="p-4 pt-0">
                      <Button
                        variant="outlined"
                        color="primary"
                        fullWidth
                        startIcon={<VisibilityIcon />}
                        onClick={() => setSelectedPlanForView(plan)}
                      >
                        Fortschritt ansehen
                      </Button>
                    </CardActions>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL: Fortschritt & Auswertung des zugewiesenen Plans ansehen */}
      <Dialog
        open={Boolean(selectedPlanForView)}
        onClose={() => setSelectedPlanForView(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedPlanForView &&
          (() => {
            const { completedExercises, totalExercises, percent } =
              calculatePlanProgress(selectedPlanForView);

            return (
              <>
                <DialogTitle className="font-bold flex justify-between items-center">
                  <span>Plan-Fortschritt: {selectedPlanForView.title}</span>
                  <Chip
                    label={
                      selectedPlanForView.status === "completed"
                        ? "Abgeschlossen"
                        : selectedPlanForView.status === "in_progress"
                          ? "In Bearbeitung"
                          : "Zugewiesen"
                    }
                    color={
                      selectedPlanForView.status === "completed"
                        ? "success"
                        : selectedPlanForView.status === "in_progress"
                          ? "warning"
                          : "default"
                    }
                    size="small"
                  />
                </DialogTitle>

                <DialogContent dividers className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <Typography variant="subtitle2">
                      <strong>Spieler:</strong>{" "}
                      {getPlayerName(selectedPlanForView.playerId)}
                    </Typography>
                    <Typography variant="subtitle2">
                      <strong>Zeitraum:</strong> KW{" "}
                      {selectedPlanForView.calendarWeek} /{" "}
                      {selectedPlanForView.year}
                    </Typography>
                  </div>

                  {selectedPlanForView.coachNote && (
                    <Typography
                      variant="body2"
                      sx={{
                        bgcolor: "action.hover", // Passt sich im Darkmode automatisch dunkel an
                        p: 1.5,
                        borderRadius: 1,
                        fontStyle: "italic",
                        border: 1,
                        borderColor: "divider",
                      }}
                    >
                      Trainer-Hinweis: "{selectedPlanForView.coachNote}"
                    </Typography>
                  )}

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <Typography variant="caption" className="font-bold">
                        Gesamtfortschritt ({completedExercises} von{" "}
                        {totalExercises} Übungen absolviert)
                      </Typography>
                      <Typography variant="caption" className="font-bold">
                        {percent}%
                      </Typography>
                    </div>
                    <LinearProgress
                      variant="determinate"
                      value={percent}
                      className="h-2 rounded"
                    />
                  </div>

                  {selectedPlanForView.playerNote && (
                    <Paper
                      variant="outlined"
                      className="p-3 bg-blue-50 dark:bg-blue-900/20 border-blue-200"
                    >
                      <Typography
                        variant="subtitle2"
                        className="font-bold text-blue-800 dark:text-blue-300"
                      >
                        Gesamtrückmeldung des Spielers:
                      </Typography>
                      <Typography variant="body2" className="italic mt-1">
                        "{selectedPlanForView.playerNote}"
                      </Typography>
                    </Paper>
                  )}

                  <Divider />

                  <Typography variant="h6" className="font-bold">
                    Trainingsblöcke & Übungsergebnisse
                  </Typography>

                  <div className="flex flex-col gap-4">
                    {selectedPlanForView.blocks?.map((block, bIdx) => (
                      <Paper
                        key={block.id || bIdx}
                        variant="outlined"
                        className="p-4 flex flex-col gap-3 bg-gray-50/50 dark:bg-gray-800/40"
                      >
                        <div>
                          <Typography
                            variant="subtitle1"
                            className="font-bold color-primary"
                          >
                            {block.title}
                          </Typography>
                          {block.coachNote && (
                            <Typography
                              variant="caption"
                              color="textSecondary"
                              className="italic block"
                            >
                              Block-Notiz: {block.coachNote}
                            </Typography>
                          )}
                          {block.playerNote && (
                            <Typography
                              variant="caption"
                              className="italic block text-blue-600 dark:text-blue-400 mt-1"
                            >
                              Spieler-Feedback zum Block: "{block.playerNote}"
                            </Typography>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          {block.exercises?.map((exItem, exIdx) => {
                            const exObj = exercises.find(
                              (e) => e.id === exItem.exerciseId,
                            );
                            const isDone = Boolean(exItem.completedAt);

                            // Matching des Testergebnisses aus der testResults-Collection
                            const matchingResult = testResults.find((r) => {
                              if (
                                exItem.scoreResultId &&
                                r.id === exItem.scoreResultId
                              )
                                return true;
                              return (
                                r.userId === selectedPlanForView.playerId &&
                                (r.exerciseId === exItem.exerciseId ||
                                  r.testId === exItem.exerciseId)
                              );
                            });

                            return (
                              <Paper
                                key={exIdx}
                                variant="outlined"
                                sx={{
                                  p: 2,
                                  bgcolor: "background.paper", // Passt sich dynamisch an Light & Darkmode an
                                  borderColor: "divider",
                                }}
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <div className="flex items-center gap-2">
                                    <FitnessCenterIcon
                                      fontSize="small"
                                      color="primary"
                                    />
                                    <Typography
                                      variant="subtitle2"
                                      className="font-bold"
                                    >
                                      {exIdx + 1}.{" "}
                                      {exObj ? exObj.title : "Übung"}
                                    </Typography>
                                  </div>
                                  {isDone ? (
                                    <Chip
                                      icon={
                                        <CheckCircleIcon fontSize="small" />
                                      }
                                      label="Absolviert"
                                      color="success"
                                      size="small"
                                    />
                                  ) : (
                                    <Chip
                                      label="Offen"
                                      variant="outlined"
                                      size="small"
                                    />
                                  )}
                                </div>

                                {/* Trainer-Hinweis an den Spieler */}
                                {exItem.coachNote && (
                                  <Typography
                                    variant="caption"
                                    color="textSecondary"
                                    className="block mt-1"
                                  >
                                    Hinweis: {exItem.coachNote}
                                  </Typography>
                                )}

                                {/* Status & Ergebnisse nach Ausführung */}
                                {isDone ? (
                                  <Box
                                    sx={{
                                      mt: 2,
                                      p: 1.5,
                                      borderRadius: 1,
                                      bgcolor: "action.hover", // Subtiler Theme-Hintergrund statt hartem Grün/Weiß
                                      border: 1,
                                      borderColor: "success.main",
                                    }}
                                    className="flex flex-col gap-1 text-sm"
                                  >
                                    {/* Erzielte Punkte anzeigen */}
                                    {matchingResult ? (
                                      <Typography
                                        variant="body2"
                                        className="font-bold"
                                        color="success.main"
                                      >
                                        Erzielte Punkte:{" "}
                                        {matchingResult.totalPoints} Pkt.
                                      </Typography>
                                    ) : (
                                      <Typography
                                        variant="caption"
                                        color="textSecondary"
                                        className="italic"
                                      >
                                        Punkte-Ergebnis konnte nicht geladen
                                        werden.
                                      </Typography>
                                    )}

                                    {/* Score Details anzeigen falls vorhanden */}
                                    {matchingResult?.exerciseScores &&
                                      matchingResult.exerciseScores.length >
                                        0 && (
                                        <div className="flex flex-wrap gap-1 my-1">
                                          {matchingResult.exerciseScores.map(
                                            (score, sIdx) => (
                                              <Chip
                                                key={sIdx}
                                                label={`Runde ${sIdx + 1}: ${score.points} Pkt.`}
                                                size="small"
                                                variant="outlined"
                                                sx={{
                                                  bgcolor: "background.paper",
                                                }}
                                              />
                                            ),
                                          )}
                                        </div>
                                      )}

                                    {exItem.completedAt && (
                                      <Typography
                                        variant="caption"
                                        color="textSecondary"
                                        className="block"
                                      >
                                        Absolviert am:{" "}
                                        {new Date(
                                          exItem.completedAt,
                                        ).toLocaleString("de-DE")}
                                      </Typography>
                                    )}

                                    {/* Spieler-Feedback direkt aus BlockExercise.playerNote */}
                                    {exItem.playerNote ? (
                                      <Typography
                                        variant="caption"
                                        className="italic block mt-1"
                                        color="text.primary"
                                      >
                                        Spieler-Kommentar: "{exItem.playerNote}"
                                      </Typography>
                                    ) : (
                                      <Typography
                                        variant="caption"
                                        color="textSecondary"
                                        className="italic block mt-1"
                                      >
                                        Kein Kommentar vom Spieler hinterlassen.
                                      </Typography>
                                    )}
                                  </Box>
                                ) : (
                                  <Typography
                                    variant="caption"
                                    color="textSecondary"
                                    className="italic block mt-1"
                                  >
                                    Noch kein Ergebnis von diesem Spieler
                                    eingetragen.
                                  </Typography>
                                )}
                              </Paper>
                            );
                          })}
                        </div>
                      </Paper>
                    ))}
                  </div>
                </DialogContent>

                <DialogActions className="p-4">
                  <Button
                    onClick={() => setSelectedPlanForView(null)}
                    variant="contained"
                  >
                    Schließen
                  </Button>
                </DialogActions>
              </>
            );
          })()}
      </Dialog>

      {/* Modal: Plan / Vorlage Erstellen & Bearbeiten */}
      <Dialog
        open={isEditorModalOpen}
        onClose={() => setIsEditorModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <form onSubmit={handleSaveTemplate}>
          <DialogTitle className="font-bold">
            {editingTemplateId
              ? "Vorlage Bearbeiten"
              : "Neue Vorlage Erstellen"}
          </DialogTitle>
          <DialogContent dividers className="flex flex-col gap-4">
            <TextField
              label="Titel des Plans"
              variant="outlined"
              fullWidth
              required
              value={planTitle}
              onChange={(e) => setPlanTitle(e.target.value)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                label="Startdatum des Plans"
                type="date"
                fullWidth
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                slotProps={{
                  inputLabel: { shrink: true },
                }}
              />

              <Paper
                variant="outlined"
                className="p-2 flex items-center justify-between px-4"
              >
                <Typography
                  variant="caption"
                  color="textSecondary"
                  className="font-bold"
                >
                  Berechnete KW:
                </Typography>
                <Typography
                  variant="body2"
                  className="font-bold"
                  color="primary"
                >
                  KW {getWeekAndYearFromDate(startDate).calendarWeek} /{" "}
                  {getWeekAndYearFromDate(startDate).year}
                </Typography>
              </Paper>
            </div>

            <TextField
              label="Trainer-Notiz / Anweisung"
              variant="outlined"
              multiline
              rows={2}
              fullWidth
              value={planCoachNote}
              onChange={(e) => setPlanCoachNote(e.target.value)}
            />

            <Divider className="my-2" />

            {/* Blöcke Verwalten */}
            <div className="flex justify-between items-center">
              <Typography variant="h6" className="font-bold">
                Trainingsblöcke ({blocks.length})
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={handleAddBlock}
              >
                Block Hinzufügen
              </Button>
            </div>

            {blocks.map((block, bIdx) => (
              <Paper
                key={block.id || bIdx}
                variant="outlined"
                className="p-4 flex flex-col gap-3 bg-gray-50 dark:bg-gray-800"
              >
                <div className="flex justify-between items-center gap-2">
                  <TextField
                    label="Block Name"
                    size="small"
                    variant="outlined"
                    fullWidth
                    value={block.title}
                    onChange={(e) =>
                      handleUpdateBlockTitle(bIdx, e.target.value)
                    }
                  />
                  <IconButton
                    color="error"
                    onClick={() => handleRemoveBlock(bIdx)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </div>

                <TextField
                  label="Notiz für diesen Block"
                  size="small"
                  variant="outlined"
                  fullWidth
                  value={block.coachNote || ""}
                  onChange={(e) => handleUpdateBlockNote(bIdx, e.target.value)}
                />

                {/* Übungen im Block */}
                <Typography variant="subtitle2" className="font-bold mt-2">
                  Übungen im Block:
                </Typography>

                {/* Blöcke Verwalten */}
                <div className="flex justify-between items-center">
                  <Typography
                    variant="h6"
                    className="font-bold"
                    color="text.primary"
                  >
                    Trainingsblöcke ({blocks.length})
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={handleAddBlock}
                  >
                    Block Hinzufügen
                  </Button>
                </div>

                {blocks.map((block, bIdx) => (
                  <Paper
                    key={block.id || bIdx}
                    variant="outlined"
                    sx={{
                      p: 2,
                      my: 1,
                      bgcolor: "action.hover", // Nutzt Theme-Hintergrund (dunkel im Darkmode)
                      borderColor: "divider",
                    }}
                    className="flex flex-col gap-3"
                  >
                    <div className="flex justify-between items-center gap-2">
                      <TextField
                        label="Block Name"
                        size="small"
                        variant="outlined"
                        fullWidth
                        value={block.title}
                        onChange={(e) =>
                          handleUpdateBlockTitle(bIdx, e.target.value)
                        }
                      />
                      <IconButton
                        color="error"
                        onClick={() => handleRemoveBlock(bIdx)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </div>

                    <TextField
                      label="Notiz für diesen Block"
                      size="small"
                      variant="outlined"
                      fullWidth
                      value={block.coachNote || ""}
                      onChange={(e) =>
                        handleUpdateBlockNote(bIdx, e.target.value)
                      }
                    />

                    {/* Übungen im Block */}
                    <Typography
                      variant="subtitle2"
                      className="font-bold mt-2"
                      color="text.primary"
                    >
                      Übungen im Block:
                    </Typography>

                    {block.exercises.map((ex, exIdx) => {
                      const exObj = exercises.find(
                        (e) => e.id === ex.exerciseId,
                      );
                      return (
                        <Paper
                          key={exIdx}
                          variant="outlined"
                          sx={{
                            p: 2,
                            bgcolor: "background.paper", // Garantiert dunklen/hellen Kartentext-Kontrast
                            borderColor: "divider",
                          }}
                          className="flex flex-col gap-2"
                        >
                          <div className="flex justify-between items-center">
                            <Typography
                              variant="body2"
                              className="font-bold"
                              color="text.primary"
                            >
                              {exIdx + 1}.{" "}
                              {exObj ? exObj.title : "Unbekannte Übung"}
                            </Typography>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() =>
                                handleRemoveExerciseFromBlock(bIdx, exIdx)
                              }
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </div>

                          {/* EINGABE ZEITVORGABE & TRAINERNOTE */}
                          <div className="flex gap-2 items-center mt-2">
                            <TextField
                              label="Zeitvorgabe (Min.)"
                              type="number"
                              size="small"
                              style={{ width: "140px" }}
                              value={ex.durationMinutes || ""}
                              onChange={(e) =>
                                handleUpdateExerciseDuration(
                                  bIdx,
                                  exIdx,
                                  parseInt(e.target.value, 10) || 0,
                                )
                              }
                              slotProps={{
                                htmlInput: { min: 0 },
                              }}
                            />
                            <TextField
                              label="Übungs-Hinweis für den Spieler"
                              size="small"
                              variant="outlined"
                              fullWidth
                              value={ex.coachNote || ""}
                              onChange={(e) =>
                                handleUpdateExerciseNote(
                                  bIdx,
                                  exIdx,
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                        </Paper>
                      );
                    })}

                    <FormControl size="small" fullWidth className="mt-2">
                      <InputLabel>Übung zu Block hinzufügen</InputLabel>
                      <Select
                        value=""
                        label="Übung zu Block hinzufügen"
                        onChange={(e) =>
                          handleAddExerciseToBlock(bIdx, e.target.value)
                        }
                      >
                        {exercises.map((e) => (
                          <MenuItem key={e.id} value={e.id}>
                            {e.title} ({e.type})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Paper>
                ))}
                <FormControl size="small" fullWidth className="mt-2">
                  <InputLabel>Übung zu Block hinzufügen</InputLabel>
                  <Select
                    value=""
                    label="Übung zu Block hinzufügen"
                    onChange={(e) =>
                      handleAddExerciseToBlock(bIdx, e.target.value)
                    }
                  >
                    {exercises.map((e) => (
                      <MenuItem key={e.id} value={e.id}>
                        {e.title} ({e.type})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Paper>
            ))}
          </DialogContent>
          <DialogActions className="p-4">
            <Button onClick={() => setIsEditorModalOpen(false)}>
              Abbrechen
            </Button>
            <Button
              variant="contained"
              color="primary"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Speichert..." : "Vorlage Speichern"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Modal: Plan zuweisen */}
      <Dialog
        open={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle className="font-bold">Trainingsplan Zuweisen</DialogTitle>
        <DialogContent dividers className="flex flex-col gap-4">
          <FormControl component="fieldset">
            <FormLabel component="legend">Zuweisen an:</FormLabel>
            <RadioGroup
              row
              value={assignmentType}
              onChange={(e) =>
                setAssignmentType(e.target.value as "single" | "group")
              }
            >
              <FormControlLabel
                value="single"
                control={<Radio />}
                label="Einzelnen Spieler"
              />
              <FormControlLabel
                value="group"
                control={<Radio />}
                label="Ganze Gruppe"
              />
            </RadioGroup>
          </FormControl>

          {assignmentType === "single" ? (
            <FormControl fullWidth required>
              <InputLabel>Spieler Auswählen</InputLabel>
              <Select
                value={selectedPlayerId}
                label="Spieler Auswählen"
                onChange={(e) => setSelectedPlayerId(e.target.value)}
              >
                {players.map((p) => (
                  <MenuItem key={p.uid} value={p.uid}>
                    {p.nickname || p.realName} ({p.email})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <FormControl fullWidth required>
              <InputLabel>Gruppe Auswählen</InputLabel>
              <Select
                value={selectedGroupId}
                label="Gruppe Auswählen"
                onChange={(e) => setSelectedGroupId(e.target.value)}
              >
                {groups.map((g) => (
                  <MenuItem key={g.id} value={g.id}>
                    {g.name} ({g.memberIds.length} Spieler)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions className="p-4">
          <Button onClick={() => setIsAssignModalOpen(false)}>Abbrechen</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleAssignPlan}
            disabled={
              submitting ||
              (assignmentType === "single" && !selectedPlayerId) ||
              (assignmentType === "group" && !selectedGroupId)
            }
          >
            {submitting ? "Weist zu..." : "Plan Zuweisen"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

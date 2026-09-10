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
import type { Exercise } from "../../types/exercise";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Switch,
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
} from "@mui/material";
import AssignmentIcon from "@mui/icons-material/Assignment";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SendIcon from "@mui/icons-material/Send";
import PersonIcon from "@mui/icons-material/Person";

interface CoachPlanListProps {
  myRoster?: UserProfile[];
}

export const CoachPlanList: React.FC<CoachPlanListProps> = () => {
  const { userProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<number>(0); // 0 = Vorlagen, 1 = Zugewiesene Pläne
  const [selectedPlayerFilter, setSelectedPlayerFilter] =
    useState<string>("all"); // Neuer State für Spieler-Filter

  const [templates, setTemplates] = useState<TrainingPlan[]>([]);
  const [assignedPlans, setAssignedPlans] = useState<TrainingPlan[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
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

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        templatesSnap,
        assignedSnap,
        exercisesSnap,
        usersSnap,
        groupsSnap,
      ] = await Promise.all([
        getDocs(collection(db, "trainingPlans")),
        getDocs(collection(db, "assignedPlans")),
        getDocs(collection(db, "exercises")),
        getDocs(collection(db, "users")),
        getDocs(collection(db, "playerGroups")),
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

      setTemplates(fetchedTemplates);
      setAssignedPlans(fetchedAssigned);
      setExercises(fetchedExercises);
      setPlayers(fetchedPlayers);
      setGroups(fetchedGroups);
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

  // Gefilterte Liste zugewiesener Pläne
  const filteredAssignedPlans = assignedPlans.filter((plan) => {
    // 1. Spieler-Filter
    if (
      selectedPlayerFilter !== "all" &&
      plan.playerId !== selectedPlayerFilter
    ) {
      return false;
    }
    // 2. Abgeschlossen-Filter (falls Schalter deaktiviert ist)
    if (!showCompleted && plan.status === "completed") {
      return false;
    }
    return true;
  });

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

                  {/* Abgerundete Blöcke untereinander */}
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
              {/* Spieler-Filter Dropdown */}
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

              {/* Schalter: Abgeschlossene Pläne ein-/ausblenden */}
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
              filteredAssignedPlans.map((plan) => (
                <Card
                  key={plan.id}
                  variant="outlined"
                  className="flex flex-col justify-between"
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

                    <div className="flex gap-2 my-2">
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
                      <Chip
                        label={`${plan.blocks?.length || 0} Blöcke`}
                        size="small"
                        variant="outlined"
                      />
                    </div>

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
                </Card>
              ))
            )}
          </div>
        </div>
      )}

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

                {block.exercises.map((ex, exIdx) => {
                  const exObj = exercises.find((e) => e.id === ex.exerciseId);
                  return (
                    <div
                      key={exIdx}
                      className="flex flex-col gap-2 p-2 border rounded bg-white dark:bg-gray-900"
                    >
                      <div className="flex justify-between items-center">
                        <Typography variant="body2" className="font-bold">
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

                      <TextField
                        label="Übungs-Hinweis für den Spieler"
                        size="small"
                        variant="outlined"
                        fullWidth
                        value={ex.coachNote || ""}
                        onChange={(e) =>
                          handleUpdateExerciseNote(bIdx, exIdx, e.target.value)
                        }
                      />
                    </div>
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

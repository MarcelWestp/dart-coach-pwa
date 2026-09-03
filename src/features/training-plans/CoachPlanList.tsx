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
import { sendNotificationIfEnabled } from "../../services/notificationService";
import type { UserProfile } from "../../types/user";
import type {
  TrainingPlan,
  TrainingBlock,
  BlockExercise,
} from "../../types/trainingPlan";
import type { Exercise } from "../../types/exercise";
import type { PlayerGroup } from "../../types/group";
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
  MenuItem,
  RadioGroup,
  Radio,
  FormControlLabel,
  FormLabel,
  TextField,
  IconButton,
  Divider,
  Box,
} from "@mui/material";
import AssignmentIcon from "@mui/icons-material/Assignment";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SendIcon from "@mui/icons-material/Send";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";

interface CoachPlanListProps {
  myRoster?: UserProfile[];
}

export const CoachPlanList: React.FC<CoachPlanListProps> = () => {
  const { userProfile } = useAuth();

  const [templates, setTemplates] = useState<TrainingPlan[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [players, setPlayers] = useState<UserProfile[]>([]);
  const [groups, setGroups] = useState<PlayerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      const [templatesSnap, exercisesSnap, usersSnap, groupsSnap] =
        await Promise.all([
          getDocs(collection(db, "trainingPlans")),
          getDocs(collection(db, "exercises")),
          getDocs(collection(db, "users")),
          getDocs(collection(db, "playerGroups")),
        ]);

      const fetchedTemplates: TrainingPlan[] = [];
      templatesSnap.forEach((d) => {
        const data = d.data();
        delete data.id;
        if (data.isTemplate) {
          fetchedTemplates.push({ id: d.id, ...data } as TrainingPlan);
        }
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
  }, []);

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
      setError("Fehler beim Speichern des Trainingsplans.");
    } finally {
      setSubmitting(false);
    }
  };

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

  // --- ZUWEISUNGS-HANDLING (INCL. BENACHRICHTIGUNG) ---
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

      // 1. Zuweisung in Firestore 'assignedPlans' anlegen
      const assignPromises = targetUserIds.map((userId) =>
        addDoc(collection(db, "assignedPlans"), {
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
        }),
      );

      await Promise.all(assignPromises);

      // 2. Benachrichtigung an alle Ziel-Spieler senden (Prüfung der Nutzereinstellungen erfolgt intern)
      const notificationPromises = targetUserIds.map((userId) =>
        sendNotificationIfEnabled({
          userId,
          type: "newOrUpdatedTrainingPlans",
          title: "Neuer Trainingsplan zugewiesen",
          message: `Dein Trainer hat dir den Trainingsplan "${selectedPlanTemplate.title}" zugewiesen.`,
          link: "/my-plans",
        }),
      );

      await Promise.all(notificationPromises);

      setIsAssignModalOpen(false);
      setSelectedPlayerId("");
      setSelectedGroupId("");
    } catch (err) {
      console.error(err);
      setError("Fehler beim Zuweisen des Trainingsplans.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <CircularProgress />
      </div>
    );
  }

  const calculatedInfo = getWeekAndYearFromDate(startDate);

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
            Erstelle strukturierte Pläne aus Blöcken & Übungen und weise sie
            deinen Spielern zu.
          </Typography>
        </div>

        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenCreateModal}
        >
          Neuen Plan erstellen
        </Button>
      </div>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Vorlagen Liste */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.length === 0 ? (
          <Paper className="p-8 text-center col-span-full">
            <Typography variant="body1" color="textSecondary">
              Keine Pläne/Vorlagen vorhanden. Erstelle jetzt deinen ersten
              Trainingsplan!
            </Typography>
          </Paper>
        ) : (
          templates.map((template) => (
            <Card
              key={template.id}
              variant="outlined"
              className="flex flex-col justify-between shadow-sm"
            >
              <CardContent className="flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <Typography variant="h6" className="font-bold">
                    {template.templateName || template.title}
                  </Typography>
                  <div className="flex gap-1">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenEditModal(template)}
                      color="primary"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteTemplate(template.id)}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </div>
                </div>

                {template.coachNote && (
                  <Typography variant="body2" color="textSecondary">
                    {template.coachNote}
                  </Typography>
                )}

                {/* Blöcke Vorschau */}
                <div className="flex flex-col gap-2 mt-2">
                  {template.blocks?.map((b, idx) => (
                    <Paper key={b.id || idx} variant="outlined" className="p-2">
                      <Typography variant="caption" className="font-bold block">
                        {b.title} ({b.exercises.length} Übungen)
                      </Typography>
                    </Paper>
                  ))}
                </div>

                <Divider className="my-1" />

                <Box className="flex justify-end">
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<SendIcon />}
                    onClick={() => handleOpenAssignModal(template)}
                  >
                    Plan Zuweisen
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* MODAL 1: Plan/Vorlage Erstellen & Bearbeiten */}
      <Dialog
        open={isEditorModalOpen}
        onClose={() => setIsEditorModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle className="font-bold">
          {editingTemplateId
            ? "Trainingsplan Bearbeiten"
            : "Neuen Trainingsplan Erstellen"}
        </DialogTitle>
        <form onSubmit={handleSaveTemplate}>
          <DialogContent dividers className="flex flex-col gap-4">
            <TextField
              label="Titel des Trainingsplans"
              placeholder="z. B. Scoring & Checkout Fokus - Woche 1"
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
                  inputLabel: {
                    shrink: true,
                  },
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
                  Berechnete Zuweisung:
                </Typography>
                <Typography
                  variant="body2"
                  className="font-bold text-primary-main"
                >
                  KW {calculatedInfo.calendarWeek} / {calculatedInfo.year}
                </Typography>
              </Paper>
            </div>

            <TextField
              label="Trainer-Hinweis für den gesamten Plan"
              placeholder="z. B. Alle Blöcke konzentriert absolvieren."
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
                Plangliederung: Blöcke (1 bis N)
              </Typography>
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                size="small"
                onClick={handleAddBlock}
              >
                Neuen Block Hinzufügen
              </Button>
            </div>

            {blocks.length === 0 ? (
              <Alert severity="info">
                Füge mindestens einen Block hinzu (z. B. "Block 1: Warm-Up").
              </Alert>
            ) : (
              blocks.map((block, bIdx) => (
                <Paper
                  key={block.id || bIdx}
                  variant="outlined"
                  className="p-4 flex flex-col gap-3 relative border-2 border-primary-main/20"
                >
                  <div className="flex justify-between items-center gap-2">
                    <TextField
                      label={`Block #${bIdx + 1} Name`}
                      size="small"
                      required
                      className="font-bold min-w-[250px]"
                      value={block.title}
                      onChange={(e) =>
                        handleUpdateBlockTitle(bIdx, e.target.value)
                      }
                    />
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveBlock(bIdx)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </div>

                  <TextField
                    label="Anmerkung für diesen Block"
                    size="small"
                    placeholder="z. B. Fokus auf Saubere Technik"
                    value={block.coachNote || ""}
                    onChange={(e) =>
                      handleUpdateBlockNote(bIdx, e.target.value)
                    }
                  />

                  {/* Übungen innerhalb des Blocks */}
                  <Typography
                    variant="caption"
                    className="font-bold block mt-2 text-primary-main"
                  >
                    Übungen in diesem Block:
                  </Typography>

                  {block.exercises.length === 0 ? (
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      className="italic py-2"
                    >
                      Noch keine Übung aus der Bibliothek hinzugefügt.
                    </Typography>
                  ) : (
                    block.exercises.map((exItem, exIdx) => {
                      const matchedEx = exercises.find(
                        (e) => e.id === exItem.exerciseId,
                      );
                      return (
                        <Paper
                          key={exIdx}
                          variant="outlined"
                          className="p-3 flex flex-col gap-2"
                        >
                          <div className="flex justify-between items-center">
                            <Typography
                              variant="subtitle2"
                              className="font-bold flex items-center gap-2"
                            >
                              <FitnessCenterIcon
                                fontSize="small"
                                color="primary"
                              />
                              {matchedEx ? matchedEx.title : "Unbekannte Übung"}
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
                            label="Trainer-Notiz zu dieser Übung"
                            size="small"
                            placeholder="z. B. Mindestens 50 Punkte erzielen"
                            value={exItem.coachNote || ""}
                            onChange={(e) =>
                              handleUpdateExerciseNote(
                                bIdx,
                                exIdx,
                                e.target.value,
                              )
                            }
                          />
                        </Paper>
                      );
                    })
                  )}

                  {/* Übung aus Bibliothek hinzufügen */}
                  <FormControl size="small" fullWidth className="mt-2">
                    <InputLabel>
                      + Übung aus Bibliothek zu Block hinzufügen
                    </InputLabel>
                    <Select
                      value=""
                      label="+ Übung aus Bibliothek zu Block hinzufügen"
                      onChange={(e) =>
                        handleAddExerciseToBlock(bIdx, e.target.value)
                      }
                    >
                      {exercises.map((ex) => (
                        <MenuItem key={ex.id} value={ex.id}>
                          {ex.title} ({ex.type})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Paper>
              ))
            )}
          </DialogContent>

          <DialogActions className="p-4">
            <Button
              variant="contained"
              onClick={() => setIsEditorModalOpen(false)}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={submitting || blocks.length === 0}
            >
              {submitting ? "Speichert..." : "Plan Speichern"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* MODAL 2: Plan Zuweisen */}
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
          <Button
            variant="contained"
            onClick={() => setIsAssignModalOpen(false)}
          >
            Abbrechen
          </Button>
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
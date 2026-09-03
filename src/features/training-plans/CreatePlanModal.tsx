import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import type { Exercise, PerformanceTest } from "../../types/exercise";
import type { UserProfile } from "../../types/user";
import type {
  TrainingPlan,
  TrainingBlock,
  BlockExercise,
} from "../../types/trainingPlan";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Typography,
  IconButton,
  Paper,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import BookmarkIcon from "@mui/icons-material/Bookmark";

interface CreatePlanModalProps {
  open: boolean;
  onClose: () => void;
  onPlanSaved: () => void;
  planToEdit?: TrainingPlan | null;
  myRoster: UserProfile[];
}

export const CreatePlanModal: React.FC<CreatePlanModalProps> = ({
  open,
  onClose,
  onPlanSaved,
  planToEdit,
  myRoster,
}) => {
  const { userProfile } = useAuth();

  const [title, setTitle] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [calendarWeek, setCalendarWeek] = useState<number>(37);
  const [coachNote, setCoachNote] = useState("");
  const [performanceTestId, setPerformanceTestId] = useState<string>("");

  // Blöcke
  const [blocks, setBlocks] = useState<TrainingBlock[]>([]);

  // Vorlagen-State
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templates, setTemplates] = useState<TrainingPlan[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  // Bibliotheken
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [allTests, setAllTests] = useState<PerformanceTest[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hilfsfunktion: Aktuelle Kalenderwoche berechnen
  const getTheoreticalKW = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [exSnap, testSnap, planSnap] = await Promise.all([
          getDocs(collection(db, "exercises")),
          getDocs(collection(db, "performanceTests")),
          getDocs(collection(db, "trainingPlans")),
        ]);

        const fetchedExercises: Exercise[] = [];
        exSnap.forEach((d) =>
          fetchedExercises.push({ id: d.id, ...d.data() } as Exercise),
        );

        const fetchedTests: PerformanceTest[] = [];
        testSnap.forEach((d) =>
          fetchedTests.push({ id: d.id, ...d.data() } as PerformanceTest),
        );

        const fetchedTemplates: TrainingPlan[] = [];
        planSnap.forEach((d) => {
          const data = d.data();
          if (data.isTemplate && data.coachId === userProfile?.uid) {
            fetchedTemplates.push({ ...data, id: d.id } as TrainingPlan);
          }
        });

        setAllExercises(fetchedExercises);
        setAllTests(fetchedTests);
        setTemplates(fetchedTemplates);
      } catch (err) {
        console.error(err);
      }
    };

    if (open) {
      fetchData();
      if (planToEdit) {
        setTitle(planToEdit.title);
        setPlayerId(planToEdit.playerId || "");
        setYear(planToEdit.year);
        setCalendarWeek(planToEdit.calendarWeek);
        setCoachNote(planToEdit.coachNote || "");
        setPerformanceTestId(planToEdit.performanceTestId || "");
        setBlocks(planToEdit.blocks || []);
      } else {
        setTitle("Wochen-Trainingsplan");
        setPlayerId(myRoster.length > 0 ? myRoster[0].uid : "");
        setYear(new Date().getFullYear());
        setCalendarWeek(getTheoreticalKW());
        setCoachNote("");
        setPerformanceTestId("");
        setBlocks([
          {
            id: `block_${Date.now()}_1`,
            title: "Block 1: Grundlagen & Scoring",
            coachNote: "",
            exercises: [],
          },
        ]);
      }
      setSaveAsTemplate(false);
      setTemplateName("");
      setSelectedTemplateId("");
    }
  }, [open, planToEdit, myRoster, userProfile?.uid]);

  // Vorlage laden
  const handleLoadTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tmpl = templates.find((t) => t.id === templateId);
    if (tmpl) {
      setTitle(tmpl.title);
      setCoachNote(tmpl.coachNote || "");
      setPerformanceTestId(tmpl.performanceTestId || "");
      setBlocks(tmpl.blocks ? JSON.parse(JSON.stringify(tmpl.blocks)) : []);
    }
  };

  // Block hinzufügen
  const handleAddBlock = () => {
    const newBlock: TrainingBlock = {
      id: `block_${Date.now()}`,
      title: `Block ${blocks.length + 1}`,
      coachNote: "",
      exercises: [],
    };
    setBlocks((prev) => [...prev, newBlock]);
  };

  // Block entfernen
  const handleRemoveBlock = (blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
  };

  // Übung zu Block hinzufügen
  const handleAddExerciseToBlock = (blockId: string, exerciseId: string) => {
    if (!exerciseId) return;
    const newEx: BlockExercise = {
      exerciseId,
      coachNote: "",
    };
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id === blockId) {
          return { ...b, exercises: [...b.exercises, newEx] };
        }
        return b;
      }),
    );
  };

  // Übung aus Block entfernen
  const handleRemoveExerciseFromBlock = (blockId: string, exIndex: number) => {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id === blockId) {
          return {
            ...b,
            exercises: b.exercises.filter((_, idx) => idx !== exIndex),
          };
        }
        return b;
      }),
    );
  };

  // Coach-Note für Übung ändern
  const handleUpdateExerciseNote = (
    blockId: string,
    exIndex: number,
    note: string,
  ) => {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id === blockId) {
          const updatedExs = [...b.exercises];
          updatedExs[exIndex] = { ...updatedExs[exIndex], coachNote: note };
          return { ...b, exercises: updatedExs };
        }
        return b;
      }),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    if (!saveAsTemplate && !playerId) {
      setError("Bitte wähle einen Spieler aus.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const planData = {
        title: title.trim(),
        coachId: userProfile.uid,
        playerId: saveAsTemplate ? "" : playerId,
        year,
        calendarWeek,
        coachNote: coachNote.trim(),
        performanceTestId: performanceTestId || null,
        blocks,
        status: "assigned",
        updatedAt: new Date().toISOString(),
      };

      if (planToEdit) {
        const planRef = doc(db, "trainingPlans", planToEdit.id);
        await updateDoc(planRef, planData);
      } else {
        await addDoc(collection(db, "trainingPlans"), {
          ...planData,
          createdAt: new Date().toISOString(),
        });
      }

      // Falls als Vorlage gespeichert werden soll
      if (saveAsTemplate && templateName.trim()) {
        await addDoc(collection(db, "trainingPlans"), {
          title: templateName.trim(),
          coachId: userProfile.uid,
          playerId: "",
          year: 0,
          calendarWeek: 0,
          coachNote: coachNote.trim(),
          performanceTestId: performanceTestId || null,
          blocks,
          status: "assigned",
          isTemplate: true,
          templateName: templateName.trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      onPlanSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError("Fehler beim Speichern des Trainingsplans.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle className="font-bold">
        {planToEdit
          ? "Trainingsplan bearbeiten"
          : "Neuen Wochen-Trainingsplan erstellen"}
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent dividers className="flex flex-col gap-4">
          {error && <Alert severity="error">{error}</Alert>}

          {/* Aus Vorlage laden */}
          {templates.length > 0 && !planToEdit && (
            <Paper
              variant="outlined"
              className="p-3 bg-blue-50 dark:bg-gray-800"
            >
              <Typography
                variant="subtitle2"
                className="font-bold mb-2 flex items-center gap-1"
              >
                <BookmarkIcon color="primary" fontSize="small" /> Aus
                bestehender Vorlage laden:
              </Typography>
              <FormControl fullWidth size="small">
                <InputLabel>Vorlage auswählen</InputLabel>
                <Select
                  value={selectedTemplateId}
                  label="Vorlage auswählen"
                  onChange={(e) => handleLoadTemplate(e.target.value)}
                >
                  <MenuItem value="">
                    <em>Keine Vorlage verwenden</em>
                  </MenuItem>
                  {templates.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.templateName || t.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Paper>
          )}

          {/* Basis-Informationen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TextField
              label="Titel des Plans"
              variant="outlined"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <FormControl required disabled={saveAsTemplate}>
              <InputLabel>Spieler auswählen</InputLabel>
              <Select
                value={playerId}
                label="Spieler auswählen"
                onChange={(e) => setPlayerId(e.target.value)}
              >
                {myRoster.length === 0 ? (
                  <MenuItem disabled value="">
                    Keine Spieler im Kader
                  </MenuItem>
                ) : (
                  myRoster.map((p) => (
                    <MenuItem key={p.uid} value={p.uid}>
                      {p.realName} ({p.nickname})
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            <div className="flex gap-2">
              <TextField
                label="KW"
                type="number"
                variant="outlined"
                required
                className="w-1/2"
                slotProps={{
                  htmlInput: { min: 1, max: 53 },
                }}
                value={calendarWeek}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCalendarWeek(parseInt(e.target.value, 10) || 1)
                }
              />
              <TextField
                label="Jahr"
                type="number"
                variant="outlined"
                required
                className="w-1/2"
                value={year}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setYear(
                    parseInt(e.target.value, 10) || new Date().getFullYear(),
                  )
                }
              />
            </div>
          </div>

          <TextField
            label="Anmerkung / Notiz des Trainers für den gesamten Plan"
            variant="outlined"
            multiline
            rows={2}
            value={coachNote}
            onChange={(e) => setCoachNote(e.target.value)}
            placeholder="z. B. Fokus diese Woche auf sauberes Durchziehen legen..."
          />

          {/* Maximal 1 Leistungstest */}
          <FormControl fullWidth>
            <InputLabel>
              Leistungstest zuweisen (Maximal 1 pro Woche)
            </InputLabel>
            <Select
              value={performanceTestId}
              label="Leistungstest zuweisen (Maximal 1 pro Woche)"
              onChange={(e) => setPerformanceTestId(e.target.value)}
            >
              <MenuItem value="">
                <em>Kein Leistungstest in dieser Woche</em>
              </MenuItem>
              {allTests.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.title} ({t.exerciseType.toUpperCase()})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Divider className="my-2" />

          {/* Trainingsblöcke verwalten */}
          <div className="flex justify-between items-center">
            <Typography variant="h6" className="font-bold">
              Trainingsblöcke ({blocks.length})
            </Typography>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleAddBlock}
            >
              Block hinzufügen
            </Button>
          </div>

          {blocks.map((block, bIndex) => (
            <Paper
              key={block.id}
              variant="outlined"
              className="p-4 flex flex-col gap-3"
            >
              <div className="flex justify-between items-center">
                <TextField
                  label={`Titel für Block ${bIndex + 1}`}
                  variant="outlined"
                  size="small"
                  className="w-2/3"
                  value={block.title}
                  onChange={(e) => {
                    const newTitle = e.target.value;
                    setBlocks((prev) =>
                      prev.map((b) =>
                        b.id === block.id ? { ...b, title: newTitle } : b,
                      ),
                    );
                  }}
                />
                <IconButton
                  color="error"
                  size="small"
                  onClick={() => handleRemoveBlock(block.id)}
                >
                  <DeleteIcon />
                </IconButton>
              </div>

              <TextField
                label="Block-Anmerkung (Trainer)"
                variant="outlined"
                size="small"
                multiline
                rows={1}
                value={block.coachNote || ""}
                onChange={(e) => {
                  const newNote = e.target.value;
                  setBlocks((prev) =>
                    prev.map((b) =>
                      b.id === block.id ? { ...b, coachNote: newNote } : b,
                    ),
                  );
                }}
              />

              {/* Übung zum Block hinzufügen */}
              <div className="flex gap-2 items-center">
                <FormControl fullWidth size="small">
                  <InputLabel>Übung zu diesem Block hinzufügen</InputLabel>
                  <Select
                    defaultValue=""
                    label="Übung zu diesem Block hinzufügen"
                    onChange={(e) => {
                      handleAddExerciseToBlock(block.id, e.target.value);
                      e.target.value = "";
                    }}
                  >
                    <MenuItem disabled value="">
                      Übung auswählen...
                    </MenuItem>
                    {allExercises.map((ex) => (
                      <MenuItem key={ex.id} value={ex.id}>
                        {ex.title} ({ex.type})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>

              {/* Liste der Übungen in diesem Block */}
              {block.exercises.map((bEx, exIndex) => {
                const exerciseObj = allExercises.find(
                  (e) => e.id === bEx.exerciseId,
                );
                return (
                  <Accordion
                    key={`${bEx.exerciseId}-${exIndex}`}
                    elevation={0}
                    variant="outlined"
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <div className="flex justify-between items-center w-full pr-2">
                        <Typography variant="body2" className="font-bold">
                          {exIndex + 1}.{" "}
                          {exerciseObj ? exerciseObj.title : "Übung"}
                        </Typography>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveExerciseFromBlock(block.id, exIndex);
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </div>
                    </AccordionSummary>
                    <AccordionDetails>
                      <TextField
                        label="Spezifische Anmerkung für diese Übung (Trainer)"
                        variant="outlined"
                        size="small"
                        fullWidth
                        multiline
                        rows={2}
                        value={bEx.coachNote || ""}
                        onChange={(e) =>
                          handleUpdateExerciseNote(
                            block.id,
                            exIndex,
                            e.target.value,
                          )
                        }
                        placeholder="z. B. 3 Serien absolvieren, Fokus auf Wurf-Rhythmus..."
                      />
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Paper>
          ))}

          <Divider className="my-2" />

          {/* Option: Als Vorlage speichern */}
          <div className="flex flex-col gap-2">
            <FormControlLabel
              control={
                <Checkbox
                  checked={saveAsTemplate}
                  onChange={(e) => setSaveAsTemplate(e.target.checked)}
                  color="primary"
                />
              }
              label="Diesen Plan zusätzlich als wiederverwendbare Vorlage (Template) speichern"
            />

            {saveAsTemplate && (
              <TextField
                label="Name der Vorlage"
                variant="outlined"
                size="small"
                required={saveAsTemplate}
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="z. B. Standard Scoring Wochenplan"
              />
            )}
          </div>
        </DialogContent>

        <DialogActions className="p-4">
          <Button onClick={onClose} disabled={loading}>
            Abbrechen
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading
              ? "Speichert..."
              : planToEdit
                ? "Änderungen Speichern"
                : "Plan Zuweisen"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

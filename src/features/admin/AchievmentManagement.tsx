import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import type {
  DynamicAchievement,
  AchievementTriggerType,
  AchievementRequirement,
} from "../../types/achievement";
import type { Exercise, Tag } from "../../types/exercise";
import {
  Paper,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Card,
  CardContent,
  CardActions,
  useMediaQuery,
  useTheme,
  Box,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

const TRIGGER_LABELS: Record<AchievementTriggerType, string> = {
  total_exercises_count: "Anzahl aller absolvierten Übungen",
  specific_exercise_count: "Anzahl einer spezifischen Übung",
  exercise_tag_count: "Anzahl eines spezifischen Übungstags",
  exercise_highscore: "Bestleistung in einer Übung",
  league_rank: "Platzierung in einer Liga",
  monthly_exercise_rank: "Platzierung in der Übung des Monats",
  training_streak_days: "Trainings-Serie (Tage/Wochen)",
  matches_played: "Absolvierte 1v1-Matches",
  matches_won: "Gewonnene 1v1-Matches",
};

const DEFAULT_REQUIREMENTS: AchievementRequirement[] = [
  { tier: "bronze", threshold: 10, xpReward: 10, titleReward: "" },
  { tier: "silver", threshold: 25, xpReward: 25, titleReward: "" },
  { tier: "gold", threshold: 50, xpReward: 50, titleReward: "" },
  { tier: "platinum", threshold: 100, xpReward: 100, titleReward: "" },
  { tier: "diamond", threshold: 250, xpReward: 250, titleReward: "" },
];

export const AchievementManagement: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [achievements, setAchievements] = useState<DynamicAchievement[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Formular State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<DynamicAchievement["category"]>("training");
  const [triggerType, setTriggerType] = useState<AchievementTriggerType>("total_exercises_count");
  const [exerciseId, setExerciseId] = useState("");
  const [tagId, setTagId] = useState("");
  const [isSecret, setIsSecret] = useState(false);
  const [requirements, setRequirements] = useState<AchievementRequirement[]>(DEFAULT_REQUIREMENTS);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [achSnap, exSnap, tagSnap] = await Promise.all([
        getDocs(collection(db, "achievements")),
        getDocs(collection(db, "exercises")),
        getDocs(collection(db, "tags")),
      ]);

      const fetchedAch: DynamicAchievement[] = [];
      achSnap.forEach((d) => {
        fetchedAch.push({ id: d.id, ...d.data() } as DynamicAchievement);
      });

      const fetchedEx: Exercise[] = [];
      exSnap.forEach((d) => {
        fetchedEx.push({ id: d.id, ...d.data() } as Exercise);
      });

      const fetchedTags: Tag[] = [];
      tagSnap.forEach((d) => {
        fetchedTags.push({ id: d.id, ...d.data() } as Tag);
      });

      setAchievements(fetchedAch);
      setExercises(fetchedEx);
      setTags(fetchedTags);
    } catch (err) {
      console.error("Fehler beim Laden der Daten:", err);
      setError("Fehler beim Laden der Daten.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRequirementChange = (
    index: number,
    field: "threshold" | "xpReward" | "titleReward",
    val: string | number
  ) => {
    const updated = [...requirements];
    updated[index] = { ...updated[index], [field]: val };
    setRequirements(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!title.trim() || !description.trim()) {
      setError("Bitte Titel und Beschreibung ausfüllen.");
      return;
    }

    if (triggerType === "exercise_tag_count" && !tagId) {
      setError("Bitte wähle ein Tag aus.");
      return;
    }

    if (
      (triggerType === "specific_exercise_count" || triggerType === "exercise_highscore") &&
      !exerciseId
    ) {
      setError("Bitte wähle eine zugehörige Übung aus.");
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      category,
      triggerType,
      exerciseId: exerciseId || null,
      tagId: tagId || null,
      isSecret,
      requirements,
      updatedAt: new Date().toISOString(),
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "achievements", editingId), payload);
        setSuccess("Achievement erfolgreich aktualisiert!");
      } else {
        await addDoc(collection(db, "achievements"), {
          ...payload,
          createdAt: new Date().toISOString(),
        });
        setSuccess("Neues Achievement erstellt!");
      }
      resetForm();
      fetchData();
    } catch (err) {
      console.error("Fehler beim Speichern:", err);
      setError("Fehler beim Speichern des Achievements.");
    }
  };

  const handleEdit = (ach: DynamicAchievement) => {
    setEditingId(ach.id);
    setTitle(ach.title);
    setDescription(ach.description);
    setCategory(ach.category);
    setTriggerType(ach.triggerType);
    setExerciseId(ach.exerciseId || "");
    setTagId((ach as any).tagId || "");
    setIsSecret(Boolean(ach.isSecret));

    const loadedReqs = (ach.requirements || DEFAULT_REQUIREMENTS).map((req) => ({
      ...req,
      titleReward: req.titleReward || "",
    }));
    setRequirements(loadedReqs);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Möchtest du dieses Achievement wirklich löschen?")) return;
    try {
      await deleteDoc(doc(db, "achievements", id));
      setSuccess("Achievement gelöscht.");
      fetchData();
    } catch (err) {
      console.error("Fehler beim Löschen:", err);
      setError("Fehler beim Löschen.");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setCategory("training");
    setTriggerType("total_exercises_count");
    setExerciseId("");
    setTagId("");
    setIsSecret(false);
    setRequirements(DEFAULT_REQUIREMENTS);
  };

  if (loading) {
    return (
      <Box className="flex justify-center items-center p-8">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="flex flex-col gap-6">
      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* Formular: Erstellen / Bearbeiten */}
      <Paper
        variant="outlined"
        sx={{ bgcolor: "background.paper", borderColor: "divider" }}
        className="p-4 sm:p-6 shadow-md flex flex-col gap-4"
      >
        <Typography variant="h6" className="font-bold flex items-center gap-2" color="text.primary">
          <EmojiEventsIcon color="primary" />
          {editingId ? "Achievement bearbeiten" : "Neues Achievement anlegen"}
        </Typography>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              label="Titel des Achievements"
              variant="outlined"
              fullWidth
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <FormControl fullWidth required>
              <InputLabel>Kategorie</InputLabel>
              <Select
                value={category}
                label="Kategorie"
                onChange={(e) => setCategory(e.target.value as DynamicAchievement["category"])}
              >
                <MenuItem value="training">Training & Übungen</MenuItem>
                <MenuItem value="league">Liga & Wettkampf</MenuItem>
                <MenuItem value="social">Social & Community</MenuItem>
                <MenuItem value="special">Spezial / Streaks</MenuItem>
              </Select>
            </FormControl>
          </div>

          <TextField
            label="Beschreibung"
            variant="outlined"
            multiline
            rows={2}
            fullWidth
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormControl fullWidth required>
              <InputLabel>Auslöser (Trigger)</InputLabel>
              <Select
                value={triggerType}
                label="Auslöser (Trigger)"
                onChange={(e) => {
                  const newTrigger = e.target.value as AchievementTriggerType;
                  setTriggerType(newTrigger);
                  if (newTrigger !== "specific_exercise_count" && newTrigger !== "exercise_highscore") {
                    setExerciseId("");
                  }
                  if (newTrigger !== "exercise_tag_count") {
                    setTagId("");
                  }
                }}
              >
                {Object.entries(TRIGGER_LABELS).map(([key, label]) => (
                  <MenuItem key={key} value={key}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Spezifische Übung auswählen */}
            {(triggerType === "specific_exercise_count" || triggerType === "exercise_highscore") && (
              <FormControl fullWidth required>
                <InputLabel>Zugehörige Übung</InputLabel>
                <Select
                  value={exerciseId}
                  label="Zugehörige Übung"
                  onChange={(e) => setExerciseId(e.target.value)}
                >
                  {exercises.map((ex) => (
                    <MenuItem key={ex.id} value={ex.id}>
                      {ex.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Tag auswählen */}
            {triggerType === "exercise_tag_count" && (
              <FormControl fullWidth required>
                <InputLabel>Zugehöriger Tag</InputLabel>
                <Select
                  value={tagId}
                  label="Zugehöriger Tag"
                  onChange={(e) => setTagId(e.target.value)}
                >
                  {tags.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </div>

          <FormControlLabel
            control={
              <Switch
                checked={isSecret}
                onChange={(e) => setIsSecret(e.target.checked)}
                color="secondary"
              />
            }
            label="Geheimes Achievement (Titel & Beschreibung vor Freischaltung verbergen)"
          />

          {/* Stufen-Konfiguration */}
          <Typography variant="subtitle2" className="font-bold mt-2" color="text.primary">
            Stufen-Schwellenwerte, XP & Profil-Titel Belohnungen
          </Typography>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {requirements.map((req, idx) => (
              <Paper key={req.tier} variant="outlined" sx={{ bgcolor: "background.paper", borderColor: "divider" }} className="p-3 flex flex-col gap-2">
                <Typography variant="caption" className="font-bold uppercase color-primary">
                  {req.tier}
                </Typography>
                <TextField
                  label="Zielwert"
                  type="number"
                  size="small"
                  required
                  value={req.threshold}
                  onChange={(e) => handleRequirementChange(idx, "threshold", Number(e.target.value))}
                />
                <TextField
                  label="XP Belohnung"
                  type="number"
                  size="small"
                  required
                  value={req.xpReward}
                  onChange={(e) => handleRequirementChange(idx, "xpReward", Number(e.target.value))}
                />
                <TextField
                  label="Freischaltbarer Titel (Optional)"
                  placeholder="z.B. Doppel-Meister"
                  size="small"
                  value={req.titleReward || ""}
                  onChange={(e) => handleRequirementChange(idx, "titleReward", e.target.value)}
                />
              </Paper>
            ))}
          </div>

          <div className="flex gap-2 justify-end mt-2">
            {editingId && (
              <Button variant="outlined" color="inherit" onClick={resetForm}>
                Abbrechen
              </Button>
            )}
            <Button type="submit" variant="contained" color="primary">
              {editingId ? "Änderungen speichern" : "Achievement anlegen"}
            </Button>
          </div>
        </form>
      </Paper>

      {/* Übersicht aller Achievements */}
      <Paper variant="outlined" sx={{ bgcolor: "background.paper", borderColor: "divider" }} className="p-4 sm:p-6 shadow-md">
        <Typography variant="h6" className="font-bold mb-4" color="text.primary">
          Vorhandene Achievements
        </Typography>

        {isMobile ? (
          <div className="flex flex-col gap-3">
            {achievements.map((ach) => {
              const matchedTag = tags.find((t) => t.id === (ach as any).tagId);
              const matchedEx = exercises.find((ex) => ex.id === ach.exerciseId);

              return (
                <Card key={ach.id} variant="outlined" sx={{ bgcolor: "background.paper", borderColor: "divider" }}>
                  <CardContent className="p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <Typography variant="subtitle1" className="font-bold" color="text.primary">
                        {ach.title}
                      </Typography>
                      {ach.isSecret && (
                        <Chip icon={<VisibilityOffIcon />} label="Geheim" size="small" color="secondary" />
                      )}
                    </div>
                    <Typography variant="body2" color="text.secondary">
                      {ach.description}
                    </Typography>

                    <div className="flex flex-wrap gap-1 mt-1">
                      <Chip
                        label={TRIGGER_LABELS[ach.triggerType] || ach.triggerType}
                        size="small"
                        variant="outlined"
                      />
                      {matchedTag && (
                        <Chip label={`Tag: ${matchedTag.name}`} size="small" color="primary" variant="outlined" />
                      )}
                      {matchedEx && (
                        <Chip label={`Übung: ${matchedEx.title}`} size="small" color="info" variant="outlined" />
                      )}
                    </div>
                  </CardContent>
                  <CardActions className="justify-end p-2 border-t border-divider">
                    <IconButton size="small" color="primary" onClick={() => handleEdit(ach)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(ach.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              );
            })}
          </div>
        ) : (
          <TableContainer component={Paper} variant="outlined" sx={{ borderColor: "divider" }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell className="font-bold">Titel & Beschreibung</TableCell>
                  <TableCell className="font-bold">Kategorie</TableCell>
                  <TableCell className="font-bold">Auslöser (Trigger)</TableCell>
                  <TableCell className="font-bold">Typ</TableCell>
                  <TableCell align="right" className="font-bold">Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {achievements.map((ach) => {
                  const matchedTag = tags.find((t) => t.id === (ach as any).tagId);
                  const matchedEx = exercises.find((ex) => ex.id === ach.exerciseId);

                  return (
                    <TableRow key={ach.id} hover>
                      <TableCell>
                        <Typography variant="subtitle2" className="font-bold" color="text.primary">
                          {ach.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" className="block">
                          {ach.description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={ach.category} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.primary">
                          {TRIGGER_LABELS[ach.triggerType] || ach.triggerType}
                        </Typography>
                        {matchedTag && (
                          <Chip label={`Tag: ${matchedTag.name}`} size="small" color="primary" variant="outlined" className="mt-1" />
                        )}
                        {matchedEx && (
                          <Chip label={`Übung: ${matchedEx.title}`} size="small" color="info" variant="outlined" className="mt-1" />
                        )}
                      </TableCell>
                      <TableCell>
                        {ach.isSecret ? (
                          <Chip icon={<VisibilityOffIcon />} label="Geheim" size="small" color="secondary" />
                        ) : (
                          <Chip label="Sichtbar" size="small" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" color="primary" onClick={() => handleEdit(ach)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(ach.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};
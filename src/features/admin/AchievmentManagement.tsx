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
import type { Exercise } from "../../types/exercise";
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
  exercise_highscore: "Bestleistung in einer Übung",
  league_rank: "Platzierung in einer Liga",
  monthly_exercise_rank: "Platzierung in der Übung des Monats",
  training_streak_days: "Trainings-Serie (Tage/Wochen)",
  matches_played: "Absolvierte 1v1-Matches",
  matches_won: "Gewonnene 1v1-Matches",
};

const DEFAULT_REQUIREMENTS: AchievementRequirement[] = [
  { tier: "bronze", threshold: 10, xpReward: 10 },
  { tier: "silver", threshold: 25, xpReward: 25 },
  { tier: "gold", threshold: 50, xpReward: 50 },
  { tier: "platinum", threshold: 100, xpReward: 100 },
  { tier: "diamond", threshold: 250, xpReward: 250 },
];

export const AchievementManagement: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [achievements, setAchievements] = useState<DynamicAchievement[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
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
  const [isSecret, setIsSecret] = useState(false);
  const [requirements, setRequirements] = useState<AchievementRequirement[]>(DEFAULT_REQUIREMENTS);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [achSnap, exSnap] = await Promise.all([
        getDocs(collection(db, "achievements")),
        getDocs(collection(db, "exercises")),
      ]);

      const fetchedAch: DynamicAchievement[] = [];
      achSnap.forEach((d) => {
        fetchedAch.push({ id: d.id, ...d.data() } as DynamicAchievement);
      });

      const fetchedEx: Exercise[] = [];
      exSnap.forEach((d) => {
        fetchedEx.push({ id: d.id, ...d.data() } as Exercise);
      });

      setAchievements(fetchedAch);
      setExercises(fetchedEx);
    } catch (err) {
      console.error("Fehler beim Laden der Achievements:", err);
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
    field: "threshold" | "xpReward",
    val: number
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

    const payload = {
      title: title.trim(),
      description: description.trim(),
      category,
      triggerType,
      exerciseId: exerciseId || null,
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
    setIsSecret(Boolean(ach.isSecret));
    setRequirements(ach.requirements || DEFAULT_REQUIREMENTS);
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
        sx={{ bgcolor: "background.paper" }}
        className="p-4 sm:p-6 shadow-md flex flex-col gap-4"
      >
        <Typography variant="h6" className="font-bold flex items-center gap-2">
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
                onChange={(e) => setTriggerType(e.target.value as AchievementTriggerType)}
              >
                {Object.entries(TRIGGER_LABELS).map(([key, label]) => (
                  <MenuItem key={key} value={key}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

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

          {/* Stufen-Konfiguration (Bronze, Silber, Gold, Platin, Diamant) */}
          <Typography variant="subtitle2" className="font-bold mt-2">
            Stufen-Schwellenwerte & XP-Belohnungen
          </Typography>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {requirements.map((req, idx) => (
              <Paper key={req.tier} variant="outlined" className="p-3 flex flex-col gap-2">
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
      <Paper variant="outlined" sx={{ bgcolor: "background.paper" }} className="p-4 sm:p-6 shadow-md">
        <Typography variant="h6" className="font-bold mb-4">
          Vorhandene Achievements
        </Typography>

        {isMobile ? (
          <div className="flex flex-col gap-3">
            {achievements.map((ach) => (
              <Card key={ach.id} variant="outlined">
                <CardContent className="p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <Typography variant="subtitle1" className="font-bold">
                      {ach.title}
                    </Typography>
                    {ach.isSecret && (
                      <Chip icon={<VisibilityOffIcon />} label="Geheim" size="small" color="secondary" />
                    )}
                  </div>
                  <Typography variant="body2" color="text.secondary">
                    {ach.description}
                  </Typography>
                  <Chip
                    label={TRIGGER_LABELS[ach.triggerType] || ach.triggerType}
                    size="small"
                    variant="outlined"
                    className="w-fit"
                  />
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
            ))}
          </div>
        ) : (
          <TableContainer component={Paper} variant="outlined">
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
                {achievements.map((ach) => (
                  <TableRow key={ach.id} hover>
                    <TableCell>
                      <Typography variant="subtitle2" className="font-bold">
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
                      <Typography variant="body2">
                        {TRIGGER_LABELS[ach.triggerType] || ach.triggerType}
                      </Typography>
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
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};
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
import type { Exercise } from "../../types/exercise";
import type {
  LeagueConfig,
  MonthlyExerciseConfig,
  LeagueType,
} from "../../types/league";
import {
  Paper,
  Typography,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  OutlinedInput,
  Box,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";

export const AdminLeagueManager: React.FC = () => {
  const { userProfile } = useAuth();

  const [leagues, setLeagues] = useState<LeagueConfig[]>([]);
  const [monthlyConfigs, setMonthlyConfigs] = useState<MonthlyExerciseConfig[]>(
    [],
  );
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isLeagueModalOpen, setIsLeagueModalOpen] = useState(false);
  const [isMonthlyModalOpen, setIsMonthlyModalOpen] = useState(false);

  // Liga Formular State
  const [leagueTitle, setLeagueTitle] = useState("");
  const [leagueDescription, setLeagueDescription] = useState("");
  const [leagueType, setLeagueType] = useState<LeagueType>("performance");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);

  // Übung des Monats Formular State
  const [selectedMonthExerciseId, setSelectedMonthExerciseId] = useState("");
  const [targetMonth, setTargetMonth] = useState<number>(
    new Date().getMonth() + 1,
  );
  const [targetYear, setTargetYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [monthlyDescription, setMonthlyDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [leaguesSnap, monthlySnap, exSnap] = await Promise.all([
        getDocs(collection(db, "leagues")),
        getDocs(collection(db, "monthlyExercises")),
        getDocs(collection(db, "exercises")),
      ]);

      const fetchedLeagues: LeagueConfig[] = [];
      leaguesSnap.forEach((d) => {
        const { id, ...data } = d.data();
        fetchedLeagues.push({ id: d.id, ...data } as LeagueConfig);
      });

      const fetchedMonthly: MonthlyExerciseConfig[] = [];
      monthlySnap.forEach((d) => {
        const { id, ...data } = d.data();
        fetchedMonthly.push({ id: d.id, ...data } as MonthlyExerciseConfig);
      });

      const fetchedExercises: Exercise[] = [];
      exSnap.forEach((d) => {
        const { id, ...data } = d.data();
        fetchedExercises.push({ id: d.id, ...data } as Exercise);
      });

      setLeagues(fetchedLeagues);
      setMonthlyConfigs(fetchedMonthly);
      setExercises(fetchedExercises);
    } catch (err) {
      console.error(err);
      setError("Fehler beim Laden der Liga-Konfigurationen.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !leagueTitle.trim() || !leagueDescription.trim()) {
      setError("Bitte fülle Titel und Beschreibung aus.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await addDoc(collection(db, "leagues"), {
        title: leagueTitle.trim(),
        description: leagueDescription.trim(),
        type: leagueType,
        startDate: startDate || null,
        endDate: endDate || null,
        isActive: true,
        createdBy: userProfile.uid,
        exerciseIds: leagueType === "performance" ? selectedExerciseIds : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setIsLeagueModalOpen(false);
      setLeagueTitle("");
      setLeagueDescription("");
      setSelectedExerciseIds([]);
      fetchData();
    } catch (err) {
      console.error(err);
      setError("Fehler beim Erstellen der Liga.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateMonthlyExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !selectedMonthExerciseId) return;

    setSubmitting(true);
    setError(null);

    try {
      await addDoc(collection(db, "monthlyExercises"), {
        exerciseId: selectedMonthExerciseId,
        month: targetMonth,
        year: targetYear,
        description: monthlyDescription.trim(),
        createdBy: userProfile.uid,
        createdAt: new Date().toISOString(),
      });

      setIsMonthlyModalOpen(false);
      setSelectedMonthExerciseId("");
      setMonthlyDescription("");
      fetchData();
    } catch (err) {
      console.error(err);
      setError("Fehler beim Zuweisen der Übung des Monats.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLeagueStatus = async (league: LeagueConfig) => {
    try {
      const leagueRef = doc(db, "leagues", league.id);
      await updateDoc(leagueRef, {
        isActive: !league.isActive,
        updatedAt: new Date().toISOString(),
      });
      setLeagues((prev) =>
        prev.map((l) =>
          l.id === league.id ? { ...l, isActive: !l.isActive } : l,
        ),
      );
    } catch (err) {
      console.error(err);
      setError("Fehler beim Ändern des Liga-Status.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col gap-8">
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 1. Ligen-Verwaltung */}
      <Paper className="p-6 shadow-md">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <div>
            <Typography
              variant="h5"
              className="font-bold flex items-center gap-2"
              color="text.primary"
            >
              <EmojiEventsIcon color="primary" /> Liga-Verwaltung
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Erstelle und steuere Solo-Performance Ligen oder Match-Ligen für
              Spieler.
            </Typography>
          </div>

          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setIsLeagueModalOpen(true)}
          >
            Neue Liga Anlegen
          </Button>
        </div>

        <Divider className="mb-4" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {leagues.map((league) => (
            <Card
              key={league.id}
              variant="outlined"
              className="flex flex-col justify-between"
            >
              <CardContent>
                <div className="flex justify-between items-start mb-2">
                  <Typography variant="h6" className="font-bold">
                    {league.title}
                  </Typography>
                  <Chip
                    label={
                      league.type === "performance"
                        ? "Performance League"
                        : "Match League (1v1)"
                    }
                    color={
                      league.type === "performance" ? "primary" : "secondary"
                    }
                    size="small"
                  />
                </div>

                <Typography
                  variant="body2"
                  className="text-gray-600 dark:text-gray-300 mb-3 whitespace-pre-line"
                >
                  {league.description}
                </Typography>

                {(league.startDate || league.endDate) && (
                  <Typography
                    variant="caption"
                    color="textSecondary"
                    className="block mb-2"
                  >
                    Laufzeit: {league.startDate || "Sofort"} bis{" "}
                    {league.endDate || "Unbefristet"}
                  </Typography>
                )}

                <FormControlLabel
                  control={
                    <Switch
                      checked={league.isActive}
                      onChange={() => handleToggleLeagueStatus(league)}
                      color="primary"
                    />
                  }
                  label={
                    league.isActive ? "Liga Aktiv" : "Liga Pausiert/Beendet"
                  }
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </Paper>

      {/* 2. Übung des Monats Verwaltung */}
      <Paper className="p-6 shadow-md">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <div>
            <Typography
              variant="h5"
              className="font-bold flex items-center gap-2"
              color="text.primary"
            >
              <CalendarMonthIcon color="primary" /> Übung des Monats (Planung)
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Lege die Monatsübung im Voraus fest und hinterlege Erklärungen.
            </Typography>
          </div>

          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setIsMonthlyModalOpen(true)}
          >
            Monatsübung Planen
          </Button>
        </div>

        <Divider className="mb-4" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {monthlyConfigs.map((m) => {
            const ex = exercises.find((e) => e.id === m.exerciseId);
            return (
              <Card key={m.id} variant="outlined">
                <CardContent>
                  <Typography
                    variant="caption"
                    color="primary"
                    className="font-bold block"
                  >
                    Monat {m.month} / {m.year}
                  </Typography>
                  <Typography variant="h6" className="font-bold mt-1">
                    {ex ? ex.title : "Übung"}
                  </Typography>
                  {m.description && (
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      className="mt-2 italic"
                    >
                      "{m.description}"
                    </Typography>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </Paper>

      {/* Modal: Neue Liga Anlegen */}
      <Dialog
        open={isLeagueModalOpen}
        onClose={() => setIsLeagueModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle className="font-bold">Neue Liga Erstellen</DialogTitle>
        <form onSubmit={handleCreateLeague}>
          <DialogContent dividers className="flex flex-col gap-4">
            <TextField
              label="Titel der Liga"
              variant="outlined"
              fullWidth
              required
              value={leagueTitle}
              onChange={(e) => setLeagueTitle(e.target.value)}
            />

            <TextField
              label="Beschreibung der Liga für Spieler"
              variant="outlined"
              fullWidth
              required
              multiline
              rows={3}
              value={leagueDescription}
              onChange={(e) => setLeagueDescription(e.target.value)}
              placeholder="Erkläre den Spielern kurz die Regeln und das Ziel dieser Liga..."
            />

            <FormControl fullWidth required>
              <InputLabel>Liga-Typ</InputLabel>
              <Select
                value={leagueType}
                label="Liga-Typ"
                onChange={(e) => setLeagueType(e.target.value as LeagueType)}
              >
                <MenuItem value="performance">
                  Performance League (Solo gegen eigenen Schnitt)
                </MenuItem>
                <MenuItem value="match">
                  Match League (1v1 Duelle mit TTR/ELO-System)
                </MenuItem>
              </Select>
            </FormControl>

            {leagueType === "performance" && (
              <FormControl fullWidth>
                <InputLabel id="league-exercises-label">
                  Gültige Übungen für diese Liga
                </InputLabel>
                <Select
                  labelId="league-exercises-label"
                  multiple
                  value={selectedExerciseIds}
                  onChange={(e) =>
                    setSelectedExerciseIds(
                      typeof e.target.value === "string"
                        ? e.target.value.split(",")
                        : e.target.value,
                    )
                  }
                  input={
                    <OutlinedInput label="Gültige Übungen für diese Liga" />
                  }
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {selected.map((exId) => {
                        const ex = exercises.find((e) => e.id === exId);
                        return (
                          <Chip
                            key={exId}
                            label={ex ? ex.title : exId}
                            size="small"
                          />
                        );
                      })}
                    </Box>
                  )}
                >
                  {exercises.map((ex) => (
                    <MenuItem key={ex.id} value={ex.id}>
                      {ex.title} ({ex.type})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <div className="grid grid-cols-2 gap-2">
              <TextField
                label="Startdatum (Optional)"
                type="date"
                slotProps={{
                  inputLabel: { shrink: true },
                }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <TextField
                label="Enddatum (Optional)"
                type="date"
                slotProps={{
                  inputLabel: { shrink: true },
                }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </DialogContent>

          <DialogActions className="p-4">
            <Button onClick={() => setIsLeagueModalOpen(false)}>
              Abbrechen
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={submitting}
            >
              {submitting ? "Speichert..." : "Liga Anlegen"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Modal: Übung des Monats Planen */}
      <Dialog
        open={isMonthlyModalOpen}
        onClose={() => setIsMonthlyModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle className="font-bold">
          Übung des Monats Festlegen
        </DialogTitle>
        <form onSubmit={handleCreateMonthlyExercise}>
          <DialogContent dividers className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-2">
              <TextField
                label="Monat (1-12)"
                type="number"
                required
                slotProps={{
                  htmlInput: { min: 1, max: 12 },
                }}
                value={targetMonth}
                onChange={(e) =>
                  setTargetMonth(parseInt(e.target.value, 10) || 1)
                }
              />
              <TextField
                label="Jahr"
                type="number"
                required
                value={targetYear}
                onChange={(e) =>
                  setTargetYear(
                    parseInt(e.target.value, 10) || new Date().getFullYear(),
                  )
                }
              />
            </div>

            <FormControl fullWidth required>
              <InputLabel>Übung auswählen</InputLabel>
              <Select
                value={selectedMonthExerciseId}
                label="Übung auswählen"
                onChange={(e) => setSelectedMonthExerciseId(e.target.value)}
              >
                {exercises.map((ex) => (
                  <MenuItem key={ex.id} value={ex.id}>
                    {ex.title} ({ex.type})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Spezifische Anmerkung / Herausforderung für diesen Monat"
              variant="outlined"
              multiline
              rows={2}
              value={monthlyDescription}
              onChange={(e) => setMonthlyDescription(e.target.value)}
              placeholder="z. B. Wer knackt diesen Monat die 800 Punkte Marke?"
            />
          </DialogContent>

          <DialogActions className="p-4">
            <Button onClick={() => setIsMonthlyModalOpen(false)}>
              Abbrechen
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={submitting}
            >
              {submitting ? "Speichert..." : "Monatsübung Speichern"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  );
};

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
import type { LeagueConfig, MonthlyExerciseConfig, LeagueType } from "../../types/league";
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
  Checkbox,
  ListItemText,
  OutlinedInput,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Box,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import StopIcon from "@mui/icons-material/Stop";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";

const MONTHS = [
  { value: 1, name: "Januar" },
  { value: 2, name: "Februar" },
  { value: 3, name: "März" },
  { value: 4, name: "April" },
  { value: 5, name: "Mai" },
  { value: 6, name: "Juni" },
  { value: 7, name: "Juli" },
  { value: 8, name: "August" },
  { value: 9, name: "September" },
  { value: 10, name: "Oktober" },
  { value: 11, name: "November" },
  { value: 12, name: "Dezember" },
];

export const AdminLeagueManager: React.FC = () => {
  const { userProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [leagues, setLeagues] = useState<LeagueConfig[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [monthlyConfigs, setMonthlyConfigs] = useState<MonthlyExerciseConfig[]>([]);

  // Filter-State für Ligen (alle, laufend, pausiert, beendet)
  const [leagueFilterStatus, setLeagueFilterStatus] = useState<string>("all");

  // Formular State für Ligen
  const [isEditingLeague, setIsEditingLeague] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<LeagueType>("performance");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isActive, setIsActive] = useState<boolean>(true);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);

  // Formular State für "Übung des Monats"
  const currentDate = new Date();
  const [monthlyExId, setMonthlyExId] = useState("");
  const [monthlyYear, setMonthlyYear] = useState<number>(currentDate.getFullYear());
  const [monthlyMonth, setMonthlyMonth] = useState<number>(currentDate.getMonth() + 1);
  const [monthlyDesc, setMonthlyDesc] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [lSnap, exSnap, mSnap] = await Promise.all([
        getDocs(collection(db, "leagues")),
        getDocs(collection(db, "exercises")),
        getDocs(collection(db, "monthlyExercises")),
      ]);

      const fetchedLeagues: LeagueConfig[] = [];
      lSnap.forEach((d) => {
        const data = d.data();
        fetchedLeagues.push({ id: d.id, ...data } as LeagueConfig);
      });

      const fetchedEx: Exercise[] = [];
      exSnap.forEach((d) => {
        const data = d.data();
        fetchedEx.push({ id: d.id, ...data } as Exercise);
      });

      const fetchedMonthly: MonthlyExerciseConfig[] = [];
      mSnap.forEach((d) => {
        const data = d.data();
        fetchedMonthly.push({ id: d.id, ...data } as MonthlyExerciseConfig);
      });

      setLeagues(fetchedLeagues);
      setExercises(fetchedEx);
      setMonthlyConfigs(fetchedMonthly);
    } catch (err) {
      console.error("Fehler beim Laden der Admin-Daten:", err);
      setError("Fehler beim Laden der Admin-Daten.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!title.trim()) {
      setError("Bitte gib einen Titel für die Liga an.");
      return;
    }

    try {
      if (isEditingLeague) {
        const leagueRef = doc(db, "leagues", isEditingLeague);
        await updateDoc(leagueRef, {
          title: title.trim(),
          description: description.trim(),
          type,
          startDate: startDate || null,
          endDate: endDate || null,
          isActive,
          exerciseIds: type === "performance" ? selectedExerciseIds : [],
          updatedAt: new Date().toISOString(),
        });
        setSuccess("Liga erfolgreich aktualisiert!");
      } else {
        await addDoc(collection(db, "leagues"), {
          title: title.trim(),
          description: description.trim(),
          type,
          startDate: startDate || null,
          endDate: endDate || null,
          isActive: true,
          createdBy: userProfile?.uid || "",
          exerciseIds: type === "performance" ? selectedExerciseIds : [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        setSuccess("Neue Liga erfolgreich erstellt!");
      }

      resetLeagueForm();
      fetchData();
    } catch (err) {
      console.error("Fehler beim Speichern der Liga:", err);
      setError("Fehler beim Speichern der Liga.");
    }
  };

  const handleEditLeague = (league: LeagueConfig) => {
    setIsEditingLeague(league.id);
    setTitle(league.title);
    setDescription(league.description || "");
    setType(league.type);
    setStartDate(league.startDate || "");
    setEndDate(league.endDate || "");
    setIsActive(league.isActive);
    setSelectedExerciseIds(league.exerciseIds || []);
  };

  const resetLeagueForm = () => {
    setIsEditingLeague(null);
    setTitle("");
    setDescription("");
    setType("performance");
    setStartDate("");
    setEndDate("");
    setIsActive(true);
    setSelectedExerciseIds([]);
  };

  const handleTerminateLeague = async (leagueId: string) => {
    if (!window.confirm("Möchtest du diese Liga wirklich endgültig beenden?")) return;
    try {
      const leagueRef = doc(db, "leagues", leagueId);
      await updateDoc(leagueRef, {
        isActive: false,
        endDate: new Date().toISOString().split("T")[0],
        updatedAt: new Date().toISOString(),
      });
      setSuccess("Liga wurde beendet.");
      fetchData();
    } catch (err) {
      console.error("Fehler beim Beenden der Liga:", err);
      setError("Fehler beim Beenden der Liga.");
    }
  };

  const handleDeleteLeague = async (leagueId: string) => {
    if (!window.confirm("Möchtest du diese Liga unwiderruflich löschen?")) return;
    try {
      await deleteDoc(doc(db, "leagues", leagueId));
      setSuccess("Liga gelöscht.");
      fetchData();
    } catch (err) {
      console.error("Fehler beim Löschen der Liga:", err);
      setError("Fehler beim Löschen der Liga.");
    }
  };

  const handleSaveMonthlyExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!monthlyExId) {
      setError("Bitte wähle eine Übung aus.");
      return;
    }

    try {
      const existing = monthlyConfigs.find(
        (m) => m.month === monthlyMonth && m.year === monthlyYear
      );

      if (existing) {
        const ref = doc(db, "monthlyExercises", existing.id);
        await updateDoc(ref, {
          exerciseId: monthlyExId,
          description: monthlyDesc.trim(),
        });
      } else {
        await addDoc(collection(db, "monthlyExercises"), {
          exerciseId: monthlyExId,
          year: monthlyYear,
          month: monthlyMonth,
          description: monthlyDesc.trim(),
          createdBy: userProfile?.uid || "",
          createdAt: new Date().toISOString(),
        });
      }

      setSuccess("Übung des Monats erfolgreich gespeichert!");
      setMonthlyExId("");
      setMonthlyDesc("");
      fetchData();
    } catch (err) {
      console.error("Fehler beim Speichern der Monatsübung:", err);
      setError("Fehler beim Speichern der Monatsübung.");
    }
  };

  const filteredLeagues = leagues.filter((l) => {
    if (leagueFilterStatus === "all") return true;
    if (leagueFilterStatus === "active") return l.isActive === true;
    if (leagueFilterStatus === "paused")
      return l.isActive === false && (!l.endDate || new Date(l.endDate) > new Date());
    if (leagueFilterStatus === "terminated") return l.isActive === false;
    return true;
  });

  if (loading) {
    return (
      <Box className="flex justify-center items-center p-8">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <Typography
          variant="h4"
          className="font-bold flex items-center gap-2"
          color="text.primary"
        >
          <EmojiEventsIcon fontSize="large" color="primary" /> Liga-Verwaltung (Admin)
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Erstelle, bearbeite und verwalte Trainingsligen und die monatlichen Challenges.
        </Typography>
      </div>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Sektion 1: Ligen erstellen / bearbeiten */}
      <Paper
        variant="outlined"
        sx={{ bgcolor: "background.paper", borderColor: "divider" }}
        className="p-4 sm:p-6 shadow-md flex flex-col gap-4"
      >
        <Typography variant="h6" className="font-bold" color="text.primary">
          {isEditingLeague ? "Liga bearbeiten" : "Neue Liga erstellen"}
        </Typography>

        <form onSubmit={handleSaveLeague} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              label="Titel der Liga"
              variant="outlined"
              fullWidth
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <FormControl fullWidth required>
              <InputLabel id="league-type-label">Ligatyp</InputLabel>
              <Select
                labelId="league-type-label"
                value={type}
                label="Ligatyp"
                onChange={(e) => setType(e.target.value as LeagueType)}
              >
                <MenuItem value="performance">
                  Performance League (Übungsbasiert)
                </MenuItem>
                <MenuItem value="match">Match League (1v1 ELO-Duell)</MenuItem>
              </Select>
            </FormControl>
          </div>

          <TextField
            label="Beschreibung (für Spieler sichtbar)"
            variant="outlined"
            multiline
            rows={2}
            fullWidth
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TextField
              label="Startdatum"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <TextField
              label="Enddatum"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <FormControl fullWidth>
              <InputLabel id="league-status-label">Status</InputLabel>
              <Select
                labelId="league-status-label"
                value={isActive ? "active" : "inactive"}
                label="Status"
                onChange={(e) => setIsActive(e.target.value === "active")}
              >
                <MenuItem value="active">Laufend / Aktiv</MenuItem>
                <MenuItem value="inactive">Pausiert / Beendet</MenuItem>
              </Select>
            </FormControl>
          </div>

          {type === "performance" && (
            <FormControl fullWidth>
              <InputLabel id="performance-exercises-label">
                Gewertete Übungen für Performance League
              </InputLabel>
              <Select
                labelId="performance-exercises-label"
                multiple
                value={selectedExerciseIds}
                onChange={(e) =>
                  setSelectedExerciseIds(e.target.value as string[])
                }
                input={
                  <OutlinedInput label="Gewertete Übungen für Performance League" />
                }
                renderValue={(selected) =>
                  selected
                    .map((id) => exercises.find((ex) => ex.id === id)?.title)
                    .filter(Boolean)
                    .join(", ")
                }
              >
                {exercises.map((ex) => (
                  <MenuItem key={ex.id} value={ex.id}>
                    <Checkbox
                      checked={selectedExerciseIds.indexOf(ex.id) > -1}
                    />
                    <ListItemText primary={ex.title} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <div className="flex gap-2 justify-end">
            {isEditingLeague && (
              <Button
                variant="outlined"
                color="inherit"
                onClick={resetLeagueForm}
              >
                Abbrechen
              </Button>
            )}
            <Button type="submit" variant="contained" color="primary">
              {isEditingLeague ? "Änderungen speichern" : "Liga erstellen"}
            </Button>
          </div>
        </form>
      </Paper>

      {/* Sektion 2: Bestehende Ligen verwalten & filtern */}
      <Paper
        variant="outlined"
        sx={{ bgcolor: "background.paper", borderColor: "divider" }}
        className="p-4 sm:p-6 shadow-md flex flex-col gap-4"
      >
        <div className="flex justify-between items-center flex-wrap gap-4">
          <Typography variant="h6" className="font-bold" color="text.primary">
            Bestehende Ligen
          </Typography>

          <FormControl size="small" className="w-48">
            <InputLabel id="league-filter-status-label">
              Filter Status
            </InputLabel>
            <Select
              labelId="league-filter-status-label"
              value={leagueFilterStatus}
              label="Filter Status"
              onChange={(e) => setLeagueFilterStatus(e.target.value)}
            >
              <MenuItem value="all">Alle Ligen</MenuItem>
              <MenuItem value="active">Nur Laufende</MenuItem>
              <MenuItem value="paused">Pausiert</MenuItem>
              <MenuItem value="terminated">Beendet</MenuItem>
            </Select>
          </FormControl>
        </div>

        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell className="font-bold">Titel</TableCell>
                <TableCell className="font-bold">Typ</TableCell>
                <TableCell className="font-bold">Status</TableCell>
                <TableCell className="font-bold">Laufzeit</TableCell>
                <TableCell align="right" className="font-bold">
                  Aktionen
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLeagues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" className="py-6">
                    <Typography variant="body2" color="text.secondary">
                      Keine Ligen gefunden.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeagues.map((league) => (
                  <TableRow key={league.id} hover>
                    <TableCell className="font-semibold">
                      <Typography
                        variant="subtitle1"
                        className="font-bold text-base"
                        color="text.primary"
                      >
                        {league.title}
                      </Typography>
                      {league.description && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          className="mt-1"
                        >
                          {league.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          league.type === "performance"
                            ? "Performance"
                            : "1v1 Match"
                        }
                        size="small"
                        color={
                          league.type === "performance"
                            ? "primary"
                            : "secondary"
                        }
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={league.isActive ? "Laufend" : "Beendet/Pausiert"}
                        size="small"
                        color={league.isActive ? "success" : "default"}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {league.startDate || "Unbefristet"} bis{" "}
                        {league.endDate || "Offen"}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<EditIcon />}
                          onClick={() => handleEditLeague(league)}
                        />
                        {league.isActive && (
                          <Button
                            size="small"
                            color="warning"
                            variant="outlined"
                            startIcon={<StopIcon />}
                            onClick={() => handleTerminateLeague(league.id)}
                          />
                        )}
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          startIcon={<DeleteIcon />}
                          onClick={() => handleDeleteLeague(league.id)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Sektion 3: Übung des Monats im Voraus planen */}
      <Paper
        variant="outlined"
        sx={{ bgcolor: "background.paper", borderColor: "divider" }}
        className="p-4 sm:p-6 shadow-md flex flex-col gap-4"
      >
        <Typography
          variant="h6"
          className="font-bold flex items-center gap-2"
          color="text.primary"
        >
          <CalendarMonthIcon color="primary" /> Übung des Monats planen
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Lege fest, welche Übung in einem bestimmten Monat als offizielle Monats-Challenge gilt.
        </Typography>

        <form
          onSubmit={handleSaveMonthlyExercise}
          className="flex flex-col gap-4 mt-2"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormControl fullWidth required>
              <InputLabel id="select-monthly-exercise-label">
                Übung auswählen
              </InputLabel>
              <Select
                labelId="select-monthly-exercise-label"
                value={monthlyExId}
                label="Übung auswählen"
                onChange={(e) => setMonthlyExId(e.target.value)}
              >
                {exercises.map((ex) => (
                  <MenuItem key={ex.id} value={ex.id}>
                    {ex.title} ({ex.type})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel id="select-monthly-month-label">Monat</InputLabel>
              <Select
                labelId="select-monthly-month-label"
                value={monthlyMonth}
                label="Monat"
                onChange={(e) => setMonthlyMonth(Number(e.target.value))}
              >
                {MONTHS.map((m) => (
                  <MenuItem key={m.value} value={m.value}>
                    {m.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel id="select-monthly-year-label">Jahr</InputLabel>
              <Select
                labelId="select-monthly-year-label"
                value={monthlyYear}
                label="Jahr"
                onChange={(e) => setMonthlyYear(Number(e.target.value))}
              >
                {[2025, 2026, 2027, 2028].map((y) => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>

          <TextField
            label="Monatsspezifische Beschreibung / Zielsetzung"
            variant="outlined"
            fullWidth
            value={monthlyDesc}
            onChange={(e) => setMonthlyDesc(e.target.value)}
          />

          <div className="flex justify-end">
            <Button type="submit" variant="contained" color="primary">
              Monatsübung speichern
            </Button>
          </div>
        </form>
      </Paper>
    </Box>
  );
};
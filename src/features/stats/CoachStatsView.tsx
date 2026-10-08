import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import type { UserProfile } from "../../types/user";
import type { PlayerGroup } from "../../types/group";
import type {
  TestResult,
  Exercise,
  ExerciseResultType,
} from "../../types/exercise";
import type { DateRangeOption } from "../../types/stats";
import { getDateRangeBounds } from "../../types/stats";
import { TrendBadge } from "../../components/stats/TrendBadge";
import {
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Chip,
} from "@mui/material";
import AssessmentIcon from "@mui/icons-material/Assessment";
import GroupsIcon from "@mui/icons-material/Groups";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import PersonIcon from "@mui/icons-material/Person";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

interface PlayerStatSummary {
  user: UserProfile;
  totalCompleted: number;
  avgPoints: number;
  maxPoints: number;
  lastActive: string | null;
}

// Hilfsfunktion zur Ermittlung der korrekten Feldbezeichnung
const getScoreLabel = (resultType?: ExerciseResultType): string => {
  switch (resultType) {
    case "attempts":
      return "Versuche / Darts";
    case "hits":
      return "Treffer";
    case "highestScore":
      return "Highscore";
    case "points":
    default:
      return "Punkte";
  }
};

export const CoachStatsView: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRangeOption>("30days");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>("all");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("all");

  const [players, setPlayers] = useState<UserProfile[]>([]);
  const [groups, setGroups] = useState<PlayerGroup[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [allResults, setAllResults] = useState<TestResult[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [usersSnap, groupsSnap, exercisesSnap, resultsSnap] =
        await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "playerGroups")),
          getDocs(collection(db, "exercises")),
          getDocs(collection(db, "testResults")),
        ]);

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

      const fetchedExercises: Exercise[] = [];
      exercisesSnap.forEach((d) => {
        const data = d.data();
        fetchedExercises.push({ id: d.id, ...data } as Exercise);
      });

      const fetchedResults: TestResult[] = [];
      resultsSnap.forEach((d) => {
        const data = d.data();
        delete data.id;
        fetchedResults.push({ id: d.id, ...data } as TestResult);
      });

      setPlayers(fetchedPlayers);
      setGroups(fetchedGroups);
      setExercises(fetchedExercises);
      setAllResults(fetchedResults);
    } catch (err) {
      console.error(err);
      setError("Fehler beim Laden der Kader-Statistiken.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getDisplayName = (u?: UserProfile) => {
    if (!u) return "Unbekannter Spieler";
    return u.nickname || u.realName || u.email;
  };

  // Hilfsfunktion zur Ermittlung des Übungsnamens
  const getExerciseName = (
    exerciseId?: string,
    testId?: string,
    fallbackType?: string
  ) => {
    const idToFind = exerciseId || testId;
    if (idToFind) {
      const found = exercises.find((e) => e.id === idToFind);
      if (found) return found.title;
    }
    return fallbackType || "Allgemeine Übung";
  };

  // Hilfsfunktion zur Ermittlung der eindeutigen Übungs-ID
  const getResultExerciseId = (res: TestResult) => {
    return (res as any).exerciseId || res.testId || "unknown";
  };

  // Eindeutige Liste aller im System absolvierten konkreten Übungen
  const availableExercises = Array.from(
    new Set(allResults.map((r) => getResultExerciseId(r)))
  ).map((id) => {
    const sampleRes = allResults.find((r) => getResultExerciseId(r) === id);
    return {
      id,
      name: getExerciseName(
        (sampleRes as any)?.exerciseId,
        sampleRes?.testId,
        sampleRes?.exerciseType
      ),
    };
  });

  // Konkretes Übungsobjekt aus der Übungsbibliothek laden
  const selectedExerciseObj = exercises.find(
    (e) => e.id === selectedExerciseId
  );

  // 1. Filtern nach Gruppe & Einzelspieler
  const activeGroup = groups.find((g) => g.id === selectedGroupId);
  const filteredPlayers = players.filter((p) => {
    if (selectedGroupId !== "all") {
      const isMember = activeGroup ? activeGroup.memberIds?.includes(p.uid) || activeGroup.memberIds?.includes(p.uid) : true;
      if (!isMember) return false;
    }
    if (selectedPlayerId !== "all") {
      if (p.uid !== selectedPlayerId) return false;
    }
    return true;
  });

  // 2. Filtern nach Datum & konkreter Übung
  const { start, end } = getDateRangeBounds(dateRange);
  const filteredResults = allResults.filter((res) => {
    const isMember = filteredPlayers.some((p) => p.uid === res.userId);
    if (!isMember) return false;

    // Zeit-Filter
    const resDate = new Date(res.completedAt);
    if (start && resDate < start) return false;
    if (resDate > end) return false;

    // Konkreter Übungs-Filter
    if (selectedExerciseId !== "all") {
      if (getResultExerciseId(res) !== selectedExerciseId) return false;
    }

    return true;
  });

  // 3. Zusammenfassung pro Spieler berechnen
  const isLowerBetter = selectedExerciseObj?.scoreDirection === "lower_is_better";

  const playerSummaries: PlayerStatSummary[] = filteredPlayers.map((player) => {
    const playerRes = filteredResults.filter((r) => r.userId === player.uid);
    const totalCompleted = playerRes.length;
    const avgPoints =
      totalCompleted > 0
        ? Math.round(
            playerRes.reduce((acc, r) => acc + r.totalPoints, 0) /
              totalCompleted
          )
        : 0;

    const maxPoints =
      totalCompleted > 0
        ? isLowerBetter
          ? Math.min(...playerRes.map((r) => r.totalPoints))
          : Math.max(...playerRes.map((r) => r.totalPoints))
        : 0;

    const sortedDates = [...playerRes].sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );
    const lastActive =
      sortedDates.length > 0 ? sortedDates[0].completedAt : null;

    return {
      user: player,
      totalCompleted,
      avgPoints,
      maxPoints,
      lastActive,
    };
  });

  // 4. BarChart-Daten für die Übersicht (Alle Übungen)
  const barChartData = playerSummaries
    .filter((s) => s.totalCompleted > 0)
    .map((s) => ({
      name: getDisplayName(s.user),
      Übungen: s.totalCompleted,
      Durchschnitt: s.avgPoints,
    }));

  // 5. LineChart-Daten für die Verlaufsansicht einer konkreten Übung
  const sortedFilteredResults = [...filteredResults].sort(
    (a, b) =>
      new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
  );

  const lineChartData = sortedFilteredResults.map((r) => {
    const playerObj = players.find((p) => p.uid === r.userId);
    return {
      date: new Date(r.completedAt).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
      points: r.totalPoints,
      player: getDisplayName(playerObj),
    };
  });

  // Sortierte Durchgänge für die Historie-Tabelle bei Einzelauswahl
  const sortedHistoryResults = [...filteredResults].sort(
    (a, b) =>
      new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );

  // Gesamtkennzahlen
  const totalRosterCompleted = filteredResults.length;
  const activePlayersCount = playerSummaries.filter(
    (s) => s.totalCompleted > 0
  ).length;
  const rosterAvg =
    totalRosterCompleted > 0
      ? Math.round(
          filteredResults.reduce((acc, r) => acc + r.totalPoints, 0) /
            totalRosterCompleted
        )
      : 0;

  const rosterBestScore =
    totalRosterCompleted > 0
      ? isLowerBetter
        ? Math.min(...filteredResults.map((r) => r.totalPoints))
        : Math.max(...filteredResults.map((r) => r.totalPoints))
      : 0;

  if (loading) {
    return (
      <Box className="flex justify-center items-center p-8">
        <CircularProgress />
      </Box>
    );
  }

  // Liste der Spieler, die im Dropdown zur Auswahl stehen
  const selectablePlayers = players.filter((p) => {
    if (selectedGroupId === "all") return true;
    return activeGroup
      ? activeGroup.memberIds?.includes(p.uid) || activeGroup.memberIds?.includes(p.uid)
      : true;
  });

  return (
    <Box className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header & Filter */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <Typography
            variant="h4"
            component="h1"
            className="font-bold flex items-center gap-2"
            color="text.primary"
          >
            <AssessmentIcon fontSize="large" color="primary" /> Kader- &
            Einzelstatistiken
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Analysiere Trainingsfleiß und Leistungsentwicklung deiner Mannschaften
            und Einzelspieler.
          </Typography>
        </div>

        <div className="flex gap-2 flex-wrap w-full lg:w-auto">
          {/* Spieler-Filter Dropdown */}
          <FormControl size="small" className="w-full sm:w-auto min-w-[180px]">
            <InputLabel id="select-player-filter-label">Spieler Filtern</InputLabel>
            <Select
              labelId="select-player-filter-label"
              value={selectedPlayerId}
              label="Spieler Filtern"
              onChange={(e) => setSelectedPlayerId(e.target.value)}
            >
              <MenuItem value="all">Alle Spieler</MenuItem>
              {selectablePlayers.map((p) => (
                <MenuItem key={p.uid} value={p.uid}>
                  {getDisplayName(p)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Übungs-Filter */}
          <FormControl size="small" className="w-full sm:w-auto min-w-[180px]">
            <InputLabel id="select-exercise-filter-label">
              Übung Filtern
            </InputLabel>
            <Select
              labelId="select-exercise-filter-label"
              value={selectedExerciseId}
              label="Übung Filtern"
              onChange={(e) => setSelectedExerciseId(e.target.value)}
            >
              <MenuItem value="all">Alle Übungen</MenuItem>
              {availableExercises.map((ex) => (
                <MenuItem key={ex.id} value={ex.id}>
                  {ex.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Gruppen-Filter */}
          <FormControl size="small" className="w-full sm:w-auto min-w-[180px]">
            <InputLabel id="select-group-filter-label">Gruppe Filtern</InputLabel>
            <Select
              labelId="select-group-filter-label"
              value={selectedGroupId}
              label="Gruppe Filtern"
              onChange={(e) => {
                setSelectedGroupId(e.target.value);
                setSelectedPlayerId("all");
              }}
            >
              <MenuItem value="all">Alle Gruppen (Gesamtkader)</MenuItem>
              {groups.map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Zeit-Filter */}
          <FormControl size="small" className="w-full sm:w-auto min-w-[180px]">
            <InputLabel id="select-date-filter-label">Zeitraum Filter</InputLabel>
            <Select
              labelId="select-date-filter-label"
              value={dateRange}
              label="Zeitraum Filter"
              onChange={(e) => setDateRange(e.target.value as DateRangeOption)}
            >
              <MenuItem value="7days">Letzte 7 Tage</MenuItem>
              <MenuItem value="30days">Letzte 30 Tage</MenuItem>
              <MenuItem value="90days">Letzte 90 Tage</MenuItem>
              <MenuItem value="thisYear">Aktuelles Jahr (2026)</MenuItem>
              <MenuItem value="all">Gesamter Zeitraum</MenuItem>
            </Select>
          </FormControl>
        </div>
      </div>

      {error && <Alert severity="error">{error}</Alert>}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Paper
          variant="outlined"
          sx={{ bgcolor: "background.paper", borderColor: "divider" }}
          className="p-4 flex items-center gap-4 shadow-sm"
        >
          {selectedPlayerId === "all" ? (
            <GroupsIcon color="primary" sx={{ fontSize: 40 }} />
          ) : (
            <PersonIcon color="primary" sx={{ fontSize: 40 }} />
          )}
          <div>
            <Typography
              variant="caption"
              color="text.secondary"
              className="font-bold block"
            >
              {selectedPlayerId === "all"
                ? "Aktive Spieler / Auswahl"
                : "Ausgewählter Spieler"}
            </Typography>
            <Typography
              variant="h5"
              className="font-bold"
              color="text.primary"
            >
              {selectedPlayerId === "all"
                ? `${activePlayersCount} / ${filteredPlayers.length}`
                : getDisplayName(filteredPlayers[0])}
            </Typography>
          </div>
        </Paper>

        <Paper
          variant="outlined"
          sx={{ bgcolor: "background.paper", borderColor: "divider" }}
          className="p-4 flex items-center gap-4 shadow-sm"
        >
          <CheckCircleOutlinedIcon color="secondary" sx={{ fontSize: 40 }} />
          <div>
            <Typography
              variant="caption"
              color="text.secondary"
              className="font-bold block"
            >
              {selectedExerciseId === "all"
                ? "Absolvierte Einheiten"
                : "Durchgänge der Übung"}
            </Typography>
            <Typography
              variant="h5"
              className="font-bold"
              color="text.primary"
            >
              {totalRosterCompleted}
            </Typography>
          </div>
        </Paper>

        <Paper
          variant="outlined"
          sx={{ bgcolor: "background.paper", borderColor: "divider" }}
          className="p-4 flex items-center gap-4 shadow-sm"
        >
          <TrendingUpIcon color="warning" sx={{ fontSize: 40 }} />
          <div>
            <Typography
              variant="caption"
              color="text.secondary"
              className="font-bold block"
            >
              Ø {getScoreLabel(selectedExerciseObj?.resultType)}
            </Typography>
            <Typography
              variant="h5"
              className="font-bold"
              color="text.primary"
            >
              {rosterAvg}
            </Typography>
          </div>
        </Paper>

        <Paper
          variant="outlined"
          sx={{ bgcolor: "background.paper", borderColor: "divider" }}
          className="p-4 flex items-center gap-4 shadow-sm"
        >
          <EmojiEventsIcon color="error" sx={{ fontSize: 40 }} />
          <div>
            <Typography
              variant="caption"
              color="text.secondary"
              className="font-bold block"
            >
              Bestwert ({isLowerBetter ? "Niedrigster Wert" : "Höchstwert"})
            </Typography>
            <Typography
              variant="h5"
              className="font-bold"
              color="text.primary"
            >
              {rosterBestScore}
            </Typography>
          </div>
        </Paper>
      </div>

      {/* Dynamic Chart */}
      <Paper
        variant="outlined"
        sx={{ bgcolor: "background.paper", borderColor: "divider" }}
        className="p-4 sm:p-6 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
          <Typography
            variant="h6"
            className="font-bold flex items-center gap-2"
            color="text.primary"
          >
            <FitnessCenterIcon color="primary" />
            {selectedExerciseId === "all"
              ? "Leistungs- & Aktivitätsansicht im Kader"
              : `Verlauf: ${selectedExerciseObj?.title || "Übung"}`}
          </Typography>

          {selectedExerciseObj?.scoreDirection && (
            <Chip
              label={
                selectedExerciseObj.scoreDirection === "lower_is_better"
                  ? "Niedrigerer Wert ist besser"
                  : "Höherer Wert ist besser"
              }
              size="small"
              color="info"
              variant="outlined"
            />
          )}
        </div>

        {filteredResults.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            className="italic text-center py-8"
          >
            Im gewählten Zeitraum wurden keine Übungsergebnisse für diese
            Filterkombination erfasst.
          </Typography>
        ) : selectedExerciseId !== "all" ? (
          <Box className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineChartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" stroke="currentColor" />
                <YAxis stroke="currentColor" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(25, 25, 35, 0.95)",
                    borderRadius: "8px",
                    border: "1px solid #444",
                    color: "#fff",
                  }}
                  formatter={(value: any, _: any, props: any) => [
                    `${value} ${getScoreLabel(selectedExerciseObj?.resultType)}`,
                    selectedPlayerId === "all"
                      ? `Spieler: ${props.payload.player}`
                      : "Ergebnis",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="points"
                  name={getScoreLabel(selectedExerciseObj?.resultType)}
                  stroke="#5156B0"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        ) : (
          <Box className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" stroke="currentColor" />
                <YAxis stroke="currentColor" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(25, 25, 35, 0.95)",
                    borderRadius: "8px",
                    border: "1px solid #444",
                    color: "#fff",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="Übungen"
                  fill="#5156B0"
                  name="Absolvierte Übungen"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="Durchschnitt"
                  fill="#2e7d32"
                  name="Ø Punkte"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Paper>

      {/* Tabellenansicht */}
      {selectedExerciseId !== "all" ? (
        <Paper
          variant="outlined"
          sx={{ bgcolor: "background.paper", borderColor: "divider" }}
          className="shadow-sm overflow-hidden"
        >
          <Box className="p-4 border-b border-divider">
            <Typography
              variant="h6"
              className="font-bold"
              color="text.primary"
            >
              Historie der Durchgänge: {selectedExerciseObj?.title || "Übung"}
            </Typography>
          </Box>

          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: "action.hover" }}>
                <TableRow>
                  <TableCell className="font-bold">Datum & Uhrzeit</TableCell>
                  <TableCell className="font-bold">Spieler</TableCell>
                  <TableCell className="font-bold" align="center">
                    {getScoreLabel(selectedExerciseObj?.resultType)}
                  </TableCell>
                  <TableCell className="font-bold" align="left">
                    Notizen / Anmerkungen
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedHistoryResults.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      align="center"
                      className="py-6 italic"
                    >
                      <Typography variant="body2" color="text.secondary">
                        Keine Einzelergebnisse im gewählten Zeitraum vorhanden.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedHistoryResults.map((res) => {
                    const playerObj = players.find((p) => p.uid === res.userId);
                    return (
                      <TableRow key={res.id} hover>
                        <TableCell>
                          <Typography variant="body2" color="text.primary">
                            {new Date(res.completedAt).toLocaleString("de-DE", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar
                              src={playerObj?.photoURL}
                              sx={{
                                width: 24,
                                height: 24,
                                bgcolor: "primary.main",
                              }}
                            >
                              {getDisplayName(playerObj).substring(0, 1)}
                            </Avatar>
                            <Typography
                              variant="body2"
                              className="font-medium"
                              color="text.primary"
                            >
                              {getDisplayName(playerObj)}
                            </Typography>
                          </div>
                        </TableCell>
                        <TableCell align="center">
                          <Typography
                            variant="body2"
                            className="font-bold"
                            color="primary.main"
                          >
                            {res.totalPoints}
                          </Typography>
                        </TableCell>
                        <TableCell align="left">
                          {res.playerNote ? (
                            <Typography variant="body2" color="text.primary">
                              {res.playerNote}
                            </Typography>
                          ) : (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              className="italic"
                            >
                              Keine Notiz
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ) : (
        <Paper
          variant="outlined"
          sx={{ bgcolor: "background.paper", borderColor: "divider" }}
          className="shadow-sm overflow-hidden"
        >
          <Box className="p-4 border-b border-divider">
            <Typography
              variant="h6"
              className="font-bold"
              color="text.primary"
            >
              Einzelübersicht Spieler
            </Typography>
          </Box>

          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: "action.hover" }}>
                <TableRow>
                  <TableCell className="font-bold">Spieler</TableCell>
                  <TableCell className="font-bold" align="center">
                    Absolvierte Übungen
                  </TableCell>
                  <TableCell className="font-bold" align="center">
                    Durchschnitt
                  </TableCell>
                  <TableCell className="font-bold" align="center">
                    Form / Tendenz
                  </TableCell>
                  <TableCell className="font-bold" align="center">
                    Bestwert
                  </TableCell>
                  <TableCell className="font-bold" align="right">
                    Zuletzt aktiv
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {playerSummaries.map((summary) => {
                  const playerScores = filteredResults
                    .filter((r) => r.userId === summary.user.uid)
                    .sort(
                      (a, b) =>
                        new Date(a.completedAt).getTime() -
                        new Date(b.completedAt).getTime()
                    )
                    .map((r) => r.totalPoints);

                  const isSelected = selectedPlayerId === summary.user.uid;

                  return (
                    <TableRow
                      key={summary.user.uid}
                      hover
                      className="cursor-pointer"
                      selected={isSelected}
                      onClick={() => {
                        if (selectedPlayerId === summary.user.uid) {
                          setSelectedPlayerId("all");
                        } else {
                          setSelectedPlayerId(summary.user.uid);
                        }
                      }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={summary.user.photoURL}
                            sx={{
                              width: 32,
                              height: 32,
                              bgcolor: "primary.main",
                            }}
                          >
                            {getDisplayName(summary.user).substring(0, 1)}
                          </Avatar>
                          <div>
                            <Typography
                              variant="body2"
                              className="font-bold hover:underline"
                              color="primary.main"
                            >
                              {getDisplayName(summary.user)}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {summary.user.email}
                            </Typography>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={summary.totalCompleted}
                          color={
                            summary.totalCompleted > 0 ? "primary" : "default"
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell
                        align="center"
                        className="font-semibold"
                      >
                        <Typography variant="body2" color="text.primary">
                          {summary.avgPoints}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {playerScores.length >= 2 ? (
                          <TrendBadge scores={playerScores} />
                        ) : (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            className="italic"
                          >
                            Zu wenig Daten
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" color="text.primary">
                          {summary.maxPoints}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {summary.lastActive ? (
                          <Typography variant="body2" color="text.primary">
                            {new Date(summary.lastActive).toLocaleDateString(
                              "de-DE",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              }
                            )}
                          </Typography>
                        ) : (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            className="italic"
                          >
                            Nie
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
};
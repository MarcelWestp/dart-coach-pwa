import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { UserProfile } from '../../types/user';
import type { PlayerGroup } from '../../types/group';
import type { TestResult } from '../../types/exercise';
import type { DateRangeOption } from '../../types/stats';
import { getDateRangeBounds } from '../../types/stats';
import { TrendBadge } from '../../components/stats/TrendBadge';
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
  Chip 
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import GroupsIcon from '@mui/icons-material/Groups';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend 
} from 'recharts';

interface PlayerStatSummary {
  user: UserProfile;
  totalCompleted: number;
  avgPoints: number;
  maxPoints: number;
  lastActive: string | null;
}

export const CoachStatsView: React.FC = () => {

  const [dateRange, setDateRange] = useState<DateRangeOption>('30days');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [selectedExerciseType, setSelectedExerciseType] = useState<string>('all');

  const [players, setPlayers] = useState<UserProfile[]>([]);
  const [groups, setGroups] = useState<PlayerGroup[]>([]);
  const [allResults, setAllResults] = useState<TestResult[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [usersSnap, groupsSnap, resultsSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'playerGroups')),
        getDocs(collection(db, 'testResults'))
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

      const fetchedResults: TestResult[] = [];
      resultsSnap.forEach((d) => {
        const data = d.data();
        delete data.id;
        fetchedResults.push({ id: d.id, ...data } as TestResult);
      });

      setPlayers(fetchedPlayers);
      setGroups(fetchedGroups);
      setAllResults(fetchedResults);
    } catch (err) {
      console.error(err);
      setError('Fehler beim Laden der Kader-Statistiken.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Unique Liste aller im System absolvierten Übungstypen
  const availableExerciseTypes = Array.from(
    new Set(allResults.map((r) => r.exerciseType || 'Allgemeine Übung'))
  );

  // 1. Filtern nach Gruppe
  const activeGroup = groups.find((g) => g.id === selectedGroupId);
  const filteredPlayers = players.filter((p) => {
    if (selectedGroupId === 'all') return true;
    return activeGroup ? activeGroup.memberIds.includes(p.uid) : true;
  });

  // 2. Filtern nach Datum & Übungstyp
  const { start, end } = getDateRangeBounds(dateRange);
  const filteredResults = allResults.filter((res) => {
    const isMember = filteredPlayers.some((p) => p.uid === res.userId);
    if (!isMember) return false;

    // Zeit-Filter
    const resDate = new Date(res.completedAt);
    if (start && resDate < start) return false;
    if (resDate > end) return false;

    // Übungs-Filter
    if (selectedExerciseType !== 'all') {
      const exType = res.exerciseType || 'Allgemeine Übung';
      if (exType !== selectedExerciseType) return false;
    }

    return true;
  });

  // 3. Zusammenfassung pro Spieler berechnen
  const playerSummaries: PlayerStatSummary[] = filteredPlayers.map((player) => {
    const playerRes = filteredResults.filter((r) => r.userId === player.uid);
    const totalCompleted = playerRes.length;
    const avgPoints = totalCompleted > 0
      ? Math.round(playerRes.reduce((acc, r) => acc + r.totalPoints, 0) / totalCompleted)
      : 0;
    const maxPoints = totalCompleted > 0
      ? Math.max(...playerRes.map((r) => r.totalPoints))
      : 0;

    const sortedDates = [...playerRes].sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );
    const lastActive = sortedDates.length > 0 ? sortedDates[0].completedAt : null;

    return {
      user: player,
      totalCompleted,
      avgPoints,
      maxPoints,
      lastActive,
    };
  });

  // 4. Daten für das Vergleichs-Diagramm
  const chartData = playerSummaries
    .filter((s) => s.totalCompleted > 0)
    .map((s) => ({
      name: s.user.nickname || s.user.realName || 'Spieler',
      Übungen: s.totalCompleted,
      Durchschnitt: s.avgPoints,
    }));

  // Gesamtkennzahlen
  const totalRosterCompleted = filteredResults.length;
  const activePlayersCount = playerSummaries.filter((s) => s.totalCompleted > 0).length;
  const rosterAvg = totalRosterCompleted > 0
    ? Math.round(filteredResults.reduce((acc, r) => acc + r.totalPoints, 0) / totalRosterCompleted)
    : 0;

  const getDisplayName = (u: UserProfile) => u.nickname || u.realName || u.email;

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col gap-6">
      {/* Header & Filter */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <Typography variant="h4" component="h1" className="font-bold flex items-center gap-2">
            <AssessmentIcon fontSize="large" color="primary" /> Kader- & Gruppen-Statistiken
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Analysiere Trainingsfleiß und Leistungsentwicklung deiner Mannschaften und Einzelübungen.
          </Typography>
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* Übungs-Filter */}
          <FormControl size="small" className="min-w-[180px]">
            <InputLabel>Übung Filtern</InputLabel>
            <Select
              value={selectedExerciseType}
              label="Übung Filtern"
              onChange={(e) => setSelectedExerciseType(e.target.value)}
            >
              <MenuItem value="all">Alle Übungen</MenuItem>
              {availableExerciseTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Gruppen-Filter */}
          <FormControl size="small" className="min-w-[180px]">
            <InputLabel>Gruppe Filtern</InputLabel>
            <Select
              value={selectedGroupId}
              label="Gruppe Filtern"
              onChange={(e) => setSelectedGroupId(e.target.value)}
            >
              <MenuItem value="all">Alle Spieler (Gesamtkader)</MenuItem>
              {groups.map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Zeit-Filter */}
          <FormControl size="small" className="min-w-[180px]">
            <InputLabel>Zeitraum Filter</InputLabel>
            <Select
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Paper className="p-4 flex items-center gap-4 shadow-sm">
          <GroupsIcon color="primary" sx={{ fontSize: 40 }} />
          <div>
            <Typography variant="caption" color="textSecondary" className="font-bold block">
              Aktive Spieler / Kader
            </Typography>
            <Typography variant="h5" className="font-bold">
              {activePlayersCount} / {filteredPlayers.length}
            </Typography>
          </div>
        </Paper>

        <Paper className="p-4 flex items-center gap-4 shadow-sm">
          <CheckCircleOutlinedIcon color="secondary" sx={{ fontSize: 40 }} />
          <div>
            <Typography variant="caption" color="textSecondary" className="font-bold block">
              {selectedExerciseType === 'all' ? 'Absolvierte Einheiten' : 'Durchgänge der Übung'}
            </Typography>
            <Typography variant="h5" className="font-bold">
              {totalRosterCompleted}
            </Typography>
          </div>
        </Paper>

        <Paper className="p-4 flex items-center gap-4 shadow-sm">
          <TrendingUpIcon color="warning" sx={{ fontSize: 40 }} />
          <div>
            <Typography variant="caption" color="textSecondary" className="font-bold block">
              Kader-Durchschnitt (Score)
            </Typography>
            <Typography variant="h5" className="font-bold">
              {rosterAvg} Pkt.
            </Typography>
          </div>
        </Paper>
      </div>

      {/* Chart: Spielervergleich */}
      <Paper className="p-6 shadow-sm">
        <Typography variant="h6" className="font-bold mb-4 flex items-center gap-2">
          <FitnessCenterIcon color="primary" />
          {selectedExerciseType === 'all'
            ? 'Leistungs- & Aktivitätsvergleich im Kader'
            : `Kader-Vergleich für: ${selectedExerciseType}`}
        </Typography>
        {chartData.length === 0 ? (
          <Typography variant="body2" color="textSecondary" className="italic text-center py-8">
            Im gewählten Zeitraum wurden keine Übungsergebnisse für diese Filterkombination erfasst.
          </Typography>
        ) : (
          <Box className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Übungen" fill="#1976d2" name="Absolvierte Übungen" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Durchschnitt" fill="#2e7d32" name="Ø Punkte" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Paper>

      {/* Detail-Tabelle pro Spieler */}
      <Paper className="shadow-sm overflow-hidden">
        <Box className="p-4 border-b">
          <Typography variant="h6" className="font-bold">
            {selectedExerciseType === 'all' 
              ? 'Einzelübersicht Spieler' 
              : `Auswertung pro Spieler für: ${selectedExerciseType}`}
          </Typography>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell className="font-bold">Spieler</TableCell>
                <TableCell className="font-bold" align="center">Absolvierte Übungen</TableCell>
                <TableCell className="font-bold" align="center">Ø Punkte</TableCell>
                <TableCell className="font-bold" align="center">Form / Tendenz</TableCell>
                <TableCell className="font-bold" align="center">Höchstwert</TableCell>
                <TableCell className="font-bold" align="right">Zuletzt aktiv</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {playerSummaries.map((summary) => {
                const playerScores = filteredResults
                  .filter((r) => r.userId === summary.user.uid)
                  .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
                  .map((r) => r.totalPoints);

                return (
                  <TableRow key={summary.user.uid} hover>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar src={summary.user.photoURL} sx={{ width: 32, height: 32 }}>
                          {getDisplayName(summary.user).substring(0, 1)}
                        </Avatar>
                        <div>
                          <Typography variant="body2" className="font-bold">
                            {getDisplayName(summary.user)}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {summary.user.email}
                          </Typography>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={summary.totalCompleted} 
                        color={summary.totalCompleted > 0 ? 'primary' : 'default'} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell align="center" className="font-semibold">
                      {summary.avgPoints} Pkt.
                    </TableCell>
                    <TableCell align="center">
                      {playerScores.length >= 2 ? (
                        <TrendBadge scores={playerScores} />
                      ) : (
                        <Typography variant="caption" color="textSecondary" className="italic">
                          Zu wenig Daten
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {summary.maxPoints} Pkt.
                    </TableCell>
                    <TableCell align="right">
                      {summary.lastActive 
                        ? new Date(summary.lastActive).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
                        : <Typography variant="caption" color="textSecondary" className="italic">Nie</Typography>
                      }
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </div>
  );
};
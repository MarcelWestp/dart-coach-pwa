import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import type { TestResult, Exercise } from '../../types/exercise';
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
  TableRow
} from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
} from 'recharts';

export const PlayerStatsView: React.FC = () => {
  const { userProfile } = useAuth();

  const [dateRange, setDateRange] = useState<DateRangeOption>('30days');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('all');
  const [results, setResults] = useState<TestResult[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    if (!userProfile) return;
    setLoading(true);
    setError(null);

    try {
      const q = query(
        collection(db, 'testResults'),
        where('userId', '==', userProfile.uid)
      );

      const [resSnap, exSnap] = await Promise.all([
        getDocs(q),
        getDocs(collection(db, 'exercises'))
      ]);

      const fetchedResults: TestResult[] = [];
      resSnap.forEach((d) => {
        const data = d.data();
        delete data.id;
        fetchedResults.push({ id: d.id, ...data } as TestResult);
      });

      const fetchedExercises: Exercise[] = [];
      exSnap.forEach((d) => {
        const data = d.data();
        fetchedExercises.push({ id: d.id, ...data } as Exercise);
      });

      setResults(fetchedResults);
      setExercises(fetchedExercises);
    } catch (err) {
      console.error(err);
      setError('Fehler beim Laden der Statistik-Daten.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [userProfile]);

  // Hilfsfunktion zur Ermittlung des Übungsnamens
  const getExerciseName = (exerciseId?: string, testId?: string, fallbackType?: string) => {
    const idToFind = exerciseId || testId;
    if (idToFind) {
      const found = exercises.find((e) => e.id === idToFind);
      if (found) return found.title;
    }
    return fallbackType || 'Allgemeine Übung';
  };

  // Hilfsfunktion zur Ermittlung der ID
  const getResultExerciseId = (res: TestResult) => {
    return (res as any).exerciseId || res.testId || 'unknown';
  };

  // Erstelle eindeutige Liste aller absolvierten Übungen für das Dropdown
  const availableExercises = Array.from(
    new Set(results.map((r) => getResultExerciseId(r)))
  ).map((id) => {
    const sampleRes = results.find((r) => getResultExerciseId(r) === id);
    return {
      id,
      name: getExerciseName((sampleRes as any)?.exerciseId, sampleRes?.testId, sampleRes?.exerciseType)
    };
  });

  // 1. Gefilterte Ergebnisse nach Datum
  const dateFilteredResults = results.filter((res) => {
    const { start, end } = getDateRangeBounds(dateRange);
    const resDate = new Date(res.completedAt);
    if (start && resDate < start) return false;
    if (resDate > end) return false;
    return true;
  });

  // 2. Gefilterte Ergebnisse nach ausgewählter Übung ID
  const finalFilteredResults = dateFilteredResults.filter((res) => {
    if (selectedExerciseId === 'all') return true;
    return getResultExerciseId(res) === selectedExerciseId;
  });

  // Sortiert nach Datum aufsteigend für die Charts
  const sortedResults = [...finalFilteredResults].sort(
    (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
  );

  // Daten für den Verlaufs-Graph
  const chartData = sortedResults.map((r) => ({
    date: new Date(r.completedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
    points: r.totalPoints,
    name: getExerciseName((r as any).exerciseId, r.testId, r.exerciseType),
  }));

  // Kennzahlen berechnen
  const totalCompleted = finalFilteredResults.length;
  const overallScores = sortedResults.map((r) => r.totalPoints);
  
  const avgPoints = totalCompleted > 0 
    ? Math.round(finalFilteredResults.reduce((acc, r) => acc + r.totalPoints, 0) / totalCompleted) 
    : 0;
  const maxPoints = totalCompleted > 0 
    ? Math.max(...finalFilteredResults.map((r) => r.totalPoints)) 
    : 0;

  // Gruppierung nach Übungs-ID für die zusammenfassende Übersichtstabelle
  const exercisesGrouped = dateFilteredResults.reduce((acc, res) => {
    const key = getResultExerciseId(res);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(res);
    return acc;
  }, {} as Record<string, TestResult[]>);

  const selectedExerciseObj = availableExercises.find((e) => e.id === selectedExerciseId);

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
            <BarChartIcon fontSize="large" color="primary" /> Meine Statistiken
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Analysiere deine Leistung, Formkurven und Einzelübungsergebnisse im Zeitverlauf.
          </Typography>
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* Übungs-Filter */}
          <FormControl size="small" className="min-w-[200px]">
            <InputLabel>Übung Auswählen</InputLabel>
            <Select
              value={selectedExerciseId}
              label="Übung Auswählen"
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
          <CheckCircleOutlinedIcon color="primary" sx={{ fontSize: 40 }} />
          <div>
            <Typography variant="caption" color="textSecondary" className="font-bold block">
              {selectedExerciseId === 'all' ? 'Absolvierte Übungen' : 'Durchgänge der Übung'}
            </Typography>
            <Typography variant="h5" className="font-bold">
              {totalCompleted}
            </Typography>
          </div>
        </Paper>

        <Paper className="p-4 flex items-center gap-4 shadow-sm">
          <TrendingUpIcon color="secondary" sx={{ fontSize: 40 }} />
          <div>
            <Typography variant="caption" color="textSecondary" className="font-bold block">
              Ø Punkte / Score
            </Typography>
            <div className="flex items-center gap-2 flex-wrap">
              <Typography variant="h5" className="font-bold">
                {avgPoints}
              </Typography>
              {overallScores.length >= 2 && <TrendBadge scores={overallScores} />}
            </div>
          </div>
        </Paper>

        <Paper className="p-4 flex items-center gap-4 shadow-sm">
          <EmojiEventsIcon color="warning" sx={{ fontSize: 40 }} />
          <div>
            <Typography variant="caption" color="textSecondary" className="font-bold block">
              Höchstwert im Zeitraum
            </Typography>
            <Typography variant="h5" className="font-bold">
              {maxPoints}
            </Typography>
          </div>
        </Paper>
      </div>

      {/* Main Content */}
      {sortedResults.length === 0 ? (
        <Paper className="p-8 text-center">
          <Typography variant="body1" color="textSecondary">
            Keine Daten für die gewählte Kombination aus Übung und Zeitraum vorhanden.
          </Typography>
        </Paper>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {/* Punkte-Verlauf Chart */}
          <Paper className="p-6 shadow-sm">
            <Typography variant="h6" className="font-bold mb-4 flex items-center gap-2">
              <FitnessCenterIcon color="primary" /> 
              {selectedExerciseId === 'all' 
                ? 'Gesamter Punkteverlauf' 
                : `Verlauf: ${selectedExerciseObj?.name}`}
            </Typography>
            <Box className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="points" 
                    name="Punkte" 
                    stroke="#1976d2" 
                    strokeWidth={3} 
                    dot={{ r: 4 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>

          {/* Anzeige-Wechsel */}
          {selectedExerciseId !== 'all' ? (
            <Paper className="shadow-sm overflow-hidden">
              <Box className="p-4 border-b">
                <Typography variant="h6" className="font-bold">
                  Historie: {selectedExerciseObj?.name}
                </Typography>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell className="font-bold">Datum & Uhrzeit</TableCell>
                      <TableCell className="font-bold" align="center">Erzielte Punkte</TableCell>
                      <TableCell className="font-bold" align="left">Notizen / Anmerkungen</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[...sortedResults].reverse().map((res) => (
                      <TableRow key={res.id} hover>
                        <TableCell>
                          {new Date(res.completedAt).toLocaleString('de-DE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </TableCell>
                        <TableCell align="center" className="font-bold text-primary-main">
                          {res.totalPoints} Pkt.
                        </TableCell>
                        <TableCell align="left">
                          {res.playerNote || (
                            <Typography variant="caption" color="textSecondary" className="italic">
                              Keine Notiz
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          ) : (
            <Paper className="shadow-sm overflow-hidden">
              <Box className="p-4 border-b">
                <Typography variant="h6" className="font-bold">
                  Übungs-Übersicht & Tendenzen
                </Typography>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell className="font-bold">Übung</TableCell>
                      <TableCell className="font-bold" align="center">Anzahl</TableCell>
                      <TableCell className="font-bold" align="center">Ø Punkte</TableCell>
                      <TableCell className="font-bold" align="center">Tendenz / Form</TableCell>
                      <TableCell className="font-bold" align="right">Bestwert</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(exercisesGrouped).map(([exId, list]) => {
                      const typeScores = list
                        .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
                        .map((r) => r.totalPoints);
                      const typeAvg = Math.round(list.reduce((acc, r) => acc + r.totalPoints, 0) / list.length);
                      const typeMax = Math.max(...list.map((r) => r.totalPoints));
                      const sampleRes = list[0];
                      const exName = getExerciseName((sampleRes as any)?.exerciseId, sampleRes?.testId, sampleRes?.exerciseType);

                      return (
                        <TableRow 
                          key={exId} 
                          hover 
                          className="cursor-pointer"
                          onClick={() => setSelectedExerciseId(exId)}
                        >
                          <TableCell className="font-semibold text-primary-main hover:underline">
                            {exName}
                          </TableCell>
                          <TableCell align="center">{list.length}</TableCell>
                          <TableCell align="center" className="font-semibold">{typeAvg} Pkt.</TableCell>
                          <TableCell align="center">
                            {typeScores.length >= 2 ? (
                              <TrendBadge scores={typeScores} />
                            ) : (
                              <Typography variant="caption" color="textSecondary" className="italic">
                                Zu wenig Daten
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">{typeMax} Pkt.</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </div>
      )}
    </div>
  );
};
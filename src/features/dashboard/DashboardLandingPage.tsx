import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, query, where } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { RecordResultModal } from "../exercises/RecordResultModal";
import {
  Paper,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  Box,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import NotificationsIcon from "@mui/icons-material/Notifications";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import BarChartIcon from "@mui/icons-material/BarChart";
import SportsKabaddiIcon from "@mui/icons-material/SportsKabaddi";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import HelpIcon from "@mui/icons-material/Help";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

interface WidgetConfig {
  id: string;
  title: string;
  enabled: boolean;
  required?: boolean;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: "notifications", title: "Neue & Ungelesene Benachrichtigungen", enabled: true, required: true },
  { id: "trainingPlan", title: "Fortschritt Trainingsplan", enabled: true },
  { id: "performanceTest", title: "Leistungstest", enabled: true },
  { id: "exerciseOfTheMonth", title: "Übung des Monats (Top 3 & Platz)", enabled: true },
  { id: "stats7Days", title: "Allgemeine Statistik (letzte 7 Tage)", enabled: true },
  { id: "performanceLeague", title: "Performance League (Optionale Top 3 / Platz)", enabled: false },
  { id: "matchLeague", title: "Match League (Statistik mit Nachbarn)", enabled: false },
  { id: "favoriteExercises", title: "Lieblingsübungen (1-3 frei wählbar)", enabled: false },
];

interface DashboardLandingPageProps {
  onNavigate: (tabIndexOrRoute: string) => void;
}

export const DashboardLandingPage: React.FC<DashboardLandingPageProps> = ({ onNavigate }) => {
  const { userProfile, refreshUserProfile } = useAuth();
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Echte Daten aus der Datenbank
  const [notifications, setNotifications] = useState<any[]>([]);
  const [trainingPlans, setTrainingPlans] = useState<any[]>([]);
  const [assignedTests, setAssignedTests] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [monthlyConfigs, setMonthlyConfigs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Vom Nutzer frei gewählte Lieblingsübungen (IDs, max. 3)
  const [selectedFavoriteIds, setSelectedFavoriteIds] = useState<string[]>([]);

  // Modal-Zustand für Ergebniserfassung (Lieblingsübungen & Übung des Monats)
  const [selectedExerciseToRecord, setSelectedExerciseToRecord] = useState<any | null>(null);

  // Lade Layout- und Lieblingsübungen-Einstellungen aus dem UserProfile
  useEffect(() => {
    if (userProfile?.dashboardWidgets && Array.isArray(userProfile.dashboardWidgets)) {
      const savedWidgets = userProfile.dashboardWidgets;
      const merged = DEFAULT_WIDGETS.map((def) => {
        const found = savedWidgets.find((s: WidgetConfig) => s.id === def.id);
        return found ? { ...def, enabled: found.enabled } : def;
      });
      setWidgets(merged);
    }
    if (userProfile?.favoriteExerciseIds && Array.isArray(userProfile.favoriteExerciseIds)) {
      setSelectedFavoriteIds(userProfile.favoriteExerciseIds);
    }
  }, [userProfile]);

  // Echte Firestore-Daten abrufen
  const fetchDashboardData = async () => {
    if (!userProfile?.uid) return;

    try {
      // 1. Benachrichtigungen
      try {
        const qNotif = query(
          collection(db, "notifications"),
          where("userId", "==", userProfile.uid),
          where("read", "==", false)
        );
        const notifSnap = await getDocs(qNotif);
        const fetchedNotifs: any[] = [];
        notifSnap.forEach((d) => fetchedNotifs.push({ id: d.id, ...d.data() }));
        setNotifications(fetchedNotifs);
      } catch (e) {
        console.warn("Fehler beim Laden der Benachrichtigungen", e);
      }

      // 2. Zugewiesene Trainingspläne
      try {
        const qPlans = query(
          collection(db, "assignedPlans"),
          where("playerId", "==", userProfile.uid)
        );
        const planSnap = await getDocs(qPlans);
        const fetchedPlans: any[] = [];
        planSnap.forEach((d) => fetchedPlans.push({ id: d.id, ...d.data() }));
        setTrainingPlans(fetchedPlans);
      } catch (e) {
        console.warn("Fehler beim Laden der Trainingspläne", e);
      }

      // 3. Zugewiesene Tests
      try {
        const qTests = query(
          collection(db, "assignedPerformanceTests"),
          where("playerId", "==", userProfile.uid)
        );
        const testSnap = await getDocs(qTests);
        const fetchedTests: any[] = [];
        testSnap.forEach((d) => fetchedTests.push({ id: d.id, ...d.data() }));
        setAssignedTests(fetchedTests);
      } catch (e) {
        console.warn("Fehler beim Laden der Leistungstests", e);
      }

      // 4. Testergebnisse
      try {
        const resSnap = await getDocs(collection(db, "testResults"));
        const fetchedResults: any[] = [];
        resSnap.forEach((d) => fetchedResults.push({ id: d.id, ...d.data() }));
        setTestResults(fetchedResults);
      } catch (e) {
        console.warn("Fehler beim Laden der Testergebnisse", e);
      }

      // 5. Übungen
      try {
        const exSnap = await getDocs(collection(db, "exercises"));
        const fetchedEx: any[] = [];
        exSnap.forEach((d) => fetchedEx.push({ id: d.id, ...d.data() }));
        setExercises(fetchedEx);
      } catch (e) {
        console.warn("Fehler beim Laden der Übungen", e);
      }

      // 6. Übung des Monats (Collection-Name: monthlyExercises)
      try {
        const monthlySnap = await getDocs(collection(db, "monthlyExercises"));
        const fetchedMonthly: any[] = [];
        monthlySnap.forEach((d) => fetchedMonthly.push({ id: d.id, ...d.data() }));
        setMonthlyConfigs(fetchedMonthly);
      } catch (e) {
        console.warn("Fehler beim Laden der Monatskonfigurationen", e);
      }

      // 7. Nutzerliste
      try {
        const userSnap = await getDocs(collection(db, "users"));
        const fetchedUsers: any[] = [];
        userSnap.forEach((d) => fetchedUsers.push({ uid: d.id, id: d.id, ...d.data() }));
        setUsers(fetchedUsers);
      } catch (e) {
        console.warn("Fehler beim Laden der Nutzerliste", e);
      }
    } catch (err) {
      console.error("Genereller Fehler beim Laden der Dashboard-Daten:", err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [userProfile?.uid]);

  const handleResultSaved = async () => {
    setSelectedExerciseToRecord(null);
    await fetchDashboardData();
  };

  const saveWidgetsToFirestore = async (updatedWidgets: WidgetConfig[], updatedFavorites?: string[]) => {
    if (!userProfile) return;
    setSaving(true);
    try {
      const userRef = doc(db, "users", userProfile.uid);
      const updatePayload: any = {
        dashboardWidgets: updatedWidgets,
        updatedAt: new Date().toISOString(),
      };
      if (updatedFavorites !== undefined) {
        updatePayload.favoriteExerciseIds = updatedFavorites;
      }
      await updateDoc(userRef, updatePayload);
      await refreshUserProfile();
    } catch (err) {
      console.error("Fehler beim Speichern des Dashboards:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newWidgets = [...widgets];
    const temp = newWidgets[index];
    newWidgets[index] = newWidgets[index - 1];
    newWidgets[index - 1] = temp;
    setWidgets(newWidgets);
    saveWidgetsToFirestore(newWidgets);
  };

  const handleMoveDown = (index: number) => {
    if (index === widgets.length - 1) return;
    const newWidgets = [...widgets];
    const temp = newWidgets[index];
    newWidgets[index] = newWidgets[index + 1];
    newWidgets[index + 1] = temp;
    setWidgets(newWidgets);
    saveWidgetsToFirestore(newWidgets);
  };

  const handleToggleWidget = (id: string) => {
    const newWidgets = widgets.map((w) =>
      w.id === id && !w.required ? { ...w, enabled: !w.enabled } : w
    );
    setWidgets(newWidgets);
    saveWidgetsToFirestore(newWidgets);
  };

  const handleFavoriteChange = (event: any) => {
    const value = event.target.value;
    if (value.length <= 3) {
      setSelectedFavoriteIds(value);
      saveWidgetsToFirestore(widgets, value);
    }
  };

  // 1. Trainingsplan Fortschritt
  const activePlan = trainingPlans.find((p) => p.status !== "completed") || trainingPlans[0];
  const calculatePlanProgress = (plan: any) => {
    if (!plan?.blocks) return 0;
    let totalExercises = 0;
    let completedExercises = 0;
    plan.blocks.forEach((block: any) => {
      block.exercises?.forEach((ex: any) => {
        totalExercises++;
        const hasResult = testResults.some(
          (r) => r.userId === userProfile?.uid && (r.exerciseId === ex.exerciseId || r.testId === ex.exerciseId)
        );
        if (hasResult || ex.completed || ex.completedAt) completedExercises++;
      });
    });
    return totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;
  };
  const planProgressPercent = activePlan ? calculatePlanProgress(activePlan) : 0;

  // 2. Leistungstest
  const nextTest = assignedTests.find((t) => t.status !== "completed") || assignedTests[0];

  // 3. Übung des Monats
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const currentMonthlyConfig = monthlyConfigs.find(
    (m) => m.month === currentMonth && m.year === currentYear
  );
  const monthlyExercise = exercises.find((e) => e.id === currentMonthlyConfig?.exerciseId);

  const scoresByUser: { [userId: string]: number } = {};
  if (monthlyExercise) {
    testResults.forEach((res) => {
      const resExId = res.exerciseId || res.testId;
      if (resExId === monthlyExercise.id) {
        const resDate = new Date(res.completedAt);
        if (resDate.getMonth() + 1 === currentMonth && resDate.getFullYear() === currentYear) {
          const points = res.totalPoints || res.points || 0;
          const currentBest = scoresByUser[res.userId] || 0;
          if (points > currentBest) {
            scoresByUser[res.userId] = points;
          }
        }
      }
    });
  }
  const monthlyLeaderboard = Object.keys(scoresByUser)
    .map((userId) => ({
      user: users.find((u) => u.uid === userId || u.id === userId),
      score: scoresByUser[userId],
    }))
    .sort((a, b) => b.score - a.score);

  const top3Monthly = monthlyLeaderboard.slice(0, 3);
  const userMonthlyIndex = monthlyLeaderboard.findIndex(
    (item) => item.user?.uid === userProfile?.uid || item.user?.id === userProfile?.uid
  );
  const userMonthlyEntry = userMonthlyIndex !== -1 ? monthlyLeaderboard[userMonthlyIndex] : null;
  const userMonthlyRank = userMonthlyIndex !== -1 ? userMonthlyIndex + 1 : null;

  // 4. Statistik letzte 7 Tage
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentResults = testResults.filter(
    (r) => r.userId === userProfile?.uid && new Date(r.completedAt) >= sevenDaysAgo
  );
  const totalPoints7Days = recentResults.reduce((sum, r) => sum + (r.totalPoints || r.points || 0), 0);
  const avgHitRate7Days =
    recentResults.length > 0
      ? (recentResults.reduce((sum, r) => sum + (r.hitRate || r.accuracy || 0), 0) / recentResults.length).toFixed(1)
      : "0";

  // 5. Lieblingsübungen
  const userFavoriteExercisesList = selectedFavoriteIds
    .map((id) => exercises.find((e) => e.id === id))
    .filter(Boolean);

  // Widget Rendering
  const renderWidgetContent = (id: string) => {
    switch (id) {
      case "notifications":
        return (
          <Paper
            variant="outlined"
            sx={{ p: 3, bgcolor: "background.paper", borderColor: "divider", borderLeft: 4, borderLeftColor: "primary.main", cursor: "pointer" }}
            onClick={() => onNavigate("profile")}
            className="shadow-sm hover:opacity-95 transition-opacity"
          >
            <div className="flex items-center gap-2 mb-3">
              <NotificationsIcon color="primary" />
              <Typography variant="h6" className="font-bold" color="text.primary">
                Neue & Ungelesene Benachrichtigungen ({notifications.length})
              </Typography>
            </div>
            {notifications.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Keine neuen Benachrichtigungen vorhanden.
              </Typography>
            ) : (
              <div className="space-y-2">
                {notifications.slice(0, 3).map((n) => (
                  <Box key={n.id} sx={{ p: 2, bgcolor: "action.hover", borderRadius: 1 }} className="flex justify-between items-center">
                    <Typography variant="body2" color="text.primary">{n.message || n.title}</Typography>
                    <span className="text-xs text-gray-400">Neu</span>
                  </Box>
                ))}
              </div>
            )}
          </Paper>
        );

      case "trainingPlan":
        return (
          <Paper
            variant="outlined"
            sx={{ p: 3, bgcolor: "background.paper", borderColor: "divider", cursor: "pointer" }}
            onClick={() => onNavigate("player-plan")}
            className="shadow-sm hover:opacity-95 transition-opacity"
          >
            <div className="flex items-center gap-2 mb-2">
              <FitnessCenterIcon color="primary" />
              <Typography variant="h6" className="font-bold" color="text.primary">
                Aktueller Trainingsplan
              </Typography>
            </div>
            {activePlan ? (
              <>
                <Typography variant="body2" color="text.secondary" className="mb-2">
                  {activePlan.title} (KW {activePlan.calendarWeek} / {activePlan.year})
                </Typography>
                <div className="flex justify-between text-sm mb-1 font-medium" style={{ color: "inherit" }}>
                  <span>Fortschritt</span>
                  <span>{planProgressPercent}%</span>
                </div>
                <LinearProgress variant="determinate" value={planProgressPercent} className="rounded h-2" />
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Aktuell ist kein aktiver Trainingsplan zugewiesen.
              </Typography>
            )}
          </Paper>
        );

      case "performanceTest":
        return (
          <Paper
            variant="outlined"
            sx={{ p: 3, bgcolor: "background.paper", borderColor: "divider", cursor: "pointer" }}
            onClick={() => onNavigate("tests")}
            className="shadow-sm hover:opacity-95 transition-opacity"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUpIcon color="primary" />
              <Typography variant="h6" className="font-bold" color="text.primary">
                Leistungstest
              </Typography>
            </div>
            {nextTest ? (
              <Typography variant="body2" color="text.primary" className="mb-2 pb-2">
                Zugewiesener Test: <strong>{nextTest.title}</strong> (Status: {nextTest.status === "completed" ? "Erledigt" : "Offen"})
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary" className="mb-2 pb-2">
                Keine offenen Leistungstests zugewiesen.
              </Typography>
            )}
            <Button variant="outlined" size="small">
              Zu den Tests
            </Button>
          </Paper>
        );

      case "exerciseOfTheMonth":
        return (
          <Paper
            variant="outlined"
            sx={{ p: 3, bgcolor: "background.paper", borderColor: "divider" }}
            className="shadow-sm flex flex-col gap-4"
          >
            {/* Headerbereich der Übung des Monats */}
            <div className="flex justify-between items-start flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <EmojiEventsIcon color="primary" fontSize="large" />
                <div>
                  <Typography variant="h6" className="font-bold" color="text.primary">
                    Übung des Monats: {monthlyExercise ? monthlyExercise.title : "Keine aktiv"}
                  </Typography>
                </div>
              </div>

              <Button
                variant="outlined"
                size="small"
                onClick={() => onNavigate("league")}
              >
                Zur Rangliste
              </Button>
            </div>

            {monthlyExercise ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Spalte 1 & 2: Beschreibung, Anleitung & Direkt-Eintragen-Button */}
                <div className="md:col-span-2 flex flex-col justify-between gap-3">
                  <div>
                    {/* Kurzbeschreibung */}
                    <Typography variant="body2" color="text.secondary" className="mb-3 pb-2">
                      {monthlyExercise.description || "Keine Kurzbeschreibung vorhanden."}
                    </Typography>

                    {/* Aufklappbare Spielanleitung */}
                    {monthlyExercise.instructions && (
                      <Accordion elevation={0} variant="outlined" sx={{ bgcolor: "action.hover" }} className="rounded">
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="caption" className="font-bold flex items-center gap-1" color="text.primary">
                            <HelpIcon fontSize="small" color="primary" /> Spielanleitung anzeigen
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Typography variant="body2" className="whitespace-pre-line text-xs" color="text.secondary">
                            {monthlyExercise.instructions}
                          </Typography>
                        </AccordionDetails>
                      </Accordion>
                    )}
                  </div>

                  {/* Button zum direkten Ergebnis-Eintragen */}
                  <div>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<PlayArrowIcon />}
                      onClick={() => setSelectedExerciseToRecord(monthlyExercise)}
                    >
                      Ergebnis eintragen
                    </Button>
                  </div>
                </div>

                {/* Spalte 3: Leaderboard & Platzierung */}
                <Paper variant="outlined" sx={{ p: 2, bgcolor: "action.hover" }} className="flex flex-col justify-between gap-3">
                  <div>
                    <Typography variant="subtitle2" className="font-bold mb-2" color="text.secondary">
                      Top 3 Spieler
                    </Typography>
                    {top3Monthly.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">Bisher keine Ergebnisse diesen Monat.</Typography>
                    ) : (
                      <ul className="space-y-1 text-sm" style={{ color: "inherit" }}>
                        {top3Monthly.map((entry, idx) => {
                          const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉";
                          const name = entry.user?.nickname || entry.user?.realName || "Spieler";
                          return (
                            <li key={idx} className="flex justify-between items-center">
                              <span>{medal} {name}</span>
                              <strong className="text-xs">{entry.score} Pkt.</strong>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  <Box sx={{ pt: 1, borderTop: 1, borderColor: "divider" }}>
                    <Typography variant="caption" className="font-bold" color="primary.main">
                      Dein Platz
                    </Typography>
                    <Typography variant="h6" className="font-bold" color="text.primary">
                      {userMonthlyRank ? `Platz ${userMonthlyRank}` : "Nicht platziert"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {userMonthlyEntry ? `Mit ${userMonthlyEntry.score} Punkten` : "Trage dein Ergebnis ein!"}
                    </Typography>
                  </Box>
                </Paper>
              </div>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Für den aktuellen Monat wurde noch keine Übung des Monats vom Admin festgelegt.
              </Typography>
            )}
          </Paper>
        );

      case "stats7Days":
        return (
          <Paper
            variant="outlined"
            sx={{ p: 3, bgcolor: "background.paper", borderColor: "divider", cursor: "pointer" }}
            onClick={() => onNavigate("player-stats")}
            className="shadow-sm hover:opacity-95 transition-opacity"
          >
            <div className="flex items-center gap-2 mb-3">
              <BarChartIcon color="primary" />
              <Typography variant="h6" className="font-bold" color="text.primary">
                Allgemeine Statistik (Letzte 7 Tage)
              </Typography>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <Box sx={{ p: 2, bgcolor: "action.hover", borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">Absolvierte Übungen</Typography>
                <Typography variant="h6" className="font-bold" color="text.primary">{recentResults.length}</Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: "action.hover", borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">Gesamtpunkte</Typography>
                <Typography variant="h6" className="font-bold" color="text.primary">{totalPoints7Days}</Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: "action.hover", borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">Ø Trefferquote</Typography>
                <Typography variant="h6" className="font-bold" color="text.primary">{avgHitRate7Days}%</Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: "action.hover", borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">Status</Typography>
                <Typography variant="h6" className="font-bold" color="text.primary">Aktiv</Typography>
              </Box>
            </div>
          </Paper>
        );

      case "performanceLeague":
        return (
          <Paper
            variant="outlined"
            sx={{ p: 3, bgcolor: "background.paper", borderColor: "divider", cursor: "pointer" }}
            onClick={() => onNavigate("league")}
            className="shadow-sm border-dashed hover:opacity-95 transition-opacity"
          >
            <div className="flex items-center gap-2 mb-2">
              <EmojiEventsIcon color="action" />
              <Typography variant="h6" className="font-bold" color="text.primary">
                Performance League
              </Typography>
            </div>
            <Typography variant="body2" color="text.secondary">
              Klicke hier, um zur Trainingsliga zu gelangen.
            </Typography>
          </Paper>
        );

      case "matchLeague":
        return (
          <Paper
            variant="outlined"
            sx={{ p: 3, bgcolor: "background.paper", borderColor: "divider", cursor: "pointer" }}
            onClick={() => onNavigate("league")}
            className="shadow-sm border-dashed hover:opacity-95 transition-opacity"
          >
            <div className="flex items-center gap-2 mb-2">
              <SportsKabaddiIcon color="action" />
              <Typography variant="h6" className="font-bold" color="text.primary">
                Match League – Direkter Vergleich
              </Typography>
            </div>
            <Typography variant="body2" color="text.secondary">
              Vergleiche deine Leistungen mit deinen Nachbarn in der Rangliste.
            </Typography>
          </Paper>
        );

      case "favoriteExercises":
        return (
          <Paper
            variant="outlined"
            sx={{ p: 3, bgcolor: "background.paper", borderColor: "divider" }}
            className="shadow-sm border-dashed"
          >
            <div className="flex items-center gap-2 mb-3">
              <Typography variant="h6" className="font-bold" color="text.primary">
                Deine Lieblingsübungen
              </Typography>
            </div>

            {userFavoriteExercisesList.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Noch keine Lieblingsübungen ausgewählt. Klicke auf "Dashboard anpassen", um bis zu 3 Übungen auszuwählen.
              </Typography>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {userFavoriteExercisesList.map((ex: any) => (
                  <Paper
                    key={ex.id}
                    variant="outlined"
                    sx={{ p: 2, bgcolor: "action.hover", borderColor: "divider" }}
                    className="flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <Typography variant="subtitle1" className="font-bold" color="text.primary">
                          {ex.title}
                        </Typography>
                      </div>

                      {/* Kurzbeschreibung */}
                      <Typography variant="body2" color="text.secondary" className="mb-2 pb-2">
                        {ex.description || "Keine Kurzbeschreibung vorhanden."}
                      </Typography>

                      {/* Aufklappbare Spielanleitung */}
                      {ex.instructions && (
                        <Accordion elevation={0} variant="outlined" sx={{ bgcolor: "background.paper" }} className="mb-3 rounded">
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="caption" className="font-bold flex items-center gap-1" color="text.primary">
                              <HelpIcon fontSize="small" color="primary" /> Spielanleitung
                            </Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Typography variant="body2" className="whitespace-pre-line text-xs" color="text.secondary">
                              {ex.instructions}
                            </Typography>
                          </AccordionDetails>
                        </Accordion>
                      )}
                    </div>

                    {/* Button zum Ergebnis eintragen */}
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      fullWidth
                      startIcon={<PlayArrowIcon />}
                      onClick={() => setSelectedExerciseToRecord(ex)}
                      className="mt-2"
                    >
                      Ergebnis eintragen
                    </Button>
                  </Paper>
                ))}
              </div>
            )}
          </Paper>
        );

      default:
        return null;
    }
  };

  return (
    <Box className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Kopfbereich */}
      <Paper variant="outlined" sx={{ p: 3, bgcolor: "background.paper", borderColor: "divider" }} className="flex flex-wrap justify-between items-center gap-4 shadow-sm">
        <div>
          <Typography variant="h5" className="font-bold" color="text.primary">
            Willkommen zurück, {userProfile?.nickname || userProfile?.realName || "Spieler"}!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Dein persönlicher Trainingsüberblick. {saving && "(Speichere Layout...)"}
          </Typography>
        </div>
        <Button
          variant="contained"
          startIcon={<SettingsIcon />}
          onClick={() => setIsCustomizeOpen(true)}
        >
          Dashboard anpassen
        </Button>
      </Paper>

      {/* Widgets */}
      <div className="space-y-4">
        {widgets
          .filter((w) => w.enabled)
          .map((widget) => (
            <React.Fragment key={widget.id}>
              {renderWidgetContent(widget.id)}
            </React.Fragment>
          ))}
      </div>

      {/* Anpassungs-Modal */}
      <Dialog open={isCustomizeOpen} onClose={() => setIsCustomizeOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle className="font-bold">Dashboard anpassen</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="textSecondary" className="mb-4">
            Passe die Reihenfolge an, aktiviere optionale Widgets und wähle unten deine persönlichen Lieblingsübungen aus.
          </Typography>

          <Box sx={{ mb: 4, p: 2, bgcolor: "action.hover", borderRadius: 1 }} className="space-y-2">
            <Typography variant="subtitle2" className="font-bold" color="text.primary">
              Lieblingsübungen konfigurieren (1 bis 3 wählbar)
            </Typography>
            <FormControl fullWidth size="small">
              <InputLabel id="favorite-exercises-select-label">Übungen wählen</InputLabel>
              <Select
                labelId="favorite-exercises-select-label"
                multiple
                value={selectedFavoriteIds}
                onChange={handleFavoriteChange}
                input={<OutlinedInput label="Übungen wählen" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((id) => {
                      const ex = exercises.find((e) => e.id === id);
                      return <Chip key={id} label={ex ? ex.title : id} size="small" />;
                    })}
                  </Box>
                )}
              >
                {exercises.map((ex) => (
                  <MenuItem key={ex.id} value={ex.id}>
                    {ex.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Typography variant="subtitle2" className="font-bold mb-2" color="text.primary">
            Widget-Reihenfolge & Sichtbarkeit
          </Typography>
          <div className="space-y-3">
            {widgets.map((widget, index) => (
              <Box key={widget.id} sx={{ bgcolor: "action.hover", borderColor: "divider" }} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  <Typography variant="body2" className="font-medium" color="text.primary">{widget.title}</Typography>
                  {widget.required && <span className="text-xs bg-primary-main text-white px-1.5 py-0.5 rounded">Pflicht</span>}
                </div>
                <div className="flex items-center gap-1">
                  <IconButton
                    size="small"
                    disabled={index === 0}
                    onClick={() => handleMoveUp(index)}
                  >
                    <ArrowUpwardIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    disabled={index === widgets.length - 1}
                    onClick={() => handleMoveDown(index)}
                  >
                    <ArrowDownwardIcon fontSize="small" />
                  </IconButton>
                  {!widget.required && (
                    <Switch
                      checked={widget.enabled}
                      onChange={() => handleToggleWidget(widget.id)}
                      color="primary"
                    />
                  )}
                </div>
              </Box>
            ))}
          </div>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setIsCustomizeOpen(false)}>
            Fertig
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal zum Eintragen eines Ergebnisses direkt vom Dashboard */}
      {selectedExerciseToRecord && (
        <RecordResultModal
          open={!!selectedExerciseToRecord}
          onClose={() => setSelectedExerciseToRecord(null)}
          exercise={selectedExerciseToRecord}
          allExercises={exercises}
          onResultRecorded={handleResultSaved}
        />
      )}
    </Box>
  );
};
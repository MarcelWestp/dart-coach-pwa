import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
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
  { id: "favoriteExercises", title: "Bis zu 3 Lieblingsübungen", enabled: false },
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

  // Lade Layout-Einstellungen aus dem UserProfile
  useEffect(() => {
    if (userProfile?.dashboardWidgets && Array.isArray(userProfile.dashboardWidgets)) {
      const savedWidgets = userProfile.dashboardWidgets;
      const merged = DEFAULT_WIDGETS.map((def) => {
        const found = savedWidgets.find((s: WidgetConfig) => s.id === def.id);
        return found ? { ...def, enabled: found.enabled } : def;
      });
      setWidgets(savedWidgets);
    }
  }, [userProfile]);

  // Echte Firestore-Daten abrufen
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!userProfile?.uid) return;
      try {
        const [notifSnap, planSnap, testSnap, resSnap, exSnap, monthlySnap, userSnap] = await Promise.all([
          getDocs(collection(db, "notifications")),
          getDocs(collection(db, "assignedPlans")),
          getDocs(collection(db, "assignedPerformanceTests")),
          getDocs(collection(db, "testResults")),
          getDocs(collection(db, "exercises")),
          getDocs(collection(db, "monthlyExerciseConfigs")),
          getDocs(collection(db, "users")),
        ]);

        // Benachrichtigungen des Nutzers filtern
        const fetchedNotifs: any[] = [];
        notifSnap.forEach((d) => {
          const data = d.data();
          if (data.userId === userProfile.uid && !data.read) {
            fetchedNotifs.push({ id: d.id, ...data });
          }
        });
        setNotifications(fetchedNotifs);

        // Zugewiesene Trainingspläne des Nutzers
        const fetchedPlans: any[] = [];
        planSnap.forEach((d) => {
          const data = d.data();
          if (data.playerId === userProfile.uid) {
            fetchedPlans.push({ id: d.id, ...data });
          }
        });
        setTrainingPlans(fetchedPlans);

        // Zugewiesene Leistungstests
        const fetchedTests: any[] = [];
        testSnap.forEach((d) => {
          const data = d.data();
          if (data.playerId === userProfile.uid) {
            fetchedTests.push({ id: d.id, ...data });
          }
        });
        setAssignedTests(fetchedTests);

        // Testergebnisse
        const fetchedResults: any[] = [];
        resSnap.forEach((d) => {
          fetchedResults.push({ id: d.id, ...d.data() });
        });
        setTestResults(fetchedResults);

        // Übungen
        const fetchedEx: any[] = [];
        exSnap.forEach((d) => {
          fetchedEx.push({ id: d.id, ...d.data() });
        });
        setExercises(fetchedEx);

        // Monatswertungen / Übung des Monats
        const fetchedMonthly: any[] = [];
        monthlySnap.forEach((d) => {
          fetchedMonthly.push({ id: d.id, ...d.data() });
        });
        setMonthlyConfigs(fetchedMonthly);

        // Nutzerliste
        const fetchedUsers: any[] = [];
        userSnap.forEach((d) => {
          fetchedUsers.push({ uid: d.id, ...d.data() });
        });
        setUsers(fetchedUsers);
      } catch (err) {
        console.error("Fehler beim Laden der Dashboard-Daten:", err);
      }
    };

    fetchDashboardData();
  }, [userProfile?.uid]);

  const saveWidgetsToFirestore = async (updatedWidgets: WidgetConfig[]) => {
    if (!userProfile) return;
    setSaving(true);
    try {
      const userRef = doc(db, "users", userProfile.uid);
      await updateDoc(userRef, {
        dashboardWidgets: updatedWidgets,
        updatedAt: new Date().toISOString(),
      });
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

  // ----------------------------------------------------------------data calculation helper----------------------------------------------------------------

  // 1. Aktueller Trainingsplan Fortschritt
  const activePlan = trainingPlans.find((p) => p.status !== "completed") || trainingPlans[0];
  const calculatePlanProgress = (plan: any) => {
    if (!plan?.blocks) return 0;
    let totalExercises = 0;
    let completedExercises = 0;
    plan.blocks.forEach((block: any) => {
      block.exercises?.forEach((ex: any) => {
        totalExercises++;
        // Prüfen, ob für diese Übung ein Testergebnis vorliegt
        const hasResult = testResults.some(
          (r) => r.userId === userProfile?.uid && (r.exerciseId === ex.exerciseId || r.testId === ex.exerciseId)
        );
        if (hasResult || ex.completed) completedExercises++;
      });
    });
    return totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;
  };
  const planProgressPercent = activePlan ? calculatePlanProgress(activePlan) : 0;

  // 2. Nächster Leistungstest
  const nextTest = assignedTests.find((t) => t.status !== "completed") || assignedTests[0];

  // 3. Übung des Monats Daten berechnen
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const currentMonthlyConfig = monthlyConfigs.find(
    (m) => m.month === currentMonth && m.year === currentYear
  );
  const monthlyExercise = exercises.find((e) => e.id === currentMonthlyConfig?.exerciseId);

  // Highscores für Übung des Monats ermitteln
  const scoresByUser: { [userId: string]: number } = {};
  if (monthlyExercise) {
    testResults.forEach((res) => {
      const resExId = res.exerciseId || res.testId;
      if (resExId === monthlyExercise.id) {
        const resDate = new Date(res.completedAt);
        if (resDate.getMonth() + 1 === currentMonth && resDate.getFullYear() === currentYear) {
          const currentBest = scoresByUser[res.userId] || 0;
          if (res.totalPoints > currentBest) {
            scoresByUser[res.userId] = res.totalPoints;
          }
        }
      }
    });
  }
  const monthlyLeaderboard = Object.keys(scoresByUser)
    .map((userId) => ({
      user: users.find((u) => u.uid === userId),
      score: scoresByUser[userId],
    }))
    .sort((a, b) => b.score - a.score);

  const top3Monthly = monthlyLeaderboard.slice(0, 3);
  const userMonthlyIndex = monthlyLeaderboard.findIndex((item) => item.user?.uid === userProfile?.uid);
  const userMonthlyEntry = userMonthlyIndex !== -1 ? monthlyLeaderboard[userMonthlyIndex] : null;
  const userMonthlyRank = userMonthlyIndex !== -1 ? userMonthlyIndex + 1 : null;

  // 4. Statistik letzte 7 Tage
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentResults = testResults.filter(
    (r) => r.userId === userProfile?.uid && new Date(r.completedAt) >= sevenDaysAgo
  );
  const totalPoints7Days = recentResults.reduce((sum, r) => sum + (r.totalPoints || 0), 0);
  const avgHitRate7Days =
    recentResults.length > 0
      ? (recentResults.reduce((sum, r) => sum + (r.hitRate || r.accuracy || 0), 0) / recentResults.length).toFixed(1)
      : "0";

  // 5. Lieblingsübungen (Bis zu 3 am häufigsten absolvierte Übungen des Nutzers)
  const exerciseCounts: { [exId: string]: number } = {};
  testResults
    .filter((r) => r.userId === userProfile?.uid)
    .forEach((r) => {
      const id = r.exerciseId || r.testId;
      if (id) exerciseCounts[id] = (exerciseCounts[id] || 0) + 1;
    });
  const favoriteExerciseIds = Object.keys(exerciseCounts)
    .sort((a, b) => exerciseCounts[b] - exerciseCounts[a])
    .slice(0, 3);
  const favoriteExercisesList = favoriteExerciseIds.map((id) => exercises.find((e) => e.id === id)).filter(Boolean);

  // ----------------------------------------------------------------Widget Rendering----------------------------------------------------------------

  const renderWidgetContent = (id: string) => {
    switch (id) {
      case "notifications":
        return (
          <Paper
            variant="outlined"
            sx={{ p: 3, bgcolor: "background.paper", borderColor: "divider", borderLeft: 4, borderLeftColor: "primary.main", cursor: "pointer" }}
            onClick={() => onNavigate("profile")} // Oder Benachrichtigungsbereich
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
                Aktuell ist kein aktiver Trainingsplan zugewiesen. (Klicken zum Ansehen)
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
              <Typography variant="body2" color="text.primary" className="mb-2">
                Zugewiesener Test: <strong>{nextTest.title}</strong> (Status: {nextTest.status === "completed" ? "Erledigt" : "Offen"})
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary" className="mb-2">
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
            sx={{ p: 3, bgcolor: "background.paper", borderColor: "divider", cursor: "pointer" }}
            onClick={() => onNavigate("league")}
            className="shadow-sm hover:opacity-95 transition-opacity"
          >
            <div className="flex items-center gap-2 mb-3">
              <EmojiEventsIcon color="primary" />
              <Typography variant="h6" className="font-bold" color="text.primary">
                Übung des Monats: {monthlyExercise ? monthlyExercise.title : "Keine aktiv"}
              </Typography>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Typography variant="subtitle2" className="font-semibold mb-1" color="text.secondary">
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
                        <li key={idx}>
                          {medal} {name} – {entry.score} Pkt.
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <Box sx={{ p: 2, bgcolor: "action.hover", borderRadius: 1 }} className="flex flex-col justify-center">
                <Typography variant="subtitle2" className="font-semibold text-primary-main">
                  Dein Platz
                </Typography>
                <Typography variant="h5" className="font-bold" color="text.primary">
                  {userMonthlyRank ? `Platz ${userMonthlyRank}` : "Nicht platziert"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {userMonthlyEntry ? `Mit ${userMonthlyEntry.score} Punkten` : "Trage dein Ergebnis ein!"}
                </Typography>
              </Box>
            </div>
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
                Performance League (Optional)
              </Typography>
            </div>
            <Typography variant="body2" color="text.secondary" className="mb-2">
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
                Match League – Direkter Vergleich (Optional)
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
            sx={{ p: 3, bgcolor: "background.paper", borderColor: "divider", cursor: "pointer" }}
            onClick={() => onNavigate("exercises")}
            className="shadow-sm border-dashed hover:opacity-95 transition-opacity"
          >
            <div className="flex items-center gap-2 mb-2">
              <FitnessCenterIcon color="action" />
              <Typography variant="h6" className="font-bold" color="text.primary">
                Deine Top Lieblingsübungen
              </Typography>
            </div>
            {favoriteExercisesList.length === 0 ? (
              <Typography variant="body2" color="text.secondary">Noch keine Übungen absolviert.</Typography>
            ) : (
              <ul className="list-disc list-inside text-sm space-y-1" style={{ color: "inherit" }}>
                {favoriteExercisesList.map((ex: any, idx) => (
                  <li key={idx}>{ex.title} ({ex.type})</li>
                ))}
              </ul>
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
            Dein persönlicher Trainingsüberblick aus der Datenbank. {saving && "(Speichere Layout...)"}
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
            Passe die Reihenfolge an oder schalte optionale Widgets ein und aus. Deine Einstellungen werden automatisch im Profil gespeichert.
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
    </Box>
  );
};
import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { RecordResultModal } from "../exercises/RecordResultModal";
import { SendCoachMessageModal } from "../profile/SendCoachMessageModal";
import {
  getUserMonthlyChallenge,
  getCurrentMonthYear,
} from "../../services/challengeService";
import type { UserMonthlyChallenge } from "../../types/challenge";
import type {
  DynamicAchievement,
  UserAchievementProgress,
  AchievementTier,
} from "../../types/achievement";
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
  useTheme,
  useMediaQuery,
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
import ChatIcon from "@mui/icons-material/Chat";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import { MailOutlined } from "@mui/icons-material";
import type { WidgetConfig } from "../../types/user";

const TIER_COLORS: Record<AchievementTier, { color: string; label: string }> = {
  bronze: { color: "#CD7F32", label: "Bronze" },
  silver: { color: "#C0C0C0", label: "Silber" },
  gold: { color: "#FFD700", label: "Gold" },
  platinum: { color: "#E5E4E2", label: "Platin" },
  diamond: { color: "#B9F2FF", label: "Diamant" },
};

const DEFAULT_WIDGETS: WidgetConfig[] = [
  {
    id: "notifications",
    title: "Neue & Ungelesene Benachrichtigungen",
    enabled: true,
    required: true,
  },
  { id: "trainingPlan", title: "Fortschritt Trainingsplan", enabled: true },
  { id: "monthlyChallenge", title: "Dart-Pass", enabled: true },
  { id: "performanceTest", title: "Leistungstest", enabled: true },
  {
    id: "coachMessage",
    title: "Trainer-Kommunikation",
    enabled: true,
  },
  {
    id: "achievements",
    title: "Meine Erfolge & Badges",
    enabled: true,
  },
  {
    id: "exerciseOfTheMonth",
    title: "Übung des Monats (Top 3 & Platz)",
    enabled: true,
  },
  {
    id: "stats7Days",
    title: "Allgemeine Statistik (letzte 7 Tage)",
    enabled: true,
  },
  {
    id: "performanceLeague",
    title: "Performance League (Optionale Top 3 / Platz)",
    enabled: false,
  },
  {
    id: "matchLeague",
    title: "Match League (Statistik mit Nachbarn)",
    enabled: false,
  },
  {
    id: "favoriteExercises",
    title: "Lieblingsübungen (1-3 frei wählbar)",
    enabled: false,
  },
];

interface DashboardLandingPageProps {
  onNavigate: (tabIndexOrRoute: string) => void;
}

export const DashboardLandingPage: React.FC<DashboardLandingPageProps> = ({
  onNavigate,
}) => {
  const { userProfile, refreshUserProfile } = useAuth();
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Echte Daten aus der Datenbank
  const [notifications, setNotifications] = useState<any[]>([]);
  const [trainingPlans, setTrainingPlans] = useState<any[]>([]);
  const [assignedTests, setAssignedTests] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [monthlyConfigs, setMonthlyConfigs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [userMonthlyChallenge, setUserMonthlyChallenge] =
    useState<UserMonthlyChallenge | null>(null);

  // Achievements Daten
  const [achievements, setAchievements] = useState<DynamicAchievement[]>([]);
  const [userProgress, setUserProgress] = useState<
    Record<string, UserAchievementProgress>
  >({});

  // Trainer Nachrichten Modal State
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);

  // Vom Nutzer frei gewählte Lieblingsübungen (IDs, max. 3)
  const [selectedFavoriteIds, setSelectedFavoriteIds] = useState<string[]>([]);

  // Modal-Zustand für Ergebniserfassung
  const [selectedExerciseToRecord, setSelectedExerciseToRecord] = useState<
    any | null
  >(null);

  // Lade Layout- und Lieblingsübungen-Einstellungen aus dem UserProfile
  useEffect(() => {
    if (
      userProfile?.dashboardWidgets &&
      Array.isArray(userProfile.dashboardWidgets)
    ) {
      const savedWidgets = userProfile.dashboardWidgets;

      // 1. Nimm die gespeicherten Widgets in ihrer exakten Reihenfolge
      const orderedWidgets: WidgetConfig[] = savedWidgets
        .map((saved: WidgetConfig) => {
          const def = DEFAULT_WIDGETS.find((d) => d.id === saved.id);
          return def ? { ...def, enabled: saved.enabled } : null;
        })
        .filter(Boolean) as WidgetConfig[];

      // 2. Falls neue Widgets im Code dazugekommen sind, hänge sie unten an
      DEFAULT_WIDGETS.forEach((def) => {
        if (!orderedWidgets.some((w) => w.id === def.id)) {
          orderedWidgets.push(def);
        }
      });

      setWidgets(orderedWidgets);
    }

    if (
      userProfile?.favoriteExerciseIds &&
      Array.isArray(userProfile.favoriteExerciseIds)
    ) {
      setSelectedFavoriteIds(userProfile.favoriteExerciseIds);
    }
  }, [userProfile]);

  // Firestore-Daten abrufen
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

      // 6. Übung des Monats
      try {
        const monthlySnap = await getDocs(collection(db, "monthlyExercises"));
        const fetchedMonthly: any[] = [];
        monthlySnap.forEach((d) =>
          fetchedMonthly.push({ id: d.id, ...d.data() })
        );
        setMonthlyConfigs(fetchedMonthly);
      } catch (e) {
        console.warn("Fehler beim Laden der Monatskonfigurationen", e);
      }

      // 7. Monatliche Challenge
      try {
        const currentMonthYear = getCurrentMonthYear();
        const challengeData = await getUserMonthlyChallenge(
          userProfile.uid,
          currentMonthYear
        );
        setUserMonthlyChallenge(challengeData);
      } catch (e) {
        console.warn("Fehler beim Laden der Monatlichen Challenge", e);
      }

      // 8. Nutzerliste
      try {
        const userSnap = await getDocs(collection(db, "users"));
        const fetchedUsers: any[] = [];
        userSnap.forEach((d) =>
          fetchedUsers.push({ uid: d.id, id: d.id, ...d.data() })
        );
        setUsers(fetchedUsers);
      } catch (e) {
        console.warn("Fehler beim Laden der Nutzerliste", e);
      }

      // 9. Achievements & Fortschritt
      try {
        const [achSnap, progSnap] = await Promise.all([
          getDocs(collection(db, "achievements")),
          getDocs(collection(db, `users/${userProfile.uid}/achievements`)),
        ]);

        const fetchedAch: DynamicAchievement[] = [];
        achSnap.forEach((d) =>
          fetchedAch.push({ id: d.id, ...d.data() } as DynamicAchievement)
        );

        const progMap: Record<string, UserAchievementProgress> = {};
        progSnap.forEach(
          (d) => (progMap[d.id] = d.data() as UserAchievementProgress)
        );

        setAchievements(fetchedAch);
        setUserProgress(progMap);
      } catch (e) {
        console.warn("Fehler beim Laden der Achievements", e);
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

  const saveWidgetsToFirestore = async (
    updatedWidgets: WidgetConfig[],
    updatedFavorites?: string[]
  ) => {
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
  const activePlan =
    trainingPlans.find((p) => p.status !== "completed") || trainingPlans[0];
  const calculatePlanProgress = (plan: any) => {
    if (!plan?.blocks) return 0;
    let totalExercises = 0;
    let completedExercises = 0;
    plan.blocks.forEach((block: any) => {
      block.exercises?.forEach((ex: any) => {
        totalExercises++;
        const hasResult = testResults.some(
          (r) =>
            r.userId === userProfile?.uid &&
            (r.exerciseId === ex.exerciseId || r.testId === ex.exerciseId)
        );
        if (hasResult || ex.completed || ex.completedAt) completedExercises++;
      });
    });
    return totalExercises > 0
      ? Math.round((completedExercises / totalExercises) * 100)
      : 0;
  };
  const planProgressPercent = activePlan
    ? calculatePlanProgress(activePlan)
    : 0;

  // 2. Leistungstest
  const nextTest =
    assignedTests.find((t) => t.status !== "completed") || assignedTests[0];

  // 3. Übung des Monats
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const currentMonthlyConfig = monthlyConfigs.find(
    (m) => m.month === currentMonth && m.year === currentYear
  );
  const monthlyExercise = exercises.find(
    (e) => e.id === currentMonthlyConfig?.exerciseId
  );

  const scoresByUser: { [userId: string]: number } = {};
  if (monthlyExercise) {
    testResults.forEach((res) => {
      const resExId = res.exerciseId || res.testId;
      if (resExId === monthlyExercise.id) {
        const resDate = new Date(res.completedAt);
        if (
          resDate.getMonth() + 1 === currentMonth &&
          resDate.getFullYear() === currentYear
        ) {
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
    (item) =>
      item.user?.uid === userProfile?.uid || item.user?.id === userProfile?.uid
  );
  const userMonthlyEntry =
    userMonthlyIndex !== -1 ? monthlyLeaderboard[userMonthlyIndex] : null;
  const userMonthlyRank = userMonthlyIndex !== -1 ? userMonthlyIndex + 1 : null;

  // 4. Achievements Berechnungen
  const unlockedAchievements = achievements.filter((ach) => {
    const prog = userProgress[ach.id];
    return prog && prog.unlockedTiers && prog.unlockedTiers.length > 0;
  });

  const totalXp = Object.values(userProgress).reduce((sum, prog) => {
    return sum + (prog.unlockedTiers?.length || 0) * 25;
  }, 0);

  // 5. Statistik letzte 7 Tage
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentResults = testResults.filter(
    (r) =>
      r.userId === userProfile?.uid && new Date(r.completedAt) >= sevenDaysAgo
  );
  const totalPoints7Days = recentResults.reduce(
    (sum, r) => sum + (r.totalPoints || r.points || 0),
    0
  );
  const avgHitRate7Days =
    recentResults.length > 0
      ? (
          recentResults.reduce(
            (sum, r) => sum + (r.hitRate || r.accuracy || 0),
            0
          ) / recentResults.length
        ).toFixed(1)
      : "0";

  // 6. Lieblingsübungen
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
            sx={{
              p: { xs: 2, sm: 3 },
              bgcolor: "background.paper",
              borderColor: "divider",
              borderLeft: 4,
              borderLeftColor: "primary.main",
              cursor: "pointer",
            }}
            onClick={() => onNavigate("profile")}
            className="shadow-sm hover:opacity-95 transition-opacity"
          >
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <NotificationsIcon
                color="primary"
                fontSize={isMobile ? "small" : "medium"}
              />
              <Typography
                variant={isMobile ? "subtitle1" : "h6"}
                className="font-bold text-sm sm:text-base"
                color="text.primary"
              >
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
                  <Box
                    key={n.id}
                    sx={{ p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}
                    className="flex justify-between items-center gap-2"
                  >
                    <Typography
                      variant="body2"
                      color="text.primary"
                      className="text-xs sm:text-sm"
                    >
                      {n.message || n.title}
                    </Typography>
                    <span className="text-[10px] sm:text-xs text-gray-400 font-semibold uppercase">
                      Neu
                    </span>
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
            sx={{
              p: { xs: 2, sm: 3 },
              bgcolor: "background.paper",
              borderColor: "divider",
              cursor: "pointer",
            }}
            onClick={() => onNavigate("player-plan")}
            className="shadow-sm hover:opacity-95 transition-opacity"
          >
            <div className="flex items-center gap-2 mb-2">
              <FitnessCenterIcon
                color="primary"
                fontSize={isMobile ? "small" : "medium"}
              />
              <Typography
                variant={isMobile ? "subtitle1" : "h6"}
                className="font-bold text-sm sm:text-base"
                color="text.primary"
              >
                Aktueller Trainingsplan
              </Typography>
            </div>
            {activePlan ? (
              <>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  className="mb-2 text-xs sm:text-sm"
                >
                  {activePlan.title} (KW {activePlan.calendarWeek} /{" "}
                  {activePlan.year})
                </Typography>
                <div
                  className="flex justify-between text-xs sm:text-sm mb-1 font-medium"
                  style={{ color: "inherit" }}
                >
                  <span>Fortschritt</span>
                  <span>{planProgressPercent}%</span>
                </div>
                <LinearProgress
                  variant="determinate"
                  value={planProgressPercent}
                  className="rounded h-2"
                />
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Aktuell ist kein aktiver Trainingsplan zugewiesen.
              </Typography>
            )}
          </Paper>
        );

      case "monthlyChallenge": {
        const completedCount =
          userMonthlyChallenge?.tasks.filter((t) => t.completed).length || 0;
        const isFinished = completedCount === 7;

        return (
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 3 },
              bgcolor: "background.paper",
              borderColor: "divider",
            }}
            className="shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <MilitaryTechIcon color="primary" />
                  <Typography
                    variant={isMobile ? "subtitle1" : "h6"}
                    className="font-bold text-sm sm:text-base"
                    color="text.primary"
                  >
                    Dart-Pass
                  </Typography>
                </div>

                {userMonthlyChallenge && (
                  <Chip
                    label={userMonthlyChallenge.difficulty.toUpperCase()}
                    size="small"
                    sx={{
                      bgcolor:
                        userMonthlyChallenge.difficulty === "gold"
                          ? "#ffd700"
                          : userMonthlyChallenge.difficulty === "silver"
                          ? "#c0c0c0"
                          : "#cd7f32",
                      color:
                        userMonthlyChallenge.difficulty === "silver"
                          ? "#000"
                          : "#fff",
                      fontWeight: "bold",
                    }}
                  />
                )}
              </div>

              {!userMonthlyChallenge ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  className="mb-4 text-xs sm:text-sm"
                >
                  Du hast für diesen Monat noch keine Schwierigkeitsstufe gewählt.
                  Starte jetzt deine 7 Monats-Aufgaben!
                </Typography>
              ) : (
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center text-xs sm:text-sm font-semibold">
                    <span className="text-stone-600 dark:text-stone-300">
                      Fortschritt:
                    </span>
                    <span className="text-primary font-bold">
                      {completedCount} / 7 Aufgaben
                    </span>
                  </div>
                  <LinearProgress
                    variant="determinate"
                    value={(completedCount / 7) * 100}
                    color={isFinished ? "success" : "primary"}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  {isFinished && (
                    <Typography
                      variant="caption"
                      color="success.main"
                      className="font-bold block mt-1"
                    >
                      🎉 Alle Aufgaben erledigt in {userMonthlyChallenge.daysNeeded}{" "}
                      Tag(en)!
                    </Typography>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-2">
              <Button
                variant="contained"
                color="primary"
                size="small"
                fullWidth
                onClick={() => onNavigate("monthly-challenge")}
                className="text-xs sm:text-sm"
              >
                {userMonthlyChallenge
                  ? "Zur Trainingskarte"
                  : "Challenge Starten"}
              </Button>
              {userMonthlyChallenge && isFinished && (
                <Button
                  variant="outlined"
                  color="success"
                  size="small"
                  onClick={() => onNavigate("monthly-challenge-leaderboard")}
                  className="text-xs sm:text-sm"
                >
                  Rangliste
                </Button>
              )}
            </div>
          </Paper>
        );
      }

      case "performanceTest":
        return (
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 3 },
              bgcolor: "background.paper",
              borderColor: "divider",
              cursor: "pointer",
            }}
            onClick={() => onNavigate("tests")}
            className="shadow-sm hover:opacity-95 transition-opacity"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUpIcon
                color="primary"
                fontSize={isMobile ? "small" : "medium"}
              />
              <Typography
                variant={isMobile ? "subtitle1" : "h6"}
                className="font-bold text-sm sm:text-base"
                color="text.primary"
              >
                Leistungstest
              </Typography>
            </div>
            {nextTest ? (
              <Typography
                variant="body2"
                color="text.primary"
                className="mb-2 pb-1 text-xs sm:text-sm"
              >
                Zugewiesener Test: <strong>{nextTest.title}</strong> (Status:{" "}
                {nextTest.status === "completed" ? "Erledigt" : "Offen"})
              </Typography>
            ) : (
              <Typography
                variant="body2"
                color="text.secondary"
                className="mb-2 pb-1 text-xs sm:text-sm"
              >
                Keine offenen Leistungstests zugewiesen.
              </Typography>
            )}
            <Button variant="outlined" size="small" className="text-xs">
              Zu den Tests
            </Button>
          </Paper>
        );

      case "exerciseOfTheMonth":
        return (
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 3 },
              bgcolor: "background.paper",
              borderColor: "divider",
            }}
            className="shadow-sm flex flex-col gap-3 sm:gap-4"
          >
            <div className="flex justify-between items-start flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <EmojiEventsIcon
                  color="primary"
                  fontSize={isMobile ? "medium" : "large"}
                />
                <div>
                  <Typography
                    variant={isMobile ? "subtitle1" : "h6"}
                    className="font-bold text-sm sm:text-base"
                    color="text.primary"
                  >
                    Übung des Monats:{" "}
                    {monthlyExercise ? monthlyExercise.title : "Keine aktiv"}
                  </Typography>
                </div>
              </div>

              <Button
                variant="outlined"
                size="small"
                onClick={() => onNavigate("league")}
                className="text-xs"
              >
                Zur Rangliste
              </Button>
            </div>

            {monthlyExercise ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                <div className="md:col-span-2 flex flex-col justify-between gap-3">
                  <div>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      className="mb-2 text-xs sm:text-sm"
                    >
                      {monthlyExercise.description ||
                        "Keine Kurzbeschreibung vorhanden."}
                    </Typography>

                    {monthlyExercise.instructions && (
                      <Accordion
                        elevation={0}
                        variant="outlined"
                        sx={{ bgcolor: "action.hover" }}
                        className="rounded"
                      >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography
                            variant="caption"
                            className="font-bold flex items-center gap-1 text-xs"
                            color="text.primary"
                          >
                            <HelpIcon fontSize="small" color="primary" />{" "}
                            Spielanleitung anzeigen
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Typography
                            variant="body2"
                            className="whitespace-pre-line text-xs"
                            color="text.secondary"
                          >
                            {monthlyExercise.instructions}
                          </Typography>
                        </AccordionDetails>
                      </Accordion>
                    )}
                  </div>

                  <div>
                    <Button
                      variant="contained"
                      color="primary"
                      size={isMobile ? "small" : "medium"}
                      startIcon={<PlayArrowIcon />}
                      onClick={() =>
                        setSelectedExerciseToRecord(monthlyExercise)
                      }
                      className="text-xs sm:text-sm"
                    >
                      Ergebnis eintragen
                    </Button>
                  </div>
                </div>

                <Paper
                  variant="outlined"
                  sx={{ p: 2, bgcolor: "action.hover", borderColor: "divider" }}
                  className="flex flex-col justify-between gap-3"
                >
                  <div>
                    <Typography
                      variant="subtitle2"
                      className="font-bold mb-2 text-xs sm:text-sm"
                      color="text.secondary"
                    >
                      Top 3 Spieler
                    </Typography>
                    {top3Monthly.length === 0 ? (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        className="text-xs"
                      >
                        Bisher keine Ergebnisse diesen Monat.
                      </Typography>
                    ) : (
                      <ul
                        className="space-y-1 text-xs sm:text-sm"
                        style={{ color: "inherit" }}
                      >
                        {top3Monthly.map((entry, idx) => {
                          const medal =
                            idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉";
                          const name =
                            entry.user?.nickname ||
                            entry.user?.realName ||
                            "Spieler";
                          return (
                            <li
                              key={idx}
                              className="flex justify-between items-center"
                            >
                              <span>
                                {medal} {name}
                              </span>
                              <strong className="text-xs">
                                {entry.score} Pkt.
                              </strong>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  <Box sx={{ pt: 1, borderTop: 1, borderColor: "divider" }}>
                    <Typography
                      variant="caption"
                      className="font-bold text-xs"
                      color="primary.main"
                    >
                      Dein Platz
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      className="font-bold text-sm sm:text-base"
                      color="text.primary"
                    >
                      {userMonthlyRank
                        ? `Platz ${userMonthlyRank}`
                        : "Nicht platziert"}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      className="text-[11px]"
                    >
                      {userMonthlyEntry
                        ? `Mit ${userMonthlyEntry.score} Punkten`
                        : "Trage dein Ergebnis ein!"}
                    </Typography>
                  </Box>
                </Paper>
              </div>
            ) : (
              <Typography
                variant="body2"
                color="text.secondary"
                className="text-xs sm:text-sm"
              >
                Für den aktuellen Monat wurde noch keine Übung des Monats vom
                Admin festgelegt.
              </Typography>
            )}
          </Paper>
        );

      case "achievements":
        return (
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 3 },
              bgcolor: "background.paper",
              borderColor: "divider",
            }}
            className="shadow-sm flex flex-col gap-3"
          >
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <EmojiEventsIcon
                  sx={{ color: "#FFD700" }}
                  fontSize={isMobile ? "small" : "medium"}
                />
                <Typography
                  variant={isMobile ? "subtitle1" : "h6"}
                  className="font-bold text-sm sm:text-base"
                  color="text.primary"
                >
                  Meine Erfolge & Badges
                </Typography>
              </div>

              <Chip
                icon={<EmojiEventsIcon />}
                label={`Gesamt XP: ${totalXp}`}
                color="primary"
                size="small"
                className="font-bold text-xs"
              />
            </div>

            {unlockedAchievements.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                {unlockedAchievements.slice(0, 3).map((ach) => {
                  const prog = userProgress[ach.id];
                  const highestTier =
                    prog.unlockedTiers[prog.unlockedTiers.length - 1];
                  const tierInfo = TIER_COLORS[highestTier] || {
                    color: "#FFD700",
                    label: highestTier,
                  };

                  return (
                    <Paper
                      key={ach.id}
                      variant="outlined"
                      sx={{
                        bgcolor: "action.hover",
                        borderColor: "divider",
                        p: 1.5,
                      }}
                      className="flex items-center gap-2.5"
                    >
                      <EmojiEventsIcon
                        sx={{ fontSize: 28, color: tierInfo.color }}
                      />
                      <Box className="overflow-hidden">
                        <Typography
                          variant="subtitle2"
                          className="font-bold text-xs truncate"
                          color="text.primary"
                        >
                          {ach.title}
                        </Typography>
                        <Chip
                          label={tierInfo.label}
                          size="small"
                          sx={{
                            bgcolor: tierInfo.color,
                            color: "#000",
                            fontWeight: "bold",
                            fontSize: "0.6rem",
                            height: 16,
                          }}
                        />
                      </Box>
                    </Paper>
                  );
                })}
              </div>
            ) : (
              <Typography
                variant="body2"
                color="text.secondary"
                className="text-xs italic"
              >
                Du hast noch keine Erfolge freigeschaltet. Absolviere Übungen,
                um deine ersten Badges zu verdienen!
              </Typography>
            )}

            <Box className="flex justify-end pt-1">
              <Button
                variant="outlined"
                size="small"
                onClick={() => onNavigate("player-achievements")}
                className="text-xs"
              >
                Alle Erfolge ansehen
              </Button>
            </Box>
          </Paper>
        );

      case "coachMessage":
        return (
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 3 },
              bgcolor: "background.paper",
              borderColor: "divider",
            }}
            className="shadow-sm flex flex-col gap-3"
          >
            <div className="flex items-center gap-2">
              <ChatIcon
                color="primary"
                fontSize={isMobile ? "small" : "medium"}
              />
              <Typography
                variant={isMobile ? "subtitle1" : "h6"}
                className="font-bold text-sm sm:text-base"
                color="text.primary"
              >
                Trainer-Kommunikation
              </Typography>
            </div>

            <Typography
              variant="body2"
              color="text.secondary"
              className="text-xs sm:text-sm"
            >
              Informiere deinen Trainer direkt über Abwesenheiten, Urlaube,
              Liga-Ergebnisse oder sonstige Anliegen.
            </Typography>

            <Box className="flex justify-start">
              <Button
                variant="contained"
                color="primary"
                size="small"
                startIcon={<MailOutlined />}
                disabled={!userProfile?.assignedCoachId}
                onClick={() => setIsMessageModalOpen(true)}
                className="text-xs sm:text-sm"
              >
                {userProfile?.assignedCoachId
                  ? "Nachricht an Trainer schreiben"
                  : "Kein Trainer zugewiesen"}
              </Button>
            </Box>
          </Paper>
        );

      case "stats7Days":
        return (
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 3 },
              bgcolor: "background.paper",
              borderColor: "divider",
              cursor: "pointer",
            }}
            onClick={() => onNavigate("player-stats")}
            className="shadow-sm hover:opacity-95 transition-opacity"
          >
            <div className="flex items-center gap-2 mb-3">
              <BarChartIcon
                color="primary"
                fontSize={isMobile ? "small" : "medium"}
              />
              <Typography
                variant={isMobile ? "subtitle1" : "h6"}
                className="font-bold text-sm sm:text-base"
                color="text.primary"
              >
                Allgemeine Statistik (Letzte 7 Tage)
              </Typography>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-center">
              <Box sx={{ p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  className="block text-[11px]"
                >
                  Absolvierte Übungen
                </Typography>
                <Typography
                  variant="subtitle1"
                  className="font-bold text-sm sm:text-base"
                  color="text.primary"
                >
                  {recentResults.length}
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  className="block text-[11px]"
                >
                  Gesamtpunkte
                </Typography>
                <Typography
                  variant="subtitle1"
                  className="font-bold text-sm sm:text-base"
                  color="text.primary"
                >
                  {totalPoints7Days}
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  className="block text-[11px]"
                >
                  Ø Trefferquote
                </Typography>
                <Typography
                  variant="subtitle1"
                  className="font-bold text-sm sm:text-base"
                  color="text.primary"
                >
                  {avgHitRate7Days}%
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  className="block text-[11px]"
                >
                  Status
                </Typography>
                <Typography
                  variant="subtitle1"
                  className="font-bold text-sm sm:text-base"
                  color="text.primary"
                >
                  Aktiv
                </Typography>
              </Box>
            </div>
          </Paper>
        );

      case "performanceLeague":
        return (
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 3 },
              bgcolor: "background.paper",
              borderColor: "divider",
              cursor: "pointer",
            }}
            onClick={() => onNavigate("league")}
            className="shadow-sm border-dashed hover:opacity-95 transition-opacity"
          >
            <div className="flex items-center gap-2 mb-2">
              <EmojiEventsIcon
                color="action"
                fontSize={isMobile ? "small" : "medium"}
              />
              <Typography
                variant={isMobile ? "subtitle1" : "h6"}
                className="font-bold text-sm sm:text-base"
                color="text.primary"
              >
                Performance League
              </Typography>
            </div>
            <Typography
              variant="body2"
              color="text.secondary"
              className="text-xs sm:text-sm"
            >
              Klicke hier, um zur Trainingsliga zu gelangen.
            </Typography>
          </Paper>
        );

      case "matchLeague":
        return (
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 3 },
              bgcolor: "background.paper",
              borderColor: "divider",
              cursor: "pointer",
            }}
            onClick={() => onNavigate("league")}
            className="shadow-sm border-dashed hover:opacity-95 transition-opacity"
          >
            <div className="flex items-center gap-2 mb-2">
              <SportsKabaddiIcon
                color="action"
                fontSize={isMobile ? "small" : "medium"}
              />
              <Typography
                variant={isMobile ? "subtitle1" : "h6"}
                className="font-bold text-sm sm:text-base"
                color="text.primary"
              >
                Match League – Direkter Vergleich
              </Typography>
            </div>
            <Typography
              variant="body2"
              color="text.secondary"
              className="text-xs sm:text-sm"
            >
              Vergleiche deine Leistungen mit deinen Nachbarn in der Rangliste.
            </Typography>
          </Paper>
        );

      case "favoriteExercises":
        return (
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 3 },
              bgcolor: "background.paper",
              borderColor: "divider",
            }}
            className="shadow-sm border-dashed"
          >
            <div className="flex items-center gap-2 mb-3">
              <Typography
                variant={isMobile ? "subtitle1" : "h6"}
                className="font-bold text-sm sm:text-base"
                color="text.primary"
              >
                Deine Lieblingsübungen
              </Typography>
            </div>

            {userFavoriteExercisesList.length === 0 ? (
              <Typography
                variant="body2"
                color="text.secondary"
                className="text-xs sm:text-sm"
              >
                Noch keine Lieblingsübungen ausgewählt. Klicke auf "Dashboard
                anpassen", um bis zu 3 Übungen auszuwählen.
              </Typography>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                {userFavoriteExercisesList.map((ex: any) => (
                  <Paper
                    key={ex.id}
                    variant="outlined"
                    sx={{
                      p: 2,
                      bgcolor: "action.hover",
                      borderColor: "divider",
                    }}
                    className="flex flex-col justify-between gap-2"
                  >
                    <div>
                      <Typography
                        variant="subtitle2"
                        className="font-bold text-sm"
                        color="text.primary"
                      >
                        {ex.title}
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        className="my-1.5 text-xs"
                      >
                        {ex.description || "Keine Kurzbeschreibung vorhanden."}
                      </Typography>

                      {ex.instructions && (
                        <Accordion
                          elevation={0}
                          variant="outlined"
                          sx={{ bgcolor: "background.paper" }}
                          className="mb-2 rounded"
                        >
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography
                              variant="caption"
                              className="font-bold flex items-center gap-1 text-[11px]"
                              color="text.primary"
                            >
                              <HelpIcon fontSize="small" color="primary" />{" "}
                              Spielanleitung
                            </Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Typography
                              variant="body2"
                              className="whitespace-pre-line text-xs"
                              color="text.secondary"
                            >
                              {ex.instructions}
                            </Typography>
                          </AccordionDetails>
                        </Accordion>
                      )}
                    </div>

                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      fullWidth
                      startIcon={<PlayArrowIcon />}
                      onClick={() => setSelectedExerciseToRecord(ex)}
                      className="text-xs"
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
    <Box className="p-2 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-6">
      {/* Kopfbereich */}
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, sm: 3 },
          bgcolor: "background.paper",
          borderColor: "divider",
        }}
        className="flex flex-wrap justify-between items-center gap-3 shadow-sm"
      >
        <div>
          <Typography
            variant={isMobile ? "h6" : "h5"}
            className="font-bold leading-snug"
            color="text.primary"
          >
            Willkommen zurück,{" "}
            {userProfile?.nickname || userProfile?.realName || "Spieler"}!
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            className="text-xs sm:text-sm"
          >
            Dein persönlicher Trainingsüberblick.{" "}
            {saving && "(Speichere Layout...)"}
          </Typography>
        </div>
        <Button
          variant="contained"
          size={isMobile ? "small" : "medium"}
          startIcon={<SettingsIcon />}
          onClick={() => setIsCustomizeOpen(true)}
          className="text-xs sm:text-sm"
        >
          Dashboard anpassen
        </Button>
      </Paper>

      {/* Widgets */}
      <div className="space-y-3 sm:space-y-4">
        {widgets
          .filter((w) => w.enabled)
          .map((widget) => (
            <React.Fragment key={widget.id}>
              {renderWidgetContent(widget.id)}
            </React.Fragment>
          ))}
      </div>

      {/* Anpassungs-Modal */}
      <Dialog
        open={isCustomizeOpen}
        onClose={() => setIsCustomizeOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle className="font-bold text-base sm:text-lg">
          Dashboard anpassen
        </DialogTitle>
        <DialogContent dividers className="p-3 sm:p-6">
          <Typography
            variant="body2"
            color="textSecondary"
            className="mb-4 text-xs sm:text-sm"
          >
            Passe die Reihenfolge an, aktiviere optionale Widgets und wähle
            unten deine persönlichen Lieblingsübungen aus.
          </Typography>

          <Box
            sx={{
              mb: 3,
              p: 2,
              bgcolor: "action.hover",
              borderRadius: 1,
              border: 1,
              borderColor: "divider",
            }}
            className="space-y-2"
          >
            <Typography
              variant="subtitle2"
              className="font-bold text-xs sm:text-sm"
              color="text.primary"
            >
              Lieblingsübungen konfigurieren (1 bis 3 wählbar)
            </Typography>
            <FormControl fullWidth size="small">
              <InputLabel id="favorite-exercises-select-label">
                Übungen wählen
              </InputLabel>
              <Select
                labelId="favorite-exercises-select-label"
                multiple
                value={selectedFavoriteIds}
                onChange={handleFavoriteChange}
                input={<OutlinedInput label="Übungen wählen" />}
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selected.map((id) => {
                      const ex = exercises.find((e) => e.id === id);
                      return (
                        <Chip
                          key={id}
                          label={ex ? ex.title : id}
                          size="small"
                        />
                      );
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

          <Typography
            variant="subtitle2"
            className="font-bold mb-2 text-xs sm:text-sm"
            color="text.primary"
          >
            Widget-Reihenfolge & Sichtbarkeit
          </Typography>
          <div className="space-y-2">
            {widgets.map((widget, index) => (
              <Box
                key={widget.id}
                sx={{ bgcolor: "action.hover", borderColor: "divider" }}
                className="flex items-center justify-between p-2 border rounded"
              >
                <div className="flex items-center gap-2 max-w-[65%]">
                  <Typography
                    variant="body2"
                    className="font-medium text-xs sm:text-sm truncate"
                    color="text.primary"
                  >
                    {widget.title}
                  </Typography>
                  {widget.required && (
                    <span className="text-[10px] bg-primary-main text-white px-1.5 py-0.5 rounded font-semibold shrink-0">
                      Pflicht
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-0.5">
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
                      size="small"
                    />
                  )}
                </div>
              </Box>
            ))}
          </div>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={() => setIsCustomizeOpen(false)}
            size="small"
          >
            Fertig
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal zum Eintragen eines Ergebnisses */}
      {selectedExerciseToRecord && (
        <RecordResultModal
          open={!!selectedExerciseToRecord}
          onClose={() => setSelectedExerciseToRecord(null)}
          exercise={selectedExerciseToRecord}
          allExercises={exercises}
          onResultRecorded={handleResultSaved}
        />
      )}

      {/* Modal zur Nachricht an den Trainer */}
      <SendCoachMessageModal
        open={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        coachId={userProfile?.assignedCoachId}
      />
    </Box>
  );
};
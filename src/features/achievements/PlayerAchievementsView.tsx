import React, { useState, useEffect, useMemo } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import type {
  DynamicAchievement,
  AchievementTier,
  UserAchievementProgress,
} from "../../types/achievement";
import type { Exercise } from "../../types/exercise";
import { calculateUserLevel } from "../../utils/level";
import {
  Paper,
  Typography,
  Box,
  LinearProgress,
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import LockIcon from "@mui/icons-material/Lock";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SearchIcon from "@mui/icons-material/Search";
import StarsIcon from "@mui/icons-material/Stars";

const TIER_COLORS: Record<AchievementTier, { color: string; label: string }> = {
  bronze: { color: "#CD7F32", label: "Bronze" },
  silver: { color: "#C0C0C0", label: "Silber" },
  gold: { color: "#FFD700", label: "Gold" },
  platinum: { color: "#E5E4E2", label: "Platin" },
  diamond: { color: "#B9F2FF", label: "Diamant" },
};

export const PlayerAchievementsView: React.FC = () => {
  const { userProfile } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [achievements, setAchievements] = useState<DynamicAchievement[]>([]);
  const [exercisesMap, setExercisesMap] = useState<Record<string, Exercise>>({});
  const [userProgress, setUserProgress] = useState<
    Record<string, UserAchievementProgress>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Such-Zustände
  const [categoryTab, setCategoryTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!userProfile?.uid) return;
      setLoading(true);
      setError(null);

      try {
        // Parallel-Fetches zur Reduzierung von Ladezeiten
        const [achSnap, progressSnap, exercisesSnap] = await Promise.all([
          getDocs(collection(db, "achievements")),
          getDocs(collection(db, `users/${userProfile.uid}/achievements`)),
          getDocs(collection(db, "exercises")),
        ]);

        if (!isMounted) return;

        // 1. Global definierte Achievements laden
        const fetchedAch: DynamicAchievement[] = [];
        achSnap.forEach((d) => {
          fetchedAch.push({ id: d.id, ...d.data() } as DynamicAchievement);
        });

        // 2. User-Fortschritt laden
        const progressMap: Record<string, UserAchievementProgress> = {};
        progressSnap.forEach((d) => {
          progressMap[d.id] = d.data() as UserAchievementProgress;
        });

        // 3. Übungen als Map für ultraschnellen Namens-Lookup aufbauen
        const exMap: Record<string, Exercise> = {};
        exercisesSnap.forEach((d) => {
          exMap[d.id] = { id: d.id, ...d.data() } as Exercise;
        });

        setAchievements(fetchedAch);
        setUserProgress(progressMap);
        setExercisesMap(exMap);
      } catch (err) {
        console.error("Fehler beim Laden der Erfolge:", err);
        if (isMounted) {
          setError("Erfolge konnten nicht geladen werden.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [userProfile?.uid]);

  // Gesamt-XP berechnen aus allen freigeschalteten Stufen
  const totalXp = useMemo(() => {
    return Object.values(userProgress).reduce((sum, prog) => {
      return sum + (prog.unlockedTiers?.length || 0) * 25;
    }, 0);
  }, [userProgress]);

  // Dynamic User Level berechnen
  const levelInfo = useMemo(() => {
    return calculateUserLevel(totalXp);
  }, [totalXp]);

  // Gefilterte Achievements (Kategorie, Versteckte Erfolge, Suche)
  const filteredAchievements = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return achievements.filter((ach) => {
      const prog = userProgress[ach.id];
      const hasUnlockedTier = (prog?.unlockedTiers?.length || 0) > 0;

      // RULE: Versteckte Erfolge ausblenden, solange keine Stufe erfüllt ist
      if (ach.isSecret && !hasUnlockedTier) {
        return false;
      }

      // Filter 1: Kategorie
      if (categoryTab !== "all" && ach.category !== categoryTab) {
        return false;
      }

      // Filter 2: Suche nach Titel, Beschreibung oder Übung/Trigger
      if (query) {
        const titleMatch = ach.title?.toLowerCase().includes(query);
        const descMatch = ach.description?.toLowerCase().includes(query);
        const linkedExercise = ach.exerciseId
          ? exercisesMap[ach.exerciseId]
          : null;
        const exerciseMatch = linkedExercise?.title
          .toLowerCase()
          .includes(query);

        return titleMatch || descMatch || exerciseMatch;
      }

      return true;
    });
  }, [achievements, userProgress, categoryTab, searchQuery, exercisesMap]);

  if (loading) {
    return (
      <Box className="flex justify-center items-center p-8">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="p-2 sm:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-6">
      {error && <Alert severity="error">{error}</Alert>}

      {/* Header Banner mit Gesamt-XP, Level & Level-Fortschritt */}
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, sm: 3 },
          bgcolor: "background.paper",
          borderColor: "divider",
        }}
        className="flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm"
      >
        <div className="flex items-center gap-3 sm:gap-4 text-center sm:text-left w-full md:w-auto justify-center md:justify-start">
          <EmojiEventsIcon
            sx={{ fontSize: { xs: 44, sm: 54 }, color: "#FFD700" }}
          />
          <div>
            <Typography
              variant={isMobile ? "h6" : "h5"}
              className="font-bold"
              color="text.primary"
            >
              Meine Erfolge & Auszeichnungen
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Schließe Herausforderungen ab, um Badges und XP für dein Profil
              freizuschalten.
            </Typography>
          </div>
        </div>

        {/* Level & XP-Kachel */}
        <Box className="w-full md:w-80 flex flex-col gap-1.5 p-3 rounded-lg border border-divider bg-action-hover">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <Chip
                icon={<StarsIcon fontSize="small" />}
                label={`Level ${levelInfo.level}`}
                color="primary"
                size="small"
                className="font-bold text-xs sm:text-sm"
              />
            </div>
            <Typography
              variant="caption"
              className="font-bold"
              color="text.secondary"
            >
              {levelInfo.currentXp} / {levelInfo.xpForNextLevel} XP
            </Typography>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <Typography
                variant="caption"
                color="text.secondary"
                className="text-[11px]"
              >
                Nächstes Level
              </Typography>
              <Typography
                variant="caption"
                color="text.primary"
                className="font-semibold text-[11px]"
              >
                {levelInfo.progressPercent}%
              </Typography>
            </div>
            <LinearProgress
              variant="determinate"
              value={levelInfo.progressPercent}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </div>
        </Box>
      </Paper>

      {/* Suchfeld & Kategorie-Tabs */}
      <Paper
        variant="outlined"
        sx={{ bgcolor: "background.paper", borderColor: "divider", p: 2 }}
        className="space-y-3"
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Suche nach Erfolg, Beschreibung oder Übung..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            },
          }}
        />

        <Tabs
          value={categoryTab}
          onChange={(_, val) => setCategoryTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{ minHeight: 40 }}
        >
          <Tab label="Alle Erfolge" value="all" sx={{ py: 0.5 }} />
          <Tab label="Training & Übungen" value="training" sx={{ py: 0.5 }} />
          <Tab label="Liga & Wettkampf" value="league" sx={{ py: 0.5 }} />
          <Tab label="Social & Community" value="social" sx={{ py: 0.5 }} />
          <Tab label="Spezial & Streaks" value="special" sx={{ py: 0.5 }} />
        </Tabs>
      </Paper>

      {/* Grid aller Erfolge */}
      {filteredAchievements.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{ bgcolor: "background.paper", borderColor: "divider", p: 4 }}
          className="text-center"
        >
          <Typography variant="body1" color="text.secondary">
            Keine Erfolge für diese Suche oder Kategorie gefunden.
          </Typography>
        </Paper>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(1, 1fr)",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
            },
            gap: { xs: 2, sm: 3 },
          }}
        >
          {filteredAchievements.map((ach) => {
            const prog = userProgress[ach.id] || {
              currentValue: 0,
              unlockedTiers: [],
            };
            const highestRequirement =
              ach.requirements?.[ach.requirements.length - 1];
            const maxThreshold = highestRequirement?.threshold || 100;
            const progressPercent = Math.min(
              100,
              (prog.currentValue / maxThreshold) * 100,
            );
            const linkedExercise = ach.exerciseId
              ? exercisesMap[ach.exerciseId]
              : null;

            return (
              <Card
                key={ach.id}
                variant="outlined"
                sx={{
                  bgcolor: "background.paper",
                  borderColor: "divider",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2">
                      <EmojiEventsIcon color="primary" />
                      <Typography
                        variant="subtitle1"
                        className="font-bold leading-snug"
                        color="text.primary"
                      >
                        {ach.title}
                      </Typography>
                    </div>
                  </div>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    className="min-h-[38px] text-xs sm:text-sm"
                  >
                    {ach.description}
                  </Typography>

                  {/* Falls an eine bestimmte Übung gekoppelt */}
                  {linkedExercise && (
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`Übung: ${linkedExercise.title}`}
                      sx={{
                        fontSize: "0.7rem",
                        maxWidth: "100%",
                        justifyContent: "flex-start",
                      }}
                    />
                  )}

                  {/* Stufen / Tier Badges */}
                  <div className="flex gap-1 flex-wrap my-1">
                    {ach.requirements?.map((req) => {
                      const isUnlocked = prog.unlockedTiers?.includes(
                        req.tier,
                      );
                      const tierInfo = TIER_COLORS[req.tier];

                      return (
                        <Chip
                          key={req.tier}
                          size="small"
                          label={`${tierInfo.label} (${req.threshold})`}
                          icon={
                            isUnlocked ? (
                              <CheckCircleIcon fontSize="small" />
                            ) : (
                              <LockIcon fontSize="small" />
                            )
                          }
                          sx={{
                            bgcolor: isUnlocked
                              ? tierInfo.color
                              : "action.hover",
                            color: isUnlocked
                              ? "#000000"
                              : "text.secondary",
                            fontWeight: isUnlocked ? "bold" : "normal",
                            fontSize: "0.7rem",
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Fortschrittsbalken */}
                  <div className="mt-auto pt-2">
                    <div className="flex justify-between items-center mb-1">
                      <Typography variant="caption" color="text.secondary">
                        Fortschritt
                      </Typography>
                      <Typography
                        variant="caption"
                        className="font-bold"
                        color="text.primary"
                      >
                        {prog.currentValue} / {maxThreshold}
                      </Typography>
                    </div>
                    <LinearProgress
                      variant="determinate"
                      value={progressPercent}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
};
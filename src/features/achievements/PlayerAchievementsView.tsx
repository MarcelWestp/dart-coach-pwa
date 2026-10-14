import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import type {
  DynamicAchievement,
  AchievementTier,
  UserAchievementProgress,
} from "../../types/achievement";
import {
  Paper,
  Typography,
  Box,
  LinearProgress,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import LockIcon from "@mui/icons-material/Lock";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

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
  const [userProgress, setUserProgress] = useState<
    Record<string, UserAchievementProgress>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryTab, setCategoryTab] = useState<string>("all");

  useEffect(() => {
    const fetchData = async () => {
      if (!userProfile?.uid) return;
      setLoading(true);
      try {
        // Achievements laden
        const achSnap = await getDocs(collection(db, "achievements"));
        const fetchedAch: DynamicAchievement[] = [];
        achSnap.forEach((d) => {
          fetchedAch.push({ id: d.id, ...d.data() } as DynamicAchievement);
        });

        // User Fortschritt laden
        const progressSnap = await getDocs(
          collection(db, `users/${userProfile.uid}/achievements`),
        );
        const progressMap: Record<string, UserAchievementProgress> = {};
        progressSnap.forEach((d) => {
          progressMap[d.id] = d.data() as UserAchievementProgress;
        });

        setAchievements(fetchedAch);
        setUserProgress(progressMap);
      } catch (err) {
        console.error("Fehler beim Laden der Erfolge:", err);
        setError("Erfolge konnten nicht geladen werden.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userProfile?.uid]);

  if (loading) {
    return (
      <Box className="flex justify-center items-center p-8">
        <CircularProgress />
      </Box>
    );
  }

  const filteredAchievements = achievements.filter((ach) => {
    if (categoryTab === "all") return true;
    return ach.category === categoryTab;
  });

  // Gesamt-XP berechnen aus allen freigeschalteten Stufen
  const totalXp = Object.values(userProgress).reduce((sum, prog) => {
    return sum + (prog.unlockedTiers?.length || 0) * 25;
  }, 0);

  return (
    <Box className="p-2 sm:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-6">
      {error && <Alert severity="error">{error}</Alert>}

      {/* Header Banner mit Gesamt-Fortschritt */}
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, sm: 3 },
          bgcolor: "background.paper",
          borderColor: "divider",
        }}
        className="flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm"
      >
        <div className="flex items-center gap-3 sm:gap-4 text-center sm:text-left">
          <EmojiEventsIcon
            sx={{ fontSize: { xs: 40, sm: 50 }, color: "#FFD700" }}
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

        <Chip
          icon={<EmojiEventsIcon />}
          label={`Gesamt XP: ${totalXp}`}
          color="primary"
          className="font-bold text-base sm:text-lg p-2"
        />
      </Paper>

      {/* Tab-Filter nach Kategorien */}
      <Paper
        variant="outlined"
        sx={{ bgcolor: "background.paper", borderColor: "divider" }}
      >
        <Tabs
          value={categoryTab}
          onChange={(_, val) => setCategoryTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          <Tab label="Alle Erfolge" value="all" />
          <Tab label="Training & Übungen" value="training" />
          <Tab label="Liga & Wettkampf" value="league" />
          <Tab label="Social & Community" value="social" />
          <Tab label="Spezial & Streaks" value="special" />
        </Tabs>
      </Paper>

      {/* Grid aller Erfolge */}
      <Grid container spacing={{ xs: 2, sm: 3 }}>
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

          return (
            <Grid key={ach.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card
                variant="outlined"
                sx={{
                  bgcolor: "background.paper",
                  borderColor: "divider",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justify: "space-between",
                }}
              >
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2">
                      {ach.isSecret && !prog.unlockedTiers?.length ? (
                        <VisibilityOffIcon color="secondary" />
                      ) : (
                        <EmojiEventsIcon color="primary" />
                      )}
                      <Typography
                        variant="subtitle1"
                        className="font-bold"
                        color="text.primary"
                      >
                        {ach.isSecret && !prog.unlockedTiers?.length
                          ? "Geheimes Achievement"
                          : ach.title}
                      </Typography>
                    </div>
                  </div>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    className="min-h-[40px] text-xs sm:text-sm"
                  >
                    {ach.isSecret && !prog.unlockedTiers?.length
                      ? "Schalte dieses Achievement frei, um die Beschreibung zu enthüllen!"
                      : ach.description}
                  </Typography>

                  {/* Stufen / Tier Badges */}
                  <div className="flex gap-1 flex-wrap my-1">
                    {ach.requirements?.map((req) => {
                      const isUnlocked = prog.unlockedTiers?.includes(req.tier);
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
                            color: isUnlocked ? "#000000" : "text.secondary",
                            fontWeight: isUnlocked ? "bold" : "normal",
                            fontSize: "0.7rem",
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Fortschrittsbalken */}
                  <div className="mt-2">
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
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

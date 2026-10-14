import React, { useState, useEffect } from "react";
import type { UserProfile } from "../../types/user";
import type { DynamicAchievement, UserAchievementProgress, AchievementTier } from "../../types/achievement";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Avatar,
  Typography,
  Divider,
  Chip,
  Paper,
  Box,
  CircularProgress,
} from "@mui/material";
import SportsMartsIcon from "@mui/icons-material/Sports";
import PersonIcon from "@mui/icons-material/Person";
import StarIcon from "@mui/icons-material/Star";
import ComputerIcon from "@mui/icons-material/Computer";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";

const TIER_COLORS: Record<AchievementTier, { color: string; label: string }> = {
  bronze: { color: "#CD7F32", label: "Bronze" },
  silver: { color: "#C0C0C0", label: "Silber" },
  gold: { color: "#FFD700", label: "Gold" },
  platinum: { color: "#E5E4E2", label: "Platin" },
  diamond: { color: "#B9F2FF", label: "Diamant" },
};

interface PublicProfileModalProps {
  open: boolean;
  onClose: () => void;
  user: UserProfile | null;
}

export const PublicProfileModal: React.FC<PublicProfileModalProps> = ({
  open,
  onClose,
  user,
}) => {
  const [achievements, setAchievements] = useState<DynamicAchievement[]>([]);
  const [userProgress, setUserProgress] = useState<Record<string, UserAchievementProgress>>({});
  const [loadingAchievements, setLoadingAchievements] = useState(false);

  useEffect(() => {
    if (!user?.uid || !open) return;

    const fetchUserAchievements = async () => {
      setLoadingAchievements(true);
      try {
        const [achSnap, progSnap] = await Promise.all([
          getDocs(collection(db, "achievements")),
          getDocs(collection(db, `users/${user.uid}/achievements`)),
        ]);

        const fetchedAch: DynamicAchievement[] = [];
        achSnap.forEach((d) => fetchedAch.push({ id: d.id, ...d.data() } as DynamicAchievement));

        const progMap: Record<string, UserAchievementProgress> = {};
        progSnap.forEach((d) => (progMap[d.id] = d.data() as UserAchievementProgress));

        setAchievements(fetchedAch);
        setUserProgress(progMap);
      } catch (err) {
        console.error("Fehler beim Laden der User-Achievements:", err);
      } finally {
        setLoadingAchievements(false);
      }
    };

    fetchUserAchievements();
  }, [user?.uid, open]);

  if (!user) return null;

  const getDisplayName = () => {
    const vis = user.privacySettings?.leaderboardVisibility || "nickname";
    if (vis === "realName") return user.realName || user.nickname;
    if (vis === "both") return `${user.realName} (${user.nickname})`;
    return user.nickname || user.realName;
  };

  const showEquipment = user.privacySettings?.showEquipmentPublicly !== false;
  const isCoachOrAdmin =
    user.roles?.includes("coach") || user.roles?.includes("admin");

  const approvedLicenses =
    user.trainerLicenses?.filter((l) => l.status === "approved") || [];

  // Nur freigeschaltete Achievements herausfiltern
  const unlockedAchievements = achievements.filter((ach) => {
    const prog = userProgress[ach.id];
    return prog && prog.unlockedTiers && prog.unlockedTiers.length > 0;
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle className="font-bold flex items-center gap-2">
        <PersonIcon color="primary" /> Spielerprofil
      </DialogTitle>

      <DialogContent dividers className="flex flex-col gap-6 p-4 sm:p-6">
        {/* Header mit Avatar & Name */}
        <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
          <Avatar
            src={user.photoURL}
            sx={{
              width: 80,
              height: 80,
              fontSize: "1.8rem",
              bgcolor: "primary.main",
              color: "primary.contrastText",
            }}
            className="shadow-md"
          >
            {user.nickname ? user.nickname.substring(0, 2).toUpperCase() : "U"}
          </Avatar>
          <div>
            <Typography variant="h5" className="font-bold" color="text.primary">
              {getDisplayName()}
            </Typography>
            <div className="flex flex-wrap gap-1 mt-1">
              {user.roles.map((role) => (
                <Chip
                  key={role}
                  label={
                    role === "admin"
                      ? "Admin"
                      : role === "coach"
                      ? "Trainer"
                      : "Spieler"
                  }
                  size="small"
                  color={
                    role === "admin"
                      ? "error"
                      : role === "coach"
                      ? "secondary"
                      : "default"
                  }
                />
              ))}
            </div>
          </div>
        </div>

        <Divider />

        {/* Freigeschaltete Achievements & Badges */}
        <Paper
          variant="outlined"
          sx={{ bgcolor: "background.paper", borderColor: "divider", p: 2 }}
          className="flex flex-col gap-3"
        >
          <Typography
            variant="h6"
            className="font-bold flex items-center gap-2"
            color="primary"
          >
            <EmojiEventsIcon sx={{ color: "#FFD700" }} /> Erfolge & Auszeichnungen
          </Typography>

          {loadingAchievements ? (
            <Box className="flex justify-center p-3">
              <CircularProgress size={24} />
            </Box>
          ) : unlockedAchievements.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {unlockedAchievements.map((ach) => {
                const prog = userProgress[ach.id];
                const highestTier = prog.unlockedTiers[prog.unlockedTiers.length - 1];
                const tierInfo = TIER_COLORS[highestTier] || { color: "#FFD700", label: highestTier };

                return (
                  <Paper
                    key={ach.id}
                    variant="outlined"
                    sx={{ bgcolor: "action.hover", borderColor: "divider", p: 2 }}
                    className="flex items-center gap-3"
                  >
                    <EmojiEventsIcon sx={{ fontSize: 32, color: tierInfo.color }} />
                    <Box>
                      <Typography variant="subtitle2" className="font-bold" color="text.primary">
                        {ach.title}
                      </Typography>
                      <Chip
                        label={tierInfo.label}
                        size="small"
                        sx={{
                          bgcolor: tierInfo.color,
                          color: "#000",
                          fontWeight: "bold",
                          fontSize: "0.65rem",
                          height: 20,
                        }}
                      />
                    </Box>
                  </Paper>
                );
              })}
            </div>
          ) : (
            <Typography variant="body2" color="text.secondary" className="italic">
              Dieser Spieler hat bisher noch keine Erfolge freigeschaltet.
            </Typography>
          )}
        </Paper>

        {/* Equipment & Info-Sektion */}
        {showEquipment && user.equipment ? (
          <div className="flex flex-col gap-4">
            <Typography
              variant="h6"
              className="font-bold flex items-center gap-2"
              color="primary"
            >
              <SportsMartsIcon /> Equipment & Setup
            </Typography>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Paper
                variant="outlined"
                sx={{ bgcolor: "background.paper", borderColor: "divider" }}
                className="p-3"
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  className="font-bold block"
                >
                  Darts / Barrels
                </Typography>
                <Typography
                  variant="body2"
                  className="font-medium"
                  color="text.primary"
                >
                  {user.equipment.dartBarrel || "Keine Angabe"}
                </Typography>
              </Paper>

              <Paper
                variant="outlined"
                sx={{ bgcolor: "background.paper", borderColor: "divider" }}
                className="p-3"
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  className="font-bold block"
                >
                  Shafts & Flights
                </Typography>
                <Typography
                  variant="body2"
                  className="font-medium"
                  color="text.primary"
                >
                  {user.equipment.dartShaft || "-"} /{" "}
                  {user.equipment.dartFlight || "-"}
                </Typography>
              </Paper>

              <Paper
                variant="outlined"
                sx={{ bgcolor: "background.paper", borderColor: "divider" }}
                className="p-3"
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  className="font-bold block flex items-center gap-1"
                >
                  <StarIcon fontSize="inherit" color="action" />{" "}
                  Lieblingsspieler
                </Typography>
                <Typography
                  variant="body2"
                  className="font-medium"
                  color="text.primary"
                >
                  {user.equipment.favoritePlayer || "Keine Angabe"}
                </Typography>
              </Paper>

              <Paper
                variant="outlined"
                sx={{ bgcolor: "background.paper", borderColor: "divider" }}
                className="p-3"
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  className="font-bold block flex items-center gap-1"
                >
                  <ComputerIcon fontSize="inherit" color="action" /> Automatic
                  Scoring System
                </Typography>
                <Typography
                  variant="body2"
                  className="font-medium"
                  color="text.primary"
                >
                  {user.equipment.scoringSystem &&
                  user.equipment.scoringSystem !== "none"
                    ? `${user.equipment.scoringSystem.toUpperCase()} ${
                        user.equipment.systemUsername
                          ? `(${user.equipment.systemUsername})`
                          : ""
                      }`
                    : "Kein automatisches System"}
                </Typography>
              </Paper>
            </div>
          </div>
        ) : (
          <Box className="py-4 text-center">
            <Typography
              variant="body2"
              color="text.secondary"
              className="italic"
            >
              Der Spieler hat keine öffentlichen Equipment-Informationen
              hinterlegt.
            </Typography>
          </Box>
        )}

        {/* Trainer-Qualifikationen */}
        {isCoachOrAdmin && (
          <Paper
            variant="outlined"
            sx={{ bgcolor: "background.paper", borderColor: "divider", p: 2 }}
            className="flex flex-col gap-3"
          >
            <Typography
              variant="h6"
              className="font-bold flex items-center gap-2"
              color="primary"
            >
              <VerifiedUserIcon color="primary" /> Trainer-Qualifikationen
            </Typography>

            {approvedLicenses.length > 0 ? (
              <div className="flex flex-col gap-2">
                {approvedLicenses.map((license) => (
                  <Paper
                    key={license.id}
                    variant="outlined"
                    sx={{
                      p: 2,
                      bgcolor: "action.hover",
                      borderColor: "divider",
                    }}
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 rounded-md"
                  >
                    <Box>
                      <Typography
                        variant="subtitle2"
                        className="font-bold"
                        color="text.primary"
                      >
                        {license.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        className="block"
                      >
                        Ausgestellt von: <strong>{license.issuer}</strong>
                      </Typography>
                      {license.validUntil && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          className="block"
                        >
                          Gültig bis:{" "}
                          {new Date(license.validUntil).toLocaleDateString(
                            "de-DE"
                          )}
                        </Typography>
                      )}
                    </Box>

                    <Button
                      variant="outlined"
                      size="small"
                      color="primary"
                      className="w-full sm:w-auto shrink-0"
                      onClick={() => window.open(license.fileUrl, "_blank")}
                    >
                      Zertifikat einsehen
                    </Button>
                  </Paper>
                ))}
              </div>
            ) : (
              <Typography
                variant="body2"
                color="text.secondary"
                className="italic"
              >
                Keine verifizierten Trainer-Lizenzen hinterlegt.
              </Typography>
            )}
          </Paper>
        )}
      </DialogContent>

      <DialogActions className="p-4">
        <Button onClick={onClose} variant="contained" color="primary">
          Schließen
        </Button>
      </DialogActions>
    </Dialog>
  );
};
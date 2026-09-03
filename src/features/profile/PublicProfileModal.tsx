import React from "react";
import type { UserProfile } from "../../types/user";
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
} from "@mui/material";
import SportsMartsIcon from "@mui/icons-material/Sports";
import PersonIcon from "@mui/icons-material/Person";
import StarIcon from "@mui/icons-material/Star";
import ComputerIcon from "@mui/icons-material/Computer";
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
  if (!user) return null;

  const getDisplayName = () => {
    const vis = user.privacySettings?.leaderboardVisibility || "nickname";
    if (vis === "realName") return user.realName || user.nickname;
    if (vis === "both") return `${user.realName} (${user.nickname})`;
    return user.nickname || user.realName;
  };

  const showEquipment = user.privacySettings?.showEquipmentPublicly !== false;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle className="font-bold flex items-center gap-2">
        <PersonIcon color="primary" /> Spielerprofil
      </DialogTitle>

      <DialogContent dividers className="flex flex-col gap-6">
        {/* Header mit Avatar & Name */}
        <div className="flex items-center gap-4">
          <Avatar
            src={user.photoURL}
            sx={{ width: 80, height: 80, fontSize: "1.8rem" }}
            className="shadow bg-primary-main"
          >
            {user.nickname ? user.nickname.substring(0, 2).toUpperCase() : "U"}
          </Avatar>
          <div>
            <Typography variant="h5" className="font-bold">
              {getDisplayName()}
            </Typography>
            <div className="flex gap-1 mt-1">
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
              <Paper variant="outlined" className="p-3">
                <Typography
                  variant="caption"
                  color="textSecondary"
                  className="font-bold block"
                >
                  Darts / Barrels
                </Typography>
                <Typography variant="body2" className="font-medium">
                  {user.equipment.dartBarrel || "Keine Angabe"}
                </Typography>
              </Paper>

              <Paper variant="outlined" className="p-3">
                <Typography
                  variant="caption"
                  color="textSecondary"
                  className="font-bold block"
                >
                  Shafts & Flights
                </Typography>
                <Typography variant="body2" className="font-medium">
                  {user.equipment.dartShaft || "-"} /{" "}
                  {user.equipment.dartFlight || "-"}
                </Typography>
              </Paper>

              <Paper variant="outlined" className="p-3">
                <Typography
                  variant="caption"
                  color="textSecondary"
                  className="font-bold block flex items-center gap-1"
                >
                  <StarIcon fontSize="inherit" color="action" />{" "}
                  Lieblingsspieler
                </Typography>
                <Typography variant="body2" className="font-medium">
                  {user.equipment.favoritePlayer || "Keine Angabe"}
                </Typography>
              </Paper>

              <Paper variant="outlined" className="p-3">
                <Typography
                  variant="caption"
                  color="textSecondary"
                  className="font-bold block flex items-center gap-1"
                >
                  <ComputerIcon fontSize="inherit" color="action" /> Automatic
                  Scoring System
                </Typography>
                <Typography variant="body2" className="font-medium">
                  {user.equipment.scoringSystem &&
                  user.equipment.scoringSystem !== "none"
                    ? `${user.equipment.scoringSystem.toUpperCase()} ${user.equipment.systemUsername ? `(${user.equipment.systemUsername})` : ""}`
                    : "Kein automatisches System"}
                </Typography>
              </Paper>
            </div>
          </div>
        ) : (
          <Typography
            variant="body2"
            color="textSecondary"
            className="italic text-center py-4"
          >
            Der Spieler hat keine öffentlichen Equipment-Informationen
            hinterlegt.
          </Typography>
        )}
      </DialogContent>

      <DialogActions className="p-4">
        <Button onClick={onClose} variant="contained">
          Schließen
        </Button>
      </DialogActions>
    </Dialog>
  );
};

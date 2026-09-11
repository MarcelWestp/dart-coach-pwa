import React from "react";
import { useAuth } from "../../context/AuthContext";
import { NotificationBell } from "../common/NotificationBell";
import {
  AppBar,
  Toolbar,
  Typography,
  Avatar,
  IconButton,
  Tooltip,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import Logo from "../../assets/logo_Nav.jpg";

interface NavbarProps {
  onOpenProfile?: () => void;
  onOpenPlayerPlan?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenProfile, onOpenPlayerPlan }) => {
  const { currentUser, userProfile, logout } = useAuth();

  return (
    <AppBar position="static" color="primary" elevation={2}>
      <Toolbar className="justify-between">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={onOpenPlayerPlan}
        >
          <img
            src={Logo}
            alt="Logo"
            className="h-9 w-9 rounded-full object-cover shadow-sm border border-white/20"
          />
          <Typography variant="h6" component="div" className="font-bold">
            Tuspo Dart Trainer
          </Typography>
        </div>

        {currentUser && (
          <div className="flex items-center gap-4">
            {/* Glocke für Benachrichtigungen eingebaut */}
            <NotificationBell />

            <Tooltip title="Mein Profil & Einstellungen">
              <IconButton onClick={onOpenProfile} color="inherit" size="small">
                <Avatar
                  src={userProfile?.photoURL}
                  alt={userProfile?.nickname || "User"}
                  className="w-9 h-9 border-2 border-white text-sm bg-secondary-main"
                >
                  {userProfile?.nickname
                    ? userProfile.nickname.substring(0, 2).toUpperCase()
                    : "U"}
                </Avatar>
              </IconButton>
            </Tooltip>

            <Typography
              variant="body2"
              className="hidden sm:block font-semibold"
            >
              {userProfile?.nickname || userProfile?.realName}
            </Typography>

            <Tooltip title="Abmelden">
              <IconButton
                color="inherit"
                onClick={logout}
                size="small"
                aria-label="Abmelden"
              >
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          </div>
        )}
      </Toolbar>
    </AppBar>
  );
};

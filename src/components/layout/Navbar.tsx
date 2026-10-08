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
  useMediaQuery,
  useTheme,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import Logo from "../../assets/logo_Nav.jpg";

interface NavbarProps {
  onOpenProfile?: () => void;
  onOpenDashboard?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenProfile,
  onOpenDashboard,
}) => {
  const { currentUser, userProfile, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <AppBar position="static" color="primary" elevation={2}>
      <Toolbar className="justify-between px-2 sm:px-4 min-h-[56px] sm:min-h-[64px]">
        {/* Logo & Titel */}
        <div
          className="flex items-center gap-2 cursor-pointer select-none max-w-[60%] sm:max-w-none"
          onClick={onOpenDashboard}
        >
          <img
            src={Logo}
            alt="Logo"
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-full object-cover shadow-sm border border-white/20 shrink-0"
          />
          <Typography
            variant="h6"
            component="div"
            className="font-bold text-sm sm:text-base md:text-lg truncate leading-tight"
          >
            Tuspo Dart Trainer
          </Typography>
        </div>

        {/* Rechte Navigationselemente */}
        {currentUser && (
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Benachrichtigungs-Glocke */}
            <NotificationBell />

            {/* Profil-Avatar */}
            <Tooltip title="Mein Profil & Einstellungen">
              <IconButton onClick={onOpenProfile} color="inherit" size="small">
                <Avatar
                  src={userProfile?.photoURL}
                  alt={userProfile?.nickname || "User"}
                  className="w-8 h-8 sm:w-9 sm:h-9 border-2 border-white text-xs sm:text-sm bg-secondary-main"
                >
                  {userProfile?.nickname
                    ? userProfile.nickname.substring(0, 2).toUpperCase()
                    : "U"}
                </Avatar>
              </IconButton>
            </Tooltip>

            {/* Name (nur ab Tablet/Desktop sichtbar) */}
            <Typography
              variant="body2"
              className="hidden sm:block font-semibold max-w-[120px] truncate"
            >
              {userProfile?.nickname || userProfile?.realName}
            </Typography>

            {/* Logout Icon Button */}
            <Tooltip title="Abmelden">
              <IconButton
                color="inherit"
                onClick={logout}
                size="small"
                aria-label="Abmelden"
              >
                <LogoutIcon fontSize={isMobile ? "small" : "medium"} />
              </IconButton>
            </Tooltip>
          </div>
        )}
      </Toolbar>
    </AppBar>
  );
};
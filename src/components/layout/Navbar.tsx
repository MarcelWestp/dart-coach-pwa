import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { NotificationBell } from '../common/NotificationBell';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Avatar, 
  IconButton, 
  Tooltip 
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import Logo from '../../assets/logo.jpg';

interface NavbarProps {
  onOpenProfile?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenProfile }) => {
  const { currentUser, userProfile, logout } = useAuth();

  return (
    <AppBar position="static" color="primary" elevation={2}>
      <Toolbar className="justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={onOpenProfile}>
          <img src={Logo} alt="Logo" className="h-8 w-8" />
          <Typography variant="h6" component="div" className="font-bold">
            Dart Performance Platform
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
                  alt={userProfile?.nickname || 'User'}
                  className="w-9 h-9 border-2 border-white text-sm bg-secondary-main"
                >
                  {userProfile?.nickname ? userProfile.nickname.substring(0, 2).toUpperCase() : 'U'}
                </Avatar>
              </IconButton>
            </Tooltip>

            <Typography variant="body2" className="hidden sm:block font-semibold">
              {userProfile?.nickname || userProfile?.realName}
            </Typography>

            <Button 
              color="inherit" 
              onClick={logout}
              startIcon={<LogoutIcon />}
              size="small"
            >
              Abmelden
            </Button>
          </div>
        )}
      </Toolbar>
    </AppBar>
  );
};
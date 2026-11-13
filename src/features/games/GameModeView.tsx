import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
} from '@mui/material';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { X01SetupView } from './X01/X01SetupView';
import { X01GameView } from './X01/X01GameView';

type GameMode = 'X01' | 'Cricket' | 'AroundTheClock';

export const GameModeView: React.FC = () => {
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [gameConfig, setGameConfig] = useState<any | null>(null);
  const [isGameStarted, setIsGameStarted] = useState<boolean>(false);

  const handleSelectMode = (mode: GameMode) => {
    setSelectedMode(mode);
    setIsGameStarted(false);
    setGameConfig(null);
  };

  const handleBackToModes = () => {
    setSelectedMode(null);
    setIsGameStarted(false);
    setGameConfig(null);
  };

  const handleStartGame = (config: any) => {
    setGameConfig(config);
    setIsGameStarted(true);
  };

  const handleBackToSetup = () => {
    setIsGameStarted(false);
    setGameConfig(null);
  };

  // 1. Ansicht: Responsive Modus-Auswahl
  if (!selectedMode) {
    return (
      <Box className="max-w-5xl mx-auto px-3 sm:px-6 py-6 space-y-6">
        <Paper
          elevation={0}
          sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}
          className="p-5 sm:p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4"
        >
          <Box className="p-3 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <SportsEsportsIcon fontSize="large" color="primary" />
          </Box>
          <div className="space-y-1">
            <Typography variant="h5" className="font-extrabold tracking-tight" color="text.primary">
              Spielmodus wählen (WORK IN PROGRESS)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Wähle den gewünschten Dart-Spielmodus für dein Training oder Match aus.
            </Typography>
          </div>
        </Paper>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* X01 Modus */}
          <Paper
            elevation={0}
            onClick={() => handleSelectMode('X01')}
            sx={{
              bgcolor: 'background.paper',
              border: '2px solid',
              borderColor: 'divider',
              cursor: 'pointer',
              '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
            }}
            className="p-6 rounded-2xl flex flex-col justify-between text-left space-y-4 transition-all shadow-sm"
          >
            <div className="space-y-2">
              <Typography variant="h6" className="font-bold" color="text.primary">
                X01
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Der Klassiker (501, 301, etc.) mit flexiblen In/Out-Regeln, Checkout-Helper und Echtzeit-Statistiken.
              </Typography>
            </div>
            <Button variant="contained" color="primary" fullWidth className="font-bold rounded-xl py-2.5">
              Auswählen
            </Button>
          </Paper>

          {/* Cricket Modus (Platzhalter) */}
          <Paper
            elevation={0}
            sx={{
              bgcolor: 'background.paper',
              border: '2px solid',
              borderColor: 'divider',
              opacity: 0.6,
            }}
            className="p-6 rounded-2xl flex flex-col justify-between text-left space-y-4 shadow-sm"
          >
            <div className="space-y-2">
              <Typography variant="h6" className="font-bold" color="text.primary">
                Cricket
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Taktisches Schließen der Zahlen von 15 bis 20 plus Bullseye.
              </Typography>
            </div>
            <Button variant="outlined" disabled fullWidth className="font-bold rounded-xl py-2.5">
              Demnächst verfügbar
            </Button>
          </Paper>

          {/* Around the Clock Modus (Platzhalter) */}
          <Paper
            elevation={0}
            sx={{
              bgcolor: 'background.paper',
              border: '2px solid',
              borderColor: 'divider',
              opacity: 0.6,
            }}
            className="p-6 rounded-2xl flex flex-col justify-between text-left space-y-4 shadow-sm sm:col-span-2 lg:col-span-1"
          >
            <div className="space-y-2">
              <Typography variant="h6" className="font-bold" color="text.primary">
                Around the Clock
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Triff alle Zahlen der Reihe nach von 1 bis 20 in kürzester Zeit.
              </Typography>
            </div>
            <Button variant="outlined" disabled fullWidth className="font-bold rounded-xl py-2.5">
              Demnächst verfügbar
            </Button>
          </Paper>
        </div>
      </Box>
    );
  }

  // 2. Ansicht: X01 Workflow (Setup vs. In-Game View)
  if (selectedMode === 'X01') {
    return (
      <Box className="space-y-4">
        {!isGameStarted && (
          <Box className="max-w-4xl mx-auto px-3 sm:px-6 pt-4">
            <Button
              variant="outlined"
              size="small"
              startIcon={<ArrowBackIcon />}
              onClick={handleBackToModes}
              className="rounded-xl px-4 py-2"
            >
              Zurück zur Modus-Auswahl
            </Button>
          </Box>
        )}

        {!isGameStarted ? (
          <X01SetupView onStartGame={handleStartGame} />
        ) : (
          <X01GameView config={gameConfig} onBackToSetup={handleBackToSetup} />
        )}
      </Box>
    );
  }

  return null;
};
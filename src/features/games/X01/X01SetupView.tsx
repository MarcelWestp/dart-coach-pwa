import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  RadioGroup,
  FormControlLabel,
  Radio,
  Switch,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Checkbox,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SettingsIcon from '@mui/icons-material/Settings';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { useAuth } from '../../../context/AuthContext';

interface PlayerConfig {
  name: string;
  checkoutHelper: boolean;
  inputMethod: 'score' | 'dartByDart';
  shortcuts: string[];
  shortcutGrid: {
    rows: number;
    cols: number;
    items: string[];
  };
  statsEnabled: boolean;
  stats: {
    score80Plus: boolean;
    score100Plus: boolean;
    score140Plus: boolean;
    score180: boolean;
    overallAverage: boolean;
    legAverage: boolean;
    checkoutRate: boolean;
  };
}

interface X01SetupProps {
  onStartGame: (config: any) => void;
}

const defaultStats = {
  score80Plus: true,
  score100Plus: true,
  score140Plus: true,
  score180: true,
  overallAverage: true,
  legAverage: true,
  checkoutRate: true,
};

const createDefaultGrid = (shortcuts: string[] = ['60', '100', '140', '180'], rows = 2, cols = 2) => {
  const totalSlots = rows * cols;
  const items = Array.from({ length: totalSlots }, (_, i) => shortcuts[i] || '');
  return { rows, cols, items };
};

export const X01SetupView: React.FC<X01SetupProps> = ({ onStartGame }) => {
  const { userProfile } = useAuth();

  const [startScore, setStartScore] = useState<number | string>(501);
  const [isCustomScore, setIsCustomScore] = useState<boolean>(false);
  const [customScoreInput, setCustomScoreInput] = useState<string>('501');

  const [inMode, setInMode] = useState<'single' | 'double' | 'master'>('single');
  const [outMode, setOutMode] = useState<'single' | 'double' | 'master'>('double');

  // Neu: Match-Modus & Ziel (Standard: Best of 5)
  const [matchMode, setMatchMode] = useState<'bestOf' | 'firstTo'>('bestOf');
  const [matchTarget, setMatchTarget] = useState<number>(5);

  const [gameType, setGameType] = useState<'local' | 'doubles' | 'bot' | 'self'>('local');
  const [botDifficulty, setBotDifficulty] = useState<string>('60');

  const loggedInPlayerName = userProfile?.nickname || userProfile?.realName || 'Spieler 1';

  const [players, setPlayers] = useState<PlayerConfig[]>([
    {
      name: loggedInPlayerName,
      checkoutHelper: true,
      inputMethod: 'score',
      shortcuts: ['60', '100', '140', '180'],
      shortcutGrid: createDefaultGrid(['60', '100', '140', '180'], 2, 2),
      statsEnabled: true,
      stats: { ...defaultStats },
    },
    {
      name: 'Spieler 2',
      checkoutHelper: true,
      inputMethod: 'score',
      shortcuts: ['60', '100', '140', '180'],
      shortcutGrid: createDefaultGrid(['60', '100', '140', '180'], 2, 2),
      statsEnabled: true,
      stats: { ...defaultStats },
    },
  ]);

  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [activePlayerIndex, setActivePlayerIndex] = useState<number | null>(null);

  // Initial einmalig den Namen setzen, danach frei verschiebbar
  useEffect(() => {
    if (loggedInPlayerName && players.length > 0 && players[0].name === 'Spieler 1') {
      const updated = [...players];
      updated[0] = { ...updated[0], name: loggedInPlayerName };
      setPlayers(updated);
    }
  }, [loggedInPlayerName]);

  const handleGameTypeChange = (type: 'local' | 'doubles' | 'bot' | 'self') => {
    setGameType(type);
    if (type === 'doubles') {
      setPlayers([
        { name: loggedInPlayerName, checkoutHelper: true, inputMethod: 'score', shortcuts: ['60', '100', '140', '180'], shortcutGrid: createDefaultGrid(['60', '100', '140', '180']), statsEnabled: true, stats: { ...defaultStats } },
        { name: 'Spieler 2 (Team 1)', checkoutHelper: true, inputMethod: 'score', shortcuts: ['60', '100', '140', '180'], shortcutGrid: createDefaultGrid(['60', '100', '140', '180']), statsEnabled: true, stats: { ...defaultStats } },
        { name: 'Spieler 3 (Team 2)', checkoutHelper: true, inputMethod: 'score', shortcuts: ['60', '100', '140', '180'], shortcutGrid: createDefaultGrid(['60', '100', '140', '180']), statsEnabled: true, stats: { ...defaultStats } },
        { name: 'Spieler 4 (Team 2)', checkoutHelper: true, inputMethod: 'score', shortcuts: ['60', '100', '140', '180'], shortcutGrid: createDefaultGrid(['60', '100', '140', '180']), statsEnabled: true, stats: { ...defaultStats } },
      ]);
    } else if (type === 'bot' || type === 'self') {
      setPlayers([
        { name: loggedInPlayerName, checkoutHelper: true, inputMethod: 'score', shortcuts: ['60', '100', '140', '180'], shortcutGrid: createDefaultGrid(['60', '100', '140', '180']), statsEnabled: true, stats: { ...defaultStats } },
      ]);
    } else {
      setPlayers([
        { name: loggedInPlayerName, checkoutHelper: true, inputMethod: 'score', shortcuts: ['60', '100', '140', '180'], shortcutGrid: createDefaultGrid(['60', '100', '140', '180']), statsEnabled: true, stats: { ...defaultStats } },
        { name: 'Spieler 2', checkoutHelper: true, inputMethod: 'score', shortcuts: ['60', '100', '140', '180'], shortcutGrid: createDefaultGrid(['60', '100', '140', '180']), statsEnabled: true, stats: { ...defaultStats } },
      ]);
    }
  };

  const handlePlayerCountChange = (count: number) => {
    const newPlayers: PlayerConfig[] = [];
    for (let i = 0; i < count; i++) {
      if (i === 0) {
        newPlayers.push({
          ...(players[0] || {
            checkoutHelper: true,
            inputMethod: 'score',
            shortcuts: ['60', '100', '140', '180'],
            shortcutGrid: createDefaultGrid(['60', '100', '140', '180']),
            statsEnabled: true,
            stats: { ...defaultStats },
          }),
          name: loggedInPlayerName,
        });
      } else {
        newPlayers.push(
          players[i] || {
            name: `Spieler ${i + 1}`,
            checkoutHelper: true,
            inputMethod: 'score',
            shortcuts: ['60', '100', '140', '180'],
            shortcutGrid: createDefaultGrid(['60', '100', '140', '180']),
            statsEnabled: true,
            stats: { ...defaultStats },
          }
        );
      }
    }
    setPlayers(newPlayers);
  };

  const handlePlayerSettingChange = (index: number, field: keyof PlayerConfig, value: any) => {
    const updated = [...players];
    updated[index] = { ...updated[index], [field]: value };
    setPlayers(updated);
  };

  const handleStatChange = (index: number, statKey: keyof PlayerConfig['stats'], value: boolean) => {
    const updated = [...players];
    updated[index] = {
      ...updated[index],
      stats: {
        ...updated[index].stats,
        [statKey]: value,
      },
    };
    setPlayers(updated);
  };

  const handleMovePlayer = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= players.length) return;

    const updated = [...players];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setPlayers(updated);
  };

  const handleGridDimensionsChange = (index: number, rows: number, cols: number) => {
    const updated = [...players];
    const currentItems = updated[index].shortcutGrid.items;
    const totalSlots = rows * cols;
    const newItems = Array.from({ length: totalSlots }, (_, i) => currentItems[i] || '');
    updated[index].shortcutGrid = { rows, cols, items: newItems };
    setPlayers(updated);
  };

  const handleGridItemChange = (index: number, slotIndex: number, value: string) => {
    const updated = [...players];
    const newItems = [...updated[index].shortcutGrid.items];
    newItems[slotIndex] = value;
    updated[index].shortcutGrid.items = newItems;
    updated[index].shortcuts = newItems.filter(Boolean);
    setPlayers(updated);
  };

  const handleStartScoreChange = (val: any) => {
    if (val === 'custom') {
      setIsCustomScore(true);
      setStartScore(Number(customScoreInput) || 501);
    } else {
      setIsCustomScore(false);
      setStartScore(val);
    }
  };

  const handleOpenSettings = (index: number) => {
    setActivePlayerIndex(index);
    setSettingsOpen(true);
  };

  const handleStart = () => {
    const finalScore = isCustomScore ? Number(customScoreInput) || 501 : Number(startScore);
    const gameConfig = {
      startScore: finalScore,
      inMode,
      outMode,
      matchMode,
      matchTarget,
      gameType,
      botDifficulty: gameType === 'bot' ? Number(botDifficulty) : null,
      players,
    };
    onStartGame(gameConfig);
  };

  return (
    <Box className="max-w-4xl mx-auto px-3 py-6 space-y-6">
      <Paper
        elevation={0}
        sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}
        className="p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div className="space-y-1">
          <Typography variant="h5" className="font-extrabold tracking-tight" color="text.primary">
            X01 Match-Setup
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Konfiguriere dein Spiel im modernen Scorer-Layout.
          </Typography>
        </div>

        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handleStart}
          startIcon={<PlayArrowIcon />}
          className="w-full sm:w-auto font-bold px-6 py-2.5 rounded-xl shadow-md"
        >
          Match Starten
        </Button>
      </Paper>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Paper
          elevation={0}
          sx={{ bgcolor: 'background.paper', borderColor: 'divider' }}
          className="p-6 rounded-2xl border space-y-5 shadow-sm flex flex-col justify-between"
        >
          <div className="space-y-4">
            <Typography variant="subtitle1" className="font-bold mb-6" color="text.primary">
              Regelwerk
            </Typography>

            <FormControl fullWidth size="small">
              <InputLabel id="start-score-label">Start Score</InputLabel>
              <Select
                labelId="start-score-label"
                value={isCustomScore ? 'custom' : startScore}
                label="Start Score"
                onChange={(e) => handleStartScoreChange(e.target.value)}
              >
                <MenuItem value={170}>170</MenuItem>
                <MenuItem value={301}>301</MenuItem>
                <MenuItem value={501}>501 (Standard)</MenuItem>
                <MenuItem value={701}>701</MenuItem>
                <MenuItem value={1001}>1001</MenuItem>
                <MenuItem value="custom">Eigener Start Score...</MenuItem>
              </Select>
            </FormControl>

            {isCustomScore && (
              <TextField
                label="Zielpunktzahl (1-9999)"
                type="number"
                size="small"
                fullWidth
                value={customScoreInput}
                onChange={(e) => setCustomScoreInput(e.target.value)}
                slotProps={{ htmlInput: { min: 1, max: 9999 } }}
              />
            )}

            <Divider className="border-divider my-4" />

            <div className="space-y-4">
              <div>
                <Typography variant="caption" color="text.secondary" className="font-bold uppercase tracking-wider block mb-2">
                  In-Modus
                </Typography>
                <RadioGroup row value={inMode} onChange={(e) => setInMode(e.target.value as any)}>
                  <FormControlLabel value="single" control={<Radio size="small" />} label="Single" />
                  <FormControlLabel value="double" control={<Radio size="small" />} label="Double" />
                  <FormControlLabel value="master" control={<Radio size="small" />} label="Master" />
                </RadioGroup>
              </div>

              <div>
                <Typography variant="caption" color="text.secondary" className="font-bold uppercase tracking-wider block mb-2">
                  Out-Modus
                </Typography>
                <RadioGroup row value={outMode} onChange={(e) => setOutMode(e.target.value as any)}>
                  <FormControlLabel value="single" control={<Radio size="small" />} label="Single" />
                  <FormControlLabel value="double" control={<Radio size="small" />} label="Double" />
                  <FormControlLabel value="master" control={<Radio size="small" />} label="Master" />
                </RadioGroup>
              </div>

              <Divider className="border-divider my-4" />

              {/* Match-Modus (Best of / First to) */}
              <div className="space-y-3">
                <Typography variant="caption" color="text.secondary" className="font-bold uppercase tracking-wider block mb-2">
                  Match-Modus (Legs)
                </Typography>
                <FormControl component="fieldset" size="small" fullWidth className="mb-2">
                  <RadioGroup
                    row
                    value={matchMode}
                    onChange={(e) => setMatchMode(e.target.value as 'bestOf' | 'firstTo')}
                  >
                    <FormControlLabel value="bestOf" control={<Radio size="small" />} label="Best of" />
                    <FormControlLabel value="firstTo" control={<Radio size="small" />} label="First to" />
                  </RadioGroup>
                </FormControl>

                <FormControl fullWidth size="small">
                  <InputLabel id="match-target-label">Anzahl / Ziel</InputLabel>
                  <Select
                    labelId="match-target-label"
                    value={matchTarget}
                    label="Anzahl / Ziel"
                    onChange={(e) => setMatchTarget(Number(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5, 7, 9, 11, 13, 15].map((num) => (
                      <MenuItem key={num} value={num}>
                        {matchMode === 'bestOf' ? `Best of ${num} (First to ${Math.floor(num / 2) + 1})` : `First to ${num}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>
            </div>
          </div>
        </Paper>

        <Paper
          elevation={0}
          sx={{ bgcolor: 'background.paper', borderColor: 'divider' }}
          className="p-6 rounded-2xl border space-y-5 shadow-sm flex flex-col justify-between"
        >
          <div className="space-y-4">
            <Typography variant="subtitle1" className="font-bold mb-6" color="text.primary">
              Spielmodus
            </Typography>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={gameType === 'local' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => handleGameTypeChange('local')}
                className="justify-start normal-case py-2"
              >
                Lokal (1-4)
              </Button>
              <Button
                variant={gameType === 'doubles' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => handleGameTypeChange('doubles')}
                className="justify-start normal-case py-2"
              >
                Doppel (2vs2)
              </Button>
              <Button
                variant={gameType === 'bot' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => handleGameTypeChange('bot')}
                className="justify-start normal-case py-2"
              >
                Gegen Bot
              </Button>
              <Button
                variant={gameType === 'self' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => handleGameTypeChange('self')}
                className="justify-start normal-case py-2"
              >
                Letzte Legs
              </Button>
            </div>

            {gameType === 'local' && (
              <Box className="pt-2 flex items-center gap-2 flex-wrap">
                <Typography variant="caption" color="text.secondary" className="font-medium">
                  Anzahl Spieler:
                </Typography>
                {[1, 2, 3, 4].map((num) => (
                  <Chip
                    key={num}
                    label={`${num}`}
                    clickable
                    size="small"
                    color={players.length === num ? 'primary' : 'default'}
                    variant={players.length === num ? 'filled' : 'outlined'}
                    onClick={() => handlePlayerCountChange(num)}
                  />
                ))}
              </Box>
            )}

            {gameType === 'doubles' && (
              <Typography variant="caption" color="text.secondary" className="italic block pt-2">
                2vs2 Modus aktiv: Team 1 (Spieler 1 & 2) gegen Team 2 (Spieler 3 & 4).
              </Typography>
            )}

            {gameType === 'bot' && (
              <Box className="pt-2">
                <FormControl size="small" fullWidth>
                  <InputLabel id="bot-level-label">Bot Schwierigkeit (Schnitt)</InputLabel>
                  <Select
                    labelId="bot-level-label"
                    value={botDifficulty}
                    label="Bot Schwierigkeit (Schnitt)"
                    onChange={(e) => setBotDifficulty(e.target.value)}
                  >
                    <MenuItem value="30">~30er Schnitt</MenuItem>
                    <MenuItem value="40">~40er Schnitt</MenuItem>
                    <MenuItem value="50">~50er Schnitt</MenuItem>
                    <MenuItem value="60">~60er Schnitt</MenuItem>
                    <MenuItem value="70">~70er Schnitt</MenuItem>
                    <MenuItem value="80">~80er Schnitt</MenuItem>
                    <MenuItem value="90">~90er Schnitt</MenuItem>
                    <MenuItem value="100">~100er Schnitt</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            )}

            {gameType === 'self' && (
              <Typography variant="caption" color="text.secondary" className="italic block pt-2">
                Gegner wird zufällig aus deinen letzten 100 gewonnenen Legs simuliert.
              </Typography>
            )}
          </div>
        </Paper>
      </div>

      <Paper
        elevation={0}
        sx={{ bgcolor: 'background.paper', borderColor: 'divider' }}
        className="p-6 rounded-2xl border space-y-5 shadow-sm"
      >
        <Typography variant="subtitle1" className="font-bold mb-6" color="text.primary">
          Teilnehmende Spieler & Reihenfolge
        </Typography>

        <div className="space-y-3">
          {gameType === 'doubles' ? (
            <>
              <Typography variant="caption" className="font-bold text-primary uppercase tracking-wider block mb-2">
                Team 1
              </Typography>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[0, 1].map((idx) => (
                  <Paper key={idx} variant="outlined" className="p-3 flex items-center justify-between rounded-xl bg-action.hover border-divider gap-2">
                    <TextField
                      label={`Spieler ${idx + 1} (Team 1)`}
                      size="small"
                      fullWidth
                      value={players[idx]?.name || ''}
                      onChange={(e) => handlePlayerSettingChange(idx, 'name', e.target.value)}
                      variant="standard"
                      slotProps={{ input: { disableUnderline: true } }}
                    />
                    <div className="flex items-center gap-1">
                      <IconButton size="small" disabled={idx === 0} onClick={() => handleMovePlayer(idx, 'up')}>
                        <ArrowUpwardIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" disabled={idx === 1} onClick={() => handleMovePlayer(idx, 'down')}>
                        <ArrowDownwardIcon fontSize="small" />
                      </IconButton>
                      <Tooltip title="Einstellungen">
                        <IconButton size="small" color="primary" onClick={() => handleOpenSettings(idx)}>
                          <SettingsIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </div>
                  </Paper>
                ))}
              </div>

              <Typography variant="caption" className="font-bold text-secondary uppercase tracking-wider block mb-2 mt-4">
                Team 2
              </Typography>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[2, 3].map((idx) => (
                  <Paper key={idx} variant="outlined" className="p-3 flex items-center justify-between rounded-xl bg-action.hover border-divider gap-2">
                    <TextField
                      label={`Spieler ${idx - 1} (Team 2)`}
                      size="small"
                      fullWidth
                      value={players[idx]?.name || ''}
                      onChange={(e) => handlePlayerSettingChange(idx, 'name', e.target.value)}
                      variant="standard"
                      slotProps={{ input: { disableUnderline: true } }}
                    />
                    <div className="flex items-center gap-1">
                      <IconButton size="small" disabled={idx === 2} onClick={() => handleMovePlayer(idx, 'up')}>
                        <ArrowUpwardIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" disabled={idx === 3} onClick={() => handleMovePlayer(idx, 'down')}>
                        <ArrowDownwardIcon fontSize="small" />
                      </IconButton>
                      <Tooltip title="Einstellungen">
                        <IconButton size="small" color="primary" onClick={() => handleOpenSettings(idx)}>
                          <SettingsIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </div>
                  </Paper>
                ))}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {players.map((player, idx) => (
                <Paper key={idx} variant="outlined" className="p-3 flex items-center justify-between rounded-xl bg-action.hover border-divider gap-2">
                  <TextField
                    label={`Spieler ${idx + 1}`}
                    size="small"
                    fullWidth
                    value={player.name}
                    onChange={(e) => handlePlayerSettingChange(idx, 'name', e.target.value)}
                    variant="standard"
                    slotProps={{ input: { disableUnderline: true } }}
                  />
                  <div className="flex items-center gap-1">
                    <IconButton size="small" disabled={idx === 0} onClick={() => handleMovePlayer(idx, 'up')}>
                      <ArrowUpwardIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" disabled={idx === players.length - 1} onClick={() => handleMovePlayer(idx, 'down')}>
                      <ArrowDownwardIcon fontSize="small" />
                    </IconButton>
                    <Tooltip title="Einstellungen">
                      <IconButton size="small" color="primary" onClick={() => handleOpenSettings(idx)}>
                        <SettingsIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </div>
                </Paper>
              ))}
            </div>
          )}
        </div>
      </Paper>

      {activePlayerIndex !== null && players[activePlayerIndex] && (
        <Dialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          maxWidth="sm"
          fullWidth
          slotProps={{
            paper: { sx: { borderRadius: '20px', p: 1 } },
          }}
        >
          <DialogTitle className="font-bold flex items-center gap-2">
            <SettingsIcon color="primary" /> Einstellungen: {players[activePlayerIndex].name}
          </DialogTitle>
          <DialogContent dividers className="space-y-6 py-5">
            <FormControl fullWidth size="small">
              <InputLabel id="modal-input-method-label">Eingabeart</InputLabel>
              <Select
                labelId="modal-input-method-label"
                value={players[activePlayerIndex].inputMethod}
                label="Eingabeart"
                onChange={(e) => handlePlayerSettingChange(activePlayerIndex, 'inputMethod', e.target.value)}
              >
                <MenuItem value="score">Gesamt-Score (Nummernblock)</MenuItem>
                <MenuItem value="dartByDart">Dart-by-Dart (Wurf für Wurf)</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={players[activePlayerIndex].checkoutHelper}
                  onChange={(e) => handlePlayerSettingChange(activePlayerIndex, 'checkoutHelper', e.target.checked)}
                  color="primary"
                />
              }
              label={<Typography variant="body2" color="text.primary">Checkout-Helper anzeigen</Typography>}
            />

            <Divider />

            {/* Live-Statistiken mit Master-Switch */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Typography variant="subtitle2" className="font-bold" color="text.primary">
                  Live-Statistiken anzeigen
                </Typography>
                <Switch
                  checked={players[activePlayerIndex].statsEnabled}
                  onChange={(e) => handlePlayerSettingChange(activePlayerIndex, 'statsEnabled', e.target.checked)}
                  color="primary"
                />
              </div>

              {players[activePlayerIndex].statsEnabled && (
                <div className="grid grid-cols-2 gap-1 pl-2 pt-1">
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={players[activePlayerIndex].stats.score80Plus}
                        onChange={(e) => handleStatChange(activePlayerIndex, 'score80Plus', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2" color="text.primary">80+</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={players[activePlayerIndex].stats.score100Plus}
                        onChange={(e) => handleStatChange(activePlayerIndex, 'score100Plus', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2" color="text.primary">100+</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={players[activePlayerIndex].stats.score140Plus}
                        onChange={(e) => handleStatChange(activePlayerIndex, 'score140Plus', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2" color="text.primary">140+</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={players[activePlayerIndex].stats.score180}
                        onChange={(e) => handleStatChange(activePlayerIndex, 'score180', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2" color="text.primary">180</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={players[activePlayerIndex].stats.overallAverage}
                        onChange={(e) => handleStatChange(activePlayerIndex, 'overallAverage', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2" color="text.primary">Gesamt-Avarage</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={players[activePlayerIndex].stats.legAverage}
                        onChange={(e) => handleStatChange(activePlayerIndex, 'legAverage', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2" color="text.primary">Leg-Avarage</Typography>}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={players[activePlayerIndex].stats.checkoutRate}
                        onChange={(e) => handleStatChange(activePlayerIndex, 'checkoutRate', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2" color="text.primary">Checkout-Quote</Typography>}
                  />
                </div>
              )}
            </div>

            <Divider />

            {/* Shortcut Grid Konfiguration */}
            <div className="space-y-4">
              <Typography variant="subtitle2" className="font-bold" color="text.primary">
                Shortcut-Grid anpassen
              </Typography>

              <div className="flex gap-3">
                <FormControl size="small" className="w-1/2">
                  <InputLabel>Spalten</InputLabel>
                  <Select
                    value={players[activePlayerIndex].shortcutGrid.cols}
                    label="Spalten"
                    onChange={(e) => handleGridDimensionsChange(activePlayerIndex, players[activePlayerIndex].shortcutGrid.rows, Number(e.target.value))}
                  >
                    {[1, 2, 3, 4].map((c) => (
                      <MenuItem key={c} value={c}>{c} Spalten</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" className="w-1/2">
                  <InputLabel>Reihen</InputLabel>
                  <Select
                    value={players[activePlayerIndex].shortcutGrid.rows}
                    label="Reihen"
                    onChange={(e) => handleGridDimensionsChange(activePlayerIndex, Number(e.target.value), players[activePlayerIndex].shortcutGrid.cols)}
                  >
                    {[1, 2, 3, 4].map((r) => (
                      <MenuItem key={r} value={r}>{r} Reihen</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>

              <Typography variant="caption" color="text.secondary" className="block pt-1">
                Klicke in die Felder, um deine Shortcut-Werte (z.B. 60, 100, 180) direkt im Raster zu positionieren:
              </Typography>

              <div
                className="grid gap-2 p-3 bg-action.hover rounded-xl border border-divider"
                style={{
                  gridTemplateColumns: `repeat(${players[activePlayerIndex].shortcutGrid.cols}, minmax(0, 1fr))`,
                }}
              >
                {players[activePlayerIndex].shortcutGrid.items.map((val, slotIdx) => (
                  <TextField
                    key={slotIdx}
                    size="small"
                    value={val}
                    placeholder={`Feld ${slotIdx + 1}`}
                    onChange={(e) => handleGridItemChange(activePlayerIndex, slotIdx, e.target.value)}
                    slotProps={{
                      htmlInput: { style: { textAlign: 'center', fontWeight: 'bold' } },
                    }}
                  />
                ))}
              </div>
            </div>
          </DialogContent>
          <DialogActions className="p-3">
            <Button variant="contained" onClick={() => setSettingsOpen(false)} className="rounded-xl px-5 font-bold">
              Fertig
            </Button>
          </DialogActions>
        </Dialog>
      )}

      <Box className="flex justify-end pt-2">
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handleStart}
          startIcon={<PlayArrowIcon />}
          className="w-full sm:w-auto font-bold px-8 py-3 rounded-xl shadow-lg text-base"
        >
          Match Starten
        </Button>
      </Box>
    </Box>
  );
};
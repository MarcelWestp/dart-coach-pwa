import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

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

interface GameConfig {
  startScore: number;
  inMode: string;
  outMode: string;
  gameType: string;
  botDifficulty: number | null;
  matchMode?: 'bestOf' | 'firstTo';
  matchTarget?: number;
  players: PlayerConfig[];
}

interface X01GameViewProps {
  config: GameConfig;
  onBackToSetup: () => void;
}

interface HistoryStep {
  playerIndex: number;
  scoreBefore: number;
  scoreAfter: number;
  pointsScored: number;
  isBust: boolean;
  dartsThrown: number;
  playerScoresSnapshot: number[];
  statsSnapshot: PlayerStatsData[];
  activePlayerIndexSnapshot: number;
  legStarterIndexSnapshot: number;
}

interface PlayerStatsData {
  totalPoints: number;
  totalDarts: number;
  legsWon: number;
  checkoutAttempts: number;
  checkoutHits: number;
  count80: number;
  count100: number;
  count140: number;
  count180: number;
  recentScores: { points: number; isBust: boolean; scoreAfter: number; dartsThrown: number }[];
}

const impossibleCheckouts = [159, 162, 165, 166, 168, 169];

const getCheckoutWay = (score: number): string => {
  if (score > 170 || impossibleCheckouts.includes(score)) {
    return '';
  }
  const checkouts: { [key: number]: string } = {
    170: 'T20 - T20 - Bull',
    167: 'T20 - T19 - Bull',
    164: 'T20 - T18 - Bull',
    161: 'T20 - T17 - Bull',
    160: 'T20 - T20 - D20',
    158: 'T20 - T20 - D19',
    157: 'T20 - T19 - D20',
    156: 'T20 - T20 - D18',
    155: 'T20 - T15 - Bull',
    154: 'T20 - T18 - D20',
    153: 'T20 - T19 - D18',
    152: 'T20 - T20 - D16',
    151: 'T20 - T17 - D20',
    150: 'T20 - T18 - D18',
  };
  if (checkouts[score]) return checkouts[score];
  if (score <= 40 && score % 2 === 0) return `D${score / 2}`;
  if (score === 50) return 'Bull';
  return 'Checkout möglich';
};

export const X01GameView: React.FC<X01GameViewProps> = ({ config, onBackToSetup }) => {
  const initialPlayers = [...config.players];
  if (config.gameType === 'bot' && initialPlayers.length === 1) {
    initialPlayers.push({
      name: `Bot (${config.botDifficulty}er Schnitt)`,
      checkoutHelper: true,
      inputMethod: 'score',
      shortcuts: ['60', '100', '140', '180'],
      shortcutGrid: { rows: 2, cols: 2, items: ['60', '100', '140', '180'] },
      statsEnabled: true,
      stats: { score80Plus: true, score100Plus: true, score140Plus: true, score180: true, overallAverage: true, legAverage: true, checkoutRate: true },
    });
  }

  const [playersList, setPlayersList] = useState<PlayerConfig[]>(initialPlayers);
  const matchMode = config.matchMode || 'bestOf';
  const matchTarget = config.matchTarget || 5;
  const legsNeededToWinMatch = matchMode === 'bestOf' ? Math.floor(matchTarget / 2) + 1 : matchTarget;

  const [playerScores, setPlayerScores] = useState<number[]>(playersList.map(() => config.startScore));
  const [activePlayerIndex, setActivePlayerIndex] = useState<number>(0);
  const [legStarterIndex, setLegStarterIndex] = useState<number>(0);
  const [inputValue, setInputValue] = useState<string>('');
  
  const [history, setHistory] = useState<HistoryStep[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryStep[]>([]);
  
  const [matchWinner, setMatchWinner] = useState<string | null>(null);

  const [checkoutModalOpen, setCheckoutModalOpen] = useState<boolean>(false);
  const [pendingCheckout, setPendingCheckout] = useState<{
    currentScore: number;
    scoredPoints: number;
  } | null>(null);

  const [selectedDartsTotal, setSelectedDartsTotal] = useState<number>(3);
  const [selectedDartsDouble, setSelectedDartsDouble] = useState<number>(1);

  const [stats, setStats] = useState<PlayerStatsData[]>(
    playersList.map(() => ({
      totalPoints: 0,
      totalDarts: 0,
      legsWon: 0,
      checkoutAttempts: 0,
      checkoutHits: 0,
      count80: 0,
      count100: 0,
      count140: 0,
      count180: 0,
      recentScores: [],
    }))
  );

  const activePlayer = playersList[activePlayerIndex];
  const currentScore = playerScores[activePlayerIndex];
  const isBotTurn = config.gameType === 'bot' && activePlayerIndex === 1;

  const isOnCheckout = currentScore <= 170 && currentScore !== 1 && !impossibleCheckouts.includes(currentScore);

  const isGameStart = history.length === 0 && stats.every(s => s.legsWon === 0 && s.totalDarts === 0);
  const isDecisiveLeg = playersList.length === 2 && stats[0].legsWon === legsNeededToWinMatch - 1 && stats[1].legsWon === legsNeededToWinMatch - 1;
  const canSwapPlayers = (isGameStart || isDecisiveLeg) && !matchWinner && playersList.length === 2;

  const handleSwapPlayers = () => {
    if (!canSwapPlayers) return;
    setPlayersList(prev => [prev[1], prev[0]]);
    setPlayerScores(prev => [prev[1], prev[0]]);
    setStats(prev => [prev[1], prev[0]]);
    setActivePlayerIndex(prev => (prev === 0 ? 1 : 0));
    setLegStarterIndex(prev => (prev === 0 ? 1 : 0));
  };

  const submitScore = (inputVal: number, isRemainingInput: boolean) => {
    if (isNaN(inputVal) || inputVal < 0 || matchWinner) return;

    let scoredPoints = 0;
    let newScore = currentScore;
    let isBust = false;

    if (isRemainingInput) {
      const targetRemaining = inputVal;
      scoredPoints = currentScore - targetRemaining;

      if (scoredPoints > 180 || scoredPoints < 0 || targetRemaining >= currentScore) {
        setInputValue('');
        return; 
      }

      newScore = targetRemaining;
    } else {
      if (inputVal > 180) {
        setInputValue('');
        return;
      }
      scoredPoints = inputVal;

      if (scoredPoints > currentScore) {
        isBust = true;
      } else {
        newScore = currentScore - scoredPoints;
      }
    }

    if (newScore === 1 && config.outMode === 'double') {
      isBust = true;
      newScore = currentScore;
    }

    if (!isBust && newScore === 0) {
      if (!isBotTurn) {
        setSelectedDartsTotal(3);
        setSelectedDartsDouble(1);
        setPendingCheckout({ currentScore, scoredPoints });
        setCheckoutModalOpen(true);
        return;
      } else {
        finalizeTurn(currentScore, scoredPoints, 0, false, 3, 1);
        return;
      }
    }

    finalizeTurn(currentScore, scoredPoints, newScore, isBust, 3, 0);
  };

  const handleDirectCheckoutSubmit = () => {
    if (!isOnCheckout || matchWinner || isBotTurn) return;
    setSelectedDartsTotal(3);
    setSelectedDartsDouble(1);
    setPendingCheckout({ currentScore, scoredPoints: currentScore });
    setCheckoutModalOpen(true);
  };

  const confirmCheckout = () => {
    setCheckoutModalOpen(false);
    if (!pendingCheckout) return;

    const { currentScore, scoredPoints } = pendingCheckout;
    setPendingCheckout(null);

    finalizeTurn(currentScore, scoredPoints, 0, false, selectedDartsTotal, selectedDartsDouble);
  };

  const finalizeTurn = (
    scoreBefore: number,
    scoredPoints: number,
    newScore: number,
    isBust: boolean,
    dartsThrown: number,
    dartsAtDouble: number
  ) => {
    const nextScoreState = [...playerScores];
    nextScoreState[activePlayerIndex] = isBust ? scoreBefore : newScore;

    const nextStatsState = JSON.parse(JSON.stringify(stats));
    let legFinished = false;

    if (!isBust) {
      const pStats = nextStatsState[activePlayerIndex];
      pStats.totalPoints += scoredPoints;
      pStats.totalDarts += dartsThrown;

      if (scoredPoints >= 180) pStats.count180++;
      else if (scoredPoints >= 140) pStats.count140++;
      else if (scoredPoints >= 100) pStats.count100++;
      else if (scoredPoints >= 80) pStats.count80++;

      if (scoreBefore <= 170) {
        pStats.checkoutAttempts += dartsAtDouble;
        if (newScore === 0) {
          pStats.checkoutHits++;
          pStats.legsWon++;
          legFinished = true;
          
          if (pStats.legsWon >= legsNeededToWinMatch) {
            setMatchWinner(activePlayer.name);
          }
        }
      }

      pStats.recentScores.unshift({ points: scoredPoints, isBust: false, scoreAfter: newScore, dartsThrown });
    } else {
      const pStats = nextStatsState[activePlayerIndex];
      pStats.totalDarts += 3;
      if (scoreBefore <= 170) {
        pStats.checkoutAttempts += dartsAtDouble;
      }
      pStats.recentScores.unshift({ points: 0, isBust: true, scoreAfter: scoreBefore, dartsThrown: 3 });
    }

    const step: HistoryStep = {
      playerIndex: activePlayerIndex,
      scoreBefore,
      scoreAfter: isBust ? scoreBefore : newScore,
      pointsScored: isBust ? 0 : scoredPoints,
      isBust,
      dartsThrown,
      playerScoresSnapshot: [...playerScores],
      statsSnapshot: JSON.parse(JSON.stringify(stats)),
      activePlayerIndexSnapshot: activePlayerIndex,
      legStarterIndexSnapshot: legStarterIndex,
    };

    setHistory((prev) => [...prev, step]);
    setRedoStack([]);

    setPlayerScores(nextScoreState);
    setStats(nextStatsState);
    setInputValue('');

    if (legFinished && !matchWinner) {
      const nextStarter = (legStarterIndex + 1) % playersList.length;
      setLegStarterIndex(nextStarter);
      setActivePlayerIndex(nextStarter);
      setPlayerScores(playersList.map(() => config.startScore));
      setHistory([]);
    } else if (newScore !== 0) {
      setActivePlayerIndex((prev) => (prev + 1) % playersList.length);
    }
  };

  const handleShortcutClick = (value: string) => {
    if (!value || isBotTurn) return;
    submitScore(parseInt(value, 10), false);
  };

  useEffect(() => {
    if (isBotTurn && !matchWinner) {
      const timer = setTimeout(() => {
        const targetAvg = config.botDifficulty || 60;
        const variance = (Math.random() * 20) - 10;
        let botScore = Math.round(targetAvg + variance);
        botScore = Math.max(0, Math.min(180, botScore));
        
        if (botScore > currentScore) {
          botScore = currentScore;
        }
        submitScore(botScore, false);
      }, 1200);

      return () => clearTimeout(timer);
    }
  }, [activePlayerIndex, matchWinner, playerScores]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (matchWinner || isBotTurn || checkoutModalOpen) return;

      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        setInputValue((prev) => prev + e.key);
      } else if (e.key === 'Backspace') {
        setInputValue((prev) => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        setInputValue((currentVal) => {
          if (currentVal) {
            submitScore(parseInt(currentVal, 10), false);
          }
          return '';
        });
      } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
        setInputValue('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [matchWinner, isBotTurn, checkoutModalOpen, activePlayerIndex, playerScores, config, stats]);

  const handleUndo = () => {
    if (history.length === 0) return;
    const lastStep = history[history.length - 1];

    const currentStepState: HistoryStep = {
      playerIndex: lastStep.playerIndex,
      scoreBefore: lastStep.scoreBefore,
      scoreAfter: lastStep.scoreAfter,
      pointsScored: lastStep.pointsScored,
      isBust: lastStep.isBust,
      dartsThrown: lastStep.dartsThrown,
      playerScoresSnapshot: [...playerScores],
      statsSnapshot: JSON.parse(JSON.stringify(stats)),
      activePlayerIndexSnapshot: activePlayerIndex,
      legStarterIndexSnapshot: legStarterIndex,
    };

    setRedoStack((prev) => [...prev, currentStepState]);
    setPlayerScores(lastStep.playerScoresSnapshot);
    setStats(lastStep.statsSnapshot);
    setActivePlayerIndex(lastStep.activePlayerIndexSnapshot);
    setLegStarterIndex(lastStep.legStarterIndexSnapshot);
    setHistory((prev) => prev.slice(0, prev.length - 1));
    setMatchWinner(null);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const nextStep = redoStack[redoStack.length - 1];

    const currentStepState: HistoryStep = {
      playerIndex: nextStep.playerIndex,
      scoreBefore: nextStep.scoreBefore,
      scoreAfter: nextStep.scoreAfter,
      pointsScored: nextStep.pointsScored,
      isBust: nextStep.isBust,
      dartsThrown: nextStep.dartsThrown,
      playerScoresSnapshot: [...playerScores],
      statsSnapshot: JSON.parse(JSON.stringify(stats)),
      activePlayerIndexSnapshot: activePlayerIndex,
      legStarterIndexSnapshot: legStarterIndex,
    };

    setHistory((prev) => [...prev, currentStepState]);
    setPlayerScores(nextStep.playerScoresSnapshot);
    setStats(nextStep.statsSnapshot);
    setActivePlayerIndex((nextStep.playerIndex + 1) % playersList.length);
    setRedoStack((prev) => prev.slice(0, prev.length - 1));
  };

  const heimPlayer = playersList[0];
  const gastPlayer = playersList[1] || { name: 'Gast', checkoutHelper: true, statsEnabled: true, stats: { score80Plus: true, score100Plus: true, score140Plus: true, score180: true, overallAverage: true, legAverage: true, checkoutRate: true } };
  
  const heimScore = playerScores[0];
  const gastScore = playerScores[1] !== undefined ? playerScores[1] : config.startScore;
  
  const heimStats = stats[0];
  const gastStats = stats[1] || { totalPoints: 0, totalDarts: 0, legsWon: 0, checkoutAttempts: 0, checkoutHits: 0, count80: 0, count100: 0, count140: 0, count180: 0, recentScores: [] };

  const heimAvg = heimStats.totalDarts > 0 ? ((heimStats.totalPoints / heimStats.totalDarts) * 3).toFixed(1) : '-';
  const gastAvg = gastStats.totalDarts > 0 ? ((gastStats.totalPoints / gastStats.totalDarts) * 3).toFixed(1) : '-';

  // Trennung und gleitendes Sichtfenster (Sliding Window für 4 Zeilen)
  const heimTurns = history.filter(h => h.playerIndex === 0);
  const gastTurns = history.filter(h => h.playerIndex === 1);
  
  const VISIBLE_ROWS = 4; // Fester Platz für 4 Aufnahmen (3-5 je nach Display)

  const getVisibleRows = (turns: typeof heimTurns) => {
    const total = turns.length;
    const start = Math.max(0, total - VISIBLE_ROWS);
    const windowRows = [];
    
    for (let i = 0; i < VISIBLE_ROWS; i++) {
      const targetIndex = start + i;
      if (targetIndex < total) {
        windowRows.push({ turn: turns[targetIndex], globalIndex: targetIndex });
      } else {
        windowRows.push(null);
      }
    }
    return windowRows;
  };

  const visibleHeimRows = getVisibleRows(heimTurns);
  const visibleGastRows = getVisibleRows(gastTurns);

  return (
    <Box className="max-w-6xl mx-auto px-3 sm:px-6 py-4 space-y-4">
      {/* Top Bar */}
      <Paper
        elevation={0}
        sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}
        className="p-3 rounded-2xl flex flex-wrap justify-between items-center gap-3 shadow-sm"
      >
        <Button
          variant="outlined"
          size="small"
          startIcon={<ArrowBackIcon />}
          onClick={onBackToSetup}
          className="rounded-xl"
        >
          Setup
        </Button>

        <Typography variant="subtitle1" className="font-extrabold tracking-wider" color="text.primary">
          {config.startScore} X01 ({config.outMode.toUpperCase()}-OUT) • {matchMode === 'bestOf' ? `Best of ${matchTarget}` : `First to ${matchTarget}`}
        </Typography>

        <div className="flex gap-2">
          <Button
            variant="outlined"
            size="small"
            startIcon={<UndoIcon />}
            onClick={handleUndo}
            disabled={history.length === 0}
            className="rounded-xl"
          >
            Undo
          </Button>
          <Button
            variant="outlined"
            size="small"
            endIcon={<RedoIcon />}
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="rounded-xl"
          >
            Redo
          </Button>
        </div>
      </Paper>

      {/* Match Gewinner Banner */}
      {matchWinner && (
        <Paper
          elevation={0}
          sx={{ bgcolor: 'success.main', color: 'success.contrastText' }}
          className="p-6 rounded-2xl text-center space-y-3 shadow-lg"
        >
          <div className="flex justify-center items-center gap-2">
            <EmojiEventsIcon fontSize="large" />
            <Typography variant="h5" className="font-extrabold">
              {matchWinner} hat das Match gewonnen!
            </Typography>
          </div>
          <Button
            variant="contained"
            color="inherit"
            className="text-success font-bold rounded-xl mt-2 px-6"
            onClick={() => {
              setPlayerScores(playersList.map(() => config.startScore));
              setMatchWinner(null);
              setHistory([]);
              setRedoStack([]);
              setStats(playersList.map(() => ({
                totalPoints: 0,
                totalDarts: 0,
                legsWon: 0,
                checkoutAttempts: 0,
                checkoutHits: 0,
                count80: 0,
                count100: 0,
                count140: 0,
                count180: 0,
                recentScores: [],
              })));
            }}
          >
            Neues Match starten
          </Button>
        </Paper>
      )}

      {/* Turnier-Ansicht (Heim / Gast Layout mit festem Sichtfenster & Darts in der Mitte) */}
      <Paper
        elevation={0}
        sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}
        className="rounded-2xl overflow-hidden shadow-sm"
      >
        {/* Header Names & Tausch-Button */}
        <div className="grid grid-cols-12 bg-card text-card-foreground border-b border-divider font-extrabold text-center py-3 px-4 items-center tracking-wider text-lg">
          <div className="col-span-5 text-left uppercase truncate px-2 text-text.primary">{heimPlayer.name}</div>
          <div className="col-span-2 flex justify-center">
            {canSwapPlayers ? (
              <IconButton 
                onClick={handleSwapPlayers} 
                color="primary" 
                size="small" 
                title="Anfangenden Spieler tauschen"
                className="bg-primary/10 hover:bg-primary/20"
              >
                <SwapHorizIcon />
              </IconButton>
            ) : (
              <SwapHorizIcon className="opacity-30" />
            )}
          </div>
          <div className="col-span-5 text-right uppercase truncate px-2 text-text.primary">{gastPlayer.name}</div>
        </div>

        {/* Big Scores Header mit Legs in der Mitte */}
        <div className="grid grid-cols-12 items-center bg-background border-b border-divider">
          <div 
            className={`col-span-5 p-6 text-center transition-all ${activePlayerIndex === 0 && !matchWinner ? 'border-2 border-primary bg-primary/10' : 'opacity-90'}`}
          >
            <Typography variant="h2" className="font-black tracking-tight" color="text.primary">
              {heimScore}
            </Typography>
          </div>

          <div className="col-span-2 text-center py-2 space-y-0.5">
            <div className="text-xl font-black tracking-widest flex justify-center items-center gap-2 text-text.primary">
              <span>{heimStats.legsWon}</span>
              <span className="text-xs font-semibold uppercase opacity-70">Legs</span>
              <span>{gastStats.legsWon}</span>
            </div>
            <Typography variant="caption" color="text.secondary" className="block text-[10px]">
              ({matchMode === 'bestOf' ? `Best of ${matchTarget}` : `First to ${matchTarget}`})
            </Typography>
          </div>

          <div 
            className={`col-span-5 p-6 text-center transition-all ${activePlayerIndex === 1 && !matchWinner ? 'border-2 border-primary bg-primary/10' : 'opacity-90'}`}
          >
            <Typography variant="h2" className="font-black tracking-tight" color="text.primary">
              {gastScore}
            </Typography>
          </div>
        </div>

        {/* Tabellarischer Verlauf mit festem Platz für 4 Zeilen */}
        <div className="grid grid-cols-12 bg-background/50">
          
          {/* HEIM TABELLE (Col 1-5) */}
          <div className="col-span-5 flex flex-col border-r border-divider">
            <div className="grid grid-cols-2 text-center font-bold text-text.secondary text-xs uppercase tracking-wider bg-background/80 py-2 border-b border-divider">
              <span>Score</span>
              <span>Punkte</span>
            </div>
            <div className="flex flex-col">
              {Array.from({ length: VISIBLE_ROWS }).map((_, rIdx) => {
                const row = visibleHeimRows[rIdx];
                return (
                  <div key={rIdx} className="grid grid-cols-2 text-center py-3 font-semibold border-b border-divider/50 items-center min-h-[46px]">
                    <span className={row?.turn?.isBust ? 'text-error font-bold' : 'text-text.primary'}>
                      {row ? (row.turn.isBust ? 'BUST' : row.turn.pointsScored) : ''}
                    </span>
                    <span className="text-text.secondary">
                      {row ? row.turn.scoreAfter : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* MITTE: Gesamtdarts Spalte (Col 6-7) */}
          <div className="col-span-2 flex flex-col bg-background/90 border-r border-divider text-center">
            <div className="py-2 text-xs font-bold text-text.secondary uppercase tracking-wider bg-background/80 border-b border-divider">
              Darts
            </div>
            <div className="flex flex-col">
              {Array.from({ length: VISIBLE_ROWS }).map((_, rIdx) => {
                const heimRow = visibleHeimRows[rIdx];
                const gastRow = visibleGastRows[rIdx];
                const dartCount = heimRow ? (heimRow.globalIndex + 1) * 3 : (gastRow ? (gastRow.globalIndex + 1) * 3 : '');
                return (
                  <div key={rIdx} className="py-3 text-sm font-black text-text.primary min-h-[46px] flex items-center justify-center">
                    {dartCount !== '' ? dartCount : '-'}
                  </div>
                );
              })}
            </div>
          </div>

          {/* GAST TABELLE (Col 8-12) */}
          <div className="col-span-5 flex flex-col">
            <div className="grid grid-cols-2 text-center font-bold text-text.secondary text-xs uppercase tracking-wider bg-background/80 py-2 border-b border-divider">
              <span>Score</span>
              <span>Punkte</span>
            </div>
            <div className="flex flex-col">
              {Array.from({ length: VISIBLE_ROWS }).map((_, rIdx) => {
                const row = visibleGastRows[rIdx];
                return (
                  <div key={rIdx} className="grid grid-cols-2 text-center py-3 font-semibold border-b border-divider/50 items-center min-h-[46px]">
                    <span className={row?.turn?.isBust ? 'text-error font-bold' : 'text-text.primary'}>
                      {row ? (row.turn.isBust ? 'BUST' : row.turn.pointsScored) : ''}
                    </span>
                    <span className="text-text.secondary">
                      {row ? row.turn.scoreAfter : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Statistiken Fußzeile */}
        <div className="grid grid-cols-12 bg-background/80 border-t border-divider p-3 text-xs">
          <div className="col-span-6 border-r border-divider pr-3 flex justify-around">
            <div>100+: <span className="font-bold">{heimStats.count100}</span></div>
            <div>140+: <span className="font-bold">{heimStats.count140}</span></div>
            <div>180: <span className="font-bold">{heimStats.count180}</span></div>
            <div>Ø: <span className="font-bold">{heimAvg}</span></div>
          </div>
          <div className="col-span-6 pl-3 flex justify-around">
            <div>100+: <span className="font-bold">{gastStats.count100}</span></div>
            <div>140+: <span className="font-bold">{gastStats.count140}</span></div>
            <div>180: <span className="font-bold">{gastStats.count180}</span></div>
            <div>Ø: <span className="font-bold">{gastAvg}</span></div>
          </div>
        </div>
      </Paper>

      {/* Checkout-Helper Anzeige */}
      {activePlayer.checkoutHelper && currentScore <= 170 && currentScore > 0 && (
        <Paper elevation={0} className="p-3 rounded-2xl bg-primary/10 border border-primary/30 text-center">
          <Typography variant="body2" className="font-bold text-primary">
            Checkout-Empfehlung für {activePlayer.name} ({currentScore}): {getCheckoutWay(currentScore)}
          </Typography>
        </Paper>
      )}

      {/* Eingabebereich / Oche Ansicht */}
      {!matchWinner && (
        <Paper
          elevation={0}
          sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}
          className="p-5 sm:p-6 rounded-2xl space-y-6 shadow-sm"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-3">
              <Typography variant="subtitle2" className="font-bold" color="text.primary">
                Schnellstart-Shortcuts ({activePlayer.name} wirft)
              </Typography>

              <div
                className="grid gap-2"
                style={{
                  gridTemplateColumns: `repeat(${activePlayer.shortcutGrid.cols}, minmax(0, 1fr))`,
                }}
              >
                {activePlayer.shortcutGrid.items.map((shortcut, sIdx) => (
                  <Button
                    key={sIdx}
                    variant="outlined"
                    size="large"
                    disabled={!shortcut || isBotTurn}
                    onClick={() => handleShortcutClick(shortcut)}
                    className="py-4 font-bold text-lg rounded-xl"
                  >
                    {shortcut || '-'}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <TextField
                label="Punkte dieser Aufnahme"
                variant="outlined"
                fullWidth
                value={inputValue}
                slotProps={{
                  htmlInput: { readOnly: true, style: { fontSize: '1.5rem', fontWeight: 'bold', textAlign: 'center' } },
                }}
              />

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={() => submitScore(parseInt(inputValue, 10), false)}
                  disabled={!inputValue || isBotTurn}
                  className="py-3 font-bold rounded-xl"
                >
                  Enter
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  size="large"
                  onClick={() => submitScore(parseInt(inputValue, 10), true)}
                  disabled={!inputValue || isBotTurn}
                  className="py-3 font-bold rounded-xl"
                >
                  Restscore
                </Button>
              </div>

              {isOnCheckout && !isBotTurn && (
                <Button
                  variant="contained"
                  color="success"
                  size="large"
                  fullWidth
                  startIcon={<CheckCircleIcon />}
                  onClick={handleDirectCheckoutSubmit}
                  className="py-3 font-extrabold text-base rounded-xl shadow-md"
                >
                  Checkout! ({currentScore})
                </Button>
              )}

              <div className="grid grid-cols-3 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((btn) => (
                  <Button
                    key={btn}
                    variant="outlined"
                    disabled={isBotTurn}
                    onClick={() => {
                      if (btn === 'C') setInputValue('');
                      else if (btn === '⌫') setInputValue((prev) => prev.slice(0, -1));
                      else setInputValue((prev) => prev + btn);
                    }}
                    className="py-3 text-lg font-bold rounded-xl"
                  >
                    {btn}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </Paper>
      )}

      {/* Checkout Dialog */}
      <Dialog
        open={checkoutModalOpen}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: '20px', p: 2 } },
        }}
      >
        <DialogTitle className="font-bold text-center">
          Checkout erfolgreich!
        </DialogTitle>
        <DialogContent className="space-y-6 py-4">
          <div className="space-y-2">
            <Typography variant="body2" color="text.secondary" className="font-bold">
              Benötigte Darts für das Finish (1-3):
            </Typography>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((num) => (
                <Button
                  key={num}
                  variant={selectedDartsTotal === num ? 'contained' : 'outlined'}
                  onClick={() => setSelectedDartsTotal(num)}
                  className="py-3 font-bold rounded-xl"
                >
                  {num} {num === 1 ? 'Dart' : 'Darts'}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Typography variant="body2" color="text.secondary" className="font-bold">
              Darts auf Doppel geworfen (1-3):
            </Typography>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((num) => (
                <Button
                  key={num}
                  variant={selectedDartsDouble === num ? 'contained' : 'outlined'}
                  onClick={() => setSelectedDartsDouble(num)}
                  className="py-3 font-bold rounded-xl"
                >
                  {num} {num === 1 ? 'Dart' : 'Darts'}
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
        <DialogActions className="p-2">
          <Button
            variant="contained"
            color="success"
            fullWidth
            onClick={confirmCheckout}
            className="py-3 font-extrabold rounded-xl text-base"
          >
            Leg beenden
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
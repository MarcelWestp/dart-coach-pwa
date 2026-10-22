import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { getMonthlyChallengeLeaderboard, getCurrentMonthYear } from '../../services/challengeService';
import type { ChallengeDifficulty, ChallengeLeaderboardEntry } from '../../types/challenge';
import type { UserProfile } from '../../types/user';
import { PublicProfileModal } from '../profile/PublicProfileModal';
import {
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TimerIcon from '@mui/icons-material/Timer';

interface MonthlyChallengeLeaderboardProps {
  initialDifficulty?: ChallengeDifficulty;
  onBackToCard?: () => void;
}

export const MonthlyChallengeLeaderboard: React.FC<MonthlyChallengeLeaderboardProps> = ({
  initialDifficulty = 'bronze',
  onBackToCard,
}) => {
  const [difficulty, setDifficulty] = useState<ChallengeDifficulty>(initialDifficulty);
  const [leaderboard, setLeaderboard] = useState<ChallengeLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal für öffentliches Profil
  const [selectedProfileUser, setSelectedProfileUser] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<Record<string, UserProfile>>({});

  const currentMonthYear = getCurrentMonthYear();

  const fetchLeaderboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Benutzerprofile laden, um Namen und Profilbilder zuzuordnen
      const usersSnap = await getDocs(collection(db, 'users'));
      const profilesMap: Record<string, { displayName: string; photoURL?: string; activeTitle?: string }> = {};
      const fullUsersMap: Record<string, UserProfile> = {};

      usersSnap.forEach((d) => {
        const uData = d.data() as UserProfile;
        const uid = uData.uid || d.id;
        fullUsersMap[uid] = uData;

        const displayName = uData.nickname || uData.realName || 'Darter';
        profilesMap[uid] = {
          displayName,
          photoURL: uData.photoURL,
          activeTitle: uData.activeTitle,
        };
      });

      setAllUsers(fullUsersMap);

      // 2. Rangliste laden (sortiert nach benötigten Tagen & Fertigstellungsdatum)
      const data = await getMonthlyChallengeLeaderboard(difficulty, currentMonthYear, profilesMap);
      setLeaderboard(data);
    } catch (err) {
      console.error(err);
      setError('Fehler beim Laden der Challenge-Rangliste.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboardData();
  }, [difficulty]);

  const formatMonthYearDisplay = (myStr: string) => {
    const [y, m] = myStr.split('-');
    return `${m}/${y}`;
  };

  const getDifficultyChip = (diff: ChallengeDifficulty) => {
    switch (diff) {
      case 'bronze':
        return <Chip label="BRONZE" sx={{ bgcolor: '#cd7f32', color: '#fff', fontWeight: 'bold' }} />;
      case 'silver':
        return <Chip label="SILBER" sx={{ bgcolor: '#c0c0c0', color: '#000', fontWeight: 'bold' }} />;
      case 'gold':
        return <Chip label="GOLD" sx={{ bgcolor: '#ffd700', color: '#000', fontWeight: 'bold' }} />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 p-4 sm:p-6">
      {/* HEADER & FILTER */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <Typography variant="h4" component="h1" className="font-bold flex items-center gap-2" color="text.primary">
            <EmojiEventsIcon fontSize="large" color="primary" /> Challenge Rangliste
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Monat: {formatMonthYearDisplay(currentMonthYear)} — Nur Spieler, die alle 7 Aufgaben absolviert haben.
          </Typography>
        </div>

        {onBackToCard && (
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={onBackToCard}>
            Zur Trainingskarte
          </Button>
        )}
      </div>

      {error && <Alert severity="error">{error}</Alert>}

      {/* FILTER STUFE */}
      <Paper className="p-4 flex items-center justify-between flex-wrap gap-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Typography variant="subtitle1" className="font-bold" color="text.primary">
            Schwierigkeit:
          </Typography>
          {getDifficultyChip(difficulty)}
        </div>

        <FormControl size="small" className="min-w-[180px]">
          <InputLabel>Stufe Wählen</InputLabel>
          <Select
            value={difficulty}
            label="Stufe Wählen"
            onChange={(e) => setDifficulty(e.target.value as ChallengeDifficulty)}
          >
            <MenuItem value="bronze">Bronze / Anfänger</MenuItem>
            <MenuItem value="silver">Silber / Fortgeschritten</MenuItem>
            <MenuItem value="gold">Gold / Profi</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      {/* RANGLISTEN-TABELLE */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <CircularProgress />
        </div>
      ) : (
        <TableContainer component={Paper} variant="outlined" className="shadow-md">
          <Table>
            <TableHead className="bg-stone-100 dark:bg-stone-800">
              <TableRow>
                <TableCell className="font-bold">Platz</TableCell>
                <TableCell className="font-bold">Spieler</TableCell>
                <TableCell align="center" className="font-bold">
                  Benötigte Zeit
                </TableCell>
                <TableCell align="right" className="font-bold">
                  Fertiggestellt am
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leaderboard.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" className="text-stone-500 py-8">
                    In diesem Monat hat noch kein Spieler auf der Stufe{' '}
                    <strong>{difficulty.toUpperCase()}</strong> alle 7 Aufgaben absolviert.
                  </TableCell>
                </TableRow>
              ) : (
                leaderboard.map((entry, idx) => {
                  const userObj = allUsers[entry.userId];
                  const isTop3 = idx < 3;
                  const rankIcon = idx === 0 ? '🥇 1.' : idx === 1 ? '🥈 2.' : idx === 2 ? '🥉 3.' : `${idx + 1}.`;

                  return (
                    <TableRow key={entry.userId} hover>
                      <TableCell className={`font-extrabold ${isTop3 ? 'text-lg' : ''}`}>
                        {rankIcon}
                      </TableCell>

                      <TableCell
                        className="cursor-pointer hover:underline"
                        onClick={() => userObj && setSelectedProfileUser(userObj)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={entry.userPhotoURL}
                            alt={entry.userDisplayName}
                            sx={{ width: 36, height: 36 }}
                          />
                          <div>
                            <Typography variant="body1" className="font-bold leading-tight" color="text.primary">
                              {entry.userDisplayName}
                            </Typography>
                            {entry.activeTitle && (
                              <Typography variant="caption" color="primary" className="block font-medium">
                                {entry.activeTitle}
                              </Typography>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell align="center">
                        <Chip
                          icon={<TimerIcon fontSize="small" />}
                          label={`${entry.daysNeeded} ${entry.daysNeeded === 1 ? 'Tag' : 'Tage'}`}
                          color={idx === 0 ? 'success' : 'primary'}
                          variant="outlined"
                          className="font-bold"
                        />
                      </TableCell>

                      <TableCell align="right" className="text-sm font-medium" color="textSecondary">
                        {new Date(entry.completedDate).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* MODAL FÜR ÖFFENTLICHES PROFIL */}
      <PublicProfileModal
        open={Boolean(selectedProfileUser)}
        onClose={() => setSelectedProfileUser(null)}
        user={selectedProfileUser}
      />
    </div>
  );
};
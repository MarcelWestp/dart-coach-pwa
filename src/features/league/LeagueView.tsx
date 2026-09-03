import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { sendNotificationIfEnabled } from "../../services/notificationService";
import type { UserProfile } from "../../types/user";
import type { Exercise, TestResult } from "../../types/exercise";
import type {
  LeagueConfig,
  MonthlyExerciseConfig,
  PlayerRating,
} from "../../types/league";
import { RecordResultModal } from "../exercises/RecordResultModal";
import { PublicProfileModal } from "../profile/PublicProfileModal";
import {
  Paper,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Card,
  Box,
} from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import SportsKabaddiIcon from "@mui/icons-material/SportsKabaddi";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import HistoryIcon from "@mui/icons-material/History";

export const LeagueView: React.FC = () => {
  const { userProfile } = useAuth();

  const [activeTab, setActiveTab] = useState(0); // 0 = Übung des Monats, 1 = Performance Leagues, 2 = Match Leagues
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Daten aus Firestore
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [leagues, setLeagues] = useState<LeagueConfig[]>([]);
  const [monthlyConfigs, setMonthlyConfigs] = useState<MonthlyExerciseConfig[]>([]);
  const [ratings, setRatings] = useState<PlayerRating[]>([]);

  // State für "Übung des Monats" Archiv-Filter
  const currentDate = new Date();
  const [selectedArchivedMonth, setSelectedArchivedMonth] = useState<number>(
    currentDate.getMonth() + 1
  );
  const [selectedArchivedYear, setSelectedArchivedYear] = useState<number>(
    currentDate.getFullYear()
  );

  // State für Modals
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState<UserProfile | null>(null);

  // 1v1 Match Formular State
  const [selectedOpponentId, setSelectedOpponentId] = useState("");
  const [selectedMatchLeagueId, setSelectedMatchLeagueId] = useState("");
  const [myScore, setMyScore] = useState<number>(0);
  const [opponentScore, setOpponentScore] = useState<number>(0);
  const [matchSubmitting, setMatchSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uSnap, exSnap, resSnap, lSnap, mSnap, rSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "exercises")),
        getDocs(collection(db, "testResults")),
        getDocs(collection(db, "leagues")),
        getDocs(collection(db, "monthlyExercises")),
        getDocs(collection(db, "playerRatings")),
      ]);

      const fetchedUsers: UserProfile[] = [];
      uSnap.forEach((d) => {
        const { id, ...data } = d.data();
        fetchedUsers.push({ id: d.id, ...data } as any);
      });

      const fetchedEx: Exercise[] = [];
      exSnap.forEach((d) => {
        const { id, ...data } = d.data();
        fetchedEx.push({ id: d.id, ...data } as Exercise);
      });

      const fetchedRes: TestResult[] = [];
      resSnap.forEach((d) => {
        const { id, ...data } = d.data();
        fetchedRes.push({ id: d.id, ...data } as TestResult);
      });

      const fetchedLeagues: LeagueConfig[] = [];
      lSnap.forEach((d) => {
        const { id, ...data } = d.data();
        fetchedLeagues.push({ id: d.id, ...data } as LeagueConfig);
      });

      const fetchedMonthly: MonthlyExerciseConfig[] = [];
      mSnap.forEach((d) => {
        const { id, ...data } = d.data();
        fetchedMonthly.push({ id: d.id, ...data } as MonthlyExerciseConfig);
      });

      const fetchedRatings: PlayerRating[] = [];
      rSnap.forEach((d) => {
        const data = d.data();
        delete data.id;
        fetchedRatings.push({ id: d.id, ...data } as unknown as PlayerRating);
      });

      setUsers(fetchedUsers);
      setExercises(fetchedEx);
      setTestResults(fetchedRes);
      setLeagues(fetchedLeagues);
      setMonthlyConfigs(fetchedMonthly);
      setRatings(fetchedRatings);
    } catch (err) {
      console.error(err);
      setError("Fehler beim Laden der Ligationen.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handler nach Aufzeichnung eines neuen Übungsergebnisses
  const handleResultRecorded = async () => {
    if (!userProfile || !monthlyExercise || !currentMonthlyConfig) {
      await fetchData();
      return;
    }

    // Bisherigen Highscore des Nutzers für diese Monatsübung ermitteln
    const userPreviousResults = testResults.filter((res) => {
      const resExId = (res as any).exerciseId || res.testId;
      if (res.userId !== userProfile.uid || resExId !== monthlyExercise.id) return false;
      const resDate = new Date(res.completedAt);
      return (
        resDate.getMonth() + 1 === currentMonthlyConfig.month &&
        resDate.getFullYear() === currentMonthlyConfig.year
      );
    });

    const oldHighscore = userPreviousResults.reduce(
      (max, r) => (r.totalPoints > max ? r.totalPoints : max),
      0
    );

    // Neueste Daten laden
    await fetchData();

    // Nach dem Fetch die frisch geladenen Ergebnisse prüfen
    const latestResSnap = await getDocs(collection(db, "testResults"));
    let newBest = 0;
    latestResSnap.forEach((d) => {
      const res = d.data() as TestResult;
      const resExId = (res as any).exerciseId || res.testId;
      if (res.userId === userProfile.uid && resExId === monthlyExercise.id) {
        const resDate = new Date(res.completedAt);
        if (
          resDate.getMonth() + 1 === currentMonthlyConfig.month &&
          resDate.getFullYear() === currentMonthlyConfig.year
        ) {
          if (res.totalPoints > newBest) newBest = res.totalPoints;
        }
      }
    });

    // Wenn der neue Bestwert höher ist als der alte, Benachrichtigung senden
    if (newBest > oldHighscore) {
      await sendNotificationIfEnabled({
        userId: userProfile.uid,
        type: "monthlyExerciseHighscore",
        title: "Neuer Highscore!",
        message: `Glückwunsch! Du hast einen neuen Highscore von ${newBest} Punkten in der Übung des Monats ("${monthlyExercise.title}") aufgestellt.`,
        link: "/league",
      });
    }
  };

  // Namensdarstellung basierend auf den Datenschutz-Einstellungen
  const getDisplayName = (user?: UserProfile) => {
    if (!user) return "Anonymer Spieler";
    const vis = user.privacySettings?.leaderboardVisibility || "nickname";
    if (vis === "realName") return user.realName || user.nickname;
    if (vis === "both") return `${user.realName} (${user.nickname})`;
    return user.nickname || user.realName;
  };

  // 1. Berechnung "Übung des Monats" Highscore
  const currentMonthlyConfig = monthlyConfigs.find(
    (m) => m.month === selectedArchivedMonth && m.year === selectedArchivedYear
  );
  const monthlyExercise = exercises.find(
    (e) => e.id === currentMonthlyConfig?.exerciseId
  );

  const getMonthlyHighscores = () => {
    if (!currentMonthlyConfig || !monthlyExercise) return [];

    const scoresByUser: { [userId: string]: number } = {};

    testResults.forEach((res) => {
      const resExId = (res as any).exerciseId || res.testId;

      if (resExId === monthlyExercise.id) {
        const resDate = new Date(res.completedAt);
        if (
          resDate.getMonth() + 1 === currentMonthlyConfig.month &&
          resDate.getFullYear() === currentMonthlyConfig.year
        ) {
          const currentBest = scoresByUser[res.userId] || 0;
          if (res.totalPoints > currentBest) {
            scoresByUser[res.userId] = res.totalPoints;
          }
        }
      }
    });

    const leaderboard = Object.keys(scoresByUser).map((userId) => {
      const u = users.find((usr) => usr.uid === userId);
      return {
        user: u,
        score: scoresByUser[userId],
      };
    });

    return leaderboard.sort((a, b) => b.score - a.score);
  };

  // 2. Berechnung Performance League (Durchschnitt + Bonus/Malus)
  const calculatePerformanceScore = (
    userId: string,
    exerciseIds?: string[]
  ) => {
    if (!exerciseIds || exerciseIds.length === 0) return 0;

    let totalLeaguePoints = 0;

    exerciseIds.forEach((exId) => {
      const userExResults = testResults.filter(
        (r) =>
          r.userId === userId &&
          ((r as any).exerciseId === exId || r.testId === exId)
      );
      if (userExResults.length === 0) return;

      // Historischer Durchschnitt berechnen
      const totalPointsSum = userExResults.reduce(
        (s, r) => s + r.totalPoints,
        0
      );
      const avg = totalPointsSum / userExResults.length;

      // Letztes Ergebnis nehmen
      const latestResult = userExResults.sort(
        (a, b) =>
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      )[0];

      const diff = latestResult.totalPoints - avg;
      let multiplier = 1.0;

      if (diff <= -5) multiplier = 0.75;
      else if (diff === -4) multiplier = 0.85;
      else if (diff === -3) multiplier = 0.95;
      else if (diff >= 5 && diff <= 7) multiplier = 1.05;
      else if (diff >= 8 && diff <= 10) multiplier = 1.1;
      else if (diff >= 11 && diff <= 13) multiplier = 1.15;
      else if (diff >= 14 && diff <= 16) multiplier = 1.2;
      else if (diff >= 17) multiplier = 1.25;

      totalLeaguePoints += Math.round(latestResult.totalPoints * multiplier);
    });

    return totalLeaguePoints;
  };

  // 3. ELO / TTR Match eintragen
  const handleRecordMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !selectedOpponentId || !selectedMatchLeagueId) return;

    setMatchSubmitting(true);
    setError(null);

    try {
      const p1Id = userProfile.uid;
      const p2Id = selectedOpponentId;

      const p1RatingObj = ratings.find(
        (r) => r.userId === p1Id && r.leagueId === selectedMatchLeagueId
      );
      const p2RatingObj = ratings.find(
        (r) => r.userId === p2Id && r.leagueId === selectedMatchLeagueId
      );

      const p1RatingBefore = p1RatingObj ? p1RatingObj.rating : 1000;
      const p2RatingBefore = p2RatingObj ? p2RatingObj.rating : 1000;

      let p1Change = 0;
      let p2Change = 0;

      const p1Won = myScore > opponentScore;

      // TTR/ELO Regelwerk
      if (p1RatingBefore === p2RatingBefore) {
        p1Change = p1Won ? 50 : -50;
        p2Change = p1Won ? -50 : 50;
      } else if (p1RatingBefore < p2RatingBefore) {
        p1Change = p1Won ? 100 : -25;
        p2Change = p1Won ? -100 : 25;
      } else {
        p1Change = p1Won ? 25 : -100;
        p2Change = p1Won ? -25 : 100;
      }

      const p1RatingAfter = Math.max(0, p1RatingBefore + p1Change);
      const p2RatingAfter = Math.max(0, p2RatingBefore + p2Change);

      // Match Resultat speichern
      await addDoc(collection(db, "matchResults"), {
        leagueId: selectedMatchLeagueId,
        player1Id: p1Id,
        player2Id: p2Id,
        winnerId: p1Won ? p1Id : p2Id,
        scorePlayer1: myScore,
        scorePlayer2: opponentScore,
        p1RatingBefore,
        p2RatingBefore,
        p1RatingAfter,
        p2RatingAfter,
        playedAt: new Date().toISOString(),
      });

      // Ratings in Firestore aktualisieren
      const updateRating = async (
        userId: string,
        leagueId: string,
        newRating: number,
        ratingObj?: PlayerRating
      ) => {
        if (ratingObj?.id) {
          const ratingRef = doc(db, "playerRatings", ratingObj.id);
          await updateDoc(ratingRef, {
            rating: newRating,
            updatedAt: new Date().toISOString(),
          });
        } else {
          await addDoc(collection(db, "playerRatings"), {
            userId,
            leagueId,
            rating: newRating,
            updatedAt: new Date().toISOString(),
          });
        }
      };

      await updateRating(
        p1Id,
        selectedMatchLeagueId,
        p1RatingAfter,
        p1RatingObj
      );
      await updateRating(
        p2Id,
        selectedMatchLeagueId,
        p2RatingAfter,
        p2RatingObj
      );

      setIsMatchModalOpen(false);
      setSelectedOpponentId("");
      setMyScore(0);
      setOpponentScore(0);
      fetchData();
    } catch (err) {
      console.error(err);
      setError("Fehler beim Speichern des Spielergebnisses.");
    } finally {
      setMatchSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <CircularProgress />
      </div>
    );
  }

  const isCurrentMonthActive =
    selectedArchivedMonth === currentDate.getMonth() + 1 &&
    selectedArchivedYear === currentDate.getFullYear();

  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col gap-6">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <Typography
            variant="h4"
            component="h1"
            className="font-bold flex items-center gap-2"
            color="text.primary"
          >
            <EmojiEventsIcon fontSize="large" color="primary" /> Trainingsliga & Ranglisten
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Miss dich in Monats-Challenges, Performance-Ranglisten und 1v1-Duellen.
          </Typography>
        </div>
      </div>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper className="shadow-sm">
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab icon={<CalendarMonthIcon />} label="Übung des Monats" />
          <Tab icon={<EmojiEventsIcon />} label="Performance Leagues" />
          <Tab icon={<SportsKabaddiIcon />} label="Match Leagues (1v1)" />
        </Tabs>
      </Paper>

      {/* TAB 1: ÜBUNG DES MONATS */}
      {activeTab === 0 && (
        <div className="flex flex-col gap-6">
          <Paper className="p-6 shadow-md flex flex-col gap-4">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div>
                <Typography variant="h5" className="font-bold" color="text.primary">
                  Monats-Challenge:{" "}
                  {monthlyExercise ? monthlyExercise.title : "Keine Übung festgelegt"}
                </Typography>
                <Typography variant="body2" color="textSecondary" className="mt-1">
                  {currentMonthlyConfig?.description ||
                    "Spiele diese Übung beliebig oft. Nur dein bester Score fließt in die Rangliste ein."}
                </Typography>
              </div>

              {/* Archiv-Filter */}
              <div className="flex gap-2 items-center">
                <HistoryIcon color="action" />
                <FormControl size="small" className="w-28">
                  <InputLabel>Monat</InputLabel>
                  <Select
                    value={selectedArchivedMonth}
                    label="Monat"
                    onChange={(e) => setSelectedArchivedMonth(Number(e.target.value))}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <MenuItem key={m} value={m}>
                        Monat {m}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" className="w-28">
                  <InputLabel>Jahr</InputLabel>
                  <Select
                    value={selectedArchivedYear}
                    label="Jahr"
                    onChange={(e) => setSelectedArchivedYear(Number(e.target.value))}
                  >
                    {[2025, 2026, 2027].map((y) => (
                      <MenuItem key={y} value={y}>
                        {y}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>
            </div>

            {monthlyExercise && isCurrentMonthActive && (
              <Box className="mt-2">
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<PlayArrowIcon />}
                  onClick={() => setIsRecordModalOpen(true)}
                >
                  Ergebnis für Monatsübung eintragen
                </Button>
              </Box>
            )}

            {!isCurrentMonthActive && (
              <Alert severity="warning">
                Du betrachtest ein vergangenes Monats-Archiv. Ergebnisse für diesen Monat sind gesperrt.
              </Alert>
            )}

            <Divider className="my-2" />

            {/* Highscore Tabelle */}
            <Typography variant="h6" className="font-bold">
              Rangliste ({selectedArchivedMonth} / {selectedArchivedYear})
            </Typography>

            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell className="font-bold">Platz</TableCell>
                    <TableCell className="font-bold">Spieler</TableCell>
                    <TableCell align="right" className="font-bold">
                      Bestes Ergebnis
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getMonthlyHighscores().length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center" className="text-gray-500 py-6">
                        In diesem Monat wurden noch keine Ergebnisse eingetragen.
                      </TableCell>
                    </TableRow>
                  ) : (
                    getMonthlyHighscores().map((entry, idx) => (
                      <TableRow key={entry.user?.uid || idx} hover>
                        <TableCell className="font-bold">
                          {idx === 0
                            ? "🥇 1."
                            : idx === 1
                            ? "🥈 2."
                            : idx === 2
                            ? "🥉 3."
                            : `${idx + 1}.`}
                        </TableCell>
                        <TableCell 
                          className="font-semibold cursor-pointer hover:underline text-primary-main"
                          onClick={() => setSelectedProfileUser(entry.user || null)}
                        >
                          {getDisplayName(entry.user)}
                        </TableCell>
                        <TableCell
                          align="right"
                          className="font-bold color-primary text-base"
                        >
                          {entry.score} Punkte
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Modal zur Ergebniserfassung für die Monatsübung */}
          {monthlyExercise && (
            <RecordResultModal
              open={isRecordModalOpen}
              onClose={() => setIsRecordModalOpen(false)}
              exercise={monthlyExercise}
              allExercises={exercises}
              onResultRecorded={handleResultRecorded}
            />
          )}
        </div>
      )}

      {/* TAB 2: PERFORMANCE LEAGUES */}
      {activeTab === 1 && (
        <div className="flex flex-col gap-6">
          {leagues.filter((l) => l.type === "performance" && l.isActive).length === 0 ? (
            <Typography
              variant="body1"
              color="textSecondary"
              className="text-center py-8"
            >
              Aktuell sind keine Performance-Ligen aktiv.
            </Typography>
          ) : (
            leagues
              .filter((l) => l.type === "performance" && l.isActive)
              .map((league) => {
                const leaderboard = users
                  .map((u) => ({
                    user: u,
                    score: calculatePerformanceScore(u.uid, league.exerciseIds),
                  }))
                  .filter((item) => item.score > 0)
                  .sort((a, b) => b.score - a.score);

                return (
                  <Paper
                    key={league.id}
                    className="p-6 shadow-md flex flex-col gap-4"
                  >
                    <div>
                      <Typography variant="h5" className="font-bold" color="text.primary">
                        {league.title}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" className="mt-1">
                        {league.description}
                      </Typography>
                    </div>

                    <Divider />

                    <TableContainer component={Paper} variant="outlined">
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell className="font-bold">Platz</TableCell>
                            <TableCell className="font-bold">Spieler</TableCell>
                            <TableCell align="right" className="font-bold">
                              Gewertete Ligapunkte
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {leaderboard.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={3} align="center" className="text-gray-500 py-6">
                                Noch keine gewerteten Ergebnisse vorhanden.
                              </TableCell>
                            </TableRow>
                          ) : (
                            leaderboard.map((entry, idx) => (
                              <TableRow key={entry.user.uid} hover>
                                <TableCell className="font-bold">{idx + 1}.</TableCell>
                                <TableCell 
                                  className="font-semibold cursor-pointer hover:underline text-primary-main"
                                  onClick={() => setSelectedProfileUser(entry.user)}
                                >
                                  {getDisplayName(entry.user)}
                                </TableCell>
                                <TableCell
                                  align="right"
                                  className="font-bold color-primary"
                                >
                                  {entry.score} Pkt.
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                );
              })
          )}
        </div>
      )}

      {/* TAB 3: MATCH LEAGUES (1v1 Duelle) */}
      {activeTab === 2 && (
        <div className="flex flex-col gap-6">
          {leagues.filter((l) => l.type === "match" && l.isActive).length === 0 ? (
            <Typography
              variant="body1"
              color="textSecondary"
              className="text-center py-8"
            >
              Aktuell sind keine 1v1 Match-Ligen aktiv.
            </Typography>
          ) : (
            leagues
              .filter((l) => l.type === "match" && l.isActive)
              .map((league) => {
                const leagueRatings = ratings.filter((r) => r.leagueId === league.id);

                const leaderboard = users
                  .map((u) => {
                    const rObj = leagueRatings.find((r) => r.userId === u.uid);
                    return {
                      user: u,
                      rating: rObj ? rObj.rating : 1000,
                    };
                  })
                  .sort((a, b) => b.rating - a.rating);

                return (
                  <Paper
                    key={league.id}
                    className="p-6 shadow-md flex flex-col gap-4"
                  >
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <div>
                        <Typography variant="h5" className="font-bold" color="text.primary">
                          {league.title}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" className="mt-1">
                          {league.description}
                        </Typography>
                      </div>

                      <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<SportsKabaddiIcon />}
                        onClick={() => {
                          setSelectedMatchLeagueId(league.id);
                          setIsMatchModalOpen(true);
                        }}
                      >
                        1v1 Match Eintragen
                      </Button>
                    </div>

                    <Divider />

                    <TableContainer component={Paper} variant="outlined">
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell className="font-bold">Platz</TableCell>
                            <TableCell className="font-bold">Spieler</TableCell>
                            <TableCell align="right" className="font-bold">
                              DPR Rating
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {leaderboard.map((entry, idx) => (
                            <TableRow key={entry.user.uid} hover>
                              <TableCell className="font-bold">{idx + 1}.</TableCell>
                              <TableCell 
                                className="font-semibold cursor-pointer hover:underline text-primary-main"
                                onClick={() => setSelectedProfileUser(entry.user)}
                              >
                                {getDisplayName(entry.user)}
                              </TableCell>
                              <TableCell align="right" className="font-bold color-primary text-base">
                                <Chip
                                  label={`${entry.rating} Pkt.`}
                                  color="primary"
                                  variant="outlined"
                                  size="small"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                );
              })
          )}
        </div>
      )}

      {/* Modal: Öffentliches Spielerprofil */}
      <PublicProfileModal
        open={Boolean(selectedProfileUser)}
        onClose={() => setSelectedProfileUser(null)}
        user={selectedProfileUser}
      />

      {/* Modal: 1v1 Match eintragen */}
      <Dialog
        open={isMatchModalOpen}
        onClose={() => setIsMatchModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle className="font-bold">
          1v1 Trainings-Match Eintragen
        </DialogTitle>
        <form onSubmit={handleRecordMatch}>
          <DialogContent dividers className="flex flex-col gap-4">
            <FormControl fullWidth required>
              <InputLabel>Gegner auswählen</InputLabel>
              <Select
                value={selectedOpponentId}
                label="Gegner auswählen"
                onChange={(e) => setSelectedOpponentId(e.target.value)}
              >
                {users
                  .filter((u) => u.uid !== userProfile?.uid)
                  .map((u) => (
                    <MenuItem key={u.uid} value={u.uid}>
                      {getDisplayName(u)}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            <div className="grid grid-cols-2 gap-4">
              <Card variant="outlined" className="p-3 text-center">
                <Typography variant="caption" className="font-bold block mb-1">
                  Deine Legs/Sätze
                </Typography>
                <input
                  type="number"
                  min="0"
                  required
                  className="w-full text-center text-2xl font-bold p-2 border rounded dark:bg-gray-800"
                  value={myScore}
                  onChange={(e) => setMyScore(parseInt(e.target.value, 10) || 0)}
                />
              </Card>

              <Card variant="outlined" className="p-3 text-center">
                <Typography variant="caption" className="font-bold block mb-1">
                  Gegner Legs/Sätze
                </Typography>
                <input
                  type="number"
                  min="0"
                  required
                  className="w-full text-center text-2xl font-bold p-2 border rounded dark:bg-gray-800"
                  value={opponentScore}
                  onChange={(e) => setOpponentScore(parseInt(e.target.value, 10) || 0)}
                />
              </Card>
            </div>
          </DialogContent>

          <DialogActions className="p-4">
            <Button onClick={() => setIsMatchModalOpen(false)}>
              Abbrechen
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={matchSubmitting || !selectedOpponentId}
            >
              {matchSubmitting ? "Speichert..." : "Ergebnis Werten"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  );
};
import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import type { PerformanceTest, Exercise } from "../../types/exercise";
import type { UserProfile } from "../../types/user";
import { CreateTestModal } from "./CreateTestModal";
import { AssignTestModal } from "./AssignTestModal";
import { RecordResultModal } from "./RecordResultModal";
import {
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  LinearProgress,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SendIcon from "@mui/icons-material/Send";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

export const TestList: React.FC = () => {
  const { userProfile } = useAuth();
  const isCoachOrAdmin =
    userProfile?.roles.includes("admin") ||
    userProfile?.roles.includes("coach");

  const [activeTab, setActiveTab] = useState<number>(0); // 0 = Bibliothek, 1 = Zugewiesene Tests

  const [tests, setTests] = useState<PerformanceTest[]>([]);
  const [assignedTests, setAssignedTests] = useState<any[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [roster, setRoster] = useState<UserProfile[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter-States für Tab 1
  const [selectedPlayerFilter, setSelectedPlayerFilter] =
    useState<string>("all");
  const [showCompleted, setShowCompleted] = useState<boolean>(true);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [testToEdit, setTestToEdit] = useState<PerformanceTest | null>(null);
  const [testToAssign, setTestToAssign] = useState<PerformanceTest | null>(
    null,
  );
  const [testToRecord, setTestToRecord] = useState<PerformanceTest | null>(
    null,
  );

  // Modal für Fortschrittsansicht (Coach-Ansicht)
  const [selectedAssignedForView, setSelectedAssignedForView] = useState<
    any | null
  >(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [testSnap, exSnap, assignedSnap, relSnap, userSnap] =
        await Promise.all([
          getDocs(collection(db, "performanceTests")),
          getDocs(collection(db, "exercises")),
          getDocs(collection(db, "assignedPerformanceTests")),
          getDocs(collection(db, "coachPlayerRelations")),
          getDocs(collection(db, "users")),
        ]);

      const fetchedTests: PerformanceTest[] = [];
      testSnap.forEach((d) => {
        const { id, ...data } = d.data();
        fetchedTests.push({ id: d.id, ...data } as PerformanceTest);
      });

      const fetchedExercises: Exercise[] = [];
      exSnap.forEach((d) => {
        const { id, ...data } = d.data();
        fetchedExercises.push({ id: d.id, ...data } as Exercise);
      });

      const fetchedAssigned: any[] = [];
      assignedSnap.forEach((d) => {
        const { id, ...data } = d.data();
        if (data.coachId === userProfile?.uid) {
          fetchedAssigned.push({ id: d.id, ...data });
        }
      });

      // Kader ermitteln
      const playerIds: string[] = [];
      relSnap.forEach((d) => {
        if (d.data().coachId === userProfile?.uid) {
          playerIds.push(d.data().playerId);
        }
      });

      const fetchedUsers: UserProfile[] = [];
      userSnap.forEach((d) => {
        const data = d.data();
        const userId = d.id; // Dokumenten-ID aus Firestore

        if (
          playerIds.includes(userId) ||
          data.assignedCoachId === userProfile?.uid
        ) {
          fetchedUsers.push({
            ...data,
            uid: userId, // WICHTIG: Stellt sicher, dass 'uid' niemals undefined ist!
          } as UserProfile);
        }
      });

      setTests(fetchedTests);
      setExercises(fetchedExercises);
      setAssignedTests(fetchedAssigned);
      setRoster(fetchedUsers);
    } catch (err) {
      console.error(err);
      setError("Fehler beim Laden der Leistungstests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userProfile?.uid]);

  const handleDeleteTest = async (testId: string, title: string) => {
    if (
      !window.confirm(
        `Möchtest du den Leistungstest "${title}" wirklich löschen?`,
      )
    )
      return;

    try {
      await deleteDoc(doc(db, "performanceTests", testId));
      fetchData();
    } catch (err) {
      console.error(err);
      setError("Fehler beim Löschen des Tests.");
    }
  };

  const handleDeleteAssignedTest = async (
    assignedId: string,
    title: string,
  ) => {
    if (
      !window.confirm(
        `Möchtest du die Zuweisung für "${title}" wirklich löschen?`,
      )
    )
      return;

    try {
      await deleteDoc(doc(db, "assignedPerformanceTests", assignedId));
      fetchData();
    } catch (err) {
      console.error(err);
      setError("Fehler beim Löschen der Zuweisung.");
    }
  };

  const filteredAssignedTests = assignedTests.filter((t) => {
    if (selectedPlayerFilter !== "all" && t.playerId !== selectedPlayerFilter)
      return false;
    if (!showCompleted && t.status === "completed") return false;
    return true;
  });

// Hilfsfunktion zur Formatierung des Spielernamens
const getPlayerDisplayName = (player?: UserProfile, fallbackId?: string): string => {
  if (!player) return fallbackId || 'Unbekannter Spieler';

  const visibility = player.privacySettings?.leaderboardVisibility || 'nickname';
  const realName = player.realName?.trim();
  const nickname = player.nickname?.trim();

  if (visibility === 'realName' && realName) {
    return realName;
  }
  if (visibility === 'both' && realName && nickname) {
    return `${realName} (${nickname})`;
  }

  return nickname || realName || player.email || fallbackId || 'Spieler';
};

  // Hilfsfunktion zur Berechnung des Fortschritts
  const calculateProgress = (assigned: any) => {
    if (!assigned.exerciseResults || !assigned.exerciseIds) {
      return {
        completedCount: 0,
        total: assigned.exerciseIds?.length || 0,
        percent: 0,
      };
    }
    const total = assigned.exerciseIds.length;
    const completedCount = Object.keys(assigned.exerciseResults).length;
    const percent = total > 0 ? Math.round((completedCount / total) * 100) : 0;
    return { completedCount, total, percent };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col gap-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <Typography variant="h4" className="font-bold" color="text.primary">
            Leistungstests
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Stelle mehrstufige Leistungstests zusammen und weise sie deinen
            Spielern zu.
          </Typography>
        </div>

        {isCoachOrAdmin && activeTab === 0 && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => {
              setTestToEdit(null);
              setIsCreateModalOpen(true);
            }}
          >
            Neuen Leistungstest erstellen
          </Button>
        )}
      </div>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {isCoachOrAdmin && (
        <Paper className="shadow-sm">
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab label="Leistungstest-Bibliothek" />
            <Tab label={`Zugewiesene Tests (${assignedTests.length})`} />
          </Tabs>
        </Paper>
      )}

      {/* TAB 0: TEST-BIBLIOTHEK */}
      {activeTab === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tests.map((test) => (
            <Card
              key={test.id}
              className="shadow-md flex flex-col justify-between"
            >
              <CardContent>
                <div className="flex justify-between items-start mb-2">
                  <Typography
                    variant="h6"
                    className="font-bold"
                    color="text.primary"
                  >
                    {test.title}
                  </Typography>
                  {isCoachOrAdmin && (
                    <div className="flex gap-1">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => {
                          setTestToEdit(test);
                          setIsCreateModalOpen(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteTest(test.id, test.title)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </div>
                  )}
                </div>

                <Chip
                  label={`Typ: ${test.exerciseType.toUpperCase()}`}
                  size="small"
                  color="secondary"
                  className="mb-3"
                />

                <Typography
                  variant="body2"
                  color="textSecondary"
                  className="mb-3"
                >
                  {test.description || "Keine Beschreibung vorhanden."}
                </Typography>

                <Typography variant="caption" className="font-bold block mb-1">
                  Enthaltene Übungen ({test.exerciseIds.length}):
                </Typography>
                <div className="flex flex-col gap-1">
                  {test.exerciseIds.map((exId, idx) => {
                    const ex = exercises.find((e) => e.id === exId);
                    return (
                      <Paper
                        key={`${exId}-${idx}`}
                        variant="outlined"
                        className="px-2 py-1 text-xs"
                      >
                        {idx + 1}. {ex ? ex.title : "Übung"}
                      </Paper>
                    );
                  })}
                </div>
              </CardContent>

              <CardActions className="p-4 pt-0 flex gap-2">
                <Button
                  variant="outlined"
                  color="primary"
                  fullWidth
                  startIcon={<PlayArrowIcon />}
                  onClick={() => setTestToRecord(test)}
                >
                  Absolvieren
                </Button>
                {isCoachOrAdmin && (
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    startIcon={<SendIcon />}
                    onClick={() => setTestToAssign(test)}
                  >
                    Zuweisen
                  </Button>
                )}
              </CardActions>
            </Card>
          ))}
        </div>
      )}

      {/* TAB 1: ZUGEWIESENE TESTS */}
      {activeTab === 1 && isCoachOrAdmin && (
        <div className="flex flex-col gap-4">
          <Paper className="p-4 flex flex-wrap justify-between items-center gap-4">
            <FormControl size="small" className="min-w-[200px]">
              <InputLabel>Nach Spieler filtern</InputLabel>
              <Select
                value={selectedPlayerFilter}
                label="Nach Spieler filtern"
                onChange={(e) => setSelectedPlayerFilter(e.target.value)}
              >
                <MenuItem value="all">Alle Spieler</MenuItem>
                {roster.map((p) => (
                  <MenuItem key={p.uid} value={p.uid}>
                    {getPlayerDisplayName(p)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={showCompleted}
                  onChange={(e) => setShowCompleted(e.target.checked)}
                  color="primary"
                />
              }
              label="Abgeschlossene Tests anzeigen"
            />
          </Paper>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssignedTests.map((assigned) => {
              const player = roster.find((p) => p.uid === assigned.playerId);
              const { completedCount, total, percent } =
                calculateProgress(assigned);

              return (
                <Card
                  key={assigned.id}
                  className="shadow-md flex flex-col justify-between"
                >
                  <CardContent>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <Typography variant="h6" className="font-bold">
                          {assigned.title}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="textSecondary"
                          className="block"
                        >
                          Spieler: {getPlayerDisplayName(player, assigned.playerId)}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="textSecondary"
                          className="block"
                        >
                          KW {assigned.calendarWeek} / {assigned.year}
                        </Typography>
                      </div>

                      <IconButton
                        size="small"
                        color="error"
                        onClick={() =>
                          handleDeleteAssignedTest(assigned.id, assigned.title)
                        }
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </div>

                    <div className="flex justify-between items-center my-2">
                      <Chip
                        label={
                          assigned.status === "completed" ? "Erledigt" : "Offen"
                        }
                        color={
                          assigned.status === "completed"
                            ? "success"
                            : "warning"
                        }
                        size="small"
                      />
                      <Typography variant="caption" className="font-semibold">
                        {completedCount} / {total} Übungen
                      </Typography>
                    </div>

                    <LinearProgress
                      variant="determinate"
                      value={percent}
                      className="rounded mb-3"
                    />

                    {assigned.coachNote && (
                      <Typography
                        variant="body2"
                        color="textSecondary"
                        className="italic mt-2"
                      >
                        Notiz: "{assigned.coachNote}"
                      </Typography>
                    )}
                  </CardContent>

                  <CardActions className="p-4 pt-0">
                    <Button
                      variant="outlined"
                      color="primary"
                      fullWidth
                      startIcon={<VisibilityIcon />}
                      onClick={() => setSelectedAssignedForView(assigned)}
                    >
                      Fortschritt ansehen
                    </Button>
                  </CardActions>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal: Fortschritt & Ergebnisse des zugewiesenen Tests anzeigen */}
      <Dialog
        open={Boolean(selectedAssignedForView)}
        onClose={() => setSelectedAssignedForView(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedAssignedForView &&
          (() => {
            const player = roster.find(
              (p) => p.uid === selectedAssignedForView.playerId,
            );
            const { completedCount, total, percent } = calculateProgress(
              selectedAssignedForView,
            );

            return (
              <>
                <DialogTitle className="font-bold flex justify-between items-center">
                  <span>Test-Fortschritt: {selectedAssignedForView.title}</span>
                  <Chip
                    label={
                      selectedAssignedForView.status === "completed"
                        ? "Erledigt"
                        : "In Bearbeitung"
                    }
                    color={
                      selectedAssignedForView.status === "completed"
                        ? "success"
                        : "warning"
                    }
                    size="small"
                  />
                </DialogTitle>

                <DialogContent dividers className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <Typography variant="subtitle2">
                      <strong>Spieler:</strong>{" "}
                      {player
                        ? `${player.realName} (${player.nickname})`
                        : selectedAssignedForView.playerId}
                    </Typography>
                    <Typography variant="subtitle2">
                      <strong>Zeitraum:</strong> KW{" "}
                      {selectedAssignedForView.calendarWeek} /{" "}
                      {selectedAssignedForView.year}
                    </Typography>
                  </div>

                  {selectedAssignedForView.coachNote && (
                    <Typography
                      variant="body2"
                      className="italic bg-gray-50 dark:bg-gray-800 p-2 rounded"
                    >
                      Trainer-Notiz: "{selectedAssignedForView.coachNote}"
                    </Typography>
                  )}

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <Typography variant="caption" className="font-bold">
                        Gesamtfortschritt ({completedCount} von {total} Übungen
                        absolviert)
                      </Typography>
                      <Typography variant="caption" className="font-bold">
                        {percent}%
                      </Typography>
                    </div>
                    <LinearProgress
                      variant="determinate"
                      value={percent}
                      className="h-2 rounded"
                    />
                  </div>

                  <Divider />

                  <Typography variant="h6" className="font-bold">
                    Übungsdetails & Ergebnisse
                  </Typography>

                  <div className="flex flex-col gap-3">
                    {selectedAssignedForView.exerciseIds?.map(
                      (exId: string, idx: number) => {
                        const ex = exercises.find((e) => e.id === exId);
                        const result =
                          selectedAssignedForView.exerciseResults?.[exId];

                        return (
                          <Paper
                            key={`${exId}-${idx}`}
                            variant="outlined"
                            className="p-3"
                          >
                            <div className="flex justify-between items-start gap-2 mb-1">
                              <Typography
                                variant="subtitle2"
                                className="font-bold"
                              >
                                {idx + 1}. {ex ? ex.title : "Übung"}
                              </Typography>
                              {result ? (
                                <Chip
                                  icon={<CheckCircleIcon fontSize="small" />}
                                  label="Absolviert"
                                  color="success"
                                  size="small"
                                />
                              ) : (
                                <Chip
                                  label="Offen"
                                  variant="outlined"
                                  size="small"
                                />
                              )}
                            </div>

                            {result ? (
                              <div className="mt-2 text-sm bg-green-50 dark:bg-gray-800/60 p-2 rounded">
                                <Typography
                                  variant="body2"
                                  className="font-bold color-primary"
                                >
                                  Punkte:{" "}
                                  {result.totalPoints ?? result.points ?? "-"}
                                </Typography>
                                {result.completedAt && (
                                  <Typography
                                    variant="caption"
                                    color="textSecondary"
                                    className="block"
                                  >
                                    Absolviert am:{" "}
                                    {new Date(
                                      result.completedAt,
                                    ).toLocaleString("de-DE")}
                                  </Typography>
                                )}
                                {result.note && (
                                  <Typography
                                    variant="caption"
                                    className="italic block mt-1"
                                  >
                                    Spieler-Kommentar: "{result.note}"
                                  </Typography>
                                )}
                              </div>
                            ) : (
                              <Typography
                                variant="caption"
                                color="textSecondary"
                                className="italic"
                              >
                                Noch kein Ergebnis von diesem Spieler
                                eingetragen.
                              </Typography>
                            )}
                          </Paper>
                        );
                      },
                    )}
                  </div>
                </DialogContent>

                <DialogActions className="p-4">
                  <Button
                    onClick={() => setSelectedAssignedForView(null)}
                    variant="contained"
                  >
                    Schließen
                  </Button>
                </DialogActions>
              </>
            );
          })()}
      </Dialog>

      {/* Modals */}
      {isCreateModalOpen && (
        <CreateTestModal
          open={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          testToEdit={testToEdit}
          onTestCreated={fetchData}
        />
      )}

      {testToAssign && (
        <AssignTestModal
          open={!!testToAssign}
          onClose={() => setTestToAssign(null)}
          testToAssign={testToAssign}
          onAssigned={fetchData}
        />
      )}

      {testToRecord && (
        <RecordResultModal
          open={!!testToRecord}
          onClose={() => setTestToRecord(null)}
          test={testToRecord}
          allExercises={exercises}
          onResultRecorded={fetchData}
        />
      )}
    </div>
  );
};

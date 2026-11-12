import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc, query, where, writeBatch } from "firebase/firestore";
import { db } from "../../firebase/config";
import type { UserProfile, UserRole } from "../../types/user";
import { TagManagement } from "./TagManagement";
import { FeedbackManagement } from "./FeedbackManagement";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  Typography,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  useTheme,
  useMediaQuery,
  Tabs,
  Tab,
  Box,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { AchievementManagement } from "./AchievmentManagement";
import { TrainerLicenseManagement } from "./TrainerLicenseManagement";

export const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [activeAdminTab, setActiveAdminTab] = useState<number>(0);

  // State für Lösch-Dialog
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const fetchedUsers: UserProfile[] = [];
      querySnapshot.forEach((docSnap) => {
        fetchedUsers.push(docSnap.data() as UserProfile);
      });
      setUsers(fetchedUsers);
    } catch (err: any) {
      console.error(err);
      setError("Fehler beim Laden der Benutzerliste.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleApproval = async (user: UserProfile) => {
    const updatedStatus = !user.isApproved;
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        isApproved: updatedStatus,
        updatedAt: new Date().toISOString(),
      });

      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.uid === user.uid ? { ...u, isApproved: updatedStatus } : u,
        ),
      );

      setActionSuccess(
        `Benutzer ${user.realName} wurde ${
          updatedStatus ? "freigeschaltet" : "gesperrt"
        }.`,
      );
    } catch (err: any) {
      console.error(err);
      setError("Fehler beim Aktualisieren des Freigabe-Status.");
    }
  };

  const handleToggleCoachRole = async (user: UserProfile) => {
    let updatedRoles: UserRole[];
    const isCoach = user.roles.includes("coach");

    if (isCoach) {
      updatedRoles = user.roles.filter((role) => role !== "coach");
    } else {
      updatedRoles = [...user.roles, "coach"];
    }

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        roles: updatedRoles,
        updatedAt: new Date().toISOString(),
      });

      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.uid === user.uid ? { ...u, roles: updatedRoles } : u,
        ),
      );

      setActionSuccess(
        `Rollen für ${user.realName} aktualisiert: ${updatedRoles.join(", ")}`,
      );
    } catch (err: any) {
      console.error(err);
      setError("Fehler beim Aktualisieren der Trainer-Rolle.");
    }
  };

  // Benutzer löschen (exklusive 1v1 Match-League Spiele via Batch-Cleanup)
  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    setError(null);

    try {
      const uid = userToDelete.uid;
      const batch = writeBatch(db);

      // 1. Benutzer-Hauptdokument löschen
      const userRef = doc(db, "users", uid);
      batch.delete(userRef);

      // 2. Zugehörige Sammlungen bereinigen (Trainingsdaten, Pläne, Fortschritte, Achievements etc.)
      const collectionsToClean = [
        "trainingSessions", 
        "trainingPlans", 
        "userProgress", 
        "achievements",
        "userMonthlyChallenges"
      ];
      
      for (const colName of collectionsToClean) {
        const q = query(collection(db, colName), where("userId", "==", uid));
        const snap = await getDocs(q);
        snap.forEach((d) => {
          batch.delete(d.ref);
        });
      }

      // HINWEIS: Gespielte Spiele in der 1v1 Match-League (z.B. matchResults / matchLeagueGames) 
      // werden bewusst NICHT gelöscht, damit Statistiken/Ligen intakt bleiben!

      await batch.commit();

      setUsers((prev) => prev.filter((u) => u.uid !== uid));
      setActionSuccess(`Benutzer ${userToDelete.realName || userToDelete.nickname} wurde erfolgreich gelöscht (Match-League-Daten wurden beibehalten).`);
      setDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (err: any) {
      console.error("Fehler beim Löschen des Benutzers:", err);
      setError("Fehler beim Löschen des Benutzers (fehlende Berechtigungen?).");
    } finally {
      setIsDeleting(false);
    }
  };

  // Trainer-Lizenz Status ändern (approved / rejected / pending)
  const handleUpdateLicenseStatus = async (
    userId: string,
    licenseId: string,
    newStatus: "approved" | "rejected" | "pending",
  ) => {
    const targetUser = users.find((u) => u.uid === userId);
    if (!targetUser || !targetUser.trainerLicenses) return;

    try {
      const updatedLicenses = targetUser.trainerLicenses.map((l) =>
        l.id === licenseId ? { ...l, status: newStatus } : l,
      );

      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        trainerLicenses: updatedLicenses,
        updatedAt: new Date().toISOString(),
      });

      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.uid === userId ? { ...u, trainerLicenses: updatedLicenses } : u,
        ),
      );

      const statusText =
        newStatus === "approved"
          ? "verifiziert"
          : newStatus === "rejected"
            ? "abgelehnt"
            : "auf ausstehend gesetzt";

      setActionSuccess(`Trainer-Lizenz wurde erfolgreich ${statusText}.`);
    } catch (err: any) {
      console.error(err);
      setError("Fehler beim Aktualisieren des Lizenz-Status.");
    }
  };

  const allUserLicenses = users.flatMap((u) =>
    (u.trainerLicenses || []).map((lic) => ({
      ...lic,
      userId: u.uid,
      userName: u.realName || u.nickname,
      userEmail: u.email,
    })),
  );

  const pendingLicensesCount = allUserLicenses.filter(
    (l) => l.status === "pending",
  ).length;

  if (loading) {
    return (
      <Box className="flex justify-center items-center p-8">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="p-3 sm:p-6 max-w-6xl mx-auto flex flex-col gap-4 sm:gap-6">
      <Typography
        variant={isMobile ? "h5" : "h4"}
        component="h1"
        className="font-bold"
        color="text.primary"
      >
        Admin-Dashboard
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {actionSuccess && (
        <Alert severity="success" onClose={() => setActionSuccess(null)}>
          {actionSuccess}
        </Alert>
      )}

      {/* Admin Unter-Navigation */}
      <Paper className="shadow-sm" sx={{ bgcolor: "background.paper" }}>
        <Tabs
          value={activeAdminTab}
          onChange={(_, val) => setActiveAdminTab(val)}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          <Tab label="Benutzerverwaltung" className="text-xs sm:text-sm shrink-0 whitespace-nowrap" />
          <Tab
            label={
              <Box className="flex items-center gap-1">
                <span>Trainer-Lizenzen</span>
                {pendingLicensesCount > 0 && (
                  <Chip
                    label={pendingLicensesCount}
                    size="small"
                    color="warning"
                    sx={{ height: 20, fontSize: "0.75rem" }}
                  />
                )}
              </Box>
            }
            className="text-xs sm:text-sm shrink-0 whitespace-nowrap"
          />
          <Tab label="Tag-Verwaltung" className="text-xs sm:text-sm shrink-0 whitespace-nowrap" />
          <Tab label="Feedback & Ideen" className="text-xs sm:text-sm shrink-0 whitespace-nowrap" />
          <Tab label="Achievements & Erfolge" className="text-xs sm:text-sm shrink-0 whitespace-nowrap" />
        </Tabs>
      </Paper>

      {/* Tab 0: Benutzerverwaltung */}
      {activeAdminTab === 0 && (
        <Box className="flex flex-col gap-4">
          <Typography variant="h6" className="font-bold text-base sm:text-lg" color="text.primary">
            Benutzerverwaltung ({users.length})
          </Typography>

          {isMobile ? (
            <div className="flex flex-col gap-3">
              {users.map((user) => {
                const isCoach = user.roles.includes("coach");
                const isAdmin = user.roles.includes("admin");

                return (
                  <Paper
                    key={user.uid}
                    variant="outlined"
                    sx={{ bgcolor: "background.paper", borderColor: "divider" }}
                    className="p-4 shadow-sm flex flex-col gap-3 rounded-lg"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <Typography variant="subtitle1" className="font-bold leading-tight" color="text.primary">
                          {user.realName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          @{user.nickname} • {user.email}
                        </Typography>
                      </div>
                      <Chip
                        label={user.isApproved ? "Frei" : "Sperre"}
                        color={user.isApproved ? "success" : "warning"}
                        size="small"
                      />
                    </div>

                    <div className="flex items-center gap-1 flex-wrap">
                      <Typography variant="caption" color="text.secondary" className="mr-1">
                        Rollen:
                      </Typography>
                      {user.roles.map((role) => (
                        <Chip
                          key={role}
                          label={role}
                          size="small"
                          color={role === "admin" ? "error" : role === "coach" ? "secondary" : "default"}
                        />
                      ))}
                    </div>

                    <Divider className="my-1" />

                    <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Button
                          variant={user.isApproved ? "outlined" : "contained"}
                          color={user.isApproved ? "error" : "success"}
                          size="small"
                          onClick={() => handleToggleApproval(user)}
                          className="text-xs"
                        >
                          {user.isApproved ? "Sperren" : "Freischalten"}
                        </Button>

                        {!isAdmin && (
                          <FormControlLabel
                            control={
                              <Switch
                                checked={isCoach}
                                onChange={() => handleToggleCoachRole(user)}
                                color="secondary"
                                size="small"
                              />
                            }
                            label={<Typography variant="caption" className="font-semibold" color="text.primary">Trainer</Typography>}
                            className="m-0"
                          />
                        )}
                      </div>

                      <IconButton
                        color="error"
                        size="small"
                        onClick={() => {
                          setUserToDelete(user);
                          setDeleteModalOpen(true);
                        }}
                        title="Benutzer löschen"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </div>
                  </Paper>
                );
              })}
            </div>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ bgcolor: "background.paper", borderColor: "divider" }}>
              <Table>
                <TableHead sx={{ bgcolor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)" }}>
                  <TableRow>
                    <TableCell><strong>Klarname</strong></TableCell>
                    <TableCell><strong>Nickname</strong></TableCell>
                    <TableCell><strong>E-Mail</strong></TableCell>
                    <TableCell><strong>Rollen</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell align="center"><strong>Aktionen</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => {
                    const isCoach = user.roles.includes("coach");
                    const isAdmin = user.roles.includes("admin");

                    return (
                      <TableRow key={user.uid} hover>
                        <TableCell>{user.realName}</TableCell>
                        <TableCell>{user.nickname}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {user.roles.map((role) => (
                              <Chip
                                key={role}
                                label={role}
                                size="small"
                                color={role === "admin" ? "error" : role === "coach" ? "secondary" : "default"}
                              />
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={user.isApproved ? "Freigeschaltet" : "Ausstehend"}
                            color={user.isApproved ? "success" : "warning"}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <div className="flex justify-center items-center gap-3">
                            <Button
                              variant={user.isApproved ? "outlined" : "contained"}
                              color={user.isApproved ? "error" : "success"}
                              size="small"
                              onClick={() => handleToggleApproval(user)}
                            >
                              {user.isApproved ? "Sperren" : "Freischalten"}
                            </Button>

                            {!isAdmin && (
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={isCoach}
                                    onChange={() => handleToggleCoachRole(user)}
                                    color="secondary"
                                    size="small"
                                  />
                                }
                                label="Trainer"
                              />
                            )}

                            <IconButton
                              color="error"
                              size="small"
                              onClick={() => {
                                setUserToDelete(user);
                                setDeleteModalOpen(true);
                              }}
                              title="Benutzer löschen"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* Tab 1: Trainer-Lizenzen */}
      {activeAdminTab === 1 && <TrainerLicenseManagement licenses={allUserLicenses} onUpdateStatus={handleUpdateLicenseStatus} />}
      {activeAdminTab === 2 && <TagManagement />}
      {activeAdminTab === 3 && <FeedbackManagement />}
      {activeAdminTab === 4 && <AchievementManagement />}

      {/* Sicherheitsdialog zum Löschen eines Benutzers */}
      <Dialog open={deleteModalOpen} onClose={() => !isDeleting && setDeleteModalOpen(false)}>
        <DialogTitle className="font-bold text-error">Benutzer wirklich löschen?</DialogTitle>
        <DialogContent>
          <DialogContentText className="space-y-2">
            <span>
              Möchtest du den Benutzer <strong>{userToDelete?.realName || userToDelete?.nickname}</strong> ({userToDelete?.email}) wirklich unwiderruflich löschen?
            </span>
            <span className="block text-xs text-red-500 font-semibold pt-1">
              Dabei werden alle Trainingsdaten, Pläne und Fortschritte gelöscht. Bereits gespielte Spiele in der 1v1 Match-League bleiben aus statistischen Gründen erhalten.
            </span>
          </DialogContentText>
        </DialogContent>
        <DialogActions className="p-4 pt-0">
          <Button variant="outlined" onClick={() => setDeleteModalOpen(false)} disabled={isDeleting}>
            Abbrechen
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDeleteUser}
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
          >
            {isDeleting ? "Wird gelöscht..." : "Benutzer löschen"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
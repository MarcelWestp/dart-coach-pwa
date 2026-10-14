import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
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
  Card,
  CardContent,
} from "@mui/material";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import PendingIcon from "@mui/icons-material/HourglassEmpty";
import CancelIcon from "@mui/icons-material/Cancel";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { AchievementManagement } from "./AchievmentManagement";

export const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [activeAdminTab, setActiveAdminTab] = useState<number>(0);

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

  // Alle eingereichten Lizenzen mit Benutzer-Informationen filtern
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

      {/* Admin Unter-Navigation (Mobil wischbar / scrollbar) */}
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
          <Tab
            label="Benutzerverwaltung"
            className="text-xs sm:text-sm shrink-0 whitespace-nowrap"
          />
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
          <Tab
            label="Tag-Verwaltung"
            className="text-xs sm:text-sm shrink-0 whitespace-nowrap"
          />
          <Tab
            label="Feedback & Ideen"
            className="text-xs sm:text-sm shrink-0 whitespace-nowrap"
          />
          <Tab
            label="Achievements & Erfolge"
            className="text-xs sm:text-sm shrink-0 whitespace-nowrap"
          />
        </Tabs>
      </Paper>

      {/* Tab 0: Benutzerverwaltung */}
      {activeAdminTab === 0 && (
        <Box className="flex flex-col gap-4">
          <Typography
            variant="h6"
            className="font-bold text-base sm:text-lg"
            color="text.primary"
          >
            Benutzerverwaltung ({users.length})
          </Typography>

          {/* MOBIL-ANSICHT: Karten-Layout für Smartphones */}
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
                        <Typography
                          variant="subtitle1"
                          className="font-bold leading-tight"
                          color="text.primary"
                        >
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
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        className="mr-1"
                      >
                        Rollen:
                      </Typography>
                      {user.roles.map((role) => (
                        <Chip
                          key={role}
                          label={role}
                          size="small"
                          color={
                            role === "admin"
                              ? "error"
                              : role === "coach"
                                ? "secondary"
                                : "default"
                          }
                        />
                      ))}
                    </div>

                    <Divider className="my-1" />

                    <div className="flex items-center justify-between gap-2 pt-1">
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
                          label={
                            <Typography
                              variant="caption"
                              className="font-semibold"
                              color="text.primary"
                            >
                              Trainer
                            </Typography>
                          }
                          className="m-0"
                        />
                      )}
                    </div>
                  </Paper>
                );
              })}
            </div>
          ) : (
            /* DESKTOP-ANSICHT: Tabelle */
            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{ bgcolor: "background.paper", borderColor: "divider" }}
            >
              <Table>
                <TableHead
                  sx={{
                    bgcolor:
                      theme.palette.mode === "dark"
                        ? "rgba(255, 255, 255, 0.05)"
                        : "rgba(0, 0, 0, 0.04)",
                  }}
                >
                  <TableRow>
                    <TableCell>
                      <strong>Klarname</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Nickname</strong>
                    </TableCell>
                    <TableCell>
                      <strong>E-Mail</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Rollen</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Status</strong>
                    </TableCell>
                    <TableCell align="center">
                      <strong>Aktionen</strong>
                    </TableCell>
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
                                color={
                                  role === "admin"
                                    ? "error"
                                    : role === "coach"
                                      ? "secondary"
                                      : "default"
                                }
                              />
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={
                              user.isApproved ? "Freigeschaltet" : "Ausstehend"
                            }
                            color={user.isApproved ? "success" : "warning"}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <div className="flex justify-center items-center gap-4">
                            <Button
                              variant={
                                user.isApproved ? "outlined" : "contained"
                              }
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

      {/* Tab 1: Trainer-Lizenzen Freigabe */}
      {activeAdminTab === 1 && (
        <Box className="flex flex-col gap-4">
          <Typography
            variant="h6"
            className="font-bold text-base sm:text-lg"
            color="text.primary"
          >
            Trainer-Lizenzen Verifikation ({allUserLicenses.length})
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Prüfe die hochgeladenen Zertifikate der Trainer und schalte sie für
            das öffentliche Spielerprofil frei.
          </Typography>

          {allUserLicenses.length === 0 ? (
            <Paper
              variant="outlined"
              sx={{
                bgcolor: "background.paper",
                borderColor: "divider",
                p: 4,
                textAlign: "center",
              }}
            >
              <Typography
                variant="body2"
                color="text.secondary"
                className="italic"
              >
                Es wurden bisher keine Trainer-Lizenzen hochgeladen.
              </Typography>
            </Paper>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {allUserLicenses.map((license) => (
                <Card
                  key={license.id}
                  variant="outlined"
                  sx={{ bgcolor: "background.paper", borderColor: "divider" }}
                >
                  <CardContent className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <Box className="space-y-1">
                      <Box className="flex items-center gap-2 flex-wrap">
                        <Typography
                          variant="subtitle1"
                          className="font-bold"
                          color="text.primary"
                        >
                          {license.title}
                        </Typography>

                        {license.status === "approved" && (
                          <Chip
                            icon={<VerifiedUserIcon fontSize="small" />}
                            label="Verifiziert"
                            color="success"
                            size="small"
                          />
                        )}
                        {license.status === "pending" && (
                          <Chip
                            icon={<PendingIcon fontSize="small" />}
                            label="Prüfung ausstehend"
                            color="warning"
                            size="small"
                          />
                        )}
                        {license.status === "rejected" && (
                          <Chip
                            icon={<CancelIcon fontSize="small" />}
                            label="Abgelehnt"
                            color="error"
                            size="small"
                          />
                        )}
                      </Box>

                      <Typography variant="body2" color="text.secondary">
                        Trainer: <strong>{license.userName}</strong> (
                        {license.userEmail})
                      </Typography>

                      <Typography
                        variant="caption"
                        color="text.secondary"
                        className="block"
                      >
                        Ausgestellt von: <strong>{license.issuer}</strong>
                        {license.validUntil && (
                          <>
                            {" "}
                            • Gültig bis:{" "}
                            {new Date(license.validUntil).toLocaleDateString(
                              "de-DE",
                            )}
                          </>
                        )}
                      </Typography>
                    </Box>

                    <Box className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={() => window.open(license.fileUrl, "_blank")}
                      >
                        Dokument Ansehen
                      </Button>

                      {license.status !== "approved" && (
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          startIcon={<CheckCircleIcon />}
                          onClick={() =>
                            handleUpdateLicenseStatus(
                              license.userId,
                              license.id,
                              "approved",
                            )
                          }
                        >
                          Verifizieren
                        </Button>
                      )}

                      {license.status !== "rejected" && (
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          startIcon={<CancelIcon />}
                          onClick={() =>
                            handleUpdateLicenseStatus(
                              license.userId,
                              license.id,
                              "rejected",
                            )
                          }
                        >
                          Ablehnen
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </Box>
      )}

      {/* Tab 2: Tag-Verwaltung */}
      {activeAdminTab === 2 && <TagManagement />}

      {/* Tab 3: Feedback & Ideen */}
      {activeAdminTab === 3 && <FeedbackManagement />}

      {/* Tab 4: Achievements & Erfolge */}
      {activeAdminTab === 4 && <AchievementManagement />}
    </Box>
  );
};

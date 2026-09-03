import React, { useEffect, useState } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { UserProfile, UserRole } from '../../types/user';
import { TagManagement } from './TagManagement';
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
  useTheme
} from '@mui/material';

export const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const theme = useTheme();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const fetchedUsers: UserProfile[] = [];
      querySnapshot.forEach((docSnap) => {
        fetchedUsers.push(docSnap.data() as UserProfile);
      });
      setUsers(fetchedUsers);
    } catch (err: any) {
      console.error(err);
      setError('Fehler beim Laden der Benutzerliste.');
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
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        isApproved: updatedStatus,
        updatedAt: new Date().toISOString(),
      });

      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.uid === user.uid ? { ...u, isApproved: updatedStatus } : u
        )
      );

      setActionSuccess(
        `Benutzer ${user.realName} wurde ${updatedStatus ? 'freigeschaltet' : 'gesperrt'}.`
      );
    } catch (err: any) {
      console.error(err);
      setError('Fehler beim Aktualisieren des Freigabe-Status.');
    }
  };

  const handleToggleCoachRole = async (user: UserProfile) => {
    let updatedRoles: UserRole[];
    const isCoach = user.roles.includes('coach');

    if (isCoach) {
      updatedRoles = user.roles.filter((role) => role !== 'coach');
    } else {
      updatedRoles = [...user.roles, 'coach'];
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        roles: updatedRoles,
        updatedAt: new Date().toISOString(),
      });

      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.uid === user.uid ? { ...u, roles: updatedRoles } : u
        )
      );

      setActionSuccess(
        `Rollen für ${user.realName} aktualisiert: ${updatedRoles.join(', ')}`
      );
    } catch (err: any) {
      console.error(err);
      setError('Fehler beim Aktualisieren der Trainer-Rolle.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Typography variant="h4" component="h1" className="mb-6 font-bold" color="text.primary">
        Admin-Dashboard
      </Typography>

      {error && (
        <Alert severity="error" className="mb-4" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {actionSuccess && (
        <Alert severity="success" className="mb-4" onClose={() => setActionSuccess(null)}>
          {actionSuccess}
        </Alert>
      )}

      {/* Tag-Verwaltung für Übungen */}
      <TagManagement />

      {/* Benutzerverwaltung Header */}
      <Typography variant="h6" className="font-bold my-4" color="text.primary">
        Benutzerverwaltung
      </Typography>

      <TableContainer component={Paper} className="shadow-lg">
        <Table>
          <TableHead sx={{ bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)' }}>
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
              const isCoach = user.roles.includes('coach');
              const isAdmin = user.roles.includes('admin');

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
                          color={role === 'admin' ? 'error' : role === 'coach' ? 'secondary' : 'default'} 
                        />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={user.isApproved ? 'Freigeschaltet' : 'Ausstehend'} 
                      color={user.isApproved ? 'success' : 'warning'} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell align="center">
                    <div className="flex justify-center items-center gap-4">
                      <Button
                        variant={user.isApproved ? 'outlined' : 'contained'}
                        color={user.isApproved ? 'error' : 'success'}
                        size="small"
                        onClick={() => handleToggleApproval(user)}
                      >
                        {user.isApproved ? 'Sperren' : 'Freischalten'}
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
    </div>
  );
};
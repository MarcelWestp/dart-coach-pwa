import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Avatar, 
  Chip, 
  Grid,
  Card,
  CardContent,
  TextField,
  InputAdornment
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import GroupsIcon from '@mui/icons-material/Groups';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import SearchIcon from '@mui/icons-material/Search';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { UserProfile } from '../../types/user';
import type { PlayerGroup } from '../../types/group';
import { PublicProfileModal } from '../profile/PublicProfileModal';

interface CommunityViewProps {
  initialView?: 'players' | 'teams';
}

export const CommunityView: React.FC<CommunityViewProps> = ({ initialView = 'players' }) => {
  const [viewMode, setViewMode] = useState<'players' | 'teams'>(initialView);
  const [players, setPlayers] = useState<UserProfile[]>([]);
  const [groups, setGroups] = useState<PlayerGroup[]>([]);
  const [selectedProfileUser, setSelectedProfileUser] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    setViewMode(initialView);
  }, [initialView]);

  useEffect(() => {
    const fetchCommunityData = async () => {
      try {
        const [usersSnap, groupsSnap] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'playerGroups'))
        ]);

        const fetchedUsers: UserProfile[] = [];
        usersSnap.forEach((docSnap) => {
          const data = docSnap.data();
          fetchedUsers.push({ ...data, uid: docSnap.id } as UserProfile);
        });
        setPlayers(fetchedUsers);

        const fetchedGroups: PlayerGroup[] = [];
        groupsSnap.forEach((docSnap) => {
          const data = docSnap.data();
          fetchedGroups.push({ id: docSnap.id, ...data } as PlayerGroup);
        });
        setGroups(fetchedGroups);
      } catch (err) {
        console.error('Fehler beim Laden der Community-Daten:', err);
      }
    };

    fetchCommunityData();
  }, []);

  // Datenschutzkonforme Namensanzeige (Klarname / Spitzname / Beide)
  const getDisplayName = (user: UserProfile) => {
    const vis = user.privacySettings?.leaderboardVisibility || 'nickname';
    const realName = user.realName?.trim();
    const nickname = user.nickname?.trim();

    if (vis === 'realName') return realName || nickname || 'Anonymer Spieler';
    if (vis === 'both' && realName && nickname) return `${realName} (${nickname})`;
    return nickname || realName || 'Anonymer Spieler';
  };

  // Gefilterte Spieler basierend auf der Suchleiste
  const filteredPlayers = players.filter((player) => {
    const name = getDisplayName(player).toLowerCase();
    const email = (player.email || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  return (
    <Box className="max-w-6xl mx-auto px-2 sm:px-4 py-4 space-y-6 overflow-x-hidden">
      {/* Ansicht 1: Übersicht aller Spieler */}
      {viewMode === 'players' && (
        <Paper 
          variant="outlined" 
          sx={{ bgcolor: 'background.paper', borderColor: 'divider' }}
          className="shadow-sm overflow-hidden p-3 sm:p-6 rounded-xl space-y-4"
        >
          <Box className="flex justify-between items-center mb-2 flex-wrap gap-4">
            <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }} className="font-bold text-xl sm:text-2xl" color="text.primary">
              <PeopleIcon color="primary" /> Übersicht aller Spieler ({filteredPlayers.length}/{players.length})
            </Typography>

            {/* Suchleiste */}
            <TextField
              size="small"
              placeholder="Spieler suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-72"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>

          <TableContainer component={Paper} variant="outlined" sx={{ borderColor: 'divider' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell className="font-bold">Spieler</TableCell>
                  <TableCell className="font-bold">Rolle</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPlayers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} align="center" className="py-8">
                      <Typography variant="body2" color="text.secondary">
                        Keine Spieler gefunden, die deiner Suche entsprechen.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPlayers.map((player) => (
                    <TableRow key={player.uid} hover>
                      <TableCell>
                        <Box 
                          className="flex items-center gap-3 cursor-pointer"
                          onClick={() => setSelectedProfileUser(player)}
                        >
                          <Avatar 
                            src={player.photoURL} 
                            sx={{ width: 40, height: 40, bgcolor: 'primary.main', color: 'primary.contrastText' }}
                          >
                            {(player.nickname || player.realName || 'U').substring(0, 2).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography 
                              variant="body1" 
                              sx={{ color: 'primary.main', '&:hover': { textDecoration: 'underline' } }}
                              className="font-bold"
                            >
                              {getDisplayName(player)}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box className="flex gap-1 flex-wrap">
                          {player.roles?.map((role) => (
                            <Chip 
                              key={role} 
                              label={role === 'admin' ? 'Admin' : role === 'coach' ? 'Trainer' : 'Spieler'} 
                              size="small" 
                              color={role === 'admin' ? 'error' : role === 'coach' ? 'secondary' : 'default'}
                            />
                          ))}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Ansicht 2: Teams */}
      {viewMode === 'teams' && (
        <Box className="space-y-4">
          <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }} className="font-bold text-xl sm:text-2xl" color="text.primary">
            <GroupsIcon color="primary" /> Teams & Trainingsgruppen
          </Typography>

          {groups.length === 0 ? (
            <Paper variant="outlined" sx={{ bgcolor: 'background.paper', borderColor: 'divider' }} className="p-8 text-center shadow-sm rounded-xl">
              <Typography variant="body1" color="text.secondary">
                Aktuell sind noch keine Teams oder Gruppen angelegt.
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {groups.map((group) => {
                const memberCount = group.memberIds?.length || 0;
                return (
                  <Grid item={false} component="div" xs={12} md={6} key={group.id} {...({ size: { xs: 12, md: 6 } } as any)}>
                    <Card 
                      variant="outlined" 
                      sx={{ bgcolor: 'background.paper', borderColor: 'divider' }} 
                      className="shadow-sm h-full flex flex-col justify-between rounded-xl"
                    >
                      <CardContent className="space-y-3">
                        <Box className="flex justify-between items-start gap-2">
                          <Typography variant="h6" className="font-bold" color="text.primary">
                            {group.name}
                          </Typography>
                          <Chip 
                            icon={<SportsEsportsIcon />} 
                            label={`${memberCount} Mitglieder`} 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {group.description || 'Keine Beschreibung hinterlegt.'}
                        </Typography>
                        
                        <Box className="flex flex-wrap gap-1.5 pt-2 border-t border-divider">
                          {group.memberIds?.map((mId) => {
                            const p = players.find((u) => u.uid === mId);
                            if (!p) return null;
                            return (
                              <Chip
                                key={mId}
                                avatar={<Avatar src={p.photoURL}>{p.nickname?.[0]}</Avatar>}
                                label={getDisplayName(p)}
                                size="small"
                                variant="outlined"
                                onClick={() => setSelectedProfileUser(p)}
                                className="cursor-pointer"
                              />
                            );
                          })}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      )}

      {/* Öffentliches Profil Modal beim Klick auf Spieler */}
      <PublicProfileModal
        open={Boolean(selectedProfileUser)}
        onClose={() => setSelectedProfileUser(null)}
        user={selectedProfileUser}
      />
    </Box>
  );
};
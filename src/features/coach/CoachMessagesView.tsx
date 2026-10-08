import React, { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import type { UserProfile } from '../../types/user';
import type { CoachMessage } from '../../types/message';
import {
  Paper,
  Typography,
  Tabs,
  Tab,
  Chip,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  Box,
} from '@mui/material';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import DeleteIcon from '@mui/icons-material/Delete';
import EventIcon from '@mui/icons-material/Event';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import MessageIcon from '@mui/icons-material/Message';

export const CoachMessagesView: React.FC = () => {
  const { userProfile } = useAuth();
  const [currentTab, setCurrentTab] = useState<number>(0); // 0 = Aktuell, 1 = Bevorstehend, 2 = Abgelaufen
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [players, setPlayers] = useState<UserProfile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const fetchData = async () => {
    if (!userProfile?.uid) return;
    try {
      const [messagesSnap, usersSnap] = await Promise.all([
        getDocs(query(collection(db, 'coachMessages'), where('coachId', '==', userProfile.uid))),
        getDocs(collection(db, 'users')),
      ]);

      const fetchedMessages: CoachMessage[] = [];
      messagesSnap.forEach((d) => {
        fetchedMessages.push({ id: d.id, ...d.data() } as CoachMessage);
      });
      setMessages(fetchedMessages);

      const fetchedPlayers: UserProfile[] = [];
      usersSnap.forEach((d) => {
        fetchedPlayers.push({ uid: d.id, ...d.data() } as UserProfile);
      });
      setPlayers(fetchedPlayers);
    } catch (err) {
      console.error(err);
      setError('Fehler beim Laden der Trainer-Nachrichten.');
    }
  };

  useEffect(() => {
    fetchData();
  }, [userProfile?.uid]);

  const getPlayerName = (playerId: string) => {
    const p = players.find((usr) => usr.uid === playerId);
    if (!p) return 'Unbekannter Spieler';
    return p.nickname || p.realName || p.email;
  };

  const handleMarkAsRead = async (msgId: string) => {
    try {
      await updateDoc(doc(db, 'coachMessages', msgId), { isRead: true });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!window.confirm('Möchtest du diese Nachricht wirklich löschen?')) return;
    try {
      await deleteDoc(doc(db, 'coachMessages', msgId));
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Kategorisierung der Nachrichten nach Zeitstatus
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const categorizedMessages = messages.reduce(
    (acc, msg) => {
      let status: 'current' | 'upcoming' | 'expired' = 'current';

      if (msg.startDate && msg.endDate) {
        const start = new Date(msg.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(msg.endDate);
        end.setHours(23, 59, 59, 999);

        if (now < start) {
          status = 'upcoming'; // Bevorstehend
        } else if (now > end) {
          status = 'expired'; // Abgelaufen
        } else {
          status = 'current'; // Aktuell im Zeitraum
        }
      } else {
        // Nachrichten ohne genauen Zeitraum (z. B. Turnierergebnisse)
        const created = new Date(msg.createdAt);
        const diffDays = (now.getTime() - created.getTime()) / (1000 * 3600 * 24);
        status = diffDays > 7 ? 'expired' : 'current';
      }

      acc[status].push(msg);
      return acc;
    },
    { current: [] as CoachMessage[], upcoming: [] as CoachMessage[], expired: [] as CoachMessage[] }
  );

  const getActiveList = () => {
    if (currentTab === 0) return categorizedMessages.current;
    if (currentTab === 1) return categorizedMessages.upcoming;
    return categorizedMessages.expired;
  };

  const activeList = getActiveList();

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 py-4 sm:py-6 flex flex-col gap-4 sm:gap-6">
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, sm: 3 },
          bgcolor: 'background.paper',
          borderColor: 'divider',
        }}
        className="shadow-sm"
      >
        <Typography variant="h5" className="font-bold mb-1 sm:mb-2 flex items-center gap-2 text-base sm:text-xl" color="text.primary">
          <MessageIcon color="primary" fontSize={isMobile ? 'medium' : 'large'} /> Trainer-Postfach & Spieler-Nachrichten
        </Typography>
        <Typography variant="body2" color="text.secondary" className="mb-3 sm:mb-4 text-xs sm:text-sm">
          Hier siehst du Abwesenheiten, Urlaube und Turnierergebnisse deiner zugewiesenen Spieler.
        </Typography>

        {/* Wischbare Tabs für Mobilgeräte (Option A) */}
        <Tabs
          value={currentTab}
          onChange={(_, val) => setCurrentTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab
            label={`Aktuell (${categorizedMessages.current.length})`}
            className="text-xs sm:text-sm shrink-0 whitespace-nowrap"
          />
          <Tab
            label={`Bevorstehend (${categorizedMessages.upcoming.length})`}
            className="text-xs sm:text-sm shrink-0 whitespace-nowrap"
          />
          <Tab
            label={`Abgelaufen (${categorizedMessages.expired.length})`}
            className="text-xs sm:text-sm shrink-0 whitespace-nowrap"
          />
        </Tabs>
      </Paper>

      {error && <Alert severity="error">{error}</Alert>}

      <div className="flex flex-col gap-3">
        {activeList.length === 0 ? (
          <Paper
            variant="outlined"
            sx={{ p: 6, textAlign: 'center', bgcolor: 'background.paper', borderColor: 'divider' }}
          >
            <Typography variant="body2" color="text.secondary">
              Keine Nachrichten in dieser Kategorie vorhanden.
            </Typography>
          </Paper>
        ) : (
          activeList.map((msg) => (
            <Paper
              key={msg.id}
              variant="outlined"
              sx={{
                p: { xs: 2, sm: 3 },
                bgcolor: !msg.isRead ? 'action.selected' : 'background.paper',
                borderColor: !msg.isRead ? 'primary.main' : 'divider',
              }}
              className="flex flex-col gap-2.5 sm:gap-3 transition-colors shadow-sm"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Chip
                    icon={msg.category === 'absence' ? <EventIcon fontSize="small" /> : <SportsEsportsIcon fontSize="small" />}
                    label={
                      msg.category === 'absence'
                        ? 'Urlaub / Abwesenheit'
                        : msg.category === 'tournament'
                        ? 'Ligaspiel / Turnier'
                        : 'Allgemein'
                    }
                    size="small"
                    color={msg.category === 'absence' ? 'warning' : 'primary'}
                    variant="outlined"
                  />
                  {!msg.isRead && <Chip label="Neu" color="error" size="small" />}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!msg.isRead && (
                    <Tooltip title="Als gelesen markieren">
                      <IconButton size="small" color="primary" onClick={() => handleMarkAsRead(msg.id!)}>
                        <MarkEmailReadIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Nachricht löschen">
                    <IconButton size="small" color="error" onClick={() => handleDeleteMessage(msg.id!)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </div>
              </div>

              <div>
                <Typography variant="subtitle1" className="font-bold text-sm sm:text-base leading-snug" color="text.primary">
                  {msg.subject}
                </Typography>
                <Typography variant="caption" color="text.secondary" className="block mt-0.5">
                  Von: <b>{getPlayerName(msg.playerId)}</b> am{' '}
                  {new Date(msg.createdAt).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {msg.startDate && msg.endDate && ` | Zeitraum: ${msg.startDate} bis ${msg.endDate}`}
                </Typography>
              </div>

              <Divider />

              {/* Nachrichten-Inhalt im Darkmode-sicheren Layout */}
              <Box
                sx={{
                  p: { xs: 1.5, sm: 2 },
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'divider',
                }}
              >
                <Typography variant="body2" className="whitespace-pre-wrap text-xs sm:text-sm" color="text.primary">
                  {msg.content}
                </Typography>
              </Box>
            </Paper>
          ))
        )}
      </div>
    </div>
  );
};
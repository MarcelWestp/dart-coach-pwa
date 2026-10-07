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
          status = 'upcoming'; // Bevorstehend (z. B. Urlaub in der Zukunft)
        } else if (now > end) {
          status = 'expired'; // Abgelaufen
        } else {
          status = 'current'; // Aktuell im Zeitraum
        }
      } else {
        // Nachrichten ohne genauen Zeitraum (z. B. Turnierergebnisse oder allgemeines)
        // Nach 7 Tagen als abgelaufen betrachten, ansonsten aktuell
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
    <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">
      <Paper className="p-4 shadow-sm">
        <Typography variant="h5" className="font-bold mb-2 flex items-center gap-2">
          <MessageIcon color="primary" /> Trainer-Postfach & Spieler-Nachrichten
        </Typography>
        <Typography variant="body2" color="textSecondary" className="mb-4">
          Hier siehst du Abwesenheiten, Urlaube und Turnierergebnisse deiner zugewiesenen Spieler.
        </Typography>

        <Tabs value={currentTab} onChange={(_, val) => setCurrentTab(val)} variant="fullWidth">
          <Tab label={`Aktuell (${categorizedMessages.current.length})`} />
          <Tab label={`Bevorstehend (${categorizedMessages.upcoming.length})`} />
          <Tab label={`Abgelaufen (${categorizedMessages.expired.length})`} />
        </Tabs>
      </Paper>

      {error && <Alert severity="error">{error}</Alert>}

      <div className="flex flex-col gap-3">
        {activeList.length === 0 ? (
          <Paper className="p-8 text-center">
            <Typography variant="body1" color="textSecondary">
              Keine Nachrichten in dieser Kategorie vorhanden.
            </Typography>
          </Paper>
        ) : (
          activeList.map((msg) => (
            <Paper
              key={msg.id}
              variant="outlined"
              className={`p-4 flex flex-col gap-3 transition-colors ${
                !msg.isRead ? 'bg-primary-50/20 dark:bg-primary-900/10 border-primary-main' : ''
              }`}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-center gap-2">
                  <Chip
                    icon={msg.category === 'absence' ? <EventIcon /> : <SportsEsportsIcon />}
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

                <div className="flex items-center gap-1">
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
                <Typography variant="subtitle1" className="font-bold">
                  {msg.subject}
                </Typography>
                <Typography variant="caption" color="textSecondary" className="block">
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

              <Typography variant="body2" className="whitespace-pre-wrap bg-gray-50 dark:bg-gray-800/50 p-3 rounded">
                {msg.content}
              </Typography>
            </Paper>
          ))
        )}
      </div>
    </div>
  );
};
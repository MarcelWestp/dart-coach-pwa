import React, { useState, useEffect } from "react";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { sendNotificationIfEnabled } from "../../services/notificationService";
import { getWeekAndYearFromDate } from "../../utils/calenderweek";
import type { PerformanceTest } from "../../types/exercise";
import type { UserProfile } from "../../types/user";
import type { PlayerGroup } from "../../types/group";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
  Typography,
  Box,
} from "@mui/material";

interface AssignTestModalProps {
  open: boolean;
  onClose: () => void;
  testToAssign: PerformanceTest | null;
  onAssigned: () => void;
}

export const AssignTestModal: React.FC<AssignTestModalProps> = ({
  open,
  onClose,
  testToAssign,
  onAssigned,
}) => {
  const { userProfile } = useAuth();

  const { calendarWeek: defaultWeek, year: defaultYear } =
    getWeekAndYearFromDate(new Date().toISOString());

  const [assignTarget, setAssignTarget] = useState<"player" | "group" | "all">(
    "player",
  );
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [calendarWeek, setCalendarWeek] = useState<number>(defaultWeek);
  const [year, setYear] = useState<number>(defaultYear);
  const [coachNote, setCoachNote] = useState<string>("");

  const [roster, setRoster] = useState<UserProfile[]>([]);
  const [groups, setGroups] = useState<PlayerGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const getPlayerDisplayName = (player: UserProfile): string => {
    const visibility =
      player.privacySettings?.leaderboardVisibility || "nickname";
    const realName = player.realName?.trim();
    const nickname = player.nickname?.trim();

    let namePart = "";

    if (visibility === "realName") {
      namePart = realName || nickname || "Spieler";
    } else if (visibility === "both") {
      if (realName && nickname) {
        namePart = `${realName} (${nickname})`;
      } else {
        namePart = realName || nickname || "Spieler";
      }
    } else {
      // Default: 'nickname'
      namePart = nickname || realName || "Spieler";
    }

    // E-Mail immer hinzufügen
    return `${namePart} – ${player.email}`;
  };

  // 2. Im useEffect für das Laden des Kaders (fetchRosterAndGroups):
  useEffect(() => {
    if (!open) return;

    const fetchRosterAndGroups = async () => {
      try {
        // 1. Trainer-Spieler-Beziehungen abfragen
        const relSnap = await getDocs(collection(db, "coachPlayerRelations"));
        const playerIds: string[] = [];
        relSnap.forEach((d) => {
          const data = d.data();
          if (data.coachId === userProfile?.uid && data.playerId) {
            playerIds.push(data.playerId);
          }
        });

        // 2. Spieler-Profile laden
        const userSnap = await getDocs(collection(db, "users"));
        const fetchedUsers: UserProfile[] = [];

        userSnap.forEach((d) => {
          const data = d.data();
          const userId = d.id; // Dokumenten-ID verwenden

          // Fallback-Prüfung: Entweder in coachPlayerRelations oder direkt am User
          const isMyPlayer =
            playerIds.includes(userId) ||
            data.assignedCoachId === userProfile?.uid;

          if (isMyPlayer) {
            fetchedUsers.push({
              ...data,
              uid: userId, // WICHTIG: Ersetzt/sichert das Feld 'uid', damit das Dropdown nicht leer bleibt!
            } as UserProfile);
          }
        });

        setRoster(fetchedUsers);

        // 3. Gruppen laden
        const groupSnap = await getDocs(collection(db, "playerGroups"));
        const fetchedGroups: PlayerGroup[] = [];
        groupSnap.forEach((d) => {
          const data = d.data();
          if (data.coachId === userProfile?.uid) {
            fetchedGroups.push({ id: d.id, ...data } as PlayerGroup);
          }
        });
        setGroups(fetchedGroups);
      } catch (err) {
        console.error("Fehler beim Laden des Kaders:", err);
      }
    };

    fetchRosterAndGroups();
  }, [open, userProfile?.uid]);

  const handleAssign = async () => {
    if (!testToAssign || !userProfile) return;

    // Empfänger-IDs bestimmen
    let targetPlayerIds: string[] = [];

    if (assignTarget === "player") {
      if (!selectedPlayerId) {
        setError("Bitte wähle einen Spieler aus.");
        return;
      }
      targetPlayerIds = [selectedPlayerId];
    } else if (assignTarget === "group") {
      if (!selectedGroupId) {
        setError("Bitte wähle eine Gruppe aus.");
        return;
      }
      const group = groups.find((g) => g.id === selectedGroupId);
      if (group) {
        targetPlayerIds = group.memberIds;
      }
    } else if (assignTarget === "all") {
      targetPlayerIds = roster.map((p) => p.uid);
    }

    if (targetPlayerIds.length === 0) {
      setError("Keine Spieler für die Zuweisung gefunden.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nowIso = new Date().toISOString();

      // Zuweisungs-Dokumente in Firestore anlegen
      for (const pId of targetPlayerIds) {
        await addDoc(collection(db, "assignedPerformanceTests"), {
          testId: testToAssign.id,
          title: testToAssign.title,
          description: testToAssign.description || "",
          exerciseType: testToAssign.exerciseType,
          exerciseIds: testToAssign.exerciseIds,
          coachId: userProfile.uid,
          playerId: pId,
          calendarWeek,
          year,
          coachNote: coachNote.trim(),
          status: "assigned",
          createdAt: nowIso,
          updatedAt: nowIso,
        });

        // Benachrichtigung an den Spieler senden
        await sendNotificationIfEnabled({
          userId: pId,
          type: "newOrUpdatedPerformanceTest",
          title: "Neuer Leistungstest zugewiesen",
          message: `Dein Trainer hat dir den Leistungstest "${testToAssign.title}" für KW ${calendarWeek} zugewiesen.`,
          link: "/performance-tests",
        });
      }

      onAssigned();
      onClose();
    } catch (err) {
      console.error(err);
      setError("Fehler beim Zuweisen des Leistungstests.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle className="font-bold">
        Leistungstest zuweisen: {testToAssign?.title}
      </DialogTitle>
      <DialogContent dividers className="flex flex-col gap-4">
        {error && <Alert severity="error">{error}</Alert>}

        <Typography variant="subtitle2" className="font-bold">
          Empfänger auswählen:
        </Typography>

        <RadioGroup
          row
          value={assignTarget}
          onChange={(e) => setAssignTarget(e.target.value as any)}
        >
          <FormControlLabel
            value="player"
            control={<Radio />}
            label="Einzelner Spieler"
          />
          <FormControlLabel value="group" control={<Radio />} label="Gruppe" />
          <FormControlLabel
            value="all"
            control={<Radio />}
            label="Gesamter Kader"
          />
        </RadioGroup>

        {assignTarget === "player" && (
          <FormControl fullWidth required className="mt-2">
            <InputLabel id="player-select-label">Spieler auswählen</InputLabel>
            <Select
              labelId="player-select-label"
              value={selectedPlayerId}
              label="Spieler auswählen"
              onChange={(e) => setSelectedPlayerId(e.target.value)}
            >
              {roster.map((p) => (
                <MenuItem key={p.uid} value={p.uid}>
                  {getPlayerDisplayName(p)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {assignTarget === "group" && (
          <FormControl fullWidth required>
            <InputLabel>Gruppe</InputLabel>
            <Select
              value={selectedGroupId}
              label="Gruppe"
              onChange={(e) => setSelectedGroupId(e.target.value)}
            >
              {groups.map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.name} ({g.memberIds.length} Mitglieder)
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <Box className="flex gap-4">
          <TextField
            label="Kalenderwoche"
            type="number"
            value={calendarWeek}
            onChange={(e) => setCalendarWeek(Number(e.target.value))}
            fullWidth
            required
          />
          <TextField
            label="Jahr"
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            fullWidth
            required
          />
        </Box>

        <TextField
          label="Anmerkung des Trainers (optional)"
          multiline
          rows={2}
          value={coachNote}
          onChange={(e) => setCoachNote(e.target.value)}
          placeholder="z. B. Bitte bis Freitag durchführen..."
          fullWidth
        />
      </DialogContent>
      <DialogActions className="p-4">
        <Button onClick={onClose}>Abbrechen</Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleAssign}
          disabled={loading}
        >
          {loading ? "Wird zugewiesen..." : "Test Zuweisen"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

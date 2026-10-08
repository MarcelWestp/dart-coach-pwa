import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from "@mui/material";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { sendNotificationIfEnabled } from "../../services/notificationService";
import type { MessageCategory } from "../../types/message";

interface SendMessageProps {
  open: boolean;
  onClose: () => void;
  coachId?: string;
}

export const SendCoachMessageModal: React.FC<SendMessageProps> = ({
  open,
  onClose,
  coachId,
}) => {
  const { userProfile } = useAuth();
  const [category, setCategory] = useState<MessageCategory>("absence");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !coachId) {
      setError("Kein Trainer zugewiesen oder nicht eingeloggt.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await addDoc(collection(db, "coachMessages"), {
        playerId: userProfile.uid,
        coachId: coachId,
        category,
        subject: subject.trim(),
        content: content.trim(),
        startDate: startDate || null,
        endDate: endDate || null,
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      // Trainer per In-App Benachrichtigung informieren
      await sendNotificationIfEnabled({
        userId: coachId,
        type: "newOrUpdatedTrainingPlans",
        title: "Neue Nachricht von Spieler",
        message: `${
          userProfile.nickname || userProfile.realName
        } hat dir eine Nachricht gesendet: "${subject.trim()}"`,
        link: "/coach-messages",
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        setSubject("");
        setContent("");
        setStartDate("");
        setEndDate("");
      }, 1500);
    } catch (err) {
      console.error("Fehler beim Senden der Nachricht:", err);
      setError("Fehler beim Senden der Nachricht.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle className="font-bold">
          Nachricht an den Trainer hinterlassen
        </DialogTitle>
        <DialogContent dividers className="flex flex-col gap-4 p-4 sm:p-6">
          {success && (
            <Alert severity="success">Nachricht erfolgreich gesendet!</Alert>
          )}
          {error && <Alert severity="error">{error}</Alert>}

          <FormControl fullWidth required>
            <InputLabel id="message-category-label">
              Kategorie / Anlass
            </InputLabel>
            <Select
              labelId="message-category-label"
              value={category}
              label="Kategorie / Anlass"
              onChange={(e) => setCategory(e.target.value as MessageCategory)}
            >
              <MenuItem value="absence">Urlaub / Abwesenheit</MenuItem>
              <MenuItem value="tournament">
                Gespieltes Ligaspiel / Turnier
              </MenuItem>
              <MenuItem value="general">
                Allgemeine Nachricht / Sonstiges
              </MenuItem>
            </Select>
          </FormControl>

          {category === "absence" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                label="Von Datum"
                type="date"
                fullWidth
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Bis Datum"
                type="date"
                fullWidth
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </div>
          )}

          <TextField
            label="Betreff"
            required
            fullWidth
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Z. B. Urlaub vom 10.10. bis 20.10."
          />

          <TextField
            label="Nachricht / Details"
            required
            multiline
            rows={4}
            fullWidth
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Schreibe hier nähere Details zu deiner Abwesenheit oder deinen Turnierergebnissen..."
          />
        </DialogContent>
        <DialogActions className="p-4">
          <Button onClick={onClose} disabled={submitting}>
            Abbrechen
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={submitting}
          >
            {submitting ? "Sende..." : "Nachricht senden"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
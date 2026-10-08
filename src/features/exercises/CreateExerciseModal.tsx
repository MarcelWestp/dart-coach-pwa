import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import type {
  Tag,
  ExerciseType,
  Exercise,
  ExerciseResultType,
  ScoreDirection,
} from "../../types/exercise";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  Box,
  Chip,
  Alert,
  FormHelperText,
  useMediaQuery,
  useTheme,
} from "@mui/material";

interface CreateExerciseModalProps {
  open: boolean;
  onClose: () => void;
  onExerciseCreated: () => void;
  exerciseToEdit?: Exercise | null;
}

export const CreateExerciseModal: React.FC<CreateExerciseModalProps> = ({
  open,
  onClose,
  onExerciseCreated,
  exerciseToEdit,
}) => {
  const { userProfile } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [type, setType] = useState<ExerciseType>("scoring");
  const [resultType, setResultType] = useState<ExerciseResultType>("points");
  const [scoreDirection, setScoreDirection] =
    useState<ScoreDirection>("higher_is_better");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "tags"));
        const tags: Tag[] = [];
        querySnapshot.forEach((docSnap) => {
          tags.push({ id: docSnap.id, ...docSnap.data() } as Tag);
        });
        setAvailableTags(tags);
      } catch (err) {
        console.error("Fehler beim Laden der Tags:", err);
      }
    };

    if (open) {
      fetchTags();
      if (exerciseToEdit) {
        setTitle(exerciseToEdit.title || "");
        setDescription(exerciseToEdit.description || "");
        setInstructions(exerciseToEdit.instructions || "");
        setType(exerciseToEdit.type || "scoring");
        setResultType(exerciseToEdit.resultType || "points");
        setScoreDirection(exerciseToEdit.scoreDirection || "higher_is_better");
        setSelectedTagIds(exerciseToEdit.tagIds || []);
      } else {
        setTitle("");
        setDescription("");
        setInstructions("");
        setType("scoring");
        setResultType("points");
        setScoreDirection("higher_is_better");
        setSelectedTagIds([]);
      }
      setError(null);
    }
  }, [open, exerciseToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !userProfile) return;

    setLoading(true);
    setError(null);

    try {
      if (exerciseToEdit) {
        // Bestehende Übung aktualisieren
        const exerciseRef = doc(db, "exercises", exerciseToEdit.id);
        await updateDoc(exerciseRef, {
          title: title.trim(),
          description: description.trim(),
          instructions: instructions.trim(),
          type,
          resultType,
          scoreDirection,
          tagIds: selectedTagIds,
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Neue Übung erstellen
        const isSystemStandard = Boolean(
          userProfile.roles && userProfile.roles.includes("admin"),
        );
        await addDoc(collection(db, "exercises"), {
          title: title.trim(),
          description: description.trim(),
          instructions: instructions.trim(),
          type,
          resultType,
          scoreDirection,
          tagIds: selectedTagIds,
          createdBy: userProfile.uid,
          isSystemStandard,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      onExerciseCreated();
      onClose();
    } catch (err: any) {
      console.error("Fehler beim Speichern der Übung:", err);
      setError("Fehler beim Speichern der Übung.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      slotProps={{
        paper: {
          sx: {
            bgcolor: "background.paper",
            backgroundImage: "none",
          },
        },
      }}
    >
      <DialogTitle className="font-bold">
        {exerciseToEdit ? "Übung bearbeiten" : "Neue Dart-Übung erstellen"}
      </DialogTitle>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1">
        <DialogContent dividers className="flex flex-col gap-4">
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Titel der Übung"
            variant="outlined"
            fullWidth
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <FormControl fullWidth required>
            <InputLabel id="exercise-type-label">Übungskategorie</InputLabel>
            <Select
              labelId="exercise-type-label"
              value={type}
              label="Übungskategorie"
              onChange={(e) => setType(e.target.value as ExerciseType)}
            >
              <MenuItem value="scoring">Scoring</MenuItem>
              <MenuItem value="check">Check</MenuItem>
              <MenuItem value="rules">Regeln/Sonstiges</MenuItem>
              <MenuItem value="technique">Technik</MenuItem>
            </Select>
          </FormControl>

          {/* Ergebnistyp Auswahl */}
          <FormControl fullWidth required>
            <InputLabel id="result-type-label">
              Eingabetyp des Ergebnisses
            </InputLabel>
            <Select
              labelId="result-type-label"
              value={resultType}
              label="Eingabetyp des Ergebnisses"
              onChange={(e) =>
                setResultType(e.target.value as ExerciseResultType)
              }
            >
              <MenuItem value="points">Punktzahl</MenuItem>
              <MenuItem value="attempts">Versuche / Darts</MenuItem>
              <MenuItem value="hits">Treffer</MenuItem>
              <MenuItem value="highestScore">
                Höchstes Ergebnis / Highscore
              </MenuItem>
            </Select>
            <FormHelperText sx={{ color: "text.secondary" }}>
              Bestimmt die Bezeichnung des Ergebnisfeldes bei der Eingabe durch
              Spieler.
            </FormHelperText>
          </FormControl>

          {/* Wertungsrichtung Auswahl */}
          <FormControl fullWidth required>
            <InputLabel id="score-direction-label">Wertungsrichtung</InputLabel>
            <Select
              labelId="score-direction-label"
              value={scoreDirection}
              label="Wertungsrichtung"
              onChange={(e) =>
                setScoreDirection(e.target.value as ScoreDirection)
              }
            >
              <MenuItem value="higher_is_better">
                Höherer Wert ist besser (z. B. Punkte, Treffer)
              </MenuItem>
              <MenuItem value="lower_is_better">
                Niedrigerer Wert ist besser (z. B. benötigte Versuche/Darts)
              </MenuItem>
            </Select>
            <FormHelperText sx={{ color: "text.secondary" }}>
              Wichtig für Bestwerte, Vergleiche und Auswertungen in
              Ligen/Statistiken.
            </FormHelperText>
          </FormControl>

          <TextField
            label="Kurzbeschreibung (1-2 Sätze)"
            variant="outlined"
            fullWidth
            multiline
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <TextField
            label="Detaillierte Spielanleitung / Ablauf"
            variant="outlined"
            fullWidth
            required
            multiline
            rows={4}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Erkläre hier genau, wie die Übung gespielt wird..."
          />

          <FormControl fullWidth>
            <InputLabel id="tags-select-label">Tags zuweisen</InputLabel>
            <Select
              labelId="tags-select-label"
              multiple
              value={selectedTagIds}
              onChange={(e) =>
                setSelectedTagIds(
                  typeof e.target.value === "string"
                    ? e.target.value.split(",")
                    : e.target.value,
                )
              }
              input={<OutlinedInput label="Tags zuweisen" />}
              renderValue={(selected) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {selected.map((tagId) => {
                    const tag = availableTags.find((t) => t.id === tagId);
                    return (
                      <Chip
                        key={tagId}
                        label={tag ? tag.name : tagId}
                        size="small"
                        sx={{ bgcolor: "action.hover", borderColor: "divider" }}
                      />
                    );
                  })}
                </Box>
              )}
            >
              {availableTags.map((tag) => (
                <MenuItem key={tag.id} value={tag.id}>
                  {tag.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>

        <DialogActions className="p-4 mt-auto">
          <Button onClick={onClose} disabled={loading}>
            Abbrechen
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading
              ? "Speichert..."
              : exerciseToEdit
                ? "Änderungen Speichern"
                : "Übung Erstellen"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

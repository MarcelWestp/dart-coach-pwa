import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { sendNotificationIfEnabled } from "../../services/notificationService";
import type { Exercise, PerformanceTest } from "../../types/exercise";
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
  Alert,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";

interface CreateTestModalProps {
  open: boolean;
  onClose: () => void;
  onTestCreated: () => void;
  testToEdit?: PerformanceTest | null;
}

export const CreateTestModal: React.FC<CreateTestModalProps> = ({
  open,
  onClose,
  onTestCreated,
  testToEdit,
}) => {
  const { userProfile } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [selectedExerciseToAdd, setSelectedExerciseToAdd] =
    useState<string>("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExercises = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "exercises"));
        const exercises: Exercise[] = [];
        querySnapshot.forEach((docSnap) => {
          exercises.push({ id: docSnap.id, ...docSnap.data() } as Exercise);
        });
        setAllExercises(exercises);
      } catch (err) {
        console.error("Fehler beim Laden der Übungen:", err);
      }
    };

    if (open) {
      fetchExercises();
      if (testToEdit) {
        setTitle(testToEdit.title || "");
        setDescription(testToEdit.description || "");
        setSelectedExerciseIds(testToEdit.exerciseIds || []);
      } else {
        setTitle("");
        setDescription("");
        setSelectedExerciseIds([]);
      }
      setSelectedExerciseToAdd("");
      setError(null);
    }
  }, [open, testToEdit]);

  const handleAddExercise = () => {
    if (!selectedExerciseToAdd) return;
    setSelectedExerciseIds((prev) => [...prev, selectedExerciseToAdd]);
    setSelectedExerciseToAdd("");
  };

  const handleRemoveExercise = (indexToRemove: number) => {
    setSelectedExerciseIds((prev) =>
      prev.filter((_, index) => index !== indexToRemove)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || selectedExerciseIds.length === 0 || !userProfile) {
      setError("Bitte wähle einen Titel und mindestens eine Übung aus.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cleanTitle = title.trim();

      if (testToEdit) {
        // Test aktualisieren (ohne exerciseType)
        const testRef = doc(db, "performanceTests", testToEdit.id);
        await updateDoc(testRef, {
          title: cleanTitle,
          description: description.trim(),
          exerciseIds: selectedExerciseIds,
          updatedAt: new Date().toISOString(),
        });

        await sendNotificationIfEnabled({
          userId: userProfile.uid,
          type: "newOrUpdatedPerformanceTest",
          title: "Leistungstest aktualisiert",
          message: `Der Leistungstest "${cleanTitle}" wurde aktualisiert.`,
          link: "/performance-tests",
        });
      } else {
        // Neuen Test erstellen (ohne exerciseType)
        await addDoc(collection(db, "performanceTests"), {
          title: cleanTitle,
          description: description.trim(),
          exerciseIds: selectedExerciseIds,
          createdBy: userProfile.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        await sendNotificationIfEnabled({
          userId: userProfile.uid,
          type: "newOrUpdatedPerformanceTest",
          title: "Neuer Leistungstest verfügbar",
          message: `Ein neuer Leistungstest "${cleanTitle}" wurde erstellt.`,
          link: "/performance-tests",
        });
      }

      onTestCreated();
      onClose();
    } catch (err: any) {
      console.error("Fehler beim Speichern des Leistungstests:", err);
      setError("Fehler beim Speichern des Leistungstests.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle className="font-bold">
        {testToEdit
          ? "Leistungstest bearbeiten"
          : "Neuen Leistungstest erstellen"}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent dividers className="flex flex-col gap-4">
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Titel des Leistungstests"
            variant="outlined"
            fullWidth
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <TextField
            label="Beschreibung / Anweisungen"
            variant="outlined"
            fullWidth
            multiline
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="flex gap-2 items-center mt-2">
            <FormControl fullWidth size="small">
              <InputLabel id="add-exercise-select-label">
                Übung zum Test hinzufügen
              </InputLabel>
              <Select
                labelId="add-exercise-select-label"
                value={selectedExerciseToAdd}
                label="Übung zum Test hinzufügen"
                onChange={(e) => setSelectedExerciseToAdd(e.target.value)}
              >
                {allExercises.length === 0 ? (
                  <MenuItem disabled value="">
                    Keine Übungen vorhanden
                  </MenuItem>
                ) : (
                  allExercises.map((ex) => (
                    <MenuItem key={ex.id} value={ex.id}>
                      {ex.title}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            <Button
              variant="contained"
              color="primary"
              onClick={handleAddExercise}
              disabled={!selectedExerciseToAdd}
              startIcon={<AddIcon />}
              className="whitespace-nowrap"
            >
              Hinzufügen
            </Button>
          </div>

          <Typography
            variant="subtitle2"
            className="mt-4 font-bold"
            color="text.primary"
          >
            Enthaltene Übungen in Reihenfolge ({selectedExerciseIds.length}):
          </Typography>

          <Paper
            variant="outlined"
            sx={{ bgcolor: "background.paper", borderColor: "divider" }}
            className="max-h-60 overflow-y-auto"
          >
            {selectedExerciseIds.length === 0 ? (
              <Typography
                variant="body2"
                color="textSecondary"
                className="p-4 text-center"
              >
                Noch keine Übungen hinzugefügt.
              </Typography>
            ) : (
              <List dense>
                {selectedExerciseIds.map((exId, index) => {
                  const exercise = allExercises.find((e) => e.id === exId);
                  return (
                    <ListItem
                      key={`${exId}-${index}`}
                      divider
                      secondaryAction={
                        <IconButton
                          edge="end"
                          color="error"
                          onClick={() => handleRemoveExercise(index)}
                          size="small"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      }
                    >
                      <ListItemText
                        primary={`${index + 1}. ${
                          exercise ? exercise.title : "Unbekannte Übung"
                        }`}
                        secondary={exercise?.description}
                      />
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Paper>
        </DialogContent>

        <DialogActions className="p-4">
          <Button onClick={onClose} disabled={loading}>
            Abbrechen
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading || selectedExerciseIds.length === 0}
          >
            {loading
              ? "Speichert..."
              : testToEdit
              ? "Änderungen Speichern"
              : "Leistungstest Erstellen"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
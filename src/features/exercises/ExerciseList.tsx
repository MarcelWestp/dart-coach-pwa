import React, { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import type { Exercise, Tag } from "../../types/exercise";
import { CreateExerciseModal } from "./CreateExerciseModal";
import { RecordResultModal } from "./RecordResultModal";
import {
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  CardActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HelpIcon from "@mui/icons-material/Help";

export const ExerciseList: React.FC = () => {
  const { userProfile } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTagFilter, setSelectedTagFilter] = useState<string>("all");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [exerciseToEdit, setExerciseToEdit] = useState<Exercise | null>(null);
  const [selectedExerciseForRecord, setSelectedExerciseForRecord] =
    useState<Exercise | null>(null);

  const canCreateExercise =
    userProfile?.roles?.includes("coach") ||
    userProfile?.roles?.includes("admin");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [exercisesSnap, tagsSnap] = await Promise.all([
        getDocs(collection(db, "exercises")),
        getDocs(collection(db, "tags")),
      ]);

      const fetchedExercises: Exercise[] = [];
      exercisesSnap.forEach((docSnap) => {
        fetchedExercises.push({
          id: docSnap.id,
          ...docSnap.data(),
        } as Exercise);
      });

      const fetchedTags: Tag[] = [];
      tagsSnap.forEach((docSnap) => {
        fetchedTags.push({ id: docSnap.id, ...docSnap.data() } as Tag);
      });

      setExercises(fetchedExercises);
      setTags(fetchedTags);
    } catch (err: any) {
      console.error("Fehler beim Laden der Übungen:", err);
      setError("Fehler beim Laden der Übungen.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteExercise = async (exerciseId: string, title: string) => {
    if (!window.confirm(`Möchtest du die Übung "${title}" wirklich löschen?`))
      return;

    try {
      await deleteDoc(doc(db, "exercises", exerciseId));
      setExercises((prev) => prev.filter((e) => e.id !== exerciseId));
    } catch (err) {
      console.error("Fehler beim Löschen der Übung:", err);
      setError("Fehler beim Löschen der Übung.");
    }
  };

  const handleOpenEditModal = (exercise: Exercise) => {
    setExerciseToEdit(exercise);
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setExerciseToEdit(null);
  };

  const filteredExercises = exercises.filter((ex) => {
    const matchesTag =
      selectedTagFilter === "all" ||
      (ex.tagIds && ex.tagIds.includes(selectedTagFilter));
    const matchesType =
      selectedTypeFilter === "all" || ex.type === selectedTypeFilter;
    const matchesSearch =
      ex.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ex.description &&
        ex.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTag && matchesType && matchesSearch;
  });

  const getTypeName = (type: string) => {
    switch (type) {
      case "scoring":
        return "Scoring";
      case "check":
        return "Check";
      case "rules":
        return "Regeln/Sonstiges";
      case "technique":
        return "Technik";
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <Box className="flex justify-center items-center p-8">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <Typography
            variant="h4"
            component="h1"
            className="font-bold flex items-center gap-2"
            color="text.primary"
          >
            <FitnessCenterIcon fontSize="large" color="primary" />{" "}
            Übungs-Bibliothek
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Alle verfügbaren Trainingsübungen im Überblick.
          </Typography>
        </div>

        {canCreateExercise && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => {
              setExerciseToEdit(null);
              setIsCreateModalOpen(true);
            }}
          >
            Neue Übung Erstellen
          </Button>
        )}
      </div>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filterbereich */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TextField
          label="Suche"
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          fullWidth
        />

        <FormControl size="small" fullWidth>
          <InputLabel id="tag-filter-label">Filter nach Tag</InputLabel>
          <Select
            labelId="tag-filter-label"
            value={selectedTagFilter}
            label="Filter nach Tag"
            onChange={(e) => setSelectedTagFilter(e.target.value)}
          >
            <MenuItem value="all">Alle Tags</MenuItem>
            {tags.map((tag) => (
              <MenuItem key={tag.id} value={tag.id}>
                {tag.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" fullWidth>
          <InputLabel id="type-filter-label">Filter nach Typ</InputLabel>
          <Select
            labelId="type-filter-label"
            value={selectedTypeFilter}
            label="Filter nach Typ"
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
          >
            <MenuItem value="all">Alle Typen</MenuItem>
            <MenuItem value="scoring">Scoring</MenuItem>
            <MenuItem value="check">Check</MenuItem>
            <MenuItem value="rules">Regeln/Sonstiges</MenuItem>
            <MenuItem value="technique">Technik</MenuItem>
          </Select>
        </FormControl>
      </div>

      {/* Übungsliste */}
      {filteredExercises.length === 0 ? (
        <Typography
          variant="body1"
          color="text.secondary"
          className="text-center py-8"
        >
          Keine Übungen gefunden.
        </Typography>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExercises.map((exercise) => {
            const isOwnerOrAdmin =
              exercise.createdBy === userProfile?.uid ||
              userProfile?.roles?.includes("admin");

            return (
              <Card
                key={exercise.id}
                variant="outlined"
                className="shadow-md flex flex-col justify-between"
                sx={{
                  bgcolor: "background.paper",
                  borderColor: "divider",
                }}
              >
                <CardContent className="pb-2">
                  <div className="flex justify-between items-start mb-2">
                    <Typography
                      variant="h6"
                      className="font-bold"
                      color="text.primary"
                    >
                      {exercise.title}
                    </Typography>
                    {isOwnerOrAdmin && (
                      <div className="flex gap-1 shrink-0">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleOpenEditModal(exercise)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() =>
                            handleDeleteExercise(exercise.id, exercise.title)
                          }
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </div>
                    )}
                  </div>

                  <Chip
                    label={getTypeName(exercise.type)}
                    size="small"
                    color="secondary"
                    className="mb-3"
                  />

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    className="mb-3"
                  >
                    {exercise.description ||
                      "Keine Kurzbeschreibung vorhanden."}
                  </Typography>

                  {exercise.instructions && (
                    <Accordion
                      elevation={0}
                      variant="outlined"
                      sx={{ bgcolor: "action.hover" }}
                      className="mb-3 rounded"
                    >
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography
                          variant="caption"
                          className="font-bold flex items-center gap-1"
                          color="text.primary"
                        >
                          <HelpIcon fontSize="small" color="primary" />{" "}
                          Spielanleitung anzeigen
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography
                          variant="body2"
                          className="whitespace-pre-line text-xs sm:text-sm"
                          color="text.secondary"
                        >
                          {exercise.instructions}
                        </Typography>
                      </AccordionDetails>
                    </Accordion>
                  )}

                  <div className="flex flex-wrap gap-1 mt-auto">
                    {exercise.tagIds &&
                      exercise.tagIds.map((tagId) => {
                        const tag = tags.find((t) => t.id === tagId);
                        return tag ? (
                          <Chip
                            key={tagId}
                            label={tag.name}
                            size="small"
                            variant="outlined"
                          />
                        ) : null;
                      })}
                  </div>
                </CardContent>

                <CardActions className="p-4 pt-2">
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    startIcon={<PlayArrowIcon />}
                    onClick={() => setSelectedExerciseForRecord(exercise)}
                  >
                    Ergebnis eintragen
                  </Button>
                </CardActions>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modale zum Erstellen/Bearbeiten und Ergebniseintragen */}
      <CreateExerciseModal
        open={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        onExerciseCreated={fetchData}
        exerciseToEdit={exerciseToEdit}
      />

      {selectedExerciseForRecord && (
        <RecordResultModal
          open={!!selectedExerciseForRecord}
          onClose={() => setSelectedExerciseForRecord(null)}
          exercise={selectedExerciseForRecord}
          allExercises={exercises}
          onResultRecorded={() => {
            setSelectedExerciseForRecord(null);
            fetchData();
          }}
        />
      )}
    </Box>
  );
};
import React, { useEffect, useState } from 'react';
import { 
  collection, 
  getDocs, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import type { PerformanceTest, Exercise } from '../../types/exercise';
import { CreateTestModal } from './CreateTestModal';
import { RecordResultModal } from './RecordResultModal';
import { 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  Chip, 
  CircularProgress, 
  Alert, 
  IconButton,
  List,
  ListItem,
  ListItemText,
  CardActions
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

export const TestList: React.FC = () => {
  const { userProfile } = useAuth();
  const [tests, setTests] = useState<PerformanceTest[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [testToEdit, setTestToEdit] = useState<PerformanceTest | null>(null);
  const [selectedTestForRecord, setSelectedTestForRecord] = useState<PerformanceTest | null>(null);

  const canCreateTest = userProfile?.roles.includes('coach') || userProfile?.roles.includes('admin');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [testsSnap, exercisesSnap] = await Promise.all([
        getDocs(collection(db, 'performanceTests')),
        getDocs(collection(db, 'exercises'))
      ]);

      const fetchedTests: PerformanceTest[] = [];
      testsSnap.forEach((docSnap) => {
        fetchedTests.push({ id: docSnap.id, ...docSnap.data() } as PerformanceTest);
      });

      const fetchedExercises: Exercise[] = [];
      exercisesSnap.forEach((docSnap) => {
        fetchedExercises.push({ id: docSnap.id, ...docSnap.data() } as Exercise);
      });

      setTests(fetchedTests);
      setExercises(fetchedExercises);
    } catch (err: any) {
      console.error(err);
      setError('Fehler beim Laden der Leistungstests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteTest = async (testId: string, title: string) => {
    if (!window.confirm(`Möchtest du den Leistungstest "${title}" wirklich löschen?`)) return;

    try {
      await deleteDoc(doc(db, 'performanceTests', testId));
      setTests((prev) => prev.filter((t) => t.id !== testId));
    } catch (err) {
      console.error(err);
      setError('Fehler beim Löschen des Leistungstests.');
    }
  };

  const handleOpenEditModal = (test: PerformanceTest) => {
    setTestToEdit(test);
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setTestToEdit(null);
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'scoring': return 'Scoring';
      case 'check': return 'Check';
      case 'rules': return 'Regeln/Sonstiges';
      case 'technique': return 'Technik';
      default: return type;
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <Typography variant="h4" component="h1" className="font-bold flex items-center gap-2" color="text.primary">
            <AssignmentIcon fontSize="large" color="primary" /> Leistungstests
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Zusammengestellte Tests für Leistungsmessungen.
          </Typography>
        </div>

        {canCreateTest && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => {
              setTestToEdit(null);
              setIsCreateModalOpen(true);
            }}
          >
            Neuen Leistungstest Erstellen
          </Button>
        )}
      </div>

      {error && <Alert severity="error" className="mb-4">{error}</Alert>}

      {tests.length === 0 ? (
        <Typography variant="body1" color="textSecondary" className="text-center py-8">
          Noch keine Leistungstests vorhanden.
        </Typography>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tests.map((test) => {
            const isOwnerOrAdmin = test.createdBy === userProfile?.uid || userProfile?.roles.includes('admin');

            return (
              <Card key={test.id} className="shadow-md flex flex-col justify-between">
                <CardContent>
                  <div className="flex justify-between items-start mb-2">
                    <Typography variant="h6" className="font-bold" color="text.primary">
                      {test.title}
                    </Typography>
                    {isOwnerOrAdmin && (
                      <div className="flex gap-1">
                        <IconButton 
                          size="small" 
                          color="primary" 
                          onClick={() => handleOpenEditModal(test)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="error" 
                          onClick={() => handleDeleteTest(test.id, test.title)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </div>
                    )}
                  </div>

                  <Chip 
                    label={getTypeName(test.exerciseType)} 
                    size="small" 
                    color="secondary" 
                    className="mb-3"
                  />

                  <Typography variant="body2" color="textSecondary" className="mb-4">
                    {test.description || 'Keine Beschreibung vorhanden.'}
                  </Typography>

                  <Typography variant="subtitle2" className="font-bold mb-1" color="text.primary">
                    Enthaltene Übungen ({test.exerciseIds.length}):
                  </Typography>

                  <List size="small" className="bg-gray-50 dark:bg-gray-800 rounded">
                    {test.exerciseIds.map((exId, idx) => {
                      const ex = exercises.find((e) => e.id === exId);
                      return (
                        <ListItem key={`${exId}-${idx}`} divider={idx < test.exerciseIds.length - 1}>
                          <ListItemText 
                            primary={`${idx + 1}. ${ex ? ex.title : 'Unbekannte Übung'}`} 
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                </CardContent>

                <CardActions className="p-4 pt-0">
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    startIcon={<PlayArrowIcon />}
                    onClick={() => setSelectedTestForRecord(test)}
                  >
                    Test absolvieren
                  </Button>
                </CardActions>
              </Card>
            );
          })}
        </div>
      )}

      <CreateTestModal
        open={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        onTestCreated={fetchData}
        testToEdit={testToEdit}
      />

      <RecordResultModal
        open={!!selectedTestForRecord}
        onClose={() => setSelectedTestForRecord(null)}
        test={selectedTestForRecord}
        allExercises={exercises}
        onResultRecorded={() => alert('Leistungstest-Ergebnis erfolgreich gespeichert!')}
      />
    </div>
  );
};
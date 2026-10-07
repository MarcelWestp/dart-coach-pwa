import React, { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import {
  Paper,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  Box,
  LinearProgress,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import NotificationsIcon from "@mui/icons-material/Notifications";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import BarChartIcon from "@mui/icons-material/BarChart";
import SportsKabaddiIcon from "@mui/icons-material/SportsKabaddi";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";

interface WidgetConfig {
  id: string;
  title: string;
  enabled: boolean;
  required?: boolean;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: "notifications", title: "Neue & Ungelesene Benachrichtigungen", enabled: true, required: true },
  { id: "trainingPlan", title: "Fortschritt Trainingsplan", enabled: true },
  { id: "performanceTest", title: "Leistungstest", enabled: true },
  { id: "exerciseOfTheMonth", title: "Übung des Monats (Top 3 & Platz)", enabled: true },
  { id: "stats7Days", title: "Allgemeine Statistik (letzte 7 Tage)", enabled: true },
  { id: "performanceLeague", title: "Performance League (Optionale Top 3 / Platz)", enabled: false },
  { id: "matchLeague", title: "Match League (Statistik mit Nachbarn)", enabled: false },
  { id: "favoriteExercises", title: "Bis zu 3 Lieblingsübungen", enabled: false },
];

export const DashboardLandingPage: React.FC = () => {
  const { userProfile, refreshUserProfile } = useAuth();
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Lade gespeicherte Widgets aus dem UserProfile beim Start
  useEffect(() => {
    if (userProfile?.dashboardWidgets && Array.isArray(userProfile.dashboardWidgets)) {
      // Stelle sicher, dass neue Standard-Widgets nicht fehlen falls welche hinzukamen
      const savedWidgets = userProfile.dashboardWidgets;
      const merged = DEFAULT_WIDGETS.map((def) => {
        const found = savedWidgets.find((s: WidgetConfig) => s.id === def.id);
        return found ? { ...def, enabled: found.enabled } : def;
      });
      // Sortiere nach gespeicherter Reihenfolge falls gewünscht oder übernehme sie komplett
      setWidgets(savedWidgets);
    }
  }, [userProfile]);

  // Funktion zum Speichern in Firestore
  const saveWidgetsToFirestore = async (updatedWidgets: WidgetConfig[]) => {
    if (!userProfile) return;
    setSaving(true);
    try {
      const userRef = doc(db, "users", userProfile.uid);
      await updateDoc(userRef, {
        dashboardWidgets: updatedWidgets,
        updatedAt: new Date().toISOString(),
      });
      await refreshUserProfile();
    } catch (err) {
      console.error("Fehler beim Speichern des Dashboards:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newWidgets = [...widgets];
    const temp = newWidgets[index];
    newWidgets[index] = newWidgets[index - 1];
    newWidgets[index - 1] = temp;
    setWidgets(newWidgets);
    saveWidgetsToFirestore(newWidgets);
  };

  const handleMoveDown = (index: number) => {
    if (index === widgets.length - 1) return;
    const newWidgets = [...widgets];
    const temp = newWidgets[index];
    newWidgets[index] = newWidgets[index + 1];
    newWidgets[index + 1] = temp;
    setWidgets(newWidgets);
    saveWidgetsToFirestore(newWidgets);
  };

  const handleToggleWidget = (id: string) => {
    const newWidgets = widgets.map((w) =>
      w.id === id && !w.required ? { ...w, enabled: !w.enabled } : w
    );
    setWidgets(newWidgets);
    saveWidgetsToFirestore(newWidgets);
  };

  // Render-Funktionen für die Widgets mit Material UI Box/Paper (damit sie im Dark Mode korrekt dunkel bleiben)
  const renderWidgetContent = (id: string) => {
    switch (id) {
      case "notifications":
        return (
          <Paper
            variant="outlined"
            sx={{ p: 3, bgcolor: "background.paper", borderColor: "divider", borderLeft: 4, borderLeftColor: "primary.main" }}
            className="shadow-sm"
          >
            <div className="flex items-center gap-2 mb-3">
              <NotificationsIcon color="primary" />
              <Typography variant="h6" className="font-bold" color="text.primary">
                Benachrichtigungen
              </Typography>
            </div>
            <div className="space-y-2">
              <Box sx={{ p: 2, bgcolor: "action.hover", borderRadius: 1 }} className="flex justify-between items-center">
                <Typography variant="body2" color="text.primary">Dein Trainer hat dir einen neuen Trainingsplan zugewiesen.</Typography>
                <span className="text-xs text-gray-400">Vor 2 Std.</span>
              </Box>
              <Box sx={{ p: 2, bgcolor: "action.hover", borderRadius: 1 }} className="flex justify-between items-center">
                <Typography variant="body2" color="text.primary">Ergebnis für "Übung des Monats" wurde gewertet.</Typography>
                <span className="text-xs text-gray-400">Gestern</span>
              </Box>
            </div>
          </Paper>
        );

      case "trainingPlan":
        return (
          <Paper variant="outlined" sx={{ p: 3, bgcolor: "background.paper", borderColor: "divider" }} className="shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <FitnessCenterIcon color="primary" />
              <Typography variant="h6" className="font-bold" color="text.primary">
                Aktueller Trainingsplan
              </Typography>
            </div>
            <Typography variant="body2" color="text.secondary" className="mb-2">
              Wochenplan KW 14: Kraft & Scoring
            </Typography>
            <div className="flex justify-between text-sm mb-1 font-medium">
              <span>Fortschritt</span>
              <span>75%</span>
            </div>
            <LinearProgress variant="determinate" value={75} className="rounded h-2" />
          </Paper>
        );

      case "performanceTest":
        return (
          <Paper variant="outlined" sx={{ p: 3, bgcolor: "background.paper", borderColor: "divider" }} className="shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUpIcon color="primary" />
              <Typography variant="h6" className="font-bold" color="text.primary">
                Leistungstest
              </Typography>
            </div>
            <Typography variant="body2" color="text.primary" className="mb-2">
              Nächster / Letzter Test: <strong>Monatstest März 2026</strong>
            </Typography>
            <Button variant="outlined" size="small">
              Details ansehen
            </Button>
          </Paper>
        );

      case "exerciseOfTheMonth":
        return (
          <Paper variant="outlined" sx={{ p: 3, bgcolor: "background.paper", borderColor: "divider" }} className="shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <EmojiEventsIcon color="primary" />
              <Typography variant="h6" className="font-bold" color="text.primary">
                Übung des Monats (Around the Clock)
              </Typography>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Typography variant="subtitle2" className="font-semibold mb-1" color="text.secondary">
                  Top 3 Spieler
                </Typography>
                <ul className="space-y-1 text-sm">
                  <li style={{ color: 'inherit' }}>🥇 Max Mustermann – 140 Pkt.</li>
                  <li style={{ color: 'inherit' }}>🥈 Lisa Schmidt – 125 Pkt.</li>
                  <li style={{ color: 'inherit' }}>🥉 Tom Becker – 110 Pkt.</li>
                </ul>
              </div>
              <Box sx={{ p: 2, bgcolor: "action.hover", borderRadius: 1 }} className="flex flex-col justify-center">
                <Typography variant="subtitle2" className="font-semibold text-primary-main">
                  Dein aktueller Platz
                </Typography>
                <Typography variant="h5" className="font-bold" color="text.primary">
                  Platz 7
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Mit 85 Punkten in der Wertung
                </Typography>
              </Box>
            </div>
          </Paper>
        );

      case "stats7Days":
        return (
          <Paper variant="outlined" sx={{ p: 3, bgcolor: "background.paper", borderColor: "divider" }} className="shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <BarChartIcon color="primary" />
              <Typography variant="h6" className="font-bold" color="text.primary">
                Allgemeine Statistik (Letzte 7 Tage)
              </Typography>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <Box sx={{ p: 2, bgcolor: "action.hover", borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">Absolvierte Übungen</Typography>
                <Typography variant="h6" className="font-bold" color="text.primary">14</Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: "action.hover", borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">Trainingseinheiten</Typography>
                <Typography variant="h6" className="font-bold" color="text.primary">4</Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: "action.hover", borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">Gesamtpunkte</Typography>
                <Typography variant="h6" className="font-bold" color="text.primary">1.420</Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: "action.hover", borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">Ø Trefferquote</Typography>
                <Typography variant="h6" className="font-bold" color="text.primary">34.5%</Typography>
              </Box>
            </div>
          </Paper>
        );

      case "performanceLeague":
        return (
          <Paper variant="outlined" sx={{ p: 3, bgcolor: "background.paper", borderColor: "divider" }} className="shadow-sm border-dashed">
            <div className="flex items-center gap-2 mb-2">
              <EmojiEventsIcon color="action" />
              <Typography variant="h6" className="font-bold" color="text.primary">
                Performance League (Optional)
              </Typography>
            </div>
            <Typography variant="body2" color="text.secondary" className="mb-2">
              Top 3 und deine aktuelle Platzierung im Ligensystem.
            </Typography>
            <div className="text-sm space-y-1">
              <p style={{ color: 'inherit' }}>1. Alex (1800 Elo) | 2. Sarah (1750 Elo) | 3. Ben (1680 Elo)</p>
              <p className="font-semibold text-primary-main">Dein Platz: 5 (1550 Elo)</p>
            </div>
          </Paper>
        );

      case "matchLeague":
        return (
          <Paper variant="outlined" sx={{ p: 3, bgcolor: "background.paper", borderColor: "divider" }} className="shadow-sm border-dashed">
            <div className="flex items-center gap-2 mb-2">
              <SportsKabaddiIcon color="action" />
              <Typography variant="h6" className="font-bold" color="text.primary">
                Match League – Direkter Vergleich (Optional)
              </Typography>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <Box sx={{ p: 1.5, bgcolor: "action.hover", borderRadius: 1 }} className="flex justify-between">
                <span style={{ color: 'inherit' }}>4. Vorläufer: Kevin</span>
                <span style={{ color: 'inherit' }}>1450 Elo</span>
              </Box>
              <Box sx={{ p: 1.5, bgcolor: "primary.main", color: "primary.contrastText", borderRadius: 1 }} className="flex justify-between font-bold">
                <span>5. Du</span>
                <span>1420 Elo</span>
              </Box>
              <Box sx={{ p: 1.5, bgcolor: "action.hover", borderRadius: 1 }} className="flex justify-between">
                <span style={{ color: 'inherit' }}>6. Verfolger: Chris</span>
                <span style={{ color: 'inherit' }}>1390 Elo</span>
              </Box>
            </div>
          </Paper>
        );

      case "favoriteExercises":
        return (
          <Paper variant="outlined" sx={{ p: 3, bgcolor: "background.paper", borderColor: "divider" }} className="shadow-sm border-dashed">
            <div className="flex items-center gap-2 mb-2">
              <FitnessCenterIcon color="action" />
              <Typography variant="h6" className="font-bold" color="text.primary">
                Deine Top 3 Lieblingsübungen (Optional)
              </Typography>
            </div>
            <ul className="list-disc list-inside text-sm space-y-1" style={{ color: 'inherit' }}>
              <li>Around the Clock (Scoring)</li>
              <li>Checkout 50 (Check)</li>
              <li>Bulls Eye Master (Technique)</li>
            </ul>
          </Paper>
        );

      default:
        return null;
    }
  };

  return (
    <Box className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Kopfbereich */}
      <Paper variant="outlined" sx={{ p: 3, bgcolor: "background.paper", borderColor: "divider" }} className="flex flex-wrap justify-between items-center gap-4 shadow-sm">
        <div>
          <Typography variant="h5" className="font-bold" color="text.primary">
            Willkommen zurück, {userProfile?.nickname || "Spieler"}!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Dein persönlicher Trainingsüberblick auf einen Blick. {saving && "(Speichere Layout...)"}
          </Typography>
        </div>
        <Button
          variant="contained"
          startIcon={<SettingsIcon />}
          onClick={() => setIsCustomizeOpen(true)}
        >
          Dashboard anpassen
        </Button>
      </Paper>

      {/* Widgets */}
      <div className="space-y-4">
        {widgets
          .filter((w) => w.enabled)
          .map((widget) => (
            <React.Fragment key={widget.id}>
              {renderWidgetContent(widget.id)}
            </React.Fragment>
          ))}
      </div>

      {/* Anpassungs-Modal */}
      <Dialog open={isCustomizeOpen} onClose={() => setIsCustomizeOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle className="font-bold">Dashboard anpassen</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="textSecondary" className="mb-4">
            Passe die Reihenfolge an oder schalte optionale Widgets ein und aus. Deine Einstellungen werden automatisch im Profil gespeichert.
          </Typography>
          <div className="space-y-3">
            {widgets.map((widget, index) => (
              <Box key={widget.id} sx={{ bgcolor: "action.hover", borderColor: "divider" }} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  <Typography variant="body2" className="font-medium" color="text.primary">{widget.title}</Typography>
                  {widget.required && <span className="text-xs bg-primary-main text-white px-1.5 py-0.5 rounded">Pflicht</span>}
                </div>
                <div className="flex items-center gap-1">
                  <IconButton
                    size="small"
                    disabled={index === 0}
                    onClick={() => handleMoveUp(index)}
                  >
                    <ArrowUpwardIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    disabled={index === widgets.length - 1}
                    onClick={() => handleMoveDown(index)}
                  >
                    <ArrowDownwardIcon fontSize="small" />
                  </IconButton>
                  {!widget.required && (
                    <Switch
                      checked={widget.enabled}
                      onChange={() => handleToggleWidget(widget.id)}
                      color="primary"
                    />
                  )}
                </div>
              </Box>
            ))}
          </div>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setIsCustomizeOpen(false)}>
            Fertig
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
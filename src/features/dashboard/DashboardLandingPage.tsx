import React, { useState } from "react";
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

export const DashboardLandingPage: React.FC = () => {
  // Widget-Konfiguration für die Personalisierung
  const [widgets, setWidgets] = useState<WidgetConfig[]>([
    { id: "notifications", title: "Neue & Ungelesene Benachrichtigungen", enabled: true, required: true },
    { id: "trainingPlan", title: "Fortschritt Trainingsplan", enabled: true },
    { id: "performanceTest", title: "Leistungstest", enabled: true },
    { id: "exerciseOfTheMonth", title: "Übung des Monats (Top 3 & Platz)", enabled: true },
    { id: "stats7Days", title: "Allgemeine Statistik (letzte 7 Tage)", enabled: true },
    { id: "performanceLeague", title: "Performance League (Optionale Top 3 / Platz)", enabled: false },
    { id: "matchLeague", title: "Match League (Statistik mit Nachbarn)", enabled: false },
    { id: "favoriteExercises", title: "Bis zu 3 Lieblingsübungen", enabled: false },
  ]);

  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);

  // Widget nach oben bewegen
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newWidgets = [...widgets];
    const temp = newWidgets[index];
    newWidgets[index] = newWidgets[index - 1];
    newWidgets[index - 1] = temp;
    setWidgets(newWidgets);
  };

  // Widget nach unten bewegen
  const handleMoveDown = (index: number) => {
    if (index === widgets.length - 1) return;
    const newWidgets = [...widgets];
    const temp = newWidgets[index];
    newWidgets[index] = newWidgets[index + 1];
    newWidgets[index + 1] = temp;
    setWidgets(newWidgets);
  };

  // Widget ein-/ausschalten
  const handleToggleWidget = (id: string) => {
    setWidgets(
      widgets.map((w) => (w.id === id && !w.required ? { ...w, enabled: !w.enabled } : w))
    );
  };

  // Render-Funktionen für die einzelnen Widgets
  const renderWidgetContent = (id: string) => {
    switch (id) {
      case "notifications":
        return (
          <div id="section-notifications" className="scroll-mt-20">
            <Paper variant="outlined" className="p-4 shadow-sm border-l-4 border-l-primary-main">
              <div className="flex items-center gap-2 mb-3">
                <NotificationsIcon color="primary" />
                <Typography variant="h6" className="font-bold">
                  Benachrichtigungen
                </Typography>
              </div>
              <div className="space-y-2">
                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded flex justify-between items-center">
                  <Typography variant="body2">Dein Trainer hat dir einen neuen Trainingsplan zugewiesen.</Typography>
                  <span className="text-xs text-gray-400">Vor 2 Std.</span>
                </div>
                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded flex justify-between items-center">
                  <Typography variant="body2">Ergebnis für "Übung des Monats" wurde gewertet.</Typography>
                  <span className="text-xs text-gray-400">Gestern</span>
                </div>
              </div>
            </Paper>
          </div>
        );

      case "trainingPlan":
        return (
          <div id="section-training-plan" className="scroll-mt-20">
            <Paper variant="outlined" className="p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <FitnessCenterIcon color="primary" />
                <Typography variant="h6" className="font-bold">
                  Aktueller Trainingsplan
                </Typography>
              </div>
              <Typography variant="body2" color="textSecondary" className="mb-2">
                Wochenplan KW 14: Kraft & Scoring
              </Typography>
              <div className="flex justify-between text-sm mb-1 font-medium">
                <span>Fortschritt</span>
                <span>75%</span>
              </div>
              <LinearProgress variant="determinate" value={75} className="rounded h-2" />
            </Paper>
          </div>
        );

      case "performanceTest":
        return (
          <div id="section-performance-test" className="scroll-mt-20">
            <Paper variant="outlined" className="p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUpIcon color="primary" />
                <Typography variant="h6" className="font-bold">
                  Leistungstest
                </Typography>
              </div>
              <Typography variant="body2" className="mb-2">
                Nächster / Letzter Test: <strong>Monatstest März 2026</strong>
              </Typography>
              <Button variant="outlined" size="small" href="#section-performance-test">
                Details ansehen
              </Button>
            </Paper>
          </div>
        );

      case "exerciseOfTheMonth":
        return (
          <div id="section-exercise-month" className="scroll-mt-20">
            <Paper variant="outlined" className="p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <EmojiEventsIcon color="primary" />
                <Typography variant="h6" className="font-bold">
                  Übung des Monats (Around the Clock)
                </Typography>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Typography variant="subtitle2" className="font-semibold text-gray-500 mb-1">
                    Top 3 Spieler
                  </Typography>
                  <ul className="space-y-1 text-sm">
                    <li>🥇 Max Mustermann – 140 Pkt.</li>
                    <li>🥈 Lisa Schmidt – 125 Pkt.</li>
                    <li>🥉 Tom Becker – 110 Pkt.</li>
                  </ul>
                </div>
                <div className="flex flex-col justify-center bg-primary-50/30 dark:bg-gray-800 p-3 rounded">
                  <Typography variant="subtitle2" className="font-semibold text-primary-main">
                    Dein aktueller Platz
                  </Typography>
                  <Typography variant="h5" className="font-bold">
                    Platz 7
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Mit 85 Punkten in der Wertung
                  </Typography>
                </div>
              </div>
            </Paper>
          </div>
        );

      case "stats7Days":
        return (
          <div id="section-stats-7days" className="scroll-mt-20">
            <Paper variant="outlined" className="p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <BarChartIcon color="primary" />
                <Typography variant="h6" className="font-bold">
                  Allgemeine Statistik (Letzte 7 Tage)
                </Typography>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <Typography variant="caption" color="textSecondary">Absolvierte Übungen</Typography>
                  <Typography variant="h6" className="font-bold">14</Typography>
                </div>
                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <Typography variant="caption" color="textSecondary">Trainingseinheiten</Typography>
                  <Typography variant="h6" className="font-bold">4</Typography>
                </div>
                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <Typography variant="caption" color="textSecondary">Gesamtpunkte</Typography>
                  <Typography variant="h6" className="font-bold">1.420</Typography>
                </div>
                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <Typography variant="caption" color="textSecondary">Ø Trefferquote</Typography>
                  <Typography variant="h6" className="font-bold">34.5%</Typography>
                </div>
              </div>
            </Paper>
          </div>
        );

      case "performanceLeague":
        return (
          <div id="section-performance-league" className="scroll-mt-20">
            <Paper variant="outlined" className="p-4 shadow-sm border-dashed border-primary-300">
              <div className="flex items-center gap-2 mb-2">
                <EmojiEventsIcon color="action" />
                <Typography variant="h6" className="font-bold">
                  Performance League (Optional)
                </Typography>
              </div>
              <Typography variant="body2" color="textSecondary" className="mb-2">
                Top 3 und deine aktuelle Platzierung im Ligensystem.
              </Typography>
              <div className="text-sm space-y-1">
                <p>1. Alex (1800 Elo) | 2. Sarah (1750 Elo) | 3. Ben (1680 Elo)</p>
                <p className="font-semibold text-primary-main">Dein Platz: 5 (1550 Elo)</p>
              </div>
            </Paper>
          </div>
        );

      case "matchLeague":
        return (
          <div id="section-match-league" className="scroll-mt-20">
            <Paper variant="outlined" className="p-4 shadow-sm border-dashed border-primary-300">
              <div className="flex items-center gap-2 mb-2">
                <SportsKabaddiIcon color="action" />
                <Typography variant="h6" className="font-bold">
                  Match League – Direkter Vergleich (Optional)
                </Typography>
              </div>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <span>4. Vorläufer: Kevin</span>
                  <span>1450 Elo</span>
                </div>
                <div className="flex justify-between p-2 bg-primary-100/50 dark:bg-gray-700 rounded font-bold">
                  <span>5. Du</span>
                  <span>1420 Elo</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <span>6. Verfolger: Chris</span>
                  <span>1390 Elo</span>
                </div>
              </div>
            </Paper>
          </div>
        );

      case "favoriteExercises":
        return (
          <div id="section-favorite-exercises" className="scroll-mt-20">
            <Paper variant="outlined" className="p-4 shadow-sm border-dashed border-primary-300">
              <div className="flex items-center gap-2 mb-2">
                <FitnessCenterIcon color="action" />
                <Typography variant="h6" className="font-bold">
                  Deine Top 3 Lieblingsübungen (Optional)
                </Typography>
              </div>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Around the Clock (Scoring)</li>
                <li>Checkout 50 (Check)</li>
                <li>Bulls Eye Master (Technique)</li>
              </ul>
            </Paper>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Box className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Kopfbereich & Anpassungs-Button */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border">
        <div>
          <Typography variant="h5" className="font-bold">
            Willkommen zurück, Spieler!
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Dein persönlicher Trainingsüberblick auf einen Blick.
          </Typography>
        </div>
        <Button
          variant="contained"
          startIcon={<SettingsIcon />}
          onClick={() => setIsCustomizeOpen(true)}
        >
          Dashboard anpassen
        </Button>
      </div>

      {/* Dynamisch gerenderte Widgets */}
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
            Passe die Reihenfolge an oder schalte optionale Widgets ein und aus. Das Benachrichtigungs-Widget ist fest fixiert.
          </Typography>
          <div className="space-y-3">
            {widgets.map((widget, index) => (
              <div key={widget.id} className="flex items-center justify-between p-2 border rounded bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{widget.title}</span>
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
              </div>
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
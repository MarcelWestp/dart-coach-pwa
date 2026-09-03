import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProviderCustom, useThemeContext } from "./context/ThemeContext";
import { LoginForm } from "./features/auth/LoginForm";
import { RegisterForm } from "./features/auth/RegisterForm";
import { AdminDashboard } from "./features/admin/AdminDashboard";
import { ExerciseList } from "./features/exercises/ExerciseList";
import { TestList } from "./features/exercises/TestList";
import { UserProfileView } from "./features/profile/UserProfileView";
import { CoachRoster } from "./features/training-plans/CoachRoster";
import { CoachPlanList } from "./features/training-plans/CoachPlanList";
import { PlayerPlanView } from "./features/training-plans/PlayerPlanView";
import { ProtectedRoute } from "./components/common/ProtectedRoute";
import { Navbar } from "./components/layout/Navbar";
import { LeagueView } from "./features/league/LeagueView";
import { AdminLeagueManager } from "./features/league/AdminLeagueManager";
import { GroupManager } from "./features/groups/GroupManager";
import { PlayerStatsView } from "./features/stats/PlayerStatsView";
import { CoachStatsView } from "./features/stats/CoachStatsView";
import { 
  Paper, 
  Box, 
  Button, 
  Menu, 
  MenuItem 
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";

const MainContent: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const { setThemeMode } = useThemeContext();
  const [isRegistering, setIsRegistering] = useState(false);

  // Navigations-State ('player-plan', 'league', 'player-stats', 'exercises', 'tests', 'coach-plans', 'roster', 'groups', 'coach-stats', 'admin-league', 'admin-dashboard', 'profile')
  const [activeView, setActiveView] = useState<string>("player-plan");

  // Dropdown Menü-Anchors
  const [trainingAnchor, setTrainingAnchor] = useState<null | HTMLElement>(null);
  const [libraryAnchor, setLibraryAnchor] = useState<null | HTMLElement>(null);
  const [coachAnchor, setCoachAnchor] = useState<null | HTMLElement>(null);
  const [adminAnchor, setAdminAnchor] = useState<null | HTMLElement>(null);

  useEffect(() => {
    if (userProfile?.themePreference) {
      setThemeMode(userProfile.themePreference);
    }
  }, [userProfile?.themePreference]);

  if (!currentUser) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "background.default",
          color: "text.primary",
          transition: "background-color 0.3s ease, color 0.3s ease",
        }}
      >
        <Navbar />
        {isRegistering ? (
          <RegisterForm onSwitchToLogin={() => setIsRegistering(false)} />
        ) : (
          <LoginForm onSwitchToRegister={() => setIsRegistering(true)} />
        )}
      </Box>
    );
  }

  const isAdmin = userProfile?.roles.includes("admin");
  const isCoach = userProfile?.roles.includes("coach") || isAdmin;

  const handleSelectView = (viewKey: string) => {
    setActiveView(viewKey);
    setTrainingAnchor(null);
    setLibraryAnchor(null);
    setCoachAnchor(null);
    setAdminAnchor(null);
  };

  return (
    <ProtectedRoute>
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "background.default",
          color: "text.primary",
          transition: "background-color 0.3s ease, color 0.3s ease",
        }}
      >
        <Navbar onOpenProfile={() => setActiveView("profile")} />

        {/* Strukturierte Hauptnavigation */}
        <div className="max-w-6xl mx-auto px-6 mt-4">
          <Paper className="shadow-sm p-2 flex items-center justify-start gap-2 flex-wrap">
            
            {/* 1. KATEGORIE: Mein Training */}
            <Button
              startIcon={<FitnessCenterIcon />}
              endIcon={<KeyboardArrowDownIcon />}
              variant={["player-plan", "league", "player-stats"].includes(activeView) ? "contained" : "text"}
              onClick={(e) => setTrainingAnchor(e.currentTarget)}
            >
              Mein Training
            </Button>
            <Menu
              anchorEl={trainingAnchor}
              open={Boolean(trainingAnchor)}
              onClose={() => setTrainingAnchor(null)}
            >
              <MenuItem onClick={() => handleSelectView("player-plan")}>
                Mein Trainingsplan
              </MenuItem>
              <MenuItem onClick={() => handleSelectView("league")}>
                Trainingsliga & Ranglisten
              </MenuItem>
              <MenuItem onClick={() => handleSelectView("player-stats")}>
                Meine Statistiken
              </MenuItem>
            </Menu>

            {/* 2. KATEGORIE: Bibliotheken */}
            <Button
              startIcon={<MenuBookIcon />}
              endIcon={<KeyboardArrowDownIcon />}
              variant={["exercises", "tests"].includes(activeView) ? "contained" : "text"}
              onClick={(e) => setLibraryAnchor(e.currentTarget)}
            >
              Bibliotheken
            </Button>
            <Menu
              anchorEl={libraryAnchor}
              open={Boolean(libraryAnchor)}
              onClose={() => setLibraryAnchor(null)}
            >
              <MenuItem onClick={() => handleSelectView("exercises")}>
                Übungs-Bibliothek
              </MenuItem>
              <MenuItem onClick={() => handleSelectView("tests")}>
                Leistungstests
              </MenuItem>
            </Menu>

            {/* 3. KATEGORIE: Trainer-Bereich (Nur Coach/Admin) */}
            {isCoach && (
              <>
                <Button
                  startIcon={<SupervisorAccountIcon />}
                  endIcon={<KeyboardArrowDownIcon />}
                  variant={["coach-plans", "roster", "groups", "coach-stats"].includes(activeView) ? "contained" : "text"}
                  onClick={(e) => setCoachAnchor(e.currentTarget)}
                >
                  Trainer-Bereich
                </Button>
                <Menu
                  anchorEl={coachAnchor}
                  open={Boolean(coachAnchor)}
                  onClose={() => setCoachAnchor(null)}
                >
                  <MenuItem onClick={() => handleSelectView("coach-plans")}>
                    Trainingsplan-Erstellung
                  </MenuItem>
                  <MenuItem onClick={() => handleSelectView("roster")}>
                    Mein Kader
                  </MenuItem>
                  <MenuItem onClick={() => handleSelectView("groups")}>
                    Gruppen-Verwaltung
                  </MenuItem>
                  <MenuItem onClick={() => handleSelectView("coach-stats")}>
                    Kader-Statistiken
                  </MenuItem>
                </Menu>
              </>
            )}

            {/* 4. KATEGORIE: Administration (Nur Admin) */}
            {isAdmin && (
              <>
                <Button
                  startIcon={<AdminPanelSettingsIcon />}
                  endIcon={<KeyboardArrowDownIcon />}
                  variant={["admin-league", "admin-dashboard"].includes(activeView) ? "contained" : "text"}
                  onClick={(e) => setAdminAnchor(e.currentTarget)}
                >
                  Administration
                </Button>
                <Menu
                  anchorEl={adminAnchor}
                  open={Boolean(adminAnchor)}
                  onClose={() => setAdminAnchor(null)}
                >
                  <MenuItem onClick={() => handleSelectView("admin-league")}>
                    Liga-Verwaltung
                  </MenuItem>
                  <MenuItem onClick={() => handleSelectView("admin-dashboard")}>
                    Admin-Dashboard
                  </MenuItem>
                </Menu>
              </>
            )}

          </Paper>
        </div>

        {/* Hauptinhalt je nach ausgewählter Ansicht */}
        <main className="py-6">
          {activeView === "player-plan" && <PlayerPlanView />}
          {activeView === "league" && <LeagueView />}
          {activeView === "player-stats" && <PlayerStatsView />}
          {activeView === "exercises" && <ExerciseList />}
          {activeView === "tests" && <TestList />}

          {isCoach && activeView === "coach-plans" && <CoachPlanList myRoster={[]} />}
          {isCoach && activeView === "roster" && <CoachRoster />}
          {isCoach && activeView === "groups" && <GroupManager />}
          {isCoach && activeView === "coach-stats" && <CoachStatsView />}

          {isAdmin && activeView === "admin-league" && <AdminLeagueManager />}
          {isAdmin && activeView === "admin-dashboard" && (
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          )}

          {activeView === "profile" && <UserProfileView />}
        </main>
      </Box>
    </ProtectedRoute>
  );
};

export default function App() {
  return (
    <ThemeProviderCustom>
      <AuthProvider>
        <MainContent />
      </AuthProvider>
    </ThemeProviderCustom>
  );
}
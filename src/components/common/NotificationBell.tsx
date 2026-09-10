import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import {
  IconButton,
  Badge,
  Popover,
  Typography,
  List,
  ListItemText,
  Divider,
  Button,
  Box,
  Tooltip,
  ListItemButton,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import DeleteIcon from "@mui/icons-material/Delete";
import AssignmentIcon from "@mui/icons-material/Assignment";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

export interface AppNotification {
  id: string;
  userId: string;
  type:
    | "newOrUpdatedTrainingPlans"
    | "newOrUpdatedPerformanceTest"
    | "monthlyExerciseHighscore"
    | "trainingPlanReminder";
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationBellProps {
  onNavigate?: (viewKey: string) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onNavigate }) => {
  const { userProfile } = useAuth();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  // Realtime-Subscription für Benachrichtigungen des Benutzers
  useEffect(() => {
    if (!userProfile?.uid) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userProfile.uid),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched: AppNotification[] = [];
        snapshot.forEach((docSnap) => {
          fetched.push({
            id: docSnap.id,
            ...docSnap.data(),
          } as AppNotification);
        });

        // Nach Erstellungsdatum absteigend sortieren
        fetched.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setNotifications(fetched);
      },
      (error) => {
        console.error("Fehler beim Laden der Benachrichtigungen:", error);
      },
    );

    return () => unsubscribe();
  }, [userProfile?.uid]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? "notification-popover" : undefined;

  // Einzelne Benachrichtigung als gelesen markieren
  const handleMarkAsRead = async (notifId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await updateDoc(doc(db, "notifications", notifId), {
        read: true,
      });
    } catch (err) {
      console.error("Fehler beim Aktualisieren der Benachrichtigung:", err);
    }
  };

  // Alle als gelesen markieren
  const handleMarkAllAsRead = async () => {
    if (!userProfile) return;
    try {
      const batch = writeBatch(db);
      notifications
        .filter((n) => !n.read)
        .forEach((n) => {
          const ref = doc(db, "notifications", n.id);
          batch.update(ref, { read: true });
        });
      await batch.commit();
    } catch (err) {
      console.error("Fehler beim Markieren aller Benachrichtigungen:", err);
    }
  };

  // Einzelne Benachrichtigung löschen
  const handleDelete = async (notifId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, "notifications", notifId));
    } catch (err) {
      console.error("Fehler beim Löschen der Benachrichtigung:", err);
    }
  };

  // Bei Klick auf Benachrichtigung navigieren & als gelesen markieren
  const handleNotificationClick = (notif: AppNotification) => {
    if (!notif.read) {
      handleMarkAsRead(notif.id);
    }
    if (notif.link) {
      if (onNavigate) {
        onNavigate(notif.link);
      } else if (notif.link.startsWith("http")) {
        window.location.href = notif.link;
      }
      handleClose();
    }
  };

  // Icon je nach Benachrichtigungstyp auswählen
  const getNotificationIcon = (type: AppNotification["type"]) => {
    switch (type) {
      case "newOrUpdatedTrainingPlans":
        return <AssignmentIcon color="primary" />;
      case "newOrUpdatedPerformanceTest":
        return <FitnessCenterIcon color="secondary" />;
      case "monthlyExerciseHighscore":
        return <EmojiEventsIcon sx={{ color: "#EAB308" }} />;
      case "trainingPlanReminder":
        return <AccessTimeIcon color="warning" />;
      default:
        return <NotificationsIcon color="action" />;
    }
  };

  return (
    <>
      <Tooltip title="Benachrichtigungen">
        <IconButton color="inherit" onClick={handleClick} aria-describedby={id}>
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        slotProps={{
          paper: {
            className: "w-80 sm:w-96 max-h-[500px] flex flex-col shadow-xl",
          },
        }}
      >
        {/* Header */}
        <Box className="p-4 flex items-center justify-between border-b">
          <Typography variant="h6" className="font-bold text-base">
            Benachrichtigungen
          </Typography>
          {unreadCount > 0 && (
            <Button
              size="small"
              startIcon={<MarkEmailReadIcon />}
              onClick={handleMarkAllAsRead}
              className="text-xs"
            >
              Alle gelesen
            </Button>
          )}
        </Box>

        {/* List */}
        <Box className="overflow-y-auto flex-1">
          {notifications.length === 0 ? (
            <Typography
              variant="body2"
              color="textSecondary"
              className="p-6 text-center"
            >
              Keine Benachrichtigungen vorhanden.
            </Typography>
          ) : (
            <List disablePadding>
              {notifications.map((notif) => (
                <React.Fragment key={notif.id}>
                  <ListItemButton
                    onClick={() => handleNotificationClick(notif)}
                    className={`flex items-start gap-3 p-3 transition-colors ${
                      !notif.read
                        ? "bg-primary-50/20 dark:bg-primary-900/10 font-semibold"
                        : "opacity-80"
                    }`}
                  >
                    <Box className="mt-1 flex-shrink-0">
                      {getNotificationIcon(notif.type)}
                    </Box>

                    <ListItemText
                      primary={
                        <Box className="flex justify-between items-baseline gap-2">
                          <Typography
                            variant="subtitle2"
                            className={`text-sm ${!notif.read ? "font-bold" : "font-medium"}`}
                          >
                            {notif.title}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="textSecondary"
                            className="whitespace-nowrap text-[10px]"
                          >
                            {new Date(notif.createdAt).toLocaleDateString(
                              "de-DE",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Typography
                          variant="body2"
                          color="textSecondary"
                          className="text-xs mt-0.5 line-clamp-2"
                        >
                          {notif.message}
                        </Typography>
                      }
                    />

                    {/* Actions */}
                    <Box className="flex flex-col items-center gap-1 flex-shrink-0">
                      {!notif.read && (
                        <Tooltip title="Als gelesen markieren">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={(e) => handleMarkAsRead(notif.id, e)}
                          >
                            <Box className="w-2 h-2 rounded-full bg-primary-main" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Löschen">
                        <IconButton
                          size="small"
                          color="default"
                          className="opacity-50 hover:opacity-100"
                          onClick={(e) => handleDelete(notif.id, e)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </ListItemButton>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>
      </Popover>
    </>
  );
};
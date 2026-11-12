import React from "react";
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Chip,
  Button,
} from "@mui/material";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import PendingIcon from "@mui/icons-material/HourglassEmpty";
import CancelIcon from "@mui/icons-material/Cancel";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

// Schnittstelle für die aggregierten Lizenzen
export interface UserLicenseItem {
  id: string;
  title: string;
  issuer: string;
  validUntil?: string;
  fileUrl: string;
  fileType: "pdf" | "image";
  status: "approved" | "rejected" | "pending";
  createdAt: string;
  userId: string;
  userName?: string;
  userEmail: string;
}

interface TrainerLicenseManagementProps {
  licenses: UserLicenseItem[];
  onUpdateStatus: (
    userId: string,
    licenseId: string,
    newStatus: "approved" | "rejected" | "pending"
  ) => void;
}

export const TrainerLicenseManagement: React.FC<TrainerLicenseManagementProps> = ({
  licenses,
  onUpdateStatus,
}) => {
  return (
    <Box className="flex flex-col gap-4">
      <Typography
        variant="h6"
        className="font-bold text-base sm:text-lg"
        color="text.primary"
      >
        Trainer-Lizenzen Verifikation ({licenses.length})
      </Typography>

      <Typography variant="body2" color="text.secondary">
        Prüfe die hochgeladenen Zertifikate der Trainer und schalte sie für
        das öffentliche Spielerprofil frei.
      </Typography>

      {licenses.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            bgcolor: "background.paper",
            borderColor: "divider",
            p: 4,
            textAlign: "center",
          }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
            className="italic"
          >
            Es wurden bisher keine Trainer-Lizenzen hochgeladen.
          </Typography>
        </Paper>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {licenses.map((license) => (
            <Card
              key={license.id}
              variant="outlined"
              sx={{ bgcolor: "background.paper", borderColor: "divider" }}
            >
              <CardContent className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <Box className="space-y-1">
                  <Box className="flex items-center gap-2 flex-wrap">
                    <Typography
                      variant="subtitle1"
                      className="font-bold"
                      color="text.primary"
                    >
                      {license.title}
                    </Typography>

                    {license.status === "approved" && (
                      <Chip
                        icon={<VerifiedUserIcon fontSize="small" />}
                        label="Verifiziert"
                        color="success"
                        size="small"
                      />
                    )}
                    {license.status === "pending" && (
                      <Chip
                        icon={<PendingIcon fontSize="small" />}
                        label="Prüfung ausstehend"
                        color="warning"
                        size="small"
                      />
                    )}
                    {license.status === "rejected" && (
                      <Chip
                        icon={<CancelIcon fontSize="small" />}
                        label="Abgelehnt"
                        color="error"
                        size="small"
                      />
                    )}
                  </Box>

                  <Typography variant="body2" color="text.secondary">
                    Trainer: <strong>{license.userName}</strong> (
                    {license.userEmail})
                  </Typography>

                  <Typography
                    variant="caption"
                    color="text.secondary"
                    className="block"
                  >
                    Ausgestellt von: <strong>{license.issuer}</strong>
                    {license.validUntil && (
                      <>
                        {" "}
                        • Gültig bis:{" "}
                        {new Date(license.validUntil).toLocaleDateString(
                          "de-DE"
                        )}
                      </>
                    )}
                  </Typography>
                </Box>

                <Box className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<VisibilityIcon />}
                    onClick={() => window.open(license.fileUrl, "_blank")}
                  >
                    Dokument Ansehen
                  </Button>

                  {license.status !== "approved" && (
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      startIcon={<CheckCircleIcon />}
                      onClick={() =>
                        onUpdateStatus(
                          license.userId,
                          license.id,
                          "approved"
                        )
                      }
                    >
                      Verifizieren
                    </Button>
                  )}

                  {license.status !== "rejected" && (
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<CancelIcon />}
                      onClick={() =>
                        onUpdateStatus(
                          license.userId,
                          license.id,
                          "rejected"
                        )
                      }
                    >
                      Ablehnen
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Box>
  );
};
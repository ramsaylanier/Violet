import { useState } from "react";
import { Loader2 } from "lucide-react";
import { ConfirmationDialog } from "@/components/shared/ConfirmationDialog";

interface RemoveProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  onConfirm: () => Promise<void>;
  error?: string | null;
}

export function RemoveProjectDialog({
  open,
  onOpenChange,
  projectName,
  onConfirm,
  error,
}: RemoveProjectDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onConfirm();
    } catch (err) {
      console.error("Failed to remove project:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Remove GitHub Project"
      description={
        <>
          Are you sure you want to remove the GitHub Project integration?
          This will unlink the project from this Violet project, but will not
          delete the GitHub Project itself.
        </>
      }
      confirmLabel="Remove"
      cancelLabel="Cancel"
      onConfirm={handleConfirm}
      loading={loading}
      variant="destructive"
    >
      {error && <div className="text-sm text-destructive">{error}</div>}
    </ConfirmationDialog>
  );
}

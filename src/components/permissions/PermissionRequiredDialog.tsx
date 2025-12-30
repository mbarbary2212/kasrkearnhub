import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PermissionRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleLabel: string;
  allowedScopeLabel: string;
  targetModuleLabel: string;
}

export function PermissionRequiredDialog({
  open,
  onOpenChange,
  roleLabel,
  allowedScopeLabel,
  targetModuleLabel,
}: PermissionRequiredDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Permission required</AlertDialogTitle>
          <AlertDialogDescription>
            You are logged in as a {roleLabel} for {allowedScopeLabel}. You don't have
            permission to add or upload content to {targetModuleLabel}. Please switch
            module or contact the Super Admin.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>OK</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

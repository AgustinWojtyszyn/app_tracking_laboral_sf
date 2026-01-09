
import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ConfirmationModal({ 
  trigger, 
  title = "¿Estás seguro?", 
  description = "Esta acción no se puede deshacer.",
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  variant = "destructive"
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {trigger}
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-background text-foreground border border-border shadow-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-bold text-foreground">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-background text-foreground hover:bg-accent hover:text-accent-foreground">{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => {
                onConfirm(e);
            }}
            className={variant === "destructive" 
              ? "bg-red-600 hover:bg-red-700 text-white" 
              : "bg-[#1e3a8a] hover:bg-blue-900 text-white"}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

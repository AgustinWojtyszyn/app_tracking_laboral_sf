
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
      <AlertDialogContent className="bg-white border-none shadow-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-bold text-gray-900">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-600">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-gray-100 hover:bg-gray-200 text-gray-800 border-none">{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => {
                onConfirm(e);
            }}
            className={variant === "destructive" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-[#1e3a8a] hover:bg-blue-900 text-white"}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

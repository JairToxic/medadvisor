"use client";
import Swal, { type SweetAlertIcon } from "sweetalert2";

const baseClasses = {
  popup: "ma-swal-popup",
  title: "ma-swal-title",
  htmlContainer: "ma-swal-html",
  confirmButton: "ma-swal-confirm",
  cancelButton: "ma-swal-cancel",
  actions: "ma-swal-actions",
};

export function avisar(text: string, icon: SweetAlertIcon = "info", title?: string) {
  return Swal.fire({
    title: title ?? "",
    text,
    icon,
    confirmButtonText: "OK",
    customClass: baseClasses,
    buttonsStyling: false,
  });
}

export async function confirmar(opciones: {
  title: string;
  text?: string;
  confirmText?: string;
  cancelText?: string;
  icon?: SweetAlertIcon;
  danger?: boolean;
}): Promise<boolean> {
  const r = await Swal.fire({
    title: opciones.title,
    text: opciones.text,
    icon: opciones.icon ?? "warning",
    showCancelButton: true,
    confirmButtonText: opciones.confirmText ?? "Sí",
    cancelButtonText: opciones.cancelText ?? "Cancelar",
    reverseButtons: true,
    focusCancel: true,
    customClass: {
      ...baseClasses,
      confirmButton: opciones.danger ? "ma-swal-confirm danger" : "ma-swal-confirm",
    },
    buttonsStyling: false,
  });
  return r.isConfirmed;
}

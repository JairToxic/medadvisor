import { notFound } from "next/navigation";
import { PantallaChat } from "@/componentes/PantallaChat";
import { obtenerPaciente } from "@/lib/pacientes-azure";
import { cargarHistorial } from "@/lib/historial-azure";

export const dynamic = "force-dynamic";

interface PaginaProps {
  params: Promise<{ paciente: string }>;
}

export default async function Pagina({ params }: PaginaProps) {
  const { paciente: id } = await params;
  const paciente = await obtenerPaciente(id);
  if (!paciente) notFound();
  const historial = await cargarHistorial(id);
  return <PantallaChat paciente={paciente} historial={historial} />;
}

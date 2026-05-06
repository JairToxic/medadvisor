import { notFound } from "next/navigation";
import { PantallaChat } from "@/componentes/PantallaChat";
import { ID_PACIENTES, PACIENTES, esPacienteValido } from "@/datos/pacientes";

export function generateStaticParams() {
  return ID_PACIENTES.map((paciente) => ({ paciente }));
}

interface PaginaProps {
  params: Promise<{ paciente: string }>;
}

export default async function Pagina({ params }: PaginaProps) {
  const { paciente: id } = await params;
  if (!esPacienteValido(id)) notFound();
  return <PantallaChat paciente={PACIENTES[id]} />;
}

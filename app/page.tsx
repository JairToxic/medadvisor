import { PantallaLogin } from "@/componentes/PantallaLogin";
import { listarPacientes } from "@/lib/pacientes-azure";

export const dynamic = "force-dynamic";

export default async function Pagina() {
  const pacientes = await listarPacientes();
  return <PantallaLogin pacientes={pacientes} />;
}

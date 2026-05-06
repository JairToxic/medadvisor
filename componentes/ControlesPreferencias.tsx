"use client";

import { Moon, Sun } from "@/componentes/Iconos";
import { usePreferencias } from "@/componentes/ProveedorPreferencias";

export function ControlesPreferencias() {
  const { tema, idioma, alternarTema, setIdioma } = usePreferencias();

  return (
    <>
      <div className="seg" role="group" aria-label="Idioma">
        <button className={idioma === "es" ? "on" : ""} onClick={() => setIdioma("es")}>ES</button>
        <button className={idioma === "en" ? "on" : ""} onClick={() => setIdioma("en")}>EN</button>
      </div>
      <button
        className="icon-btn"
        onClick={alternarTema}
        title={tema === "light" ? "Tema oscuro" : "Tema claro"}
        aria-label="Alternar tema"
      >
        {tema === "light" ? <Moon s={15} /> : <Sun s={15} />}
      </button>
    </>
  );
}

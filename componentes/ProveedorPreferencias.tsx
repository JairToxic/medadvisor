"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { TEXTOS, type Textos } from "@/lib/i18n";
import type { Idioma, Tema } from "@/lib/tipos";

interface PreferenciasCtx {
  tema: Tema;
  idioma: Idioma;
  textos: Textos;
  alternarTema: () => void;
  setIdioma: (i: Idioma) => void;
}

const Ctx = createContext<PreferenciasCtx | null>(null);

const CLAVE_TEMA = "medadvisor:tema";
const CLAVE_IDIOMA = "medadvisor:idioma";

export function ProveedorPreferencias({ children }: { children: React.ReactNode }) {
  const [tema, setTema] = useState<Tema>("light");
  const [idioma, setIdiomaState] = useState<Idioma>("es");

  useEffect(() => {
    const t = (localStorage.getItem(CLAVE_TEMA) as Tema | null) ?? "light";
    const l = (localStorage.getItem(CLAVE_IDIOMA) as Idioma | null) ?? "es";
    setTema(t);
    setIdiomaState(l);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tema);
    try { localStorage.setItem(CLAVE_TEMA, tema); } catch {}
  }, [tema]);

  useEffect(() => {
    try { localStorage.setItem(CLAVE_IDIOMA, idioma); } catch {}
  }, [idioma]);

  const alternarTema = useCallback(() => {
    setTema((t) => (t === "light" ? "dark" : "light"));
  }, []);

  const setIdioma = useCallback((i: Idioma) => setIdiomaState(i), []);

  const valor = useMemo<PreferenciasCtx>(
    () => ({ tema, idioma, textos: TEXTOS[idioma], alternarTema, setIdioma }),
    [tema, idioma, alternarTema, setIdioma],
  );

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function usePreferencias() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePreferencias debe usarse dentro de ProveedorPreferencias");
  return v;
}

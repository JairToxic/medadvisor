import type { Mensaje } from "@/lib/tipos";

function renderEnriquecido(text: string) {
  const partes = text.split(/(\*\*[^*]+\*\*)/g);
  return partes.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    }
    return <span key={i}>{p}</span>;
  });
}

export function BurbujaMensaje({ mensaje }: { mensaje: Mensaje }) {
  if (mensaje.role === "user") {
    return (
      <div className="msg-row user">
        <div className="msg user">{mensaje.text}</div>
      </div>
    );
  }
  return (
    <div className="msg-row" style={{ paddingLeft: 24 }}>
      <div className="bot-avatar">M+</div>
      <div className="msg bot">
        {renderEnriquecido(mensaje.text)}
        {mensaje.streaming ? <span className="caret" /> : null}
      </div>
    </div>
  );
}

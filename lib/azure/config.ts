function requerido(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(
      `Falta la variable de entorno ${nombre}. Revisa .env.local (o las variables del despliegue).`,
    );
  }
  return valor;
}

export const config = {
  openai: {
    endpoint: requerido("AZURE_OPENAI_ENDPOINT"),
    apiKey: requerido("AZURE_OPENAI_API_KEY"),
    apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? "2024-10-21",
    chatDeployment: requerido("AZURE_OPENAI_DEPLOYMENT_CHAT"),
    embedDeployment: requerido("AZURE_OPENAI_DEPLOYMENT_EMBED"),
  },
  docIntel: {
    endpoint: requerido("AZURE_DOCINTEL_ENDPOINT"),
    apiKey: requerido("AZURE_DOCINTEL_API_KEY"),
  },
  search: {
    endpoint: requerido("AZURE_SEARCH_ENDPOINT"),
    apiKey: requerido("AZURE_SEARCH_API_KEY"),
    indiceHospitales: process.env.AZURE_SEARCH_INDEX_HOSPITALES ?? "hospitales",
  },
  storage: {
    connectionString: requerido("AZURE_STORAGE_CONNECTION_STRING"),
    contenedorPolizas: process.env.AZURE_STORAGE_CONTAINER_POLIZAS ?? "polizas",
  },
  speech: {
    key: requerido("AZURE_SPEECH_KEY"),
    region: process.env.AZURE_SPEECH_REGION ?? "eastus",
    voiceEs: process.env.AZURE_SPEECH_VOICE_ES ?? "es-EC-AndreaNeural",
    voiceEn: process.env.AZURE_SPEECH_VOICE_EN ?? "en-US-JennyNeural",
  },
};

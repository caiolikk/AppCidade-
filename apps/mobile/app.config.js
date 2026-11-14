// Configuração dinâmica do Expo. A base continua em app.json; aqui só entram valores que
// vêm do ambiente e que não podem ser versionados (app.json não lê variáveis de ambiente).
//
// GOOGLE_MAPS_ANDROID_API_KEY: necessária para o mapa no Android fora do Expo Go
// (development build, preview, produção). No EAS, cadastre-a como variável de ambiente
// do projeto (`eas env:create`); localmente, coloque-a em apps/mobile/.env (o Expo carrega
// o .env da pasta do app, não o da raiz do monorepo).
// EAS_PROJECT_ID: preenchido por `eas init`, ou definido no ambiente.

module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;
  const easProjectId = process.env.EAS_PROJECT_ID ?? config.extra?.eas?.projectId;

  return {
    ...config,
    android: {
      ...config.android,
      ...(googleMapsApiKey
        ? {
            config: {
              ...config.android?.config,
              googleMaps: { apiKey: googleMapsApiKey },
            },
          }
        : {}),
    },
    extra: {
      ...config.extra,
      ...(easProjectId ? { eas: { projectId: easProjectId } } : {}),
    },
  };
};

module.exports = ({ config }) => {
  const googleMapsApiKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    "";

  return {
    ...config,
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
    },
    plugins: [
      ...(config.plugins || []),
      [
        "react-native-maps",
        {
          androidGoogleMapsApiKey: googleMapsApiKey,
        },
      ],
    ],
  };
};

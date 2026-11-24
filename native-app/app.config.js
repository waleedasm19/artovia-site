module.exports = ({ config }) => {
  if (process.env.ARTOVIA_ANDROID_PREVIEW !== '1') return config;

  return {
    ...config,
    android: {
      ...config.android,
      package: `${config.android.package}.preview`,
    },
  };
};

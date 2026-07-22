// Utility: Map AQI to color codes and labels
export const getAqiColor = (aqi) => {
  if (aqi <= 50) return '#22c55e'; // Green
  if (aqi <= 100) return '#84cc16'; // Lime
  if (aqi <= 200) return '#eab308'; // Yellow
  if (aqi <= 300) return '#f97316'; // Orange
  if (aqi <= 400) return '#ef4444'; // Red
  return '#a855f7'; // Purple (Severe)
};

export const getAqiLabel = (aqi) => {
  if (aqi <= 50)  return 'Good';
  if (aqi <= 100) return 'Satisfactory';
  if (aqi <= 200) return 'Moderate';
  if (aqi <= 300) return 'Poor';
  if (aqi <= 400) return 'Very Poor';
  return 'Severe';
};

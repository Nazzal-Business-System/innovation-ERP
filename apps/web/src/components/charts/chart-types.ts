export const CHART_VISUALIZATION_TYPES = [
  "area",
  "line",
  "bar",
  "horizontalBar",
  "pie",
  "donut",
  "radar",
  "composed",
  "metric",
  "table",
] as const;

export type ChartVisualizationType = (typeof CHART_VISUALIZATION_TYPES)[number];

export const CHART_TYPE_LABEL_KEYS: Record<ChartVisualizationType, string> = {
  area: "charts.type.area",
  line: "charts.type.line",
  bar: "charts.type.bar",
  horizontalBar: "charts.type.horizontalBar",
  pie: "charts.type.pie",
  donut: "charts.type.donut",
  radar: "charts.type.radar",
  composed: "charts.type.composed",
  metric: "charts.type.metric",
  table: "charts.type.table",
};

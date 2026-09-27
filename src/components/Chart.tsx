import { useEffect, useRef } from "react";
import * as echarts from "echarts";

// Chart series colours come from the --chart-N tokens so charts follow the design system.
// Tokens are OKLCH; zrender only parses rgb/hex, so normalise through a canvas context.
function palette(): string[] {
  const cs = getComputedStyle(document.documentElement);
  const ctx = document.createElement("canvas").getContext("2d");
  return [1, 2, 3, 4, 5, 6, 7]
    .map((i) => cs.getPropertyValue(`--chart-${i}`).trim())
    .filter(Boolean)
    .map((c) => {
      if (!ctx) return c;
      ctx.fillStyle = c;
      return String(ctx.fillStyle);
    });
}

interface ChartProps {
  option: echarts.EChartsOption;
  height?: number;
  ariaLabel: string;
}

/** Thin ECharts wrapper handling init, resize, and disposal. */
export function Chart({ option, height = 300, ariaLabel }: ChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    const colors = palette();
    chart.setOption({ color: colors, ...option });
    const onResize = () => chart.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.dispose();
    };
  }, [option]);
  return <div ref={ref} className="chart-box" style={{ height }} role="img" aria-label={ariaLabel} />;
}

export function pieOption(title: string, data: { name: string; value: number }[]): echarts.EChartsOption {
  return {
    title: { text: title, left: "center", textStyle: { fontSize: 14 } },
    tooltip: { trigger: "item" },
    legend: { bottom: 0, type: "scroll" },
    series: [{ type: "pie", radius: ["35%", "62%"], data, label: { formatter: "{b}: {c}" } }],
  };
}

export function barOption(title: string, data: { name: string; value: number }[], horizontal = false): echarts.EChartsOption {
  const cat = { type: "category" as const, data: data.map((d) => d.name), axisLabel: { interval: 0, rotate: horizontal ? 0 : 25, fontSize: 11 } };
  const val = { type: "value" as const };
  return {
    title: { text: title, left: "center", textStyle: { fontSize: 14 } },
    tooltip: { trigger: "axis" },
    grid: { left: horizontal ? 140 : 50, right: 20, bottom: 60, top: 40 },
    xAxis: horizontal ? val : cat,
    yAxis: horizontal ? cat : val,
    series: [{ type: "bar", data: data.map((d) => d.value), itemStyle: { borderRadius: 3 } }],
  };
}

export function lineOption(title: string, categories: string[], values: number[]): echarts.EChartsOption {
  return {
    title: { text: title, left: "center", textStyle: { fontSize: 14 } },
    tooltip: { trigger: "axis" },
    grid: { left: 50, right: 20, bottom: 50, top: 40 },
    xAxis: { type: "category", data: categories, axisLabel: { fontSize: 10 } },
    yAxis: { type: "value" },
    series: [{ type: "line", data: values, smooth: true, areaStyle: { opacity: 0.15 } }],
  };
}

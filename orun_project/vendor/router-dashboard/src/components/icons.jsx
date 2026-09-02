import React from "react";

const s = (svg) => (props) =>
  React.createElement("svg", { width: 16, height: 16, viewBox: "0 0 16 16", fill: "none", ...props }, svg);

export const IconDashboard = s([
  React.createElement("rect", { key: 1, x: 1.5, y: 1.5, width: 5, height: 5, rx: 1, stroke: "currentColor", strokeWidth: 1.2 }),
  React.createElement("rect", { key: 2, x: 9.5, y: 1.5, width: 5, height: 5, rx: 1, stroke: "currentColor", strokeWidth: 1.2 }),
  React.createElement("rect", { key: 3, x: 1.5, y: 9.5, width: 5, height: 5, rx: 1, stroke: "currentColor", strokeWidth: 1.2 }),
  React.createElement("rect", { key: 4, x: 9.5, y: 9.5, width: 5, height: 5, rx: 1, stroke: "currentColor", strokeWidth: 1.2 }),
]);

export const IconCombos = s([
  React.createElement("path", { key: 1, d: "M2 4h12M2 8h8M2 12h10", stroke: "currentColor", strokeWidth: 1.2, strokeLinecap: "round" }),
]);

export const IconProviders = s([
  React.createElement("circle", { key: 1, cx: 8, cy: 8, r: 3, stroke: "currentColor", strokeWidth: 1.2 }),
  React.createElement("path", { key: 2, d: "M8 1v2M8 13v2M1 8h2M13 8h2", stroke: "currentColor", strokeWidth: 1.2, strokeLinecap: "round" }),
]);

export const IconUsage = s([
  React.createElement("path", { key: 1, d: "M1 14V6l3-2 3 3 3-5 3 2v10H1z", stroke: "currentColor", strokeWidth: 1.2, strokeLinecap: "round", strokeLinejoin: "round" }),
]);

export const IconHealth = s([
  React.createElement("path", { key: 1, d: "M8 14s5.5-3.5 5.5-7.5C13.5 3.5 11 1 8 1S2.5 3.5 2.5 6.5 8 14 8 14z", stroke: "currentColor", strokeWidth: 1.2 }),
  React.createElement("path", { key: 2, d: "M8 3v4l2.5 1.5", stroke: "currentColor", strokeWidth: 1.2, strokeLinecap: "round" }),
]);

export const IconConsole = s([
  React.createElement("rect", { key: 1, x: 1.5, y: 2.5, width: 13, height: 11, rx: 1.5, stroke: "currentColor", strokeWidth: 1.2 }),
  React.createElement("path", { key: 2, d: "M4 7l2.5 2L4 11", stroke: "currentColor", strokeWidth: 1.2, strokeLinecap: "round", strokeLinejoin: "round" }),
  React.createElement("path", { key: 3, d: "M8 11h4", stroke: "currentColor", strokeWidth: 1.2, strokeLinecap: "round" }),
]);

export const IconChat = s([
  React.createElement("path", { key: 1, d: "M2 3h12v7a1 1 0 01-1 1H5l-3 3V4a1 1 0 011-1z", stroke: "currentColor", strokeWidth: 1.2, strokeLinecap: "round", strokeLinejoin: "round" }),
]);

export const IconTokenSaver = s([
  React.createElement("circle", { key: 1, cx: 8, cy: 8, r: 5.5, stroke: "currentColor", strokeWidth: 1.2 }),
  React.createElement("path", { key: 2, d: "M8 4.5v7M5.5 6.5h5M5.5 9.5h5", stroke: "currentColor", strokeWidth: 1.2, strokeLinecap: "round" }),
]);

export const IconTranslator = s([
  React.createElement("path", { key: 1, d: "M2 4h6M5 1v3", stroke: "currentColor", strokeWidth: 1.2, strokeLinecap: "round", strokeLinejoin: "round" }),
  React.createElement("path", { key: 2, d: "M2 4c0 3 2.5 5 6 7", stroke: "currentColor", strokeWidth: 1.2, strokeLinecap: "round" }),
  React.createElement("path", { key: 3, d: "M10 9c1.5 1 3 2.5 4 4M14 7c-1 1.5-2.5 3-4 4", stroke: "currentColor", strokeWidth: 1.2, strokeLinecap: "round" }),
]);

export const IconProxyPool = s([
  React.createElement("circle", { key: 1, cx: 8, cy: 4, r: 2, stroke: "currentColor", strokeWidth: 1.2 }),
  React.createElement("circle", { key: 2, cx: 4, cy: 12, r: 2, stroke: "currentColor", strokeWidth: 1.2 }),
  React.createElement("circle", { key: 3, cx: 12, cy: 12, r: 2, stroke: "currentColor", strokeWidth: 1.2 }),
  React.createElement("path", { key: 4, d: "M8 6v2M5.5 10L7 8.5M10.5 10L9 8.5", stroke: "currentColor", strokeWidth: 1, strokeLinecap: "round" }),
]);

export const IconTunnel = s([
  React.createElement("path", { key: 1, d: "M2 8h12", stroke: "currentColor", strokeWidth: 1.2, strokeLinecap: "round" }),
  React.createElement("path", { key: 2, d: "M4 4l-2 4 2 4", stroke: "currentColor", strokeWidth: 1.2, strokeLinecap: "round", strokeLinejoin: "round" }),
  React.createElement("path", { key: 3, d: "M12 4l2 4-2 4", stroke: "currentColor", strokeWidth: 1.2, strokeLinecap: "round", strokeLinejoin: "round" }),
  React.createElement("circle", { key: 4, cx: 8, cy: 8, r: 1.5, stroke: "currentColor", strokeWidth: 1.2 }),
]);

export const IconCli = s([
  React.createElement("path", { key: 1, d: "M5 4l-3 4 3 4", stroke: "currentColor", strokeWidth: 1.2, strokeLinecap: "round", strokeLinejoin: "round" }),
  React.createElement("path", { key: 2, d: "M11 4l3 4-3 4", stroke: "currentColor", strokeWidth: 1.2, strokeLinecap: "round", strokeLinejoin: "round" }),
]);

export const IconSettings = s([
  React.createElement("circle", { key: 1, cx: 8, cy: 8, r: 2, stroke: "currentColor", strokeWidth: 1.2 }),
  React.createElement("path", { key: 2, d: "M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41", stroke: "currentColor", strokeWidth: 1, strokeLinecap: "round" }),
]);

export const IconArrowRight = (props) =>
  React.createElement(
    "svg",
    { width: 12, height: 12, viewBox: "0 0 12 12", fill: "none", ...props },
    React.createElement("path", { d: "M1 6h10M7 2l4 4-4 4", stroke: "currentColor", strokeWidth: 1.2, strokeLinecap: "round", strokeLinejoin: "round" })
  );

export type Phase = "splash" | "boot" | "home";
export type HamptonState = "idle" | "listening" | "thinking" | "speaking";
export interface ToolCallInfo {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
}
export interface Message {
  id: string;
  role: "user" | "hampton";
  content: string;
  toolCalls?: ToolCallInfo[];
}

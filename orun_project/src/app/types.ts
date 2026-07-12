export type Phase = "splash" | "boot" | "home";
export type HamptonState = "idle" | "listening" | "thinking" | "speaking";
export interface Message {
  id: string;
  role: "user" | "hampton";
  content: string;
}

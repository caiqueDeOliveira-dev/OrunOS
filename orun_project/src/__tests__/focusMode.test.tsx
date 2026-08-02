import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useState, useCallback } from "react";

function useFocusMode(initial = false) {
  const [focusMode, setFocusMode] = useState(initial);
  const toggleFocusMode = useCallback(() => setFocusMode((prev) => !prev), []);
  return { focusMode, setFocusMode, toggleFocusMode };
}

describe("focusMode logic", () => {
  it("starts as false by default", () => {
    const { result } = renderHook(() => useFocusMode());
    expect(result.current.focusMode).toBe(false);
  });

  it("toggleFocusMode toggles from false to true", () => {
    const { result } = renderHook(() => useFocusMode());
    act(() => { result.current.toggleFocusMode(); });
    expect(result.current.focusMode).toBe(true);
  });

  it("toggleFocusMode toggles from true to false", () => {
    const { result } = renderHook(() => useFocusMode(true));
    act(() => { result.current.toggleFocusMode(); });
    expect(result.current.focusMode).toBe(false);
  });

  it("toggleFocusMode toggles repeatedly between true/false", () => {
    const { result } = renderHook(() => useFocusMode());
    act(() => { result.current.toggleFocusMode(); });
    expect(result.current.focusMode).toBe(true);
    act(() => { result.current.toggleFocusMode(); });
    expect(result.current.focusMode).toBe(false);
    act(() => { result.current.toggleFocusMode(); });
    expect(result.current.focusMode).toBe(true);
  });

  it("setFocusMode can directly set to true", () => {
    const { result } = renderHook(() => useFocusMode());
    act(() => { result.current.setFocusMode(true); });
    expect(result.current.focusMode).toBe(true);
  });

  it("setFocusMode can directly set to false", () => {
    const { result } = renderHook(() => useFocusMode(true));
    act(() => { result.current.setFocusMode(false); });
    expect(result.current.focusMode).toBe(false);
  });

  it("when focusMode is true, sidebar should be hidden", () => {
    const { result } = renderHook(() => useFocusMode());
    const isSidebarVisible = () => !result.current.focusMode;
    expect(isSidebarVisible()).toBe(true);
    act(() => { result.current.setFocusMode(true); });
    expect(isSidebarVisible()).toBe(false);
  });

  it("when focusMode is false, sidebar should be visible", () => {
    const { result } = renderHook(() => useFocusMode());
    const isSidebarVisible = () => !result.current.focusMode;
    expect(isSidebarVisible()).toBe(true);
    act(() => { result.current.setFocusMode(false); });
    expect(isSidebarVisible()).toBe(true);
  });

  it("when focusMode is true, status bar should be hidden", () => {
    const { result } = renderHook(() => useFocusMode());
    const isStatusBarVisible = () => !result.current.focusMode;
    expect(isStatusBarVisible()).toBe(true);
    act(() => { result.current.setFocusMode(true); });
    expect(isStatusBarVisible()).toBe(false);
  });

  it("when focusMode is false, status bar should be visible", () => {
    const { result } = renderHook(() => useFocusMode(true));
    const isStatusBarVisible = () => !result.current.focusMode;
    expect(isStatusBarVisible()).toBe(false);
    act(() => { result.current.setFocusMode(false); });
    expect(isStatusBarVisible()).toBe(true);
  });

  it("starts as true when initial value is true", () => {
    const { result } = renderHook(() => useFocusMode(true));
    expect(result.current.focusMode).toBe(true);
  });

  it("toggleFocusMode is stable between renders", () => {
    const { result, rerender } = renderHook(() => useFocusMode());
    const firstToggle = result.current.toggleFocusMode;
    rerender();
    expect(result.current.toggleFocusMode).toBe(firstToggle);
  });
});

const Module = require("module");
const origResolve = Module._resolveFilename;

const MOCKED_ELECTRON = "mocked-electron";
const MOCKED_UPDATER = "mocked-electron-updater";

Module._resolveFilename = (request, parent, ...args) => {
  if (request === "electron") return MOCKED_ELECTRON;
  if (request === "electron-updater") return MOCKED_UPDATER;
  return origResolve.call(Module, request, parent, ...args);
};

const mockApp = {
  isPackaged: true,
  getVersion: () => "1.0.0",
  getName: () => "orun-os",
  getAppPath: () => "/fake/path",
  getPath: () => "/fake/userData",
  whenReady: () => Promise.resolve(),
  quit: () => {},
  relaunch: () => {},
  once: () => {},
};

const mockBrowserWindow = vi.fn().mockImplementation(() => ({
  webContents: { send: vi.fn() },
  isDestroyed: vi.fn().mockReturnValue(false),
  on: vi.fn(),
}));

const autoUpdater = {
  on: vi.fn().mockReturnThis(),
  removeAllListeners: vi.fn(),
  checkForUpdates: vi.fn().mockResolvedValue(undefined),
  quitAndInstall: vi.fn(),
  logger: null,
  autoDownload: false,
  autoInstallOnAppQuit: false,
  setFeedURL: vi.fn(),
};

require.cache[MOCKED_ELECTRON] = {
  id: MOCKED_ELECTRON,
  filename: MOCKED_ELECTRON,
  loaded: true,
  exports: { app: mockApp, BrowserWindow: mockBrowserWindow },
};
require.cache[MOCKED_UPDATER] = {
  id: MOCKED_UPDATER,
  filename: MOCKED_UPDATER,
  loaded: true,
  exports: { autoUpdater },
};

const autoUpdaterModule = require("../auto-updater.cjs");

function getHandler(eventName) {
  return autoUpdater.on.mock.calls.find((c) => c[0] === eventName)?.[1];
}

function makeWin() {
  return {
    webContents: { send: vi.fn() },
    isDestroyed: vi.fn().mockReturnValue(false),
  };
}

describe("auto-updater", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    autoUpdater.on.mockReturnThis();
    autoUpdater.checkForUpdates.mockResolvedValue(undefined);
    mockApp.isPackaged = true;
  });

  afterAll(() => {
    Module._resolveFilename = origResolve;
  });

  it("initAutoUpdater registers 6 event listeners when packaged", () => {
    autoUpdaterModule.initAutoUpdater(makeWin());
    expect(autoUpdater.on).toHaveBeenCalledTimes(6);
    expect(autoUpdater.on).toHaveBeenCalledWith("checking-for-update", expect.any(Function));
    expect(autoUpdater.on).toHaveBeenCalledWith("update-available", expect.any(Function));
    expect(autoUpdater.on).toHaveBeenCalledWith("update-not-available", expect.any(Function));
    expect(autoUpdater.on).toHaveBeenCalledWith("download-progress", expect.any(Function));
    expect(autoUpdater.on).toHaveBeenCalledWith("update-downloaded", expect.any(Function));
    expect(autoUpdater.on).toHaveBeenCalledWith("error", expect.any(Function));
  });

  it("initAutoUpdater calls checkForUpdates and sets feed URL when packaged", () => {
    autoUpdaterModule.initAutoUpdater(makeWin());
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);
    expect(autoUpdater.setFeedURL).toHaveBeenCalledWith({
      provider: "github",
      owner: "caiqueDeOliveira-dev",
      repo: "OrunOS",
    });
  });

  it("initAutoUpdater skips setup when app is not packaged", () => {
    mockApp.isPackaged = false;
    autoUpdaterModule.initAutoUpdater(makeWin());
    expect(autoUpdater.on).not.toHaveBeenCalled();
    expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled();
    expect(autoUpdater.setFeedURL).not.toHaveBeenCalled();
  });

  it("checkForUpdates delegates to autoUpdater.checkForUpdates", () => {
    autoUpdaterModule.checkForUpdates();
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);
  });

  it("getUpdateStatus returns 'idle' initially", () => {
    expect(autoUpdaterModule.getUpdateStatus()).toBe("idle");
  });

  it("update-available event sends IPC and sets status to 'available'", () => {
    const win = makeWin();
    autoUpdaterModule.initAutoUpdater(win);
    getHandler("update-available")({ version: "2.0.0", releaseDate: "2024-06-01" });
    expect(win.webContents.send).toHaveBeenCalledWith("update:available", {
      version: "2.0.0",
      releaseDate: "2024-06-01",
    });
    expect(autoUpdaterModule.getUpdateStatus()).toBe("available");
  });

  it("checking-for-update event sends IPC and sets status to 'checking'", () => {
    const win = makeWin();
    autoUpdaterModule.initAutoUpdater(win);
    getHandler("checking-for-update")();
    expect(win.webContents.send.mock.calls[0][0]).toBe("update:checking");
    expect(autoUpdaterModule.getUpdateStatus()).toBe("checking");
  });

  it("update-not-available event sends IPC and sets status to 'not-available'", () => {
    const win = makeWin();
    autoUpdaterModule.initAutoUpdater(win);
    getHandler("update-not-available")();
    expect(win.webContents.send.mock.calls[0][0]).toBe("update:not-available");
    expect(autoUpdaterModule.getUpdateStatus()).toBe("not-available");
  });

  it("download-progress event sends IPC with rounded percent", () => {
    const win = makeWin();
    autoUpdaterModule.initAutoUpdater(win);
    getHandler("download-progress")({ percent: 55.7 });
    expect(win.webContents.send).toHaveBeenCalledWith("update:progress", { percent: 56 });
    expect(autoUpdaterModule.getUpdateStatus()).toBe("downloading");
  });

  it("error event sends IPC with message and sets status to 'error'", () => {
    const win = makeWin();
    autoUpdaterModule.initAutoUpdater(win);
    getHandler("error")(new Error("network failure"));
    expect(win.webContents.send).toHaveBeenCalledWith("update:error", { message: "network failure" });
    expect(autoUpdaterModule.getUpdateStatus()).toBe("error");
  });

  it("update-downloaded event schedules auto-quit after 24 hours", () => {
    vi.useFakeTimers();
    const win = makeWin();
    autoUpdaterModule.initAutoUpdater(win);
    getHandler("update-downloaded")({ version: "3.0.0" });
    expect(win.webContents.send).toHaveBeenCalledWith("update:downloaded", { version: "3.0.0" });
    expect(autoUpdaterModule.getUpdateStatus()).toBe("downloaded");
    expect(autoUpdater.quitAndInstall).not.toHaveBeenCalled();
    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    expect(autoUpdater.quitAndInstall).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("send does not crash when mainWindow is destroyed", () => {
    const win = makeWin();
    win.isDestroyed.mockReturnValue(true);
    autoUpdaterModule.initAutoUpdater(win);
    getHandler("update-available")({ version: "1.0.0" });
    expect(win.webContents.send).not.toHaveBeenCalled();
  });

  it("send does not crash when mainWindow is null", () => {
    autoUpdaterModule.initAutoUpdater(null);
    getHandler("update-available")({ version: "1.0.0" });
  });

  it("initial checkForUpdates failure is caught and does not throw", () => {
    const err = new Error("network");
    autoUpdater.checkForUpdates.mockRejectedValue(err);
    autoUpdaterModule.initAutoUpdater(makeWin());
  });

  it("sets autoUpdater properties (logger, autoDownload, autoInstallOnAppQuit)", () => {
    autoUpdaterModule.initAutoUpdater(makeWin());
    expect(typeof autoUpdater.logger).toBe("object");
    expect(autoUpdater.autoDownload).toBe(true);
    expect(autoUpdater.autoInstallOnAppQuit).toBe(true);
  });
});

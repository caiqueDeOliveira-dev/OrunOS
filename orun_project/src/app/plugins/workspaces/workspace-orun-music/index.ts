import { lazy } from "react";
import { registerPlugin } from "../../PluginRegistry";
import type { WorkspacePlugin } from "../../types";

const OrunMusicWorkspace = lazy(() =>
  import("./OrunMusicWorkspace").then((m) => ({ default: m.OrunMusicWorkspace }))
);

const plugin: WorkspacePlugin = {
  id: "OrunMusic",
  name: "Orun MÃºsica",
  version: "1.1.0",
  description: "Player de mÃºsica com Spotify, letras sincronizadas, playlists e rÃ¡dio",
  icon: "Music",
  requirements: { minRamMB: 256, estimatedRAMMB: 80, features: [] },
  tabs: null,
  components: { workspace: OrunMusicWorkspace },
};

registerPlugin(plugin);

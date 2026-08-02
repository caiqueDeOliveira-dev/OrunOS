import { registerWorkspaceActions, unregisterWorkspaceActions } from "../../lib/workspace-actions";
import { campaignActions, setMarketingStoreGetter as setCampaignStoreGetter } from "./campaign-actions";
import { postActions, setPostStoreGetter } from "./post-actions";
import { discordActions, setDiscordStoreGetter } from "./discord-actions";
import { schedulerActions, setSchedulerStoreGetter } from "./scheduler-actions";
import { calendarActions, setCalendarStoreGetter } from "./calendar-actions";
import { abTestActions, setABTestStoreGetter } from "./abtest-actions";

const WORKSPACE_ID = "Marketing";
let registered = false;

const actions = { ...campaignActions, ...postActions, ...discordActions, ...schedulerActions, ...calendarActions, ...abTestActions };

export function setMarketingStoreGetter(getter: unknown) {
  setCampaignStoreGetter(getter as () => any);
  setPostStoreGetter(getter as () => any);
  setDiscordStoreGetter(getter as () => any);
  setSchedulerStoreGetter(getter as () => any);
  setCalendarStoreGetter(getter as () => any);
  setABTestStoreGetter(getter as () => any);
}

export function registerMarketingActions() {
  if (registered) return;
  registered = true;
  registerWorkspaceActions(WORKSPACE_ID, actions);
}

export function unregisterMarketingActions() {
  if (!registered) return;
  registered = false;
  unregisterWorkspaceActions(WORKSPACE_ID);
}

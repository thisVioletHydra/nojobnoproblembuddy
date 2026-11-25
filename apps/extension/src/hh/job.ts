import { serverMode } from '../local/server-mode';
import { scanApplied, watchToasts } from './apply-watch';
import { dismissJobOffer } from './job-offer';
import { keepLiveLog, mountLiveLog } from './live-log';
import { keepMachine, mountMachine } from './machine-hud';
import { pullRemoteNegotiations, scanNegotiations } from './negotiations';
import { mountOverlay, refreshOverlay } from './overlay';
import { scanScreenQuestions, watchScreenQuestions } from './screen-questions';

const HOST_OK = /^(?:www\.)?hh\.ru$/i;

export function startHhJob(): void {
  if (window !== window.top)
    return;

  if (HOST_OK.test(location.hostname) === false)
    return;

  mountOverlay();
  mountLiveLog();
  mountMachine();
  watchToasts();
  watchScreenQuestions();
  void bootHistory();
  const timer = setInterval(async () => {
    try {
      if (await serverMode())
        return;
    }
    catch (error) {
      if (error instanceof Error && error.message.includes('Extension context invalidated')) {
        clearInterval(timer);

        return;
      }

      throw error;
    }

    if (document.getElementById('cc-hh-overlay') === null)
      mountOverlay();

    keepLiveLog();
    keepMachine();
    scanApplied();
    scanScreenQuestions();
    dismissJobOffer();
    scanNegotiations();
    void refreshOverlay();
  }, 500);
}

async function bootHistory(): Promise<void> {
  await pullRemoteNegotiations();
  await refreshOverlay();
}

import { useCallback, useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => isStandaloneMode());

  useEffect(() => {
    const refreshInstallState = () => {
      setIsInstalled(isStandaloneMode());
    };

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      refreshInstallState();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshInstallState();
      }
    };


    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("focus", refreshInstallState);
    window.addEventListener("pageshow", refreshInstallState);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("focus", refreshInstallState);
      window.removeEventListener("pageshow", refreshInstallState);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;

    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    const accepted = choiceResult.outcome === "accepted";

    if (accepted) {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
    return accepted;
  }, [deferredPrompt]);

  return {
    canInstall: !isInstalled && Boolean(deferredPrompt),
    isInstalled,
    install,
  };
}


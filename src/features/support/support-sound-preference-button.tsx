"use client";

import { Bell, BellOff } from "lucide-react";
import { useSyncExternalStore } from "react";

import { IconButton } from "@/components/ui/icon-button";
import {
  readSupportSoundPreference,
  writeSupportSoundPreference,
  type SupportSoundPreference,
} from "@/features/support/support-notifications";

const preferenceEvent = "bem-hub:support-sound-preference-change";

export function SupportSoundPreferenceButton() {
  const preference = useSyncExternalStore(
    subscribeToPreference,
    readSupportSoundPreference,
    getServerPreference,
  );

  function togglePreference() {
    const next = preference === "enabled" ? "disabled" : "enabled";
    writeSupportSoundPreference(next);
    window.dispatchEvent(new Event(preferenceEvent));
  }

  const enabled = preference === "enabled";

  return (
    <IconButton
      aria-pressed={enabled}
      label={enabled ? "Desativar som da fila" : "Ativar som da fila"}
      onClick={togglePreference}
      size="sm"
      variant={enabled ? "secondary" : "ghost"}
    >
      {enabled ? <Bell className="size-4" /> : <BellOff className="size-4" />}
    </IconButton>
  );
}

function subscribeToPreference(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(preferenceEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(preferenceEvent, callback);
  };
}

function getServerPreference(): SupportSoundPreference {
  return "disabled";
}

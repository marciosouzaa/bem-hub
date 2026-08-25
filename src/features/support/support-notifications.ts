export const SUPPORT_SOUND_NOTIFICATIONS_STORAGE_KEY =
  "bem-hub:support:sound-notifications";

const allowedMessageSources = new Set(["whatsapp_contact"]);
const maxRealtimeMessageAgeMs = 5 * 60 * 1000;

export type SupportSoundPreference = "disabled" | "enabled";

export type SupportRealtimePayload = {
  conversationAssignedTo?: string | null;
  entity?: string;
  messageActorId?: string | null;
  messageCreatedAt?: string | null;
  messageDirection?: string | null;
  messageSource?: string | null;
  messageStatus?: string | null;
  occurredAt?: string | null;
  operation?: string;
};

export type SupportSoundNotificationContext = {
  now?: Date;
  preference: SupportSoundPreference;
  viewerId: string;
};

export function readSupportSoundPreference(
  storage: Pick<Storage, "getItem"> | null = getBrowserStorage(),
): SupportSoundPreference {
  return storage?.getItem(SUPPORT_SOUND_NOTIFICATIONS_STORAGE_KEY) === "enabled"
    ? "enabled"
    : "disabled";
}

export function writeSupportSoundPreference(
  preference: SupportSoundPreference,
  storage: Pick<Storage, "setItem"> | null = getBrowserStorage(),
) {
  storage?.setItem(SUPPORT_SOUND_NOTIFICATIONS_STORAGE_KEY, preference);
}

export function shouldPlaySupportSoundNotification(
  payload: SupportRealtimePayload,
  context: SupportSoundNotificationContext,
) {
  if (context.preference !== "enabled") return false;
  if (payload.entity !== "support_messages") return false;
  if (payload.operation !== "insert") return false;
  if (payload.messageDirection !== "inbound") return false;
  if (payload.messageStatus !== "received") return false;
  if (payload.messageActorId && payload.messageActorId === context.viewerId) {
    return false;
  }
  if (!allowedMessageSources.has(payload.messageSource ?? "")) return false;
  if (
    payload.conversationAssignedTo
    && payload.conversationAssignedTo !== context.viewerId
  ) {
    return false;
  }

  const eventTime = Date.parse(payload.messageCreatedAt ?? payload.occurredAt ?? "");
  if (!Number.isFinite(eventTime)) return false;

  const now = context.now?.getTime() ?? Date.now();
  return Math.abs(now - eventTime) <= maxRealtimeMessageAgeMs;
}

export async function playSupportNotificationSound() {
  const audioWindow = window as Window & {
    webkitAudioContext?: typeof AudioContext;
  };
  const AudioContextConstructor =
    window.AudioContext || audioWindow.webkitAudioContext || null;
  if (!AudioContextConstructor) return;

  const audio = new AudioContextConstructor();
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, audio.currentTime);
  gain.gain.setValueAtTime(0.0001, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18, audio.currentTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.18);
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + 0.2);
  window.setTimeout(() => void audio.close(), 300);
}

function getBrowserStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

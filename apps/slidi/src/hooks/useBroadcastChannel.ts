import { useEffect, useRef, useCallback } from "react";

/**
 * Manages a BroadcastChannel subscription. Opens the channel on mount,
 * closes it on unmount or when channelId changes. Uses a stable ref for the
 * message handler so it never needs to re-open the channel when the callback
 * changes.
 *
 * Returns a `post` helper that creates a one-shot BC to send a message
 * (avoids receiving your own messages on the same subscriber instance).
 */
export function useBroadcastChannel(
  channelId: string | null,
  onMessage: ((data: unknown) => void) | null
): { post: (data: unknown) => void } {
  // Keep the latest callback in a ref so the effect doesn't need it as a dep.
  const onMessageRef = useRef(onMessage);
  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);

  useEffect(() => {
    if (!channelId || typeof BroadcastChannel === "undefined") return;
    const bc = new BroadcastChannel(channelId);
    bc.onmessage = (e) => onMessageRef.current?.(e.data);
    return () => bc.close();
  }, [channelId]);

  const post = useCallback(
    (data: unknown) => {
      if (!channelId || typeof BroadcastChannel === "undefined") return;
      const bc = new BroadcastChannel(channelId);
      bc.postMessage(data);
      bc.close();
    },
    [channelId]
  );

  return { post };
}

import { createApp, h } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBrowserNotification } from "./useBrowserNotification";
import { usePomodoroTimer } from "./usePomodoroTimer";

let unmount: () => void;
let permission: NotificationPermission;
const requestPermission = vi.fn();
const close = vi.fn();
const show = vi.fn();

function mount() {
  let notifications!: ReturnType<typeof useBrowserNotification>;
  let timer!: ReturnType<typeof usePomodoroTimer>;
  const app = createApp({
    setup() {
      notifications = useBrowserNotification();
      timer = usePomodoroTimer((mode) => {
        if (mode === "focus") notifications.notifyFocusComplete();
      });
      return () => h("div");
    },
  });
  app.mount(document.createElement("div"));
  unmount = () => app.unmount();
  return { notifications, timer };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  vi.resetAllMocks();
  permission = "default";
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal(
    "Notification",
    class {
      static get permission() {
        return permission;
      }
      static requestPermission = requestPermission;
      close = close;
      constructor(title: string, options: NotificationOptions) {
        show(title, options);
      }
    },
  );
});
afterEach(() => {
  unmount?.();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("browser focus notifications", () => {
  it("requests permission only on explicit enable, and tolerates dismissal or denial", async () => {
    const { notifications } = mount();
    expect(requestPermission).not.toHaveBeenCalled();
    notifications.notifyFocusComplete();
    expect(show).not.toHaveBeenCalled();
    requestPermission
      .mockResolvedValueOnce("default")
      .mockResolvedValueOnce("denied");
    await notifications.enable();
    expect(notifications.permission.value).toBe("default");
    permission = "denied";
    await notifications.enable();
    expect(notifications.message.value).toContain("ブロック");
    notifications.notifyFocusComplete();
    expect(show).not.toHaveBeenCalled();
  });
  it("notifies at 25 minutes, respects pause, and skips breaks and manual changes", () => {
    permission = "granted";
    const { timer } = mount();
    timer.start();
    vi.advanceTimersByTime(10 * 60_000);
    timer.pause();
    vi.advanceTimersByTime(25 * 60_000);
    expect(show).not.toHaveBeenCalled();
    timer.start();
    vi.advanceTimersByTime(15 * 60_000);
    expect(show).toHaveBeenCalledTimes(1);
    expect(show.mock.calls[0][0]).toContain("25分");
    vi.advanceTimersByTime(5 * 60_000);
    timer.reset();
    timer.switchMode();
    expect(show).toHaveBeenCalledTimes(1);
  });
  it("coalesces missed sessions and ignores a stale focus end after the break ended", () => {
    permission = "granted";
    const { timer } = mount();
    timer.start();
    vi.setSystemTime(60 * 60_000);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(show).not.toHaveBeenCalled();
    vi.setSystemTime(146 * 60_000);
    document.dispatchEvent(new Event("visibilitychange"));
    document.dispatchEvent(new Event("visibilitychange"));
    expect(show).toHaveBeenCalledTimes(1);
  });
  it("checks revoked permissions before displaying a notification", () => {
    permission = "granted";
    const { notifications } = mount();
    permission = "denied";
    notifications.notifyFocusComplete();
    expect(show).not.toHaveBeenCalled();
    expect(notifications.permission.value).toBe("denied");
  });
  it("keeps the timer running when notification construction fails", () => {
    permission = "granted";
    show.mockImplementation(() => {
      throw new Error("unsupported");
    });
    const { timer, notifications } = mount();
    timer.start();
    vi.advanceTimersByTime(25 * 60_000);
    expect(timer.mode.value).toBe("break");
    expect(timer.status.value).toBe("running");
    expect(notifications.message.value).toContain("表示できません");
  });
  it("handles insecure environments and permission request failures", async () => {
    vi.stubGlobal("isSecureContext", false);
    let { notifications } = mount();
    await notifications.enable();
    expect(requestPermission).not.toHaveBeenCalled();
    expect(notifications.supported).toBe(false);
    unmount();
    vi.stubGlobal("isSecureContext", true);
    ({ notifications } = mount());
    requestPermission.mockRejectedValue(new Error("blocked"));
    await notifications.enable();
    expect(notifications.requesting.value).toBe(false);
    expect(notifications.message.value).toContain("再試行");
  });
});

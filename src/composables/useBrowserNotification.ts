import { computed, onMounted, onUnmounted, ref } from "vue";

export function useBrowserNotification() {
  const supported = window.isSecureContext && "Notification" in window;
  const permission = ref<NotificationPermission>(
    supported ? Notification.permission : "default",
  );
  const requesting = ref(false);
  const error = ref("");
  let current: Notification | undefined;
  const message = computed(() => {
    if (!supported)
      return "この環境ではブラウザ通知を利用できません。PCの対応ブラウザでHTTPSまたはlocalhostから開いてください。";
    if (error.value) return error.value;
    if (permission.value === "denied")
      return "通知がブロックされています。ブラウザのサイト設定で通知を許可してください。";
    if (permission.value === "granted")
      return "集中終了の通知は有効です。タブを開いたままお使いください。";
    return "25分の集中が終わったら、デスクトップに通知します。";
  });
  function refreshPermission() {
    if (supported) permission.value = Notification.permission;
  }
  async function enable() {
    if (!supported || requesting.value) return;
    error.value = "";
    requesting.value = true;
    try {
      permission.value = await Notification.requestPermission();
    } catch {
      error.value =
        "通知を有効にできませんでした。ブラウザの設定を確認して再試行してください。";
    } finally {
      requesting.value = false;
    }
  }
  function notifyFocusComplete() {
    refreshPermission();
    if (!supported || permission.value !== "granted") return;
    try {
      current?.close();
      current = new Notification("still — 25分の集中が終わりました", {
        body: "おつかれさまでした。5分間の休憩をとりましょう。",
        tag: "still-focus-complete",
      });
      current.onerror = () => {
        error.value =
          "通知を表示できませんでした。ブラウザとOSの通知設定を確認してください。";
      };
    } catch {
      error.value =
        "このブラウザでは通知を表示できません。PCの対応ブラウザでお試しください。";
    }
  }
  onMounted(() => window.addEventListener("focus", refreshPermission));
  onUnmounted(() => {
    window.removeEventListener("focus", refreshPermission);
    current?.close();
  });
  return {
    supported,
    permission,
    requesting,
    message,
    enable,
    notifyFocusComplete,
  };
}

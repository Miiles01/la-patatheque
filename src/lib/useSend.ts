import { useState } from "react";
import { ApiError } from "./api";
import { useI18n } from "./i18n";

/** Busy flag and error message around a form submission that talks to the server. */
export function useSend() {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (e) {
      // The server explains refusals (menu changed, too many tries, table taken); anything else is the network.
      setError(e instanceof ApiError && [409, 422, 429].includes(e.status) ? e.message : t("form.error"));
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, run };
}

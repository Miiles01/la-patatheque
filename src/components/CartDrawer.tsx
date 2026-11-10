import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type FormEvent } from "react";
import { track } from "../lib/analytics";
import { PROMO_CODE, PROMO_RATE, useCart, type OrderMode } from "../lib/cart";
import { record } from "../lib/demoStore";
import { useFormatPrice, useI18n } from "../lib/i18n";
import { navigate } from "../lib/router";
import { btnPrimary, TextArea, TextField } from "./ui";

const EASE = [0.22, 1, 0.36, 1] as const;

type Step = "cart" | "details" | "done";

export function CartDrawer() {
  const cart = useCart();
  const { t } = useI18n();
  const formatPrice = useFormatPrice();
  const [step, setStep] = useState<Step>("cart");
  const [promo, setPromo] = useState("");
  const [promoState, setPromoState] = useState<"idle" | "ok" | "bad">("idle");
  const [when, setWhen] = useState<"asap" | "later">("asap");
  const [orderId, setOrderId] = useState("");
  const [submittedMode, setSubmittedMode] = useState<OrderMode>("emporter");

  const discount = promoState === "ok" ? Math.round(cart.subtotal * PROMO_RATE * 100) / 100 : 0;
  const total = cart.subtotal - discount;
  const belowMinimum = cart.mode === "livraison" && cart.subtotal < cart.deliveryMinimum;

  useEffect(() => {
    if (!cart.open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function close() {
    cart.setOpen(false);
    if (step === "done") setStep("cart");
  }

  function applyPromo() {
    setPromoState(promo.trim().toUpperCase() === PROMO_CODE ? "ok" : "bad");
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    const order = record("orders", {
      mode: cart.mode,
      name: get("name"),
      phone: get("phone"),
      email: get("email") || undefined,
      address: cart.mode === "livraison" ? get("address") : undefined,
      when: when === "asap" ? t("form.asap") : get("time"),
      notes: get("notes") || undefined,
      promoCode: promoState === "ok" ? PROMO_CODE : undefined,
      lines: cart.lines.map(({ name, size, price, qty, category }) => ({ name, size, price, qty, category })),
      subtotal: cart.subtotal,
      discount,
      total,
      status: "nouvelle",
    });
    track("order_submitted", { mode: cart.mode, value: total, items: cart.count });
    setOrderId(order.id);
    setSubmittedMode(cart.mode);
    cart.clear();
    setPromo("");
    setPromoState("idle");
    setStep("done");
  }

  return (
    <AnimatePresence>
      {cart.open && (
        <motion.div
          key="cart"
          className="fixed inset-0 z-[85]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { delay: 0.2 } }}
          data-lenis-prevent
        >
          <div className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]" onClick={close} />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={t("cart.title")}
            initial={{ x: "102%" }}
            animate={{ x: 0 }}
            exit={{ x: "102%" }}
            transition={{ duration: 0.6, ease: EASE }}
            className="absolute inset-y-0 right-0 w-full sm:max-w-md bg-paper flex flex-col"
          >
            <header className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-ink/10">
              <div>
                <p className="script text-red-600 text-3xl leading-none">{t("cart.title")}</p>
                {step !== "done" && cart.count > 0 && <p className="text-xs text-ink/50 mt-1">{cart.count} ×</p>}
              </div>
              <button
                onClick={close}
                autoFocus
                aria-label={t("cart.close")}
                className="relative w-11 h-11 flex items-center justify-center rounded-full text-ink/70 hover:bg-ink/5"
              >
                <span className="absolute h-[1.5px] w-5 bg-current rotate-45" />
                <span className="absolute h-[1.5px] w-5 bg-current -rotate-45" />
              </button>
            </header>

            {step === "done" ? (
              <div className="flex-1 overflow-y-auto px-6 py-10 text-center flex flex-col items-center justify-center">
                <p className="script text-red-600 text-5xl mb-2">{t("cart.thanks")}</p>
                <h2 className="font-display font-extrabold text-3xl mb-3">{t("cart.received")}</h2>
                <p className="text-ink/60 mb-1">
                  {t("cart.number")} <span className="font-bold text-ink">{orderId}</span>
                </p>
                <p className="text-ink/70 max-w-xs mb-2">
                  {submittedMode === "livraison" ? t("cart.confirmDelivery") : t("cart.confirmPickup")}
                </p>
                <p className="text-sm text-ink/50 max-w-xs mb-8">{t("cart.payNote")}</p>
                <button onClick={close} className={btnPrimary}>
                  {t("cart.done")}
                </button>
              </div>
            ) : cart.count === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 text-center">
                <p className="text-ink/60">{t("cart.empty")}</p>
                <button
                  onClick={() => {
                    close();
                    navigate("/commander");
                  }}
                  className={btnPrimary}
                >
                  {t("cart.browse")}
                </button>
              </div>
            ) : (
              <>
                <div className="px-6 pt-5">
                  {cart.modes.length === 1 ? (
                    <p className="rounded-full bg-ink/5 py-2.5 text-center text-sm font-bold text-ink/70">
                      {cart.mode === "emporter" ? t("cart.emporter") : t("cart.livraison")}
                    </p>
                  ) : (
                  <div role="radiogroup" className="grid grid-cols-2 gap-1 rounded-full bg-ink/5 p-1">
                    {cart.modes.map((m) => (
                      <button
                        key={m}
                        role="radio"
                        aria-checked={cart.mode === m}
                        onClick={() => cart.setMode(m)}
                        className={`rounded-full py-2.5 text-sm font-bold transition-colors ${
                          cart.mode === m ? "bg-paper text-ink shadow-sm" : "text-ink/55"
                        }`}
                      >
                        {m === "emporter" ? t("cart.emporter") : t("cart.livraison")}
                      </button>
                    ))}
                  </div>
                  )}
                </div>

                {step === "cart" ? (
                  <div className="flex-1 overflow-y-auto px-6 py-4">
                    <ul>
                      {cart.lines.map((l) => (
                        <li key={l.key} className="flex items-start gap-3 py-4 border-b border-ink/10">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold leading-snug">{l.name}</p>
                            {l.size && <p className="text-xs text-ink/50">{l.size}</p>}
                            <p className="text-sm text-ink/60 mt-1 tabular-nums">{formatPrice(l.price)}</p>
                          </div>
                          <div className="flex items-center gap-1 rounded-full border border-ink/15">
                            <button
                              onClick={() => cart.setQty(l.key, l.qty - 1)}
                              aria-label={l.qty === 1 ? t("cart.remove") : "−1"}
                              className="w-9 h-9 rounded-full hover:bg-ink/5 text-lg"
                            >
                              −
                            </button>
                            <span className="w-5 text-center text-sm font-bold tabular-nums">{l.qty}</span>
                            <button
                              onClick={() => cart.setQty(l.key, l.qty + 1)}
                              aria-label="+1"
                              className="w-9 h-9 rounded-full hover:bg-ink/5 text-lg"
                            >
                              +
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <form id="checkout" onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
                    <TextField label={t("form.name")} name="name" required autoComplete="name" />
                    <TextField label={t("form.phone")} name="phone" type="tel" required autoComplete="tel" />
                    <TextField label={t("form.email")} optional={t("form.optional")} name="email" type="email" autoComplete="email" />
                    {cart.mode === "livraison" && (
                      <TextField label={t("form.address")} name="address" required autoComplete="street-address" />
                    )}
                    <fieldset className="flex flex-col gap-2">
                      <legend className="text-sm font-medium mb-1.5">{t("form.when")}</legend>
                      <div className="grid grid-cols-2 gap-2">
                        {(["asap", "later"] as const).map((w) => (
                          <label
                            key={w}
                            className={`cursor-pointer rounded-xl border-2 px-3 py-3 text-sm text-center font-semibold transition-colors ${
                              when === w ? "border-red-600 text-red-600" : "border-ink/15 text-ink/70"
                            }`}
                          >
                            <input type="radio" name="when" className="sr-only" checked={when === w} onChange={() => setWhen(w)} />
                            {w === "asap" ? t("form.asap") : t("form.later")}
                          </label>
                        ))}
                      </div>
                      {when === "later" && <TextField label={t("form.time")} name="time" type="time" min="11:00" max="22:30" required />}
                    </fieldset>
                    <TextArea label={t("form.notes")} optional={t("form.optional")} name="notes" placeholder={t("form.notesHint")} rows={2} />

                    <div>
                      <span className="text-sm font-medium">{t("form.promo")}</span>
                      <div className="mt-1.5 flex gap-2">
                        <input
                          value={promo}
                          onChange={(e) => {
                            setPromo(e.target.value);
                            setPromoState("idle");
                          }}
                          placeholder={PROMO_CODE}
                          aria-label={t("form.promo")}
                          className="flex-1 min-w-0 rounded-xl border-2 border-ink/15 bg-paper px-4 py-3 uppercase placeholder:normal-case placeholder:text-ink/30 focus:border-red-600 focus:outline-none"
                        />
                        <button type="button" onClick={applyPromo} className="rounded-xl bg-ink px-4 text-sm font-bold text-paper">
                          {t("form.apply")}
                        </button>
                      </div>
                      {promoState !== "idle" && (
                        <p role="status" className={`mt-1.5 text-sm ${promoState === "ok" ? "text-green-700" : "text-red-600"}`}>
                          {promoState === "ok" ? t("form.promoOk") : t("form.promoBad")}
                        </p>
                      )}
                    </div>
                  </form>
                )}

                <footer className="border-t border-ink/10 px-6 pt-4 pb-6 bg-paper">
                  <dl className="flex flex-col gap-1 text-sm mb-4">
                    <div className="flex justify-between text-ink/65">
                      <dt>{t("cart.subtotal")}</dt>
                      <dd className="tabular-nums">{formatPrice(cart.subtotal)}</dd>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-green-700">
                        <dt>{t("cart.discount")}</dt>
                        <dd className="tabular-nums">−{formatPrice(discount)}</dd>
                      </div>
                    )}
                    <div className="flex justify-between font-display font-bold text-lg text-ink">
                      <dt>{t("cart.total")}</dt>
                      <dd className="tabular-nums">{formatPrice(total)}</dd>
                    </div>
                  </dl>
                  {belowMinimum && <p className="text-xs text-red-600 mb-3">{t("cart.minDelivery", { n: cart.deliveryMinimum })}</p>}
                  {step === "cart" ? (
                    <button disabled={belowMinimum} onClick={() => setStep("details")} className={`${btnPrimary} w-full`}>
                      {t("cart.checkout")}
                    </button>
                  ) : (
                    <>
                      <button type="submit" form="checkout" disabled={belowMinimum} className={`${btnPrimary} w-full`}>
                        {t("cart.submit")}
                      </button>
                      <p className="text-xs text-ink/50 text-center mt-3">{t("cart.payNote")}</p>
                      <button onClick={() => setStep("cart")} className="block mx-auto mt-2 text-sm font-semibold text-ink/60 underline underline-offset-4 py-2">
                        {t("cart.back")}
                      </button>
                    </>
                  )}
                </footer>
              </>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ConfirmContext, type ConfirmOptions } from '../lib/confirm'

interface Pending extends ConfirmOptions {
  resolve: (ok: boolean) => void
}

/**
 * Diálogo de confirmación propio (en vez del alert del navegador). Usa <dialog> nativo:
 * bloquea la página, atrapa el foco y se cierra con Esc.
 */
export default function ConfirmProvider({ children }: { children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [pending, setPending] = useState<Pending | null>(null)

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setPending({ ...options, resolve })
      }),
    [],
  )

  useEffect(() => {
    const dialog = dialogRef.current
    if (pending && dialog && !dialog.open) dialog.showModal()
  }, [pending])

  const close = (ok: boolean) => {
    pending?.resolve(ok)
    setPending(null)
    dialogRef.current?.close()
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <dialog
        ref={dialogRef}
        className="confirm-dialog"
        aria-labelledby="confirm-title"
        aria-describedby={pending?.message ? 'confirm-message' : undefined}
        // Esc o cerrar el diálogo cuenta como cancelar.
        onCancel={(e) => {
          e.preventDefault()
          close(false)
        }}
        // Clic fuera de la tarjeta (en el fondo) también cancela.
        onClick={(e) => {
          if (e.target === e.currentTarget) close(false)
        }}
      >
        {pending && (
          <div className="confirm-body">
            <h2 id="confirm-title">{pending.title}</h2>
            {pending.message && (
              <p id="confirm-message" className="muted">
                {pending.message}
              </p>
            )}
            <div className="confirm-actions">
              <button type="button" className="secondary" onClick={() => close(false)} autoFocus>
                {pending.cancelLabel ?? 'Cancelar'}
              </button>
              <button type="button" className={pending.danger ? 'danger-solid' : ''} onClick={() => close(true)}>
                {pending.confirmLabel ?? 'Aceptar'}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </ConfirmContext.Provider>
  )
}

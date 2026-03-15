export type ToastData = { id: string; message: string; type: 'error' | 'success' | 'info' }

type Props = { toasts: ToastData[]; onRemove: (id: string) => void }

export function Toast({ toasts, onRemove }: Props) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast--${t.type}`}>
          <span>{t.message}</span>
          <button className="toast-close" onClick={() => onRemove(t.id)}>×</button>
        </div>
      ))}
    </div>
  )
}

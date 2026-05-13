import "../styles/confirm-modal.css";

export default function ConfirmModal({
  open,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="confirm-overlay">
      <div className="confirm-modal">
        <div className={`confirm-icon ${danger ? "danger" : ""}`}>
          {danger ? "⚠️" : "✅"}
        </div>

        <h3>{title}</h3>
        <p>{message}</p>

        <div className="confirm-actions">
          <button
            className="confirm-cancel"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>

          <button
            className={`confirm-ok ${danger ? "danger" : ""}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Please wait..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
import { memo } from "react";

interface SessionRestoreBannerProps {
  open: boolean;
  workspaceName: string;
  onDismiss: () => void;
}

export const SessionRestoreBanner = memo(function SessionRestoreBanner({
  open,
  workspaceName,
  onDismiss,
}: SessionRestoreBannerProps) {
  if (!open) return null;

  return (
    <div className="workspace-session-banner">
      <span className="workspace-session-banner__label">unsaved workspace restored</span>
      <span className="workspace-session-banner__copy">
        {workspaceName} returned with the last unsaved session intact.
      </span>
      <button
        type="button"
        onClick={onDismiss}
        className="workspace-session-banner__dismiss"
      >
        dismiss
      </button>
    </div>
  );
});

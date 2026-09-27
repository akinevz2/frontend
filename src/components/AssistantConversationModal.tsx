import { useEffect } from "react";

interface AssistantConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationInput: string;
  conversationError: string;
  isAssistantRequestPending: boolean;
  onSubmit: () => void;
}

const AssistantConversationModal = ({
  isOpen,
  onClose,
  conversationInput,
  conversationError,
  isAssistantRequestPending,
  onSubmit,
}: AssistantConversationModalProps) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.5)",
        zIndex: 11000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="window" style={{ width: "min(560px, 92vw)" }}>
        <div className="title-bar">
          <div className="title-bar-text">Assistant Conversation</div>
          <div className="title-bar-controls">
            <button aria-label="Close" onClick={() => onClose()}></button>
          </div>
        </div>
        <div className="window-body" style={{ display: "grid", gap: "0.6rem" }}>
          <label htmlFor="assistant-prompt-input">Prompt (max 256 chars)</label>
          <textarea
            id="assistant-prompt-input"
            value={conversationInput}
            maxLength={256}
            onChange={(event) => {}}
            onKeyDown={(event) => {
              if (event.key !== "Enter") {
                return;
              }

              event.preventDefault();
              onSubmit();
            }}
            rows={4}
            placeholder="Ask for advice..."
          />
          <div style={{ fontSize: "0.85rem", textAlign: "right" }}>
            {conversationInput.length}/256
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.5rem",
            }}
          >
            <button
              type="button"
              onClick={() => onSubmit()}
              disabled={isAssistantRequestPending || !conversationInput.trim()}
            >
              {isAssistantRequestPending ? "Sending..." : "Send"}
            </button>
          </div>
          {conversationError ? (
            <p style={{ margin: 0, color: "#c00" }}>{conversationError}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AssistantConversationModal;

import { useState } from "react";

export type AssistantConversationState = {
  conversationInput: string;
  conversationError: string;
  assistantWindowText: string;
  assistantWindowVisible: boolean;
  assistantWindowFading: boolean;
  assistantWindowMinimized: boolean;
  isAssistantRequestPending: boolean;
};

export type SetAssistantConversationState = {
  setConversationInput: (value: string) => void;
  setConversationError: (value: string) => void;
  setAssistantWindowText: (value: string) => void;
  setAssistantWindowVisible: (value: boolean) => void;
  setAssistantWindowFading: (value: boolean) => void;
  setAssistantWindowMinimized: (value: boolean) => void;
  setIsAssistantRequestPending: (value: boolean) => void;
};

function useAssistantConversationState(): AssistantConversationState & SetAssistantConversationState {
  const [conversationInput, setConversationInput] = useState("");
  const [conversationError, setConversationError] = useState("");
  const [assistantWindowText, setAssistantWindowText] = useState("");
  const [assistantWindowVisible, setAssistantWindowVisible] = useState(false);
  const [assistantWindowFading, setAssistantWindowFading] = useState(false);
  const [assistantWindowMinimized, setAssistantWindowMinimized] = useState(false);
  const [isAssistantRequestPending, setIsAssistantRequestPending] = useState(false);

  return {
    conversationInput,
    conversationError,
    assistantWindowText,
    assistantWindowVisible,
    assistantWindowFading,
    assistantWindowMinimized,
    isAssistantRequestPending,
    setConversationInput,
    setConversationError,
    setAssistantWindowText,
    setAssistantWindowVisible,
    setAssistantWindowFading,
    setAssistantWindowMinimized,
    setIsAssistantRequestPending,
  };
}

export default useAssistantConversationState;
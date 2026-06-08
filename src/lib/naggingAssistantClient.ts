export type AssistantConfig = {
    endpoint: string;
    model: string;
    apiKey: string;
};

type ModelOption = {
    id: string;
};

type OpenAiModelsResponse = {
    data?: Array<{ id?: string }>;
    models?: Array<{ id?: string } | string>;
};

type OpenAiChatResponse = {
    choices?: Array<{
        message?: {
            content?: string;
        };
        text?: string;
    }>;
};

const STORAGE_KEY = "ok_go_v1";
const MAX_ASSISTANT_RESPONSE_CHARS = 512;

const normalizeEndpoint = (endpoint: string) => endpoint.trim().replace(/\/+$/, "");

const constrainAssistantText = (text: string) =>
    text.trim().slice(0, MAX_ASSISTANT_RESPONSE_CHARS);

const buildHeaders = (apiKey: string): HeadersInit => {
    const headers: HeadersInit = {
        "Content-Type": "application/json",
    };

    if (apiKey.trim()) {
        headers.Authorization = `Bearer ${apiKey.trim()}`;
    }

    return headers;
};

const parseModelOptions = (payload: unknown): ModelOption[] => {
    if (!payload || typeof payload !== "object") {
        return [];
    }

    const candidate = payload as OpenAiModelsResponse;
    const options = new Set<string>();

    if (Array.isArray(candidate.data)) {
        candidate.data.forEach((item) => {
            if (item?.id && typeof item.id === "string") {
                options.add(item.id);
            }
        });
    }

    if (Array.isArray(candidate.models)) {
        candidate.models.forEach((item) => {
            if (typeof item === "string") {
                options.add(item);
                return;
            }

            if (item?.id && typeof item.id === "string") {
                options.add(item.id);
            }
        });
    }

    return Array.from(options)
        .sort((a, b) => a.localeCompare(b))
        .map((id) => ({ id }));
};

const fetchModelsFrom = async (url: string, apiKey: string): Promise<ModelOption[]> => {
    const response = await fetch(url, {
        method: "GET",
        headers: buildHeaders(apiKey),
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const payload: unknown = await response.json();
    return parseModelOptions(payload);
};

export const loadAssistantConfig = (): AssistantConfig => {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return { endpoint: "", model: "", apiKey: "" };
        }

        const parsed = JSON.parse(raw) as Partial<AssistantConfig>;
        return {
            endpoint: typeof parsed.endpoint === "string" ? parsed.endpoint : "",
            model: typeof parsed.model === "string" ? parsed.model : "",
            apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
        };
    } catch {
        return { endpoint: "", model: "", apiKey: "" };
    }
};

export const saveAssistantConfig = (config: AssistantConfig) => {
    window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
            endpoint: normalizeEndpoint(config.endpoint),
            model: config.model.trim(),
            apiKey: config.apiKey,
        }),
    );
};

export const discoverAssistantModels = async (
    endpoint: string,
    apiKey: string,
): Promise<ModelOption[]> => {
    const base = normalizeEndpoint(endpoint);
    if (!base) {
        throw new Error("Endpoint is required.");
    }

    const candidates = [
        `${base}/v1/models`,
        `${base}/models`,
        `${base}/api/models`,
        `${base}/openai/models`,
    ];

    for (const candidateUrl of candidates) {
        try {
            const options = await fetchModelsFrom(candidateUrl, apiKey);
            if (options.length > 0) {
                return options;
            }
        } catch {
            // Try next compatible endpoint.
        }
    }

    throw new Error("No models found from the provided endpoint.");
};

const chatCompletionCandidates = (endpoint: string) => {
    const base = normalizeEndpoint(endpoint);
    return [
        `${base}/v1/chat/completions`,
        `${base}/chat/completions`,
        `${base}/api/chat/completions`,
    ];
};

const extractChatText = (payload: unknown): string => {
    if (!payload || typeof payload !== "object") {
        return "";
    }

    const candidate = payload as OpenAiChatResponse;
    const first = candidate.choices?.[0];
    const content = first?.message?.content ?? first?.text ?? "";

    return typeof content === "string" ? constrainAssistantText(content) : "";
};

export const requestAssistantCompletion = async (
    config: AssistantConfig,
    prompt: string,
    options?: { conversationPrompt?: boolean },
): Promise<string> => {
    const endpoint = normalizeEndpoint(config.endpoint);
    const model = config.model.trim();

    if (!endpoint) {
        throw new Error("Missing endpoint configuration.");
    }

    if (!model) {
        throw new Error("Missing model configuration.");
    }

    const systemInstructionBase =
        "Operate in lowest reasoning mode. Keep the response at or below 512 characters. Markdown is forbidden except optional inline code delimited by single backticks, and that inline code form must be used exclusively to indicate emphasis. Reply in 1-3 concise, practical sentences.";
    const conversationExtension =
        "Accept conversation about any topic with no specialization or assumed input format, and ensure the response still resembles practical wisdom.";

    const body = {
        model,
        messages: [
            {
                role: "system",
                content: options?.conversationPrompt
                    ? `${systemInstructionBase} ${conversationExtension}`
                    : systemInstructionBase,
            },
            {
                role: "user",
                content: prompt,
            },
        ],
        temperature: 1.1,
    };

    let lastError = "Request failed.";

    for (const url of chatCompletionCandidates(endpoint)) {
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: buildHeaders(config.apiKey),
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                lastError = `HTTP ${response.status}`;
                continue;
            }

            const payload: unknown = await response.json();
            const text = extractChatText(payload);
            if (text) {
                return text;
            }

            lastError = "Response did not include text.";
        } catch (error) {
            lastError = error instanceof Error ? error.message : "Network error";
        }
    }

    throw new Error(lastError);
};
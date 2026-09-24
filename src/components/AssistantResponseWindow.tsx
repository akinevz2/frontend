import Markdown from "react-markdown";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

type AssistantResponseWindowProps = {
  isVisible: boolean;
  isFading: boolean;
  isMinimized: boolean;
  text: string;
  onMinimize: () => void;
  onClose: () => void;
};

const AssistantResponseWindow = ({
  isVisible,
  isFading,
  isMinimized,
  text,
  onMinimize,
  onClose,
}: AssistantResponseWindowProps) => {
  if (!isVisible && !isFading) {
    return null;
  }

  const markdownSanitizeSchema = {
    ...defaultSchema,
    tagNames: [...(defaultSchema.tagNames || []), "iframe"],
    attributes: {
      ...defaultSchema.attributes,
      a: [...(defaultSchema.attributes?.a || []), ["target"], ["rel"]],
      img: [...(defaultSchema.attributes?.img || []), ["loading"], ["decoding"]],
      iframe: [
        ["title"],
        ["src"],
        ["width"],
        ["height"],
        ["style"],
        ["scrolling"],
        ["loading"],
        ["allow"],
        ["allowfullscreen"],
        ["referrerpolicy"],
        ["frameborder"],
      ],
    },
  };

  const markdownComponents = {
    img: (props: any) => (
      <img
        {...props}
        style={{ maxWidth: "100%", height: "auto", ...(props.style ?? {}) }}
      />
    ),
  };

  return (
    <div
      className="window"
      style={{
        position: "fixed",
        right: "1rem",
        bottom: "9.6rem",
        width: "min(420px, 92vw)",
        zIndex: 10950,
        opacity: isFading ? 0 : 1,
        transition: "opacity 220ms ease",
        pointerEvents: "auto",
      }}
    >
      <div className="title-bar">
        <div className="title-bar-text">Assistant Response</div>
        <div className="title-bar-controls">
          <button
            aria-label={isMinimized ? "Maximize" : "Minimize"}
            onClick={() =>
              onMinimize()
            }
          ></button>
          <button
            aria-label="Close"
            onClick={() => onClose()}
          ></button>
        </div>
      </div>
      {!isMinimized ? (
        <div className="window-body" style={{ whiteSpace: "pre-wrap" }}>
          <Markdown
            rehypePlugins={[
              [rehypeSanitize, markdownSanitizeSchema],
            ]}
            components={markdownComponents}
          >
            {text}
          </Markdown>
        </div>
      ) : null}
    </div>
  );
};

export default AssistantResponseWindow;
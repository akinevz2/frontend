import { toast } from 'react-toastify';


interface CopyToClipboardButtonProps {
    content: string;
    onClick?: () => void;
}

export const CopyToClipboardButton = (props: CopyToClipboardButtonProps) => {
    const handleClick = async () => {
        await navigator.clipboard.writeText(props.content).then(() => {
            toast('Content copied to clipboard!');
        }).catch((error) => {
            toast('Failed to copy content: ', error);
        });
        if (props.onClick) {
            props.onClick();
        }
    };

    return <button onClick={handleClick}>Copy to Clipboard</button>;
};
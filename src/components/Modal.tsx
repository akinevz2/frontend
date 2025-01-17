
interface ModalProps {
    message: string;
}

const Modal = ({ message }: ModalProps) => {
    return (
        <div id="myModal" className="modal">
            <div className="modal-content">
                <span className="close">&times;</span>
                <p>{message}</p>
            </div>
        </div>
    );
};

export default Modal;
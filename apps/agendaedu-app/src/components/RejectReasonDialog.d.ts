interface RejectReasonDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
    studentName: string;
    isLoading?: boolean;
}
export declare function RejectReasonDialog({ isOpen, onClose, onConfirm, studentName, isLoading }: RejectReasonDialogProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=RejectReasonDialog.d.ts.map
import { ChatUser } from '../data/chat-types';
type User = Omit<ChatUser, 'messages'>;
type Props = {
    users: User[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
};
export declare function NewChat({ users, onOpenChange, open }: Props): import("react").JSX.Element;
export {};
//# sourceMappingURL=new-chat.d.ts.map
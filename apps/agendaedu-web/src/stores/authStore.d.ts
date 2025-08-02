interface AuthUser {
    accountNo: string;
    email: string;
    role: string[];
    exp: number;
}
interface AuthState {
    auth: {
        user: AuthUser | null;
        setUser: (user: AuthUser | null) => void;
        accessToken: string;
        setAccessToken: (accessToken: string) => void;
        resetAccessToken: () => void;
        reset: () => void;
    };
}
export declare const useAuthStore: import("zustand").UseBoundStore<import("zustand").StoreApi<AuthState>>;
export {};
//# sourceMappingURL=authStore.d.ts.map
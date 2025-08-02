import Cookies from 'js-cookie';
import { create } from 'zustand';
const ACCESS_TOKEN = 'thisisjustarandomstring';
export const useAuthStore = create()((set) => {
    const cookieState = Cookies.get(ACCESS_TOKEN);
    const initToken = cookieState ? JSON.parse(cookieState) : '';
    return {
        auth: {
            user: null,
            setUser: (user) => set((state) => ({ ...state, auth: { ...state.auth, user } })),
            accessToken: initToken,
            setAccessToken: (accessToken) => set((state) => {
                Cookies.set(ACCESS_TOKEN, JSON.stringify(accessToken));
                return { ...state, auth: { ...state.auth, accessToken } };
            }),
            resetAccessToken: () => set((state) => {
                Cookies.remove(ACCESS_TOKEN);
                return { ...state, auth: { ...state.auth, accessToken: '' } };
            }),
            reset: () => set((state) => {
                Cookies.remove(ACCESS_TOKEN);
                return {
                    ...state,
                    auth: { ...state.auth, user: null, accessToken: '' },
                };
            }),
        },
    };
});
// export const useAuth = () => useAuthStore((state) => state.auth)
//# sourceMappingURL=authStore.js.map
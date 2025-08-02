import './index.css';
declare const router: import("@tanstack/router-core").RouterCore<any, "never", false, import("@tanstack/history").RouterHistory, Record<string, any>>;
declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router;
    }
}
export {};
//# sourceMappingURL=main.d.ts.map
export declare const WPS_CONFIG: {
    appId: string;
    scope: string[];
    sdk: {
        url: string;
        timeout: number;
    };
    features: {
        enableLocation: boolean;
        enableCamera: boolean;
        enableShare: boolean;
        enableMockMode: boolean;
    };
    mockData: {
        location: {
            latitude: number;
            longitude: number;
            address: string;
            accuracy: number;
        };
        course: {
            name: string;
            time: string;
            classroom: string;
            teacher: string;
        };
    };
};
export declare const isWPSEnvironment: () => boolean;
export declare const isDevelopment: () => boolean;
//# sourceMappingURL=wps-config.d.ts.map
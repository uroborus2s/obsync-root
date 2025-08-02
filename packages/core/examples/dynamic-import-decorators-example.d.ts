export default class ProductController {
    getProducts(): {
        products: never[];
    };
}
export declare class ProductService {
    findAll(): never[];
}
export declare function handleDynamicImport(modulePath: string, moduleName: string): Promise<{
    success: boolean;
    ClassConstructor: any;
    metadata: {
        isController: any;
        isService: any;
        routePath: any;
    };
    reason?: undefined;
} | {
    success: boolean;
    reason: any;
    ClassConstructor?: undefined;
    metadata?: undefined;
}>;
export declare function simulateModuleExports(): void;
export declare function testDynamicImportWithDecorators(): Promise<void>;
export declare function bestPracticesForDynamicImportWithDecorators(): void;
//# sourceMappingURL=dynamic-import-decorators-example.d.ts.map
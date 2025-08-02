import React from 'react';
import { fonts } from '@/config/fonts';
type Font = (typeof fonts)[number];
interface FontContextType {
    font: Font;
    setFont: (font: Font) => void;
}
export declare const FontProvider: React.FC<{
    children: React.ReactNode;
}>;
export declare const useFont: () => FontContextType;
export {};
//# sourceMappingURL=font-context.d.ts.map
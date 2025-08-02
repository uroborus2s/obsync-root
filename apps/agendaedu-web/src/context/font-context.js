import React, { createContext, useContext, useEffect, useState } from 'react';
import { fonts } from '@/config/fonts';
const FontContext = createContext(undefined);
export const FontProvider = ({ children, }) => {
    const [font, _setFont] = useState(() => {
        const savedFont = localStorage.getItem('font');
        return fonts.includes(savedFont) ? savedFont : fonts[0];
    });
    useEffect(() => {
        const applyFont = (font) => {
            const root = document.documentElement;
            root.classList.forEach((cls) => {
                if (cls.startsWith('font-'))
                    root.classList.remove(cls);
            });
            root.classList.add(`font-${font}`);
        };
        applyFont(font);
    }, [font]);
    const setFont = (font) => {
        localStorage.setItem('font', font);
        _setFont(font);
    };
    return <FontContext value={{ font, setFont }}>{children}</FontContext>;
};
// eslint-disable-next-line react-refresh/only-export-components
export const useFont = () => {
    const context = useContext(FontContext);
    if (!context) {
        throw new Error('useFont must be used within a FontProvider');
    }
    return context;
};
//# sourceMappingURL=font-context.js.map
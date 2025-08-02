import { useEffect, useRef } from 'react';
import { useRouterState } from '@tanstack/react-router';
import LoadingBar from 'react-top-loading-bar';
export function NavigationProgress() {
    const ref = useRef(null);
    const state = useRouterState();
    useEffect(() => {
        if (state.status === 'pending') {
            ref.current?.continuousStart();
        }
        else {
            ref.current?.complete();
        }
    }, [state.status]);
    return (<LoadingBar color='var(--muted-foreground)' ref={ref} shadow={true} height={2}/>);
}
//# sourceMappingURL=navigation-progress.js.map
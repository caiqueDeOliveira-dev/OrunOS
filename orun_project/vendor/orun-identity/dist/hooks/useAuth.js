"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAuth = useAuth;
exports.useAuthBridge = useAuthBridge;
const react_1 = require("react");
/**
 * Hook compartilhado entre Mobile (Expo/React Native) e qualquer superfície
 * web (ex: futura Orun Casa Kiosk) que rode o AuthClient no próprio processo
 * — diferente do Desktop, onde o AuthClient vive no main process e o
 * renderer consome via IPC (ver useAuthBridge nos exemplos do README).
 *
 * Uso:
 *   const authClient = useMemo(() => new AuthClient({ ... }), []);
 *   const { state, signIn, signOut } = useAuth(authClient);
 */
function useAuth(client) {
    const [state, setState] = (0, react_1.useState)(client.getState());
    (0, react_1.useEffect)(() => {
        const unsubscribe = client.subscribe(setState);
        return unsubscribe;
    }, [client]);
    return {
        state,
        signIn: client.signIn.bind(client),
        signUp: client.signUp.bind(client),
        signInWithOAuth: client.signInWithOAuth.bind(client),
        signInWithMagicLink: client.signInWithMagicLink.bind(client),
        completeSessionFromUrl: client.completeSessionFromUrl.bind(client),
        signOut: client.signOut.bind(client),
    };
}
function useAuthBridge(bridge) {
    const [state, setState] = (0, react_1.useState)({
        status: 'loading',
        user: null,
        activeTenant: null,
        memberships: [],
        accessToken: null,
    });
    (0, react_1.useEffect)(() => {
        let mounted = true;
        bridge.getState().then((s) => {
            if (mounted)
                setState(s);
        });
        const unsubscribe = bridge.onStateChanged(setState);
        return () => {
            mounted = false;
            unsubscribe();
        };
    }, [bridge]);
    return {
        state,
        signIn: bridge.signIn,
        signUp: bridge.signUp,
        signOut: bridge.signOut,
    };
}
//# sourceMappingURL=useAuth.js.map
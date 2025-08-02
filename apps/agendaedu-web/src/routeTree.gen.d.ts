import { Route as rootRouteImport } from './routes/__root';
import { Route as ClerkRouteRouteImport } from './routes/clerk/route';
import { Route as AuthenticatedRouteRouteImport } from './routes/_authenticated/route';
import { Route as AuthenticatedIndexRouteImport } from './routes/_authenticated/index';
import { Route as AuthenticatedTeachersRouteImport } from './routes/_authenticated/teachers';
import { Route as AuthenticatedTasksRouteImport } from './routes/_authenticated/tasks';
import { Route as AuthenticatedStudentsRouteImport } from './routes/_authenticated/students';
import { Route as AuthenticatedDataQueryRouteImport } from './routes/_authenticated/data-query';
import { Route as AuthenticatedDashboardRouteImport } from './routes/_authenticated/dashboard';
import { Route as AuthenticatedCoursesRouteImport } from './routes/_authenticated/courses';
import { Route as AuthenticatedBasicManagementRouteImport } from './routes/_authenticated/basic-management';
import { Route as AuthenticatedAttendanceRouteImport } from './routes/_authenticated/attendance';
import { Route as AuthenticatedAnalyticsRouteImport } from './routes/_authenticated/analytics';
import { Route as errors503RouteImport } from './routes/(errors)/503';
import { Route as errors500RouteImport } from './routes/(errors)/500';
import { Route as errors404RouteImport } from './routes/(errors)/404';
import { Route as errors403RouteImport } from './routes/(errors)/403';
import { Route as errors401RouteImport } from './routes/(errors)/401';
import { Route as authSignUpRouteImport } from './routes/(auth)/sign-up';
import { Route as authSignIn2RouteImport } from './routes/(auth)/sign-in-2';
import { Route as authSignInRouteImport } from './routes/(auth)/sign-in';
import { Route as authOtpRouteImport } from './routes/(auth)/otp';
import { Route as authForgotPasswordRouteImport } from './routes/(auth)/forgot-password';
import { Route as ClerkAuthenticatedRouteRouteImport } from './routes/clerk/_authenticated/route';
import { Route as ClerkauthRouteRouteImport } from './routes/clerk/(auth)/route';
import { Route as AuthenticatedSettingsRouteRouteImport } from './routes/_authenticated/settings/route';
import { Route as AuthenticatedUsersIndexRouteImport } from './routes/_authenticated/users/index';
import { Route as AuthenticatedTasksIndexRouteImport } from './routes/_authenticated/tasks/index';
import { Route as AuthenticatedSettingsIndexRouteImport } from './routes/_authenticated/settings/index';
import { Route as AuthenticatedHelpCenterIndexRouteImport } from './routes/_authenticated/help-center/index';
import { Route as AuthenticatedChatsIndexRouteImport } from './routes/_authenticated/chats/index';
import { Route as AuthenticatedAppsIndexRouteImport } from './routes/_authenticated/apps/index';
import { Route as ClerkAuthenticatedUserManagementRouteImport } from './routes/clerk/_authenticated/user-management';
import { Route as ClerkauthSignUpRouteImport } from './routes/clerk/(auth)/sign-up';
import { Route as ClerkauthSignInRouteImport } from './routes/clerk/(auth)/sign-in';
import { Route as AuthenticatedTasksSyncRouteImport } from './routes/_authenticated/tasks/sync';
import { Route as AuthenticatedTasksSettingsRouteImport } from './routes/_authenticated/tasks/settings';
import { Route as AuthenticatedSettingsNotificationsRouteImport } from './routes/_authenticated/settings/notifications';
import { Route as AuthenticatedSettingsDisplayRouteImport } from './routes/_authenticated/settings/display';
import { Route as AuthenticatedSettingsAppearanceRouteImport } from './routes/_authenticated/settings/appearance';
import { Route as AuthenticatedSettingsAccountRouteImport } from './routes/_authenticated/settings/account';
import { Route as AuthenticatedCoursesSettingsRouteImport } from './routes/_authenticated/courses/settings';
import { Route as AuthenticatedCoursesScheduleRouteImport } from './routes/_authenticated/courses/schedule';
declare const ClerkRouteRoute: any;
declare const AuthenticatedRouteRoute: any;
declare const AuthenticatedIndexRoute: any;
declare const AuthenticatedTeachersRoute: any;
declare const AuthenticatedTasksRoute: any;
declare const AuthenticatedStudentsRoute: any;
declare const AuthenticatedDataQueryRoute: any;
declare const AuthenticatedDashboardRoute: any;
declare const AuthenticatedCoursesRoute: any;
declare const AuthenticatedBasicManagementRoute: any;
declare const AuthenticatedAttendanceRoute: any;
declare const AuthenticatedAnalyticsRoute: any;
declare const errors503Route: any;
declare const errors500Route: any;
declare const errors404Route: any;
declare const errors403Route: any;
declare const errors401Route: any;
declare const authSignUpRoute: any;
declare const authSignIn2Route: any;
declare const authSignInRoute: any;
declare const authOtpRoute: any;
declare const authForgotPasswordRoute: any;
declare const ClerkAuthenticatedRouteRoute: any;
declare const ClerkauthRouteRoute: any;
declare const AuthenticatedSettingsRouteRoute: any;
declare const AuthenticatedUsersIndexRoute: any;
declare const AuthenticatedTasksIndexRoute: any;
declare const AuthenticatedSettingsIndexRoute: any;
declare const AuthenticatedHelpCenterIndexRoute: any;
declare const AuthenticatedChatsIndexRoute: any;
declare const AuthenticatedAppsIndexRoute: any;
declare const ClerkAuthenticatedUserManagementRoute: any;
declare const ClerkauthSignUpRoute: any;
declare const ClerkauthSignInRoute: any;
declare const AuthenticatedTasksSyncRoute: any;
declare const AuthenticatedTasksSettingsRoute: any;
declare const AuthenticatedSettingsNotificationsRoute: any;
declare const AuthenticatedSettingsDisplayRoute: any;
declare const AuthenticatedSettingsAppearanceRoute: any;
declare const AuthenticatedSettingsAccountRoute: any;
declare const AuthenticatedCoursesSettingsRoute: any;
declare const AuthenticatedCoursesScheduleRoute: any;
export interface FileRoutesByFullPath {
    '/clerk': typeof ClerkAuthenticatedRouteRouteWithChildren;
    '/settings': typeof AuthenticatedSettingsRouteRouteWithChildren;
    '/clerk/': typeof ClerkauthRouteRouteWithChildren;
    '/forgot-password': typeof authForgotPasswordRoute;
    '/otp': typeof authOtpRoute;
    '/sign-in': typeof authSignInRoute;
    '/sign-in-2': typeof authSignIn2Route;
    '/sign-up': typeof authSignUpRoute;
    '/401': typeof errors401Route;
    '/403': typeof errors403Route;
    '/404': typeof errors404Route;
    '/500': typeof errors500Route;
    '/503': typeof errors503Route;
    '/analytics': typeof AuthenticatedAnalyticsRoute;
    '/attendance': typeof AuthenticatedAttendanceRoute;
    '/basic-management': typeof AuthenticatedBasicManagementRoute;
    '/courses': typeof AuthenticatedCoursesRouteWithChildren;
    '/dashboard': typeof AuthenticatedDashboardRoute;
    '/data-query': typeof AuthenticatedDataQueryRoute;
    '/students': typeof AuthenticatedStudentsRoute;
    '/tasks': typeof AuthenticatedTasksRouteWithChildren;
    '/teachers': typeof AuthenticatedTeachersRoute;
    '/': typeof AuthenticatedIndexRoute;
    '/courses/schedule': typeof AuthenticatedCoursesScheduleRoute;
    '/courses/settings': typeof AuthenticatedCoursesSettingsRoute;
    '/settings/account': typeof AuthenticatedSettingsAccountRoute;
    '/settings/appearance': typeof AuthenticatedSettingsAppearanceRoute;
    '/settings/display': typeof AuthenticatedSettingsDisplayRoute;
    '/settings/notifications': typeof AuthenticatedSettingsNotificationsRoute;
    '/tasks/settings': typeof AuthenticatedTasksSettingsRoute;
    '/tasks/sync': typeof AuthenticatedTasksSyncRoute;
    '/clerk/sign-in': typeof ClerkauthSignInRoute;
    '/clerk/sign-up': typeof ClerkauthSignUpRoute;
    '/clerk/user-management': typeof ClerkAuthenticatedUserManagementRoute;
    '/apps': typeof AuthenticatedAppsIndexRoute;
    '/chats': typeof AuthenticatedChatsIndexRoute;
    '/help-center': typeof AuthenticatedHelpCenterIndexRoute;
    '/settings/': typeof AuthenticatedSettingsIndexRoute;
    '/tasks/': typeof AuthenticatedTasksIndexRoute;
    '/users': typeof AuthenticatedUsersIndexRoute;
}
export interface FileRoutesByTo {
    '/clerk': typeof ClerkAuthenticatedRouteRouteWithChildren;
    '/forgot-password': typeof authForgotPasswordRoute;
    '/otp': typeof authOtpRoute;
    '/sign-in': typeof authSignInRoute;
    '/sign-in-2': typeof authSignIn2Route;
    '/sign-up': typeof authSignUpRoute;
    '/401': typeof errors401Route;
    '/403': typeof errors403Route;
    '/404': typeof errors404Route;
    '/500': typeof errors500Route;
    '/503': typeof errors503Route;
    '/analytics': typeof AuthenticatedAnalyticsRoute;
    '/attendance': typeof AuthenticatedAttendanceRoute;
    '/basic-management': typeof AuthenticatedBasicManagementRoute;
    '/courses': typeof AuthenticatedCoursesRouteWithChildren;
    '/dashboard': typeof AuthenticatedDashboardRoute;
    '/data-query': typeof AuthenticatedDataQueryRoute;
    '/students': typeof AuthenticatedStudentsRoute;
    '/teachers': typeof AuthenticatedTeachersRoute;
    '/': typeof AuthenticatedIndexRoute;
    '/courses/schedule': typeof AuthenticatedCoursesScheduleRoute;
    '/courses/settings': typeof AuthenticatedCoursesSettingsRoute;
    '/settings/account': typeof AuthenticatedSettingsAccountRoute;
    '/settings/appearance': typeof AuthenticatedSettingsAppearanceRoute;
    '/settings/display': typeof AuthenticatedSettingsDisplayRoute;
    '/settings/notifications': typeof AuthenticatedSettingsNotificationsRoute;
    '/tasks/settings': typeof AuthenticatedTasksSettingsRoute;
    '/tasks/sync': typeof AuthenticatedTasksSyncRoute;
    '/clerk/sign-in': typeof ClerkauthSignInRoute;
    '/clerk/sign-up': typeof ClerkauthSignUpRoute;
    '/clerk/user-management': typeof ClerkAuthenticatedUserManagementRoute;
    '/apps': typeof AuthenticatedAppsIndexRoute;
    '/chats': typeof AuthenticatedChatsIndexRoute;
    '/help-center': typeof AuthenticatedHelpCenterIndexRoute;
    '/settings': typeof AuthenticatedSettingsIndexRoute;
    '/tasks': typeof AuthenticatedTasksIndexRoute;
    '/users': typeof AuthenticatedUsersIndexRoute;
}
export interface FileRoutesById {
    __root__: typeof rootRouteImport;
    '/_authenticated': typeof AuthenticatedRouteRouteWithChildren;
    '/clerk': typeof ClerkRouteRouteWithChildren;
    '/_authenticated/settings': typeof AuthenticatedSettingsRouteRouteWithChildren;
    '/clerk/(auth)': typeof ClerkauthRouteRouteWithChildren;
    '/clerk/_authenticated': typeof ClerkAuthenticatedRouteRouteWithChildren;
    '/(auth)/forgot-password': typeof authForgotPasswordRoute;
    '/(auth)/otp': typeof authOtpRoute;
    '/(auth)/sign-in': typeof authSignInRoute;
    '/(auth)/sign-in-2': typeof authSignIn2Route;
    '/(auth)/sign-up': typeof authSignUpRoute;
    '/(errors)/401': typeof errors401Route;
    '/(errors)/403': typeof errors403Route;
    '/(errors)/404': typeof errors404Route;
    '/(errors)/500': typeof errors500Route;
    '/(errors)/503': typeof errors503Route;
    '/_authenticated/analytics': typeof AuthenticatedAnalyticsRoute;
    '/_authenticated/attendance': typeof AuthenticatedAttendanceRoute;
    '/_authenticated/basic-management': typeof AuthenticatedBasicManagementRoute;
    '/_authenticated/courses': typeof AuthenticatedCoursesRouteWithChildren;
    '/_authenticated/dashboard': typeof AuthenticatedDashboardRoute;
    '/_authenticated/data-query': typeof AuthenticatedDataQueryRoute;
    '/_authenticated/students': typeof AuthenticatedStudentsRoute;
    '/_authenticated/tasks': typeof AuthenticatedTasksRouteWithChildren;
    '/_authenticated/teachers': typeof AuthenticatedTeachersRoute;
    '/_authenticated/': typeof AuthenticatedIndexRoute;
    '/_authenticated/courses/schedule': typeof AuthenticatedCoursesScheduleRoute;
    '/_authenticated/courses/settings': typeof AuthenticatedCoursesSettingsRoute;
    '/_authenticated/settings/account': typeof AuthenticatedSettingsAccountRoute;
    '/_authenticated/settings/appearance': typeof AuthenticatedSettingsAppearanceRoute;
    '/_authenticated/settings/display': typeof AuthenticatedSettingsDisplayRoute;
    '/_authenticated/settings/notifications': typeof AuthenticatedSettingsNotificationsRoute;
    '/_authenticated/tasks/settings': typeof AuthenticatedTasksSettingsRoute;
    '/_authenticated/tasks/sync': typeof AuthenticatedTasksSyncRoute;
    '/clerk/(auth)/sign-in': typeof ClerkauthSignInRoute;
    '/clerk/(auth)/sign-up': typeof ClerkauthSignUpRoute;
    '/clerk/_authenticated/user-management': typeof ClerkAuthenticatedUserManagementRoute;
    '/_authenticated/apps/': typeof AuthenticatedAppsIndexRoute;
    '/_authenticated/chats/': typeof AuthenticatedChatsIndexRoute;
    '/_authenticated/help-center/': typeof AuthenticatedHelpCenterIndexRoute;
    '/_authenticated/settings/': typeof AuthenticatedSettingsIndexRoute;
    '/_authenticated/tasks/': typeof AuthenticatedTasksIndexRoute;
    '/_authenticated/users/': typeof AuthenticatedUsersIndexRoute;
}
export interface FileRouteTypes {
    fileRoutesByFullPath: FileRoutesByFullPath;
    fullPaths: '/clerk' | '/settings' | '/clerk/' | '/forgot-password' | '/otp' | '/sign-in' | '/sign-in-2' | '/sign-up' | '/401' | '/403' | '/404' | '/500' | '/503' | '/analytics' | '/attendance' | '/basic-management' | '/courses' | '/dashboard' | '/data-query' | '/students' | '/tasks' | '/teachers' | '/' | '/courses/schedule' | '/courses/settings' | '/settings/account' | '/settings/appearance' | '/settings/display' | '/settings/notifications' | '/tasks/settings' | '/tasks/sync' | '/clerk/sign-in' | '/clerk/sign-up' | '/clerk/user-management' | '/apps' | '/chats' | '/help-center' | '/settings/' | '/tasks/' | '/users';
    fileRoutesByTo: FileRoutesByTo;
    to: '/clerk' | '/forgot-password' | '/otp' | '/sign-in' | '/sign-in-2' | '/sign-up' | '/401' | '/403' | '/404' | '/500' | '/503' | '/analytics' | '/attendance' | '/basic-management' | '/courses' | '/dashboard' | '/data-query' | '/students' | '/teachers' | '/' | '/courses/schedule' | '/courses/settings' | '/settings/account' | '/settings/appearance' | '/settings/display' | '/settings/notifications' | '/tasks/settings' | '/tasks/sync' | '/clerk/sign-in' | '/clerk/sign-up' | '/clerk/user-management' | '/apps' | '/chats' | '/help-center' | '/settings' | '/tasks' | '/users';
    id: '__root__' | '/_authenticated' | '/clerk' | '/_authenticated/settings' | '/clerk/(auth)' | '/clerk/_authenticated' | '/(auth)/forgot-password' | '/(auth)/otp' | '/(auth)/sign-in' | '/(auth)/sign-in-2' | '/(auth)/sign-up' | '/(errors)/401' | '/(errors)/403' | '/(errors)/404' | '/(errors)/500' | '/(errors)/503' | '/_authenticated/analytics' | '/_authenticated/attendance' | '/_authenticated/basic-management' | '/_authenticated/courses' | '/_authenticated/dashboard' | '/_authenticated/data-query' | '/_authenticated/students' | '/_authenticated/tasks' | '/_authenticated/teachers' | '/_authenticated/' | '/_authenticated/courses/schedule' | '/_authenticated/courses/settings' | '/_authenticated/settings/account' | '/_authenticated/settings/appearance' | '/_authenticated/settings/display' | '/_authenticated/settings/notifications' | '/_authenticated/tasks/settings' | '/_authenticated/tasks/sync' | '/clerk/(auth)/sign-in' | '/clerk/(auth)/sign-up' | '/clerk/_authenticated/user-management' | '/_authenticated/apps/' | '/_authenticated/chats/' | '/_authenticated/help-center/' | '/_authenticated/settings/' | '/_authenticated/tasks/' | '/_authenticated/users/';
    fileRoutesById: FileRoutesById;
}
export interface RootRouteChildren {
    AuthenticatedRouteRoute: typeof AuthenticatedRouteRouteWithChildren;
    ClerkRouteRoute: typeof ClerkRouteRouteWithChildren;
    authForgotPasswordRoute: typeof authForgotPasswordRoute;
    authOtpRoute: typeof authOtpRoute;
    authSignInRoute: typeof authSignInRoute;
    authSignIn2Route: typeof authSignIn2Route;
    authSignUpRoute: typeof authSignUpRoute;
    errors401Route: typeof errors401Route;
    errors403Route: typeof errors403Route;
    errors404Route: typeof errors404Route;
    errors500Route: typeof errors500Route;
    errors503Route: typeof errors503Route;
}
declare module '@tanstack/react-router' {
    interface FileRoutesByPath {
        '/clerk': {
            id: '/clerk';
            path: '/clerk';
            fullPath: '/clerk';
            preLoaderRoute: typeof ClerkRouteRouteImport;
            parentRoute: typeof rootRouteImport;
        };
        '/_authenticated': {
            id: '/_authenticated';
            path: '';
            fullPath: '';
            preLoaderRoute: typeof AuthenticatedRouteRouteImport;
            parentRoute: typeof rootRouteImport;
        };
        '/_authenticated/': {
            id: '/_authenticated/';
            path: '/';
            fullPath: '/';
            preLoaderRoute: typeof AuthenticatedIndexRouteImport;
            parentRoute: typeof AuthenticatedRouteRoute;
        };
        '/_authenticated/teachers': {
            id: '/_authenticated/teachers';
            path: '/teachers';
            fullPath: '/teachers';
            preLoaderRoute: typeof AuthenticatedTeachersRouteImport;
            parentRoute: typeof AuthenticatedRouteRoute;
        };
        '/_authenticated/tasks': {
            id: '/_authenticated/tasks';
            path: '/tasks';
            fullPath: '/tasks';
            preLoaderRoute: typeof AuthenticatedTasksRouteImport;
            parentRoute: typeof AuthenticatedRouteRoute;
        };
        '/_authenticated/students': {
            id: '/_authenticated/students';
            path: '/students';
            fullPath: '/students';
            preLoaderRoute: typeof AuthenticatedStudentsRouteImport;
            parentRoute: typeof AuthenticatedRouteRoute;
        };
        '/_authenticated/data-query': {
            id: '/_authenticated/data-query';
            path: '/data-query';
            fullPath: '/data-query';
            preLoaderRoute: typeof AuthenticatedDataQueryRouteImport;
            parentRoute: typeof AuthenticatedRouteRoute;
        };
        '/_authenticated/dashboard': {
            id: '/_authenticated/dashboard';
            path: '/dashboard';
            fullPath: '/dashboard';
            preLoaderRoute: typeof AuthenticatedDashboardRouteImport;
            parentRoute: typeof AuthenticatedRouteRoute;
        };
        '/_authenticated/courses': {
            id: '/_authenticated/courses';
            path: '/courses';
            fullPath: '/courses';
            preLoaderRoute: typeof AuthenticatedCoursesRouteImport;
            parentRoute: typeof AuthenticatedRouteRoute;
        };
        '/_authenticated/basic-management': {
            id: '/_authenticated/basic-management';
            path: '/basic-management';
            fullPath: '/basic-management';
            preLoaderRoute: typeof AuthenticatedBasicManagementRouteImport;
            parentRoute: typeof AuthenticatedRouteRoute;
        };
        '/_authenticated/attendance': {
            id: '/_authenticated/attendance';
            path: '/attendance';
            fullPath: '/attendance';
            preLoaderRoute: typeof AuthenticatedAttendanceRouteImport;
            parentRoute: typeof AuthenticatedRouteRoute;
        };
        '/_authenticated/analytics': {
            id: '/_authenticated/analytics';
            path: '/analytics';
            fullPath: '/analytics';
            preLoaderRoute: typeof AuthenticatedAnalyticsRouteImport;
            parentRoute: typeof AuthenticatedRouteRoute;
        };
        '/(errors)/503': {
            id: '/(errors)/503';
            path: '/503';
            fullPath: '/503';
            preLoaderRoute: typeof errors503RouteImport;
            parentRoute: typeof rootRouteImport;
        };
        '/(errors)/500': {
            id: '/(errors)/500';
            path: '/500';
            fullPath: '/500';
            preLoaderRoute: typeof errors500RouteImport;
            parentRoute: typeof rootRouteImport;
        };
        '/(errors)/404': {
            id: '/(errors)/404';
            path: '/404';
            fullPath: '/404';
            preLoaderRoute: typeof errors404RouteImport;
            parentRoute: typeof rootRouteImport;
        };
        '/(errors)/403': {
            id: '/(errors)/403';
            path: '/403';
            fullPath: '/403';
            preLoaderRoute: typeof errors403RouteImport;
            parentRoute: typeof rootRouteImport;
        };
        '/(errors)/401': {
            id: '/(errors)/401';
            path: '/401';
            fullPath: '/401';
            preLoaderRoute: typeof errors401RouteImport;
            parentRoute: typeof rootRouteImport;
        };
        '/(auth)/sign-up': {
            id: '/(auth)/sign-up';
            path: '/sign-up';
            fullPath: '/sign-up';
            preLoaderRoute: typeof authSignUpRouteImport;
            parentRoute: typeof rootRouteImport;
        };
        '/(auth)/sign-in-2': {
            id: '/(auth)/sign-in-2';
            path: '/sign-in-2';
            fullPath: '/sign-in-2';
            preLoaderRoute: typeof authSignIn2RouteImport;
            parentRoute: typeof rootRouteImport;
        };
        '/(auth)/sign-in': {
            id: '/(auth)/sign-in';
            path: '/sign-in';
            fullPath: '/sign-in';
            preLoaderRoute: typeof authSignInRouteImport;
            parentRoute: typeof rootRouteImport;
        };
        '/(auth)/otp': {
            id: '/(auth)/otp';
            path: '/otp';
            fullPath: '/otp';
            preLoaderRoute: typeof authOtpRouteImport;
            parentRoute: typeof rootRouteImport;
        };
        '/(auth)/forgot-password': {
            id: '/(auth)/forgot-password';
            path: '/forgot-password';
            fullPath: '/forgot-password';
            preLoaderRoute: typeof authForgotPasswordRouteImport;
            parentRoute: typeof rootRouteImport;
        };
        '/clerk/_authenticated': {
            id: '/clerk/_authenticated';
            path: '';
            fullPath: '/clerk';
            preLoaderRoute: typeof ClerkAuthenticatedRouteRouteImport;
            parentRoute: typeof ClerkRouteRoute;
        };
        '/clerk/(auth)': {
            id: '/clerk/(auth)';
            path: '/';
            fullPath: '/clerk/';
            preLoaderRoute: typeof ClerkauthRouteRouteImport;
            parentRoute: typeof ClerkRouteRoute;
        };
        '/_authenticated/settings': {
            id: '/_authenticated/settings';
            path: '/settings';
            fullPath: '/settings';
            preLoaderRoute: typeof AuthenticatedSettingsRouteRouteImport;
            parentRoute: typeof AuthenticatedRouteRoute;
        };
        '/_authenticated/users/': {
            id: '/_authenticated/users/';
            path: '/users';
            fullPath: '/users';
            preLoaderRoute: typeof AuthenticatedUsersIndexRouteImport;
            parentRoute: typeof AuthenticatedRouteRoute;
        };
        '/_authenticated/tasks/': {
            id: '/_authenticated/tasks/';
            path: '/';
            fullPath: '/tasks/';
            preLoaderRoute: typeof AuthenticatedTasksIndexRouteImport;
            parentRoute: typeof AuthenticatedTasksRoute;
        };
        '/_authenticated/settings/': {
            id: '/_authenticated/settings/';
            path: '/';
            fullPath: '/settings/';
            preLoaderRoute: typeof AuthenticatedSettingsIndexRouteImport;
            parentRoute: typeof AuthenticatedSettingsRouteRoute;
        };
        '/_authenticated/help-center/': {
            id: '/_authenticated/help-center/';
            path: '/help-center';
            fullPath: '/help-center';
            preLoaderRoute: typeof AuthenticatedHelpCenterIndexRouteImport;
            parentRoute: typeof AuthenticatedRouteRoute;
        };
        '/_authenticated/chats/': {
            id: '/_authenticated/chats/';
            path: '/chats';
            fullPath: '/chats';
            preLoaderRoute: typeof AuthenticatedChatsIndexRouteImport;
            parentRoute: typeof AuthenticatedRouteRoute;
        };
        '/_authenticated/apps/': {
            id: '/_authenticated/apps/';
            path: '/apps';
            fullPath: '/apps';
            preLoaderRoute: typeof AuthenticatedAppsIndexRouteImport;
            parentRoute: typeof AuthenticatedRouteRoute;
        };
        '/clerk/_authenticated/user-management': {
            id: '/clerk/_authenticated/user-management';
            path: '/user-management';
            fullPath: '/clerk/user-management';
            preLoaderRoute: typeof ClerkAuthenticatedUserManagementRouteImport;
            parentRoute: typeof ClerkAuthenticatedRouteRoute;
        };
        '/clerk/(auth)/sign-up': {
            id: '/clerk/(auth)/sign-up';
            path: '/sign-up';
            fullPath: '/clerk/sign-up';
            preLoaderRoute: typeof ClerkauthSignUpRouteImport;
            parentRoute: typeof ClerkauthRouteRoute;
        };
        '/clerk/(auth)/sign-in': {
            id: '/clerk/(auth)/sign-in';
            path: '/sign-in';
            fullPath: '/clerk/sign-in';
            preLoaderRoute: typeof ClerkauthSignInRouteImport;
            parentRoute: typeof ClerkauthRouteRoute;
        };
        '/_authenticated/tasks/sync': {
            id: '/_authenticated/tasks/sync';
            path: '/sync';
            fullPath: '/tasks/sync';
            preLoaderRoute: typeof AuthenticatedTasksSyncRouteImport;
            parentRoute: typeof AuthenticatedTasksRoute;
        };
        '/_authenticated/tasks/settings': {
            id: '/_authenticated/tasks/settings';
            path: '/settings';
            fullPath: '/tasks/settings';
            preLoaderRoute: typeof AuthenticatedTasksSettingsRouteImport;
            parentRoute: typeof AuthenticatedTasksRoute;
        };
        '/_authenticated/settings/notifications': {
            id: '/_authenticated/settings/notifications';
            path: '/notifications';
            fullPath: '/settings/notifications';
            preLoaderRoute: typeof AuthenticatedSettingsNotificationsRouteImport;
            parentRoute: typeof AuthenticatedSettingsRouteRoute;
        };
        '/_authenticated/settings/display': {
            id: '/_authenticated/settings/display';
            path: '/display';
            fullPath: '/settings/display';
            preLoaderRoute: typeof AuthenticatedSettingsDisplayRouteImport;
            parentRoute: typeof AuthenticatedSettingsRouteRoute;
        };
        '/_authenticated/settings/appearance': {
            id: '/_authenticated/settings/appearance';
            path: '/appearance';
            fullPath: '/settings/appearance';
            preLoaderRoute: typeof AuthenticatedSettingsAppearanceRouteImport;
            parentRoute: typeof AuthenticatedSettingsRouteRoute;
        };
        '/_authenticated/settings/account': {
            id: '/_authenticated/settings/account';
            path: '/account';
            fullPath: '/settings/account';
            preLoaderRoute: typeof AuthenticatedSettingsAccountRouteImport;
            parentRoute: typeof AuthenticatedSettingsRouteRoute;
        };
        '/_authenticated/courses/settings': {
            id: '/_authenticated/courses/settings';
            path: '/settings';
            fullPath: '/courses/settings';
            preLoaderRoute: typeof AuthenticatedCoursesSettingsRouteImport;
            parentRoute: typeof AuthenticatedCoursesRoute;
        };
        '/_authenticated/courses/schedule': {
            id: '/_authenticated/courses/schedule';
            path: '/schedule';
            fullPath: '/courses/schedule';
            preLoaderRoute: typeof AuthenticatedCoursesScheduleRouteImport;
            parentRoute: typeof AuthenticatedCoursesRoute;
        };
    }
}
declare const AuthenticatedSettingsRouteRouteWithChildren: any;
declare const AuthenticatedCoursesRouteWithChildren: any;
declare const AuthenticatedTasksRouteWithChildren: any;
declare const AuthenticatedRouteRouteWithChildren: any;
declare const ClerkauthRouteRouteWithChildren: any;
declare const ClerkAuthenticatedRouteRouteWithChildren: any;
declare const ClerkRouteRouteWithChildren: any;
export declare const routeTree: any;
export {};
//# sourceMappingURL=routeTree.gen.d.ts.map
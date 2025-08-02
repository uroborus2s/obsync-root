import { z } from 'zod';
declare const userStatusSchema: z.ZodUnion<[z.ZodLiteral<"active">, z.ZodLiteral<"inactive">, z.ZodLiteral<"invited">, z.ZodLiteral<"suspended">]>;
export type UserStatus = z.infer<typeof userStatusSchema>;
declare const userSchema: z.ZodObject<{
    id: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodString;
    username: z.ZodString;
    email: z.ZodString;
    phoneNumber: z.ZodString;
    status: z.ZodUnion<[z.ZodLiteral<"active">, z.ZodLiteral<"inactive">, z.ZodLiteral<"invited">, z.ZodLiteral<"suspended">]>;
    role: z.ZodUnion<[z.ZodLiteral<"superadmin">, z.ZodLiteral<"admin">, z.ZodLiteral<"cashier">, z.ZodLiteral<"manager">]>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    role: "superadmin" | "admin" | "manager" | "cashier";
    status: "active" | "inactive" | "invited" | "suspended";
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    createdAt: Date;
    updatedAt: Date;
}, {
    id: string;
    role: "superadmin" | "admin" | "manager" | "cashier";
    status: "active" | "inactive" | "invited" | "suspended";
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    createdAt: Date;
    updatedAt: Date;
}>;
export type User = z.infer<typeof userSchema>;
export declare const userListSchema: z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodString;
    username: z.ZodString;
    email: z.ZodString;
    phoneNumber: z.ZodString;
    status: z.ZodUnion<[z.ZodLiteral<"active">, z.ZodLiteral<"inactive">, z.ZodLiteral<"invited">, z.ZodLiteral<"suspended">]>;
    role: z.ZodUnion<[z.ZodLiteral<"superadmin">, z.ZodLiteral<"admin">, z.ZodLiteral<"cashier">, z.ZodLiteral<"manager">]>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    role: "superadmin" | "admin" | "manager" | "cashier";
    status: "active" | "inactive" | "invited" | "suspended";
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    createdAt: Date;
    updatedAt: Date;
}, {
    id: string;
    role: "superadmin" | "admin" | "manager" | "cashier";
    status: "active" | "inactive" | "invited" | "suspended";
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    createdAt: Date;
    updatedAt: Date;
}>, "many">;
export {};
//# sourceMappingURL=schema.d.ts.map
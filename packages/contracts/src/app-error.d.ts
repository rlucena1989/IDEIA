export declare class AppError extends Error {
    readonly code: string;
    readonly statusCode: number;
    readonly details?: Record<string, unknown>;
    constructor(code: string, message: string, statusCode?: number, details?: Record<string, unknown>);
    toJSON(): Record<string, unknown>;
}
export declare class NotFoundError extends AppError {
    constructor(resource: string, id?: string);
}
export declare class ValidationError extends AppError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class UnauthorizedError extends AppError {
    constructor(message?: string);
}
export declare class ForbiddenError extends AppError {
    constructor(message?: string);
}
//# sourceMappingURL=app-error.d.ts.map
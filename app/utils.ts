import { useMatches } from "@remix-run/react";
import { useMemo } from "react";
import type { User } from "~/models/user.server";

const DEFAULT_REDIRECT = "/";

export function safeRedirect(
    to: FormDataEntryValue | string | null | undefined,
    defaultRedirect: string = DEFAULT_REDIRECT,
) {
    if (!to || typeof to !== "string") {
        return defaultRedirect;
    }

    if (!to.startsWith("/") || to.startsWith("//")) {
        return defaultRedirect;
    }

    return to;
}

export function useMatchesData(
    id: string,
): Record<string, unknown> | undefined {
    const matchingRoutes = useMatches();
    const route = useMemo(
        () => matchingRoutes.find((route) => route.id === id), 
        [matchingRoutes, id],
    );
    return route?.data as Record<string, unknown>;
}

function isUser(user: unknown): user is User {
    return (
        user != null &&
        typeof user === "object" &&
        "email" in user &&
        typeof user.email === "string"
    );
}

export function useOptionalUser(): User | undefined {
    const data = useMatchesData("root");
    if (!data || !isUser(data.user)) {
        return undefined;
    }
    return data.user;
}

export function validateEmail(email: unknown): email is string {
    return typeof email === "string" && email.length > 3 && email.includes("@");
}

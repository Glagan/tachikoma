import { ServiceLogin, ServiceStatus } from "@Core/Service";

export function useService(): {
	status: {
		description: { [key in ServiceStatus]: string };
		color: { [key in ServiceStatus]: "loading" | "success" | "error" | "warning" | "info" };
	};
	login: {
		description: { [key in ServiceLogin]: string };
		color: { [key in ServiceLogin]: "loading" | "success" | "error" | "warning" | "info" };
	};
} {
	return {
		status: {
			description: {
				[ServiceStatus.MISSING_TOKEN]: "Missing Token",
				[ServiceStatus.MISSING_COOKIES]: "Missing Cookies",
				[ServiceStatus.INVALID_TOKEN]: "Invalid or expired Token",
				[ServiceStatus.SERVICE_ERROR]: "Service Unavailable",
				[ServiceStatus.TACHIKOMA_ERROR]: "Bad Request",
				[ServiceStatus.LOADING]: "Loading...",
				[ServiceStatus.LOGGED_IN]: "Logged In",
			},
			color: {
				[ServiceStatus.MISSING_TOKEN]: "warning",
				[ServiceStatus.MISSING_COOKIES]: "warning",
				[ServiceStatus.INVALID_TOKEN]: "warning",
				[ServiceStatus.SERVICE_ERROR]: "error",
				[ServiceStatus.TACHIKOMA_ERROR]: "warning",
				[ServiceStatus.LOADING]: "info",
				[ServiceStatus.LOGGED_IN]: "success",
			},
		},
		login: {
			description: {
				[ServiceLogin.MISSING_FIELDS]: "Missing field value",
				[ServiceLogin.EXPIRED_CHALLENGE]: "Challenge expired",
				[ServiceLogin.INVALID_CREDENTIALS]: "Invalid credentials",
				[ServiceLogin.INVALID_CHALLENGE]: "Invalid challenge",
				[ServiceLogin.SERVICE_ERROR]: "Service Unavailable",
				[ServiceLogin.TACHIKOMA_ERROR]: "Bad Request",
				[ServiceLogin.LOADING]: "Loading...",
				[ServiceLogin.SUCCESS]: "Logged In",
			},

			color: {
				[ServiceLogin.MISSING_FIELDS]: "warning",
				[ServiceLogin.EXPIRED_CHALLENGE]: "warning",
				[ServiceLogin.INVALID_CREDENTIALS]: "error",
				[ServiceLogin.INVALID_CHALLENGE]: "error",
				[ServiceLogin.SERVICE_ERROR]: "error",
				[ServiceLogin.TACHIKOMA_ERROR]: "warning",
				[ServiceLogin.LOADING]: "info",
				[ServiceLogin.SUCCESS]: "success",
			},
		},
	};
}

import { ServiceStatus } from "@Core/Service";

export function useStatus(): {
	description: { [key in ServiceStatus]: string };
	color: { [key in ServiceStatus]: "loading" | "success" | "error" | "warning" | "info" };
} {
	return {
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
	};
}

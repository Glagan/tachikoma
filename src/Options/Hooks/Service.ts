import { loginResultMap, loginStatusMap, ServiceLogin, ServiceStatus } from "@Core/Service";

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
			description: loginStatusMap,
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
			description: loginResultMap,
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

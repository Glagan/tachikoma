import { Lake } from "@Core/Lake";
import { loginResultMap, ServiceLogin } from "@Core/Service";

const LOADING_IMG = "/loading.png" as const;
const SUCCESS_IMG = "/ok.png" as const;
const ERROR_IMG = "/sleepy.png" as const;

(async () => {
	const path = window.location.pathname.slice(1); // Ignore `/`
	for (const service of Lake.services) {
		if (service.name === path || service.key === path) {
			if ("login" in service && service.login) {
				const image = document.getElementById("image") as HTMLImageElement;
				const body = document.getElementById("body")!;

				const urlSearchParams = new URLSearchParams(window.location.search);
				const params: ServiceLoginInformations = {};
				// Any other function returns
				// -- `TypeError: urlSearchParams.entries() is not iterable` for some reasons
				urlSearchParams.forEach((value, key) => {
					params[key] = value;
				});

				// Login...
				image.src = LOADING_IMG;
				body.textContent = "Logging in...";
				const result = await service.login(params);

				if (result.status === ServiceLogin.SUCCESS) {
					image.src = SUCCESS_IMG;
					body.textContent = "Logged in ! You can now close this page.";
				} else {
					image.src = ERROR_IMG;
					if (result.message) {
						body.textContent = `${loginResultMap[result.status]}\n${result.message}`;
					} else {
						body.textContent = loginResultMap[result.status];
					}
				}
			}
			break;
		}
	}
})();

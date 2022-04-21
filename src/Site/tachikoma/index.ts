import { Lake } from "@Core/Lake";

(async () => {
	const path = window.location.pathname.slice(1); // Ignore `/`
	for (const service of Lake.services) {
		if (service.name === path || service.key === path) {
			if ("login" in service && service.login) {
				const urlSearchParams = new URLSearchParams(window.location.search);
				const params: ServiceLoginInformations = {};
				// Any other function returns
				// -- `TypeError: urlSearchParams.entries() is not iterable` for some reasons
				urlSearchParams.forEach((value, key) => {
					params[key] = value;
				});
				await service.login(params);
				// TODO Display message on login
				// TODO Display success/error message after login
			}
			break;
		}
	}
})();

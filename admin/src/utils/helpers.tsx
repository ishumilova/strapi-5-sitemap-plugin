import {PLUGIN_ID} from "../pluginId";

export const fetchFromAPI = async (endpoint: string, method: string = "GET") => {
	const jwtToken = getJwtToken();

	const response = await fetch(`${process.env.STRAPI_ADMIN_BACKEND_URL}/${PLUGIN_ID}/${endpoint}`, {
		method,
		headers: {
			"Content-Type": "application/json",
			"Authorization": `Bearer ${jwtToken}`,
		},
	});

	if (!response.ok) {
		console.error(`Error fetching from ${endpoint}:`, response.statusText);
		return null;
	}

	return response.json();
};

export const getJwtToken = () => {
	const jwtToken = localStorage.getItem('jwtToken') || sessionStorage.getItem('jwtToken');
	return jwtToken ? `${jwtToken.replaceAll('"', '')}` : '';
};

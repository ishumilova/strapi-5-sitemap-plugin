import type {Core} from '@strapi/strapi';

const service = ({strapi}: { strapi: Core.Strapi }) => ({
	async getSitemap() {
		const sitemapEntries = await strapi.documents('plugin::strapi-5-sitemap-plugin.strapi-5-sitemap-plugin-content-type').findMany();
		const customURLs = await strapi.db.query('plugin::strapi-5-sitemap-plugin.strapi-5-sitemap-plugin-content-type-single-url').findMany();
		const baseURLObject = await strapi.documents('plugin::strapi-5-sitemap-plugin.strapi-5-sitemap-plugin-option').findFirst();
		const baseURL = baseURLObject.baseUrl;

		try {
			const collections = [];
			const sitemap = [];

			for (const sitemapEntry of sitemapEntries) {
				const isValidThumbnail = sitemapEntry.thumbnail && sitemapEntry.thumbnail !== '-';
				const populate = isValidThumbnail ? { [sitemapEntry.thumbnail]: true } : undefined;

				const entries = await strapi.documents(`api::${sitemapEntry.type}.${sitemapEntry.type}`).findMany({
					locale: sitemapEntry.langcode === '-' ? undefined : sitemapEntry.langcode,
					status: 'published',
					populate
				});

				collections.push({ ...sitemapEntry, entries });
			}

			collections.forEach((collection) => {
				const { pattern, priority, frequency, entries, lastModified, thumbnail } = collection;
				outerloop: for (const entry of entries) {
					let url = pattern;

					const placeholders = pattern.match(/\[([^\]]+)\]/g) || [];
					for (const placeholder of placeholders) {
						const key = placeholder.replace(/\[|\]/g, '');
						if (entry[key]) {
							url = url.replace(placeholder, entry[key]);
						} else {
							break outerloop;
						}
					}

					url = baseURL + url;

					const sitemapEntry = {
						url,
						priority,
						frequency,
						lastmod: undefined,
						thumbnail: undefined,
						thumbnailTitle: undefined,
					};

					if (lastModified === 'true') {
						sitemapEntry.lastmod = entry.updatedAt;
					}

					if (thumbnail !== '') {
						const media = Array.isArray(entry[thumbnail]) ? entry[thumbnail][0] : entry[thumbnail];

						if (media?.url) {
							sitemapEntry.thumbnail = media.url;
							sitemapEntry.thumbnailTitle = media.name;
						}
					}

					sitemap.push(sitemapEntry);
				}
			});

			const customSitemapEntries = customURLs.map((customURL) => ({
				url: `${baseURL}${customURL.slug}`,
				priority: customURL.priority,
				frequency: customURL.frequency,
			}));

			sitemap.push(...customSitemapEntries);

			const generateXML = (sitemap) => {
				const urlSet = sitemap
					.map(
						(entry) => `
					        <url>
					            <loc>${entry.url}</loc>
					            <priority>${entry.priority}</priority>
					            <changefreq>${entry.frequency}</changefreq>
					            ${entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ''}
					            ${entry.thumbnail ? `<image:image><image:loc>${entry.thumbnail}</image:loc><image:title>${entry.thumbnailTitle}</image:title></image:image>` : ''}
					        </url>`
					).join('');

				return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${urlSet}</urlset>`;
			};

			return generateXML(sitemap);
		} catch (error) {
			strapi.log.error('Error fetching entries:', error);
			throw new Error('Failed to fetch entries for types');
		}
	},
	async saveAdminData(data: any) {
		try {
			const result = await strapi.db.query('plugin::strapi-5-sitemap-plugin.strapi-5-sitemap-plugin-content-type').create({
				data,
			});

			return {
				message: 'Data saved successfully',
				savedData: result,
			};
		} catch (error) {
			strapi.log.error('Error saving data:', error);
			throw new Error('Failed to save data');
		}
	},
	async getAdminData() {
		try {
			const results = await strapi.db.query('plugin::strapi-5-sitemap-plugin.strapi-5-sitemap-plugin-content-type').findMany();

			return {
				results,
			};
		} catch (error) {
			strapi.log.error('Error fetching data:', error);
			throw new Error('Failed to fetch data');
		}
	},
	async getContentTypes() {
		try {
			const contentTypes = strapi.contentTypes;

			const collectionTypes = Object.keys(contentTypes)
				.filter((key) => contentTypes[key].kind === 'collectionType' && key.startsWith('api::'))
				.map((key) => ({
					uid: key,
					singularName: contentTypes[key].info.singularName,
					pluralName: contentTypes[key].info.pluralName,
					displayName: contentTypes[key].info.displayName,
				}));

			return {collectionTypes};
		} catch (error) {
			strapi.log.error('Error fetching content types:', error);
			throw new Error('Failed to fetch content types');
		}
	},
	async getLocales() {
		try {
			return await strapi.plugin('i18n').service('locales').find();
		} catch (error) {
			strapi.log.error('Error fetching locales:', error);
			throw new Error('Failed to fetch locales');
		}
	},
	async getAllowedFields(contentTypeSingularName) {
		const systemFields = ['createdAt', 'updatedAt', 'publishedAt', 'createdBy', 'updatedBy', 'locale'];

		const contentType = Object.values(strapi.contentTypes).find(
			(type) => type.info.singularName === contentTypeSingularName
		);

		const fields = [];

		Object.entries(contentType.attributes).forEach(([fieldName, field] : [fieldName: string, field: any]) => {
			if (
				!systemFields.includes(fieldName) &&
				field.type !== 'relation' &&
				field.type !== 'component'
			) {
				fields.push(fieldName);
			} else if (
				field.type === 'relation' &&
				field.relation.endsWith('ToOne') &&
				!['createdBy', 'updatedBy'].includes(fieldName)
			) {
				fields.push(`${fieldName}.id`);
			} else if (
				field.type === 'component' &&
				!field.repeatable
			) {
				const component = strapi.components[field.component];
				Object.keys(component.attributes).forEach((subFieldName) => {
					fields.push(`${fieldName}.${subFieldName}`);
				});
			}
		});

		if (!fields.includes('id')) {
			fields.push('id');
		}

		return {
			allowedFields: fields,
			slug: contentType.info.pluralName,
		};
	},
	async updateAdminData(data) {
		try {
			const result = await strapi.db.query('plugin::strapi-5-sitemap-plugin.strapi-5-sitemap-plugin-content-type').update({
				where: {id: data.id},
				data: {
					type: data.type,
					langcode: data.langcode,
					pattern: data.pattern,
					priority: data.priority,
					frequency: data.frequency,
					lastModified: data.lastModified,
					thumbnail: data.thumbnail,
				},
			});

			return {
				message: 'Data saved successfully',
				savedData: result,
			};
		} catch (error) {
			strapi.log.error('Error saving data:', error);
			throw new Error('Failed to save data');
		}
	},
	async deleteAdminData(id) {
		try {
			const result = await strapi.query('plugin::strapi-5-sitemap-plugin.strapi-5-sitemap-plugin-content-type').delete({
				where: {
					id: id,
				},
			});

			return {
				message: 'Data deleted successfully',
				deletedData: result,
			};
		} catch (error) {
			strapi.log.error('Error deleting data:', error);
			throw new Error('Failed to delete data');
		}
	},
	async getOptions() {
		try {
			const results = await strapi.documents('plugin::strapi-5-sitemap-plugin.strapi-5-sitemap-plugin-option').findFirst();
			if (results) {
				return {baseUrl: results.baseUrl};
			} else {
				return {baseUrl: ''};
			}
		} catch (error) {
			strapi.log.error('Error fetching locales:', error);
			throw new Error('Failed to fetch locales');
		}
	},
	async updateOptions(data) {
		try {
			const results = await strapi.documents('plugin::strapi-5-sitemap-plugin.strapi-5-sitemap-plugin-option').findFirst();
			let response = null;

			if (results) {
				response = await strapi.documents('plugin::strapi-5-sitemap-plugin.strapi-5-sitemap-plugin-option').update({
					documentId: results.documentId,
					data: {
						// @ts-ignore
						baseUrl: data.baseURL,
					},
				});
			} else {
				response = await strapi.db.query('plugin::strapi-5-sitemap-plugin.strapi-5-sitemap-plugin-option').create({
					data: {
						baseUrl: data.baseURL,
					},
				});
			}

			return {
				message: 'Data saved successfully',
				savedData: response,
			};
		} catch (error) {
			strapi.log.error('Error saving data:', error);
			throw new Error('Failed to save data');
		}
	},
	async getCustomURLs() {
		try {
			const results = await strapi.documents('plugin::strapi-5-sitemap-plugin.strapi-5-sitemap-plugin-content-type-single-url').findMany();

			return {
				results,
			};
		} catch (error) {
			strapi.log.error('Error fetching data:', error);
			throw new Error('Failed to fetch data');
		}
	},
	async postCustomURLs(data) {
		try {
			const result = await strapi.documents('plugin::strapi-5-sitemap-plugin.strapi-5-sitemap-plugin-content-type-single-url').create({
				data,
			});

			return {
				message: 'Data saved successfully',
				savedData: result,
			};
		} catch (error) {
			strapi.log.error('Error saving data:', error);
			throw new Error('Failed to save data');
		}
	},
	async putCustomURLs(data) {
		try {
			const result = await strapi.db.query('plugin::strapi-5-sitemap-plugin.strapi-5-sitemap-plugin-content-type-single-url').update({
				where: {id: data.id},
				data: {
					slug: data.slug,
					priority: data.priority,
					frequency: data.frequency,
				},
			});

			return {
				message: 'Data saved successfully',
				savedData: result,
			};
		} catch (error) {
			strapi.log.error('Error saving data:', error);
			throw new Error('Failed to save data');
		}
	},
	async deleteCustomURLs(id) {
		try {
			const result = await strapi.db.query('plugin::strapi-5-sitemap-plugin.strapi-5-sitemap-plugin-content-type-single-url').delete({
				where: {
					id: id,
				},
			});

			return {
				message: 'Data deleted successfully',
				deletedData: result,
			};
		} catch (error) {
			strapi.log.error('Error deleting data:', error);
			throw new Error('Failed to delete data');
		}
	}
});

export default service;

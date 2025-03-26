import { Button, SingleSelect, SingleSelectOption} from "@strapi/design-system";
import { Grid } from "@strapi/design-system";
import { Field } from "@strapi/design-system";
import { Modal } from "@strapi/design-system";
import React, {useEffect, useRef, useState} from "react";
import {PLUGIN_ID} from "../pluginId";
import {getJwtToken, BASE_URL} from "../utils/helpers";

interface CollectionType {
	uid: string;
	singularName: string;
	displayName: string;
}

export default function CollectionTypeModal({isOpen, setModalOpen, setNewCollectionTypeAdded, typeToEdit = null, setTypeToEdit, editID = '', setEditID}: {isOpen: boolean, setModalOpen: React.Dispatch<React.SetStateAction<boolean>>, setNewCollectionTypeAdded: React.Dispatch<React.SetStateAction<boolean>>, typeToEdit: any | null, setTypeToEdit: React.Dispatch<React.SetStateAction<string>>, editID: string, setEditID: React.Dispatch<React.SetStateAction<string>>}) {
	const [type, setType] = useState('');
	const [langcode, setLangcode] = useState('');
	const [pattern, setPattern] = useState('');
	const [priority, setPriority] = useState('');
	const [frequency, setFrequency] = useState('');
	const [lastModified, setLastModified] = useState('false');

	const [collectionTypes, setCollectionTypes] = useState<CollectionType[]>([]);
	const [locales, setLocales] = useState<any[]>([]);
	const [patternHint, setPatternHint] = useState('');

	const typeRef = useRef<HTMLInputElement>(null);
	const langcodeRef = useRef<HTMLInputElement>(null);
	const patternRef = useRef<HTMLInputElement>(null);
	const priorityRef = useRef<HTMLInputElement>(null);
	const frequencyRef = useRef<HTMLInputElement>(null);
	const lastModifiedRef = useRef<HTMLInputElement>(null);

	const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (event: React.ChangeEvent<HTMLInputElement>) => {
		setter(event.target.value);
	};
	const handleSelectChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (event: string) => {
		setter(event);
	};
	const validateFields = () => {
		if (!type) {
			typeRef.current?.focus();
			return false;
		}
		if (!pattern) {
			patternRef.current?.focus();
			return false;
		}
		if (!priority) {
			priorityRef.current?.focus();
			return false;
		}
		if (!frequency) {
			frequencyRef.current?.focus();
			return false;
		}
		return true;
	};

	const handleSubmit = async () => {
		if (!validateFields()) return;
		let response = null;

		try {
			if (typeToEdit && editID) {
				response = await fetch(`${BASE_URL}/${PLUGIN_ID}/admin`, {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						'Authorization': 'Bearer ' + getJwtToken(),
					},
					body: JSON.stringify({type, langcode, pattern, priority, frequency, lastModified, id: editID}),
				});
			} else {
				response = await fetch(`${process.env.STRAPI_ADMIN_BACKEND_URL}/${PLUGIN_ID}/admin`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						'Authorization': 'Bearer ' + getJwtToken(),
					},
					body: JSON.stringify({type, langcode, pattern, priority, lastModified, frequency}),
				});
			}

			if (response.ok) {
				const data = await response.json();
				setNewCollectionTypeAdded(true);
				setType('');
				setLangcode('');
				setPattern('');
				setPriority('');
				setFrequency('');
				setLastModified('false');
				setEditID('');
				setTypeToEdit('');
				setModalOpen(false);
			} else {
				alert("Error while saving!");
			}
		} catch (err) {
			console.error(err);
			alert("An unexpected error occurred.");
		}
	};

	useEffect(() => {
		if (typeToEdit) {
			setType(typeToEdit.type || '');
			setLangcode(typeToEdit.langcode || '');
			setPattern(typeToEdit.pattern || '');
			setPriority(typeToEdit.priority?.toString() || '');
			setFrequency(typeToEdit.frequency || '');
			setLastModified(typeToEdit.lastModified || 'false');
		} else {
			setType('');
			setLangcode('');
			setPattern('');
			setPriority('');
			setFrequency('');
			setLastModified('false');
			setEditID('');
		}
	}, [typeToEdit]);


	useEffect(() => {
		const getContentTypes = async () => {
			const response = await fetch(`${BASE_URL}/${PLUGIN_ID}/admin-get-content-types`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': 'Bearer ' + getJwtToken(),
				},
			});

			if (response.ok) {
				const data = await response.json();
				setCollectionTypes(data.collectionTypes);
			}
			else {
				alert("Error while loading!");
			}
		}

		const getLocales = async () => {
			const response = await fetch(`${BASE_URL}/${PLUGIN_ID}/admin-get-locales`, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					'Authorization': 'Bearer ' + getJwtToken(),
				},
			});

			if (response.ok) {
				const data = await response.json();
				setLocales(data);
			}
			else {
				alert("Error while loading!");
			}
		}

		getContentTypes();
		getLocales();
	}, []);

	useEffect(() => {
		if (type) {
			const getAllowedFields = async () => {
				const response = await fetch(`${BASE_URL}/${PLUGIN_ID}/admin-allowed-fields?type=${type}`, {
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': 'Bearer ' + getJwtToken(),
					},
				});

				const data = await response.json();

				setPatternHint('Possible fields: ' + data.allowedFields.map((field: string) => `[${field}]`).join(', '));
				if (pattern === '') {
					setPattern('/' + data.slug + '/');
				}
			}
			getAllowedFields();
		}
	}, [type]);

	const handleOnOpenChange = (open: boolean) => {
		if (!open) {
			setTypeToEdit('');
			setEditID('');
			setModalOpen(false);
		}
	};



	return (
		<Modal.Root open={isOpen} onOpenChange={(e: boolean) => handleOnOpenChange(e)}>
			<Modal.Content>
				<Modal.Header>
					<Modal.Title>
						{typeToEdit ? 'Edit Collection Type' : 'Add Collection Type'}
					</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<Grid.Root gap={4} col={1}>
						<Grid.Item>
							<Field.Root width='100%' hint="Select a collection type">
								<Field.Label>Type</Field.Label>
								<SingleSelect name="type" required onChange={handleSelectChange(setType)} ref={typeRef} value={type} placeholder="Select Type" disabled={typeToEdit}>
									{collectionTypes.map((collectionType: CollectionType) => (
										<SingleSelectOption key={collectionType.uid} value={collectionType.singularName}>{collectionType.displayName}</SingleSelectOption>
									))}
								</SingleSelect>
								<Field.Hint />
							</Field.Root>
						</Grid.Item>
						<Grid.Item>
							<Field.Root required width='100%' hint="Select a language or leave empty for all languages">
								<Field.Label>Lang Code</Field.Label>
								<SingleSelect name="langcode" onChange={handleSelectChange(setLangcode)} ref={langcodeRef} value={langcode} placeholder="Select Langcode" disabled={type === ''}>
									<SingleSelectOption value="-">None</SingleSelectOption>
									{locales.map((locale) => (
										<SingleSelectOption key={locale.id} value={locale.code}>{locale.code}</SingleSelectOption>
									))}
								</SingleSelect>
								<Field.Hint />
							</Field.Root>
						</Grid.Item>
						<Grid.Item>
							<Field.Root name="pattern" required width='100%' hint={`How do your links look like? ${patternHint}`}>
								<Field.Label>Pattern</Field.Label>
								<Field.Input value={pattern} onChange={handleInputChange(setPattern)} ref={patternRef} disabled={type === ''}/>
								<Field.Hint />
							</Field.Root>
						</Grid.Item>
						<Grid.Item>
							<Field.Root width='100%' hint="The priority of your pages">
								<Field.Label>Priority</Field.Label>
								<SingleSelect name="priority" required onChange={handleSelectChange(setPriority)} ref={priorityRef} value={priority} placeholder="Select Priority" disabled={type === ''}>
									<SingleSelectOption value="0.1">0.1</SingleSelectOption>
									<SingleSelectOption value="0.2">0.2</SingleSelectOption>
									<SingleSelectOption value="0.3">0.3</SingleSelectOption>
									<SingleSelectOption value="0.4">0.4</SingleSelectOption>
									<SingleSelectOption value="0.5">0.5</SingleSelectOption>
									<SingleSelectOption value="0.6">0.6</SingleSelectOption>
									<SingleSelectOption value="0.7">0.7</SingleSelectOption>
									<SingleSelectOption value="0.8">0.8</SingleSelectOption>
									<SingleSelectOption value="0.9">0.9</SingleSelectOption>
									<SingleSelectOption value="1">1</SingleSelectOption>
								</SingleSelect>
								<Field.Hint />
							</Field.Root>
						</Grid.Item>
						<Grid.Item>
							<Field.Root width='100%' hint="The changefrequency of your pages">
								<Field.Label>Change Frequency</Field.Label>
								<SingleSelect name="frequency" required onChange={handleSelectChange(setFrequency)} ref={frequencyRef} value={frequency} placeholder="Select Frequency" disabled={type === ''}>
									<SingleSelectOption value="always">Always</SingleSelectOption>
									<SingleSelectOption value="hourly">Hourly</SingleSelectOption>
									<SingleSelectOption value="daily">Daily</SingleSelectOption>
									<SingleSelectOption value="weekly">Weekly</SingleSelectOption>
									<SingleSelectOption value="monthly">Monthly</SingleSelectOption>
									<SingleSelectOption value="yearly">Yearly</SingleSelectOption>
									<SingleSelectOption value="never">Never</SingleSelectOption>
								</SingleSelect>
								<Field.Hint />
							</Field.Root>
						</Grid.Item>
						<Grid.Item>
							<Field.Root width='100%' hint="Add last modification date">
								<Field.Label>Last Modified</Field.Label>
								<SingleSelect name="lastModified" required onChange={handleSelectChange(setLastModified)} ref={lastModifiedRef} value={lastModified} placeholder="Select True or False" disabled={type === ''}>
									<SingleSelectOption value="false">False</SingleSelectOption>
									<SingleSelectOption value="true">True</SingleSelectOption>
								</SingleSelect>
								<Field.Hint />
							</Field.Root>
						</Grid.Item>
					</Grid.Root>
				</Modal.Body>
				<Modal.Footer>
					<Modal.Close>
						<Button variant="tertiary" onClick={() => {
							setTypeToEdit('');
							setModalOpen(false)
						}}>Cancel</Button>
					</Modal.Close>
					<Button onClick={handleSubmit}>Confirm</Button>
				</Modal.Footer>
			</Modal.Content>
		</Modal.Root>
	);
}

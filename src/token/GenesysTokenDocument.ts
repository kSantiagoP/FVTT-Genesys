import GenesysActor from '@/actor/GenesysActor';

export type TokenAttributeDetails =
	| {
			label: string;
			isBar: true;
			editable: boolean;
			valuePath: string;
			maxPath: string;
	  }
	| {
			label: string;
			isBar: false;
			editable: boolean;
			valuePath: string;
	  };

export type DataModelWithTokenAttributes = Function & { tokenAttributes?: Record<string, TokenAttributeDetails> };

type GenesysTrackedAttributes = TokenDocument.TrackedAttributesDescription & {
	source?: Record<string, TokenAttributeDetails>;
};

export default class GenesysTokenDocument extends TokenDocument {
	override getBarAttribute(barName: string, options?: TokenDocument.GetBarAttributeOptions): TokenDocument.GetBarAttributeReturn {
		const attribute: string | undefined = options?.alternative || (this as Record<string, any>)[barName]?.attribute;
		if (!this.actor || !attribute) {
			return null;
		}

		const actor = this.actor as unknown as GenesysActor;
		const tokenAttributes = (actor.system.constructor as DataModelWithTokenAttributes).tokenAttributes;
		if (!tokenAttributes) {
			return super.getBarAttribute(barName, options);
		}

		const system = actor.system;
		const targetAttribute = tokenAttributes[attribute] as TokenAttributeDetails | undefined;
		if (!targetAttribute) {
			return null;
		}

		const dataValue = foundry.utils.getProperty(system, targetAttribute.valuePath);
		if (!Number.isNumeric(dataValue)) {
			return null;
		}

		if (targetAttribute.isBar) {
			const dataMax = foundry.utils.getProperty(system, targetAttribute.maxPath);
			if (!Number.isNumeric(dataMax)) {
				return null;
			}

			return {
				type: 'bar' as const,
				attribute: attribute,
				value: Number(dataValue),
				max: Number(dataMax),
				editable: targetAttribute.editable,
			};
		}

		return {
			type: 'value' as const,
			attribute: attribute,
			value: Number(dataValue),
			editable: targetAttribute.editable,
		};
	}

	static override getTrackedAttributes(data?: TokenDocument.TrackedAttributesSubject | null, _path?: string[]): GenesysTrackedAttributes {
		if (data && foundry.utils.isSubclass(data.constructor as foundry.abstract.DataModel.AnyConstructor, foundry.abstract.DataModel)) {
			const tokenAttributes = (data!.constructor as DataModelWithTokenAttributes).tokenAttributes;
			if (tokenAttributes) {
				return {
					bar: [],
					value: [],
					source: tokenAttributes,
				};
			}
		}

		return super.getTrackedAttributes(data, _path);
	}

	static override getTrackedAttributeChoices(attributes: GenesysTrackedAttributes): TokenDocument.TrackedAttributesChoice[] {
		attributes = attributes || this.getTrackedAttributes();
		const barGroup = game.i18n.localize('TOKEN.BarAttributes');
		const valueGroup = game.i18n.localize('TOKEN.BarValues');

		if (attributes.source) {
			const trackedAttributes = (Object.entries(attributes.source) as [string, TokenAttributeDetails][]).reduce((accum, [attributeId, attributeDetails]) => {
				accum.push({
					group: attributeDetails.isBar ? barGroup : valueGroup,
					label: attributeDetails.label,
					value: attributeId,
				});
				return accum;
			}, [] as TokenDocument.TrackedAttributesChoice[]);
			trackedAttributes.sort((left, right) => {
				if (left.group !== right.group) {
					return left.group === barGroup ? -1 : 1;
				} else {
					return left.label.compare(right.label);
				}
			});

			return trackedAttributes;
		} else {
			return super.getTrackedAttributeChoices(attributes);
		}
	}
}

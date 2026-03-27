import type { FilterGroup, FilterRule } from '../types/filter';
import type { BaseFilterNode, BaseRawExpression, RawFilterBlock } from '../types/base-file';

/**
 * Full expression parser for Obsidian Bases .base filter syntax.
 *
 * Converts .base YAML filter conditions into ObsiMan FilterRule/FilterGroup nodes.
 * Expressions that can't be mapped are preserved as BaseRawExpression for round-trip.
 */
export class BaseFilterParser {
	/**
	 * Parse a raw filter block (and/or with nested conditions) into BaseFilterNode[].
	 */
	parseFilterBlock(block: RawFilterBlock): BaseFilterNode[] {
		if (block.and) {
			return this.parseConditionList(block.and, 'all');
		}
		if (block.or) {
			return this.parseConditionList(block.or, 'any');
		}
		return [];
	}

	/**
	 * Convert a .base filter block back into a RawFilterBlock for serialization.
	 */
	serializeFilterBlock(nodes: BaseFilterNode[], logic: 'all' | 'any'): RawFilterBlock {
		const conditions: (string | RawFilterBlock)[] = [];
		for (const node of nodes) {
			if (node.type === 'raw') {
				conditions.push(node.expression);
			} else if (node.type === 'rule') {
				conditions.push(this.serializeRule(node));
			} else if (node.type === 'group') {
				const childBlock = this.serializeFilterBlock(
					node.children as BaseFilterNode[],
					node.logic === 'all' ? 'all' : 'any'
				);
				conditions.push(childBlock);
			}
		}
		return logic === 'all' ? { and: conditions } : { or: conditions };
	}

	private parseConditionList(
		conditions: (string | RawFilterBlock)[],
		_logic: 'all' | 'any'
	): BaseFilterNode[] {
		const nodes: BaseFilterNode[] = [];
		for (const cond of conditions) {
			if (typeof cond === 'string') {
				nodes.push(this.parseExpression(cond));
			} else {
				// Nested block (and/or)
				nodes.push(this.parseNestedBlock(cond));
			}
		}
		return nodes;
	}

	private parseNestedBlock(block: RawFilterBlock): FilterGroup {
		const logic = block.and ? 'all' : 'any';
		const rawList = block.and ?? block.or ?? [];
		const children: BaseFilterNode[] = [];
		for (const item of rawList) {
			if (typeof item === 'string') {
				children.push(this.parseExpression(item));
			} else {
				children.push(this.parseNestedBlock(item));
			}
		}
		return {
			type: 'group',
			logic,
			children: children as FilterGroup['children'],
		};
	}

	/**
	 * Parse a single expression string into a FilterRule or BaseRawExpression.
	 */
	parseExpression(expr: string): FilterRule | BaseRawExpression {
		const trimmed = expr.trim();

		// Handle negation prefix
		const isNegated = trimmed.startsWith('!');
		const inner = isNegated ? trimmed.slice(1).trim() : trimmed;

		// file.hasTag("tag")
		const tagMatch = inner.match(/^file\.hasTag\(["'](.+?)["']\)$/);
		if (tagMatch) {
			return {
				type: 'rule',
				filterType: isNegated ? 'missing_property' : 'has_property',
				property: 'tags',
				values: [tagMatch[1]],
			};
		}

		// file.hasProperty("prop")
		const hasPropMatch = inner.match(/^file\.hasProperty\(["'](.+?)["']\)$/);
		if (hasPropMatch) {
			return {
				type: 'rule',
				filterType: isNegated ? 'missing_property' : 'has_property',
				property: hasPropMatch[1],
				values: [],
			};
		}

		// file.folder == "path" / file.folder != "path"
		const folderMatch = inner.match(/^file\.folder\s*(==|!=)\s*["'](.+?)["']$/);
		if (folderMatch) {
			const isExclude = folderMatch[1] === '!=' || isNegated;
			return {
				type: 'rule',
				filterType: isExclude ? 'folder_exclude' : 'folder',
				property: 'folder',
				values: [folderMatch[2]],
			};
		}

		// file.name contains / == / !=
		const fileNameMatch = inner.match(
			/^file\.name\s*(==|!=|\.contains\(["'](.+?)["']\))$/
		);
		if (fileNameMatch) {
			if (fileNameMatch[2]) {
				// .contains()
				return {
					type: 'rule',
					filterType: isNegated ? 'file_name_exclude' : 'file_name',
					property: 'name',
					values: [fileNameMatch[2]],
				};
			}
		}

		// file.ext == "ext" / file.ext != "ext"
		const extMatch = inner.match(/^file\.ext\s*(==|!=)\s*["'](.+?)["']$/);
		if (extMatch) {
			return {
				type: 'rule',
				filterType: extMatch[1] === '!=' ? 'file_name_exclude' : 'file_name',
				property: 'extension',
				values: [extMatch[2]],
			};
		}

		// property == "value" / property != "value"
		const eqMatch = inner.match(/^(\w[\w.]*)\s*(==|!=)\s*["'](.+?)["']$/);
		if (eqMatch) {
			const isExclude = eqMatch[2] === '!=' || isNegated;
			return {
				type: 'rule',
				filterType: isExclude ? 'missing_property' : 'specific_value',
				property: eqMatch[1],
				values: [eqMatch[3]],
			};
		}

		// property.contains(value) / property.containsAny(...)
		const containsMatch = inner.match(/^(\w[\w.]*)\.(contains|containsAny)\((.+)\)$/);
		if (containsMatch) {
			const property = containsMatch[1];
			const values = this.parseArgList(containsMatch[3]);
			return {
				type: 'rule',
				filterType: values.length > 1 ? 'multiple_values' : 'specific_value',
				property,
				values,
			};
		}

		// property.isEmpty()
		const emptyMatch = inner.match(/^(\w[\w.]*)\.isEmpty\(\)$/);
		if (emptyMatch) {
			return {
				type: 'rule',
				filterType: isNegated ? 'has_property' : 'missing_property',
				property: emptyMatch[1],
				values: [],
			};
		}

		// file.ext.containsAny(...)
		const extContainsMatch = inner.match(/^file\.ext\.containsAny\((.+)\)$/);
		if (extContainsMatch) {
			const values = this.parseArgList(extContainsMatch[1]);
			return {
				type: 'rule',
				filterType: isNegated ? 'file_name_exclude' : 'file_name',
				property: 'extension',
				values,
			};
		}

		// Fallback: preserve as raw expression for round-trip
		return { type: 'raw', expression: expr };
	}

	/** Parse a comma-separated argument list, extracting quoted strings and link() calls */
	private parseArgList(args: string): string[] {
		const values: string[] = [];
		let remaining = args.trim();

		while (remaining.length > 0) {
			remaining = remaining.replace(/^,\s*/, '');
			if (remaining.length === 0) break;

			// link("name") or link("name", "path")
			const linkMatch = remaining.match(/^link\((.+?)\)/);
			if (linkMatch) {
				const linkArgs = linkMatch[1];
				const parts = linkArgs.match(/["']([^"']+)["']/g);
				if (parts) {
					values.push(parts.map((p) => p.slice(1, -1)).join('/'));
				}
				remaining = remaining.slice(linkMatch[0].length).trim();
				continue;
			}

			// Quoted string
			const quotedMatch = remaining.match(/^["']([^"']*?)["']/);
			if (quotedMatch) {
				values.push(quotedMatch[1]);
				remaining = remaining.slice(quotedMatch[0].length).trim();
				continue;
			}

			// Unquoted value (until comma or end)
			const unquotedMatch = remaining.match(/^([^,]+)/);
			if (unquotedMatch) {
				values.push(unquotedMatch[1].trim());
				remaining = remaining.slice(unquotedMatch[0].length).trim();
				continue;
			}

			break;
		}

		return values;
	}

	/** Serialize a FilterRule back to .base expression syntax */
	private serializeRule(rule: FilterRule): string {
		switch (rule.filterType) {
			case 'has_property':
				if (rule.property === 'tags' && rule.values.length > 0) {
					return `file.hasTag("${rule.values[0]}")`;
				}
				return `file.hasProperty("${rule.property}")`;

			case 'missing_property':
				if (rule.values.length === 0) {
					return `${rule.property}.isEmpty()`;
				}
				return `${rule.property} != "${rule.values[0]}"`;

			case 'specific_value':
				return `${rule.property} == "${rule.values[0]}"`;

			case 'multiple_values': {
				const quotedVals = rule.values.map((v) => `"${v}"`).join(', ');
				return `${rule.property}.containsAny(${quotedVals})`;
			}

			case 'folder':
				return `file.folder == "${rule.values[0]}"`;

			case 'folder_exclude':
				return `file.folder != "${rule.values[0]}"`;

			case 'file_name':
				return `file.name.contains("${rule.values[0]}")`;

			case 'file_name_exclude':
				return `!file.name.contains("${rule.values[0]}")`;

			default:
				return `${rule.property} == "${rule.values.join(', ')}"`;
		}
	}
}

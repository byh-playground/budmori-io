const CONSTANT_NAME = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/u;
const VARIABLE_NAME = /^[a-z][A-Za-z0-9]*$/u;
const PARAMETER_NAME = /^(?:_*[a-z][A-Za-z0-9]*|_+)$/u;
const CLASS_NAME = /^[A-Z][A-Za-z0-9]*$/u;

// Visit binding identifiers only: property names and default values are APIs,
// not declarations. This also handles nested destructuring and rest bindings.
function visitBindings(pattern, visit) {
    if (!pattern) {
        return;
    }
    switch (pattern.type) {
        case 'Identifier':
            visit(pattern);
            break;
        case 'AssignmentPattern':
            visitBindings(pattern.left, visit);
            break;
        case 'RestElement':
            visitBindings(pattern.argument, visit);
            break;
        case 'ArrayPattern':
            for (const ELEMENT of pattern.elements) {
                visitBindings(ELEMENT, visit);
            }
            break;
        case 'ObjectPattern':
            for (const PROPERTY of pattern.properties) {
                visitBindings(PROPERTY.type === 'RestElement' ? PROPERTY.argument : PROPERTY.value, visit);
            }
            break;
    }
}

const BINDING_NAMES = {
    meta: {
        type: 'suggestion',
        docs: { description: 'Apply the project naming convention to declared bindings.' },
        schema: [],
        messages: {
            constant: 'Const binding "{{name}}" must use UPPER_SNAKE_CASE, including local values and functions.',
            variable: 'Let binding "{{name}}" must use camelCase.',
            parameter: 'Parameter "{{name}}" must use camelCase; an unused parameter may have an underscore prefix.',
            function: 'Function declaration "{{name}}" must use lowerCamelCase.',
            class: 'Class declaration "{{name}}" must use PascalCase.',
        },
    },
    create(context) {
        function checkName(identifier, pattern, messageId) {
            if (identifier && !pattern.test(identifier.name)) {
                context.report({ node: identifier, messageId, data: { name: identifier.name } });
            }
        }

        return {
            VariableDeclarator(node) {
                const KIND = node.parent.kind;
                if (KIND === 'const' || KIND === 'let') {
                    visitBindings(node.id, (identifier) => {
                        checkName(
                            identifier,
                            KIND === 'const' ? CONSTANT_NAME : VARIABLE_NAME,
                            KIND === 'const' ? 'constant' : 'variable',
                        );
                    });
                }
            },
            ':function'(node) {
                for (const PARAMETER of node.params) {
                    visitBindings(PARAMETER, (identifier) => checkName(identifier, PARAMETER_NAME, 'parameter'));
                }
                if (node.type === 'FunctionDeclaration') {
                    checkName(node.id, VARIABLE_NAME, 'function');
                }
            },
            ClassDeclaration(node) {
                checkName(node.id, CLASS_NAME, 'class');
            },
        };
    },
};

// Player-visible text lives in TextPairs (GameKit i18n via src/i18n/locale.js): a Hangul literal is allowed only inside the `ko` member
// of an object that also has an `en` member. Error messages are developer diagnostics and stay exempt.
const HANGUL = /[가-힣ㄱ-ㆎ]/u;
function propertyName(property) {
    return property.key.type === 'Identifier' ? property.key.name : property.key.value;
}
function isErrorConstruction(node) {
    return (
        (node.type === 'NewExpression' || node.type === 'CallExpression') &&
        node.callee.type === 'Identifier' &&
        /Error$/u.test(node.callee.name)
    );
}
const LOCALIZED_TEXT = {
    meta: {
        type: 'problem',
        docs: { description: 'Keep player-visible Korean text inside { ko, en } text pairs.' },
        schema: [],
        messages: {
            unpaired:
                'Player-visible text must be a { ko, en } pair resolved through LOCALE in src/i18n/locale.js (docs/i18n.md).',
        },
    },
    create(context) {
        function check(node, text) {
            if (!HANGUL.test(text)) {
                return;
            }
            const ANCESTORS = context.sourceCode.getAncestors(node);
            for (let index = ANCESTORS.length - 1; index >= 0; index -= 1) {
                const ANCESTOR = ANCESTORS[index];
                if (isErrorConstruction(ANCESTOR)) {
                    return;
                }
                if (ANCESTOR.type === 'Property' && ANCESTOR.parent.type === 'ObjectExpression') {
                    const PAIRED =
                        propertyName(ANCESTOR) === 'ko' &&
                        ANCESTOR.parent.properties.some(
                            (sibling) => sibling.type === 'Property' && propertyName(sibling) === 'en',
                        );
                    if (!PAIRED) {
                        context.report({ node, messageId: 'unpaired' });
                    }
                    return;
                }
            }
            context.report({ node, messageId: 'unpaired' });
        }
        return {
            Literal(node) {
                if (typeof node.value === 'string') {
                    check(node, node.value);
                }
            },
            TemplateElement(node) {
                check(node, node.value.cooked ?? node.value.raw);
            },
        };
    },
};

export default { rules: { 'binding-names': BINDING_NAMES, 'localized-text': LOCALIZED_TEXT } };

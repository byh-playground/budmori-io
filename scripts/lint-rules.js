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

export default { rules: { 'binding-names': BINDING_NAMES } };

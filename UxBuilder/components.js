// components.js

// Đây là thư viện component của bạn.
// Mỗi thuộc tính là một hàm nhận vào ID duy nhất và trả về 1 chuỗi HTML.

const Components = {
    'container': {
        getHtml: function(newId, properties = {}) {
            const backgroundColor = properties.backgroundColor || '';
            const style = backgroundColor ? `background-color: ${backgroundColor};` : '';
            
            return `
                <div class="container" 
                     data-builder-id="${newId}" 
                     data-component-name="container"
                     style="${style}">
                    <p>Container - Thêm Row vào đây</p>
                </div>
            `;
        },
        actions: [
            { 
                label: 'Thêm Row',
                type: 'ADD_CHILD',
                payload: 'row' 
            }
        ],
        properties: [
            {
                name: 'backgroundColor',
                label: 'Background Color',
                type: 'color',
                defaultValue: '#ffffff'
            }
        ]
    },

    'row': {
        getHtml: function(newId, properties = {}) {
            const backgroundColor = properties.backgroundColor || '';
            const fontSize = properties.fontSize || '';
            const style = [
                backgroundColor ? `background-color: ${backgroundColor}` : '',
                fontSize ? `font-size: ${fontSize}px` : ''
            ].filter(s => s).join('; ');
            
            return `
                <div class="row" 
                     data-builder-id="${newId}" 
                     data-component-name="row"
                     style="${style}">
                </div>
            `;
        },        actions: [
            { 
                label: 'Thêm Col (bên trong)',
                type: 'ADD_CHILD',
                payload: 'col'
            },
            { 
                label: 'Thêm Row (bên trong)',
                type: 'ADD_CHILD',
                payload: 'row'
            },
            { 
                label: 'Thêm Button (bên trong)',
                type: 'ADD_CHILD',
                payload: 'button'
            },
            { 
                label: 'Thêm Row (phía trên)',
                type: 'ADD_SIBLING_BEFORE',
                payload: 'row'
            },            { 
                label: 'Thêm Row (phía dưới)',
                type: 'ADD_SIBLING_AFTER',
                payload: 'row'
            }
        ],
        properties: [
            {
                name: 'backgroundColor',
                label: 'Background Color',
                type: 'color',
                defaultValue: '#ffffff'
            },
            {
                name: 'fontSize',
                label: 'Font Size',
                type: 'number',
                defaultValue: 16,
                min: 8,
                max: 72
            }
        ]
    },

    /**
     * Định nghĩa cho Col
     */
    'col': {
        getHtml: function(newId, properties = {}) {
            const backgroundColor = properties.backgroundColor || '';
            const fontSize = properties.fontSize || '';
            const style = [
                backgroundColor ? `background-color: ${backgroundColor}` : '',
                fontSize ? `font-size: ${fontSize}px` : ''
            ].filter(s => s).join('; ');
            
            return `
                <div class="col" 
                     data-builder-id="${newId}" 
                     data-component-name="col"
                     style="${style}">
                </div>
            `;
        },        actions: [
            { 
                label: 'Thêm Row (bên trong)', 
                type: 'ADD_CHILD', 
                payload: 'row' 
            },
            { 
                label: 'Thêm Button (bên trong)', 
                type: 'ADD_CHILD', 
                payload: 'button' 
            },
            { 
                label: 'Thêm Col (bên trái)', 
                type: 'ADD_SIBLING_BEFORE',
                payload: 'col' 
            },
            { 
                label: 'Thêm Col (bên phải)', 
                type: 'ADD_SIBLING_AFTER',
                payload: 'col' 
            }
        ],
        properties: [
            {
                name: 'backgroundColor',
                label: 'Background Color',
                type: 'color',
                defaultValue: '#ffffff'
            },
            {
                name: 'fontSize',
                label: 'Font Size',
                type: 'number',
                defaultValue: 16,
                min: 8,
                max: 72
            }
        ]
    },    'button':  {
        getHtml: function(newId, properties = {}) {
            const backgroundColor = properties.backgroundColor || '';
            const style = backgroundColor ? `background-color: ${backgroundColor};` : '';
            
            return `
                <button type="button" data-builder-id="${newId}"
                    data-component-name="button"
                    style="${style}">
                    Click Me
                </button>
            `;
        },
        actions: [
            { 
                label: 'Thêm Button (phía trên)', 
                type: 'ADD_SIBLING_BEFORE',
                payload: 'button' 
            },
            { 
                label: 'Thêm Button (phía dưới)', 
                type: 'ADD_SIBLING_AFTER',
                payload: 'button' 
            }
        ],
        properties: [
            {
                name: 'backgroundColor',
                label: 'Background Color',
                type: 'color',
                defaultValue: '#007bff'
            }
        ]
    },
    'default': {
        getHtml: null,
        actions: [
            { 
                label: 'Thêm Row (bên trong)', 
                type: 'ADD_CHILD', 
                payload: 'row' 
            }
        ]
    }
};
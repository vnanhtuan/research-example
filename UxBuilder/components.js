// components.js

// Đây là thư viện component của bạn.
// Mỗi thuộc tính là một hàm nhận vào ID duy nhất và trả về 1 chuỗi HTML.

const Components = {
    'container': {
        getHtml: function(newId) {
            return `
                <div class="container" 
                     data-builder-id="${newId}" 
                     data-component-name="container">
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
        ]
    },

    'row': {
        getHtml: function(newId) {
            return `
                <div class="row" 
                     data-builder-id="${newId}" 
                     data-component-name="row">
                </div>
            `;
        },

        actions: [
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
                label: 'Thêm Row (phía trên)',
                type: 'ADD_SIBLING_BEFORE',
                payload: 'row'
            },
            { 
                label: 'Thêm Row (phía dưới)',
                type: 'ADD_SIBLING_AFTER',
                payload: 'row'
            }
        ]
    },

    /**
     * Định nghĩa cho Col
     */
    'col': {
        getHtml: function(newId) {
            return `
                <div class="col" 
                     data-builder-id="${newId}" 
                     data-component-name="col">
                </div>
            `;
        },
        actions: [
            { 
                label: 'Thêm Row (bên trong)', 
                type: 'ADD_CHILD', 
                payload: 'row' 
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
        ]
    },
    'button':  {
        getHtml: function(newId) {
            return `
                <button type="button" data-builder-id="${newId}"
                    data-component-name="button">
                    Click Me
                </button>
            `;
        }
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
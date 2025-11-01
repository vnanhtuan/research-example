// vue-app.js

// ===================================
// VUE
// ===================================

// Instance Vue App
const app = Vue.createApp({
    setup() {
        // Cache DOM references to avoid repeated queries
        const iframeContents = Vue.ref(null);
        const iframeBody = Vue.ref(null);
        
        return {
            iframeContents,
            iframeBody
        };
    },
    data() {        return {
            tree: [],
            selectedElementId: null,
            selectedElementTag: '',
            elementCounter: 0,
            //availableActions: []
            hoveredElement: null,     // Hover element (in iframe)
            selectedLocation: null,   // Position click "+" (ADD_CHILD, etc.)
            adders: {                 // Buttons '+'
                top: null, bottom: null, left: null, right: null, inside: null
            },
            adderHideTimer: null, // Timer để quản lý việc ẩn 'adder'
            elementProperties: {}, // Store properties for each element
            currentProperties: {} // Current selected element's properties
        }
    },    computed:{
        availableActions() {
            if (!this.selectedElementId) return [];
            
            // Use cached iframe contents instead of querying each time
            if (!this.iframeContents) return [];
            
            const $el = this.iframeContents.find(`[data-builder-id="${this.selectedElementId}"]`);
            if (!$el.length) return [];

            let componentName;
            let component;

            if ($el.is('body')) {
                component = {
                    actions: [ { label: 'Thêm Container', type: 'ADD_CHILD', payload: 'container' } ]
                };
            } else {
                componentName = $el.attr('data-component-name') || 'default';
                component = Components[componentName] || Components['default'];
            }
            
            if (!component.actions) return [];
            
            // --- LOGIC PHÂN LUỒNG ---
            
            // 1. IF click '+', Filter base on position
            if (this.selectedLocation) {
                return component.actions.filter(action => action.type === this.selectedLocation);
            }
            
            // 2. DON'T click yet, return all actions
            return component.actions;
        },        selectedLocationLabel() {
            switch(this.selectedLocation) {
                case 'ADD_CHILD': return 'Bên trong';
                case 'ADD_SIBLING_BEFORE': return 'Bên trên / Bên trái';
                case 'ADD_SIBLING_AFTER': return 'Bên dưới / Bên phải';
                default: return '';
            }
        },

        // Get properties definition for current selected element
        availableProperties() {
            if (!this.selectedElementId) return [];
            
            const componentName = this.selectedElementTag;
            const component = Components[componentName] || Components['default'];
            
            return component.properties || [];
        },
        // Properties for the selected element
        availableProperties() {
            if (!this.selectedElementId) return [];
            
            const $el = this.iframeContents ? 
                this.iframeContents.find(`[data-builder-id="${this.selectedElementId}"]`) :
                $('#canvas').contents().find(`[data-builder-id="${this.selectedElementId}"]`);
            
            if (!$el.length) return [];
            
            const componentName = $el.attr('data-component-name') || 'default';
            const component = Components[componentName] || Components['default'];
            
            return component.properties || [];
        },

        // Current properties values of selected element
        currentProperties() {
            if (!this.selectedElementId) return {};
            
            const $el = this.iframeContents ? 
                this.iframeContents.find(`[data-builder-id="${this.selectedElementId}"]`) :
                $('#canvas').contents().find(`[data-builder-id="${this.selectedElementId}"]`);
            
            if (!$el.length) return {};
            
            const properties = {};
            const style = $el.attr('style') || '';
            
            // Parse existing styles
            if (style) {
                const styleRules = style.split(';').filter(rule => rule.trim());
                styleRules.forEach(rule => {
                    const [property, value] = rule.split(':').map(s => s.trim());
                    if (property === 'background-color') {
                        properties.backgroundColor = value;
                    }
                    if (property === 'font-size') {
                        properties.fontSize = value.replace('px', '');
                    }
                });
            }
            
            return properties;
        }
    },    methods: {
        // Initialize iframe references for better performance
        initIframeRefs() {
            this.iframeContents = $('#canvas').contents();
            this.iframeBody = this.iframeContents.find('body')[0];
        },
        
        startHideAddersTimer() {
            this.cancelHideAddersTimer();
            this.adderHideTimer = setTimeout(() => {
                this.hideAllAdders();
            }, 500);
        },
        // Hủy bỏ việc ẩn (khi di chuột vào nút +)
        cancelHideAddersTimer() {
            if (this.adderHideTimer) {
                clearTimeout(this.adderHideTimer);
                this.adderHideTimer = null;
            }
        },
        buildTreeData(element) {
            const $el = $(element);
            if (element.nodeType !== 1) return null;

            // Gán ID duy nhất nếu chưa có
            let id = $el.attr('data-builder-id');
            if (!id) {
                id = 'builder-el-' + this.elementCounter++;
                $el.attr('data-builder-id', id);
            }

            const componentName = $el.attr('data-component-name');
            const tagName = componentName ? componentName : element.tagName.toLowerCase();
            const node = {
                id: id,
                tag: tagName,
                element: element,
                selected: id === this.selectedElementId,
                children: []
            };

            // Đệ quy cho các con
            $el.children().each((i, childEl) => {
                const childNode = this.buildTreeData(childEl);
                if (childNode) {
                    node.children.push(childNode);
                }
            });

            return node;
        },        /**
         * Quét toàn bộ iframe body và xây dựng lại cây
         */
        refreshTree() {
            // Use cached iframe body if available
            const iframeBody = this.iframeBody || $('#canvas').contents().find('body')[0];
            this.tree = $(iframeBody).children().map((i, el) => this.buildTreeData(el)).get();
        },

        selectLocation(type) {
            // 1. SET position
            this.selectedLocation = type;
            if (this.hoveredElement) {
                this.selectElementFromIframe(this.hoveredElement);
            }
            this.hideAllAdders();
        },

        cancelAdd() {
            this.selectedLocation = null;
        },

        hideAllAdders() {
            this.adders = { top: null, bottom: null, left: null, right: null, inside: null };
            this.hoveredElement = null;
            this.cancelHideAddersTimer();
        },

        /**
         * CẬP NHẬT: selectElementFromTree
         * Đặt selectedLocation = null để kích hoạt "Luồng Cũ"
         */        selectElementFromTree(node) {
            this.cancelHideAddersTimer();
            // Use cached iframe contents if available
            const $iframeContents = this.iframeContents || $('#canvas').contents();
            const $el = $iframeContents.find(`[data-builder-id="${node.id}"]`);
            if ($el.length) {
                // Gọi hàm trung tâm để xử lý mọi việc
                this.selectElementFromIframe($el[0]);
            }
        },

        selectElementFromIframe(element) {
            this.cancelHideAddersTimer();

            const $el = $(element);
            const id = $el.attr('data-builder-id');
            
            if (id) {                // 1. Cập nhật State của Vue
                this.selectedElementId = id;
                this.selectedElementTag = $el.attr('data-component-name') || $el.prop('tagName').toLowerCase();
                this.selectedLocation = null; // Luôn quay về "Luồng Cũ" khi chọn
                
                // Load current element properties
                this.loadElementProperties(id);
                
                // 2. Cập nhật State của Tree View
                this.updateTreeSelection(this.tree, id);                // 3. Handle DOM in Iframe, remove old highlight and add highlight to new element
                const $iframeContents = this.iframeContents || $('#canvas').contents();
                $iframeContents.find('.builder-selected').removeClass('builder-selected');
                $el.addClass('builder-selected');
            }
        },

        /**
         * Hàm helper để cập nhật trạng thái selected cho cây data
         */
        updateTreeSelection(nodes, selectedId) {
            nodes.forEach(node => {
                node.selected = (node.id === selectedId);
                if (node.children.length > 0) {
                    this.updateTreeSelection(node.children, selectedId);
                }
            });
        },

        /**
         * CẬP NHẬT: executeAction
         * Tự động quay về "Luồng Cũ" sau khi thêm
         */        executeAction(action) {
            // Use cached iframe contents if available
            const $iframeContents = this.iframeContents || $('#canvas').contents();
            const $target = $iframeContents.find(`[data-builder-id="${this.selectedElementId}"]`);
            if (!$target.length) return;

            const newType = action.payload; 
            if (typeof Components[newType]?.getHtml !== 'function') { return; }
            
            const newId = 'builder-el-' + this.elementCounter++;
            
            // Initialize default properties for new element
            const defaultProps = this.getDefaultProperties(newType);
            this.elementProperties[newId] = defaultProps;
            
            const newHtml = Components[newType].getHtml(newId, defaultProps);

            // Ghi lại hành động (cần thiết cho Luồng Cũ)
            const actionType = this.selectedLocation || action.type;

            switch (actionType) {
                case 'ADD_CHILD': $target.append(newHtml); break;
                case 'ADD_SIBLING_BEFORE': $target.before(newHtml); break;
                case 'ADD_SIBLING_AFTER': $target.after(newHtml); break;
                default: return;
            }
            
            this.refreshTree();
            
            // Sau khi thêm, chọn element mới
            const newElement = $iframeContents.find(`[data-builder-id="${newId}"]`)[0];
            if (newElement) {
                this.selectElementFromIframe(newElement);
            } else {
                this.cancelAdd(); 
            }
        },

        // Get default properties for a component type
        getDefaultProperties(componentType) {
            const component = Components[componentType];
            if (!component || !component.properties) return {};
            
            const defaultProps = {};
            component.properties.forEach(prop => {
                defaultProps[prop.name] = prop.defaultValue;
            });
            return defaultProps;
        },

        // Load properties for selected element
        loadElementProperties(elementId) {
            this.currentProperties = { ...this.elementProperties[elementId] } || {};
        },

        // Update property value and refresh element
        updateProperty(propertyName, value) {
            if (!this.selectedElementId) return;
            
            // Update stored properties
            if (!this.elementProperties[this.selectedElementId]) {
                this.elementProperties[this.selectedElementId] = {};
            }
            this.elementProperties[this.selectedElementId][propertyName] = value;
            this.currentProperties[propertyName] = value;
            
            // Refresh the element in iframe
            this.refreshElement(this.selectedElementId);
        },

        // Refresh specific element with updated properties
        refreshElement(elementId) {
            const $iframeContents = this.iframeContents || $('#canvas').contents();
            const $element = $iframeContents.find(`[data-builder-id="${elementId}"]`);
            if (!$element.length) return;
            
            const componentName = $element.attr('data-component-name');
            const component = Components[componentName];
            if (!component || !component.getHtml) return;
            
            const properties = this.elementProperties[elementId] || {};
            const newHtml = component.getHtml(elementId, properties);
            
            // Replace element content while preserving position
            const $newElement = $(newHtml);
            $element.replaceWith($newElement);
            
            // Re-select the element to maintain selection
            $newElement.addClass('builder-selected');
        },

        // Update property of selected element
        updateProperty(propertyName, value) {
            if (!this.selectedElementId) return;
            
            const $el = this.iframeContents ? 
                this.iframeContents.find(`[data-builder-id="${this.selectedElementId}"]`) :
                $('#canvas').contents().find(`[data-builder-id="${this.selectedElementId}"]`);
            
            if (!$el.length) return;
            
            // Get current style
            let currentStyle = $el.attr('style') || '';
            
            // Remove existing property if exists
            const styleRules = currentStyle.split(';').filter(rule => rule.trim());
            const filteredRules = styleRules.filter(rule => {
                const [property] = rule.split(':').map(s => s.trim());
                if (propertyName === 'backgroundColor' && property === 'background-color') return false;
                if (propertyName === 'fontSize' && property === 'font-size') return false;
                return true;
            });
            
            // Add new property value
            if (value && value.trim()) {
                if (propertyName === 'backgroundColor') {
                    filteredRules.push(`background-color: ${value}`);
                } else if (propertyName === 'fontSize') {
                    filteredRules.push(`font-size: ${value}px`);
                }
            }
            
            // Update element style
            const newStyle = filteredRules.join('; ');
            $el.attr('style', newStyle);
        },

        // Save current template to file
        saveTemplate() {
            if (!this.iframeBody) {
                alert('Iframe chưa được load!');
                return;
            }
            
            // Get the full HTML content from iframe
            const $iframeDoc = $(this.iframeBody).closest('html');
            const fullHtml = $iframeDoc[0].outerHTML;
            
            // Create blob and download
            const blob = new Blob([fullHtml], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'template.html';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            alert('Template đã được lưu!');
        },
    }
});

// Register component on App
app.component('tree-node', {
    props: ['node'],
    data() {
        return {
            isOpen: true // Mặc định mở
        }
    },
    computed: {
        hasChildren() {
            return this.node.children && this.node.children.length > 0;
        }
    },
    template: `
        <div class="tree-node">
            <!-- Dòng chứa nội dung node (toggle và tên tag) -->
            <div class="node-content" :class="{ 'selected': node.selected }">
                <!-- Nút Toggle (chỉ hiển thị nếu có con) -->
                <span @click.stop="toggleOpen" class="toggle-icon">
                    <template v-if="hasChildren">
                        {{ isOpen ? '[-]' : '[+]' }}
                    </template>
                    <template v-else>
                        &bull;
                    </template>
                </span>

                <!-- Tên Node (click để chọn) -->
                <strong @click.stop="selectNode" class="node-label">
                    &lt;{{ node.tag }}&gt;
                </strong>
            </div>

            <!-- Vùng chứa các con (chỉ render nếu isOpen) -->
            <div class="node-children" v-if="isOpen && hasChildren">
                <!-- Đệ quy gọi lại chính nó -->
                <tree-node
                    v-for="child in node.children"
                    :key="child.id"
                    :node="child"
                    @node-selected="$emit('node-selected', $event)">
                </tree-node>
            </div>
        </div>
    `,
    methods: {
        selectNode() {
            this.$emit('node-selected', this.node);
        },
        toggleOpen() {
            if (this.hasChildren) {
                this.isOpen = !this.isOpen;
            }
        }
    }
});

// 3. Mount app into DOM
let vueApp;

// Export app và mount function để có thể sử dụng từ file khác
window.initVueApp = function() {
    vueApp = app.mount('#app-root');
    return vueApp;
};

window.getVueApp = function() {
    return vueApp;
};

// builder.js

// ===================================
// VUE
// ===================================

// Instance Vue App
const app = Vue.createApp({
    data() {
        return {
            tree: [],
            selectedElementId: null,
            selectedElementTag: '',
            elementCounter: 0,
            availableActions: []
        }
    },
    methods: {
        buildTreeData(element) {
            const $el = $(element);
            
            // Bỏ qua các node không phải element (như text node, comment node)
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
        },

        /**
         * Quét toàn bộ iframe body và xây dựng lại cây
         */
        refreshTree() {
            const iframeBody = $('#canvas').contents().find('body')[0];
            this.tree = $(iframeBody).children().map((i, el) => this.buildTreeData(el)).get();
        },

        /**
         * Cap nhap actions cua inspector
         */
        updateInspectorActions(element) {
            const $el = $(element);
            const componentName = $el.attr('data-component-name');
            
            if (componentName && Components[componentName]) {
                // Nếu là component (Row, Col), lấy actions của nó
                this.availableActions = Components[componentName].actions;
            } else if ($el.is('body')) {
                // Nếu là body, chỉ cho thêm Row
                this.availableActions = [
                    { label: 'Thêm Container', type: 'ADD_CHILD', payload: 'container' }
                ];
            } else {
                // Nếu là thẻ HTML (p, h1...), lấy actions 'default'
                this.availableActions = Components['default'].actions;
            }
        },

        /**
         * Được gọi khi click vào 1 node trên Tree View
         */
        selectElementFromTree(node) {
            this.selectedElementId = node.id;
            this.selectedElementTag = node.tag;
            
            // Dùng jQuery để tìm element trong iframe và highlight
            const $iframeContents = $('#canvas').contents();
            $iframeContents.find('.builder-selected').removeClass('builder-selected');
            $iframeContents.find(`[data-builder-id="${node.id}"]`).addClass('builder-selected');

            // Cập nhật trạng thái 'selected' cho tree
            this.updateTreeSelection(this.tree, node.id);

            // Cập nhật Inspector (dùng .element đã lưu)
            this.updateInspectorActions(node.element);
        },

        /**
         * Được gọi từ bên ngoài (jQuery) khi click vào element trong iframe
         */
        
        selectElementFromIframe(element) {
            const $el = $(element);
            const id = $el.attr('data-builder-id');
            
            if (id) {
                this.selectedElementId = id;
                this.selectedElementTag = $el.attr('data-component-name') || $el.prop('tagName').toLowerCase();

                // Cập nhật trạng thái 'selected' cho tree
                this.updateTreeSelection(this.tree, id);

                // Cập nhật Inspector
                this.updateInspectorActions(element);
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

        executeAction(action) {
            // 1. Tìm element mục tiêu
            const $target = $('#canvas').contents().find(`[data-builder-id="${this.selectedElementId}"]`);
            if (!$target.length) return;

            // 2. Lấy thông tin component mới
            const newType = action.payload; // 'row' hoặc 'col'
            if (typeof Components[newType]?.getHtml !== 'function') {
                console.error(`Component '${newType}' không có hàm getHtml`);
                return;
            }
            
            // 3. Tạo HTML
            const newId = 'builder-el-' + this.elementCounter++;
            const newHtml = Components[newType].getHtml(newId);

            // 4. Thực thi hành động dựa trên 'type'
            switch (action.type) {
                case 'ADD_CHILD':
                    $target.append(newHtml);
                    break;
                case 'ADD_SIBLING_BEFORE':
                    $target.before(newHtml);
                    break;
                case 'ADD_SIBLING_AFTER':
                    $target.after(newHtml);
                    break;
                default:
                    console.error("Hành động không xác định:", action.type);
            }
            
            // 5. Cập nhật Tree View
            this.refreshTree();
            
            // 6. (Tùy chọn) Chọn component vừa mới tạo
            const newElement = $('#canvas').contents().find(`[data-builder-id="${newId}"]`)[0];
            if (newElement) {
                // Giả lập một "node" object để truyền đi
                const newNode = {
                    id: newId,
                    tag: newType,
                    element: newElement
                };
                this.selectElementFromTree(newNode);
                // Đảm bảo nó được highlight
                $(newElement).addClass('builder-selected');
            }
        }
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
vueApp = app.mount('#builder-ui');


// ===================================
// JQUERY
// ===================================
$(document).ready(function() {
    const $iframe = $('#canvas');

    $iframe.on('load', function() {
        const $iframeContents = $iframe.contents();
        const $body = $iframeContents.find('body');
        if ($body.length === 0) return;

        // Tiêm CSS
        $iframeContents.find('head').append(`
            <style>
                .builder-selected {
                    outline: 2px dashed blue !important;
                    box-shadow: 0 0 10px rgba(0,0,255,0.5);
                }
                body * { cursor: default !important; }
            </style>
        `);

        // Gắn listener click (để chọn)
        $body.on('click', '*', function(e) {
            e.stopPropagation();
            
            const $clickedElement = $(this);
            $iframeContents.find('.builder-selected').removeClass('builder-selected');
            $clickedElement.addClass('builder-selected');

            let id = $clickedElement.attr('data-builder-id');
            if (!id) {
                id = 'builder-el-' + vueApp.elementCounter++;
                $clickedElement.attr('data-builder-id', id);
                vueApp.refreshTree(); 
            }
            vueApp.selectElementFromIframe(this);
        });
        
        // --- TOÀN BỘ LOGIC mousemove VÀ ADDER ĐÃ BỊ XÓA ---
        
        vueApp.refreshTree();
    });

    // Tải template (giữ nguyên)
    $.get('template.html', function(htmlContent) {
        const iframeDoc = $iframe.contents()[0]; 
        iframeDoc.open();
        iframeDoc.write(htmlContent); 
        iframeDoc.close(); 
    }).fail(function() {
        console.error("Không thể tải template.html.");
    });
});
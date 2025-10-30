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
            //availableActions: []
            hoveredElement: null,     // Hover element (in iframe)
            selectedLocation: null,   // Position click "+" (ADD_CHILD, etc.)
            adders: {                 // Buttons '+'
                top: null, bottom: null, left: null, right: null, inside: null
            },
            adderHideTimer: null // Timer để quản lý việc ẩn 'adder'
        }
    },
    computed:{
        availableActions() {
            if (!this.selectedElementId) return [];
            
            // Get element from iframe
            const $el = $('#canvas').contents().find(`[data-builder-id="${this.selectedElementId}"]`);
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
        },

        selectedLocationLabel() {
            switch(this.selectedLocation) {
                case 'ADD_CHILD': return 'Bên trong';
                case 'ADD_SIBLING_BEFORE': return 'Bên trên / Bên trái';
                case 'ADD_SIBLING_AFTER': return 'Bên dưới / Bên phải';
                default: return '';
            }
        }
    },
    methods: {
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
        },

        /**
         * Quét toàn bộ iframe body và xây dựng lại cây
         */
        refreshTree() {
            const iframeBody = $('#canvas').contents().find('body')[0];
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
         */
        selectElementFromTree(node) {
            this.cancelHideAddersTimer();
            const $el = $('#canvas').contents().find(`[data-builder-id="${node.id}"]`);
            if ($el.length) {
                // Gọi hàm trung tâm để xử lý mọi việc
                this.selectElementFromIframe($el[0]);
            }
        },

        selectElementFromIframe(element) {
            this.cancelHideAddersTimer();

            const $el = $(element);
            const id = $el.attr('data-builder-id');
            
            if (id) {
                // 1. Cập nhật State của Vue
                this.selectedElementId = id;
                this.selectedElementTag = $el.attr('data-component-name') || $el.prop('tagName').toLowerCase();
                this.selectedLocation = null; // Luôn quay về "Luồng Cũ" khi chọn
                
                // 2. Cập nhật State của Tree View
                this.updateTreeSelection(this.tree, id);

                // 3. Handle DOM in Iframe, remove old highlight and add highlight to new element
                const $iframeContents = $('#canvas').contents();
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
         */
        executeAction(action) {
            const $target = $('#canvas').contents().find(`[data-builder-id="${this.selectedElementId}"]`);
            if (!$target.length) return;

            const newType = action.payload; 
            if (typeof Components[newType]?.getHtml !== 'function') { return; }
            
            const newId = 'builder-el-' + this.elementCounter++;
            const newHtml = Components[newType].getHtml(newId);

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
            const newElement = $('#canvas').contents().find(`[data-builder-id="${newId}"]`)[0];
            if (newElement) {
                this.selectElementFromIframe(newElement);
            } else {
                this.cancelAdd(); 
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
vueApp = app.mount('#app-root');


// ===================================
// JQUERY
// ===================================
$(document).ready(function() {
    const $iframe = $('#canvas');
    let iframeRect = null; // Cache vị trí iframe

    $iframe.on('load', function() {
        const $iframeContents = $iframe.contents();
        const $body = $iframeContents.find('body');
        if ($body.length === 0) return;

        iframeRect = $iframe[0].getBoundingClientRect();

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

            let id = $clickedElement.attr('data-builder-id');
            if (!id) {
                id = 'builder-el-' + vueApp.elementCounter++;
                $clickedElement.attr('data-builder-id', id);
                vueApp.refreshTree(); 
            }
            vueApp.selectElementFromIframe(this);
        });

        // --- HOVER ---
        $body.on('mousemove', function(e) {

            // Nếu đang chọn vị trí (inspector đang mở) thì không làm gì
            if (vueApp.selectedLocation) return;
            
            // e.target là element đang hover
            const $target = $(e.target);
            
            // Bỏ qua body VÀ cả <html>
            if ($target.is('body') || $target.is('html')) {
                vueApp.hideAllAdders();
                return;
            }
            
            // Giữ element đang hover
            vueApp.hoveredElement = e.target;
            
            // Lấy thông tin component
            const componentName = $target.attr('data-component-name') || 'default';
            const component = Components[componentName] || Components['default'];
            if (!component.actions) {
                 vueApp.hideAllAdders();
                 return;
            }
            
            // Lấy vị trí element trong iframe
            const elRect = e.target.getBoundingClientRect();
            
            // Tính toán vị trí tuyệt đối (so với cửa sổ)
            // (Vị trí iframe + Vị trí element trong iframe)
            const top = iframeRect.top + elRect.top;
            const left = iframeRect.left + elRect.left;
            const width = elRect.width;
            const height = elRect.height;
            
            const adders = {};

            // Hiển thị nút dựa trên 'actions' mà component có
            if (component.actions.some(a => a.type === 'ADD_SIBLING_BEFORE')) {
                if (componentName === 'col') { // Col: hiển thị bên TRÁI
                    adders.left = { top: (top + height/2 - 12) + 'px', left: (left - 12) + 'px', display: 'flex' };
                } else { // Row, Container: hiển thị bên TRÊN
                    adders.top = { top: (top - 12) + 'px', left: (left + width/2 - 12) + 'px', display: 'flex' };
                }
            }
            if (component.actions.some(a => a.type === 'ADD_SIBLING_AFTER')) {
                if (componentName === 'col') { // Col: hiển thị bên PHẢI
                    adders.right = { top: (top + height/2 - 12) + 'px', left: (left + width - 12) + 'px', display: 'flex' };
                } else { // Row, Container: hiển thị bên DƯỚI
                    adders.bottom = { top: (top + height - 12) + 'px', left: (left + width/2 - 12) + 'px', display: 'flex' };
                }
            }
            if (component.actions.some(a => a.type === 'ADD_CHILD')) {
                adders.inside = { top: (top + height/2 - 12) + 'px', left: (left + width/2 - 12) + 'px', display: 'flex' };
            }
            
            vueApp.adders = adders;
        });
        // Ẩn nút khi rời chuột khỏi iframe (Không đổi)
        $body.on('mouseleave', function() {
            console.log('mouseleave');
            vueApp.startHideAddersTimer();
        });
        
        // Ẩn nút khi cuộn iframe (Không đổi)
        $iframeContents.on('scroll', function() {
            if (!vueApp.selectedLocation) {
                 vueApp.hideAllAdders();
            }
        });

        // Cập nhật lại vị trí iframe nếu cửa sổ resize (Không đổi)
        $(window).on('resize', function() {
            iframeRect = $iframe[0].getBoundingClientRect();
        });
        
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
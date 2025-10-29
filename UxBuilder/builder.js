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
            elementCounter: 0
        }
    },
    methods: {
        /**
         * Hàm đệ quy để build cây DOM từ 1 element
         */
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

            const node = {
                id: id,
                tag: element.tagName.toLowerCase(),
                element: element, // Tham chiếu trực tiếp đến DOM element trong iframe
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
        },

        /**
         * Được gọi từ bên ngoài (jQuery) khi click vào element trong iframe
         */
        
        selectElementFromIframe(element) {
            const $el = $(element);
            const id = $el.attr('data-builder-id');
            
            if (id) {
                this.selectedElementId = id;
                this.selectedElementTag = $el.prop('tagName').toLowerCase();
                // Cập nhật trạng thái 'selected' cho tree
                this.updateTreeSelection(this.tree, id);
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
         * Thêm component (Row/Col) vào element đang chọn
         */
        addComponent(type) {
            if (!this.selectedElementId) {
                alert("Bạn cần chọn một element trước!");
                return;
            }

            // Tìm element cha trong iframe
            const $parentElement = $('#canvas').contents().find(`[data-builder-id="${this.selectedElementId}"]`);
            if (!$parentElement.length) return;

            console.log('test', typeof Components[type]);
            if (typeof Components[type] !== 'function') {
                console.error(`Component '${type}' không được định nghĩa trong components.js`);
                return;
            }

            // Tạo HTML cho component mới
            const newId = 'builder-el-' + this.elementCounter++;
            const newHtml = Components[type](newId);


            // Dùng jQuery để chèn HTML vào iframe
            $parentElement.append(newHtml);

            // Sau khi chèn, build lại cây
            this.refreshTree();

            const newNode = { id: newId, tag: 'div' }; 
            this.selectElementFromTree(newNode);
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
    
    // 1. Load file template.html vào iframe
    $.get('template.html', function(htmlContent) {
        /**
         * 1. HÀM NÀY SẼ CHẠY KHI IFRAME LOAD XONG
         * (Nó sẽ chạy 2 LẦN: một lần cho 'about:blank' và
         * một lần sau khi chúng ta 'document.write' xong)
         */
        $iframe.on('load', function() {
            const $iframeContents = $iframe.contents();

            // Chỉ thực hiện khi iframe CÓ body (tức là sau khi đã write)
            if ($iframeContents.find('body').length === 0) {
                return;
            }

            // 2. Tiêm CSS vào <head>
            $iframeContents.find('head').append(`
                <style>
                    .builder-selected {
                        outline: 2px dashed blue !important;
                        box-shadow: 0 0 10px rgba(0,0,255,0.5);
                    }
                    body * { cursor: default !important; }
                </style>
            `);

            // 3. Gắn listener click vào <body>
            $iframeContents.find('body').on('click', '*', function(e) {
                e.stopPropagation();
                
                const $clickedElement = $(this);
                
                $iframeContents.find('.builder-selected').removeClass('builder-selected');
                $clickedElement.addClass('builder-selected');

                let id = $clickedElement.attr('data-builder-id');
                if (!id) {
                    // Chúng ta dùng vueApp vì nó là biến toàn cục
                    id = 'builder-el-' + vueApp.elementCounter++; 
                    $clickedElement.attr('data-builder-id', id);
                    vueApp.refreshTree(); 
                }

                vueApp.selectElementFromIframe(this);
            });

            // 4. Quét cây DOM (chỉ chạy khi load xong)
            vueApp.refreshTree();
        });

        /**
         * 5. TẢI FILE HTML...
         */
        $.get('template.html', function(htmlContent) {
            const iframeDoc = $iframe.contents()[0]; 
            iframeDoc.open();
            iframeDoc.write(htmlContent); 
            iframeDoc.close(); // Kích hoạt sự kiện 'load' ở trên
        }).fail(function() {
            console.error("Không thể tải template.html. Hãy đảm bảo file tồn tại và bạn đang chạy trên một web server.");
        });
    });
});
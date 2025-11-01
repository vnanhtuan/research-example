// jquery-handlers.js

// ===================================
// JQUERY
// ===================================

$(document).ready(function() {
    // Initialize Vue app first
    const vueApp = window.initVueApp();
    
    const $iframe = $('#canvas');
    $iframe.on('load', function() {
    let iframeRect = null; // Cache vị trí iframe    
        const $iframeContents = $iframe.contents();
        const $body = $iframeContents.find('body');
        if ($body.length === 0) return;

        // Initialize iframe references in Vue app for better performance
        vueApp.initIframeRefs();

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
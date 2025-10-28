// components.js

// Đây là thư viện component của bạn.
// Mỗi thuộc tính là một hàm nhận vào ID duy nhất và trả về 1 chuỗi HTML.

const Components = {
    /**
     * Định nghĩa cho Row
     */
    'row': function(newId) {
        // Bạn có thể tùy chỉnh HTML phức tạp tùy ý ở đây
        return `
            <div class="row" data-builder-id="${newId}">
                <p>Row</p>
            </div>
        `;
    },

    /**
     * Định nghĩa cho Col
     */
    'col': function(newId) {
        return `
            <div class="col" data-builder-id="${newId}">
                <p>Col</p>
            </div>
        `;
    },
    
    /**
     * Ví dụ: Component "Nút bấm"
     */
    'button': function(newId) {
        return `
            <button type="button" data-builder-id="${newId}">
                Click Me
            </button>
        `;
    }

    // Thêm các component khác của bạn ở đây...
};